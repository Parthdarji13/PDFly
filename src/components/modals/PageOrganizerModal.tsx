'use client';

import React from 'react';
import {
  X,
  RotateCw,
  Trash2,
  Copy,
  Plus,
  ArrowLeft,
  ArrowRight,
  Layers,
  Check,
} from 'lucide-react';
import { PageInfo } from '../../lib/types';

interface PageOrganizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pages: PageInfo[];
  onReorderPages: (newPages: PageInfo[]) => void;
  onRotatePage: (pageIndex: number) => void;
  onDeletePage: (pageIndex: number) => void;
  onDuplicatePage: (pageIndex: number) => void;
  onAddBlankPage: () => void;
}

export const PageOrganizerModal: React.FC<PageOrganizerModalProps> = ({
  isOpen,
  onClose,
  pages,
  onReorderPages,
  onRotatePage,
  onDeletePage,
  onDuplicatePage,
  onAddBlankPage,
}) => {
  if (!isOpen) return null;

  // Move page position in array
  const movePage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= pages.length) return;
    const reordered = [...pages];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    onReorderPages(reordered);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 className="modal-title">Page Organizer ({pages.length} Pages)</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Reorder pages, rotate orientation, duplicate, or remove unwanted pages.
            </p>
            <button className="btn-secondary" onClick={onAddBlankPage}>
              <Plus size={14} />
              <span>Add Blank Page</span>
            </button>
          </div>

          <div className="organizer-grid">
            {pages.map((page, idx) => (
              <div key={`org-${page.pageIndex}-${idx}`} className="organizer-card">
                <div className="organizer-preview">
                  {page.thumbnailUrl ? (
                    <img
                      src={page.thumbnailUrl}
                      alt={`Page ${idx + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        transform: `rotate(${page.rotation || 0}deg)`,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        color: 'var(--text-muted)',
                        fontSize: '12px',
                      }}
                    >
                      Page {idx + 1}
                    </div>
                  )}
                </div>

                <div style={{ fontWeight: '600', fontSize: '12px' }}>Page {idx + 1}</div>

                {/* Card Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    className="thumbnail-action-btn"
                    disabled={idx === 0}
                    onClick={() => movePage(idx, idx - 1)}
                    title="Move Left"
                  >
                    <ArrowLeft size={13} />
                  </button>
                  <button
                    className="thumbnail-action-btn"
                    disabled={idx === pages.length - 1}
                    onClick={() => movePage(idx, idx + 1)}
                    title="Move Right"
                  >
                    <ArrowRight size={13} />
                  </button>
                  <button
                    className="thumbnail-action-btn"
                    onClick={() => onRotatePage(idx)}
                    title="Rotate 90°"
                  >
                    <RotateCw size={13} />
                  </button>
                  <button
                    className="thumbnail-action-btn"
                    onClick={() => onDuplicatePage(idx)}
                    title="Duplicate Page"
                  >
                    <Copy size={13} />
                  </button>
                  {pages.length > 1 && (
                    <button
                      className="thumbnail-action-btn"
                      style={{ color: 'var(--accent-danger)' }}
                      onClick={() => onDeletePage(idx)}
                      title="Delete Page"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-primary" onClick={onClose}>
            <Check size={16} />
            <span>Done Organizing</span>
          </button>
        </div>
      </div>
    </div>
  );
};
