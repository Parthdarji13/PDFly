'use client';

import React, { useState } from 'react';
import { X, FilePlus, Plus, Trash2, ArrowUp, ArrowDown, Download, Check, Sparkles, Image as ImageIcon } from 'lucide-react';
import { imagesToPdf } from '../../lib/pdf/pdfTools';
import { downloadPdfBlob } from '../../lib/pdf/pdfExporter';
import confetti from 'canvas-confetti';

interface ImageToPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

export const ImageToPdfModal: React.FC<ImageToPdfModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const [images, setImages] = useState<File[]>([]);
  const [pageSize, setPageSize] = useState<'fit' | 'a4'>('fit');
  const [isConverting, setIsConverting] = useState(false);

  if (!isOpen) return null;

  const handleAddImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newImages = Array.from(e.target.files).filter((f) => f.type.startsWith('image/'));
      setImages((prev) => [...prev, ...newImages]);
    }
  };

  const handleRemove = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= images.length) return;
    const copy = [...images];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);
    setImages(copy);
  };

  const handleConvert = async () => {
    if (images.length === 0) return;

    try {
      setIsConverting(true);
      const pdfBytes = await imagesToPdf(images, pageSize);
      downloadPdfBlob(pdfBytes, 'converted_images.pdf');

      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      onShowToast(`Converted ${images.length} images into a clean PDF!`, 'success');
      setIsConverting(false);
      onClose();
    } catch (err: any) {
      console.error('Image to PDF error:', err);
      setIsConverting(false);
      onShowToast(`Conversion failed: ${err.message || 'Unknown error'}`, 'error');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FilePlus size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 className="modal-title">Convert Images (JPG / PNG) to PDF</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Transform photos, scans, and graphic images into a multi-page PDF document.
            </p>
            <label className="btn-secondary" style={{ cursor: 'pointer' }}>
              <Plus size={15} />
              <span>Add Images</span>
              <input
                type="file"
                multiple
                accept="image/png, image/jpeg, image/webp"
                style={{ display: 'none' }}
                onChange={handleAddImages}
              />
            </label>
          </div>

          {images.length === 0 ? (
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
              }}
            >
              <ImageIcon size={36} style={{ color: 'var(--accent-primary)' }} />
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: '600' }}>Select JPG or PNG images</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Click to select multiple photos or drag & drop them here
                </p>
              </div>
              <input
                type="file"
                multiple
                accept="image/png, image/jpeg, image/webp"
                style={{ display: 'none' }}
                onChange={handleAddImages}
              />
            </label>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Page Sizing:</span>
                <div className="sig-tabs" style={{ padding: '2px' }}>
                  <button
                    className={`sig-tab-btn ${pageSize === 'fit' ? 'active' : ''}`}
                    style={{ padding: '4px 12px', fontSize: '11px' }}
                    onClick={() => setPageSize('fit')}
                  >
                    Fit Image Dimensions
                  </button>
                  <button
                    className={`sig-tab-btn ${pageSize === 'a4' ? 'active' : ''}`}
                    style={{ padding: '4px 12px', fontSize: '11px' }}
                    onClick={() => setPageSize('a4')}
                  >
                    Standard A4 Pages
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
                {images.map((img, idx) => (
                  <div
                    key={`${img.name}-${idx}`}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'rgba(99, 102, 241, 0.15)',
                          color: 'var(--accent-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: '700',
                        }}
                      >
                        {idx + 1}
                      </div>
                      <ImageIcon size={16} style={{ color: 'var(--text-muted)' }} />
                      <div style={{ fontSize: '12.5px', fontWeight: '500' }}>{img.name}</div>
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
                        disabled={idx === images.length - 1}
                        onClick={() => handleMove(idx, 'down')}
                        title="Move Down"
                      >
                        <ArrowDown size={13} />
                      </button>
                      <button
                        className="thumbnail-action-btn"
                        style={{ color: 'var(--accent-danger)' }}
                        onClick={() => handleRemove(idx)}
                        title="Remove"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={isConverting}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleConvert}
            disabled={images.length === 0 || isConverting}
          >
            <Download size={16} />
            <span>{isConverting ? 'Creating PDF...' : `Generate PDF (${images.length} Pages)`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
