'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { HomePage, ToolId } from '../components/home/HomePage';
import { TopNav } from '../components/TopNav';
import { ToolRibbon } from '../components/ToolRibbon';
import { Inspector } from '../components/Inspector';
import { LeftSidebar } from '../components/LeftSidebar';
import { CanvasViewport } from '../components/CanvasViewport';

// Modals
import { SignatureModal } from '../components/modals/SignatureModal';
import { PageOrganizerModal } from '../components/modals/PageOrganizerModal';
import { SearchReplaceModal } from '../components/modals/SearchReplaceModal';
import { StampPickerModal } from '../components/modals/StampPickerModal';
import { ExportModal } from '../components/modals/ExportModal';
import { MergePdfModal } from '../components/modals/MergePdfModal';
import { SplitPdfModal } from '../components/modals/SplitPdfModal';
import { PdfToImageModal } from '../components/modals/PdfToImageModal';
import { ImageToPdfModal } from '../components/modals/ImageToPdfModal';
import { WatermarkModal } from '../components/modals/WatermarkModal';
import { CompressPdfModal } from '../components/modals/CompressPdfModal';

// AI Components & Modals
import { AiChatDrawer } from '../components/ai/AiChatDrawer';
import { AiSummarizeModal } from '../components/modals/AiSummarizeModal';
import { AiTextAssistModal } from '../components/modals/AiTextAssistModal';
import { AiInsightsModal } from '../components/modals/AiInsightsModal';
import { AiSelectPdfModal, AiFeatureType } from '../components/modals/AiSelectPdfModal';

import { AppState, initialAppState, HistoryEntry } from '../lib/state/store';
import { EditorElement, PageInfo, ToolType, TextElement } from '../lib/types';
import { loadPDFDocument, generatePageThumbnail } from '../lib/pdf/pdfEngine';
import {
  generateSampleInvoice,
  generateSampleResume,
  generateSampleContract,
  generateSampleCertificate,
  generateSampleProposal,
  generateSampleLetter,
  generateBlankPdf,
} from '../lib/samples/sampleGenerator';

