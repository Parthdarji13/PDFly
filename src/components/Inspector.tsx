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
  Plus,
  Minus,
  Sparkles,
  Palette,
  Highlighter,
  Check,
} from 'lucide-react';
import { AppState } from '../lib/state/store';
import { AVAILABLE_FONTS } from '../lib/pdf/fontMatcher';
import { ShapeType, TextElement, ShapeElement, DrawElement } from '../lib/types';

interface InspectorProps {
  state: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
  onDeleteSelected: () => void;
  onDuplicateSelected: () => void;
  onOpenAiTextAssist?: () => void;
}

// Preset color swatches
const TEXT_COLORS = [
  { hex: '#0f172a', label: 'Dark / Black' },
  { hex: '#475569', label: 'Slate' },
  { hex: '#2563eb', label: 'Royal Blue' },
  { hex: '#7c3aed', label: 'Purple' },
  { hex: '#16a34a', label: 'Green' },
  { hex: '#ea580c', label: 'Orange' },
  { hex: '#dc2626', label: 'Red' },
  { hex: '#ffffff', label: 'White' },
];

const BG_HIGHLIGHT_COLORS = [
  { hex: 'transparent', label: 'None (Transparent)' },
  { hex: '#ffffff', label: 'White Patch (Whiteout)' },
  { hex: '#fef08a', label: 'Yellow Highlight' },
  { hex: '#bbf7d0', label: 'Green Highlight' },
  { hex: '#bfdbfe', label: 'Blue Highlight' },
  { hex: '#fecdd3', label: 'Pink Highlight' },
  { hex: '#f3e8ff', label: 'Purple Highlight' },
];

const SHAPE_STROKE_COLORS = [
  '#2563eb',
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#0f172a',
  '#ffffff',
];

const PEN_COLORS = [
  '#ef4444',
  '#2563eb',
  '#10b981',
  '#0f172a',
  '#ffffff',
  '#f59e0b',
  '#8b5cf6',
];

const HIGHLIGHTER_COLORS = [
  '#facc15',
  '#4ade80',
  '#60a5fa',
  '#f472b6',
  '#fb923c',
  '#c084fc',
];

