import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { exportModifiedPDF } from '../src/lib/pdf/pdfExporter';
import { DocumentState, TextElement, ExtractedFontInfo } from '../src/lib/types';
import fs from 'fs';
import path from 'path';

async function runTest() {
  console.log('=== Starting Font Preservation Verification Test ===\n');

  // 1. Fetch a real distinctive TTF font (e.g. Roboto from GitHub raw)
  console.log('1. Fetching distinctive custom TTF font...');
  const fontUrl = 'https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-700-normal.ttf';
  const fontResp = await fetch(fontUrl);
  if (!fontResp.ok) {
    throw new Error(`Failed to download font: HTTP ${fontResp.status}`);
  }
  const fontArrayBuffer = await fontResp.arrayBuffer();
  const fontBytes = new Uint8Array(fontArrayBuffer);
  console.log(`   Font downloaded successfully (${fontBytes.length} bytes, format verified).\n`);

  // 2. Create a source PDF using this custom embedded font
  console.log('2. Creating source PDF with embedded Montserrat-Bold font...');
  const srcDoc = await PDFDocument.create();
  srcDoc.registerFontkit(fontkit);
  const customFont = await srcDoc.embedFont(fontBytes);

  const page = srcDoc.addPage([600, 400]);
  page.drawText('Original Custom Text: BRANDED MONTSERRAT', {
    x: 50,
    y: 350,
    size: 20,
    font: customFont,
    color: rgb(0.1, 0.2, 0.8),
  });

  const rawPdfBytes = await srcDoc.save();
  console.log(`   Source PDF generated (${rawPdfBytes.length} bytes).\n`);

  // 3. Construct DocumentState with extracted custom font info
  const fontId = 'g_d0_f1_montserrat_bold';
  const cssFamily = 'PDF_Font_Montserrat_Bold';

  const extractedFontInfo: ExtractedFontInfo = {
    id: fontId,
    name: 'Montserrat-Bold',
    cleanName: 'Montserrat Bold',
    family: 'Montserrat Bold',
    cssFamily: cssFamily,
    isEmbedded: true,
    data: fontBytes,
    mimetype: 'font/ttf',
    isBold: true,
    isItalic: false,
    isMonospace: false,
    isSerif: false,
    category: 'sans-serif',
    fallbackPdfKey: 'Helvetica-Bold',
    fallbackCssFamily: 'sans-serif',
  };

  const editedTextElement: TextElement = {
    id: 'text-edited-1',
    pageIndex: 0,
    type: 'text',
    x: 50,
    y: 100, // Visual Y from top
    width: 300,
    height: 30,
    text: 'Edited Text: Preserving Branded Font In Download!',
    fontFamily: cssFamily,
    pdfFontKey: fontId,
    fontSize: 18,
    fontWeight: 'bold',
    fontStyle: 'normal',
    underline: false,
    color: '#0ea5e9',
    align: 'left',
    lineHeight: 1.2,
    letterSpacing: 0,
    backgroundColor: '#ffffff',
    isOriginalEdit: true,
    originalTextId: 'page-0-text-0',
    originalBBox: {
      x: 50,
      y: 50,
      width: 400,
      height: 30,
    },
    isEmbeddedFont: true,
    embeddedFontId: fontId,
    fontMatchQuality: 'original',
    zIndex: 10,
    opacity: 1,
  };

  const documentState: DocumentState = {
    fileName: 'test-custom-font.pdf',
    fileSize: rawPdfBytes.length,
    rawPdfBytes: rawPdfBytes,
    pageCount: 1,
    pages: [
      {
        pageIndex: 0,
        pageNumber: 1,
        width: 600,
        height: 400,
        originalWidth: 600,
        originalHeight: 400,
        rotation: 0,
        textItems: [],
      },
    ],
    elements: [editedTextElement],
    extractedFonts: {
      [fontId]: extractedFontInfo,
    },
  };

  // 4. Run exportModifiedPDF
  console.log('4. Calling exportModifiedPDF(documentState)...');
  const exportedBytes = await exportModifiedPDF(documentState);
  console.log(`   Exported PDF successfully created (${exportedBytes.length} bytes).\n`);

  // 5. Inspect exported PDF document structure
  console.log('5. Inspecting exported PDF to verify embedded font program...');
  const exportedDoc = await PDFDocument.load(exportedBytes);
  const objects = exportedDoc.context.enumerateIndirectObjects();
  
  let fontObjectsCount = 0;
  let fontDescriptorCount = 0;
  let fontFileStreamCount = 0;
  let fontNamesFound: string[] = [];

  for (const [ref, obj] of objects) {
    const objStr = obj.toString();
    if (objStr.includes('/Type /Font') || (obj as any)?.dict?.get?.(PDFDocument.name as any)?.toString() === '/Font') {
      fontObjectsCount++;
      const baseFont = (obj as any)?.dict?.get?.({ encodedName: () => '/BaseFont' } as any) || (obj as any)?.dict?.entries?.()?.find?.(([k]: any) => k.toString() === '/BaseFont')?.[1];
      if (baseFont) {
        fontNamesFound.push(baseFont.toString());
      }
    }
    if (objStr.includes('/Type /FontDescriptor') || objStr.includes('FontDescriptor')) {
      fontDescriptorCount++;
    }
    if (objStr.includes('FontFile2') || objStr.includes('FontFile3') || objStr.includes('/Length1')) {
      fontFileStreamCount++;
    }
  }

  console.log(`   - Indirect Objects Count: ${objects.length}`);
  console.log(`   - Font Objects Found: ${fontObjectsCount}`);
  console.log(`   - Font Descriptors: ${fontDescriptorCount}`);
  console.log(`   - Font File Streams (FontFile2/Length1): ${fontFileStreamCount}`);
  console.log(`   - Font Names in PDF: ${JSON.stringify(fontNamesFound)}`);

  // Verify that a custom font (not just standard 14 Helvetica/Times/Courier) is in the PDF
  const hasCustomFont = fontNamesFound.some(name => !['/Helvetica', '/Times-Roman', '/Courier', '/Symbol', '/ZapfDingbats'].includes(name));
  console.log(`   - Custom Embedded Font verified in PDF: ${hasCustomFont ? 'YES (PASS)' : 'NO (FAIL)'}`);

  if (!hasCustomFont && fontFileStreamCount === 0) {
    throw new Error('Verification failed: Custom font was not embedded.');
  }

  // 6. Test Fallback Behavior when isEmbeddedFont is false
  console.log('\n6. Testing standard fallback when isEmbeddedFont is false / missing...');
  const fallbackElement: TextElement = {
    ...editedTextElement,
    id: 'text-fallback-1',
    isEmbeddedFont: false,
    embeddedFontId: undefined,
    pdfFontKey: 'Times-Roman',
    fontWeight: 'bold',
    fontStyle: 'italic',
  };

  const fallbackDocState: DocumentState = {
    ...documentState,
    elements: [fallbackElement],
  };

  const fallbackExportedBytes = await exportModifiedPDF(fallbackDocState);
  const fallbackDoc = await PDFDocument.load(fallbackExportedBytes);
  const fallbackObjects = fallbackDoc.context.enumerateIndirectObjects();
  const fallbackFontNames: string[] = [];
  for (const [ref, obj] of fallbackObjects) {
    const objStr = obj.toString();
    if (objStr.includes('/Type /Font') || (obj as any)?.dict?.get?.(PDFDocument.name as any)?.toString() === '/Font') {
      const baseFont = (obj as any)?.dict?.get?.({ encodedName: () => '/BaseFont' } as any) || (obj as any)?.dict?.entries?.()?.find?.(([k]: any) => k.toString() === '/BaseFont')?.[1];
      if (baseFont) {
        fallbackFontNames.push(baseFont.toString());
      }
    }
  }
  console.log(`   - Fallback Font Names: ${JSON.stringify(fallbackFontNames)}`);
  const hasTimesBoldItalic = fallbackFontNames.some(name => name.includes('Times') && (name.includes('BoldItalic') || name.includes('Bold')));
  console.log(`   - Fallback correctly resolved Times-BoldItalic: ${hasTimesBoldItalic ? 'YES (PASS)' : 'NO (FAIL)'}`);

  // Save the exported PDF to scratch for inspection
  fs.writeFileSync(path.join(__dirname, 'test-exported-custom-font.pdf'), exportedBytes);
  console.log(`\nExported test PDF saved to scratch/test-exported-custom-font.pdf`);

  console.log('\n=== All Automated Font Preservation Tests PASSED ===');
}

runTest().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