export default function PDFEditorPage() {
  const [currentView, setCurrentView] = useState<'home' | 'editor'>('home');
  const [state, setState] = useState<AppState>(initialAppState);
  const [pdfDocProxy, setPdfDocProxy] = useState<PDFDocumentProxy | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfFileInputRef = useRef<HTMLInputElement>(null);
  const pendingToolRef = useRef<ToolId | null>(null);

  // Tool Modals State
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [isPdfToImageModalOpen, setIsPdfToImageModalOpen] = useState(false);
  const [isImageToPdfModalOpen, setIsImageToPdfModalOpen] = useState(false);
  const [isWatermarkModalOpen, setIsWatermarkModalOpen] = useState(false);
  const [isCompressModalOpen, setIsCompressModalOpen] = useState(false);

  // AI Modals & Drawer State
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [isAiSummarizeOpen, setIsAiSummarizeOpen] = useState(false);
  const [isAiTextAssistOpen, setIsAiTextAssistOpen] = useState(false);
  const [isAiInsightsOpen, setIsAiInsightsOpen] = useState(false);
  const [aiSelectFeature, setAiSelectFeature] = useState<AiFeatureType | null>(null);

  // Show Toast Notification
  const showToast = useCallback(
    (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
      setState((prev) => ({ ...prev, notification: { message, type } }));
      setTimeout(() => {
        setState((prev) => (prev.notification?.message === message ? { ...prev, notification: null } : prev));
      }, 3500);
    },
    []
  );

  // Push Snapshot to History Stack
  const pushHistory = useCallback((description: string, elements: EditorElement[], pages: PageInfo[]) => {
    setState((prev) => {
      const newEntry: HistoryEntry = {
        description,
        timestamp: Date.now(),
        elements: JSON.parse(JSON.stringify(elements)),
        pages: JSON.parse(JSON.stringify(pages)),
      };
      const truncatedStack = prev.historyStack.slice(0, prev.historyIndex + 1);
      return {
        ...prev,
        historyStack: [...truncatedStack, newEntry],
        historyIndex: truncatedStack.length,
      };
    });
  }, []);

  // Undo
  const handleUndo = useCallback(() => {
    setState((prev) => {
      if (prev.historyIndex <= 0) return prev;
      const targetIndex = prev.historyIndex - 1;
      const targetEntry = prev.historyStack[targetIndex];
      return {
        ...prev,
        historyIndex: targetIndex,
        documentState: {
          ...prev.documentState,
          elements: JSON.parse(JSON.stringify(targetEntry.elements)),
          pages: JSON.parse(JSON.stringify(targetEntry.pages)),
        },
      };
    });
    showToast('Undo performed', 'info');
  }, [showToast]);

  // Redo
  const handleRedo = useCallback(() => {
    setState((prev) => {
      if (prev.historyIndex >= prev.historyStack.length - 1) return prev;
      const targetIndex = prev.historyIndex + 1;
      const targetEntry = prev.historyStack[targetIndex];
      return {
        ...prev,
        historyIndex: targetIndex,
        documentState: {
          ...prev.documentState,
          elements: JSON.parse(JSON.stringify(targetEntry.elements)),
          pages: JSON.parse(JSON.stringify(targetEntry.pages)),
        },
      };
    });
    showToast('Redo performed', 'info');
  }, [showToast]);

  // Load a PDF ArrayBuffer or Uint8Array into the engine
  const loadPdfBytes = useCallback(
    async (bytes: Uint8Array, fileName: string) => {
      try {
        if (!bytes || bytes.byteLength === 0) {
          showToast('Selected file is empty (0 bytes). Please choose a valid PDF.', 'error');
          return;
        }

        const { pdfDoc, pageCount, pages, extractedFonts } = await loadPDFDocument(bytes);
        setPdfDocProxy(pdfDoc);

        // Generate thumbnails asynchronously
        const pagesWithThumbs = await Promise.all(
          pages.map(async (p) => {
            try {
              const thumbUrl = await generatePageThumbnail(pdfDoc, p.pageNumber, 200);
              return { ...p, thumbnailUrl: thumbUrl };
            } catch {
              return p;
            }
          })
        );

        setState((prev) => ({
          ...prev,
          documentState: {
            fileName,
            fileSize: bytes.byteLength,
            pageCount,
            pages: pagesWithThumbs,
            elements: [],
            rawPdfBytes: bytes,
            extractedFonts: extractedFonts || {},
          },
          activePageIndex: 0,
          selectedElementId: null,
          historyStack: [
            {
              description: 'Loaded document',
              timestamp: Date.now(),
              elements: [],
              pages: pagesWithThumbs,
            },
          ],
          historyIndex: 0,
        }));
      } catch (err: any) {
        console.error('Failed to load PDF document:', err);
        const errorMsg = err?.message || 'Error loading PDF. Please try another file.';
        showToast(errorMsg, 'error');
      }
    },
    [showToast]
  );

  // Open file from local computer
  const handleOpenFile = useCallback(
    async (file: File) => {
      if (!file || file.size === 0) {
        showToast('Selected file is empty. Please choose a valid PDF document.', 'error');
        return;
      }

      if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
        if (file.type.startsWith('image/')) {
          setIsImageToPdfModalOpen(true);
          showToast('Image detected. Opened Image to PDF converter.', 'info');
          return;
        }
        showToast('Please select a valid .pdf file.', 'warning');
        return;
      }

      try {
        const buffer = await file.arrayBuffer();
        await loadPdfBytes(new Uint8Array(buffer), file.name);
        setCurrentView('editor');

        const pending = pendingToolRef.current;
        pendingToolRef.current = null;

        if (pending === 'sign') {
          setState((prev) => ({ ...prev, isSignatureModalOpen: true, selectedTool: 'select' }));
          showToast('PDF loaded! Place your signature on the document.', 'success');
        } else if (pending === 'redact') {
          setState((prev) => ({ ...prev, selectedTool: 'redact' }));
          showToast('PDF loaded! Drag or click to redact sensitive content.', 'info');
        } else if (pending === 'organize') {
          setState((prev) => ({ ...prev, isOrganizerModalOpen: true, selectedTool: 'select' }));
        } else if (pending === 'searchReplace') {
          setState((prev) => ({ ...prev, isSearchModalOpen: true, selectedTool: 'select' }));
        } else if (pending === 'edit') {
          setState((prev) => ({ ...prev, selectedTool: 'editText' }));
          showToast('PDF loaded! Click any text on the page to edit directly.', 'info');
        } else if (pending === 'chat') {
          setIsAiChatOpen(true);
        } else if (pending === 'summarize') {
          setIsAiSummarizeOpen(true);
        } else if (pending === 'insights') {
          setIsAiInsightsOpen(true);
        } else if (pending === 'aiAssist') {
          setIsAiTextAssistOpen(true);
        } else {
          showToast('PDF loaded successfully!', 'success');
        }
      } catch (err: any) {
        console.error('Failed to open PDF file:', err);
        showToast(err?.message || 'Failed to parse PDF file. Ensure it is a valid PDF.', 'error');
      }
    },
    [loadPdfBytes, showToast]
  );

  // Load pre-made sample document (ONLY invoked for explicit template choices)
  const handleLoadSample = useCallback(
    async (sampleType: 'invoice' | 'resume' | 'contract' | 'certificate' | 'proposal' | 'letter' | 'blank') => {
      try {
        let pdfBytes: Uint8Array;
        let fileName = 'sample.pdf';

        if (sampleType === 'invoice') {
          pdfBytes = await generateSampleInvoice();
          fileName = 'business_invoice.pdf';
        } else if (sampleType === 'resume') {
          pdfBytes = await generateSampleResume();
          fileName = 'executive_resume.pdf';
        } else if (sampleType === 'contract') {
          pdfBytes = await generateSampleContract();
          fileName = 'non_disclosure_agreement.pdf';
        } else if (sampleType === 'certificate') {
          pdfBytes = await generateSampleCertificate();
          fileName = 'certificate_of_achievement.pdf';
        } else if (sampleType === 'proposal') {
          pdfBytes = await generateSampleProposal();
          fileName = 'business_proposal.pdf';
        } else if (sampleType === 'letter') {
          pdfBytes = await generateSampleLetter();
          fileName = 'formal_business_letter.pdf';
        } else {
          pdfBytes = await generateBlankPdf();
          fileName = 'untitled_document.pdf';
        }

        await loadPdfBytes(pdfBytes, fileName);
        setCurrentView('editor');
        if (sampleType === 'blank') {
          showToast('Opened Studio with a blank page! Click "Add your PDF" to load a file.', 'info');
        } else {
          showToast(`Loaded ${sampleType.toUpperCase()} template!`, 'success');
        }
      } catch (err: any) {
        console.error('Error loading sample:', err);
        showToast('Failed to generate template PDF', 'error');
      }
    },
    [loadPdfBytes, showToast]
  );

  // Handle opening specific tool from Home Page or TopNav
  const handleOpenTool = useCallback(
    async (toolId: ToolId) => {
      // Modals that handle file selection independently
      switch (toolId) {
        case 'merge':
          setIsMergeModalOpen(true);
          return;
        case 'split':
          setIsSplitModalOpen(true);
          return;
        case 'compress':
          setIsCompressModalOpen(true);
          return;
        case 'pdfToImage':
          setIsPdfToImageModalOpen(true);
          return;
        case 'imageToPdf':
          setIsImageToPdfModalOpen(true);
          return;
        case 'watermark':
          setIsWatermarkModalOpen(true);
          return;
        case 'blank':
          await handleLoadSample('blank');
          return;
        case 'chat':
          if (state.documentState.pages.length === 0) {
            setAiSelectFeature('chat');
            showToast('Please select or upload a PDF document to use AI Chat.', 'info');
          } else {
            setCurrentView('editor');
            setIsAiChatOpen(true);
          }
          return;
        case 'summarize':
          if (state.documentState.pages.length === 0) {
            setAiSelectFeature('summarize');
            showToast('Please select or upload a PDF document to generate an AI summary.', 'info');
          } else {
            setCurrentView('editor');
            setIsAiSummarizeOpen(true);
          }
          return;
        case 'insights':
          if (state.documentState.pages.length === 0) {
            setAiSelectFeature('insights');
            showToast('Please select or upload a PDF document to extract AI insights.', 'info');
          } else {
            setCurrentView('editor');
            setIsAiInsightsOpen(true);
          }
          return;
        case 'aiAssist':
          if (state.documentState.pages.length === 0) {
            setAiSelectFeature('aiAssist');
            showToast('Please select or upload a PDF document to use AI Text Assist.', 'info');
          } else {
            setCurrentView('editor');
            setIsAiTextAssistOpen(true);
          }
          return;
      }

      // If no document is loaded, open Studio with a clean blank page (NEVER a sample template)
      if (state.documentState.pages.length === 0) {
        await handleLoadSample('blank');
        if (toolId === 'sign') {
          setState((prev) => ({ ...prev, isSignatureModalOpen: true }));
        } else if (toolId === 'redact') {
          setState((prev) => ({ ...prev, selectedTool: 'redact' }));
        } else if (toolId === 'organize') {
          setState((prev) => ({ ...prev, isOrganizerModalOpen: true }));
        } else if (toolId === 'searchReplace') {
          setState((prev) => ({ ...prev, isSearchModalOpen: true }));
        } else {
          setState((prev) => ({ ...prev, selectedTool: 'editText' }));
        }
        return;
      }

      // If document is already loaded, open directly in editor
      setCurrentView('editor');
      switch (toolId) {
        case 'edit':
          setState((prev) => ({ ...prev, selectedTool: 'editText' }));
          showToast('Click any text on the page to edit it directly with matched fonts!', 'info');
          break;
        case 'organize':
          setState((prev) => ({ ...prev, isOrganizerModalOpen: true }));
          break;
        case 'sign':
          setState((prev) => ({ ...prev, isSignatureModalOpen: true }));
          break;
        case 'redact':
          setState((prev) => ({ ...prev, selectedTool: 'redact' }));
          showToast('Click or drag over text or areas to redact sensitive content.', 'info');
          break;
        case 'searchReplace':
          setState((prev) => ({ ...prev, isSearchModalOpen: true }));
          break;
      }
    },
    [handleLoadSample, showToast, state.documentState.pages.length]
  );

  // Apply AI Text Replacement to selected element
  const handleApplyTextReplacement = useCallback(
    (elementId: string, newText: string) => {
      setState((prev) => {
        const nextElements = prev.documentState.elements.map((el) =>
          el.id === elementId ? ({ ...el, text: newText } as TextElement) : el
        );
        pushHistory('AI text replacement', nextElements, prev.documentState.pages);
        return {
          ...prev,
          documentState: {
            ...prev.documentState,
            elements: nextElements,
          },
        };
      });
    },
    [pushHistory]
  );

  // Rename document
  const handleRenameDocument = useCallback((newName: string) => {
    setState((prev) => ({
      ...prev,
      documentState: {
        ...prev.documentState,
        fileName: newName,
      },
    }));
  }, []);

  // Add Element to document
  const handleAddElement = useCallback(
    (element: EditorElement, actionDesc?: string) => {
      setState((prev) => {
        const nextElements = [...prev.documentState.elements, element];
        pushHistory(
          actionDesc || `Added ${element.type} element`,
          nextElements,
          prev.documentState.pages
        );
        return {
          ...prev,
          documentState: {
            ...prev.documentState,
            elements: nextElements,
          },
          selectedElementId: element.id,
        };
      });
    },
    [pushHistory]
  );

  // Batch add elements (e.g. search and replace)
  const handleAddElementsBatch = useCallback(
    (newElements: TextElement[], actionDesc: string) => {
      setState((prev) => {
        const nextElements = [...prev.documentState.elements, ...newElements];
        pushHistory(actionDesc, nextElements, prev.documentState.pages);
        return {
          ...prev,
          documentState: {
            ...prev.documentState,
            elements: nextElements,
          },
        };
      });
      showToast(actionDesc, 'success');
    },
    [pushHistory, showToast]
  );

  // Update element properties
  const handleUpdateElement = useCallback(
    (id: string, updates: Partial<EditorElement>) => {
      setState((prev) => ({
        ...prev,
        documentState: {
          ...prev.documentState,
          elements: prev.documentState.elements.map((el) =>
            el.id === id ? ({ ...el, ...updates } as EditorElement) : el
          ),
        },
      }));
    },
    []
  );

  // Delete selected element
  const handleDeleteSelected = useCallback(() => {
    if (!state.selectedElementId) return;
    const targetId = state.selectedElementId;
    setState((prev) => {
      const nextElements = prev.documentState.elements.filter((el) => el.id !== targetId);
      pushHistory('Deleted element', nextElements, prev.documentState.pages);
      return {
        ...prev,
        documentState: {
          ...prev.documentState,
          elements: nextElements,
        },
        selectedElementId: null,
      };
    });
    showToast('Element deleted', 'info');
  }, [state.selectedElementId, pushHistory, showToast]);

  // Duplicate selected element
  const handleDuplicateSelected = useCallback(() => {
    if (!state.selectedElementId) return;
    const current = state.documentState.elements.find((el) => el.id === state.selectedElementId);
    if (!current) return;

    const duplicated: EditorElement = {
      ...JSON.parse(JSON.stringify(current)),
      id: `${current.type}-${Date.now()}`,
      x: current.x + 20,
      y: current.y + 20,
      zIndex: state.documentState.elements.length + 1,
    };

    handleAddElement(duplicated, `Duplicated ${current.type}`);
  }, [state.selectedElementId, state.documentState.elements, handleAddElement]);

  // Rotate Page 90 deg
  const handleRotatePage = useCallback(
    (pageIndex: number) => {
      setState((prev) => {
        const nextPages = prev.documentState.pages.map((p, idx) =>
          idx === pageIndex ? { ...p, rotation: ((p.rotation || 0) + 90) % 360 } : p
        );
        pushHistory(`Rotated Page ${pageIndex + 1}`, prev.documentState.elements, nextPages);
        return {
          ...prev,
          documentState: {
            ...prev.documentState,
            pages: nextPages,
          },
        };
      });
      showToast(`Page ${pageIndex + 1} rotated 90°`, 'info');
    },
    [pushHistory, showToast]
  );

  // Delete Page
  const handleDeletePage = useCallback(
    (pageIndex: number) => {
      if (state.documentState.pages.length <= 1) {
        showToast('Cannot delete the only page in the document', 'warning');
        return;
      }

      setState((prev) => {
        const nextPages = prev.documentState.pages
          .filter((_, idx) => idx !== pageIndex)
          .map((p, newIdx) => ({ ...p, pageIndex: newIdx, pageNumber: newIdx + 1 }));

        const nextElements = prev.documentState.elements
          .filter((el) => el.pageIndex !== pageIndex)
          .map((el) => (el.pageIndex > pageIndex ? { ...el, pageIndex: el.pageIndex - 1 } : el));

        pushHistory(`Deleted Page ${pageIndex + 1}`, nextElements, nextPages);

        return {
          ...prev,
          documentState: {
            ...prev.documentState,
            pageCount: nextPages.length,
            pages: nextPages,
            elements: nextElements,
          },
          activePageIndex: Math.min(prev.activePageIndex, nextPages.length - 1),
        };
      });
      showToast(`Page ${pageIndex + 1} deleted`, 'info');
    },
    [state.documentState.pages.length, pushHistory, showToast]
  );

  // Duplicate Page
  const handleDuplicatePage = useCallback(
    (pageIndex: number) => {
      setState((prev) => {
        const sourcePage = prev.documentState.pages[pageIndex];
        const newPage: PageInfo = {
          ...JSON.parse(JSON.stringify(sourcePage)),
          pageIndex: pageIndex + 1,
          pageNumber: pageIndex + 2,
        };

        const nextPages = [...prev.documentState.pages];
        nextPages.splice(pageIndex + 1, 0, newPage);

        const normalizedPages = nextPages.map((p, idx) => ({
          ...p,
          pageIndex: idx,
          pageNumber: idx + 1,
        }));

        pushHistory(`Duplicated Page ${pageIndex + 1}`, prev.documentState.elements, normalizedPages);

        return {
          ...prev,
          documentState: {
            ...prev.documentState,
            pageCount: normalizedPages.length,
            pages: normalizedPages,
          },
          activePageIndex: pageIndex + 1,
        };
      });
      showToast(`Page ${pageIndex + 1} duplicated`, 'info');
    },
    [pushHistory, showToast]
  );

  // Add Blank Page
  const handleAddBlankPage = useCallback(() => {
    setState((prev) => {
      const newIdx = prev.documentState.pages.length;
      const newBlankPage: PageInfo = {
        pageIndex: newIdx,
        pageNumber: newIdx + 1,
        width: 595.28,
        height: 841.89,
        originalWidth: 595.28,
        originalHeight: 841.89,
        rotation: 0,
        textItems: [],
      };

      const nextPages = [...prev.documentState.pages, newBlankPage];
      pushHistory('Added blank page', prev.documentState.elements, nextPages);

      return {
        ...prev,
        documentState: {
          ...prev.documentState,
          pageCount: nextPages.length,
          pages: nextPages,
        },
        activePageIndex: newIdx,
      };
    });
    showToast('Blank page added', 'info');
  }, [pushHistory, showToast]);

  // Insert Image File
  const handleInsertImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const aspect = Math.max(0.1, img.width / Math.max(1, img.height));
        const width = 180;
        const height = width / aspect;

        const newImgEl: EditorElement = {
          id: `image-${Date.now()}`,
          pageIndex: state.activePageIndex,
          type: 'image',
          x: 100,
          y: 100,
          width,
          height,
          dataUrl,
          aspectRatio: aspect,
          zIndex: state.documentState.elements.length + 1,
          opacity: 1,
        };

        handleAddElement(newImgEl, 'Inserted image');
        setState((prev) => ({ ...prev, selectedTool: 'select' }));
        showToast('Image inserted on active page', 'success');
      };
      img.onerror = () => {
        showToast('Failed to load image file. Please try another image.', 'error');
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      showToast('Error reading image file.', 'error');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Add Signature to document
  const handleAddSignature = (signatureDataUrl: string, type: 'draw' | 'type' | 'upload') => {
    const newSigEl: EditorElement = {
      id: `sig-${Date.now()}`,
      pageIndex: state.activePageIndex,
      type: 'signature',
      x: 120,
      y: 180,
      width: 190,
      height: 70,
      dataUrl: signatureDataUrl,
      signatureType: type,
      dateAdded: new Date().toISOString(),
      zIndex: state.documentState.elements.length + 1,
      opacity: 1,
    };

    handleAddElement(newSigEl, 'Added signature');
    setState((prev) => ({ ...prev, selectedTool: 'select' }));
    showToast('Signature placed on active page', 'success');
  };

  // Add Stamp to document
  const handleAddStamp = (stampDataUrl: string, title: string) => {
    const newStampEl: EditorElement = {
      id: `stamp-${Date.now()}`,
      pageIndex: state.activePageIndex,
      type: 'image',
      x: 150,
      y: 150,
      width: 160,
      height: 56,
      dataUrl: stampDataUrl,
      aspectRatio: 160 / 56,
      isStamp: true,
      stampTitle: title,
      zIndex: state.documentState.elements.length + 1,
      opacity: 0.85,
    };

    handleAddElement(newStampEl, `Added ${title} stamp`);
    setState((prev) => ({ ...prev, selectedTool: 'select' }));
    showToast(`"${title}" stamp placed on document`, 'success');
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const activeEl = document.activeElement as HTMLElement | null;
      const isInput =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable ||
        Boolean(target?.closest('input, textarea, [contenteditable="true"]')) ||
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.isContentEditable ||
        Boolean(activeEl?.closest('input, textarea, [contenteditable="true"]'));

      // If user is currently typing in an input, textarea or editable block, ignore all global shortcuts
      if (isInput) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.selectedElementId) {
          e.preventDefault();
          handleDeleteSelected();
        }
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'v') setState((prev) => ({ ...prev, selectedTool: 'select' }));
      if (key === 'e') setState((prev) => ({ ...prev, selectedTool: 'editText' }));
      if (key === 't') setState((prev) => ({ ...prev, selectedTool: 'addText' }));
      if (key === 'p') setState((prev) => ({ ...prev, selectedTool: 'draw' }));
      if (key === 'h') setState((prev) => ({ ...prev, selectedTool: 'highlighter' }));
      if (key === 's') setState((prev) => ({ ...prev, selectedTool: 'shape' }));
      if (key === 'w') setState((prev) => ({ ...prev, selectedTool: 'redact' }));
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.selectedElementId, handleUndo, handleRedo, handleDeleteSelected]);

  return (
    <div className="editor-root" data-theme={state.theme}>
      {/* Hidden image input for upload */}
      <input
        type="file"
        ref={imageInputRef}
        accept="image/png, image/jpeg, image/webp, image/svg+xml"
        style={{ display: 'none' }}
        onChange={handleInsertImageFile}
      />

      {/* Global hidden file input for PDF selection across tools */}
      <input
        type="file"
        ref={pdfFileInputRef}
        accept="application/pdf,.pdf"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleOpenFile(file);
          }
          e.target.value = '';
        }}
      />

      {/* ================= VIEW: HOME PAGE ================= */}
      {currentView === 'home' ? (
        <HomePage
          state={state}
          onUpdateState={setState}
          onOpenTool={handleOpenTool}
          onOpenFile={handleOpenFile}
          onLoadSample={handleLoadSample}
        />
      ) : (
        /* ================= VIEW: FLAGSHIP EDITOR ================= */
        <>
          {/* Top Navigation */}
          <TopNav
            state={state}
            onUpdateState={setState}
            onOpenFile={handleOpenFile}
            onLoadSample={handleLoadSample}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={state.historyIndex > 0}
            canRedo={state.historyIndex < state.historyStack.length - 1}
            onExportPdf={() => setState((prev) => ({ ...prev, isExportModalOpen: true }))}
            onNavigateHome={() => setCurrentView('home')}
            onOpenToolModal={(tool) => handleOpenTool(tool as ToolId)}
            onOpenAiChat={() => {
              if (state.documentState.pages.length === 0) {
                setAiSelectFeature('chat');
                showToast('Please select or upload a PDF document to use AI Chat.', 'info');
              } else {
                setIsAiChatOpen(true);
              }
            }}
            onOpenAiSummarize={() => {
              if (state.documentState.pages.length === 0) {
                setAiSelectFeature('summarize');
                showToast('Please select or upload a PDF document to generate an AI summary.', 'info');
              } else {
                setIsAiSummarizeOpen(true);
              }
            }}
            onOpenAiInsights={() => {
              if (state.documentState.pages.length === 0) {
                setAiSelectFeature('insights');
                showToast('Please select or upload a PDF document to extract AI insights.', 'info');
              } else {
                setIsAiInsightsOpen(true);
              }
            }}
          />

          {/* Tool Ribbon */}
          <ToolRibbon
            state={state}
            onSelectTool={(tool: ToolType) => setState((prev) => ({ ...prev, selectedTool: tool }))}
            onOpenSignatureModal={() => setState((prev) => ({ ...prev, isSignatureModalOpen: true }))}
            onOpenStampPicker={() => setState((prev) => ({ ...prev, isStampPickerOpen: true }))}
            onUploadImage={() => imageInputRef.current?.click()}
          />

          {/* Contextual Inspector */}
          <Inspector
            state={state}
            onUpdateState={setState}
            onDeleteSelected={handleDeleteSelected}
            onDuplicateSelected={handleDuplicateSelected}
            onOpenAiTextAssist={() => setIsAiTextAssistOpen(true)}
          />

          {/* Main Workspace Area */}
          <div className="editor-workspace">
            {/* Left Sidebar */}
            <LeftSidebar
              state={state}
              onUpdateState={setState}
              onSelectPage={(pageIdx) => setState((prev) => ({ ...prev, activePageIndex: pageIdx }))}
              onRotatePage={handleRotatePage}
              onDeletePage={handleDeletePage}
              onDuplicatePage={handleDuplicatePage}
              onAddBlankPage={handleAddBlankPage}
              onOpenFile={handleOpenFile}
              onOpenAiChat={() => {
                if (state.documentState.pages.length === 0) {
                  setAiSelectFeature('chat');
                  showToast('Please select or upload a PDF document to use AI Chat.', 'info');
                } else {
                  setIsAiChatOpen(true);
                }
              }}
              onOpenAiSummarize={() => {
                if (state.documentState.pages.length === 0) {
                  setAiSelectFeature('summarize');
                  showToast('Please select or upload a PDF document to generate an AI summary.', 'info');
                } else {
                  setIsAiSummarizeOpen(true);
                }
              }}
              onOpenAiInsights={() => {
                if (state.documentState.pages.length === 0) {
                  setAiSelectFeature('insights');
                  showToast('Please select or upload a PDF document to extract AI insights.', 'info');
                } else {
                  setIsAiInsightsOpen(true);
                }
              }}
            />

            {/* Multi-Page Canvas Viewport */}
            <CanvasViewport
              state={state}
              pdfDocProxy={pdfDocProxy}
              onUpdateState={setState}
              onAddElement={handleAddElement}
              onUpdateElement={handleUpdateElement}
              onSelectElement={(id) => setState((prev) => ({ ...prev, selectedElementId: id }))}
              onOpenFile={handleOpenFile}
              onLoadSample={handleLoadSample}
            />
          </div>
        </>
      )}

      {/* Toast Notification */}
      {state.notification && (
        <div className="toast-notification">
          <span>{state.notification.message}</span>
        </div>
      )}

      {/* ================= ALL MODALS & AI DRAWERS ================= */}
      {/* AI Feature Document Prompt Modal */}
      <AiSelectPdfModal
        isOpen={aiSelectFeature !== null}
        onClose={() => setAiSelectFeature(null)}
        feature={aiSelectFeature || 'general'}
        onSelectFile={async (file) => {
          const targetFeat = aiSelectFeature;
          setAiSelectFeature(null);
          await handleOpenFile(file);
          if (targetFeat === 'chat') setIsAiChatOpen(true);
          else if (targetFeat === 'summarize') setIsAiSummarizeOpen(true);
          else if (targetFeat === 'insights') setIsAiInsightsOpen(true);
          else if (targetFeat === 'aiAssist') setIsAiTextAssistOpen(true);
        }}
        onSelectSample={async (sampleType) => {
          const targetFeat = aiSelectFeature;
          setAiSelectFeature(null);
          await handleLoadSample(sampleType);
          if (targetFeat === 'chat') setIsAiChatOpen(true);
          else if (targetFeat === 'summarize') setIsAiSummarizeOpen(true);
          else if (targetFeat === 'insights') setIsAiInsightsOpen(true);
          else if (targetFeat === 'aiAssist') setIsAiTextAssistOpen(true);
        }}
      />

      <AiChatDrawer
        isOpen={isAiChatOpen}
        onClose={() => setIsAiChatOpen(false)}
        documentState={state.documentState}
        activePageIndex={state.activePageIndex}
        onOpenFile={handleOpenFile}
        onLoadSample={handleLoadSample}
      />

      <AiSummarizeModal
        isOpen={isAiSummarizeOpen}
        onClose={() => setIsAiSummarizeOpen(false)}
        documentState={state.documentState}
        onShowToast={showToast}
        onOpenFile={handleOpenFile}
        onLoadSample={handleLoadSample}
      />

      <AiTextAssistModal
        isOpen={isAiTextAssistOpen}
        onClose={() => setIsAiTextAssistOpen(false)}
        selectedTextElement={
          (state.documentState.elements.find(
            (el) => el.id === state.selectedElementId && el.type === 'text'
          ) as TextElement) || null
        }
        onApplyReplacement={handleApplyTextReplacement}
        onShowToast={showToast}
      />

      <AiInsightsModal
        isOpen={isAiInsightsOpen}
        onClose={() => setIsAiInsightsOpen(false)}
        documentState={state.documentState}
        onRenameDocument={handleRenameDocument}
        onShowToast={showToast}
        onOpenFile={handleOpenFile}
        onLoadSample={handleLoadSample}
      />

      <MergePdfModal
        isOpen={isMergeModalOpen}
        onClose={() => setIsMergeModalOpen(false)}
        onShowToast={showToast}
      />

      <SplitPdfModal
        isOpen={isSplitModalOpen}
        onClose={() => setIsSplitModalOpen(false)}
        onShowToast={showToast}
      />

      <PdfToImageModal
        isOpen={isPdfToImageModalOpen}
        onClose={() => setIsPdfToImageModalOpen(false)}
        onShowToast={showToast}
      />

      <ImageToPdfModal
        isOpen={isImageToPdfModalOpen}
        onClose={() => setIsImageToPdfModalOpen(false)}
        onShowToast={showToast}
      />

      <WatermarkModal
        isOpen={isWatermarkModalOpen}
        onClose={() => setIsWatermarkModalOpen(false)}
        onShowToast={showToast}
      />

      <CompressPdfModal
        isOpen={isCompressModalOpen}
        onClose={() => setIsCompressModalOpen(false)}
        onShowToast={showToast}
      />

      <SignatureModal
        isOpen={state.isSignatureModalOpen}
        onClose={() => setState((prev) => ({ ...prev, isSignatureModalOpen: false }))}
        onAddSignature={handleAddSignature}
      />

      <PageOrganizerModal
        isOpen={state.isOrganizerModalOpen}
        onClose={() => setState((prev) => ({ ...prev, isOrganizerModalOpen: false }))}
        pages={state.documentState.pages}
        onReorderPages={(newPages) =>
          setState((prev) => ({
            ...prev,
            documentState: { ...prev.documentState, pages: newPages },
          }))
        }
        onRotatePage={handleRotatePage}
        onDeletePage={handleDeletePage}
        onDuplicatePage={handleDuplicatePage}
        onAddBlankPage={handleAddBlankPage}
      />

      <SearchReplaceModal
        isOpen={state.isSearchModalOpen}
        onClose={() => setState((prev) => ({ ...prev, isSearchModalOpen: false }))}
        state={state}
        onUpdateState={setState}
        onAddElementsBatch={handleAddElementsBatch}
      />

      <StampPickerModal
        isOpen={state.isStampPickerOpen}
        onClose={() => setState((prev) => ({ ...prev, isStampPickerOpen: false }))}
        onAddStamp={handleAddStamp}
      />

      <ExportModal
        isOpen={state.isExportModalOpen}
        onClose={() => setState((prev) => ({ ...prev, isExportModalOpen: false }))}
        state={state}
        onShowToast={showToast}
      />
    </div>
  );
}
