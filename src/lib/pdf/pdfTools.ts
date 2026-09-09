import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

export interface WatermarkOptions {
  text: string;
  fontSize: number;
  color: string;
  opacity: number;
  rotation: number;
  position: 'center' | 'diagonal' | 'bottom-right' | 'top-left';
}

/**
 * Merge multiple PDF files into a single unified PDF
 */
export async function mergePdfFiles(files: File[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const fileBytes = await file.arrayBuffer();
    const pdf = await PDFDocument.load(fileBytes);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  return await mergedPdf.save();
}

/**
 * Split a PDF file by ranges (e.g. "1-3, 5") or extract all pages
 */
export async function splitPdf(
  file: File,
  rangeStr: string
): Promise<{ fileName: string; bytes: Uint8Array }[]> {
  const fileBytes = await file.arrayBuffer();
  const srcPdf = await PDFDocument.load(fileBytes);
  const totalPages = srcPdf.getPageCount();
  const results: { fileName: string; bytes: Uint8Array }[] = [];

  // Parse ranges e.g. "1-3, 5, 8-10"
  const parts = rangeStr.split(',').map((p) => p.trim()).filter(Boolean);

  if (parts.length === 0) {
    // Extract each page individually
    for (let i = 0; i < totalPages; i++) {
      const newPdf = await PDFDocument.create();
      const [copiedPage] = await newPdf.copyPages(srcPdf, [i]);
      newPdf.addPage(copiedPage);
      const bytes = await newPdf.save();
      const baseName = file.name.replace(/\.pdf$/i, '');
      results.push({ fileName: `${baseName}_page_${i + 1}.pdf`, bytes });
    }
  } else {
    for (let rIdx = 0; rIdx < parts.length; rIdx++) {
      const part = parts[rIdx];
      const newPdf = await PDFDocument.create();
      let pageIndices: number[] = [];

      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        const start = Math.max(1, parseInt(startStr, 10) || 1);
        const end = Math.min(totalPages, parseInt(endStr, 10) || totalPages);
        for (let p = start; p <= end; p++) {
          pageIndices.push(p - 1);
        }
      } else {
        const pNum = parseInt(part, 10);
        if (!isNaN(pNum) && pNum >= 1 && pNum <= totalPages) {
          pageIndices.push(pNum - 1);
        }
      }

      if (pageIndices.length > 0) {
        const copiedPages = await newPdf.copyPages(srcPdf, pageIndices);
        copiedPages.forEach((p) => newPdf.addPage(p));
        const bytes = await newPdf.save();
        const baseName = file.name.replace(/\.pdf$/i, '');
        results.push({ fileName: `${baseName}_part_${rIdx + 1}.pdf`, bytes });
      }
    }
  }

  return results;
}

/**
 * Converts PDF pages into high-resolution PNG or JPEG images
 */
export async function pdfToImages(
  file: File,
  format: 'png' | 'jpeg' = 'png',
  scale: number = 2.0
): Promise<{ pageNumber: number; dataUrl: string }[]> {
  const fileBytes = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(fileBytes) });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const images: { pageNumber: number; dataUrl: string }[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d', { alpha: false });

    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: ctx,
        viewport: viewport,
      }).promise;

      const dataUrl = canvas.toDataURL(format === 'png' ? 'image/png' : 'image/jpeg', 0.92);
      images.push({ pageNumber: i, dataUrl });
    }
  }

  return images;
}

/**
 * Converts multiple image files (JPG/PNG) into a single multi-page PDF document
 */
export async function imagesToPdf(
  files: File[],
  pageSize: 'fit' | 'a4' = 'fit'
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  for (const file of files) {
    const imageBytes = await file.arrayBuffer();
    let embeddedImage;

    if (file.type === 'image/jpeg' || file.name.match(/\.(jpe?g)$/i)) {
      embeddedImage = await pdfDoc.embedJpg(imageBytes);
    } else {
      embeddedImage = await pdfDoc.embedPng(imageBytes);
    }

    const { width: imgWidth, height: imgHeight } = embeddedImage;

    if (pageSize === 'fit') {
      const page = pdfDoc.addPage([imgWidth, imgHeight]);
      page.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: imgWidth,
        height: imgHeight,
      });
    } else {
      // Standard A4: 595 x 842 pt
      const page = pdfDoc.addPage([595.28, 841.89]);
      const margin = 20;
      const maxWidth = 595.28 - margin * 2;
      const maxHeight = 841.89 - margin * 2;
      const ratio = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
      const renderWidth = imgWidth * ratio;
      const renderHeight = imgHeight * ratio;

      page.drawImage(embeddedImage, {
        x: (595.28 - renderWidth) / 2,
        y: (841.89 - renderHeight) / 2,
        width: renderWidth,
        height: renderHeight,
      });
    }
  }

  return await pdfDoc.save();
}

/**
 * Adds a custom watermark (text or image) to all pages of a PDF
 */
export async function watermarkPdf(
  file: File,
  options: WatermarkOptions
): Promise<Uint8Array> {
  const fileBytes = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(fileBytes);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  // Convert hex color to rgb
  const hex = options.color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255 || 0.5;
  const g = parseInt(hex.substring(2, 4), 16) / 255 || 0.5;
  const b = parseInt(hex.substring(4, 6), 16) / 255 || 0.5;

  for (const page of pages) {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(options.text, options.fontSize);
    const textHeight = font.heightAtSize(options.fontSize);

    let x = (width - textWidth) / 2;
    let y = (height - textHeight) / 2;

    if (options.position === 'bottom-right') {
      x = width - textWidth - 30;
      y = 30;
    } else if (options.position === 'top-left') {
      x = 30;
      y = height - textHeight - 30;
    }

    page.drawText(options.text, {
      x: x,
      y: y,
      size: options.fontSize,
      font: font,
      color: rgb(r, g, b),
      opacity: options.opacity,
      rotate: degrees(options.rotation),
    });
  }

  return await pdfDoc.save();
}

/**
 * Optimizes and compresses a PDF file
 */
export async function compressPdf(
  file: File
): Promise<{ bytes: Uint8Array; originalSize: number; newSize: number }> {
  const originalSize = file.size;
  const fileBytes = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });

  // Save with compressed object streams
  const bytes = await pdfDoc.save({ useObjectStreams: true });
  const newSize = bytes.byteLength;

  return { bytes, originalSize, newSize };
}
