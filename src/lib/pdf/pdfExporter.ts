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
} from '../types';
import { getOrEmbedFont } from './fontRegistry';

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
            await renderTextElement(pdfDoc, page, el as TextElement, pageHeight, fontCache);
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
  fontCache: Map<string, PDFFont>
) {
  // If this text replaced an original text item, draw a concealment background patch over the original text
  if (el.isOriginalEdit && el.originalBBox) {
    const bbox = el.originalBBox;
    const patchX = Math.max(0, bbox.x - 2);
    // Convert visual Y from top to PDF Y from bottom
    const patchY = pageHeight - bbox.y - bbox.height - 2;
    const patchW = bbox.width + 4;
    const patchH = bbox.height + 4;

    page.drawRectangle({
      x: patchX,
      y: patchY,
      width: patchW,
      height: patchH,
      color: parseColorToRgb(el.backgroundColor || '#ffffff'),
      opacity: 1,
    });
  } else if (el.backgroundColor && el.backgroundColor !== 'transparent') {
    // Custom text background
    const bgY = pageHeight - el.y - el.height;
    page.drawRectangle({
      x: el.x,
      y: bgY,
      width: el.width,
      height: el.height,
      color: parseColorToRgb(el.backgroundColor),
      opacity: el.opacity ?? 1,
    });
  }

  // Embed the matching font
  let fontKey = el.pdfFontKey || 'Helvetica';
  if (el.fontWeight === 'bold' && !fontKey.includes('Bold')) {
    fontKey = fontKey.includes('Times')
      ? el.fontStyle === 'italic'
        ? 'Times-BoldItalic'
        : 'Times-Bold'
      : fontKey.includes('Courier')
      ? el.fontStyle === 'italic'
        ? 'Courier-BoldOblique'
        : 'Courier-Bold'
      : el.fontStyle === 'italic'
      ? 'Helvetica-BoldOblique'
      : 'Helvetica-Bold';
  } else if (el.fontStyle === 'italic' && !fontKey.includes('Italic') && !fontKey.includes('Oblique')) {
    fontKey = fontKey.includes('Times')
      ? 'Times-Italic'
      : fontKey.includes('Courier')
      ? 'Courier-Oblique'
      : 'Helvetica-Oblique';
  }

  const font = await getOrEmbedFont(pdfDoc, fontKey, fontCache);
  const textColor = parseColorToRgb(el.color || '#000000');
  const fontSize = Math.max(6, el.fontSize || 12);
  const textLines = (el.text || '').split('\n');
  const lineHeight = fontSize * (el.lineHeight || 1.25);

  let currentVisualY = el.y;

  for (let i = 0; i < textLines.length; i++) {
    const line = textLines[i];
    if (line.length === 0) {
      currentVisualY += lineHeight;
      continue;
    }

    const textWidth = font.widthOfTextAtSize(line, fontSize);
    let drawX = el.x;

    if (el.align === 'center') {
      drawX = el.x + (el.width - textWidth) / 2;
    } else if (el.align === 'right') {
      drawX = el.x + el.width - textWidth;
    }

    // PDF baseline calculation: visual Y is from top, PDF coordinate is from bottom
    const drawY = pageHeight - currentVisualY - fontSize;

    page.drawText(line, {
      x: drawX,
      y: drawY,
      size: fontSize,
      font: font,
      color: textColor,
      opacity: el.opacity ?? 1,
    });

    // Handle Underline
    if (el.underline) {
      page.drawLine({
        start: { x: drawX, y: drawY - 2 },
        end: { x: drawX + textWidth, y: drawY - 2 },
        thickness: Math.max(1, fontSize / 14),
        color: textColor,
        opacity: el.opacity ?? 1,
      });
    }

    currentVisualY += lineHeight;
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