export const Inspector: React.FC<InspectorProps> = ({
  state,
  onUpdateState,
  onDeleteSelected,
  onDuplicateSelected,
  onOpenAiTextAssist,
}) => {
  const selectedEl = state.documentState.elements.find(
    (el) => el.id === state.selectedElementId
  );

  const activeTool = state.selectedTool;

  // Render when tool or selection requires inspector controls
  const showTextControls =
    activeTool === 'addText' || activeTool === 'editText' || selectedEl?.type === 'text';
  const showShapeControls = activeTool === 'shape' || selectedEl?.type === 'shape';
  const showDrawControls =
    activeTool === 'draw' || activeTool === 'highlighter' || selectedEl?.type === 'draw';
  const showGenericControls = Boolean(selectedEl);

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
      ? (selectedEl as TextElement).color || '#0f172a'
      : state.activeTextConfig.color || '#0f172a';

  const currentBgColor =
    selectedEl?.type === 'text'
      ? (selectedEl as TextElement).backgroundColor || 'transparent'
      : state.activeTextConfig.backgroundColor || 'transparent';

  const currentAlign =
    selectedEl?.type === 'text'
      ? (selectedEl as TextElement).align
      : state.activeTextConfig.align;

  return (
    <div className="inspector-container">
      <aside className="inspector-bar">
        {/* ---------------- Text Controls ---------------- */}
        {showTextControls && (
          <>
            {/* Font Quality Badge for Selected Text */}
            {selectedEl?.type === 'text' && (
              <div className="inspector-group font-badge-group">
                {(selectedEl as TextElement).isEmbeddedFont ? (
                  <span
                    className="font-quality-badge badge-original"
                    title="Rendered and exported using the document's original embedded font program."
                  >
                    ⭐ Original Font
                  </span>
                ) : (
                  <span
                    className="font-quality-badge badge-match"
                    title="Font matched to standard typography metrics and style descriptors."
                  >
                    ⚡ Closest Match
                  </span>
                )}
              </div>
            )}

            {/* Font Family Selector */}
            <div className="inspector-group">
              <span className="inspector-label">Font:</span>
              <select
                className="inspector-select font-family-select"
                value={currentFontFamily}
                onChange={(e) => {
                  const val = e.target.value;
                  const extracted = Object.values(
                    state.documentState.extractedFonts || {}
                  ).find(
                    (f) =>
                      f.cssFamily === val ||
                      f.name === val ||
                      f.id === val ||
                      f.cleanName === val
                  );

                  if (extracted) {
                    updateSelectedText({
                      fontFamily: extracted.cssFamily,
                      pdfFontKey: extracted.id,
                      isEmbeddedFont: extracted.isEmbedded,
                      embeddedFontId: extracted.id,
                      fontMatchQuality: extracted.isEmbedded ? 'original' : 'closest-match',
                    });
                  } else {
                    const selected = AVAILABLE_FONTS.find(
                      (f) => f.name === val || f.id === val
                    );
                    const fam = selected ? selected.name : val;
                    const pKey = selected ? selected.pdfKey : 'Helvetica';
                    updateSelectedText({
                      fontFamily: fam,
                      pdfFontKey: pKey,
                      isEmbeddedFont: false,
                      embeddedFontId: undefined,
                      fontMatchQuality: 'closest-match',
                    });
                  }
                }}
              >
                {state.documentState.extractedFonts &&
                  Object.keys(state.documentState.extractedFonts).length > 0 && (
                    <optgroup label="⭐ Document Embedded Fonts">
                      {Object.values(state.documentState.extractedFonts).map((font) => (
                        <option key={font.id} value={font.cssFamily}>
                          ⭐ {font.cleanName || font.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                <optgroup label="Standard / Web Fonts">
                  {AVAILABLE_FONTS.map((font) => (
                    <option key={font.id} value={font.name}>
                      {font.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="inspector-divider" />

            {/* Font Size with Step Buttons */}
            <div className="inspector-group">
              <span className="inspector-label">Size:</span>
              <div className="inspector-number-stepper">
                <button
                  className="inspector-btn-step"
                  onClick={() =>
                    updateSelectedText({ fontSize: Math.max(6, currentFontSize - 1) })
                  }
                  title="Decrease Font Size"
                >
                  <Minus size={12} />
                </button>
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
                <button
                  className="inspector-btn-step"
                  onClick={() =>
                    updateSelectedText({ fontSize: Math.min(144, currentFontSize + 1) })
                  }
                  title="Increase Font Size"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>

            <div className="inspector-divider" />

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

            <div className="inspector-divider" />

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

            <div className="inspector-divider" />

            {/* Text Color Swatches & Picker */}
            <div className="inspector-group color-section">
              <span className="inspector-label">Color:</span>
              <div className="color-palette-bar">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    className={`color-dot-btn ${
                      currentTextColor.toLowerCase() === c.hex.toLowerCase() ? 'active' : ''
                    }`}
                    style={{ backgroundColor: c.hex }}
                    onClick={() => updateSelectedText({ color: c.hex })}
                    title={`Text Color: ${c.label}`}
                  />
                ))}
                <div
                  className="color-swatch-btn custom-picker-btn"
                  style={{ backgroundColor: currentTextColor }}
                  title="Custom Text Color Picker"
                >
                  <input
                    type="color"
                    className="color-input-hidden"
                    value={
                      currentTextColor.startsWith('#') && currentTextColor.length === 7
                        ? currentTextColor
                        : '#0f172a'
                    }
                    onChange={(e) => updateSelectedText({ color: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="inspector-divider" />

            {/* Background / Highlight Swatches */}
            <div className="inspector-group color-section">
              <span className="inspector-label" title="Set background color or highlight behind text">
                Bg:
              </span>
              <div className="color-palette-bar bg-palette-bar">
                {BG_HIGHLIGHT_COLORS.map((bg) => (
                  <button
                    key={bg.hex}
                    type="button"
                    className={`color-dot-btn bg-dot-btn ${
                      currentBgColor.toLowerCase() === bg.hex.toLowerCase() ? 'active' : ''
                    }`}
                    style={{
                      backgroundColor: bg.hex === 'transparent' ? 'transparent' : bg.hex,
                      backgroundImage:
                        bg.hex === 'transparent'
                          ? 'linear-gradient(45deg, #ef4444 10%, transparent 10%, transparent 90%, #ef4444 90%)'
                          : 'none',
                    }}
                    onClick={() => updateSelectedText({ backgroundColor: bg.hex })}
                    title={`Background: ${bg.label}`}
                  />
                ))}
                <div
                  className="color-swatch-btn custom-picker-btn"
                  style={{
                    backgroundColor:
                      currentBgColor === 'transparent' ? '#ffffff' : currentBgColor,
                  }}
                  title="Custom Background Color Picker"
                >
                  <input
                    type="color"
                    className="color-input-hidden"
                    value={
                      currentBgColor.startsWith('#') && currentBgColor.length === 7
                        ? currentBgColor
                        : '#ffffff'
                    }
                    onChange={(e) => updateSelectedText({ backgroundColor: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* AI Text Assist Trigger */}
            {onOpenAiTextAssist && selectedEl?.type === 'text' && (
              <>
                <div className="inspector-divider" />
                <div className="inspector-group">
                  <button
                    className="btn-primary inspector-ai-btn"
                    onClick={onOpenAiTextAssist}
                    title="Use AI to rewrite, fix grammar, make concise, or change tone"
                  >
                    <Sparkles size={13} />
                    <span>AI Assist</span>
                  </button>
                </div>
              </>
            )}
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

            <div className="inspector-divider" />

            {/* Stroke Width */}
            <div className="inspector-group">
              <span className="inspector-label">Border:</span>
              <div className="inspector-number-stepper">
                <button
                  className="inspector-btn-step"
                  onClick={() => {
                    const curW =
                      selectedEl?.type === 'shape'
                        ? (selectedEl as ShapeElement).strokeWidth
                        : 2;
                    updateSelectedShape({ strokeWidth: Math.max(1, curW - 1) });
                  }}
                  title="Decrease Border Width"
                >
                  <Minus size={12} />
                </button>
                <input
                  type="number"
                  className="inspector-input-number"
                  min={0}
                  max={24}
                  value={
                    selectedEl?.type === 'shape'
                      ? (selectedEl as ShapeElement).strokeWidth
                      : 2
                  }
                  onChange={(e) => {
                    const w = parseInt(e.target.value, 10);
                    if (!isNaN(w)) updateSelectedShape({ strokeWidth: w });
                  }}
                />
                <button
                  className="inspector-btn-step"
                  onClick={() => {
                    const curW =
                      selectedEl?.type === 'shape'
                        ? (selectedEl as ShapeElement).strokeWidth
                        : 2;
                    updateSelectedShape({ strokeWidth: Math.min(24, curW + 1) });
                  }}
                  title="Increase Border Width"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>

            <div className="inspector-divider" />

            {/* Stroke Color */}
            <div className="inspector-group">
              <span className="inspector-label">Stroke:</span>
              <div className="color-palette-bar">
                {SHAPE_STROKE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`color-dot-btn ${
                      selectedEl?.type === 'shape' &&
                      (selectedEl as ShapeElement).strokeColor.toLowerCase() === c.toLowerCase()
                        ? 'active'
                        : ''
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => updateSelectedShape({ strokeColor: c })}
                  />
                ))}
                <div
                  className="color-swatch-btn custom-picker-btn"
                  style={{
                    backgroundColor:
                      selectedEl?.type === 'shape'
                        ? (selectedEl as ShapeElement).strokeColor
                        : '#2563eb',
                  }}
                  title="Custom Stroke Color"
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
            </div>

            <div className="inspector-divider" />

            {/* Fill Color */}
            <div className="inspector-group">
              <span className="inspector-label">Fill:</span>
              <select
                className="inspector-select"
                value={
                  selectedEl?.type === 'shape' &&
                  (selectedEl as ShapeElement).fillColor !== 'transparent'
                    ? 'custom'
                    : 'transparent'
                }
                onChange={(e) => {
                  if (e.target.value === 'transparent') {
                    updateSelectedShape({ fillColor: 'transparent' });
                  } else {
                    updateSelectedShape({ fillColor: 'rgba(99, 102, 241, 0.2)' });
                  }
                }}
              >
                <option value="transparent">Transparent</option>
                <option value="custom">Filled Color</option>
              </select>

              {selectedEl?.type === 'shape' &&
                (selectedEl as ShapeElement).fillColor !== 'transparent' && (
                  <div
                    className="color-swatch-btn custom-picker-btn"
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
                {activeTool === 'highlighter' ? 'Highlighter:' : 'Pen:'}
              </span>
              <div className="color-palette-bar">
                {(activeTool === 'highlighter' ? HIGHLIGHTER_COLORS : PEN_COLORS).map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`color-dot-btn ${
                      (activeTool === 'highlighter'
                        ? state.activeDrawConfig.highlighterColor
                        : state.activeDrawConfig.strokeColor
                      ).toLowerCase() === c.toLowerCase()
                        ? 'active'
                        : ''
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => {
                      onUpdateState((prev) => ({
                        ...prev,
                        activeDrawConfig: {
                          ...prev.activeDrawConfig,
                          ...(activeTool === 'highlighter'
                            ? { highlighterColor: c }
                            : { strokeColor: c }),
                        },
                      }));
                    }}
                  />
                ))}
                <div
                  className="color-swatch-btn custom-picker-btn"
                  style={{
                    backgroundColor:
                      activeTool === 'highlighter'
                        ? state.activeDrawConfig.highlighterColor
                        : state.activeDrawConfig.strokeColor,
                  }}
                  title="Custom Drawing Color"
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
            </div>

            <div className="inspector-divider" />

            <div className="inspector-group">
              <span className="inspector-label">Thickness:</span>
              <div className="inspector-number-stepper">
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
                <span style={{ color: 'var(--text-muted)', fontSize: '11px', paddingRight: '4px' }}>
                  px
                </span>
              </div>
            </div>
          </>
        )}

        {/* ---------------- Generic Selected Element Actions ---------------- */}
        {selectedEl && (
          <>
            <div className="inspector-divider" />
            <div className="inspector-group" style={{ marginLeft: 'auto' }}>
              <button
                type="button"
                className="inspector-done-btn"
                onClick={() =>
                  onUpdateState((prev) => ({ ...prev, selectedElementId: null }))
                }
                title="Finish Editing (Done)"
              >
                <Check size={14} strokeWidth={2.5} />
                <span>DONE</span>
              </button>
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
          </>
        )}
      </aside>
    </div>
  );
};
