'use client';

import React, { useState } from 'react';
import { X, Image as ImageIcon, Upload, Download, Check, Sparkles, FileText } from 'lucide-react';
import { pdfToImages } from '../../lib/pdf/pdfTools';

interface PdfToImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

export const PdfToImageModal: React.FC<PdfToImageModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<'png' | 'jpeg'>('png');
  const [extractedImages, setExtractedImages] = useState<{ pageNumber: number; dataUrl: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      try {
        setIsProcessing(true);
        const imgs = await pdfToImages(f, format, 2.0);
        setExtractedImages(imgs);
        setIsProcessing(false);
      } catch (err: any) {
        console.error('PDF to image error:', err);
        setIsProcessing(false);
        onShowToast('Failed to convert PDF pages to images', 'error');
      }
    }
  };

  const downloadImage = (dataUrl: string, pageNum: number) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    const ext = format === 'png' ? 'png' : 'jpg';
    a.download = `${file?.name.replace(/\.pdf$/i, '') || 'page'}_page_${pageNum}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadAll = () => {
    extractedImages.forEach((img) => {
      downloadImage(img.dataUrl, img.pageNumber);
    });
    onShowToast(`Downloaded ${extractedImages.length} images!`, 'success');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ImageIcon size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 className="modal-title">Convert PDF to High-Res JPG / PNG</h3>
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
                <h4 style={{ fontSize: '14px', fontWeight: '600' }}>Select PDF to extract images</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Converts each PDF page into high-quality 300 DPI PNG or JPG image.
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={18} style={{ color: 'var(--accent-primary)' }} />
                  <span style={{ fontSize: '13px', fontWeight: '600' }}>{file.name}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="sig-tabs" style={{ padding: '2px' }}>
                    <button
                      className={`sig-tab-btn ${format === 'png' ? 'active' : ''}`}
                      style={{ padding: '4px 10px', fontSize: '11px' }}
                      onClick={() => setFormat('png')}
                    >
                      PNG
                    </button>
                    <button
                      className={`sig-tab-btn ${format === 'jpeg' ? 'active' : ''}`}
                      style={{ padding: '4px 10px', fontSize: '11px' }}
                      onClick={() => setFormat('jpeg')}
                    >
                      JPG
                    </button>
                  </div>
                  <button
                    className="btn-secondary"
                    style={{ padding: '4px 8px', fontSize: '11px' }}
                    onClick={() => {
                      setFile(null);
                      setExtractedImages([]);
                    }}
                  >
                    Change PDF
                  </button>
                </div>
              </div>

              {isProcessing ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Rendering pages to high-resolution images...
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: '12px',
                    maxHeight: '380px',
                    overflowY: 'auto',
                    padding: '4px',
                  }}
                >
                  {extractedImages.map((img) => (
                    <div
                      key={`page-img-${img.pageNumber}`}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px',
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          aspectRatio: '1 / 1.414',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                          backgroundColor: '#ffffff',
                        }}
                      >
                        <img
                          src={img.dataUrl}
                          alt={`Page ${img.pageNumber}`}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                        Page {img.pageNumber}
                      </div>
                      <button
                        className="btn-secondary"
                        style={{ width: '100%', justifyContent: 'center', fontSize: '11px', padding: '4px 6px' }}
                        onClick={() => downloadImage(img.dataUrl, img.pageNumber)}
                      >
                        <Download size={12} />
                        <span>Download</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
          {extractedImages.length > 1 && (
            <button className="btn-primary" onClick={downloadAll}>
              <Download size={16} />
              <span>Download All ({extractedImages.length} Images)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
