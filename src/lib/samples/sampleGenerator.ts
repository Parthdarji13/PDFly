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
 * Generates a realistic sample Certificate of Achievement PDF
 */
export async function generateSampleCertificate(): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  // Landscape A4 for Certificate
  const page = pdfDoc.addPage([841.89, 595.28]);
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const fontHelvBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const gold = rgb(0.83, 0.68, 0.21);
  const darkNavy = rgb(0.08, 0.16, 0.32);
  const slate = rgb(0.3, 0.35, 0.42);

  // Outer Decorative Border
  page.drawRectangle({
    x: 30,
    y: 30,
    width: 781.89,
    height: 535.28,
    borderColor: gold,
    borderWidth: 3,
    color: rgb(0.99, 0.99, 0.98),
  });

  // Inner Thin Border
  page.drawRectangle({
    x: 42,
    y: 42,
    width: 757.89,
    height: 511.28,
    borderColor: darkNavy,
    borderWidth: 1,
  });

  // Top Title
  page.drawText('CERTIFICATE OF RECOGNITION', {
    x: 215,
    y: 490,
    size: 26,
    font: fontBold,
    color: darkNavy,
  });

  page.drawText('THIS CERTIFICATE IS PROUDLY PRESENTED TO', {
    x: 275,
    y: 450,
    size: 11,
    font: fontHelvBold,
    color: gold,
  });

  // Recipient Name
  page.drawText('ALEXANDER CHEN', {
    x: 260,
    y: 395,
    size: 32,
    font: fontBold,
    color: darkNavy,
  });

  // Underline for recipient
  page.drawLine({
    start: { x: 200, y: 385 },
    end: { x: 640, y: 385 },
    thickness: 1.5,
    color: gold,
  });

  // Description / Citation
  page.drawText('For extraordinary dedication, exceptional leadership, and groundbreaking excellence in', {
    x: 185,
    y: 345,
    size: 13,
    font: fontItalic,
    color: slate,
  });
  page.drawText('Advanced Cloud Software Architecture & Intelligent Systems Engineering.', {
    x: 210,
    y: 325,
    size: 13,
    font: fontBold,
    color: darkNavy,
  });

  // Certificate ID & Date
  page.drawText('Certificate ID: CERT-2026-98124', {
    x: 100,
    y: 190,
    size: 10,
    font: font,
    color: slate,
  });
  page.drawText('Date Awarded: September 10, 2026', {
    x: 100,
    y: 172,
    size: 10,
    font: font,
    color: slate,
  });

  // Signatures
  page.drawLine({ start: { x: 100, y: 115 }, end: { x: 280, y: 115 }, thickness: 1, color: darkNavy });
  page.drawText('Dr. Evelyn Vance, Ph.D.', { x: 100, y: 98, size: 11, font: fontBold, color: darkNavy });
  page.drawText('Director of Engineering & Technology', { x: 100, y: 84, size: 9, font: font, color: slate });

  page.drawLine({ start: { x: 540, y: 115 }, end: { x: 720, y: 115 }, thickness: 1, color: darkNavy });
  page.drawText('Marcus Aurelius Sterling', { x: 540, y: 98, size: 11, font: fontBold, color: darkNavy });
  page.drawText('President & Board Chairman', { x: 540, y: 84, size: 9, font: font, color: slate });

  // Center Gold Seal Emblem
  page.drawRectangle({
    x: 375,
    y: 80,
    width: 90,
    height: 90,
    borderColor: gold,
    borderWidth: 2,
    color: rgb(0.98, 0.95, 0.88),
  });
  page.drawText('OFFICIAL', { x: 395, y: 135, size: 10, font: fontHelvBold, color: gold });
  page.drawText('SEAL', { x: 405, y: 115, size: 12, font: fontBold, color: darkNavy });
  page.drawText('2026', { x: 407, y: 95, size: 10, font: fontBold, color: gold });

  return await pdfDoc.save();
}

/**
 * Generates a realistic sample Business Project Proposal PDF
 */
