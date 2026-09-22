export interface FontDescriptors {
  flags?: number;
  ascent?: number;
  descent?: number;
  isBold?: boolean;
  isItalic?: boolean;
  isMonospace?: boolean;
  isSerifFont?: boolean;
}

export interface MatchedFontInfo {
  fontFamily: string;
  cssFontFamily: string;
  pdfFontKey: string;
  isBold: boolean;
  isItalic: boolean;
  fontWeight: 'normal' | 'bold' | '500' | '600' | '700';
  fontStyle: 'normal' | 'italic' | 'oblique';
  category: 'sans-serif' | 'serif' | 'monospace' | 'script' | 'symbol';
}

/**
 * Strips PDF subset prefix (e.g. "ABCDEF+Roboto-Bold" -> "Roboto-Bold")
 */
export function cleanPdfFontName(rawName: string): string {
  if (!rawName) return 'Helvetica';
  return rawName.replace(/^[A-Z0-9]{6}\+/i, '').replace(/,/g, '-');
}

/**
 * Cleans string for safe, crisp PDF rendering (replaces unicode spaces,
 * standardizes quotes/dashes, and strips non-printable control characters).
 */
export function cleanTextForPdf(text: string): string {
  if (!text) return '';
  return text
    // Replace tabs with standard ASCII space
    .replace(/\t/g, ' ')
    // Replace all unicode space variants with standard ASCII space
    .replace(/[\u00A0\u1680\u180E\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    // Remove zero-width characters, soft hyphens, byte-order-marks, replacement chars, Private Use Area chars
    .replace(/[\u200B-\u200D\uFEFF\u00AD\u2060\uFFFD\uE000-\uF8FF]/g, '')
    // Standardize bullet variants to standard bullet/dash
    .replace(/[\u2022\u2023\u25E6\u25AA\u25AB\u2219]/g, '•')
    // Standardize smart quotes and apostrophes to standard ASCII
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    // Standardize dashes/hyphens
    .replace(/[\u2013\u2014\u2212]/g, '-')
    // Standardize ellipsis
    .replace(/\u2026/g, '...')
    // Remove non-printable control characters (except newline \n)
    .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    .trimEnd();
}

/**
 * Parses PDF FontDescriptor /Flags bitmask
 * ISO 32000-1 Table 123 - Font descriptor flags:
 * Bit 1 (1 << 0): FixedPitch
 * Bit 2 (1 << 1): Serif
 * Bit 3 (1 << 2): Symbolic
 * Bit 4 (1 << 3): Script
 * Bit 6 (1 << 5): Nonsymbolic
 * Bit 7 (1 << 6): Italic
 * Bit 19 (1 << 18): ForceBold
 */
export function parseFontFlags(flags?: number) {
  if (typeof flags !== 'number') {
    return {
      isFixedPitch: false,
      isSerif: false,
      isSymbolic: false,
      isScript: false,
      isItalic: false,
      isForceBold: false,
    };
  }

  return {
    isFixedPitch: Boolean(flags & (1 << 0)),
    isSerif: Boolean(flags & (1 << 1)),
    isSymbolic: Boolean(flags & (1 << 2)),
    isScript: Boolean(flags & (1 << 3)),
    isItalic: Boolean(flags & (1 << 6)),
    isForceBold: Boolean(flags & (1 << 18)),
  };
}

/**
 * Common available font families in the editor
 */
export const AVAILABLE_FONTS = [
  { id: 'Helvetica', name: 'Helvetica / Arial', category: 'sans-serif', css: 'Helvetica, Arial, sans-serif', pdfKey: 'Helvetica' },
  { id: 'Times-Roman', name: 'Times New Roman', category: 'serif', css: '"Times New Roman", Times, Georgia, serif', pdfKey: 'Times-Roman' },
  { id: 'Courier', name: 'Courier New', category: 'monospace', css: '"Courier New", Courier, monospace', pdfKey: 'Courier' },
  { id: 'Inter', name: 'Inter', category: 'sans-serif', css: 'Inter, system-ui, sans-serif', pdfKey: 'Helvetica' },
  { id: 'Roboto', name: 'Roboto', category: 'sans-serif', css: 'Roboto, sans-serif', pdfKey: 'Helvetica' },
  { id: 'Georgia', name: 'Georgia', category: 'serif', css: 'Georgia, serif', pdfKey: 'Times-Roman' },
  { id: 'Garamond', name: 'Garamond', category: 'serif', css: 'Garamond, "EB Garamond", serif', pdfKey: 'Times-Roman' },
  { id: 'Playfair', name: 'Playfair Display', category: 'serif', css: '"Playfair Display", serif', pdfKey: 'Times-Roman' },
  { id: 'GreatVibes', name: 'Great Vibes (Signature)', category: 'script', css: '"Great Vibes", cursive', pdfKey: 'Times-Roman' },
  { id: 'AlexBrush', name: 'Alex Brush (Signature)', category: 'script', css: '"Alex Brush", cursive', pdfKey: 'Times-Roman' },
];

/**
 * Detects font style, family and matching PDF font from raw PDF font name and descriptors
 */
export function matchPdfFont(
  rawFontName: string,
  fontMatrix?: number[],
  descriptors?: FontDescriptors
): MatchedFontInfo {
  const cleanName = cleanPdfFontName(rawFontName || '').toLowerCase();
  const flagInfo = parseFontFlags(descriptors?.flags);

  const isBold =
    Boolean(descriptors?.isBold) ||
    flagInfo.isForceBold ||
    cleanName.includes('bold') ||
    cleanName.includes('black') ||
    cleanName.includes('heavy') ||
    cleanName.includes('semibold') ||
    cleanName.includes('demi') ||
    cleanName.includes('bld') ||
    cleanName.includes('-bd') ||
    cleanName.includes('700') ||
    cleanName.includes('800') ||
    cleanName.includes('900');

  const isItalic =
    Boolean(descriptors?.isItalic) ||
    flagInfo.isItalic ||
    cleanName.includes('italic') ||
    cleanName.includes('oblique') ||
    cleanName.includes('slanted') ||
    cleanName.includes('inclined') ||
    cleanName.includes('-it') ||
    cleanName.includes('ital');

  let category: 'sans-serif' | 'serif' | 'monospace' | 'script' | 'symbol' = 'sans-serif';
  let fontFamily = 'Helvetica';
  let cssFontFamily = 'Helvetica, Arial, sans-serif';
  let pdfFontKey = 'Helvetica';

  // 1. Monospace detection (flag or name)
  if (
    flagInfo.isFixedPitch ||
    descriptors?.isMonospace ||
    cleanName.includes('courier') ||
    cleanName.includes('mono') ||
    cleanName.includes('consolas') ||
    cleanName.includes('menlo') ||
    cleanName.includes('code') ||
    cleanName.includes('typewriter') ||
    cleanName.includes('source code')
  ) {
    category = 'monospace';
    fontFamily = 'Courier New';
    cssFontFamily = '"Courier New", Courier, monospace';
    pdfFontKey = isBold && isItalic
      ? 'Courier-BoldOblique'
      : isBold
      ? 'Courier-Bold'
      : isItalic
      ? 'Courier-Oblique'
      : 'Courier';
  }
  // 2. Script / Cursive detection
  else if (
    flagInfo.isScript ||
    cleanName.includes('script') ||
    cleanName.includes('cursive') ||
    cleanName.includes('hand') ||
    cleanName.includes('brush') ||
    cleanName.includes('vibes') ||
    cleanName.includes('calligraph')
  ) {
    category = 'script';
    fontFamily = 'Great Vibes';
    cssFontFamily = '"Great Vibes", cursive';
    pdfFontKey = isItalic ? 'Times-Italic' : 'Times-Roman';
  }
  // 3. Symbol / Dingbats detection
  else if (
    flagInfo.isSymbolic &&
    (cleanName.includes('symbol') ||
      cleanName.includes('dingbat') ||
      cleanName.includes('wingding') ||
      cleanName.includes('zapf'))
  ) {
    category = 'symbol';
    fontFamily = 'Symbol';
    cssFontFamily = 'Symbol, sans-serif';
    pdfFontKey = cleanName.includes('zapf') ? 'ZapfDingbats' : 'Symbol';
  }
  // 4. Serif detection (flag, descriptor or name)
  else if (
    flagInfo.isSerif ||
    descriptors?.isSerifFont ||
    cleanName.includes('times') ||
    cleanName.includes('roman') ||
    cleanName.includes('georgia') ||
    cleanName.includes('garamond') ||
    cleanName.includes('palatino') ||
    cleanName.includes('baskerville') ||
    cleanName.includes('cambria') ||
    cleanName.includes('minion') ||
    cleanName.includes('caslon') ||
    cleanName.includes('bodoni') ||
    cleanName.includes('serif') ||
    cleanName.includes('nimbusrom') ||
    cleanName.includes('cmr')
  ) {
    category = 'serif';
    fontFamily = 'Times New Roman';
    cssFontFamily = '"Times New Roman", Times, Georgia, serif';
    pdfFontKey = isBold && isItalic
      ? 'Times-BoldItalic'
      : isBold
      ? 'Times-Bold'
      : isItalic
      ? 'Times-Italic'
      : 'Times-Roman';
  }
  // 5. Default Sans-Serif (Helvetica, Arial, Calibri, Roboto, Inter, Segoe, etc.)
  else {
    category = 'sans-serif';
    if (cleanName.includes('roboto')) {
      fontFamily = 'Roboto';
      cssFontFamily = 'Roboto, Helvetica, Arial, sans-serif';
    } else if (cleanName.includes('inter')) {
      fontFamily = 'Inter';
      cssFontFamily = 'Inter, Helvetica, Arial, sans-serif';
    } else if (cleanName.includes('calibri') || cleanName.includes('segoe')) {
      fontFamily = 'Arial';
      cssFontFamily = 'Calibri, "Segoe UI", Arial, sans-serif';
    } else {
      fontFamily = 'Helvetica';
      cssFontFamily = 'Helvetica, Arial, sans-serif';
    }

    pdfFontKey = isBold && isItalic
      ? 'Helvetica-BoldOblique'
      : isBold
      ? 'Helvetica-Bold'
      : isItalic
      ? 'Helvetica-Oblique'
      : 'Helvetica';
  }

  return {
    fontFamily,
    cssFontFamily,
    pdfFontKey,
    isBold,
    isItalic,
    fontWeight: isBold ? 'bold' : 'normal',
    fontStyle: isItalic ? 'italic' : 'normal',
    category,
  };
}

/**
 * Calculates accurate point font size from PDF transform matrix
 */
export function calculateFontSizeFromTransform(transform: number[], height?: number): number {
  if (!transform || transform.length < 4) {
    return height && height > 0 ? Math.round(height * 0.8) : 12;
  }
  const a = transform[0];
  const b = transform[1];
  const c = transform[2];
  const d = transform[3];

  // Scale factor from 2D affine transform
  const scaleY = Math.sqrt(c * c + d * d);
  const scaleX = Math.sqrt(a * a + b * b);
  const detectedSize = Math.max(scaleY, scaleX);

  if (detectedSize > 3 && detectedSize < 200) {
    return Math.round(detectedSize * 10) / 10;
  }
  return height && height > 0 ? Math.round(height * 0.8) : 12;
}

/**
 * Sample background color from an HTML5 canvas at coordinates
 */
export function sampleCanvasColor(
  canvas: HTMLCanvasElement | null,
  x: number,
  y: number,
  fallback = '#ffffff'
): string {
  if (!canvas) return fallback;
  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return fallback;

    const sx = Math.max(0, Math.min(canvas.width - 1, Math.round(x)));
    const sy = Math.max(0, Math.min(canvas.height - 1, Math.round(y)));

    const pixel = ctx.getImageData(sx, sy, 1, 1).data;
    if (pixel[3] < 10) return fallback;

    const r = pixel[0].toString(16).padStart(2, '0');
    const g = pixel[1].toString(16).padStart(2, '0');
    const b = pixel[2].toString(16).padStart(2, '0');

    return `#${r}${g}${b}`;
  } catch {
    return fallback;
  }
}

/**
 * Accurately samples the true background color of a text item by finding the dominant
 * background color INSIDE the text bounding box. This avoids sampling outside table cells
 * or picking up adjacent row colors and borders.
 */
export function sampleCanvasBackgroundColor(
  canvas: HTMLCanvasElement | null,
  bbox: { x: number; y: number; width: number; height: number },
  canvasScale: number = 2.0,
  fallback: string = '#ffffff'
): string {
  if (!canvas) return fallback;
  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return fallback;

    const samplePadY = Math.round(2 * canvasScale);
    const sx = Math.max(0, Math.min(canvas.width - 1, Math.round(bbox.x * canvasScale)));
    const sy = Math.max(0, Math.min(canvas.height - 1, Math.round(bbox.y * canvasScale) - samplePadY));
    const sw = Math.max(1, Math.min(canvas.width - sx, Math.round(bbox.width * canvasScale)));
    const sh = Math.max(1, Math.min(canvas.height - sy, Math.round(bbox.height * canvasScale) + samplePadY * 2));

    if (sw <= 0 || sh <= 0) return fallback;

    const imgData = ctx.getImageData(sx, sy, sw, sh);
    const data = imgData.data;

    // Group pixels into quantized color bins (step of 4) to find the dominant background
    const bins = new Map<string, { count: number; sumR: number; sumG: number; sumB: number }>();
    const totalPixels = sw * sh;
    const step = totalPixels > 10000 ? 4 : 1;

    for (let i = 0; i < data.length; i += 4 * step) {
      const a = data[i + 3];
      if (a < 20) continue;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      // Filter out dark ink glyphs and antialiasing edges to only sample true background
      if (lum < 160) continue;

      // Quantize to reduce minor sensor/compression noise
      const qr = (r >> 2) << 2;
      const qg = (g >> 2) << 2;
      const qb = (b >> 2) << 2;
      const key = `${qr},${qg},${qb}`;

      let bin = bins.get(key);
      if (!bin) {
        bin = { count: 0, sumR: 0, sumG: 0, sumB: 0 };
        bins.set(key, bin);
      }
      bin.count++;
      bin.sumR += r;
      bin.sumG += g;
      bin.sumB += b;
    }

    if (bins.size === 0) return fallback;

    // The background is the dominant color (highest count of non-ink pixels inside the text box)
    let bestBin: { count: number; sumR: number; sumG: number; sumB: number } | null = null;
    for (const bin of bins.values()) {
      if (!bestBin || bin.count > bestBin.count) {
        bestBin = bin;
      }
    }

    if (!bestBin || bestBin.count === 0) return fallback;

    const avgR = Math.round(bestBin.sumR / bestBin.count);
    const avgG = Math.round(bestBin.sumG / bestBin.count);
    const avgB = Math.round(bestBin.sumB / bestBin.count);

    // If genuinely pure white (all 255), return standard '#ffffff'
    if (avgR >= 254 && avgG >= 254 && avgB >= 254) {
      return '#ffffff';
    }

    const rHex = avgR.toString(16).padStart(2, '0');
    const gHex = avgG.toString(16).padStart(2, '0');
    const bHex = avgB.toString(16).padStart(2, '0');

    return `#${rHex}${gHex}${bHex}`;
  } catch {
    return fallback;
  }
}

