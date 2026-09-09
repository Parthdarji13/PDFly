'use client';

import React, { useState } from 'react';
import { X, Droplet, Upload, Download, Check, Sparkles, FileText } from 'lucide-react';
import { watermarkPdf, WatermarkOptions } from '../../lib/pdf/pdfTools';
import { downloadPdfBlob } from '../../lib/pdf/pdfExporter';
import confetti from 'canvas-confetti';

interface WatermarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

export const WatermarkModal: React.FC<WatermarkModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('CONFIDENTIAL');
  const [fontSize, setFontSize] = useState(48);
  const [color, setColor] = useState('#ef4444');
  const [opacity, setOpacity] = useState(0.25);
  const [rotation, setRotation] = useState(-45);
  const [position, setPosition] = useState<'center' | 'diagonal' | 'bottom-right' | 'top-left'>('center');
  const [isWatermarking, setIsWatermarking] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleApply = async () => {
    if (!file || !text) return;

    try {
      setIsWatermarking(true);
      const options: WatermarkOptions = {
        text,
        fontSize,
        color,
        opacity,
        rotation,
        position,
      };

      const resultBytes = await watermarkPdf(file, options);
      const outputName = file.name.replace(/\.pdf$/i, '') + '_watermarked.pdf';
      downloadPdfBlob(resultBytes, outputName);

      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      onShowToast('Watermark successfully applied to all pages!', 'success');
      setIsWatermarking(false);
      onClose();
    } catch (err: any) {
      console.error('Watermark error:', err);
      setIsWatermarking(false);
      onShowToast(`Watermark failed: ${err.message || 'Unknown error'}`, 'error');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Droplet size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 className="modal-title">Watermark PDF Document</h3>
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
                <h4 style={{ fontSize: '14px', fontWeight: '600' }}>Choose PDF to Watermark</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Stamp custom copyright, draft, or confidential notices across all pages.
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
                  <span style={{ fontSize: '13px', fontWeight: '600' }}>{file.name}</span>
                </div>
                <button
                  className="btn-secondary"
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                  onClick={() => setFile(null)}
                >
                  Change
                </button>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Watermark Text:
                </label>
                <input
                  type="text"
                  className="inspector-select"
                  style={{ width: '100%', padding: '8px 12px', fontSize: '14px' }}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="CONFIDENTIAL, DRAFT, SAMPLE..."
                />
              </div>

              {/* Quick Presets */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['CONFIDENTIAL', 'DO NOT COPY', 'DRAFT', 'SAMPLE', 'APPROVED'].map((preset) => (
                  <button
                    key={preset}
                    className="btn-secondary"
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                    onClick={() => setText(preset)}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Opacity: {Math.round(opacity * 100)}%
                  </label>
                  <input
                    type="range"
                    min={0.05}
                    max={0.9}
                    step={0.05}
                    value={opacity}
                    onChange={(e) => setOpacity(parseFloat(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Angle: {rotation}°
                  </label>
                  <input
                    type="range"
                    min={-90}
                    max={90}
                    step={5}
                    value={rotation}
                    onChange={(e) => setRotation(parseInt(e.target.value, 10))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Color:</span>
                {['#ef4444', '#059669', '#2563eb', '#64748b', '#000000'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: c,
                      border: color === c ? '2px solid var(--accent-primary)' : '2px solid transparent',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={isWatermarking}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleApply}
            disabled={!file || !text || isWatermarking}
          >
            <Droplet size={16} />
            <span>{isWatermarking ? 'Applying...' : 'Apply Watermark'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
