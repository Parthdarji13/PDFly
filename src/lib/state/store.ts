import {
  DocumentState,
  EditorElement,
  PageInfo,
  ToolType,
  ShapeType,
  DetectedTextItem,
} from '../types';

export interface HistoryEntry {
  description: string;
  timestamp: number;
  elements: EditorElement[];
  pages: PageInfo[];
}

export interface AppState {
  documentState: DocumentState;
  activePageIndex: number;
  selectedTool: ToolType;
  selectedElementId: string | null;
  activeShape: ShapeType;
  activeDrawConfig: {
    strokeColor: string;
    strokeWidth: number;
    highlighterColor: string;
    highlighterWidth: number;
  };
  activeTextConfig: {
    fontFamily: string;
    pdfFontKey: string;
    fontSize: number;
    fontWeight: 'normal' | 'bold' | '500' | '600' | '700';
    fontStyle: 'normal' | 'italic' | 'oblique';
    underline: boolean;
    color: string;
    align: 'left' | 'center' | 'right' | 'justify';
    lineHeight: number;
    backgroundColor: string;
  };
  zoom: number;
  sidebarTab: 'pages' | 'layers' | 'info' | 'history' | 'ai';
  isSidebarOpen: boolean;
  theme: 'dark' | 'light';
  isSignatureModalOpen: boolean;
  isOrganizerModalOpen: boolean;
  isSearchModalOpen: boolean;
  isStampPickerOpen: boolean;
  isExportModalOpen: boolean;
  hoveredTextItem: DetectedTextItem | null;
  activeInlineEdit: {
    textItemId: string;
    pageIndex: number;
    originalItem: DetectedTextItem;
    text: string;
  } | null;
  historyStack: HistoryEntry[];
  historyIndex: number;
  notification: {
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
  } | null;
}

export const initialDocumentState: DocumentState = {
  fileName: 'Sample-Invoice.pdf',
  fileSize: 0,
  pageCount: 1,
  pages: [],
  elements: [],
  rawPdfBytes: null,
  extractedFonts: {},
};

export const initialAppState: AppState = {
  documentState: initialDocumentState,
  activePageIndex: 0,
  selectedTool: 'select',
  selectedElementId: null,
  activeShape: 'rect',
  activeDrawConfig: {
    strokeColor: '#ef4444',
    strokeWidth: 3,
    highlighterColor: '#facc15',
    highlighterWidth: 20,
  },
  activeTextConfig: {
    fontFamily: 'Helvetica',
    pdfFontKey: 'Helvetica',
    fontSize: 14,
    fontWeight: 'normal',
    fontStyle: 'normal',
    underline: false,
    color: '#0f172a',
    align: 'left',
    lineHeight: 1.25,
    backgroundColor: 'transparent',
  },
  zoom: 1.0,
  sidebarTab: 'pages',
  isSidebarOpen: false,
  theme: 'dark',
  isSignatureModalOpen: false,
  isOrganizerModalOpen: false,
  isSearchModalOpen: false,
  isStampPickerOpen: false,
  isExportModalOpen: false,
  hoveredTextItem: null,
  activeInlineEdit: null,
  historyStack: [],
  historyIndex: -1,
  notification: null,
};
