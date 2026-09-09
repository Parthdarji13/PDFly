'use client';

import React, { useState } from 'react';
import { X, Search, Replace, Sparkles, Check, ArrowRight } from 'lucide-react';
import { AppState } from '../../lib/state/store';
import { TextElement } from '../../lib/types';

interface SearchReplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
  onAddElementsBatch: (elements: TextElement[], actionDesc: string) => void;
}

export const SearchReplaceModal: React.FC<SearchReplaceModalProps> = ({
  isOpen,
  onClose,
  state,
  onUpdateState,
  onAddElementsBatch,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [matchCase, setMatchCase] = useState(false);

  if (!isOpen) return null;

  // Search across all pages text items
  const matches: { pageIndex: number; item: any }[] = [];
  if (searchTerm.trim().length > 0) {
    state.documentState.pages.forEach((page) => {
      page.textItems.forEach((item) => {
        const itemText = matchCase ? item.text : item.text.toLowerCase();
        const query = matchCase ? searchTerm : searchTerm.toLowerCase();
        if (itemText.includes(query)) {
          matches.push({ pageIndex: page.pageIndex, item });
        }
      });
    });
  }

  // Execute Replace All with Matched Typography!
  const handleReplaceAll = () => {
    if (matches.length === 0 || replaceTerm === undefined) return;

    const newTextElements: TextElement[] = [];

    matches.forEach(({ pageIndex, item }, idx) => {
      const regex = new RegExp(searchTerm, matchCase ? 'g' : 'gi');
      const updatedText = item.text.replace(regex, replaceTerm);

      const newEl: TextElement = {
        id: `sr-replace-${Date.now()}-${idx}`,
        pageIndex: pageIndex,
        type: 'text',
        x: item.visualX,
        y: item.visualY,
        width: Math.max(60, item.width * (updatedText.length / Math.max(1, item.text.length))),
        height: Math.max(16, item.height),
        text: updatedText,
        fontFamily: item.fontFamily,
        pdfFontKey: item.pdfFontKey,
        fontSize: item.fontSize,
        fontWeight: item.fontWeight,
        fontStyle: item.fontStyle,
        underline: false,
        color: item.color || '#0f172a',
        align: 'left',
        lineHeight: 1.2,
        letterSpacing: 0,
        backgroundColor: item.backgroundColor || '#ffffff',
        isOriginalEdit: true,
        originalTextId: item.id,
        originalBBox: {
          x: item.visualX,
          y: item.visualY,
          width: item.width,
          height: item.height,
        },
        zIndex: 50 + idx,
        opacity: 1,
      };

      newTextElements.push(newEl);
    });

    onAddElementsBatch(
      newTextElements,
      `Replaced ${matches.length} occurrences of "${searchTerm}" with "${replaceTerm}"`
    );
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 className="modal-title">Search & Replace with Font Matching</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Search Input */}
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Find text:
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="inspector-select"
                style={{ width: '100%', padding: '10px 14px 10px 36px', fontSize: '14px' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Enter text to find across PDF..."
                autoFocus
              />
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
            </div>
          </div>

          {/* Replace Input */}
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Replace with:
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="inspector-select"
                style={{ width: '100%', padding: '10px 14px 10px 36px', fontSize: '14px' }}
                value={replaceTerm}
                onChange={(e) => setReplaceTerm(e.target.value)}
                placeholder="Enter replacement text..."
              />
              <Replace
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
            </div>
          </div>

          {/* Options */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={matchCase}
                onChange={(e) => setMatchCase(e.target.checked)}
              />
              <span>Match Case</span>
            </label>
          </div>

          {/* Results Summary & List */}
          <div
            style={{
              padding: '12px',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              maxHeight: '180px',
              overflowY: 'auto',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-primary)' }}>
              {searchTerm ? `Found ${matches.length} matching occurrences` : 'Type a query above to search'}
            </div>

            {matches.map((m, i) => (
              <div
                key={`match-${i}`}
                style={{
                  padding: '6px 8px',
                  fontSize: '12px',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-muted)', marginRight: '6px' }}>Page {m.pageIndex + 1}:</span>
                  <span style={{ fontWeight: '500' }}>"{m.item.text}"</span>
                </div>
                <span style={{ fontSize: '10px', color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                  {m.item.fontFamily} {Math.round(m.item.fontSize)}pt
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            disabled={matches.length === 0}
            onClick={handleReplaceAll}
          >
            <Check size={16} />
            <span>Replace All ({matches.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
