import {
  PDFDocument,
  rgb,
  degrees,
  PDFFont,
  PDFPage,
} from 'pdf-lib';
import {
  DocumentState,
  EditorElement,
  TextElement,
  DrawElement,
  ShapeElement,
  ImageElement,
  SignatureElement,
  RedactElement,
  ExtractedFontInfo,
} from '../types';
import { getOrEmbedFont } from './fontRegistry';
import { cleanTextForPdf } from './fontMatcher';

/**
 * Parses Hex / RGB color strings into pdf-lib rgb(r, g, b) (0.0 to 1.0)
 */
export function parseColorToRgb(colorStr?: string) {
  if (!colorStr) return rgb(0, 0, 0);

  const clean = colorStr.trim().toLowerCase();

  // Hex format #ffffff or #fff
  if (clean.startsWith('#')) {
    let hex = clean.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    const r = parseInt(hex.substring(0, 2), 16) / 255 || 0;
    const g = parseInt(hex.substring(2, 4), 16) / 255 || 0;
    const b = parseInt(hex.substring(4, 6), 16) / 255 || 0;
    return rgb(r, g, b);
  }

  // RGB format rgb(r, g, b) or rgba(r, g, b, a)
  const rgbMatch = clean.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10) / 255 || 0;
    const g = parseInt(rgbMatch[2], 10) / 255 || 0;
    const b = parseInt(rgbMatch[3], 10) / 255 || 0;
    return rgb(r, g, b);
  }

  return rgb(0, 0, 0);
}

/**
 * Compiles and exports the edited PDF with embedded matching fonts
 */
export async function exportModifiedPDF(documentState: DocumentState): Promise<Uint8Array> {
  let pdfDoc: PDFDocument;

  if (documentState.rawPdfBytes && documentState.rawPdfBytes.length > 0) {
    pdfDoc = await PDFDocument.load(documentState.rawPdfBytes, { ignoreEncryption: true });
  } else {
    pdfDoc = await PDFDocument.create();
  }

  const fontCache = new Map<string, PDFFont>();

  // Ensure total page count matches
  const pdfPages = pdfDoc.getPages();

  // Process elements page by page
  for (let pageIdx = 0; pageIdx < documentState.pages.length; pageIdx++) {
    const pageInfo = documentState.pages[pageIdx];
    let page: PDFPage;

    if (pageIdx < pdfPages.length) {
      page = pdfPages[pageIdx];
    } else {
      page = pdfDoc.addPage([pageInfo.width || 595, pageInfo.height || 842]);
    }

    // Apply rotation if modified
    if (pageInfo.rotation !== undefined) {
      page.setRotation(degrees(pageInfo.rotation));
    }

    const { height: pageHeight } = page.getSize();

    // Filter elements on this page
    const pageElements = documentState.elements.filter(
      (el) => el.pageIndex === pageInfo.pageIndex
    );

    // Sort by z-index
    pageElements.sort((a, b) => a.zIndex - b.zIndex);

    for (const el of pageElements) {
      try {
        switch (el.type) {
          case 'text':
            await renderTextElement(
              pdfDoc,
              page,
              el as TextElement,
              pageHeight,
              fontCache,
              documentState.extractedFonts
            );
            break;
          case 'draw':
            await renderDrawElement(page, el as DrawElement, pageHeight);
            break;
          case 'shape':
            await renderShapeElement(page, el as ShapeElement, pageHeight);
            break;
          case 'image':
            await renderImageElement(pdfDoc, page, el as ImageElement, pageHeight);
            break;
          case 'signature':
            await renderSignatureElement(pdfDoc, page, el as SignatureElement, pageHeight);
            break;
          case 'redact':
            await renderRedactElement(page, el as RedactElement, pageHeight);
            break;
        }
      } catch (err) {
        console.error(`Error rendering element ${el.id}:`, err);
      }
    }
  }

  return await pdfDoc.save();
}

/**
 * Renders Text Elements (both In-Place edits and custom Text Boxes)
 */
