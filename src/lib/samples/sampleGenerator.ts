import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/**
 * Generates a realistic sample Invoice PDF
 */
export async function generateSampleInvoice(): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const primaryColor = rgb(0.12, 0.35, 0.78);
  const darkGray = rgb(0.2, 0.23, 0.28);
  const lightGray = rgb(0.55, 0.58, 0.64);
  const bgLight = rgb(0.96, 0.97, 0.99);

  // Top header background accent bar
  page.drawRectangle({
    x: 40,
    y: 785,
    width: 515,
    height: 4,
    color: primaryColor,
  });

  // Company Name
  page.drawText('APEX SOLUTIONS LLC', {
    x: 40,
    y: 755,
    size: 22,
    font: fontBold,
    color: primaryColor,
  });

  page.drawText('100 Innovation Way, Suite 400', {
    x: 40,
    y: 738,
    size: 10,
    font: font,
    color: darkGray,
  });
  page.drawText('San Francisco, CA 94107 | contact@apexsolutions.io', {
    x: 40,
    y: 724,
    size: 10,
    font: font,
    color: darkGray,
  });

  // Invoice Title & Meta
  page.drawText('INVOICE', {
    x: 430,
    y: 755,
    size: 24,
    font: fontBold,
    color: darkGray,
  });
  page.drawText('Invoice No: #INV-2026-0891', {
    x: 410,
    y: 738,
    size: 10,
    font: fontBold,
    color: darkGray,
  });
  page.drawText('Date: September 09, 2026', {
    x: 410,
    y: 724,
    size: 10,
    font: font,
    color: darkGray,
  });
  page.drawText('Due Date: October 09, 2026', {
    x: 410,
    y: 710,
    size: 10,
    font: font,
    color: darkGray,
  });

  // Bill To Box
  page.drawRectangle({
    x: 40,
    y: 630,
    width: 240,
    height: 65,
    color: bgLight,
  });
  page.drawText('BILLED TO:', {
    x: 50,
    y: 680,
    size: 9,
    font: fontBold,
    color: primaryColor,
  });
  page.drawText('Global Tech Innovations Inc.', {
    x: 50,
    y: 664,
    size: 11,
    font: fontBold,
    color: darkGray,
  });
  page.drawText('Attn: Sarah Jenkins, Product Lead', {
    x: 50,
    y: 650,
    size: 10,
    font: font,
    color: darkGray,
  });
  page.drawText('sarah.jenkins@globaltech.com', {
    x: 50,
    y: 636,
    size: 9,
    font: font,
    color: lightGray,
  });

  // Table Header
  page.drawRectangle({
    x: 40,
    y: 580,
    width: 515,
    height: 26,
    color: primaryColor,
  });
  page.drawText('ITEM DESCRIPTION', {
    x: 52,
    y: 589,
    size: 10,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  page.drawText('QTY', {
    x: 330,
    y: 589,
    size: 10,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  page.drawText('RATE', {
    x: 400,
    y: 589,
    size: 10,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  page.drawText('AMOUNT', {
    x: 485,
    y: 589,
    size: 10,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  // Table Rows
  const items = [
    { desc: 'Cloud Infrastructure Architecture & Deployment', qty: '40 hrs', rate: '$150.00', total: '$6,000.00' },
    { desc: 'Frontend UI/UX Modernization & Design System', qty: '35 hrs', rate: '$130.00', total: '$4,550.00' },
    { desc: 'API Security Audit & Penetration Testing', qty: '1 unit', rate: '$2,400.00', total: '$2,400.00' },
    { desc: 'Continuous Integration & CD Pipeline Automation', qty: '20 hrs', rate: '$125.00', total: '$2,500.00' },
    { desc: 'Monthly Dedicated DevOps Support & Monitoring', qty: '1 month', rate: '$1,800.00', total: '$1,800.00' },
  ];

  let currentY = 555;
  items.forEach((item, idx) => {
    if (idx % 2 === 1) {
      page.drawRectangle({
        x: 40,
        y: currentY - 6,
        width: 515,
        height: 24,
        color: bgLight,
      });
    }

    page.drawText(item.desc, { x: 52, y: currentY, size: 10, font: font, color: darkGray });
    page.drawText(item.qty, { x: 330, y: currentY, size: 10, font: font, color: darkGray });
    page.drawText(item.rate, { x: 400, y: currentY, size: 10, font: font, color: darkGray });
    page.drawText(item.total, { x: 485, y: currentY, size: 10, font: fontBold, color: darkGray });

    currentY -= 26;
  });

  // Summary Totals
  const sumY = currentY - 20;
  page.drawLine({
    start: { x: 340, y: sumY + 15 },
    end: { x: 555, y: sumY + 15 },
    thickness: 1,
    color: rgb(0.85, 0.88, 0.92),
  });

  page.drawText('Subtotal:', { x: 370, y: sumY, size: 10, font: font, color: lightGray });
  page.drawText('$17,250.00', { x: 475, y: sumY, size: 10, font: font, color: darkGray });

  page.drawText('Tax (8.5%):', { x: 370, y: sumY - 18, size: 10, font: font, color: lightGray });
  page.drawText('$1,466.25', { x: 480, y: sumY - 18, size: 10, font: font, color: darkGray });

  page.drawRectangle({
    x: 350,
    y: sumY - 48,
    width: 205,
    height: 24,
    color: bgLight,
  });
  page.drawText('TOTAL DUE:', { x: 360, y: sumY - 41, size: 11, font: fontBold, color: primaryColor });
  page.drawText('$18,716.25', { x: 465, y: sumY - 41, size: 12, font: fontBold, color: primaryColor });

  // Payment info & Notes
  page.drawText('Payment Instructions:', { x: 40, y: 220, size: 10, font: fontBold, color: darkGray });
  page.drawText('Bank: Silicon Valley Trust | Account: 9876-5432-1000 | Routing: 121000358', {
    x: 40,
    y: 205,
    size: 9,
    font: font,
    color: darkGray,
  });

  page.drawText('Terms & Conditions: Payment is due within 30 days of invoice date.', {
    x: 40,
    y: 190,
    size: 9,
    font: fontOblique,
    color: lightGray,
  });

  // Footer note
  page.drawText('Thank you for your business! Apex Solutions LLC', {
    x: 180,
    y: 60,
    size: 10,
    font: fontBold,
    color: primaryColor,
  });

  return await pdfDoc.save();
}

/**
 * Generates a realistic sample Resume PDF
 */
export async function generateSampleResume(): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  const dark = rgb(0.1, 0.1, 0.1);
  const gray = rgb(0.35, 0.35, 0.35);
  const accent = rgb(0.08, 0.28, 0.58);

  // Header
  page.drawText('ALEXANDER R. VANCE', {
    x: 180,
    y: 780,
    size: 20,
    font: fontBold,
    color: dark,
  });
  page.drawText('Senior Principal Software Engineer & Cloud Architect', {
    x: 175,
    y: 762,
    size: 11,
    font: fontItalic,
    color: accent,
  });
  page.drawText('alexander.vance@techcorp.io | +1 (555) 349-8821 | San Francisco, CA | github.com/avance', {
    x: 90,
    y: 746,
    size: 9,
    font: font,
    color: gray,
  });

  page.drawLine({
    start: { x: 40, y: 735 },
    end: { x: 555, y: 735 },
    thickness: 1.2,
    color: accent,
  });

  // Section: Executive Summary
  page.drawText('EXECUTIVE SUMMARY', { x: 40, y: 715, size: 12, font: fontBold, color: accent });
  page.drawText(
    'Accomplished Software Architect with 10+ years of experience leading distributed systems, high-throughput cloud',
    { x: 40, y: 698, size: 10, font: font, color: dark }
  );
  page.drawText(
    'infrastructure, and AI-driven platforms. Proven track record of scaling systems to 50M+ active daily users.',
    { x: 40, y: 684, size: 10, font: font, color: dark }
  );

  // Section: Experience
  page.drawText('PROFESSIONAL EXPERIENCE', { x: 40, y: 658, size: 12, font: fontBold, color: accent });

  page.drawText('Lead Cloud Systems Architect — Nexus Global Cloud Corp', {
    x: 40,
    y: 640,
    size: 11,
    font: fontBold,
    color: dark,
  });
  page.drawText('2022 — Present | San Francisco, CA', {
    x: 410,
    y: 640,
    size: 10,
    font: fontItalic,
    color: gray,
  });
  page.drawText('• Architected multi-region Kubernetes platform serving 120,000 requests/second with 99.999% uptime.', {
    x: 50,
    y: 624,
    size: 9.5,
    font: font,
    color: dark,
  });
  page.drawText('• Reduced annual cloud infrastructure costs by $1.8M through intelligent spot instance autoscaling.', {
    x: 50,
    y: 610,
    size: 9.5,
    font: font,
    color: dark,
  });
  page.drawText('• Mentored and led a cross-functional engineering team of 18 senior developers and DevOps leads.', {
    x: 50,
    y: 596,
    size: 9.5,
    font: font,
    color: dark,
  });

  page.drawText('Senior Full Stack Engineer — Zenith Software Technologies', {
    x: 40,
    y: 570,
    size: 11,
    font: fontBold,
    color: dark,
  });
  page.drawText('2018 — 2022 | Austin, TX', {
    x: 430,
    y: 570,
    size: 10,
    font: fontItalic,
    color: gray,
  });
  page.drawText('• Designed high-performance real-time analytics dashboard with React, TypeScript, and WebSockets.', {
    x: 50,
    y: 554,
    size: 9.5,
    font: font,
    color: dark,
  });
  page.drawText('• Integrated microservices architecture with Go, gRPC, and PostgreSQL processing 5TB data daily.', {
    x: 50,
    y: 540,
    size: 9.5,
    font: font,
    color: dark,
  });

  // Section: Education
  page.drawText('EDUCATION & CERTIFICATIONS', { x: 40, y: 505, size: 12, font: fontBold, color: accent });
  page.drawText('M.S. in Computer Science — Stanford University (2018)', {
    x: 40,
    y: 488,
    size: 10,
    font: fontBold,
    color: dark,
  });
  page.drawText('B.S. in Software Engineering — UC Berkeley (2016, Magna Cum Laude)', {
    x: 40,
    y: 472,
    size: 10,
    font: font,
    color: dark,
  });
  page.drawText('AWS Certified Solutions Architect – Professional | Certified Kubernetes Administrator (CKA)', {
    x: 40,
    y: 456,
    size: 9.5,
    font: fontItalic,
    color: gray,
  });

  // Section: Core Skills
  page.drawText('CORE TECHNICAL SKILLS', { x: 40, y: 425, size: 12, font: fontBold, color: accent });
  page.drawText('• Languages: TypeScript, JavaScript, Python, Go, Rust, SQL, C++', {
    x: 40,
    y: 408,
    size: 9.5,
    font: font,
    color: dark,
  });
  page.drawText('• Frontend & Frameworks: Next.js, React, Node.js, Tailwind CSS, GraphQL, WebAssembly', {
    x: 40,
    y: 394,
    size: 9.5,
    font: font,
    color: dark,
  });
  page.drawText('• Cloud & DevOps: AWS, GCP, Docker, Kubernetes, Terraform, CI/CD GitHub Actions, Kafka', {
    x: 40,
    y: 380,
    size: 9.5,
    font: font,
    color: dark,
  });

  return await pdfDoc.save();
}

/**
 * Generates a realistic sample Legal Agreement / NDA
 */
export async function generateSampleContract(): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  const dark = rgb(0.1, 0.1, 0.1);
  const gray = rgb(0.3, 0.3, 0.3);

  page.drawText('NON-DISCLOSURE & CONFIDENTIALITY AGREEMENT', {
    x: 105,
    y: 780,
    size: 14,
    font: fontBold,
    color: dark,
  });

  page.drawText('This Non-Disclosure Agreement (the "Agreement") is entered into as of September 09, 2026, by and between:', {
    x: 40,
    y: 745,
    size: 10,
    font: font,
    color: dark,
  });

  page.drawText('1. DISCLOSING PARTY: Horizon Technologies Inc., a Delaware Corporation ("Company").', {
    x: 50,
    y: 720,
    size: 10,
    font: fontBold,
    color: dark,
  });
  page.drawText('2. RECEIVING PARTY: Quantum Leap Innovations LLC ("Recipient").', {
    x: 50,
    y: 700,
    size: 10,
    font: fontBold,
    color: dark,
  });

  page.drawText('RECITALS & PURPOSE', { x: 40, y: 665, size: 11, font: fontBold, color: dark });
  page.drawText(
    'WHEREAS, the Disclosing Party possesses certain non-public proprietary information relating to its proprietary software,',
    { x: 40, y: 645, size: 9.5, font: font, color: gray }
  );
  page.drawText(
    'algorithms, business models, and trade secrets, and desires to disclose such information under strict confidentiality.',
    { x: 40, y: 630, size: 9.5, font: font, color: gray }
  );

  page.drawText('1. CONFIDENTIAL INFORMATION DEFINITION', { x: 40, y: 595, size: 11, font: fontBold, color: dark });
  page.drawText(
    'Confidential Information includes all technical data, trade secrets, software code, product roadmaps, financial data,',
    { x: 40, y: 578, size: 9.5, font: font, color: gray }
  );
  page.drawText(
    'and customer lists disclosed directly or indirectly in writing, orally, or by visual inspection.',
    { x: 40, y: 564, size: 9.5, font: font, color: gray }
  );

  page.drawText('2. OBLIGATIONS OF RECEIVING PARTY', { x: 40, y: 530, size: 11, font: fontBold, color: dark });
  page.drawText(
    'The Receiving Party agrees to hold all Confidential Information in strictest confidence and take reasonable precautions',
    { x: 40, y: 513, size: 9.5, font: font, color: gray }
  );
  page.drawText(
    'to prevent unauthorized disclosure or reproduction, maintaining at least the standard of care applied to its own secrets.',
    { x: 40, y: 499, size: 9.5, font: font, color: gray }
  );

  page.drawText('3. TERM & GOVERNING LAW', { x: 40, y: 465, size: 11, font: fontBold, color: dark });
  page.drawText(
    'This Agreement shall remain in effect for a period of three (3) years from the Effective Date and shall be governed by',
    { x: 40, y: 448, size: 9.5, font: font, color: gray }
  );
  page.drawText('the laws of the State of California, without regard to conflict of law principles.', {
    x: 40,
    y: 434,
    size: 9.5,
    font: font,
    color: gray,
  });

  // Signatures Section
  page.drawText('IN WITNESS WHEREOF, the parties hereto have executed this Agreement as of the date first written above.', {
    x: 40,
    y: 380,
    size: 9.5,
    font: fontItalic,
    color: dark,
  });

  // Sign boxes
  page.drawText('DISCLOSING PARTY:', { x: 60, y: 340, size: 10, font: fontBold, color: dark });
  page.drawLine({ start: { x: 60, y: 280 }, end: { x: 250, y: 280 }, thickness: 1, color: dark });
  page.drawText('Authorized Signature', { x: 60, y: 265, size: 9, font: font, color: gray });
  page.drawText('Name: Marcus Sterling, CEO', { x: 60, y: 248, size: 9, font: font, color: dark });

  page.drawText('RECEIVING PARTY:', { x: 330, y: 340, size: 10, font: fontBold, color: dark });
  page.drawLine({ start: { x: 330, y: 280 }, end: { x: 520, y: 280 }, thickness: 1, color: dark });
  page.drawText('Authorized Signature', { x: 330, y: 265, size: 9, font: font, color: gray });
  page.drawText('Name: Elena Rostova, Director', { x: 330, y: 248, size: 9, font: font, color: dark });

  return await pdfDoc.save();
}

/**
 * Creates a clean blank PDF document
 */
export async function generateBlankPdf(pages: number = 1): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    pdfDoc.addPage([595.28, 841.89]);
  }
  return await pdfDoc.save();
}
