import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { getPdfjsLib } from './pdfEngine';

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
  if (!files || files.length === 0) {
    throw new Error('Please select at least one PDF file to merge.');
  }

  const mergedPdf = await PDFDocument.create();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.size === 0) {
      throw new Error(`File "${file.name}" is empty (0 bytes).`);
    }

    try {
      const fileBytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    } catch (err: any) {
      if (err?.message?.includes('password') || err?.name === 'PasswordException') {
        throw new Error(`File "${file.name}" is password-protected. Please unlock it before merging.`);
      }
      throw new Error(`Failed to read "${file.name}": ${err.message || 'Corrupted or invalid PDF'}`);
    }
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
  if (!file || file.size === 0) {
    throw new Error('The selected PDF file is empty or invalid.');
  }

  const fileBytes = await file.arrayBuffer();
  let srcPdf: PDFDocument;
  try {
    srcPdf = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
  } catch (err: any) {
    if (err?.message?.includes('password') || err?.name === 'PasswordException') {
      throw new Error('This PDF is password-protected. Please remove password protection before splitting.');
    }
    throw new Error(`Could not load PDF: ${err.message || 'Invalid or corrupted PDF file'}`);
  }

  const totalPages = srcPdf.getPageCount();
  if (totalPages === 0) {
    throw new Error('The selected PDF document contains no pages.');
  }

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

  if (results.length === 0) {
    throw new Error('No valid pages matched the specified range. Please check the page numbers.');
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
  if (!file || file.size === 0) {
    throw new Error('The selected PDF file is empty or invalid.');
  }

  const pdfjs = await getPdfjsLib();
  const fileBytes = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(fileBytes),
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/standard_fonts/',
  });

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
 * Helper to convert any browser image file (including WebP, AVIF, GIF, BMP) to PNG bytes
 */
async function convertImageFileToPngBytes(file: File): Promise<{ bytes: ArrayBuffer; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context for image conversion'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(async (blob) => {
        if (!blob) {
          reject(new Error('Failed to convert image to blob'));
          return;
        }
        const buffer = await blob.arrayBuffer();
        resolve({ bytes: buffer, width: canvas.width, height: canvas.height });
      }, 'image/png');
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not load image: ${file.name}`));
    };

    img.src = url;
  });
}

/**
 * Converts multiple image files (JPG/PNG/WebP/etc) into a single multi-page PDF document
 */
export async function imagesToPdf(
  files: File[],
  pageSize: 'fit' | 'a4' = 'fit'
): Promise<Uint8Array> {
  if (!files || files.length === 0) {
    throw new Error('Please select at least one image file.');
  }

  const pdfDoc = await PDFDocument.create();

  for (const file of files) {
    if (file.size === 0) continue;

    let embeddedImage;
    let imgWidth = 595;
    let imgHeight = 842;

    const isJpeg = file.type === 'image/jpeg' || file.name.match(/\.(jpe?g)$/i);
    const isPng = file.type === 'image/png' || file.name.match(/\.png$/i);

    if (isJpeg) {
      const imageBytes = await file.arrayBuffer();
      embeddedImage = await pdfDoc.embedJpg(imageBytes);
      imgWidth = embeddedImage.width;
      imgHeight = embeddedImage.height;
    } else if (isPng) {
      const imageBytes = await file.arrayBuffer();
      embeddedImage = await pdfDoc.embedPng(imageBytes);
      imgWidth = embeddedImage.width;
      imgHeight = embeddedImage.height;
    } else {
      // Convert WebP / GIF / other image formats to clean PNG in browser
      const converted = await convertImageFileToPngBytes(file);
      embeddedImage = await pdfDoc.embedPng(converted.bytes);
      imgWidth = converted.width;
      imgHeight = converted.height;
    }

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
  if (!file || file.size === 0) {
    throw new Error('The selected PDF file is empty or invalid.');
  }

  const fileBytes = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  // Robust hex color conversion
  let r = 0.5, g = 0.5, b = 0.5;
  const hex = (options.color || '#ef4444').replace('#', '').trim();
  if (hex.length === 3) {
    const expanded = hex.split('').map((c) => c + c).join('');
    r = parseInt(expanded.substring(0, 2), 16) / 255 || 0.5;
    g = parseInt(expanded.substring(2, 4), 16) / 255 || 0.5;
    b = parseInt(expanded.substring(4, 6), 16) / 255 || 0.5;
  } else if (hex.length >= 6) {
    r = parseInt(hex.substring(0, 2), 16) / 255 || 0.5;
    g = parseInt(hex.substring(2, 4), 16) / 255 || 0.5;
    b = parseInt(hex.substring(4, 6), 16) / 255 || 0.5;
  }

  const watermarkText = options.text || 'CONFIDENTIAL';
  const fontSize = options.fontSize || 48;

  for (const page of pages) {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
    const textHeight = font.heightAtSize(fontSize);

    let x = (width - textWidth) / 2;
    let y = (height - textHeight) / 2;

    if (options.position === 'bottom-right') {
      x = width - textWidth - 30;
      y = 30;
    } else if (options.position === 'top-left') {
      x = 30;
      y = height - textHeight - 30;
    }

    page.drawText(watermarkText, {
      x: x,
      y: y,
      size: fontSize,
      font: font,
      color: rgb(r, g, b),
      opacity: options.opacity ?? 0.3,
      rotate: degrees(options.rotation || 0),
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
  if (!file || file.size === 0) {
    throw new Error('The selected PDF file is empty or invalid.');
  }

  const originalSize = file.size;
  const fileBytes = await file.arrayBuffer();
  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
  } catch (err: any) {
    if (err?.message?.includes('password') || err?.name === 'PasswordException') {
      throw new Error('This PDF is password-protected. Please unlock it before compressing.');
    }
    throw new Error(`Failed to load PDF: ${err.message || 'Invalid or corrupted PDF file'}`);
  }

  // Save with compressed object streams
  const bytes = await pdfDoc.save({ useObjectStreams: true });
  const newSize = bytes.byteLength;

  return { bytes, originalSize, newSize };
}
