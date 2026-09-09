'use client';

import React, { useState } from 'react';
import { X, Download, FileCheck, Sparkles, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import { AppState } from '../../lib/state/store';
import { exportModifiedPDF, downloadPdfBlob } from '../../lib/pdf/pdfExporter';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  onShowToast: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  state,
  onShowToast,
}) => {
  const [fileName, setFileName] = useState(
    state.documentState.fileName.endsWith('.pdf')
      ? state.documentState.fileName
      : `${state.documentState.fileName}.pdf`
  );
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleDownload = async () => {
    try {
      setIsExporting(true);
      const pdfBytes = await exportModifiedPDF(state.documentState);
      downloadPdfBlob(pdfBytes, fileName);

      // Trigger celebratory confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      onShowToast('PDF successfully exported with matching fonts!', 'success');
      setIsExporting(false);
      onClose();
    } catch (err: any) {
      console.error('Export error:', err);
      setIsExporting(false);
      onShowToast(`Failed to export PDF: ${err.message || 'Unknown error'}`, 'error');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 className="modal-title">Export & Download PDF</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* File Name Input */}
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Save File Name:
            </label>
            <input
              type="text"
              className="inspector-select"
              style={{ width: '100%', padding: '10px 14px', fontSize: '14px' }}
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="document-edited.pdf"
            />
          </div>

          {/* Export Format Card */}
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-lg)',
              border: '2px solid var(--accent-primary)',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
            }}
          >
            <FileCheck size={28} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '4px' }}>
                High-Fidelity Vector PDF (Standard & Embedded Fonts)
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                Retains 100% vector sharpness, searchable & selectable text, accurate font embeddings, and background patching matching the original document typography.
              </p>
            </div>
          </div>

          {/* Document Summary Stats */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              textAlign: 'center',
            }}
          >
            <div style={{ padding: '10px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '18px', fontWeight: '700' }}>
                {state.documentState.pageCount}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Pages</div>
            </div>
            <div style={{ padding: '10px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '18px', fontWeight: '700' }}>
                {state.documentState.elements.length}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Edited Elements</div>
            </div>
            <div style={{ padding: '10px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--accent-success)' }}>
                100%
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Client-Side Private</div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={isExporting}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleDownload} disabled={isExporting}>
            <Download size={16} />
            <span>{isExporting ? 'Generating PDF...' : 'Download PDF Now'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
