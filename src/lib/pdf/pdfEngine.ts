import * as pdfjsLib from 'pdfjs-dist';
import { PageInfo, DetectedTextItem, ExtractedFontInfo } from '../types';
import { matchPdfFont, calculateFontSizeFromTransform, cleanPdfFontName } from './fontMatcher';
import { registerWebFont } from './fontRegistry';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

export interface LoadedPDF {
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  pageCount: number;
  pages: PageInfo[];
  extractedFonts: Record<string, ExtractedFontInfo>;
}

/**
 * Safely retrieves an object from PDF.js commonObjs
 */
function getCommonObj(commonObjs: any, id: string): Promise<any> {
  return new Promise((resolve) => {
    try {
      if (!commonObjs || !id) return resolve(null);
      if (typeof commonObjs.has === 'function' && !commonObjs.has(id)) {
        return resolve(null);
      }
      commonObjs.get(id, (obj: any) => resolve(obj));
    } catch {
      resolve(null);
    }
  });
}

/**
 * Loads a PDF from an ArrayBuffer or Uint8Array
 */
export async function loadPDFDocument(data: Uint8Array | ArrayBuffer): Promise<LoadedPDF> {
  const uint8Data = data instanceof Uint8Array ? data : new Uint8Array(data);

  if (uint8Data.byteLength === 0) {
    throw new Error('PDF file is empty (0 bytes).');
  }

  const loadingTask = pdfjsLib.getDocument({
    data: uint8Data,
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/standard_fonts/',
    fontExtraProperties: true,
  });

  let pdfDoc: pdfjsLib.PDFDocumentProxy;
  try {
    pdfDoc = await loadingTask.promise;
  } catch (err: any) {
    if (err?.name === 'PasswordException') {
      throw new Error('This PDF is password protected. Please unlock it before editing.');
    }
    if (err?.name === 'InvalidPDFException') {
      throw new Error('The selected file is not a valid PDF or is corrupted.');
    }
    throw err;
  }

  const pageCount = pdfDoc.numPages;
  const pages: PageInfo[] = [];
  const extractedFonts: Record<string, ExtractedFontInfo> = {};

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: 1.0 });

    // Trigger operator list execution so font objects are compiled into commonObjs
    try {
      await page.getOperatorList();
    } catch (opErr) {
      console.warn(`[pdfEngine] Warning: getOperatorList failed on page ${i}:`, opErr);
    }

    const textContent = await page.getTextContent();
    const textItems: DetectedTextItem[] = [];

    // First pass: extract all fonts used on this page
    for (const item of textContent.items as any[]) {
      const fontId = item.fontName;
      if (fontId && !extractedFonts[fontId]) {
        try {
          const fontObj = await getCommonObj(page.commonObjs, fontId);
          const rawName = fontObj?.name || fontObj?.loadedName || fontId;
          const cleanName = cleanPdfFontName(rawName);
          const hasData = Boolean(fontObj?.data && fontObj.data.length > 0);
          const fontBytes = hasData ? new Uint8Array(fontObj.data) : null;

          const matchedFallback = matchPdfFont(rawName, undefined, {
            flags: fontObj?.flags,
            ascent: fontObj?.ascent,
            descent: fontObj?.descent,
            isBold: fontObj?.bold,
            isItalic: fontObj?.italic,
            isMonospace: fontObj?.isMonospace,
            isSerifFont: fontObj?.isSerifFont,
          });

          // Generate unique CSS family name for FontFace registration
          const sanitizedId = fontId.replace(/[^a-zA-Z0-9_-]/g, '_');
          const cssFamily = hasData ? `PDF_Font_${sanitizedId}` : matchedFallback.cssFontFamily;

          // Format clean human family name (e.g. "TimesNewRomanPSMT" -> "Times New Roman")
          let humanFamily = cleanName
            .replace(/PSMT|MT|PS|MS/gi, '')
            .replace(/[-_]/g, ' ')
            .trim();
          if (!humanFamily || humanFamily.length === 0) {
            humanFamily = matchedFallback.fontFamily;
          }

          const fontInfo: ExtractedFontInfo = {
            id: fontId,
            name: rawName,
            cleanName,
            family: humanFamily,
            cssFamily,
            isEmbedded: hasData,
            data: fontBytes,
            mimetype: fontObj?.mimetype || (hasData ? 'font/opentype' : undefined),
            flags: fontObj?.flags,
            ascent: fontObj?.ascent,
            descent: fontObj?.descent,
            isBold: matchedFallback.isBold,
            isItalic: matchedFallback.isItalic,
            isMonospace: matchedFallback.category === 'monospace',
            isSerif: matchedFallback.category === 'serif',
            category: matchedFallback.category,
            fallbackPdfKey: matchedFallback.pdfFontKey,
            fallbackCssFamily: matchedFallback.cssFontFamily,
          };

          extractedFonts[fontId] = fontInfo;

          // Register in browser document.fonts if embedded font bytes are available
          if (hasData) {
            registerWebFont(fontInfo).catch((err) => {
              console.warn(`[pdfEngine] Failed to register web font for ${rawName}:`, err);
            });
          }
        } catch (fontErr) {
          console.warn(`[pdfEngine] Error extracting font ${fontId}:`, fontErr);
        }
      }
    }

    // Extract text items with accurate typography and bounding boxes
    textContent.items.forEach((item: any, idx: number) => {
      if (!item.str || item.str.trim() === '') return;

      const transform = item.transform || [1, 0, 0, 1, 0, 0];
      const tx = transform[4];
      const ty = transform[5];
      const itemWidth = item.width || 0;
      const itemHeight = item.height || 0;

      const fontObjInfo = extractedFonts[item.fontName];
      const isEmbedded = Boolean(fontObjInfo?.isEmbedded);

      // Calculate font info
      const fontInfo = matchPdfFont(item.fontName, transform, {
        flags: fontObjInfo?.flags,
        ascent: fontObjInfo?.ascent,
        descent: fontObjInfo?.descent,
        isBold: fontObjInfo?.isBold,
        isItalic: fontObjInfo?.isItalic,
        isMonospace: fontObjInfo?.isMonospace,
        isSerifFont: fontObjInfo?.isSerif,
      });

      const fontSize = calculateFontSizeFromTransform(transform, itemHeight);

      // Convert PDF coordinate system (origin bottom-left) to visual top-left
      const visualY = viewport.height - ty - fontSize;
      const visualX = tx;

      const displayFontFamily = isEmbedded
        ? fontObjInfo!.cssFamily
        : fontObjInfo?.fallbackCssFamily || fontInfo.fontFamily;

      const pdfFontKey = isEmbedded
        ? item.fontName
        : fontObjInfo?.fallbackPdfKey || fontInfo.pdfFontKey;

      textItems.push({
        id: `page-${i - 1}-text-${idx}`,
        pageIndex: i - 1,
        text: item.str,
        x: tx,
        y: ty,
        visualX: visualX,
        visualY: Math.max(0, visualY),
        width: itemWidth > 0 ? itemWidth : item.str.length * (fontSize * 0.6),
        height: Math.max(fontSize, itemHeight),
        fontName: item.fontName || '',
        cleanFontName: fontObjInfo?.cleanName || cleanPdfFontName(item.fontName || ''),
        fontFamily: displayFontFamily,
        pdfFontKey: pdfFontKey,
        fontSize: fontSize,
        fontWeight: fontObjInfo?.isBold ? 'bold' : fontInfo.fontWeight,
        fontStyle: fontObjInfo?.isItalic ? 'italic' : fontInfo.fontStyle,
        color: '#000000',
        backgroundColor: '#ffffff',
        transform: transform,
        dir: item.dir || 'ltr',
        hasEOL: !!item.hasEOL,
        isEmbeddedFont: isEmbedded,
        fontMatchQuality: isEmbedded ? 'original' : 'closest-match',
        embeddedFontId: isEmbedded ? item.fontName : undefined,
      });
    });

    pages.push({
      pageIndex: i - 1,
      pageNumber: i,
      width: viewport.width,
      height: viewport.height,
      originalWidth: viewport.width,
      originalHeight: viewport.height,
      rotation: page.rotate || 0,
      textItems,
    });
  }

  return { pdfDoc, pageCount, pages, extractedFonts };
}

