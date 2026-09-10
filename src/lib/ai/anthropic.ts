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

// Fallback Gemini models in order of priority (Fastest & most reliable first)
const GEMINI_FALLBACK_MODELS = [
  'gemini-3.5-flash',
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-flash-latest',
  'gemini-3.7-flash',
  'gemini-pro-latest',
];

/**
 * Calls Google Gemini API with intelligent backoff retry and automatic model fallback.
 * Handles 503 (high demand/overloaded), 429 (rate limit), and network timeouts.
 */
async function callGeminiWithRetry(apiKey: string, options: ClaudeRequestOptions): Promise<ClaudeResponse> {
  const preferredModel = options.model || process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  const modelQueue = Array.from(new Set([preferredModel, ...GEMINI_FALLBACK_MODELS]));

  const validMessages = options.messages.filter((m) => m && m.content && String(m.content).trim().length > 0);
  const contents = (validMessages.length > 0 ? validMessages : [{ role: 'user' as const, content: 'Hello' }]).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: String(m.content || '').trim() }],
  }));

  const body: any = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0.2,
      maxOutputTokens: options.maxTokens || 2048,
    },
  };

  if (options.systemPrompt && options.systemPrompt.trim()) {
    body.systemInstruction = {
      parts: [{ text: options.systemPrompt.trim() }],
    };
  }

  let lastErrorDetail = '';

  for (const currentModel of modelQueue) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent`;
    // Perform at most 2 attempts per model before swiftly switching to the next available fallback model
    const maxRetries = 2;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // 15-second timeout controller for fast responsiveness
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

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
            candidate?.content?.parts?.map((p: any) => p.text || '')?.join('\n')?.trim() || '';

          if (!textContent && candidate?.finishReason === 'SAFETY') {
            throw new Error('The response was flagged by safety filters. Please refine the document or prompt.');
          }

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

        console.error(
          `[Gemini AI Error] Model: ${currentModel} | Attempt: ${attempt + 1}/${maxRetries} | Status: ${response.status} | Detail: ${lastErrorDetail}`
        );

        // 400/403 with invalid key or permissions -> Bad API key
        const isKeyError =
          (response.status === 400 || response.status === 403) &&
          (lastErrorDetail.includes('API_KEY_INVALID') ||
            lastErrorDetail.includes('API key not valid') ||
            lastErrorDetail.includes('PERMISSION_DENIED') ||
            lastErrorDetail.toLowerCase().includes('api key'));

        if (isKeyError) {
          throw new Error('The provided Gemini API Key is invalid. Please check your key in .env.local.');
        }

        // 404 Model Not Found / Deprecated -> Immediately try next fallback model in queue
        if (response.status === 404) {
          console.warn(`[Gemini AI] Model ${currentModel} not available (404). Trying next fallback model...`);
          break;
        }

        // 503 (Overloaded/High demand), 429 (Rate limit), 500, 502, 504 -> 1 fast retry or switch model
        const isTransientError =
          response.status === 503 ||
          response.status === 429 ||
          response.status === 500 ||
          response.status === 502 ||
          response.status === 504;

        if (isTransientError && attempt < maxRetries - 1) {
          const delayMs = 600 + Math.random() * 400;
          console.warn(
            `[Gemini AI] Status ${response.status} on ${currentModel}. Retrying in ${Math.round(delayMs)}ms...`
          );
          await wait(delayMs);
          continue;
        }

        // If retries exhausted for this model, quickly try next model in queue
        break;
      } catch (err: any) {
        lastErrorDetail = err.message || String(err);
        console.error(
          `[Gemini AI Exception] Model: ${currentModel} | Attempt: ${attempt + 1}/${maxRetries} | Error: ${lastErrorDetail}`
        );

        if (err.message?.includes('invalid') || err.message?.includes('safety filters')) {
          throw err;
        }

        // Network or timeout abort
        if (attempt < maxRetries - 1) {
          const delayMs = 600 + Math.random() * 400;
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

const ANTHROPIC_FALLBACK_MODELS = [
  'claude-3-5-sonnet-20241022',
  'claude-3-7-sonnet-20250219',
  'claude-3-5-haiku-20241022',
];

/**
 * Calls Anthropic Claude API with exponential backoff retry and 20s timeout.
 */
async function callAnthropicWithRetry(apiKey: string, options: ClaudeRequestOptions): Promise<ClaudeResponse> {
  const preferredModel = options.model || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
  const modelQueue = Array.from(new Set([preferredModel, ...ANTHROPIC_FALLBACK_MODELS]));

  const validMessages = options.messages.filter((m) => m && m.content && String(m.content).trim().length > 0);
  const messages = (validMessages.length > 0 ? validMessages : [{ role: 'user' as const, content: 'Hello' }]).map((m) => ({
    role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
    content: String(m.content || '').trim(),
  }));

  const body: any = {
    max_tokens: options.maxTokens || 2048,
    temperature: options.temperature ?? 0.2,
    messages,
  };

  if (options.systemPrompt && options.systemPrompt.trim()) {
    body.system = options.systemPrompt.trim();
  }

  let lastErrorDetail = '';

  for (const model of modelQueue) {
    body.model = model;
    const maxRetries = 2;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

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

        if (response.status === 404) {
          console.warn(`[Anthropic AI] Model ${model} not available (404). Trying next fallback model...`);
          break;
        }

        const isTransient = response.status === 429 || response.status === 503 || response.status === 529;

        if (isTransient && attempt < maxRetries - 1) {
          const delayMs = 1000 + Math.random() * 500;
          console.warn(`[Anthropic AI] Status ${response.status}. Retrying in ${Math.round(delayMs)}ms...`);
          await wait(delayMs);
          continue;
        }

        break;
      } catch (err: any) {
        lastErrorDetail = err.message || String(err);
        if (err.message?.includes('invalid')) throw err;

        if (attempt < maxRetries - 1) {
          const delayMs = 1000 + Math.random() * 500;
          await wait(delayMs);
          continue;
        }
        break;
      }
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
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const overrideKey = options.apiKeyOverride?.trim();

  // 1. If key override is provided, smartly dispatch by key format
  if (overrideKey && overrideKey !== '') {
    if (overrideKey.startsWith('sk-ant-')) {
      return callAnthropicWithRetry(overrideKey, options);
    }
    return callGeminiWithRetry(overrideKey, options);
  }

  // 2. If Gemini key is configured in env, use Gemini with retries and fallback models
  if (geminiKey && geminiKey !== 'your_gemini_api_key_here' && geminiKey.trim() !== '') {
    return callGeminiWithRetry(geminiKey, options);
  }

  // 3. If Anthropic key is configured in env, use Anthropic with retries
  if (anthropicKey && anthropicKey !== 'your_anthropic_api_key_here' && anthropicKey.trim() !== '') {
    return callAnthropicWithRetry(anthropicKey, options);
  }

  // 4. No key configured
  throw new Error('AI Assistant is not configured. Please add your GEMINI_API_KEY to your .env.local file.');
}

// Type aliases for cross-compatibility
export type AnthropicMessage = AiMessage;