export async function generateSampleProposal(): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const primary = rgb(0.39, 0.23, 0.91); // Indigo / Purple
  const dark = rgb(0.12, 0.14, 0.18);
  const gray = rgb(0.4, 0.45, 0.52);
  const lightBg = rgb(0.96, 0.96, 0.99);

  // Top Accent Banner
  page.drawRectangle({
    x: 40,
    y: 775,
    width: 515,
    height: 38,
    color: primary,
  });
  page.drawText('PROJECT PROPOSAL & SCOPE OF WORK', {
    x: 55,
    y: 788,
    size: 13,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  page.drawText('CONFIDENTIAL', {
    x: 460,
    y: 788,
    size: 9,
    font: fontBold,
    color: rgb(0.85, 0.82, 0.98),
  });

  // Project Header
  page.drawText('Enterprise Next-Gen Document Intelligence Platform', {
    x: 40,
    y: 740,
    size: 16,
    font: fontBold,
    color: dark,
  });
  page.drawText('Client: Vanguard Financial Global | Prepared by: Apex Solutions Design Studio', {
    x: 40,
    y: 722,
    size: 9.5,
    font: font,
    color: gray,
  });
  page.drawText('Date: September 10, 2026 | Version: 2.4-Final', {
    x: 40,
    y: 708,
    size: 9,
    font: font,
    color: gray,
  });

  // Section 1: Executive Summary
  page.drawText('1. EXECUTIVE SUMMARY & OBJECTIVES', { x: 40, y: 675, size: 11, font: fontBold, color: primary });
  page.drawText(
    'This proposal outlines the engineering architecture, deliverables, and timeline to modernize Vanguard Financials',
    { x: 40, y: 656, size: 9.5, font: font, color: dark }
  );
  page.drawText(
    'PDF document processing pipeline with real-time vector editing, embedded fonts, and AI automated summarization.',
    { x: 40, y: 642, size: 9.5, font: font, color: dark }
  );

  // Section 2: Deliverables Grid
  page.drawText('2. CORE DELIVERABLES & MILESTONES', { x: 40, y: 610, size: 11, font: fontBold, color: primary });

  // Table header
  page.drawRectangle({ x: 40, y: 585, width: 515, height: 20, color: rgb(0.9, 0.92, 0.97) });
  page.drawText('PHASE / MILESTONE', { x: 50, y: 591, size: 9, font: fontBold, color: dark });
  page.drawText('DESCRIPTION & OUTPUT', { x: 180, y: 591, size: 9, font: fontBold, color: dark });
  page.drawText('DURATION', { x: 410, y: 591, size: 9, font: fontBold, color: dark });
  page.drawText('STATUS', { x: 485, y: 591, size: 9, font: fontBold, color: dark });

  const deliverables = [
    { phase: 'Phase 1: Discovery', desc: 'UI/UX wireframes & typography system', time: '2 Weeks', status: 'Approved' },
    { phase: 'Phase 2: Core Engine', desc: 'Client-side PDF rendering & vector editing', time: '4 Weeks', status: 'In Progress' },
    { phase: 'Phase 3: AI Intelligence', desc: 'Gemini AI summarization & OCR parser', time: '3 Weeks', status: 'Ready' },
    { phase: 'Phase 4: QA & Deploy', desc: 'Enterprise security audit & rollout', time: '2 Weeks', status: 'Scheduled' },
  ];

  let dY = 565;
  deliverables.forEach((d, idx) => {
    if (idx % 2 === 1) {
      page.drawRectangle({ x: 40, y: dY - 4, width: 515, height: 20, color: lightBg });
    }
    page.drawText(d.phase, { x: 50, y: dY, size: 9, font: fontBold, color: dark });
    page.drawText(d.desc, { x: 180, y: dY, size: 8.5, font: font, color: gray });
    page.drawText(d.time, { x: 410, y: dY, size: 8.5, font: font, color: dark });
    page.drawText(d.status, { x: 485, y: dY, size: 8.5, font: fontBold, color: primary });
    dY -= 22;
  });

  // Section 3: Investment Summary
  page.drawText('3. INVESTMENT & COST SUMMARY', { x: 40, y: 460, size: 11, font: fontBold, color: primary });
  page.drawRectangle({ x: 40, y: 395, width: 515, height: 50, color: lightBg });
  page.drawText('Total Estimated Project Investment:', { x: 55, y: 425, size: 10, font: font, color: dark });
  page.drawText('$42,500.00 USD', { x: 55, y: 407, size: 14, font: fontBold, color: primary });
  page.drawText('Terms: 40% upfront deposit upon signing, 30% at Phase 2 completion, 30% upon final acceptance.', {
    x: 230,
    y: 415,
    size: 8.5,
    font: fontOblique,
    color: gray,
  });

  // Acceptance & Sign-off
  page.drawText('4. ACCEPTANCE & AUTHORIZATION', { x: 40, y: 365, size: 11, font: fontBold, color: primary });
  page.drawText('By signing below, the parties agree to the project scope, deliverables, and terms outlined in this proposal.', {
    x: 40,
    y: 348,
    size: 9,
    font: font,
    color: dark,
  });

  page.drawLine({ start: { x: 60, y: 270 }, end: { x: 250, y: 270 }, thickness: 1, color: dark });
  page.drawText('Authorized Client Signature', { x: 60, y: 255, size: 8.5, font: font, color: gray });
  page.drawText('Name: Sarah Jenkins, Product VP', { x: 60, y: 240, size: 8.5, font: fontBold, color: dark });

  page.drawLine({ start: { x: 330, y: 270 }, end: { x: 520, y: 270 }, thickness: 1, color: dark });
  page.drawText('Apex Solutions Executive Signature', { x: 330, y: 255, size: 8.5, font: font, color: gray });
  page.drawText('Name: Marcus Sterling, CEO', { x: 330, y: 240, size: 8.5, font: fontBold, color: dark });

  return await pdfDoc.save();
}

/**
 * Generates a realistic sample Formal Business Letter PDF
 */
export async function generateSampleLetter(): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  const dark = rgb(0.12, 0.14, 0.18);
  const gray = rgb(0.35, 0.38, 0.45);
  const navy = rgb(0.08, 0.22, 0.48);

  // Letterhead
  page.drawText('PINNACLE CAPITAL PARTNERS', {
    x: 40,
    y: 775,
    size: 16,
    font: fontBold,
    color: navy,
  });
  page.drawText('500 Financial Plaza, 32nd Floor | New York, NY 10005 | contact@pinnaclecap.com', {
    x: 40,
    y: 760,
    size: 9,
    font: font,
    color: gray,
  });
  page.drawLine({ start: { x: 40, y: 750 }, end: { x: 555, y: 750 }, thickness: 1, color: navy });

  // Date
  page.drawText('September 10, 2026', { x: 40, y: 720, size: 10, font: font, color: dark });

  // Recipient
  page.drawText('Mr. Jonathan Sterling', { x: 40, y: 690, size: 10, font: fontBold, color: dark });
  page.drawText('Managing Director, Horizon Global Ventures', { x: 40, y: 676, size: 10, font: font, color: dark });
  page.drawText('750 Tech Boulevard, Suite 1200', { x: 40, y: 662, size: 10, font: font, color: dark });
  page.drawText('San Francisco, CA 94105', { x: 40, y: 648, size: 10, font: font, color: dark });

  // Subject
  page.drawText('SUBJECT: Official Notice of Investment Partnership & Term Sheet Execution', {
    x: 40,
    y: 615,
    size: 10.5,
    font: fontBold,
    color: navy,
  });

  // Salutation
  page.drawText('Dear Mr. Sterling,', { x: 40, y: 585, size: 10.5, font: font, color: dark });

  // Body Paragraph 1
  page.drawText(
    'We are delighted to confirm that following comprehensive due diligence and unanimous approval by our Investment',
    { x: 40, y: 555, size: 10, font: font, color: dark }
  );
  page.drawText(
    'Committee, Pinnacle Capital Partners has formally approved the Series B growth investment in Horizon Global Ventures.',
    { x: 40, y: 540, size: 10, font: font, color: dark }
  );

  // Body Paragraph 2
  page.drawText(
    'Your team has demonstrated remarkable execution, world-class technical vision, and sustainable market expansion.',
    { x: 40, y: 510, size: 10, font: font, color: dark }
  );
  page.drawText(
    'We look forward to partnering closely with you as we scale operations across European and Asian financial markets.',
    { x: 40, y: 495, size: 10, font: font, color: dark }
  );

  // Body Paragraph 3
  page.drawText(
    'Please review and countersign the enclosed Definitive Agreements by September 25, 2026. Should your legal team',
    { x: 40, y: 465, size: 10, font: font, color: dark }
  );
  page.drawText(
    'require any clarifications, our general counsel remains at your full disposal.',
    { x: 40, y: 450, size: 10, font: font, color: dark }
  );

  // Closing
  page.drawText('Sincerely,', { x: 40, y: 400, size: 10.5, font: font, color: dark });
  page.drawLine({ start: { x: 40, y: 345 }, end: { x: 220, y: 345 }, thickness: 1, color: dark });
  page.drawText('Harrison Wells, CFA', { x: 40, y: 330, size: 10.5, font: fontBold, color: dark });
  page.drawText('Senior Managing Partner, Pinnacle Capital Partners', { x: 40, y: 316, size: 9.5, font: fontItalic, color: gray });

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

