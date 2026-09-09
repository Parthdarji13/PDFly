'use client';

import React from 'react';
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  Copy,
  Layers,
  Square,
  Circle,
  Minus,
  MoveRight,
  Check,
  Type,
} from 'lucide-react';
import { AppState } from '../lib/state/store';
import { AVAILABLE_FONTS } from '../lib/pdf/fontMatcher';
import { ShapeType, TextElement, ShapeElement, DrawElement } from '../lib/types';

interface InspectorProps {
  state: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
  onDeleteSelected: () => void;
  onDuplicateSelected: () => void;
}

export const Inspector: React.FC<InspectorProps> = ({
  state,
  onUpdateState,
  onDeleteSelected,
  onDuplicateSelected,
}) => {
  const selectedEl = state.documentState.elements.find(
    (el) => el.id === state.selectedElementId
  );

  const activeTool = state.selectedTool;

  // Render when tool or selection requires inspector controls
  const showTextControls = activeTool === 'addText' || activeTool === 'editText' || selectedEl?.type === 'text';
  const showShapeControls = activeTool === 'shape' || selectedEl?.type === 'shape';
  const showDrawControls = activeTool === 'draw' || activeTool === 'highlighter' || selectedEl?.type === 'draw';
  const showGenericControls = !!selectedEl;

  if (!showTextControls && !showShapeControls && !showDrawControls && !showGenericControls) {
    return null;
  }

  // Handle text properties update
  const updateSelectedText = (updates: Partial<TextElement>) => {
    if (selectedEl && selectedEl.type === 'text') {
      onUpdateState((prev) => ({
        ...prev,
        documentState: {
          ...prev.documentState,
          elements: prev.documentState.elements.map((el) =>
            el.id === selectedEl.id ? ({ ...el, ...updates } as TextElement) : el
          ),
        },
      }));
    } else {
      // Update global active text config
      onUpdateState((prev) => ({
        ...prev,
        activeTextConfig: {
          ...prev.activeTextConfig,
          ...updates,
        },
      }));
    }
  };

  // Handle shape properties update
  const updateSelectedShape = (updates: Partial<ShapeElement>) => {
    if (selectedEl && selectedEl.type === 'shape') {
      onUpdateState((prev) => ({
        ...prev,
        documentState: {
          ...prev.documentState,
          elements: prev.documentState.elements.map((el) =>
            el.id === selectedEl.id ? ({ ...el, ...updates } as ShapeElement) : el
          ),
        },
      }));
    }
  };

  const currentFontFamily =
    selectedEl?.type === 'text'
      ? (selectedEl as TextElement).fontFamily
      : state.activeTextConfig.fontFamily;

  const currentFontSize =
    selectedEl?.type === 'text'
      ? (selectedEl as TextElement).fontSize
      : state.activeTextConfig.fontSize;

  const currentFontWeight =
    selectedEl?.type === 'text'
      ? (selectedEl as TextElement).fontWeight
      : state.activeTextConfig.fontWeight;

  const currentFontStyle =
    selectedEl?.type === 'text'
      ? (selectedEl as TextElement).fontStyle
      : state.activeTextConfig.fontStyle;

  const currentUnderline =
    selectedEl?.type === 'text'
      ? (selectedEl as TextElement).underline
      : state.activeTextConfig.underline;

  const currentTextColor =
    selectedEl?.type === 'text'
      ? (selectedEl as TextElement).color
      : state.activeTextConfig.color;

  const currentAlign =
    selectedEl?.type === 'text'
      ? (selectedEl as TextElement).align
      : state.activeTextConfig.align;

  return (
    <aside className="inspector-bar">
      {/* ---------------- Text Controls ---------------- */}
      {showTextControls && (
        <>
          {/* Font Family Selector */}
          <div className="inspector-group">
            <span className="inspector-label">Font:</span>
            <select
              className="inspector-select"
              value={currentFontFamily}
              onChange={(e) => {
                const selected = AVAILABLE_FONTS.find((f) => f.name === e.target.value || f.id === e.target.value);
                const fam = selected ? selected.name : e.target.value;
                const pKey = selected ? selected.pdfKey : 'Helvetica';
                updateSelectedText({ fontFamily: fam, pdfFontKey: pKey });
              }}
            >
              {AVAILABLE_FONTS.map((font) => (
                <option key={font.id} value={font.name}>
                  {font.name} ({font.category})
                </option>
              ))}
            </select>
          </div>

          {/* Font Size */}
          <div className="inspector-group">
            <span className="inspector-label">Size:</span>
            <input
              type="number"
              className="inspector-input-number"
              min={6}
              max={144}
              value={Math.round(currentFontSize)}
              onChange={(e) => {
                const s = parseInt(e.target.value, 10);
                if (!isNaN(s) && s > 0) updateSelectedText({ fontSize: s });
              }}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>pt</span>
          </div>

          {/* Bold, Italic, Underline */}
          <div className="inspector-group">
            <button
              className={`inspector-btn-toggle ${currentFontWeight === 'bold' ? 'active' : ''}`}
              onClick={() =>
                updateSelectedText({
                  fontWeight: currentFontWeight === 'bold' ? 'normal' : 'bold',
                })
              }
              title="Bold"
            >
              <Bold size={14} />
            </button>
            <button
              className={`inspector-btn-toggle ${currentFontStyle === 'italic' ? 'active' : ''}`}
              onClick={() =>
                updateSelectedText({
                  fontStyle: currentFontStyle === 'italic' ? 'normal' : 'italic',
                })
              }
              title="Italic"
            >
              <Italic size={14} />
            </button>
            <button
              className={`inspector-btn-toggle ${currentUnderline ? 'active' : ''}`}
              onClick={() => updateSelectedText({ underline: !currentUnderline })}
              title="Underline"
            >
              <Underline size={14} />
            </button>
          </div>

          {/* Alignment */}
          <div className="inspector-group">
            <button
              className={`inspector-btn-toggle ${currentAlign === 'left' ? 'active' : ''}`}
              onClick={() => updateSelectedText({ align: 'left' })}
              title="Align Left"
            >
              <AlignLeft size={14} />
            </button>
            <button
              className={`inspector-btn-toggle ${currentAlign === 'center' ? 'active' : ''}`}
              onClick={() => updateSelectedText({ align: 'center' })}
              title="Align Center"
            >
              <AlignCenter size={14} />
            </button>
            <button
              className={`inspector-btn-toggle ${currentAlign === 'right' ? 'active' : ''}`}
              onClick={() => updateSelectedText({ align: 'right' })}
              title="Align Right"
            >
              <AlignRight size={14} />
            </button>
          </div>

          {/* Text Color */}
          <div className="inspector-group">
            <span className="inspector-label">Color:</span>
            <div className="color-swatch-btn" style={{ backgroundColor: currentTextColor }}>
              <input
                type="color"
                className="color-input-hidden"
                value={currentTextColor.startsWith('#') ? currentTextColor : '#000000'}
                onChange={(e) => updateSelectedText({ color: e.target.value })}
              />
            </div>
          </div>
        </>
      )}

      {/* ---------------- Shape Controls ---------------- */}
      {showShapeControls && (
        <>
          {/* Shape Type Selector */}
          <div className="inspector-group">
            <span className="inspector-label">Shape:</span>
            <select
              className="inspector-select"
              value={
                selectedEl?.type === 'shape'
                  ? (selectedEl as ShapeElement).shapeType
                  : state.activeShape
              }
              onChange={(e) => {
                const st = e.target.value as ShapeType;
                if (selectedEl?.type === 'shape') {
                  updateSelectedShape({ shapeType: st });
                } else {
                  onUpdateState((prev) => ({ ...prev, activeShape: st }));
                }
              }}
            >
              <option value="rect">Rectangle</option>
              <option value="roundedRect">Rounded Box</option>
              <option value="circle">Circle / Ellipse</option>
              <option value="line">Straight Line</option>
              <option value="arrow">Arrow</option>
              <option value="checkmark">Checkmark</option>
            </select>
          </div>

          {/* Stroke Width */}
          <div className="inspector-group">
            <span className="inspector-label">Border:</span>
            <input
              type="number"
              className="inspector-input-number"
              min={0}
              max={24}
              value={selectedEl?.type === 'shape' ? (selectedEl as ShapeElement).strokeWidth : 2}
              onChange={(e) => {
                const w = parseInt(e.target.value, 10);
                if (!isNaN(w)) updateSelectedShape({ strokeWidth: w });
              }}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>px</span>
          </div>

          {/* Stroke Color */}
          <div className="inspector-group">
            <span className="inspector-label">Stroke:</span>
            <div
              className="color-swatch-btn"
              style={{
                backgroundColor:
                  selectedEl?.type === 'shape'
                    ? (selectedEl as ShapeElement).strokeColor
                    : '#2563eb',
              }}
            >
              <input
                type="color"
                className="color-input-hidden"
                value={
                  selectedEl?.type === 'shape'
                    ? (selectedEl as ShapeElement).strokeColor
                    : '#2563eb'
                }
                onChange={(e) => updateSelectedShape({ strokeColor: e.target.value })}
              />
            </div>
          </div>

          {/* Fill Color */}
          <div className="inspector-group">
            <span className="inspector-label">Fill:</span>
            <select
              className="inspector-select"
              value={
                selectedEl?.type === 'shape' && (selectedEl as ShapeElement).fillColor !== 'transparent'
                  ? 'custom'
                  : 'transparent'
              }
              onChange={(e) => {
                if (e.target.value === 'transparent') {
                  updateSelectedShape({ fillColor: 'transparent' });
                } else {
                  updateSelectedShape({ fillColor: '#6366f133' });
                }
              }}
            >
              <option value="transparent">Transparent</option>
              <option value="custom">Filled Color</option>
            </select>

            {selectedEl?.type === 'shape' && (selectedEl as ShapeElement).fillColor !== 'transparent' && (
              <div
                className="color-swatch-btn"
                style={{ backgroundColor: (selectedEl as ShapeElement).fillColor }}
              >
                <input
                  type="color"
                  className="color-input-hidden"
                  value={((selectedEl as ShapeElement).fillColor || '#ffffff').substring(0, 7)}
                  onChange={(e) => updateSelectedShape({ fillColor: e.target.value })}
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* ---------------- Freehand / Highlighter Controls ---------------- */}
      {showDrawControls && (
        <>
          <div className="inspector-group">
            <span className="inspector-label">
              {activeTool === 'highlighter' ? 'Highlighter' : 'Pen Color'}:
            </span>
            <div
              className="color-swatch-btn"
              style={{
                backgroundColor:
                  activeTool === 'highlighter'
                    ? state.activeDrawConfig.highlighterColor
                    : state.activeDrawConfig.strokeColor,
              }}
            >
              <input
                type="color"
                className="color-input-hidden"
                value={
                  activeTool === 'highlighter'
                    ? state.activeDrawConfig.highlighterColor
                    : state.activeDrawConfig.strokeColor
                }
                onChange={(e) => {
                  const val = e.target.value;
                  onUpdateState((prev) => ({
                    ...prev,
                    activeDrawConfig: {
                      ...prev.activeDrawConfig,
                      ...(activeTool === 'highlighter'
                        ? { highlighterColor: val }
                        : { strokeColor: val }),
                    },
                  }));
                }}
              />
            </div>
          </div>

          <div className="inspector-group">
            <span className="inspector-label">Thickness:</span>
            <input
              type="number"
              className="inspector-input-number"
              min={1}
              max={50}
              value={
                activeTool === 'highlighter'
                  ? state.activeDrawConfig.highlighterWidth
                  : state.activeDrawConfig.strokeWidth
              }
              onChange={(e) => {
                const w = parseInt(e.target.value, 10);
                if (!isNaN(w) && w > 0) {
                  onUpdateState((prev) => ({
                    ...prev,
                    activeDrawConfig: {
                      ...prev.activeDrawConfig,
                      ...(activeTool === 'highlighter'
                        ? { highlighterWidth: w }
                        : { strokeWidth: w }),
                    },
                  }));
                }
              }}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>px</span>
          </div>
        </>
      )}

      {/* ---------------- Generic Selected Element Actions ---------------- */}
      {selectedEl && (
        <div className="inspector-group" style={{ marginLeft: 'auto' }}>
          <button
            className="inspector-btn-toggle"
            onClick={onDuplicateSelected}
            title="Duplicate Element"
          >
            <Copy size={14} />
          </button>
          <button
            className="inspector-btn-toggle"
            style={{ color: 'var(--accent-danger)' }}
            onClick={onDeleteSelected}
            title="Delete Element (Del)"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </aside>
  );
};
