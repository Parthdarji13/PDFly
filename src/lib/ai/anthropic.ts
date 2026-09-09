/**
 * Unified Server-Side AI Helper for PDFly
 * Supports Google Gemini API (gemini-2.5-flash, gemini-1.5-flash, gemini-1.5-pro)
 * and Anthropic Claude API (claude-sonnet-4-6, claude-3-5-sonnet).
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

export function checkRateLimit(identifier: string, limit = 50, windowMs = 60000): { allowed: boolean; remaining: number } {
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

  // Preserve beginning and end if very long
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
 * Calls Google Gemini API
 */
async function callGemini(apiKey: string, options: ClaudeRequestOptions, modelOverride?: string): Promise<ClaudeResponse> {
  const model = modelOverride || options.model || process.env.GEMINI_MODEL || 'gemini-flash-latest';

  const contents = options.messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content || '' }],
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

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey.trim(),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson?.error?.message || JSON.stringify(errJson);
    } catch {
      errorDetail = await response.text();
    }

    // Fallback if specific model is unavailable
    if (response.status === 404 && model !== 'gemini-pro-latest') {
      return callGemini(apiKey, options, 'gemini-pro-latest');
    }

    if (response.status === 400 && errorDetail.includes('API_KEY_INVALID')) {
      throw new Error('INVALID_API_KEY: The provided Google Gemini API Key is invalid.');
    }

    if (response.status === 429) {
      throw new Error('RATE_LIMITED: Google Gemini rate limit reached. Please wait a moment.');
    }

    throw new Error(`Gemini API Error (${response.status}): ${errorDetail}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  const textContent = candidate?.content?.parts?.map((p: any) => p.text || '')?.join('\n') || '';

  return {
    content: textContent,
    model: `gemini (${model})`,
    usage: {
      input_tokens: data.usageMetadata?.promptTokenCount || 0,
      output_tokens: data.usageMetadata?.candidatesTokenCount || 0,
    },
  };
}

/**
 * Calls Anthropic Claude API
 */
async function callAnthropic(apiKey: string, options: ClaudeRequestOptions, modelOverride?: string): Promise<ClaudeResponse> {
  const model = modelOverride || options.model || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

  const body: any = {
    model: model,
    max_tokens: options.maxTokens || 2048,
    temperature: options.temperature ?? 0.3,
    messages: options.messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content || '',
    })),
  };

  if (options.systemPrompt) {
    body.system = options.systemPrompt;
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey.trim(),
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson?.error?.message || JSON.stringify(errJson);
    } catch {
      errorDetail = await response.text();
    }

    if (response.status === 401) {
      throw new Error('INVALID_API_KEY: The provided Anthropic API Key is invalid or expired.');
    }
    if (response.status === 429) {
      throw new Error('RATE_LIMITED: Anthropic API rate limit reached. Please wait a moment.');
    }

    // Fallback to claude-3-5-sonnet if 4-6 is not available on key tier
    if (response.status === 404 && model !== 'claude-3-5-sonnet-20241022') {
      return callAnthropic(apiKey, options, 'claude-3-5-sonnet-20241022');
    }

    throw new Error(`Anthropic API Error (${response.status}): ${errorDetail}`);
  }

  const data = await response.json();
  const textContent = data.content
    ?.filter((c: any) => c.type === 'text')
    ?.map((c: any) => c.text)
    ?.join('\n') || '';

  return {
    content: textContent,
    model: data.model || model,
    usage: data.usage,
  };
}

/**
 * Unified AI Caller:
 * Automatically uses Gemini API if GEMINI_API_KEY is configured,
 * or Anthropic API if ANTHROPIC_API_KEY is configured.
 */
export async function callClaude(options: ClaudeRequestOptions): Promise<ClaudeResponse> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const anthropicKey = options.apiKeyOverride || process.env.ANTHROPIC_API_KEY;

  // 1. If Gemini key is set and valid, use Gemini
  if (geminiKey && geminiKey !== 'your_gemini_api_key_here' && geminiKey.trim() !== '') {
    return callGemini(geminiKey, options);
  }

  // 2. If Anthropic key is set and valid, use Anthropic
  if (anthropicKey && anthropicKey !== 'your_anthropic_api_key_here' && anthropicKey.trim() !== '') {
    return callAnthropic(anthropicKey, options);
  }

  // 3. Neither key is configured
  throw new Error(
    'MISSING_API_KEY: No AI API Key is configured. Please add GEMINI_API_KEY or ANTHROPIC_API_KEY to your .env.local file.'
  );
}

// Alias for export compatibility
export type AnthropicMessage = AiMessage;