export interface RenderTaskHandle {
  promise: Promise<void>;
  cancel: () => void;
}

/**
 * Renders a PDF page to an HTML5 canvas at high resolution with cancellation support
 */
export function renderPageToCanvas(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number = 2.0
): RenderTaskHandle {
  let renderTask: pdfjsLib.RenderTask | null = null;
  let isCancelled = false;

  const promise = (async () => {
    if (pageNumber < 1 || pageNumber > pdfDoc.numPages) {
      // Synthetic or added blank page
      const defaultWidth = 595;
      const defaultHeight = 842;
      canvas.width = defaultWidth * scale;
      canvas.height = defaultHeight * scale;
      canvas.style.width = `${defaultWidth}px`;
      canvas.style.height = `${defaultHeight}px`;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (ctx && !isCancelled) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const page = await pdfDoc.getPage(pageNumber);
    if (isCancelled) return;

    const viewport = page.getViewport({ scale });

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = `${viewport.width / scale}px`;
    canvas.style.height = `${viewport.height / scale}px`;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx || isCancelled) return;

    // Fill with crisp white background before rendering
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
      enableWebGL: true,
    };

    renderTask = page.render(renderContext);

    try {
      await renderTask.promise;
    } catch (err: any) {
      if (err?.name === 'RenderingCancelledException' || isCancelled) {
        // Suppress expected cancellation error
        return;
      }
      throw err;
    }
  })();

  return {
    promise,
    cancel: () => {
      isCancelled = true;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch {
          // Ignore cancel error
        }
      }
    },
  };
}

/**
 * Generates a thumbnail image data URL for a page
 */
export async function generatePageThumbnail(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  thumbnailWidth: number = 180
): Promise<string> {
  if (pageNumber < 1 || pageNumber > pdfDoc.numPages) {
    // Return a clean blank thumbnail
    const canvas = document.createElement('canvas');
    canvas.width = thumbnailWidth;
    canvas.height = Math.round(thumbnailWidth * 1.414);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#e2e8f0';
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
    }
    return canvas.toDataURL('image/jpeg', 0.85);
  }

  try {
    const page = await pdfDoc.getPage(pageNumber);
    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const scale = thumbnailWidth / Math.max(1, unscaledViewport.width);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return '';

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport: viewport,
    }).promise;

    return canvas.toDataURL('image/jpeg', 0.85);
  } catch (err) {
    console.warn(`Failed to generate thumbnail for page ${pageNumber}:`, err);
    return '';
  }
}
