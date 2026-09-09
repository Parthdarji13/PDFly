'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
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
import { sampleCanvasColor } from '../lib/pdf/fontMatcher';

interface PageCardProps {
  page: PageInfo;
  pageIndex: number;
  pdfDocProxy: pdfjsLib.PDFDocumentProxy | null;
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

    // Sample background color under the text item
    const sampledBg = sampleCanvasColor(
      canvasRef.current,
      (textItem.visualX + textItem.width / 2) * 2,
      (textItem.visualY + textItem.height / 2) * 2,
      '#ffffff'
    );

    // Check if an editor element already replaced this text item
    const existingEl = pageElements.find(
      (el) => el.type === 'text' && (el as TextElement).originalTextId === textItem.id
    );

    if (existingEl) {
      onSelectElement(existingEl.id);
      return;
    }

    // Create an editable text element matching the original font & size!
    const newTextElement: TextElement = {
      id: `edited-text-${Date.now()}`,
      pageIndex: pageIndex,
      type: 'text',
      x: textItem.visualX,
      y: textItem.visualY,
      width: Math.max(80, textItem.width + 10),
      height: Math.max(20, textItem.height + 4),
      text: textItem.text,
      fontFamily: textItem.fontFamily,
      pdfFontKey: textItem.pdfFontKey,
      fontSize: textItem.fontSize,
      fontWeight: textItem.fontWeight,
      fontStyle: textItem.fontStyle,
      underline: false,
      color: textItem.color || '#0f172a',
      align: 'left',
      lineHeight: 1.2,
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
      zIndex: pageElements.length + 10,
      opacity: 1,
    };

    onAddElement(newTextElement, `Edited text: "${textItem.text.substring(0, 15)}..."`);
    onSelectElement(newTextElement.id);
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
        height: 36,
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

    // Clicking empty space in Select mode deselects
    if (state.selectedTool === 'select') {
      onSelectElement(null);
    }
  };

  // Mouse Move Event on Page Card
  const handleMouseMove = (e: React.MouseEvent) => {
    const pt = getPdfCoordinates(e);

    // Freehand drawing in progress
    if (isDrawing) {
      setCurrentStroke((prev) => [...prev, pt]);
      return;
    }

    // Dragging an existing element
    if (draggedElementId && dragStart && initialElBox) {
      const deltaX = pt.x - dragStart.x;
      const deltaY = pt.y - dragStart.y;

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
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        });
      } else {
        // Moving
        onUpdateElement(draggedElementId, {
          x: Math.max(0, Math.min(page.width - initialElBox.width, initialElBox.x + deltaX)),
          y: Math.max(0, Math.min(page.height - initialElBox.height, initialElBox.y + deltaY)),
        });
      }
    }
  };

  // Mouse Up Event on Page Card
  const handleMouseUp = () => {
    // Finish freehand drawing
    if (isDrawing && currentStroke.length > 1) {
      const isHighlighter = state.selectedTool === 'highlighter';
      const newDrawEl: DrawElement = {
        id: `draw-${Date.now()}`,
        pageIndex: pageIndex,
        type: 'draw',
        points: currentStroke,
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
      setIsDrawing(false);
      setCurrentStroke([]);
      return;
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
    if (state.selectedTool !== 'select') return;
    e.stopPropagation();
    onSelectElement(el.id);
    setDraggedElementId(el.id);
    const pt = getPdfCoordinates(e);
    setDragStart(pt);
    setInitialElBox({ x: el.x, y: el.y, width: el.width, height: el.height });
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
      <div className="page-badge">Page {pageIndex + 1}</div>

      {/* PDF Background Canvas */}
      <canvas
        ref={canvasRef}
        className="pdf-canvas"
        style={{
          width: `${page.width * scale}px`,
          height: `${page.height * scale}px`,
        }}
      />

      {/* Text Detection Overlay Layer (Active in 'editText' mode) */}
      {state.selectedTool === 'editText' && (
        <div className="text-detection-layer">
          {page.textItems.map((item) => (
            <div
              key={item.id}
              className={`text-item-box ${item.isEdited ? 'edited' : ''}`}
              style={{
                left: `${item.visualX * scale}px`,
                top: `${item.visualY * scale}px`,
                width: `${item.width * scale}px`,
                height: `${item.height * scale}px`,
              }}
              onClick={(e) => handleOriginalTextClick(item, e)}
            >
              {/* Font Info Tooltip */}
              <div className="text-font-tooltip">
                🔍 {item.fontFamily} {Math.round(item.fontSize)}pt {item.fontWeight === 'bold' ? '(Bold)' : ''}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* User Added / Modified Elements Overlay */}
      <div className="elements-overlay">
        {pageElements.map((el) => {
          const isSelected = state.selectedElementId === el.id;

          return (
            <div
              key={el.id}
              className={`element-wrapper ${isSelected ? 'selected' : ''}`}
              style={{
                left: `${el.x * scale}px`,
                top: `${el.y * scale}px`,
                width: `${el.width * scale}px`,
                height: `${el.height * scale}px`,
                zIndex: el.zIndex,
                opacity: el.opacity ?? 1,
              }}
              onMouseDown={(e) => handleElementMouseDown(el, e)}
            >
              {/* ================= Element: Text ================= */}
              {el.type === 'text' && (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    fontFamily: (el as TextElement).fontFamily,
                    fontSize: `${(el as TextElement).fontSize * scale}px`,
                    fontWeight: (el as TextElement).fontWeight,
                    fontStyle: (el as TextElement).fontStyle,
                    textDecoration: (el as TextElement).underline ? 'underline' : 'none',
                    color: (el as TextElement).color,
                    textAlign: (el as TextElement).align,
                    lineHeight: (el as TextElement).lineHeight || 1.25,
                    backgroundColor: (el as TextElement).backgroundColor || 'transparent',
                    padding: '2px 4px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                  contentEditable={isSelected}
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    onUpdateElement(el.id, { text: e.currentTarget.innerText });
                  }}
                >
                  {(el as TextElement).text}
                </div>
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

              {/* Resize Handles (When selected in select tool) */}
              {isSelected && state.selectedTool === 'select' && (
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
          {isDrawing && currentStroke.length > 1 && (
            <path
              d={currentStroke
                .map((p: Point, i: number) => `${i === 0 ? 'M' : 'L'} ${p.x * scale} ${p.y * scale}`)
                .join(' ')}
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