async function renderTextElement(
  pdfDoc: PDFDocument,
  page: PDFPage,
  el: TextElement,
  pageHeight: number,
  fontCache: Map<string, PDFFont>,
  extractedFonts?: Record<string, ExtractedFontInfo>
) {
  const fontSize = Math.max(6, el.fontSize || 12);
  const rawText = el.text || '';
  const textLines = rawText.split('\n');
  const lineHeight = fontSize * (el.lineHeight || 1.2);
  const lineCount = Math.max(1, textLines.length);
  const allText = (el.originalText || '') + (el.text || '');
  const hasDescenders = /[gjpqy,;Q]/.test(allText);
  // Glyphs stop at baseline if no descenders (~0.86 * fontSize), or ~0.98 * fontSize if descenders are present
  const singleLineHeight = fontSize * (hasDescenders ? 0.98 : 0.86);
  const totalTextHeight =
    lineCount === 1
      ? singleLineHeight
      : Math.max(el.height || 0, (lineCount - 1) * lineHeight + singleLineHeight);

  // If this text element is an original PDF text item that was NOT modified by the user,
  // skip re-drawing it because the original PDF page already contains this text in native vector format!
  if (el.isOriginalEdit && !el.isModified && el.originalText && el.text === el.originalText) {
    return;
  }

  // 1. If this text replaced an original text item, draw a concealment background patch
  // covering the original text's bounding box and the current element's rendered size.
  if (el.isOriginalEdit && el.originalBBox) {
    const bbox = el.originalBBox;
    const currentW = Math.max(el.width || 0, 0);

    // Calculate union bounding box in top-down screen coordinates (y=0 at top of page)
    const unionMinX = Math.min(bbox.x, el.x);
    const unionMinY = Math.min(bbox.y, el.y);
    const unionMaxX = Math.max(bbox.x + bbox.width, el.x + currentW);

    // Use tight text height so the patch never extends down into adjacent table headers or cell borders
    const unionHeight =
      lineCount === 1
        ? singleLineHeight
        : Math.max(bbox.height, totalTextHeight);
    const unionWidth = Math.max(0, unionMaxX - unionMinX);

    // In PDF coordinates (y=0 at bottom of page)
    const patchX = unionMinX;
    const patchY = Math.max(0, pageHeight - unionMinY - unionHeight);
    const patchW = unionWidth;
    const patchH = unionHeight;

    page.drawRectangle({
      x: patchX,
      y: patchY,
      width: patchW,
      height: patchH,
      color: parseColorToRgb(el.backgroundColor || '#ffffff'),
      opacity: 1,
    });
  } else if (el.backgroundColor && el.backgroundColor !== 'transparent') {
    // Custom text background patch covering tight multi-line height
    const currentW = Math.max(el.width || 0, 0);
    const currentH = totalTextHeight;
    const bgY = Math.max(0, pageHeight - (el.y + currentH));
    page.drawRectangle({
      x: Math.max(0, el.x),
      y: bgY,
      width: currentW,
      height: currentH,
      color: parseColorToRgb(el.backgroundColor),
      opacity: el.opacity ?? 1,
    });
  }

  // Resolve best-matching fallback standard PDF 14 font (always available and full Latin-1 character set)
  const fallbackFont = await resolveStandardFallbackFont(
    pdfDoc,
    el,
    fontCache,
    extractedFonts
  );

  let font: PDFFont | null = null;

  // 1. Try to use real embedded font if available
  if (el.isEmbeddedFont && el.embeddedFontId && extractedFonts) {
    try {
      font = await getOrEmbedFont(pdfDoc, el.embeddedFontId, fontCache, extractedFonts);
    } catch (err) {
      console.warn(
        `[pdfExporter] Element ${el.id}: embedded font "${el.embeddedFontId}" failed to embed:`,
        err
      );
    }
  }

  const textColor = parseColorToRgb(el.color || '#000000');
  let currentVisualY = el.y;

  for (let i = 0; i < textLines.length; i++) {
    const rawLine = textLines[i];
    const line = cleanTextForPdf(rawLine);
    if (line.length === 0) {
      currentVisualY += lineHeight;
      continue;
    }

    // Check if the embedded font can render this line's non-whitespace characters.
    // If characters were added that aren't in the original subset font, fallback to standard font.
    const canUseEmbedded = Boolean(font && fontSupportsText(font, line, true));
    const activeFont = canUseEmbedded && font ? font : fallbackFont;

    // Check if the active font contains a valid glyph for ASCII space (code 32).
    // In PDF subset fonts, space glyphs are almost always absent and mapped to .notdef (glyph 0 / []),
    // because PDF streams use coordinate displacement for word spacing.
    const hasSpaceGlyph = fontHasSpaceGlyph(activeFont);

    // Determine width of space gap
    let spaceWidth = fallbackFont.widthOfTextAtSize(' ', fontSize);
    if (hasSpaceGlyph) {
      try {
        spaceWidth = activeFont.widthOfTextAtSize(' ', fontSize);
      } catch {
        spaceWidth = fallbackFont.widthOfTextAtSize(' ', fontSize);
      }
    }

    // Split line into alternating words and whitespace tokens (e.g. ["Entry-exit", " ", "data", " ", "report"])
    const tokens = line.split(/(\s+)/);

    // Calculate total line width accurately
    let totalLineWidth = 0;
    for (const token of tokens) {
      if (/^\s+$/.test(token)) {
        totalLineWidth += token.length * spaceWidth;
      } else if (token.length > 0) {
        try {
          totalLineWidth += activeFont.widthOfTextAtSize(token, fontSize);
        } catch {
          totalLineWidth += fallbackFont.widthOfTextAtSize(token, fontSize);
        }
      }
    }

    let drawX = el.x;
    if (el.align === 'center') {
      drawX = el.x + (el.width - totalLineWidth) / 2;
    } else if (el.align === 'right') {
      drawX = el.x + el.width - totalLineWidth;
    }

    // PDF baseline calculation: baseline is located at currentVisualY + ascenderHeight from page top
    const drawY = pageHeight - currentVisualY - fontSize * 0.85;

    if (hasSpaceGlyph) {
      // Font supports spaces natively: draw whole line in one call
      try {
        page.drawText(line, {
          x: drawX,
          y: drawY,
          size: fontSize,
          font: activeFont,
          color: textColor,
          opacity: el.opacity ?? 1,
        });
      } catch (drawErr) {
        console.warn(`[pdfExporter] drawText fallback for "${line}":`, drawErr);
        try {
          const asciiLine = line.replace(/[^\x20-\x7E]/g, '?');
          page.drawText(asciiLine, {
            x: drawX,
            y: drawY,
            size: fontSize,
            font: fallbackFont,
            color: textColor,
            opacity: el.opacity ?? 1,
          });
        } catch (fbErr) {
          console.error(`[pdfExporter] Final drawText error:`, fbErr);
        }
      }
    } else {
      // Font is an embedded subset that lacks space glyphs.
      // Draw word tokens and advance X across whitespace WITHOUT drawing missing .notdef space glyphs!
      let curX = drawX;
      for (const token of tokens) {
        if (/^\s+$/.test(token)) {
          curX += token.length * spaceWidth;
        } else if (token.length > 0) {
          try {
            page.drawText(token, {
              x: curX,
              y: drawY,
              size: fontSize,
              font: activeFont,
              color: textColor,
              opacity: el.opacity ?? 1,
            });
            curX += activeFont.widthOfTextAtSize(token, fontSize);
          } catch (tokenErr) {
            console.warn(`[pdfExporter] Token draw fallback for "${token}":`, tokenErr);
            try {
              const asciiToken = token.replace(/[^\x20-\x7E]/g, '?');
              page.drawText(asciiToken, {
                x: curX,
                y: drawY,
                size: fontSize,
                font: fallbackFont,
                color: textColor,
                opacity: el.opacity ?? 1,
              });
              curX += fallbackFont.widthOfTextAtSize(asciiToken, fontSize);
            } catch (tokFbErr) {
              console.error(`[pdfExporter] Token fallback failed:`, tokFbErr);
              curX += token.length * (fontSize * 0.55);
            }
          }
        }
      }
    }

    // Handle Underline
    if (el.underline) {
      page.drawLine({
        start: { x: drawX, y: drawY - 2 },
        end: { x: drawX + totalLineWidth, y: drawY - 2 },
        thickness: Math.max(1, fontSize / 14),
        color: textColor,
        opacity: el.opacity ?? 1,
      });
    }

    currentVisualY += lineHeight;
  }
}

