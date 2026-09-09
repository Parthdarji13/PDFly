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
 * Detects font style, family and matching PDF font from raw PDF font name
 */
export function matchPdfFont(rawFontName: string, fontMatrix?: number[]): MatchedFontInfo {
  const cleanName = (rawFontName || '').toLowerCase().replace(/^[a-z0-9]+\+/i, ''); // Strip subset prefix like 'ABCDEF+'

  const isBold =
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

  // Monospace detection
  if (
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
  // Serif detection
  else if (
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
  // Script / Cursive detection
  else if (
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
  // Symbol / Dingbats detection
  else if (
    cleanName.includes('symbol') ||
    cleanName.includes('dingbat') ||
    cleanName.includes('wingding')
  ) {
    category = 'symbol';
    fontFamily = 'Symbol';
    cssFontFamily = 'Symbol, sans-serif';
    pdfFontKey = 'Symbol';
  }
  // Default Sans-Serif (Helvetica, Arial, Calibri, Roboto, Inter, Segoe, etc.)
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

    // Sample a few pixels around the target coordinate
    const sx = Math.max(0, Math.min(canvas.width - 1, Math.round(x)));
    const sy = Math.max(0, Math.min(canvas.height - 1, Math.round(y)));

    const pixel = ctx.getImageData(sx, sy, 1, 1).data;
    if (pixel[3] < 10) return fallback; // Transparent

    const r = pixel[0].toString(16).padStart(2, '0');
    const g = pixel[1].toString(16).padStart(2, '0');
    const b = pixel[2].toString(16).padStart(2, '0');

    return `#${r}${g}${b}`;
  } catch {
    return fallback;
  }
}
