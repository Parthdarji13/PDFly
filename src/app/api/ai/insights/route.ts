import { NextRequest, NextResponse } from 'next/server';
import { callClaude, checkRateLimit, prepareDocumentContext } from '@/lib/ai/anthropic';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = checkRateLimit(ip, 30, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait a moment.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { documentText, fileName, apiKey } = body;

    if (!documentText || documentText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Document contains no readable text for insights extraction.' },
        { status: 400 }
      );
    }

    const { text: contextText } = prepareDocumentContext(documentText, 60000);

    const systemPrompt = `You are PDFly Document Intelligence — an AI metadata and structured data extractor powered by Claude.
Analyze the provided document text and extract structured key insights.

You MUST respond ONLY with valid JSON in this exact structure without code markdown fences or conversational text:
{
  "documentType": "Invoice | Legal Agreement | Resume | Financial Report | Receipt | Contract | Technical Document | General",
  "suggestedFileName": "clean_smart_filename.pdf",
  "confidence": "High | Medium | Low",
  "language": "English",
  "entities": [
    { "label": "Document Number / ID", "value": "INV-2026-001" },
    { "label": "Key Date / Due Date", "value": "September 15, 2026" },
    { "label": "Primary Organization / Party", "value": "Acme Corp" },
    { "label": "Counterparty / Client", "value": "Global Tech Inc" },
    { "label": "Total Amount / Value", "value": "$12,450.00" }
  ],
  "tableRows": [
    { "item": "Consulting Services", "description": "Architecture & Engineering", "amount": "$8,000.00" }
  ],
  "quickInsights": [
    "Identified payment terms: Net 30 days.",
    "Contains confidentiality and indemnification clauses."
  ]
}`;

    const userPrompt = `Extract document insights and structured data from this PDF ("${fileName || 'document.pdf'}"). Document text:\n\n${contextText}`;

    const result = await callClaude({
      systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 2048,
      temperature: 0.1,
      apiKeyOverride: apiKey,
    });

    let parsedData: any;
    try {
      // Clean possible markdown code fence wrappers
      let cleanJson = result.content.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      parsedData = JSON.parse(cleanJson);
    } catch {
      parsedData = {
        documentType: 'Document',
        suggestedFileName: fileName || 'document_insights.pdf',
        confidence: 'Medium',
        language: 'English',
        entities: [{ label: 'Raw Summary', value: result.content.substring(0, 300) }],
        tableRows: [],
        quickInsights: ['Successfully extracted general insights.'],
      };
    }

    return NextResponse.json({
      data: parsedData,
      model: result.model,
    });
  } catch (err: any) {
    console.error('API /api/ai/insights error:', err);
    const message = err.message || 'Failed to extract document insights with AI Assistant.';
    const status = message.includes('not configured') || message.includes('invalid') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
