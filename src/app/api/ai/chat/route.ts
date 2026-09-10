import { NextRequest, NextResponse } from 'next/server';
import { callAI, checkRateLimit, prepareDocumentContext, AiMessage } from '@/lib/ai/gemini';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = checkRateLimit(ip, 40, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait a minute before asking more questions.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { documentText, messages, apiKey, fileName } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is required.' }, { status: 400 });
    }

    const { text: contextText, isTruncated } = prepareDocumentContext(documentText || '', 80000);

    const systemPrompt = `You are PDFly AI — an intelligent, precision document assistant.
You have been provided with the full extracted text of the document named "${fileName || 'document.pdf'}".

DOCUMENT CONTENT:
"""
${contextText || '(No text could be extracted from this PDF. It may contain scanned images or be empty.)'}
"""

GUIDELINES:
1. Answer questions accurately based strictly on the document content when possible.
2. If the user asks for specific citations, refer to relevant sections or page mentions.
3. If information is not in the document, explicitly state that it was not found in the text.
4. Format your responses using clean Markdown (headings, bullet points, bold key terms, code blocks when relevant).
5. Keep your tone helpful, professional, and concise.
6. If asked what AI model or company powers you, respond that you are the PDFly AI Assistant without naming a specific underlying model or company.
${isTruncated ? '\nNote: The document was very large, so an excerpt of the most critical sections has been provided.' : ''}`;

    const formattedMessages: AiMessage[] = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || ''),
    }));

    const result = await callAI({
      systemPrompt,
      messages: formattedMessages,
      maxTokens: 2048,
      temperature: 0.2,
      apiKeyOverride: apiKey,
    });

    return NextResponse.json({
      answer: result.content,
      model: result.model,
      isTruncated,
    });
  } catch (err: any) {
    console.error('API /api/ai/chat error:', err);
    const message = err.message || 'The AI assistant is temporarily busy. Please try again in a moment.';
    const status = message.includes('not configured') || message.includes('invalid') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
