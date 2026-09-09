'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
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

import { AppState, initialAppState, HistoryEntry } from '../lib/state/store';
import { EditorElement, PageInfo, ToolType, TextElement } from '../lib/types';
import { loadPDFDocument, generatePageThumbnail } from '../lib/pdf/pdfEngine';
import {
  generateSampleInvoice,
  generateSampleResume,
  generateSampleContract,
  generateBlankPdf,
} from '../lib/samples/sampleGenerator';

export default function PDFEditorPage() {
  const [currentView, setCurrentView] = useState<'home' | 'editor'>('home');
  const [state, setState] = useState<AppState>(initialAppState);
  const [pdfDocProxy, setPdfDocProxy] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // New Tool Modals State
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [isPdfToImageModalOpen, setIsPdfToImageModalOpen] = useState(false);
  const [isImageToPdfModalOpen, setIsImageToPdfModalOpen] = useState(false);
  const [isWatermarkModalOpen, setIsWatermarkModalOpen] = useState(false);
  const [isCompressModalOpen, setIsCompressModalOpen] = useState(false);

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
        const { pdfDoc, pageCount, pages } = await loadPDFDocument(bytes);
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
        showToast('Error loading PDF. Please try another file.', 'error');
      }
    },
    [showToast]
  );

  // Open file from local computer
  const handleOpenFile = useCallback(
    async (file: File) => {
      try {
        const buffer = await file.arrayBuffer();
        await loadPdfBytes(new Uint8Array(buffer), file.name);
        setCurrentView('editor');
      } catch (err: any) {
        console.error('Failed to open PDF file:', err);
        showToast('Failed to parse PDF file. Ensure it is a valid PDF.', 'error');
      }
    },
    [loadPdfBytes, showToast]
  );

  // Load pre-made sample document
  const handleLoadSample = useCallback(
    async (sampleType: 'invoice' | 'resume' | 'contract' | 'blank') => {
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
        } else {
          pdfBytes = await generateBlankPdf();
          fileName = 'blank_canvas.pdf';
        }

        await loadPdfBytes(pdfBytes, fileName);
        setCurrentView('editor');
        showToast(`Loaded ${sampleType.toUpperCase()} sample template!`, 'success');
      } catch (err: any) {
        console.error('Error loading sample:', err);
        showToast('Failed to generate sample PDF', 'error');
      }
    },
    [loadPdfBytes, showToast]
  );

  // Handle opening specific tool from Home Page
  const handleOpenTool = useCallback(
    (toolId: ToolId) => {
      switch (toolId) {
        case 'edit':
          if (state.documentState.pages.length === 0) {
            handleLoadSample('invoice');
          }
          setCurrentView('editor');
          break;
        case 'merge':
          setIsMergeModalOpen(true);
          break;
        case 'split':
          setIsSplitModalOpen(true);
          break;
        case 'compress':
          setIsCompressModalOpen(true);
          break;
        case 'pdfToImage':
          setIsPdfToImageModalOpen(true);
          break;
        case 'imageToPdf':
          setIsImageToPdfModalOpen(true);
          break;
        case 'organize':
          if (state.documentState.pages.length === 0) {
            handleLoadSample('invoice');
          }
          setCurrentView('editor');
          setState((prev) => ({ ...prev, isOrganizerModalOpen: true }));
          break;
        case 'watermark':
          setIsWatermarkModalOpen(true);
          break;
        case 'sign':
          if (state.documentState.pages.length === 0) {
            handleLoadSample('contract');
          }
          setCurrentView('editor');
          setState((prev) => ({ ...prev, isSignatureModalOpen: true }));
          break;
        case 'redact':
          if (state.documentState.pages.length === 0) {
            handleLoadSample('resume');
          }
          setCurrentView('editor');
          setState((prev) => ({ ...prev, selectedTool: 'redact' }));
          break;
        case 'searchReplace':
          if (state.documentState.pages.length === 0) {
            handleLoadSample('invoice');
          }
          setCurrentView('editor');
          setState((prev) => ({ ...prev, isSearchModalOpen: true }));
          break;
        case 'blank':
          handleLoadSample('blank');
          setCurrentView('editor');
          break;
      }
    },
    [handleLoadSample, state.documentState.pages.length]
  );

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
        const aspect = img.width / img.height;
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
      };
      img.src = dataUrl;
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
      const activeEl = document.activeElement;
      const isInput =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.getAttribute('contenteditable') === 'true';

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

      if (isInput) return;

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
            />

            {/* Multi-Page Canvas Viewport */}
            <CanvasViewport
              state={state}
              pdfDocProxy={pdfDocProxy}
              onUpdateState={setState}
              onAddElement={handleAddElement}
              onUpdateElement={handleUpdateElement}
              onSelectElement={(id) => setState((prev) => ({ ...prev, selectedElementId: id }))}
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

      {/* ================= ALL MODALS ================= */}
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
