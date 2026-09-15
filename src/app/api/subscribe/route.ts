import { NextRequest, NextResponse } from 'next/server';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body.email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email address is required.' },
        { status: 400 }
      );
    }

    const email = body.email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(email) || email.length > 254) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    const webhookUrl = process.env.SUBSCRIBE_WEBHOOK_URL || process.env.FORM_WEBHOOK_URL;

    if (!webhookUrl) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          `[Newsletter Subscribe] Dev mode warning: SUBSCRIBE_WEBHOOK_URL is not set. Simulating subscription for: ${email}`
        );
        return NextResponse.json({
          success: true,
          message: 'You have been successfully subscribed to PDFly updates!',
        });
      }

      console.error(
        '[Newsletter Subscribe Error]: SUBSCRIBE_WEBHOOK_URL environment variable is not configured.'
      );
      return NextResponse.json(
        { success: false, error: 'Subscription service is temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    // Forward subscriber submission to the configured webhook service (Formspree, Google Sheets Apps Script, etc.)
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        email,
        source: 'PDFly Newsletter',
        subscribedAt: new Date().toISOString(),
      }),
      redirect: 'follow',
    });

    if (!webhookResponse.ok) {
      const responseText = await webhookResponse.text().catch(() => '');
      console.error(
        `[Newsletter Subscribe Error] Webhook responded with HTTP ${webhookResponse.status}:`,
        responseText
      );
      return NextResponse.json(
        { success: false, error: 'Failed to process subscription. Please try again later.' },
        { status: 502 }
      );
    }

    console.log(`[Newsletter Subscribe] Successfully dispatched subscriber: ${email}`);

    return NextResponse.json({
      success: true,
      message: 'You have been successfully subscribed to PDFly updates!',
    });
  } catch (error: any) {
    console.error('[Newsletter Subscribe Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error. Please try again later.' },
      { status: 500 }
    );
  }
}
