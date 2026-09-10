'use client';

import React, { useRef } from 'react';
import {
  FileText,
  Upload,
  FolderOpen,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sun,
  Moon,
  Download,
  Search,
  Layers,
  FilePlus,
  Sparkles,
  PanelLeft,
  Home,
  Grid,
  Bot,
  MessageSquare,
  Brain,
} from 'lucide-react';
import { AppState } from '../lib/state/store';

interface TopNavProps {
  state: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
  onOpenFile: (file: File) => void;
  onLoadSample: (sampleType: 'invoice' | 'resume' | 'contract' | 'certificate' | 'proposal' | 'letter' | 'blank') => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onExportPdf: () => void;
  onNavigateHome?: () => void;
  onOpenToolModal?: (tool: string) => void;
  onOpenAiChat?: () => void;
  onOpenAiSummarize?: () => void;
  onOpenAiInsights?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  state,
  onUpdateState,
  onOpenFile,
  onLoadSample,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onExportPdf,
  onNavigateHome,
  onOpenToolModal,
  onOpenAiChat,
  onOpenAiSummarize,
  onOpenAiInsights,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onOpenFile(file);
    }
  };

  const setZoom = (newZoom: number) => {
    const clamped = Math.max(0.4, Math.min(3.0, Math.round(newZoom * 10) / 10));
    onUpdateState((prev) => ({ ...prev, zoom: clamped }));
  };

  const toggleTheme = () => {
    const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    onUpdateState((prev) => ({ ...prev, theme: nextTheme }));
  };

  return (
    <header className="top-nav">
      {/* Brand & File Info */}
      <div className="brand-section">
        {onNavigateHome && (
          <button
            className="nav-btn"
            onClick={onNavigateHome}
            title="Return to Home & Tools"
            style={{ marginRight: '2px' }}
          >
            <Home size={17} />
          </button>
        )}
        <button
          className="nav-btn"
          onClick={() => onUpdateState((prev) => ({ ...prev, isSidebarOpen: !prev.isSidebarOpen }))}
          title={state.isSidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
          style={{ marginRight: '2px' }}
        >
          <PanelLeft size={18} />
        </button>
        <div
          className="brand-logo"
          title="PDFly — Return to Home"
          onClick={onNavigateHome}
          style={{ cursor: onNavigateHome ? 'pointer' : 'default' }}
        >
          <Sparkles size={18} />
        </div>
        <div className="brand-meta">
          <div
            className="brand-title-wrap"
            onClick={onNavigateHome}
            style={{ cursor: onNavigateHome ? 'pointer' : 'default' }}
          >
            <span className="brand-title">PDFly</span>
            <span className="brand-badge">PRO</span>
          </div>
          <input
            type="text"
            className="doc-name-input"
            value={state.documentState.fileName}
            onChange={(e) => {
              const val = e.target.value;
              onUpdateState((prev) => ({
                ...prev,
                documentState: { ...prev.documentState, fileName: val },
              }));
            }}
            title="Click to rename document"
          />
        </div>
      </div>

      {/* File Actions & Templates */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <input
          type="file"
          ref={fileInputRef}
          accept="application/pdf"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <button
          className="btn-secondary"
          onClick={() => fileInputRef.current?.click()}
          title="Open PDF from your computer"
        >
          <FolderOpen size={15} />
          <span className="nav-btn-text">Open PDF</span>
        </button>

        {/* Sample PDFs Dropdown */}
        <select
          className="btn-secondary sample-select-btn"
          style={{ cursor: 'pointer', paddingRight: '20px' }}
          onChange={(e) => {
            if (e.target.value) {
              onLoadSample(e.target.value as any);
              e.target.value = '';
            }
          }}
          defaultValue=""
          title="Load pre-made editable sample templates"
        >
          <option value="" disabled>
            ✨ Templates...
          </option>
          <option value="invoice">📄 Business Invoice</option>
          <option value="resume">👤 Executive Resume</option>
          <option value="contract">⚖️ Legal Agreement (NDA)</option>
          <option value="certificate">🏆 Award Certificate</option>
          <option value="proposal">📊 Project Proposal</option>
          <option value="letter">✉️ Business Letter</option>
          <option value="blank">➕ Blank Canvas</option>
        </select>
      </div>

      {/* Center Viewport & History Controls */}
      <div className="nav-center-actions">
        <button
          className="nav-btn"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={16} />
        </button>
        <button
          className="nav-btn"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 size={16} />
        </button>

        <div className="nav-divider hide-on-mobile" />

        {/* Zoom Controls */}
        <button
          className="nav-btn hide-on-mobile"
          onClick={() => setZoom(state.zoom - 0.15)}
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
        <span className="zoom-indicator hide-on-mobile" style={{ fontSize: '12px', fontWeight: '600', padding: '0 4px', color: 'var(--text-secondary)' }}>
          {Math.round(state.zoom * 100)}%
        </span>
        <button
          className="nav-btn hide-on-mobile"
          onClick={() => setZoom(state.zoom + 0.15)}
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
        <button
          className="nav-btn hide-on-mobile"
          onClick={() => setZoom(1.0)}
          title="Reset Zoom (100%)"
        >
          <Maximize2 size={14} />
        </button>

        <div className="nav-divider" />

        {/* Page Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)', padding: '0 4px' }}>
          <span className="hide-on-mobile">Page</span>
          <input
            type="number"
            style={{ width: '32px', textAlign: 'center', padding: '2px 0', fontSize: '12px', fontWeight: '600' }}
            min={1}
            max={Math.max(1, state.documentState.pageCount)}
            value={state.activePageIndex + 1}
            onChange={(e) => {
              const p = parseInt(e.target.value, 10);
              if (!isNaN(p) && p >= 1 && p <= state.documentState.pageCount) {
                onUpdateState((prev) => ({ ...prev, activePageIndex: p - 1 }));
              }
            }}
          />
          <span>/ {state.documentState.pageCount}</span>
        </div>
      </div>

      {/* Right Utility & Export Actions */}
      <div className="nav-actions">
        {/* AI Chat Drawer Trigger */}
        {onOpenAiChat && (
          <button
            className="btn-primary"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              padding: '6px 12px',
              gap: '5px',
            }}
            onClick={onOpenAiChat}
            title="Chat with your PDF using Claude AI"
          >
            <MessageSquare size={14} />
            <span className="nav-btn-text">AI Chat</span>
          </button>
        )}

        {/* AI Summarize Trigger */}
        {onOpenAiSummarize && (
          <button
            className="btn-secondary hide-on-mobile"
            onClick={onOpenAiSummarize}
            title="Generate AI Executive Summary"
          >
            <Sparkles size={14} style={{ color: 'var(--accent-primary)' }} />
            <span className="nav-btn-text">Summary</span>
          </button>
        )}

        {/* AI Insights Trigger */}
        {onOpenAiInsights && (
          <button
            className="btn-secondary hide-on-mobile"
            onClick={onOpenAiInsights}
            title="Extract Structured Data & Insights"
          >
            <Brain size={14} style={{ color: '#06b6d4' }} />
            <span className="nav-btn-text">Insights</span>
          </button>
        )}

        <div className="nav-divider hide-on-mobile" />

        {/* Search & Replace Trigger */}
        <button
          className="btn-secondary"
          onClick={() => onUpdateState((prev) => ({ ...prev, isSearchModalOpen: true }))}
          title="Search and Replace Text across PDF"
        >
          <Search size={15} />
          <span className="nav-btn-text">Find / Replace</span>
        </button>

        {/* Page Organizer Trigger */}
        <button
          className="btn-secondary"
          onClick={() => onUpdateState((prev) => ({ ...prev, isOrganizerModalOpen: true }))}
          title="Organize, Reorder & Rotate Pages"
        >
          <Layers size={15} />
          <span className="nav-btn-text">Pages ({state.documentState.pageCount})</span>
        </button>

        {/* Dark/Light Theme Toggle */}
        <button
          className="nav-btn"
          onClick={toggleTheme}
          title={state.theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {state.theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Download PDF Trigger */}
        <button
          className="btn-primary"
          onClick={onExportPdf}
          title="Download edited PDF with matching embedded fonts"
        >
          <Download size={15} />
          <span className="export-btn-text">Download PDF</span>
        </button>
      </div>
    </header>
  );
};
