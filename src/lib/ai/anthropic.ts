/**
 * Centralized Server-Side AI Engine for PDFly
 * Supports Google Gemini API (with robust exponential backoff, model fallback & 30s timeout)
 * and Anthropic Claude API.
 *
 * Securely communicates with AI APIs from Next.js Route Handlers.
 */

export interface AiMessage {
  role: 'user' | 'assistant' | 'model';
  content: string;
}

export interface ClaudeRequestOptions {
  systemPrompt?: string;
  messages: AiMessage[];
  maxTokens?: number;
  temperature?: number;
  model?: string;
  apiKeyOverride?: string;
}

export interface ClaudeResponse {
  content: string;
  model: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

// In-memory rate limiter per IP / session
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(identifier: string, limit = 60, windowMs = 60000): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  record.count += 1;
  return { allowed: true, remaining: limit - record.count };
}

/**
 * Truncates / Chunks document text to stay within safe token limits (approx 80k characters ~ 20k tokens)
 */
export function prepareDocumentContext(text: string, maxChars: number = 80000): { text: string; isTruncated: boolean } {
  if (!text || text.length <= maxChars) {
    return { text: text || '', isTruncated: false };
  }

  const headSize = Math.floor(maxChars * 0.7);
  const tailSize = Math.floor(maxChars * 0.3);
  const head = text.substring(0, headSize);
  const tail = text.substring(text.length - tailSize);

  return {
    text: `${head}\n\n[... DOCUMENT TRUNCATED FOR LENGTH: Preserved first ${headSize} chars and final ${tailSize} chars ...]\n\n${tail}`,
    isTruncated: true,
  };
}

/**
 * Helper to wait for a specified number of milliseconds
 */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Fallback Gemini models in order of priority
const GEMINI_FALLBACK_MODELS = [
  'gemini-flash-latest',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-pro-latest',
];

/**
 * Calls Google Gemini API with exponential backoff retry and automatic model fallback.
 * Handles 503 (high demand/overloaded), 429 (rate limit), and network timeouts.
 */
