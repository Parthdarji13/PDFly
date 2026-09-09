'use client';

import React, { useState } from 'react';
import { X, Combine, Plus, Trash2, ArrowUp, ArrowDown, Download, Check, Sparkles, FileText } from 'lucide-react';
import { mergePdfFiles } from '../../lib/pdf/pdfTools';
import { downloadPdfBlob } from '../../lib/pdf/pdfExporter';
import confetti from 'canvas-confetti';

interface MergePdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

export const MergePdfModal: React.FC<MergePdfModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isMerging, setIsMerging] = useState(false);

  if (!isOpen) return null;

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).filter((f) => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleRemove = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= files.length) return;
    const copy = [...files];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);
    setFiles(copy);
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      onShowToast('Please add at least 2 PDF files to merge', 'warning');
      return;
    }

    try {
      setIsMerging(true);
      const mergedBytes = await mergePdfFiles(files);
      downloadPdfBlob(mergedBytes, 'merged_document.pdf');

      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      onShowToast(`Successfully merged ${files.length} PDFs!`, 'success');
      setIsMerging(false);
      onClose();
    } catch (err: any) {
      console.error('Merge error:', err);
      setIsMerging(false);
      onShowToast(`Merge failed: ${err.message || 'Unknown error'}`, 'error');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Combine size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 className="modal-title">Merge PDF Files</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Combine multiple PDFs into a single file in your desired order.
            </p>
            <label className="btn-secondary" style={{ cursor: 'pointer' }}>
              <Plus size={15} />
              <span>Add More PDFs</span>
              <input
                type="file"
                multiple
                accept="application/pdf"
                style={{ display: 'none' }}
                onChange={handleAddFiles}
              />
            </label>
          </div>

          {files.length === 0 ? (
            <label
              style={{
                border: '2px dashed var(--border-medium)',
                borderRadius: 'var(--radius-lg)',
                padding: '40px 20px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                backgroundColor: 'rgba(99, 102, 241, 0.03)',
              }}
            >
              <Combine size={36} style={{ color: 'var(--accent-primary)' }} />
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: '600' }}>Select PDF files to combine</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Click to browse or drag & drop files here
                </p>
              </div>
              <input
                type="file"
                multiple
                accept="application/pdf"
                style={{ display: 'none' }}
                onChange={handleAddFiles}
              />
            </label>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {files.map((file, idx) => (
                <div
                  key={`${file.name}-${idx}`}
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
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'rgba(99, 102, 241, 0.15)',
                        color: 'var(--accent-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: '700',
                      }}
                    >
                      {idx + 1}
                    </div>
                    <FileText size={16} style={{ color: 'var(--text-muted)' }} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600' }}>{file.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {(file.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      className="thumbnail-action-btn"
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, 'up')}
                      title="Move Up"
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      className="thumbnail-action-btn"
                      disabled={idx === files.length - 1}
                      onClick={() => handleMove(idx, 'down')}
                      title="Move Down"
                    >
                      <ArrowDown size={13} />
                    </button>
                    <button
                      className="thumbnail-action-btn"
                      style={{ color: 'var(--accent-danger)' }}
                      onClick={() => handleRemove(idx)}
                      title="Remove file"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={isMerging}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleMerge}
            disabled={files.length < 2 || isMerging}
          >
            <Combine size={16} />
            <span>{isMerging ? 'Merging Files...' : `Merge ${files.length} PDFs`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
