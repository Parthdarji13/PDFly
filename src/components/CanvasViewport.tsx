'use client';

import React, { useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PageCard } from './PageCard';
import { AppState } from '../lib/state/store';
import { EditorElement } from '../lib/types';

interface CanvasViewportProps {
  state: AppState;
  pdfDocProxy: pdfjsLib.PDFDocumentProxy | null;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
  onAddElement: (element: EditorElement, actionDesc?: string) => void;
  onUpdateElement: (id: string, updates: Partial<EditorElement>) => void;
  onSelectElement: (id: string | null) => void;
  onLoadSample?: (sampleType: 'invoice' | 'resume' | 'contract' | 'blank') => void;
}

export const CanvasViewport: React.FC<CanvasViewportProps> = ({
  state,
  pdfDocProxy,
  onUpdateState,
  onAddElement,
  onUpdateElement,
  onSelectElement,
  onLoadSample,
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
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

          {onLoadSample && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '8px' }}>
              <button
                className="btn-secondary"
                onClick={() => onLoadSample('invoice')}
                style={{ borderRadius: 'var(--radius-full)' }}
              >
                📄 Business Invoice
              </button>
              <button
                className="btn-secondary"
                onClick={() => onLoadSample('resume')}
                style={{ borderRadius: 'var(--radius-full)' }}
              >
                👤 Executive Resume
              </button>
              <button
                className="btn-secondary"
                onClick={() => onLoadSample('contract')}
                style={{ borderRadius: 'var(--radius-full)' }}
              >
                ⚖️ Legal NDA
              </button>
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