async function callGeminiWithRetry(apiKey: string, options: ClaudeRequestOptions): Promise<ClaudeResponse> {
  const preferredModel = options.model || process.env.GEMINI_MODEL || 'gemini-flash-latest';
  const modelQueue = [preferredModel, ...GEMINI_FALLBACK_MODELS.filter((m) => m !== preferredModel)];

  const contents = options.messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: String(m.content || '') }],
  }));

  const body: any = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0.2,
      maxOutputTokens: options.maxTokens || 2048,
    },
  };

  if (options.systemPrompt) {
    body.systemInstruction = {
      parts: [{ text: options.systemPrompt }],
    };
  }

  let lastErrorDetail = '';

  for (const currentModel of modelQueue) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent`;
    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // 30-second timeout controller
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey.trim(),
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const candidate = data.candidates?.[0];
          const textContent =
            candidate?.content?.parts?.map((p: any) => p.text || '')?.join('\n') || '';

          return {
            content: textContent,
            model: `gemini (${currentModel})`,
            usage: {
              input_tokens: data.usageMetadata?.promptTokenCount || 0,
              output_tokens: data.usageMetadata?.candidatesTokenCount || 0,
            },
          };
        }

        // Handle error response
        let errorJson: any = null;
        try {
          errorJson = await response.json();
          lastErrorDetail = errorJson?.error?.message || JSON.stringify(errorJson);
        } catch {
          lastErrorDetail = await response.text();
        }

        // Log actual error details to server console for debugging
        console.error(
          `[Gemini AI Error] Model: ${currentModel} | Attempt: ${attempt + 1}/${maxRetries} | Status: ${response.status} | Detail: ${lastErrorDetail}`
        );

        // 400 with invalid key -> Bad API key
        if (response.status === 400 && lastErrorDetail.includes('API_KEY_INVALID')) {
          throw new Error('The provided AI API Key is invalid. Please check your key in .env.local.');
        }

        // 404 Model Not Found -> Immediately try next fallback model
        if (response.status === 404) {
          console.warn(`[Gemini AI] Model ${currentModel} not available (404). Trying next fallback model...`);
          break; // Break inner retry loop to try next model in modelQueue
        }

        // 503 (Overloaded/High demand), 429 (Rate limit), 500, 502, 504 -> Exponential backoff retry
        const isTransientError =
          response.status === 503 ||
          response.status === 429 ||
          response.status === 500 ||
          response.status === 502 ||
          response.status === 504;

        if (isTransientError && attempt < maxRetries - 1) {
          const delayMs = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 300, 8000);
          console.warn(
            `[Gemini AI] Status ${response.status} on ${currentModel}. Retrying in ${Math.round(delayMs)}ms (attempt ${attempt + 1}/${maxRetries})...`
          );
          await wait(delayMs);
          continue;
        }

        // If retries exhausted for this model, try next model in queue
        break;
      } catch (err: any) {
        lastErrorDetail = err.message || String(err);
        console.error(
          `[Gemini AI Exception] Model: ${currentModel} | Attempt: ${attempt + 1}/${maxRetries} | Error: ${lastErrorDetail}`
        );

        if (err.message?.includes('invalid')) {
          throw err;
        }

        // Network or timeout abort
        if (attempt < maxRetries - 1) {
          const delayMs = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 300, 8000);
          await wait(delayMs);
          continue;
        }
        break;
      }
    }
  }

  // All retries and fallback models failed -> Friendly non-technical message
  console.error('[Gemini AI] All models and retries exhausted. Final error:', lastErrorDetail);
  throw new Error('The AI assistant is busy right now. Please try again in a moment.');
}

/**
 * Calls Anthropic Claude API with exponential backoff retry and 30s timeout.
 */
async function callAnthropicWithRetry(apiKey: string, options: ClaudeRequestOptions): Promise<ClaudeResponse> {
  const model = options.model || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

  const body: any = {
    model: model,
    max_tokens: options.maxTokens || 2048,
    temperature: options.temperature ?? 0.2,
    messages: options.messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || ''),
    })),
  };

  if (options.systemPrompt) {
    body.system = options.systemPrompt;
  }

  const maxRetries = 3;
  let lastErrorDetail = '';

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey.trim(),
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const textContent =
          data.content
            ?.filter((c: any) => c.type === 'text')
            ?.map((c: any) => c.text)
            ?.join('\n') || '';

        return {
          content: textContent,
          model: data.model || model,
          usage: data.usage,
        };
      }

      let errorJson: any = null;
      try {
        errorJson = await response.json();
        lastErrorDetail = errorJson?.error?.message || JSON.stringify(errorJson);
      } catch {
        lastErrorDetail = await response.text();
      }

      console.error(
        `[Anthropic AI Error] Model: ${model} | Attempt: ${attempt + 1}/${maxRetries} | Status: ${response.status} | Detail: ${lastErrorDetail}`
      );

      if (response.status === 401) {
        throw new Error('The provided AI API Key is invalid or expired. Please check your key in .env.local.');
      }

      if (response.status === 404 && model !== 'claude-3-5-sonnet-20241022') {
        return callAnthropicWithRetry(apiKey, { ...options, model: 'claude-3-5-sonnet-20241022' });
      }

      const isTransient = response.status === 429 || response.status === 503 || response.status === 529;

      if (isTransient && attempt < maxRetries - 1) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 300, 8000);
        console.warn(`[Anthropic AI] Status ${response.status}. Retrying in ${Math.round(delayMs)}ms...`);
        await wait(delayMs);
        continue;
      }

      break;
    } catch (err: any) {
      lastErrorDetail = err.message || String(err);
      if (err.message?.includes('invalid')) throw err;

      if (attempt < maxRetries - 1) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 300, 8000);
        await wait(delayMs);
        continue;
      }
      break;
    }
  }

  console.error('[Anthropic AI] All retries exhausted. Final error:', lastErrorDetail);
  throw new Error('The AI assistant is busy right now. Please try again in a moment.');
}

/**
 * Unified Centralized AI Dispatcher:
 * Automatically uses Gemini API with retries & fallbacks if GEMINI_API_KEY is configured,
 * or Anthropic Claude API if ANTHROPIC_API_KEY is configured.
 */
export async function callClaude(options: ClaudeRequestOptions): Promise<ClaudeResponse> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const anthropicKey = options.apiKeyOverride || process.env.ANTHROPIC_API_KEY;

  // 1. If Gemini key is set and valid, use Gemini with retries and fallback models
  if (geminiKey && geminiKey !== 'your_gemini_api_key_here' && geminiKey.trim() !== '') {
    return callGeminiWithRetry(geminiKey, options);
  }

  // 2. If Anthropic key is set and valid, use Anthropic with retries
  if (anthropicKey && anthropicKey !== 'your_anthropic_api_key_here' && anthropicKey.trim() !== '') {
    return callAnthropicWithRetry(anthropicKey, options);
  }

  // 3. No key configured
  throw new Error('AI Assistant is not configured. Please add your GEMINI_API_KEY to your .env.local file.');
}

// Type aliases for cross-compatibility
export type AnthropicMessage = AiMessage;
