import { NextRequest, NextResponse } from 'next/server';
import { callAI, checkRateLimit, prepareDocumentContext } from '@/lib/ai/gemini';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = checkRateLimit(ip, 30, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait a moment before requesting another summary.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { documentText, fileName, apiKey, length = 'standard' } = body;

    if (!documentText || documentText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Document contains no readable text to summarize.' },
        { status: 400 }
      );
    }

    const { text: contextText, isTruncated } = prepareDocumentContext(documentText, 70000);

    const systemPrompt = `You are PDFly AI — an intelligent, precision document assistant and expert analyst.
If asked what AI model or company powers you, respond that you are the PDFly AI Assistant without naming a specific underlying model or company.
Your task is to analyze the document "${fileName || 'document.pdf'}" and generate a high-impact, crystal-clear executive summary.

FORMAT REQUIREMENTS:
1. **Executive Overview**: A 2-3 sentence high-level synthesis of what this document is and its primary objective.
2. **Key Findings & Highlights**: 4-6 bullet points covering the most critical takeaways, numbers, dates, or decisions.
3. **Action Items / Next Steps** (if applicable): Key deadlines, obligations, or next steps.

Use clean Markdown formatting. Keep it objective, authoritative, and concise.`;

    const userPrompt = `Please summarize the following document:\n\n"""\n${contextText}\n"""`;

    const result = await callAI({
      systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 1500,
      temperature: 0.2,
      apiKeyOverride: apiKey,
    });

    return NextResponse.json({
      summary: result.content,
      model: result.model,
      isTruncated,
    });
  } catch (err: any) {
    console.error('API /api/ai/summarize error:', err);
    const message = err.message || 'Failed to summarize document with AI Assistant.';
    const status = message.includes('not configured') || message.includes('invalid') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
