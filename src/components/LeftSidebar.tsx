'use client';

import React from 'react';
import {
  Layers,
  FileText,
  Info,
  History,
  RotateCw,
  Trash2,
  Copy,
  Plus,
  Type,
  Square,
  PenTool,
  PenLine,
  Image as ImageIcon,
  Eraser,
  CheckCircle2,
  FolderOpen,
  Upload,
  Sparkles,
  MessageSquare,
  Brain,
} from 'lucide-react';
import { AppState } from '../lib/state/store';
import { EditorElement } from '../lib/types';

interface LeftSidebarProps {
  state: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
  onSelectPage: (index: number) => void;
  onRotatePage: (pageIndex: number) => void;
  onDeletePage: (pageIndex: number) => void;
  onDuplicatePage: (pageIndex: number) => void;
  onAddBlankPage: () => void;
  onOpenFile?: (file: File) => void;
  onOpenAiChat?: () => void;
  onOpenAiSummarize?: () => void;
  onOpenAiInsights?: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  state,
  onUpdateState,
  onSelectPage,
  onRotatePage,
  onDeletePage,
  onDuplicatePage,
  onAddBlankPage,
  onOpenFile,
  onOpenAiChat,
  onOpenAiSummarize,
  onOpenAiInsights,
}) => {
  const currentTab = state.sidebarTab;
  const pages = state.documentState.pages;
  const elements = state.documentState.elements.filter(
    (el) => el.pageIndex === state.activePageIndex
  );

  const getElementIcon = (type: EditorElement['type']) => {
    switch (type) {
      case 'text':
        return <Type size={14} />;
      case 'shape':
        return <Square size={14} />;
      case 'draw':
        return <PenTool size={14} />;
      case 'signature':
        return <PenLine size={14} />;
      case 'image':
        return <ImageIcon size={14} />;
      case 'redact':
        return <Eraser size={14} />;
      default:
        return <FileText size={14} />;
    }
  };

  const getElementLabel = (el: EditorElement): string => {
    switch (el.type) {
      case 'text': {
        const txt = el.text || '';
        return txt.length > 20 ? `${txt.substring(0, 20)}...` : txt || 'Text element';
      }
      case 'shape':
        return `Shape (${el.shapeType || 'box'})`;
      case 'signature':
        return 'Digital Signature';
      case 'draw':
        return el.isHighlighter ? 'Highlighter mark' : 'Pen drawing';
      case 'image':
        return el.isStamp ? `Stamp: ${el.stampTitle || 'Custom'}` : 'Image';
      case 'redact':
        return el.redactType === 'blackout' ? 'Blackout Redact' : 'Whiteout Patch';
      default:
        return 'Element';
    }
  };

  return (
    <aside className={`left-sidebar ${!state.isSidebarOpen ? 'collapsed' : ''}`}>
      {/* Sidebar Tabs */}
      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab-btn ${currentTab === 'pages' ? 'active' : ''}`}
          onClick={() => onUpdateState((prev) => ({ ...prev, sidebarTab: 'pages' }))}
          title="Pages & Thumbnails"
        >
          <FileText size={14} />
          <span>Pages</span>
        </button>
        <button
          className={`sidebar-tab-btn ${currentTab === 'layers' ? 'active' : ''}`}
          onClick={() => onUpdateState((prev) => ({ ...prev, sidebarTab: 'layers' }))}
          title="Layers on Current Page"
        >
          <Layers size={14} />
          <span>Layers ({elements.length})</span>
        </button>
        <button
          className={`sidebar-tab-btn ${currentTab === 'info' ? 'active' : ''}`}
          onClick={() => onUpdateState((prev) => ({ ...prev, sidebarTab: 'info' }))}
          title="Document Metadata & Fonts"
        >
          <Info size={14} />
          <span>Info</span>
        </button>
        <button
          className={`sidebar-tab-btn ${currentTab === 'history' ? 'active' : ''}`}
          onClick={() => onUpdateState((prev) => ({ ...prev, sidebarTab: 'history' }))}
          title="Edit History Stack"
        >
          <History size={14} />
          <span>History</span>
        </button>
        <button
          className={`sidebar-tab-btn ${currentTab === 'ai' ? 'active' : ''}`}
          onClick={() => onUpdateState((prev) => ({ ...prev, sidebarTab: 'ai' }))}
          title="Claude AI Assistant Tools"
          style={{ color: 'var(--accent-primary)' }}
        >
          <Sparkles size={14} />
          <span>AI Tools</span>
        </button>
      </div>

      {/* Sidebar Content */}
      <div className="sidebar-content">
        {/* ================= Tab: Pages ================= */}
        {currentTab === 'pages' && (
          <>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
              <button
                className="btn-secondary"
                style={{ flex: 1, justifyContent: 'center', fontSize: '12px', padding: '6px 4px' }}
                onClick={onAddBlankPage}
                title="Add a new blank page"
              >
                <Plus size={14} />
                <span>Blank Page</span>
              </button>
              <button
                className="btn-primary"
                style={{ flex: 1, justifyContent: 'center', fontSize: '12px', padding: '6px 4px', background: 'var(--grad-primary)', color: '#ffffff' }}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'application/pdf,.pdf';
                  input.onchange = (e: any) => {
                    const f = e.target?.files?.[0];
                    if (f && onOpenFile) onOpenFile(f);
                  };
                  input.click();
                }}
                title="Open or Add your PDF file"
              >
                <FolderOpen size={14} />
                <span>Add your PDF</span>
              </button>
            </div>

            {pages.map((page, idx) => (
              <div
                key={`thumb-${page.pageIndex}-${idx}`}
                className={`thumbnail-card ${state.activePageIndex === idx ? 'active' : ''}`}
                onClick={() => onSelectPage(idx)}
              >
                <div className="thumbnail-preview-box">
                  {page.thumbnailUrl ? (
                    <img
                      src={page.thumbnailUrl}
                      alt={`Page ${idx + 1}`}
                      className="thumbnail-img"
                    />
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <FileText size={28} />
                      <span style={{ fontSize: '11px', marginTop: '4px' }}>Page {idx + 1}</span>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '0 4px',
                  }}
                >
                  <span className="thumbnail-label">Page {idx + 1}</span>
                  <div className="thumbnail-actions">
                    <button
                      className="thumbnail-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRotatePage(idx);
                      }}
                      title="Rotate 90° Clockwise"
                    >
                      <RotateCw size={13} />
                    </button>
                    <button
                      className="thumbnail-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicatePage(idx);
                      }}
                      title="Duplicate Page"
                    >
                      <Copy size={13} />
                    </button>
                    {pages.length > 1 && (
                      <button
                        className="thumbnail-action-btn"
                        style={{ color: 'var(--accent-danger)' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePage(idx);
                        }}
                        title="Delete Page"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ================= Tab: Layers ================= */}
        {currentTab === 'layers' && (
          <>
            {elements.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '30px 10px',
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                }}
              >
                <Layers size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                <p>No added elements on Page {state.activePageIndex + 1}</p>
                <p style={{ fontSize: '11px', marginTop: '4px' }}>
                  Add text, shapes, or drawings using the top tools.
                </p>
              </div>
            ) : (
              elements.map((el) => (
                <div
                  key={el.id}
                  className={`layer-item ${state.selectedElementId === el.id ? 'active' : ''}`}
                  onClick={() =>
                    onUpdateState((prev) => ({
                      ...prev,
                      selectedElementId: el.id,
                      selectedTool: 'select',
                    }))
                  }
                >
                  <div className="layer-info">
                    {getElementIcon(el.type)}
                    <span className="layer-title">{getElementLabel(el)}</span>
                  </div>

                  <button
                    className="thumbnail-action-btn"
                    style={{ color: 'var(--accent-danger)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateState((prev) => ({
                        ...prev,
                        documentState: {
                          ...prev.documentState,
                          elements: prev.documentState.elements.filter((item) => item.id !== el.id),
                        },
                        selectedElementId:
                          prev.selectedElementId === el.id ? null : prev.selectedElementId,
                      }));
                    }}
                    title="Delete layer"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </>
        )}

        {/* ================= Tab: Document Info ================= */}
        {currentTab === 'info' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
            <div
              style={{
                padding: '12px',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>
                Document Properties
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>File Name:</span>
                  <div style={{ fontWeight: '600' }}>{state.documentState.fileName}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Pages:</span>
                  <div style={{ fontWeight: '600' }}>{state.documentState.pageCount}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Page Size:</span>
                  <div style={{ fontWeight: '600' }}>
                    {Math.round(pages[state.activePageIndex]?.width || 595)} x{' '}
                    {Math.round(pages[state.activePageIndex]?.height || 842)} pt
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Active Elements:</span>
                  <div style={{ fontWeight: '600' }}>{state.documentState.elements.length}</div>
                </div>
              </div>
            </div>

            {/* Document Fonts Section */}
            <div
              style={{
                padding: '12px',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '700' }}>Detected Typography</h4>
                <span
                  style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(99, 102, 241, 0.15)',
                    color: 'var(--accent-primary)',
                    fontWeight: '600',
                  }}
                >
                  {Object.keys(state.documentState.extractedFonts || {}).length} Fonts
                </span>
              </div>

              {Object.keys(state.documentState.extractedFonts || {}).length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                  No custom fonts detected in this document.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                  {Object.values(state.documentState.extractedFonts).map((font) => (
                    <div
                      key={font.id}
                      style={{
                        padding: '8px',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '11px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '3px',
                        }}
                      >
                        <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                          {font.cleanName || font.name}
                        </span>
                        {font.isEmbedded ? (
                          <span
                            style={{
                              fontSize: '9.5px',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(16, 185, 129, 0.15)',
                              color: '#10b981',
                              fontWeight: '600',
                            }}
                          >
                            ⭐ Original ({Math.round((font.data?.length || 0) / 1024)} KB)
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '9.5px',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(245, 158, 11, 0.15)',
                              color: '#f59e0b',
                              fontWeight: '600',
                            }}
                          >
                            ⚡ Closest Match
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          color: 'var(--text-muted)',
                          fontSize: '10px',
                          display: 'flex',
                          gap: '8px',
                        }}
                      >
                        <span>Category: {font.category}</span>
                        {font.isBold && <span>Bold</span>}
                        {font.isItalic && <span>Italic</span>}
                      </div>

                      {/* Live Font Sample */}
                      <div
                        style={{
                          marginTop: '4px',
                          padding: '4px 6px',
                          backgroundColor: 'var(--bg-tertiary)',
                          borderRadius: '4px',
                          fontFamily: font.cssFamily,
                          fontSize: '12px',
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Sphinx of black quartz, judge my vow. 12345
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              style={{
                padding: '12px',
                backgroundColor: 'rgba(99, 102, 241, 0.08)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--accent-primary)',
                  fontWeight: '600',
                  marginBottom: '4px',
                }}
              >
                <CheckCircle2 size={15} />
                <span>Original Font Engine Active</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '11px', lineHeight: '1.4' }}>
                Embedded TrueType/OpenType font programs are extracted and registered directly into the browser&apos;s <code>FontFace</code> subsystem. In-place edits render with exact typography and export with embedded font programs.
              </p>
            </div>
          </div>
        )}

        {/* ================= Tab: History ================= */}
        {currentTab === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {state.historyStack.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                No recent actions yet
              </div>
            ) : (
              state.historyStack.map((entry, idx) => (
                <div
                  key={`hist-${idx}`}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor:
                      state.historyIndex === idx ? 'var(--bg-active)' : 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ fontWeight: '600' }}>{entry.description}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ================= Tab: AI Tools ================= */}
        {currentTab === 'ai' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div
              style={{
                padding: '12px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(168, 85, 247, 0.12))',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', fontSize: '13px', color: 'var(--accent-primary)', marginBottom: '4px' }}>
                <Sparkles size={16} />
                <span>PDFly AI Assistant</span>
              </div>
              <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                Instant document intelligence, Q&A, synthesis, and writing assistance.
              </p>
            </div>

            {/* Quick Action 1: Chat with PDF */}
            <button
              className="btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: '8px',
                padding: '10px 12px',
                textAlign: 'left',
              }}
              onClick={onOpenAiChat}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                <MessageSquare size={15} />
              </div>
              <div>
                <div style={{ fontWeight: '600', fontSize: '12.5px' }}>Chat with Document</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ask questions & citations</div>
              </div>
            </button>

            {/* Quick Action 2: Summarize PDF */}
            <button
              className="btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: '8px',
                padding: '10px 12px',
                textAlign: 'left',
              }}
              onClick={onOpenAiSummarize}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #ec4899, #f43f5e)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                <Sparkles size={15} />
              </div>
              <div>
                <div style={{ fontWeight: '600', fontSize: '12.5px' }}>Auto-Summarize</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Executive takeaways & bullets</div>
              </div>
            </button>

            {/* Quick Action 3: Document Insights */}
            <button
              className="btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: '8px',
                padding: '10px 12px',
                textAlign: 'left',
              }}
              onClick={onOpenAiInsights}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #06b6d4, #0284c7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                <Brain size={15} />
              </div>
              <div>
                <div style={{ fontWeight: '600', fontSize: '12.5px' }}>Extract Data & Insights</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Entities, dates, amounts & tables</div>
              </div>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
