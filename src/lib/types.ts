export type ToolType =
  | 'select'
  | 'editText'
  | 'addText'
  | 'draw'
  | 'highlighter'
  | 'shape'
  | 'signature'
  | 'image'
  | 'stamp'
  | 'redact'
  | 'searchReplace'
  | 'organizer';

export type ShapeType =
  | 'rect'
  | 'roundedRect'
  | 'circle'
  | 'line'
  | 'arrow'
  | 'star'
  | 'checkmark';

export type RedactType = 'whiteout' | 'blackout';

export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExtractedFontInfo {
  id: string;              // PDF internal font id (e.g. 'g_d0_f1')
  name: string;            // Raw PDF font name (e.g. 'ABCDEF+Roboto-Bold')
  cleanName: string;       // Stripped font name without subset prefix (e.g. 'Roboto-Bold')
  family: string;          // Human friendly family name (e.g. 'Roboto')
  cssFamily: string;       // CSS font-family name for FontFace (e.g. 'PDF_Font_g_d0_f1')
  isEmbedded: boolean;     // True if font binary data is available
  data: Uint8Array | null; // Raw font bytes (OpenType/TrueType)
  mimetype?: string;       // Font mime type (e.g. 'font/opentype')
  flags?: number;          // PDF font descriptor flags bitmask
  ascent?: number;
  descent?: number;
  isBold?: boolean;
  isItalic?: boolean;
  isMonospace?: boolean;
  isSerif?: boolean;
  category: 'sans-serif' | 'serif' | 'monospace' | 'cursive' | 'display' | 'script' | 'symbol';
  fallbackPdfKey: string;  // Standard 14 PDF font fallback key ('Helvetica', 'Times-Roman', etc.)
  fallbackCssFamily: string; // CSS fallback font list
}

export interface DetectedTextItem {
  id: string;
  pageIndex: number;
  text: string;
  x: number;          // PDF pt (from left)
  y: number;          // PDF pt (from bottom)
  visualX: number;    // Normalized percentage or pixel from left
  visualY: number;    // Normalized percentage or pixel from top
  width: number;
  height: number;
  fontName: string;
  cleanFontName?: string;
  fontFamily: string; // Detected/matched font family (e.g. 'PDF_Font_g_d0_f1' or 'Times New Roman')
  pdfFontKey: string; // PDF standard font key ('Helvetica', 'Times-Roman', 'Courier', 'Helvetica-Bold', etc.)
  fontSize: number;   // Point size (pt)
  fontWeight: 'normal' | 'bold' | '500' | '600' | '700';
  fontStyle: 'normal' | 'italic' | 'oblique';
  color: string;      // Hex or RGB
  backgroundColor: string; // Sampled background patch color
  transform: number[];
  dir: string;
  hasEOL: boolean;
  isEdited?: boolean;
  isEmbeddedFont?: boolean;
  fontMatchQuality?: 'original' | 'closest-match';
  embeddedFontId?: string;
}

export interface BaseElement {
  id: string;
  pageIndex: number;
  type: 'text' | 'draw' | 'shape' | 'image' | 'signature' | 'redact';
  x: number; // PDF points (0 to page width)
  y: number; // PDF points (0 to page height, from top)
  width: number;
  height: number;
  rotation?: number;
  zIndex: number;
  opacity: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontFamily: string;
  pdfFontKey: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold' | '500' | '600' | '700';
  fontStyle: 'normal' | 'italic' | 'oblique';
  underline: boolean;
  color: string;
  align: 'left' | 'center' | 'right' | 'justify';
  lineHeight: number;
  letterSpacing: number;
  backgroundColor?: string;
  isOriginalEdit?: boolean;
  originalTextId?: string;
  originalBBox?: BoundingBox;
  isEmbeddedFont?: boolean;
  embeddedFontId?: string;
  fontMatchQuality?: 'original' | 'closest-match';
}

export interface DrawElement extends BaseElement {
  type: 'draw';
  points: Point[];
  strokeColor: string;
  strokeWidth: number;
  isHighlighter: boolean;
}

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shapeType: ShapeType;
  strokeColor: string;
  strokeWidth: number;
  fillColor: string;
  strokeStyle: 'solid' | 'dashed' | 'dotted';
  borderRadius?: number;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  dataUrl: string;
  aspectRatio: number;
  isStamp?: boolean;
  stampTitle?: string;
}

export interface SignatureElement extends BaseElement {
  type: 'signature';
  dataUrl: string;
  signatureType: 'draw' | 'type' | 'upload';
  signerName?: string;
  dateAdded?: string;
}

export interface RedactElement extends BaseElement {
  type: 'redact';
  redactType: RedactType;
  color?: string;
}

export type EditorElement =
  | TextElement
  | DrawElement
  | ShapeElement
  | ImageElement
  | SignatureElement
  | RedactElement;

export interface PageInfo {
  pageIndex: number;
  pageNumber: number;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  rotation: number;
  textItems: DetectedTextItem[];
  thumbnailUrl?: string;
}

export interface DocumentState {
  fileName: string;
  fileSize: number;
  pageCount: number;
  pages: PageInfo[];
  elements: EditorElement[];
  rawPdfBytes: Uint8Array | null;
  extractedFonts: Record<string, ExtractedFontInfo>;
}
