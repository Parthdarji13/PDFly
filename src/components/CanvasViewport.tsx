'use client';

import React, { useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { PageCard } from './PageCard';
import { AppState } from '../lib/state/store';
import { EditorElement } from '../lib/types';

interface CanvasViewportProps {
  state: AppState;
  pdfDocProxy: PDFDocumentProxy | null;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
  onAddElement: (element: EditorElement, actionDesc?: string) => void;
  onUpdateElement: (id: string, updates: Partial<EditorElement>) => void;
  onSelectElement: (id: string | null) => void;
  onOpenFile?: (file: File) => void;
  onLoadSample?: (sampleType: 'invoice' | 'resume' | 'contract' | 'certificate' | 'proposal' | 'letter' | 'blank') => void;
}

export const CanvasViewport: React.FC<CanvasViewportProps> = ({
  state,
  pdfDocProxy,
  onUpdateState,
  onAddElement,
  onUpdateElement,
  onSelectElement,
  onOpenFile,
  onLoadSample,
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const emptyFileInputRef = useRef<HTMLInputElement>(null);
  const pages = state.documentState.pages;

  const setZoom = (newZoom: number) => {
    const clamped = Math.max(0.4, Math.min(3.0, Math.round(newZoom * 10) / 10));
    onUpdateState((prev) => ({ ...prev, zoom: clamped }));
  };

  return (
    <main
      ref={viewportRef}
      className={`canvas-viewport tool-${state.selectedTool}`}
      onClick={(e) => {
        // If clicked directly on canvas background, deselect element
        if (e.target === viewportRef.current) {
          onSelectElement(null);
        }
      }}
    >
      <input
        type="file"
        ref={emptyFileInputRef}
        accept="application/pdf,.pdf"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && onOpenFile) {
            onOpenFile(file);
          }
          e.target.value = '';
        }}
      />

      {pages.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            maxWidth: '520px',
            margin: 'auto',
            textAlign: 'center',
            padding: '40px 24px',
            background: 'var(--bg-glass-heavy)',
            backdropFilter: 'blur(24px)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-xl)',
            gap: '18px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--grad-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '28px',
              boxShadow: '0 0 24px rgba(99, 102, 241, 0.5)',
            }}
          >
            ⚡
          </div>
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '22px',
                fontWeight: '800',
                letterSpacing: '-0.02em',
                marginBottom: '6px',
              }}
            >
              Welcome to PDFly Studio
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Edit existing PDF text with font matching, sign documents, draw annotations, insert shapes, and reorder pages.
            </p>
          </div>

          {onOpenFile && (
            <button
              className="btn-primary"
              onClick={() => emptyFileInputRef.current?.click()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '11px 24px',
                fontSize: '14px',
                fontWeight: '700',
                borderRadius: 'var(--radius-full)',
                boxShadow: '0 4px 16px rgba(99, 102, 241, 0.35)',
              }}
            >
              <span>📁 Choose PDF Document</span>
            </button>
          )}

          {onLoadSample && (
            <div style={{ marginTop: '6px', width: '100%', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                Or start with a template:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                <button
                  className="btn-secondary"
                  onClick={() => onLoadSample('invoice')}
                  style={{ borderRadius: 'var(--radius-full)', fontSize: '12.5px' }}
                >
                  📄 Invoice
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => onLoadSample('resume')}
                  style={{ borderRadius: 'var(--radius-full)', fontSize: '12.5px' }}
                >
                  👤 Resume
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => onLoadSample('contract')}
                  style={{ borderRadius: 'var(--radius-full)', fontSize: '12.5px' }}
                >
                  ⚖️ NDA
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => onLoadSample('certificate')}
                  style={{ borderRadius: 'var(--radius-full)', fontSize: '12.5px' }}
                >
                  🏆 Award
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        pages.map((page, idx) => (
          <PageCard
            key={`page-${page.pageIndex}-${idx}`}
            page={page}
            pageIndex={idx}
            pdfDocProxy={pdfDocProxy}
            state={state}
            onUpdateState={onUpdateState}
            onAddElement={onAddElement}
            onUpdateElement={onUpdateElement}
            onSelectElement={onSelectElement}
          />
        ))
      )}
    </main>
  );
};
