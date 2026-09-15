'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import {
  PageInfo,
  EditorElement,
  DetectedTextItem,
  TextElement,
  DrawElement,
  ShapeElement,
  ImageElement,
  SignatureElement,
  RedactElement,
  Point,
} from '../lib/types';
import { AppState } from '../lib/state/store';
import { renderPageToCanvas } from '../lib/pdf/pdfEngine';
import { sampleCanvasColor, sampleCanvasBackgroundColor, cleanTextForPdf } from '../lib/pdf/fontMatcher';
import { Check } from 'lucide-react';

interface PageCardProps {
  page: PageInfo;
  pageIndex: number;
  pdfDocProxy: PDFDocumentProxy | null;
  state: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
  onAddElement: (element: EditorElement, actionDesc?: string) => void;
  onUpdateElement: (id: string, updates: Partial<EditorElement>) => void;
  onSelectElement: (id: string | null) => void;
}

export const PageCard: React.FC<PageCardProps> = ({
  page,
  pageIndex,
  pdfDocProxy,
  state,
  onUpdateState,
  onAddElement,
  onUpdateElement,
  onSelectElement,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Drawing / Dragging state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [resizingHandle, setResizingHandle] = useState<string | null>(null);
  const [draggedElementId, setDraggedElementId] = useState<string | null>(null);
  const [initialElBox, setInitialElBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const scale = state.zoom;
  const isActivePage = state.activePageIndex === pageIndex;
  const pageElements = state.documentState.elements.filter((el) => el.pageIndex === pageIndex);

  // Render PDF page to canvas
  useEffect(() => {
    if (!pdfDocProxy || !canvasRef.current) return;

    const renderHandle = renderPageToCanvas(pdfDocProxy, page.pageNumber, canvasRef.current, 2.0);

    renderHandle.promise.catch((err) => {
      if (err?.name !== 'RenderingCancelledException') {
        console.error('Error rendering page:', err);
      }
    });

    return () => {
      renderHandle.cancel();
    };
  }, [pdfDocProxy, page.pageNumber, page.rotation]);

  // Smoothly scroll active page into viewport when selected
  useEffect(() => {
    if (isActivePage && containerRef.current && state.documentState.pageCount > 1) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isActivePage, state.documentState.pageCount]);

  // Convert client mouse or touch coordinates to PDF point coordinates
  const getPdfCoordinates = (e: React.MouseEvent | React.TouchEvent): Point => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const clientX =
      'touches' in e && e.touches.length > 0
        ? e.touches[0].clientX
        : (e as React.MouseEvent).clientX;
    const clientY =
      'touches' in e && e.touches.length > 0
        ? e.touches[0].clientY
        : (e as React.MouseEvent).clientY;
    const visualX = (clientX - rect.left) / scale;
    const visualY = (clientY - rect.top) / scale;
    return {
      x: Math.max(0, Math.min(page.width, visualX)),
      y: Math.max(0, Math.min(page.height, visualY)),
    };
  };

  // Handle clicking on an original text block to edit in-place with matched font!
  const handleOriginalTextClick = (textItem: DetectedTextItem, e: React.MouseEvent) => {
    e.stopPropagation();

    // Accurately sample background color outside text glyphs
    const sampledBg = sampleCanvasBackgroundColor(
      canvasRef.current,
      {
        x: textItem.visualX,
        y: textItem.visualY,
        width: textItem.width,
        height: textItem.height,
      },
      2.0,
      '#ffffff'
    );

    // Calculate background luminance to guarantee optimal text contrast
    const bgR = parseInt(sampledBg.slice(1, 3), 16) || 255;
    const bgG = parseInt(sampledBg.slice(3, 5), 16) || 255;
    const bgB = parseInt(sampledBg.slice(5, 7), 16) || 255;
    const bgLuminance = 0.299 * bgR + 0.587 * bgG + 0.114 * bgB;

    const textColor = bgLuminance < 128 ? '#ffffff' : (textItem.color && textItem.color !== '#000000' ? textItem.color : '#0f172a');

    // Check if an editor element already replaced this text item
    const existingEl = pageElements.find(
      (el) => el.type === 'text' && (el as TextElement).originalTextId === textItem.id
    );

    if (existingEl) {
      onSelectElement(existingEl.id);
      setTimeout(() => {
        const elDom = document.getElementById(`text-el-${existingEl.id}`) as HTMLTextAreaElement | null;
        if (elDom) {
          elDom.focus();
        }
      }, 50);
      return;
    }

    const initialW = Math.max(80, Math.round(textItem.width + 16));
    const initialH = Math.max(26, Math.round(textItem.height + 6));

    // Create an editable text element matching the original font & size!
    const newTextElement: TextElement = {
      id: `edited-text-${Date.now()}`,
      pageIndex: pageIndex,
      type: 'text',
      x: textItem.visualX,
      y: textItem.visualY,
      width: initialW,
      height: initialH,
      text: cleanTextForPdf(textItem.text),
      fontFamily: textItem.fontFamily,
      pdfFontKey: textItem.pdfFontKey,
      fontSize:
        textItem.fontSize && !isNaN(textItem.fontSize) && textItem.fontSize > 0
          ? textItem.fontSize
          : 14,
      fontWeight: textItem.fontWeight,
      fontStyle: textItem.fontStyle,
      underline: false,
      color: textColor,
      align: 'left',
      lineHeight: 1.25,
      letterSpacing: 0,
      backgroundColor: sampledBg,
      isOriginalEdit: true,
      originalTextId: textItem.id,
      originalBBox: {
        x: textItem.visualX,
        y: textItem.visualY,
        width: textItem.width,
        height: textItem.height,
      },
      isEmbeddedFont: textItem.isEmbeddedFont,
      embeddedFontId: textItem.embeddedFontId,
      fontMatchQuality: textItem.fontMatchQuality,
      zIndex: pageElements.length + 10,
      opacity: 1,
    };

    onAddElement(newTextElement, `Edited text: "${textItem.text.substring(0, 15)}..."`);
    onSelectElement(newTextElement.id);

    setTimeout(() => {
      const elDom = document.getElementById(`text-el-${newTextElement.id}`) as HTMLTextAreaElement | null;
      if (elDom) {
        elDom.focus();
        if (typeof elDom.setSelectionRange === 'function') {
          elDom.setSelectionRange(elDom.value.length, elDom.value.length);
        }
      }
    }, 60);
  };

  // Mouse Down Event on Page Card
  const handleMouseDown = (e: React.MouseEvent) => {
    const pt = getPdfCoordinates(e);

    // Switch active page
    if (!isActivePage) {
      onUpdateState((prev) => ({ ...prev, activePageIndex: pageIndex }));
    }

    // Freehand Drawing or Highlighter
    if (state.selectedTool === 'draw' || state.selectedTool === 'highlighter') {
      setIsDrawing(true);
      setCurrentStroke([pt]);
      return;
    }

    // Add New Text Box Tool
    if (state.selectedTool === 'addText') {
      const newTextEl: TextElement = {
        id: `text-${Date.now()}`,
        pageIndex: pageIndex,
        type: 'text',
        x: pt.x,
        y: pt.y,
        width: 180,
        height: 38,
        text: 'Type text here...',
        fontFamily: state.activeTextConfig.fontFamily,
        pdfFontKey: state.activeTextConfig.pdfFontKey,
        fontSize: state.activeTextConfig.fontSize,
        fontWeight: state.activeTextConfig.fontWeight,
        fontStyle: state.activeTextConfig.fontStyle,
        underline: state.activeTextConfig.underline,
        color: state.activeTextConfig.color,
        align: state.activeTextConfig.align,
        lineHeight: 1.25,
        letterSpacing: 0,
        backgroundColor: state.activeTextConfig.backgroundColor,
        zIndex: pageElements.length + 1,
        opacity: 1,
      };
      onAddElement(newTextEl, 'Added text box');
      onSelectElement(newTextEl.id);
      onUpdateState((prev) => ({ ...prev, selectedTool: 'select' }));

      setTimeout(() => {
        const elDom = document.getElementById(`text-el-${newTextEl.id}`) as HTMLTextAreaElement | null;
        if (elDom) {
          elDom.focus();
          if (typeof elDom.select === 'function') {
            elDom.select();
          }
        }
      }, 60);
      return;
    }

    // Add Shapes Tool
    if (state.selectedTool === 'shape') {
      const newShapeEl: ShapeElement = {
        id: `shape-${Date.now()}`,
        pageIndex: pageIndex,
        type: 'shape',
        shapeType: state.activeShape,
        x: pt.x,
        y: pt.y,
        width: state.activeShape === 'line' || state.activeShape === 'arrow' ? 140 : 120,
        height: state.activeShape === 'line' || state.activeShape === 'arrow' ? 0 : 80,
        strokeColor: '#2563eb',
        strokeWidth: 2,
        fillColor: 'transparent',
        strokeStyle: 'solid',
        borderRadius: state.activeShape === 'roundedRect' ? 8 : 0,
        zIndex: pageElements.length + 1,
        opacity: 1,
      };
      onAddElement(newShapeEl, `Added ${state.activeShape} shape`);
      onSelectElement(newShapeEl.id);
      onUpdateState((prev) => ({ ...prev, selectedTool: 'select' }));
      return;
    }

    // Whiteout / Redact Tool
    if (state.selectedTool === 'redact') {
      const newRedactEl: RedactElement = {
        id: `redact-${Date.now()}`,
        pageIndex: pageIndex,
        type: 'redact',
        redactType: 'whiteout',
        x: pt.x,
        y: pt.y,
        width: 120,
        height: 24,
        zIndex: pageElements.length + 1,
        opacity: 1,
      };
      onAddElement(newRedactEl, 'Added whiteout patch');
      onSelectElement(newRedactEl.id);
      onUpdateState((prev) => ({ ...prev, selectedTool: 'select' }));
      return;
    }

    // Clicking empty space in Select or EditText mode deselects
    if (state.selectedTool === 'select' || state.selectedTool === 'editText') {
      onSelectElement(null);
    }
  };

  // Global window listener to guarantee drag/draw cleanup when mouse is released anywhere
  useEffect(() => {
    if (!draggedElementId && !isDrawing && !resizingHandle) return;

    const handleGlobalRelease = () => {
      if (isDrawing && currentStroke.length >= 1) {
        const isHighlighter = state.selectedTool === 'highlighter';
        const strokePoints =
          currentStroke.length === 1
            ? [currentStroke[0], { x: currentStroke[0].x + 0.1, y: currentStroke[0].y + 0.1 }]
            : currentStroke;

        const newDrawEl: DrawElement = {
          id: `draw-${Date.now()}`,
          pageIndex: pageIndex,
          type: 'draw',
          points: strokePoints,
          strokeColor: isHighlighter
            ? state.activeDrawConfig.highlighterColor
            : state.activeDrawConfig.strokeColor,
          strokeWidth: isHighlighter
            ? state.activeDrawConfig.highlighterWidth
            : state.activeDrawConfig.strokeWidth,
          isHighlighter: isHighlighter,
          x: 0,
          y: 0,
          width: page.width,
          height: page.height,
          zIndex: pageElements.length + 1,
          opacity: isHighlighter ? 0.35 : 1,
        };
        onAddElement(newDrawEl, isHighlighter ? 'Added highlight stroke' : 'Added drawing stroke');
      }

      setIsDrawing(false);
      setCurrentStroke([]);
      setDraggedElementId(null);
      setDragStart(null);
      setResizingHandle(null);
      setInitialElBox(null);
    };

    window.addEventListener('mouseup', handleGlobalRelease);
    window.addEventListener('touchend', handleGlobalRelease);
    return () => {
      window.removeEventListener('mouseup', handleGlobalRelease);
      window.removeEventListener('touchend', handleGlobalRelease);
    };
  }, [
    draggedElementId,
    isDrawing,
    resizingHandle,
    currentStroke,
    pageIndex,
    state.selectedTool,
    state.activeDrawConfig,
    page.width,
    page.height,
    pageElements.length,
    onAddElement,
  ]);

  // Mouse Move Event on Page Card
  const handleMouseMove = (e: React.MouseEvent) => {
    const pt = getPdfCoordinates(e);

    // Freehand drawing in progress
    if (isDrawing) {
      setCurrentStroke((prev) => [...prev, pt]);
      return;
    }

    // Dragging / Resizing an existing element
    if (draggedElementId && dragStart && initialElBox) {
      const deltaX = pt.x - dragStart.x;
      const deltaY = pt.y - dragStart.y;

      // Minimum movement threshold to avoid micro jitter and continuous render calls
      if (Math.abs(deltaX) < 0.25 && Math.abs(deltaY) < 0.25) {
        return;
      }

      if (resizingHandle) {
        // Resizing
        let newWidth = initialElBox.width;
        let newHeight = initialElBox.height;
        let newX = initialElBox.x;
        let newY = initialElBox.y;

        if (resizingHandle === 'se') {
          newWidth = Math.max(20, initialElBox.width + deltaX);
          newHeight = Math.max(15, initialElBox.height + deltaY);
        } else if (resizingHandle === 'sw') {
          newWidth = Math.max(20, initialElBox.width - deltaX);
          newHeight = Math.max(15, initialElBox.height + deltaY);
          newX = initialElBox.x + deltaX;
        } else if (resizingHandle === 'ne') {
          newWidth = Math.max(20, initialElBox.width + deltaX);
          newHeight = Math.max(15, initialElBox.height - deltaY);
          newY = initialElBox.y + deltaY;
        } else if (resizingHandle === 'nw') {
          newWidth = Math.max(20, initialElBox.width - deltaX);
          newHeight = Math.max(15, initialElBox.height - deltaY);
          newX = initialElBox.x + deltaX;
          newY = initialElBox.y + deltaY;
        }

        onUpdateElement(draggedElementId, {
          x: Math.round(newX),
          y: Math.round(newY),
          width: Math.round(newWidth),
          height: Math.round(newHeight),
        });
      } else {
        // Moving
        const targetX = Math.round(
          Math.max(0, Math.min(page.width - initialElBox.width, initialElBox.x + deltaX))
        );
        const targetY = Math.round(
          Math.max(0, Math.min(page.height - initialElBox.height, initialElBox.y + deltaY))
        );

        onUpdateElement(draggedElementId, {
          x: targetX,
          y: targetY,
        });
      }
    }
  };

  // Mouse Up Event on Page Card
  const handleMouseUp = () => {
    // Finish freehand drawing
    if (isDrawing && currentStroke.length >= 1) {
      const isHighlighter = state.selectedTool === 'highlighter';
      const strokePoints =
        currentStroke.length === 1
          ? [currentStroke[0], { x: currentStroke[0].x + 0.1, y: currentStroke[0].y + 0.1 }]
          : currentStroke;

      const newDrawEl: DrawElement = {
        id: `draw-${Date.now()}`,
        pageIndex: pageIndex,
        type: 'draw',
        points: strokePoints,
        strokeColor: isHighlighter
          ? state.activeDrawConfig.highlighterColor
          : state.activeDrawConfig.strokeColor,
        strokeWidth: isHighlighter
          ? state.activeDrawConfig.highlighterWidth
          : state.activeDrawConfig.strokeWidth,
        isHighlighter: isHighlighter,
        x: 0,
        y: 0,
        width: page.width,
        height: page.height,
        zIndex: pageElements.length + 1,
        opacity: isHighlighter ? 0.35 : 1,
      };
      onAddElement(newDrawEl, isHighlighter ? 'Added highlight stroke' : 'Added drawing stroke');
    }

    setIsDrawing(false);
    setCurrentStroke([]);
    setDraggedElementId(null);
    setDragStart(null);
    setResizingHandle(null);
    setInitialElBox(null);
  };

  // Start element move
  const handleElementMouseDown = (el: EditorElement, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectElement(el.id);
    if (state.selectedTool !== 'draw' && state.selectedTool !== 'highlighter') {
      setDraggedElementId(el.id);
      const pt = getPdfCoordinates(e);
      setDragStart(pt);
      setInitialElBox({ x: el.x, y: el.y, width: el.width, height: el.height });
    }
  };

  // Start element resize
  const handleResizeHandleMouseDown = (el: EditorElement, handle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraggedElementId(el.id);
    setResizingHandle(handle);
    const pt = getPdfCoordinates(e);
    setDragStart(pt);
    setInitialElBox({ x: el.x, y: el.y, width: el.width, height: el.height });
  };

  return (
    <div
      ref={containerRef}
      className={`page-container ${isActivePage ? 'active-page' : ''}`}
      style={{
        width: `${page.width * scale}px`,
        height: `${page.height * scale}px`,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={(e) => {
        if (state.selectedTool === 'draw' || state.selectedTool === 'highlighter') {
          handleMouseDown(e as any);
        }
      }}
      onTouchMove={(e) => {
        if (state.selectedTool === 'draw' || state.selectedTool === 'highlighter') {
          handleMouseMove(e as any);
        }
      }}
      onTouchEnd={handleMouseUp}
    >
      <div className="page-badge">Page {pageIndex + 1} of {state.documentState.pageCount}</div>

      {/* PDF Background Canvas */}
      <canvas
        ref={canvasRef}
        className="pdf-canvas"
        style={{
          width: `${page.width * scale}px`,
          height: `${page.height * scale}px`,
        }}
      />

      {/* Text Detection Overlay Layer (Active in 'editText' and 'select' mode) */}
      {(state.selectedTool === 'editText' || state.selectedTool === 'select') && (
        <div className="text-detection-layer">
          {page.textItems.map((item) => {
            const isItemEdited = pageElements.some(
              (el) => el.type === 'text' && (el as TextElement).originalTextId === item.id
            );
            if (isItemEdited) return null;

            return (
              <div
                key={item.id}
                className={`text-item-box ${state.selectedTool === 'select' ? 'subtle' : ''}`}
                style={{
                  left: `${item.visualX * scale}px`,
                  top: `${item.visualY * scale}px`,
                  width: `${item.width * scale}px`,
                  height: `${item.height * scale}px`,
                }}
                onClick={(e) => handleOriginalTextClick(item, e)}
                onMouseDown={(e) => e.stopPropagation()}
                title="Click to edit this text"
              >
                {/* Font Info Tooltip */}
                <div className="text-font-tooltip">
                  {item.isEmbeddedFont ? '⭐ Original Font: ' : '⚡ Closest Match: '}
                  {item.cleanFontName || item.fontFamily} {Math.round(item.fontSize)}pt
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* User Added / Modified Elements Overlay — container is always pointer-events:none; 
          .element-wrapper children handle their own pointer-events via CSS */}
      <div className="elements-overlay">
        {pageElements.map((el) => {
          const isSelected = state.selectedElementId === el.id;

          return (
            <div
              key={el.id}
              className={`element-wrapper ${
                // Text elements: never show blue selection box — seamless editing
                el.type === 'text' ? '' : isSelected ? 'selected' : ''
              }`}
              style={{
                left: `${el.x * scale}px`,
                top: `${el.y * scale}px`,
                width: `${Math.max(20, el.width) * scale}px`,
                height: `${Math.max(16, el.height) * scale}px`,
                zIndex: el.zIndex,
                opacity: el.opacity ?? 1,
                // Text elements use text cursor, not move cursor
                cursor: el.type === 'text' ? 'text' : undefined,
              }}
              onMouseDown={(e) => handleElementMouseDown(el, e)}
            >
              {el.type === 'text' && (
                isSelected ? (
                  <textarea
                    id={`text-el-${el.id}`}
                    className="element-text-textarea"
                    value={(el as TextElement).text}
                    autoFocus
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      fontFamily: (el as TextElement).fontFamily,
                      fontSize: `${(el as TextElement).fontSize * scale}px`,
                      fontWeight: (el as TextElement).fontWeight,
                      fontStyle: (el as TextElement).fontStyle,
                      textDecoration: (el as TextElement).underline ? 'underline' : 'none',
                      color: (el as TextElement).color || '#0f172a',
                      textAlign: (el as TextElement).align || 'left',
                      lineHeight: String((el as TextElement).lineHeight || 1.25),
                      letterSpacing: `${(el as TextElement).letterSpacing || 0}px`,
                      // Use sampled background so original canvas text is hidden seamlessly
                      backgroundColor: (el as TextElement).backgroundColor || '#ffffff',
                      padding: '0px',
                      margin: 0,
                      border: 'none',
                      outline: 'none',
                      boxShadow: 'none',
                      resize: 'none',
                      overflow: 'visible',
                      boxSizing: 'border-box',
                      cursor: 'text',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      display: 'block',
                      // Inherit background without browser textarea default styling
                      WebkitAppearance: 'none',
                      appearance: 'none',
                    }}
                    onChange={(e) => {
                      const newText = e.target.value;
                      const textEl = el as TextElement;
                      // Guard against NaN/0/undefined fontSize — collapses the element to 0px on first keystroke
                      const safeFontSize =
                        textEl.fontSize && !isNaN(textEl.fontSize) && textEl.fontSize > 0
                          ? textEl.fontSize
                          : 14;
                      const lines = newText.split('\n');
                      const lineCount = lines.length;
                      const approxLineHeight = safeFontSize * (textEl.lineHeight || 1.25);
                      const estHeightRaw = Math.max(textEl.height || 0, lineCount * approxLineHeight + 10);
                      const maxLineLen = Math.max(...lines.map((l) => l.length), 1);
                      const estWidthRaw = Math.max(textEl.width || 0, maxLineLen * (safeFontSize * 0.6) + 16);
                      // Clamp to sane minimums regardless of any NaN/negative inputs
                      const estHeight = Math.max(20, isFinite(estHeightRaw) ? estHeightRaw : 20);
                      const estWidth = Math.max(40, isFinite(estWidthRaw) ? estWidthRaw : 40);

                      onUpdateElement(el.id, {
                        text: newText,
                        height: Math.round(estHeight),
                        width: Math.round(estWidth),
                      });
                    }}
                    onKeyDown={(e) => {
                      // Stop propagation so global shortcuts (v, e, t, p, Backspace delete, etc.) NEVER interfere!
                      e.stopPropagation();
                      if (e.key === 'Escape') {
                        e.currentTarget.blur();
                        onSelectElement(null);
                      }
                      // Allow Enter to insert newlines — only Escape deselects
                    }}
                    onKeyUp={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                      onUpdateElement(el.id, { text: e.target.value });
                      onSelectElement(null);
                    }}
                  />
                ) : (
                  <div
                    id={`text-el-${el.id}`}
                    className="element-text-display"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      fontFamily: (el as TextElement).fontFamily,
                      fontSize: `${(el as TextElement).fontSize * scale}px`,
                      fontWeight: (el as TextElement).fontWeight,
                      fontStyle: (el as TextElement).fontStyle,
                      textDecoration: (el as TextElement).underline ? 'underline' : 'none',
                      color: (el as TextElement).color || '#0f172a',
                      textAlign: (el as TextElement).align || 'left',
                      lineHeight: String((el as TextElement).lineHeight || 1.25),
                      letterSpacing: `${(el as TextElement).letterSpacing || 0}px`,
                      // Background covers original canvas text — makes edit invisible
                      backgroundColor: (el as TextElement).backgroundColor || '#ffffff',
                      padding: '0px',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      cursor: 'text',
                      userSelect: 'none',
                      boxSizing: 'border-box',
                      overflow: 'visible',
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectElement(el.id);
                      setTimeout(() => {
                        const ta = document.getElementById(`text-el-${el.id}`) as HTMLTextAreaElement | null;
                        if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
                      }, 30);
                    }}
                  >
                    {(el as TextElement).text}
                  </div>
                )
              )}

              {/* ================= Element: Shape ================= */}
              {el.type === 'shape' && (
                <svg
                  style={{
                    width: '100%',
                    height: '100%',
                    overflow: 'visible',
                  }}
                >
                  {(el as ShapeElement).shapeType === 'rect' && (
                    <rect
                      x={1}
                      y={1}
                      width={Math.max(1, el.width * scale - 2)}
                      height={Math.max(1, el.height * scale - 2)}
                      stroke={(el as ShapeElement).strokeColor}
                      strokeWidth={(el as ShapeElement).strokeWidth}
                      fill={(el as ShapeElement).fillColor || 'transparent'}
                    />
                  )}
                  {(el as ShapeElement).shapeType === 'roundedRect' && (
                    <rect
                      x={1}
                      y={1}
                      rx={8 * scale}
                      ry={8 * scale}
                      width={Math.max(1, el.width * scale - 2)}
                      height={Math.max(1, el.height * scale - 2)}
                      stroke={(el as ShapeElement).strokeColor}
                      strokeWidth={(el as ShapeElement).strokeWidth}
                      fill={(el as ShapeElement).fillColor || 'transparent'}
                    />
                  )}
                  {(el as ShapeElement).shapeType === 'circle' && (
                    <ellipse
                      cx={(el.width * scale) / 2}
                      cy={(el.height * scale) / 2}
                      rx={Math.max(1, (el.width * scale) / 2 - 2)}
                      ry={Math.max(1, (el.height * scale) / 2 - 2)}
                      stroke={(el as ShapeElement).strokeColor}
                      strokeWidth={(el as ShapeElement).strokeWidth}
                      fill={(el as ShapeElement).fillColor || 'transparent'}
                    />
                  )}
                  {(el as ShapeElement).shapeType === 'line' && (
                    <line
                      x1={0}
                      y1={0}
                      x2={el.width * scale}
                      y2={el.height * scale}
                      stroke={(el as ShapeElement).strokeColor}
                      strokeWidth={(el as ShapeElement).strokeWidth}
                    />
                  )}
                  {(el as ShapeElement).shapeType === 'arrow' && (
                    <>
                      <defs>
                        <marker
                          id={`arrowhead-${el.id}`}
                          markerWidth="10"
                          markerHeight="7"
                          refX="9"
                          refY="3.5"
                          orient="auto"
                        >
                          <polygon
                            points="0 0, 10 3.5, 0 7"
                            fill={(el as ShapeElement).strokeColor}
                          />
                        </marker>
                      </defs>
                      <line
                        x1={0}
                        y1={0}
                        x2={el.width * scale}
                        y2={el.height * scale}
                        stroke={(el as ShapeElement).strokeColor}
                        strokeWidth={(el as ShapeElement).strokeWidth}
                        markerEnd={`url(#arrowhead-${el.id})`}
                      />
                    </>
                  )}
                  {(el as ShapeElement).shapeType === 'checkmark' && (
                    <path
                      d={`M ${el.width * scale * 0.1} ${el.height * scale * 0.5} L ${el.width * scale * 0.4} ${el.height * scale * 0.85} L ${el.width * scale * 0.9} ${el.height * scale * 0.15}`}
                      stroke={(el as ShapeElement).strokeColor}
                      strokeWidth={(el as ShapeElement).strokeWidth || 3}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </svg>
              )}

              {/* ================= Element: Signature ================= */}
              {el.type === 'signature' && (
                <img
                  src={(el as SignatureElement).dataUrl}
                  alt="Signature"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  draggable={false}
                />
              )}

              {/* ================= Element: Image / Stamp ================= */}
              {el.type === 'image' && (
                <img
                  src={(el as ImageElement).dataUrl}
                  alt="Element"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  draggable={false}
                />
              )}

              {/* ================= Element: Redaction / Whiteout ================= */}
              {el.type === 'redact' && (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor:
                      (el as RedactElement).redactType === 'blackout' ? '#000000' : '#ffffff',
                    boxShadow:
                      (el as RedactElement).redactType === 'whiteout'
                        ? '0 0 0 1px rgba(0,0,0,0.1)'
                        : 'none',
                  }}
                />
              )}

              {/* Floating DONE Button — only for non-text elements (shapes, images, etc.) */}
              {isSelected && el.type !== 'text' && (
                <button
                  type="button"
                  className="element-done-badge"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onSelectElement(null);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onSelectElement(null);
                  }}
                  title="Done (Finish editing & view result)"
                >
                  <Check size={11} strokeWidth={2.5} />
                  <span>DONE</span>
                </button>
              )}

              {/* Resize Handles — only for non-text elements; text resizes automatically */}
              {isSelected && el.type !== 'text' && (state.selectedTool === 'select' || state.selectedTool === 'editText') && (
                <>
                  <div
                    className="resize-handle handle-nw"
                    onMouseDown={(e) => handleResizeHandleMouseDown(el, 'nw', e)}
                  />
                  <div
                    className="resize-handle handle-ne"
                    onMouseDown={(e) => handleResizeHandleMouseDown(el, 'ne', e)}
                  />
                  <div
                    className="resize-handle handle-se"
                    onMouseDown={(e) => handleResizeHandleMouseDown(el, 'se', e)}
                  />
                  <div
                    className="resize-handle handle-sw"
                    onMouseDown={(e) => handleResizeHandleMouseDown(el, 'sw', e)}
                  />
                </>
              )}
            </div>
          );
        })}

        {/* Live Freehand Drawings SVG */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        >
          {pageElements
            .filter((el) => el.type === 'draw')
            .map((drawEl: any) => {
              if (!drawEl.points || drawEl.points.length < 2) return null;
              const pathD = drawEl.points
                .map((p: Point, i: number) => `${i === 0 ? 'M' : 'L'} ${p.x * scale} ${p.y * scale}`)
                .join(' ');

              return (
                <path
                  key={drawEl.id}
                  d={pathD}
                  stroke={drawEl.strokeColor}
                  strokeWidth={drawEl.strokeWidth * scale}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  opacity={drawEl.isHighlighter ? 0.35 : (drawEl.opacity ?? 1)}
                  style={{
                    mixBlendMode: drawEl.isHighlighter ? 'multiply' : 'normal',
                  }}
                />
              );
            })}

          {/* Current In-Progress Freehand Stroke */}
          {isDrawing && currentStroke.length >= 1 && (
            <path
              d={
                currentStroke.length === 1
                  ? `M ${currentStroke[0].x * scale} ${currentStroke[0].y * scale} L ${currentStroke[0].x * scale + 0.1} ${currentStroke[0].y * scale + 0.1}`
                  : currentStroke
                      .map((p: Point, i: number) => `${i === 0 ? 'M' : 'L'} ${p.x * scale} ${p.y * scale}`)
                      .join(' ')
              }
              stroke={
                state.selectedTool === 'highlighter'
                  ? state.activeDrawConfig.highlighterColor
                  : state.activeDrawConfig.strokeColor
              }
              strokeWidth={
                (state.selectedTool === 'highlighter'
                  ? state.activeDrawConfig.highlighterWidth
                  : state.activeDrawConfig.strokeWidth) * scale
              }
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={state.selectedTool === 'highlighter' ? 0.35 : 1}
              style={{
                mixBlendMode: state.selectedTool === 'highlighter' ? 'multiply' : 'normal',
              }}
            />
          )}
        </svg>
      </div>
    </div>
  );
};
