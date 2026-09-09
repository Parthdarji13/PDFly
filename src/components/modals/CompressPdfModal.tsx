'use client';

import React, { useState } from 'react';
import { X, Minimize2, Upload, Download, Check, Sparkles, FileText, ArrowRight } from 'lucide-react';
import { compressPdf } from '../../lib/pdf/pdfTools';
import { downloadPdfBlob } from '../../lib/pdf/pdfExporter';
import confetti from 'canvas-confetti';

interface CompressPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

export const CompressPdfModal: React.FC<CompressPdfModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [result, setResult] = useState<{ bytes: Uint8Array; originalSize: number; newSize: number } | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setResult(null);
    }
  };

  const handleCompress = async () => {
    if (!file) return;

    try {
      setIsCompressing(true);
      const res = await compressPdf(file);
      setResult(res);
      setIsCompressing(false);

      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      onShowToast('PDF optimized and compressed successfully!', 'success');
    } catch (err: any) {
      console.error('Compression error:', err);
      setIsCompressing(false);
      onShowToast(`Compression failed: ${err.message || 'Unknown error'}`, 'error');
    }
  };

  const handleDownload = () => {
    if (!result || !file) return;
    const outName = file.name.replace(/\.pdf$/i, '') + '_compressed.pdf';
    downloadPdfBlob(result.bytes, outName);
    onClose();
  };

  const formatSize = (bytes: number) => {
    if (bytes > 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Minimize2 size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 className="modal-title">Compress & Optimize PDF</h3>
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
                <h4 style={{ fontSize: '14px', fontWeight: '600' }}>Choose PDF to compress</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Reduces file size while retaining crystal clear vector quality.
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
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={18} style={{ color: 'var(--accent-primary)' }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600' }}>{file.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Original: {formatSize(file.size)}
                    </div>
                  </div>
                </div>
                <button
                  className="btn-secondary"
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                  onClick={() => {
                    setFile(null);
                    setResult(null);
                  }}
                >
                  Change
                </button>
              </div>

              {result && (
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ color: 'var(--accent-success)', fontWeight: '700', fontSize: '13px' }}>
                      Compression Complete!
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {formatSize(result.originalSize)} <ArrowRight size={12} style={{ display: 'inline' }} />{' '}
                      <strong>{formatSize(result.newSize)}</strong>
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--accent-success)',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: '700',
                    }}
                  >
                    {result.originalSize > result.newSize
                      ? `-${Math.round(((result.originalSize - result.newSize) / result.originalSize) * 100)}%`
                      : 'Optimized'}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={isCompressing}>
            Cancel
          </button>
          {!result ? (
            <button
              className="btn-primary"
              onClick={handleCompress}
              disabled={!file || isCompressing}
            >
              <Minimize2 size={16} />
              <span>{isCompressing ? 'Compressing...' : 'Compress PDF'}</span>
            </button>
          ) : (
            <button className="btn-primary" onClick={handleDownload}>
              <Download size={16} />
              <span>Download Compressed PDF</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
