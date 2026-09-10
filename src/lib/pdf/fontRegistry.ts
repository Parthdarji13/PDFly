import { PDFDocument, StandardFonts, PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { ExtractedFontInfo } from '../types';

// Browser session cache for registered FontFace objects
const registeredWebFonts = new Map<string, boolean>();

/**
 * Registers an extracted font as a usable web font in the browser using the FontFace API
 */
export async function registerWebFont(fontInfo: ExtractedFontInfo): Promise<boolean> {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !document.fonts) {
    return false;
  }

  if (!fontInfo.data || fontInfo.data.length === 0) {
    return false;
  }

  const fontName = fontInfo.cssFamily;
  if (registeredWebFonts.get(fontName)) {
    return true;
  }

  try {
    // Clone buffer for FontFace to avoid detached buffer issues
    const fontBytes = new Uint8Array(fontInfo.data);
    const buffer = fontBytes.buffer.slice(
      fontBytes.byteOffset,
      fontBytes.byteOffset + fontBytes.byteLength
    ) as ArrayBuffer;

    const fontFace = new FontFace(fontName, buffer, {
      weight: fontInfo.isBold ? 'bold' : 'normal',
      style: fontInfo.isItalic ? 'italic' : 'normal',
    });

    const loadedFace = await fontFace.load();
    document.fonts.add(loadedFace);
    registeredWebFonts.set(fontName, true);
    return true;
  } catch (err) {
    console.warn(`[fontRegistry] Failed to register FontFace for "${fontName}":`, err);
    return false;
  }
}

/**
 * Registers all extracted fonts from a document
 */
export async function registerDocumentWebFonts(
  extractedFonts: Record<string, ExtractedFontInfo>
): Promise<void> {
  if (!extractedFonts) return;
  const promises = Object.values(extractedFonts)
    .filter((f) => f.isEmbedded && f.data)
    .map((f) => registerWebFont(f));
  await Promise.allSettled(promises);
}

/**
 * Embeds or retrieves a font (either standard PDF 14 font or an extracted custom font) into a PDFDocument
 */
export async function getOrEmbedFont(
  pdfDoc: PDFDocument,
  fontKey: string,
  fontCache: Map<string, PDFFont>,
  extractedFonts?: Record<string, ExtractedFontInfo>
): Promise<PDFFont> {
  if (fontCache.has(fontKey)) {
    return fontCache.get(fontKey)!;
  }

  // 1. Check if fontKey refers to an extracted font (by fontKey ID or embedded css family)
  const extracted =
    extractedFonts?.[fontKey] ||
    Object.values(extractedFonts || {}).find(
      (f) => f.id === fontKey || f.cssFamily === fontKey || f.name === fontKey
    );

  if (extracted && extracted.isEmbedded && extracted.data && extracted.data.length > 0) {
    try {
      try {
        pdfDoc.registerFontkit(fontkit);
      } catch {
        // Already registered
      }

      const embeddedFont = await pdfDoc.embedFont(extracted.data);
      fontCache.set(fontKey, embeddedFont);
      return embeddedFont;
    } catch (embedErr) {
      console.warn(
        `[fontRegistry] Failed to embed custom font bytes for "${extracted.name}". Falling back to "${extracted.fallbackPdfKey}":`,
        embedErr
      );
      // Fallback to the extracted font's standard fallback key
      return getOrEmbedFont(pdfDoc, extracted.fallbackPdfKey || 'Helvetica', fontCache);
    }
  }

  // 2. Standard 14 PDF fonts embedding
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
