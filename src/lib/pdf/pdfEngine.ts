import * as pdfjsLib from 'pdfjs-dist';
import { PageInfo, DetectedTextItem } from '../types';
import { matchPdfFont, calculateFontSizeFromTransform } from './fontMatcher';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

export interface LoadedPDF {
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  pageCount: number;
  pages: PageInfo[];
}

/**
 * Loads a PDF from an ArrayBuffer or Uint8Array
 */
export async function loadPDFDocument(data: Uint8Array | ArrayBuffer): Promise<LoadedPDF> {
  const loadingTask = pdfjsLib.getDocument({
    data: data instanceof Uint8Array ? data : new Uint8Array(data),
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/standard_fonts/',
  });

  const pdfDoc = await loadingTask.promise;
  const pageCount = pdfDoc.numPages;
  const pages: PageInfo[] = [];

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: 1.0 });

    const textContent = await page.getTextContent();
    const textItems: DetectedTextItem[] = [];

    // Extract text items with accurate typography and bounding boxes
    textContent.items.forEach((item: any, idx: number) => {
      if (!item.str || item.str.trim() === '') return;

      const transform = item.transform || [1, 0, 0, 1, 0, 0];
      const tx = transform[4];
      const ty = transform[5];
      const itemWidth = item.width || 0;
      const itemHeight = item.height || 0;

      // Calculate font info
      const fontInfo = matchPdfFont(item.fontName, transform);
      const fontSize = calculateFontSizeFromTransform(transform, itemHeight);

      // Convert PDF coordinate system (origin bottom-left) to visual top-left
      // visualY is distance from page top in points
      const visualY = viewport.height - ty - fontSize;
      const visualX = tx;

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
        fontFamily: fontInfo.fontFamily,
        pdfFontKey: fontInfo.pdfFontKey,
        fontSize: fontSize,
        fontWeight: fontInfo.fontWeight,
        fontStyle: fontInfo.fontStyle,
        color: '#000000',
        backgroundColor: '#ffffff',
        transform: transform,
        dir: item.dir || 'ltr',
        hasEOL: !!item.hasEOL,
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

  return { pdfDoc, pageCount, pages };
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
  const page = await pdfDoc.getPage(pageNumber);
  const unscaledViewport = page.getViewport({ scale: 1.0 });
  const scale = thumbnailWidth / unscaledViewport.width;
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
}
