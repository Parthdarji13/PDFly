'use client';

import React from 'react';
import { X, Stamp as StampIcon, Check } from 'lucide-react';
import { ImageElement } from '../../lib/types';

interface StampPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStamp: (stampDataUrl: string, title: string) => void;
}

const STAMP_PRESETS = [
  { title: 'APPROVED', color: '#10b981', border: '#059669', rotate: -6 },
  { title: 'CONFIDENTIAL', color: '#ef4444', border: '#dc2626', rotate: -8 },
  { title: 'PAID', color: '#059669', border: '#047857', rotate: 4 },
  { title: 'URGENT', color: '#f59e0b', border: '#d97706', rotate: -5 },
  { title: 'DRAFT', color: '#6366f1', border: '#4f46e5', rotate: 5 },
  { title: 'REVISED', color: '#8b5cf6', border: '#7c3aed', rotate: -4 },
  { title: 'FINAL', color: '#2563eb', border: '#1d4ed8', rotate: 3 },
  { title: 'VOID', color: '#b91c1c', border: '#991b1b', rotate: -10 },
  { title: 'COPY', color: '#64748b', border: '#475569', rotate: -3 },
];

export const StampPickerModal: React.FC<StampPickerModalProps> = ({
  isOpen,
  onClose,
  onAddStamp,
}) => {
  if (!isOpen) return null;

  // Generate crisp Stamp PNG data URL
  const generateStampDataUrl = (title: string, color: string, border: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 140;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Draw double rounded border
    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 380, 120);

    ctx.strokeStyle = border;
    ctx.lineWidth = 2;
    ctx.strokeRect(18, 18, 364, 104);

    // Draw Text
    ctx.fillStyle = color;
    ctx.font = 'bold 44px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '4px';
    ctx.fillText(title, 200, 70);

    return canvas.toDataURL('image/png');
  };

  const handleSelectStamp = (preset: (typeof STAMP_PRESETS)[0]) => {
    const dataUrl = generateStampDataUrl(preset.title, preset.color, preset.border);
    onAddStamp(dataUrl, preset.title);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <StampIcon size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 className="modal-title">Insert Professional Stamp</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Choose a stamp preset to place onto the active page. You can move, resize, and adjust opacity afterwards.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '14px',
              padding: '10px 0',
            }}
          >
            {STAMP_PRESETS.map((preset) => (
              <div
                key={preset.title}
                onClick={() => handleSelectStamp(preset)}
                style={{
                  padding: '16px 8px',
                  backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = preset.color)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
              >
                <div
                  style={{
                    border: `3px solid ${preset.color}`,
                    padding: '6px 14px',
                    borderRadius: '4px',
                    color: preset.color,
                    fontWeight: '800',
                    fontSize: '14px',
                    letterSpacing: '2px',
                    transform: `rotate(${preset.rotate}deg)`,
                  }}
                >
                  {preset.title}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
