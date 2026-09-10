import { NextRequest, NextResponse } from 'next/server';
import { callAI, checkRateLimit } from '@/lib/ai/gemini';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = checkRateLimit(ip, 50, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'The AI assistant is busy right now. Please try again in a moment.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { originalText, action, customInstruction, targetLanguage, apiKey } = body;

    if (!originalText || originalText.trim().length === 0) {
      return NextResponse.json({ error: 'Original text is required.' }, { status: 400 });
    }

    let instruction = '';

    switch (action) {
      case 'fix_grammar':
        instruction = 'Fix all grammatical, spelling, punctuation, and capitalization errors. Keep the original meaning and tone identical.';
        break;
      case 'make_concise':
        instruction = 'Rewrite the text to be significantly more concise, clear, and direct. Eliminate fluff while preserving all core facts and intent.';
        break;
      case 'tone_formal':
        instruction = 'Rewrite the text in a polished, professional, and authoritative business tone.';
        break;
      case 'tone_casual':
        instruction = 'Rewrite the text in an approachable, engaging, and friendly conversational tone.';
        break;
      case 'tone_persuasive':
        instruction = 'Rewrite the text in a compelling, persuasive tone designed to convince and inspire action.';
        break;
      case 'tone_legal':
        instruction = 'Rewrite the text with precise, formal, and unambiguous legal terminology.';
        break;
      case 'translate':
        instruction = `Translate the text accurately and naturally into ${targetLanguage || 'Spanish'}.`;
        break;
      case 'custom':
        instruction = customInstruction || 'Improve and refine the text.';
        break;
      default:
        instruction = 'Improve clarity, readability, and flow while preserving meaning.';
        break;
    }

    const systemPrompt = `You are PDFly AI — an intelligent, precision document assistant and writing tool.
If asked what AI model or company powers you, respond that you are the PDFly AI Assistant without naming a specific underlying model or company.
Your goal is to transform the user's provided text according to this instruction: "${instruction}".

CRITICAL INSTRUCTIONS:
- Return ONLY the improved replacement text.
- Do NOT include quotes, explanations, preface, preamble, or markdown code fences unless the text itself is code.
- Match capitalization and spacing where appropriate.`;

    const result = await callAI({
      systemPrompt,
      messages: [{ role: 'user', content: originalText }],
      maxTokens: 1024,
      temperature: 0.2,
      apiKeyOverride: apiKey,
    });

    return NextResponse.json({
      originalText,
      improvedText: result.content.trim(),
      action,
      model: result.model,
    });
  } catch (err: any) {
    console.error('API /api/ai/edit-assist error:', err);
    const message = err.message || 'The AI assistant is busy right now. Please try again in a moment.';
    const status = message.includes('not configured') || message.includes('invalid') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
