/**
 * Centralized Server-Side AI Engine for PDFly
 * Exclusively uses Google Gemini API (with robust exponential backoff, model fallback & 15s timeout).
 *
 * Securely communicates with Google Gemini API from Next.js Route Handlers.
 */

export interface AiMessage {
  role: 'user' | 'assistant' | 'model';
  content: string;
}

export interface AiRequestOptions {
  systemPrompt?: string;
  messages: AiMessage[];
  maxTokens?: number;
  temperature?: number;
  model?: string;
  apiKeyOverride?: string;
}

export interface AiResponse {
  content: string;
  model: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

// In-memory rate limiter per IP / session
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  limit = 60,
  windowMs = 60000
): { allowed: boolean; remaining: number } {
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
export function prepareDocumentContext(
  text: string,
  maxChars: number = 80000
): { text: string; isTruncated: boolean } {
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
async function callGeminiWithRetry(
  apiKey: string,
  options: AiRequestOptions
): Promise<AiResponse> {
  const preferredModel = options.model || process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  const modelQueue = Array.from(new Set([preferredModel, ...GEMINI_FALLBACK_MODELS]));

  const validMessages = options.messages.filter(
    (m) => m && m.content && String(m.content).trim().length > 0
  );
  const contents = (
    validMessages.length > 0 ? validMessages : [{ role: 'user' as const, content: 'Hello' }]
  ).map((m) => ({
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
    const maxRetries = 2;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
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
            throw new Error(
              'The response was flagged by safety filters. Please refine the document or prompt.'
            );
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
          throw new Error(
            'The provided Gemini API Key is invalid. Please check your key in .env.local.'
          );
        }

        // 404 Model Not Found / Deprecated -> Immediately try next fallback model in queue
        if (response.status === 404) {
          console.warn(
            `[Gemini AI] Model ${currentModel} not available (404). Trying next fallback model...`
          );
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

        break;
      } catch (err: any) {
        lastErrorDetail = err.message || String(err);
        console.error(
          `[Gemini AI Exception] Model: ${currentModel} | Attempt: ${attempt + 1}/${maxRetries} | Error: ${lastErrorDetail}`
        );

        if (err.message?.includes('invalid') || err.message?.includes('safety filters')) {
          throw err;
        }

        if (attempt < maxRetries - 1) {
          const delayMs = 600 + Math.random() * 400;
          await wait(delayMs);
          continue;
        }
        break;
      }
    }
  }

  console.error('[Gemini AI] All models and retries exhausted. Final error:', lastErrorDetail);
  throw new Error('The AI assistant is busy right now. Please try again in a moment.');
}

/**
 * Unified Server-Side AI Dispatcher:
 * Exclusively communicates with Google Gemini API with retries & automatic model fallbacks.
 */
export async function callAI(options: AiRequestOptions): Promise<AiResponse> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const overrideKey = options.apiKeyOverride?.trim();

  // 1. If key override is provided, use it
  if (overrideKey && overrideKey !== '') {
    return callGeminiWithRetry(overrideKey, options);
  }

  // 2. If Gemini key is configured in env, use Gemini with retries and fallback models
  if (geminiKey && geminiKey !== 'your_gemini_api_key_here' && geminiKey.trim() !== '') {
    return callGeminiWithRetry(geminiKey, options);
  }

  // 3. No key configured
  throw new Error(
    'AI Assistant is not configured. Please add your GEMINI_API_KEY to your .env.local file.'
  );
}

export const callGemini = callAI;
