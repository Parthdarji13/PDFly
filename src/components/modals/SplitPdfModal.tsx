'use client';

import React, { useState } from 'react';
import { X, Scissors, Upload, Download, FileText, Check } from 'lucide-react';
import { splitPdf } from '../../lib/pdf/pdfTools';
import { downloadPdfBlob } from '../../lib/pdf/pdfExporter';

interface SplitPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

export const SplitPdfModal: React.FC<SplitPdfModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [rangeStr, setRangeStr] = useState('1');
  const [splitMode, setSplitMode] = useState<'ranges' | 'all'>('ranges');
  const [isSplitting, setIsSplitting] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleSplit = async () => {
    if (!file) {
      onShowToast('Please select a PDF file first', 'warning');
      return;
    }

    try {
      setIsSplitting(true);
      const parts = await splitPdf(file, splitMode === 'all' ? '' : rangeStr);

      parts.forEach((part) => {
        downloadPdfBlob(part.bytes, part.fileName);
      });

      onShowToast(`Extracted ${parts.length} PDF file(s) successfully!`, 'success');
      setIsSplitting(false);
      onClose();
    } catch (err: any) {
      console.error('Split error:', err);
      setIsSplitting(false);
      onShowToast(`Split failed: ${err.message || 'Unknown error'}`, 'error');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Scissors size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 className="modal-title">Split PDF Document</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {!file ? (
            <label
              style={{
                border: '2px dashed var(--border-medium)',
                borderRadius: 'var(--radius-lg)',
                padding: '36px 20px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
              }}
            >
              <Upload size={36} style={{ color: 'var(--accent-primary)' }} />
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: '600' }}>Choose PDF to split</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Extract page ranges or separate all pages into individual files.
                </p>
              </div>
              <input
                type="file"
                accept="application/pdf"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </label>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText size={20} style={{ color: 'var(--accent-primary)' }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600' }}>{file.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {(file.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>
                <button
                  className="btn-secondary"
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                  onClick={() => setFile(null)}
                >
                  Change
                </button>
              </div>

              {/* Mode Selection */}
              <div className="sig-tabs">
                <button
                  className={`sig-tab-btn ${splitMode === 'ranges' ? 'active' : ''}`}
                  onClick={() => setSplitMode('ranges')}
                >
                  Split by Range
                </button>
                <button
                  className={`sig-tab-btn ${splitMode === 'all' ? 'active' : ''}`}
                  onClick={() => setSplitMode('all')}
                >
                  Extract All Pages
                </button>
              </div>

              {splitMode === 'ranges' && (
                <div>
                  <label
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      display: 'block',
                      marginBottom: '6px',
                    }}
                  >
                    Page Ranges (e.g. 1-3, 5, 7-10):
                  </label>
                  <input
                    type="text"
                    className="inspector-select"
                    style={{ width: '100%', padding: '10px 14px', fontSize: '14px' }}
                    value={rangeStr}
                    onChange={(e) => setRangeStr(e.target.value)}
                    placeholder="1-2, 4"
                  />
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Each comma-separated range will be exported as its own separate PDF document.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={isSplitting}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleSplit}
            disabled={!file || isSplitting}
          >
            <Scissors size={16} />
            <span>{isSplitting ? 'Splitting...' : 'Split PDF'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
