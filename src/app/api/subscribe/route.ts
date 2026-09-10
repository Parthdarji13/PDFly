import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

interface SubscriberRecord {
  email: string;
  subscribedAt: string;
}

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

    // Local data storage in data/subscribers.json
    const dataDir = path.join(process.cwd(), 'data');
    const filePath = path.join(dataDir, 'subscribers.json');

    await fs.mkdir(dataDir, { recursive: true });

    let subscribers: SubscriberRecord[] = [];
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      subscribers = JSON.parse(fileContent);
      if (!Array.isArray(subscribers)) {
        subscribers = [];
      }
    } catch {
      subscribers = [];
    }

    const alreadySubscribed = subscribers.some((s) => s.email === email);

    if (!alreadySubscribed) {
      subscribers.push({
        email,
        subscribedAt: new Date().toISOString(),
      });

      await fs.writeFile(filePath, JSON.stringify(subscribers, null, 2), 'utf-8');
      console.log(`[Newsletter Subscribe] New subscriber captured: ${email}`);
    } else {
      console.log(`[Newsletter Subscribe] Existing subscriber re-submitted: ${email}`);
    }

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