/**
 * Samples the true ink/glyph color of the original PDF text from the canvas.
 */
export function sampleCanvasInkColor(
  canvas: HTMLCanvasElement | null,
  bbox: { x: number; y: number; width: number; height: number },
  canvasScale: number = 2.0,
  fallback: string = '#000000'
): string {
  if (!canvas) return fallback;
  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return fallback;

    const sx = Math.max(0, Math.min(canvas.width - 1, Math.round(bbox.x * canvasScale)));
    const sy = Math.max(0, Math.min(canvas.height - 1, Math.round(bbox.y * canvasScale)));
    const sw = Math.max(1, Math.min(canvas.width - sx, Math.round(bbox.width * canvasScale)));
    const sh = Math.max(1, Math.min(canvas.height - sy, Math.round(bbox.height * canvasScale)));

    if (sw <= 0 || sh <= 0) return fallback;

    const imgData = ctx.getImageData(sx, sy, sw, sh);
    const data = imgData.data;

    let darkestLuminance = 999;
    let inkR = 0;
    let inkG = 0;
    let inkB = 0;
    let foundInk = false;

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 50) continue;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      // Looking for the darkest ink pixels
      if (lum < darkestLuminance && lum < 160) {
        darkestLuminance = lum;
        inkR = r;
        inkG = g;
        inkB = b;
        foundInk = true;
      }
    }

    if (!foundInk) return fallback;

    // If close to black, return '#000000'
    if (inkR <= 15 && inkG <= 15 && inkB <= 15) {
      return '#000000';
    }

    const rHex = inkR.toString(16).padStart(2, '0');
    const gHex = inkG.toString(16).padStart(2, '0');
    const bHex = inkB.toString(16).padStart(2, '0');

    return `#${rHex}${gHex}${bHex}`;
  } catch {
    return fallback;
  }
}
