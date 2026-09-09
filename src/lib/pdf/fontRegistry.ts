import { PDFDocument, StandardFonts, PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

export async function getOrEmbedFont(
  pdfDoc: PDFDocument,
  fontKey: string,
  fontCache: Map<string, PDFFont>
): Promise<PDFFont> {
  if (fontCache.has(fontKey)) {
    return fontCache.get(fontKey)!;
  }

  // Register fontkit if needed for custom fonts
  try {
    pdfDoc.registerFontkit(fontkit);
  } catch {
    // Already registered
  }

  let font: PDFFont;

  switch (fontKey) {
    case 'Helvetica':
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      break;
    case 'Helvetica-Bold':
      font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      break;
    case 'Helvetica-Oblique':
      font = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
      break;
    case 'Helvetica-BoldOblique':
      font = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
      break;
    case 'Times-Roman':
      font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      break;
    case 'Times-Bold':
      font = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      break;
    case 'Times-Italic':
      font = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
      break;
    case 'Times-BoldItalic':
      font = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);
      break;
    case 'Courier':
      font = await pdfDoc.embedFont(StandardFonts.Courier);
      break;
    case 'Courier-Bold':
      font = await pdfDoc.embedFont(StandardFonts.CourierBold);
      break;
    case 'Courier-Oblique':
      font = await pdfDoc.embedFont(StandardFonts.CourierOblique);
      break;
    case 'Courier-BoldOblique':
      font = await pdfDoc.embedFont(StandardFonts.CourierBoldOblique);
      break;
    case 'Symbol':
      font = await pdfDoc.embedFont(StandardFonts.Symbol);
      break;
    case 'ZapfDingbats':
      font = await pdfDoc.embedFont(StandardFonts.ZapfDingbats);
      break;
    default:
      // Fallback to Helvetica
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      break;
  }

  fontCache.set(fontKey, font);
  return font;
}
