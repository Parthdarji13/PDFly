'use client';

import React from 'react';
import {
  MousePointer2,
  Edit3,
  Type,
  PenTool,
  Highlighter,
  Square,
  PenLine,
  Image as ImageIcon,
  Stamp,
  Eraser,
} from 'lucide-react';
import { ToolType } from '../lib/types';
import { AppState } from '../lib/state/store';

interface ToolRibbonProps {
  state: AppState;
  onSelectTool: (tool: ToolType) => void;
  onOpenSignatureModal: () => void;
  onOpenStampPicker: () => void;
  onUploadImage: () => void;
}

export const ToolRibbon: React.FC<ToolRibbonProps> = ({
  state,
  onSelectTool,
  onOpenSignatureModal,
  onOpenStampPicker,
  onUploadImage,
}) => {
  const currentTool = state.selectedTool;

  return (
    <div className="tool-ribbon-container">
      <nav className="tool-ribbon">
        {/* Select Tool */}
        <button
          className={`tool-btn ${currentTool === 'select' ? 'active' : ''}`}
          onClick={() => onSelectTool('select')}
          title="Select & Move Elements (V)"
        >
          <MousePointer2 size={15} />
          <span>Select</span>
          <span className="shortcut-badge">V</span>
        </button>

        {/* In-Place Edit Text Tool (Key Feature) */}
        <button
          className={`tool-btn highlight-feature ${currentTool === 'editText' ? 'active' : ''}`}
          onClick={() => onSelectTool('editText')}
          title="Edit Original PDF Text with Auto Font Matching (E)"
        >
          <Edit3 size={15} />
          <span>Edit Text</span>
          <span className="shortcut-badge">E</span>
        </button>

        {/* Add Text Tool */}
        <button
          className={`tool-btn ${currentTool === 'addText' ? 'active' : ''}`}
          onClick={() => onSelectTool('addText')}
          title="Add New Text Box (T)"
        >
          <Type size={15} />
          <span>Add Text</span>
          <span className="shortcut-badge">T</span>
        </button>

        {/* Freehand Pen Tool */}
        <button
          className={`tool-btn ${currentTool === 'draw' ? 'active' : ''}`}
          onClick={() => onSelectTool('draw')}
          title="Freehand Pen / Annotation (P)"
        >
          <PenTool size={15} />
          <span>Draw</span>
          <span className="shortcut-badge">P</span>
        </button>

        {/* Highlighter Tool */}
        <button
          className={`tool-btn ${currentTool === 'highlighter' ? 'active' : ''}`}
          onClick={() => onSelectTool('highlighter')}
          title="Highlighter (H)"
        >
          <Highlighter size={15} />
          <span>Highlight</span>
          <span className="shortcut-badge">H</span>
        </button>

        {/* Shapes Tool */}
        <button
          className={`tool-btn ${currentTool === 'shape' ? 'active' : ''}`}
          onClick={() => onSelectTool('shape')}
          title="Add Vector Shapes (S)"
        >
          <Square size={15} />
          <span>Shapes</span>
          <span className="shortcut-badge">S</span>
        </button>

        {/* Digital Signature Studio */}
        <button
          className={`tool-btn ${currentTool === 'signature' ? 'active' : ''}`}
          onClick={onOpenSignatureModal}
          title="Sign Document (Draw, Type Cursive, Upload)"
        >
          <PenLine size={15} />
          <span>Signature</span>
        </button>

        {/* Upload Image */}
        <button
          className={`tool-btn ${currentTool === 'image' ? 'active' : ''}`}
          onClick={onUploadImage}
          title="Insert Image / Logo (I)"
        >
          <ImageIcon size={15} />
          <span>Image</span>
          <span className="shortcut-badge">I</span>
        </button>

        {/* Stamp Picker */}
        <button
          className="tool-btn"
          onClick={onOpenStampPicker}
          title="Add Stamp (Approved, Confidential, Paid, Void...)"
        >
          <Stamp size={15} />
          <span>Stamps</span>
        </button>

        {/* Whiteout / Redact Tool */}
        <button
          className={`tool-btn ${currentTool === 'redact' ? 'active' : ''}`}
          onClick={() => onSelectTool('redact')}
          title="Whiteout / Blackout Redaction (W)"
        >
          <Eraser size={15} />
          <span>Whiteout</span>
          <span className="shortcut-badge">W</span>
        </button>
      </nav>
    </div>
  );
};