/**
 * Checks whether a font has an explicit glyph for ASCII space (code point 32).
 * Embedded font subsets in PDFs almost always lack space glyphs because word spacing
 * is performed via PDF stream coordinate displacement rather than space glyphs.
 */
export function fontHasSpaceGlyph(font: PDFFont): boolean {
  try {
    const isCustom = (font as any).embedder?.constructor?.name === 'CustomFontEmbedder';
    if (!isCustom) return true; // Standard fonts always have space
    const fkFont = (font as any).embedder?.font;
    if (!fkFont) return true;
    if (typeof fkFont.hasGlyphForCodePoint === 'function') {
      if (!fkFont.hasGlyphForCodePoint(32)) return false;
    }
    if (typeof fkFont.glyphForCodePoint === 'function') {
      const g = fkFont.glyphForCodePoint(32);
      if (!g || g.id === 0 || g.name === '.notdef') return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks whether a font has valid glyphs for all non-whitespace characters in a string.
 * Returns false if any character resolves to .notdef (glyph id 0).
 */
export function fontSupportsText(font: PDFFont, text: string, allowMissingSpace = true): boolean {
  try {
    const isCustom = (font as any).embedder?.constructor?.name === 'CustomFontEmbedder';
    if (!isCustom) {
      try {
        font.encodeText(text);
        return true;
      } catch {
        return false;
      }
    }
    const fkFont = (font as any).embedder?.font;
    if (!fkFont) return true;
    for (let i = 0; i < text.length; i++) {
      const code = text.codePointAt(i);
      if (!code) continue;
      if (code > 0xffff) i++; // advance surrogate pair
      if (code === 32 || code === 9) {
        if (allowMissingSpace) continue;
      }
      if (typeof fkFont.hasGlyphForCodePoint === 'function') {
        if (!fkFont.hasGlyphForCodePoint(code)) return false;
      }
      if (typeof fkFont.glyphForCodePoint === 'function') {
        const g = fkFont.glyphForCodePoint(code);
        if (!g || g.id === 0 || g.name === '.notdef') return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves the closest standard PDF 14 font variant matching the element's family, weight, and style
 */
export async function resolveStandardFallbackFont(
  pdfDoc: PDFDocument,
  el: TextElement,
  fontCache: Map<string, PDFFont>,
  extractedFonts?: Record<string, ExtractedFontInfo>
): Promise<PDFFont> {
  const extracted = el.embeddedFontId && extractedFonts ? extractedFonts[el.embeddedFontId] : null;
  let fallbackFontKey = extracted?.fallbackPdfKey || el.pdfFontKey || 'Helvetica';

  if (el.fontWeight === 'bold' && !fallbackFontKey.includes('Bold')) {
    fallbackFontKey = fallbackFontKey.includes('Times')
      ? el.fontStyle === 'italic'
        ? 'Times-BoldItalic'
        : 'Times-Bold'
      : fallbackFontKey.includes('Courier')
      ? el.fontStyle === 'italic'
        ? 'Courier-BoldOblique'
        : 'Courier-Bold'
      : el.fontStyle === 'italic'
      ? 'Helvetica-BoldOblique'
      : 'Helvetica-Bold';
  } else if (
    el.fontStyle === 'italic' &&
    !fallbackFontKey.includes('Italic') &&
    !fallbackFontKey.includes('Oblique')
  ) {
    fallbackFontKey = fallbackFontKey.includes('Times')
      ? 'Times-Italic'
      : fallbackFontKey.includes('Courier')
      ? 'Courier-Oblique'
      : 'Helvetica-Oblique';
  }

  try {
    return await getOrEmbedFont(pdfDoc, fallbackFontKey, fontCache);
  } catch {
    return await getOrEmbedFont(pdfDoc, 'Helvetica', fontCache);
  }
}

/**
 * Renders Shapes (Rectangles, Circles, Lines, Arrows, Checkmarks)
 */
async function renderShapeElement(page: PDFPage, el: ShapeElement, pageHeight: number) {
  const strokeColor = parseColorToRgb(el.strokeColor || '#2563eb');
  const hasFill = el.fillColor && el.fillColor !== 'transparent';
  const fillColor = hasFill ? parseColorToRgb(el.fillColor) : undefined;
  const strokeWidth = el.strokeWidth || 2;
  const opacity = el.opacity ?? 1;

  const pdfY = pageHeight - el.y - el.height;

  switch (el.shapeType) {
    case 'rect':
    case 'roundedRect':
      page.drawRectangle({
        x: el.x,
        y: pdfY,
        width: el.width,
        height: el.height,
        borderColor: strokeWidth > 0 ? strokeColor : undefined,
        borderWidth: strokeWidth,
        color: fillColor,
        opacity: opacity,
        borderOpacity: opacity,
      });
      break;

    case 'circle':
      page.drawEllipse({
        x: el.x + el.width / 2,
        y: pdfY + el.height / 2,
        xScale: el.width / 2,
        yScale: el.height / 2,
        borderColor: strokeWidth > 0 ? strokeColor : undefined,
        borderWidth: strokeWidth,
        color: fillColor,
        opacity: opacity,
        borderOpacity: opacity,
      });
      break;

    case 'line':
      page.drawLine({
        start: { x: el.x, y: pageHeight - el.y },
        end: { x: el.x + el.width, y: pageHeight - (el.y + el.height) },
        thickness: strokeWidth,
        color: strokeColor,
        opacity: opacity,
      });
      break;

    case 'arrow':
      const startX = el.x;
      const startY = pageHeight - el.y;
      const endX = el.x + el.width;
      const endY = pageHeight - (el.y + el.height);

      // Main line
      page.drawLine({
        start: { x: startX, y: startY },
        end: { x: endX, y: endY },
        thickness: strokeWidth,
        color: strokeColor,
        opacity: opacity,
      });

      // Arrow head calculation
      const angle = Math.atan2(endY - startY, endX - startX);
      const headLength = Math.min(20, Math.max(8, strokeWidth * 4));
      const headAngle = Math.PI / 6; // 30 deg

      const leftHeadX = endX - headLength * Math.cos(angle - headAngle);
      const leftHeadY = endY - headLength * Math.sin(angle - headAngle);
      const rightHeadX = endX - headLength * Math.cos(angle + headAngle);
      const rightHeadY = endY - headLength * Math.sin(angle + headAngle);

      page.drawLine({
        start: { x: endX, y: endY },
        end: { x: leftHeadX, y: leftHeadY },
        thickness: strokeWidth,
        color: strokeColor,
        opacity: opacity,
      });

      page.drawLine({
        start: { x: endX, y: endY },
        end: { x: rightHeadX, y: rightHeadY },
        thickness: strokeWidth,
        color: strokeColor,
        opacity: opacity,
      });
      break;

    case 'checkmark':
      // Draw crisp checkmark
      const cx = el.x;
      const cy = pageHeight - el.y;
      const w = el.width;
      const h = el.height;

      page.drawLine({
        start: { x: cx + w * 0.1, y: cy - h * 0.5 },
        end: { x: cx + w * 0.4, y: cy - h * 0.85 },
        thickness: strokeWidth,
        color: strokeColor,
        opacity: opacity,
      });
      page.drawLine({
        start: { x: cx + w * 0.4, y: cy - h * 0.85 },
        end: { x: cx + w * 0.9, y: cy - h * 0.15 },
        thickness: strokeWidth,
        color: strokeColor,
        opacity: opacity,
      });
      break;
  }
}

/**
 * Renders Freehand Drawing & Highlighter Strokes
 */
async function renderDrawElement(page: PDFPage, el: DrawElement, pageHeight: number) {
  if (!el.points || el.points.length < 2) return;

  const color = parseColorToRgb(el.strokeColor || '#ef4444');
  const thickness = el.strokeWidth || 3;
  const opacity = el.isHighlighter ? 0.35 : (el.opacity ?? 1);

  // Draw continuous smooth segments
  for (let i = 0; i < el.points.length - 1; i++) {
    const p1 = el.points[i];
    const p2 = el.points[i + 1];

    page.drawLine({
      start: { x: p1.x, y: pageHeight - p1.y },
      end: { x: p2.x, y: pageHeight - p2.y },
      thickness: thickness,
      color: color,
      opacity: opacity,
    });
  }
}

/**
 * Renders Image & Stamp elements
 */
async function renderImageElement(
  pdfDoc: PDFDocument,
  page: PDFPage,
  el: ImageElement,
  pageHeight: number
) {
  if (!el.dataUrl) return;

  let image;
  if (el.dataUrl.startsWith('data:image/png')) {
    image = await pdfDoc.embedPng(el.dataUrl);
  } else if (el.dataUrl.startsWith('data:image/jpeg') || el.dataUrl.startsWith('data:image/jpg')) {
    image = await pdfDoc.embedJpg(el.dataUrl);
  } else {
    // If SVG or other, convert through an offscreen canvas
    image = await embedSvgOrOtherImage(pdfDoc, el.dataUrl, el.width, el.height);
  }

  if (!image) return;

  const pdfY = pageHeight - el.y - el.height;

  page.drawImage(image, {
    x: el.x,
    y: pdfY,
    width: el.width,
    height: el.height,
    opacity: el.opacity ?? 1,
    rotate: el.rotation ? degrees(el.rotation) : undefined,
  });
}

/**
 * Renders Signature elements
 */
async function renderSignatureElement(
  pdfDoc: PDFDocument,
  page: PDFPage,
  el: SignatureElement,
  pageHeight: number
) {
  if (!el.dataUrl) return;

  let image;
  if (el.dataUrl.startsWith('data:image/png')) {
    image = await pdfDoc.embedPng(el.dataUrl);
  } else {
    image = await pdfDoc.embedPng(el.dataUrl);
  }

  const pdfY = pageHeight - el.y - el.height;

  page.drawImage(image, {
    x: el.x,
    y: pdfY,
    width: el.width,
    height: el.height,
    opacity: el.opacity ?? 1,
    rotate: el.rotation ? degrees(el.rotation) : undefined,
  });
}

/**
 * Renders Redaction / Whiteout elements
 */
async function renderRedactElement(page: PDFPage, el: RedactElement, pageHeight: number) {
  const isBlackout = el.redactType === 'blackout';
  const color = isBlackout ? rgb(0, 0, 0) : rgb(1, 1, 1);
  const pdfY = pageHeight - el.y - el.height;

  page.drawRectangle({
    x: el.x,
    y: pdfY,
    width: el.width,
    height: el.height,
    color: color,
    opacity: 1,
  });
}

/**
 * Helper to embed SVG stamps or canvas data
 */
async function embedSvgOrOtherImage(
  pdfDoc: PDFDocument,
  dataUrl: string,
  width: number,
  height: number
) {
  return new Promise<any>((resolve) => {
    if (typeof window === 'undefined') return resolve(null);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(100, Math.round(width * 2));
      canvas.height = Math.max(50, Math.round(height * 2));
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const pngData = canvas.toDataURL('image/png');
      const embedded = await pdfDoc.embedPng(pngData);
      resolve(embedded);
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

/**
 * Triggers a browser download of the exported PDF bytes
 */
export function downloadPdfBlob(bytes: Uint8Array, fileName: string = 'edited-document.pdf') {
  const blob = new Blob([bytes as any], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
