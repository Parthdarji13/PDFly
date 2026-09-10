'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  X,
  FileText,
  Award,
  Briefcase,
  Scale,
  FileSpreadsheet,
  Mail,
  PlusCircle,
  ArrowRight,
  Search,
  Check,
} from 'lucide-react';

export type TemplateId = 'invoice' | 'resume' | 'contract' | 'certificate' | 'proposal' | 'letter' | 'blank';

export interface TemplateItem {
  id: TemplateId;
  title: string;
  category: 'business' | 'career' | 'legal' | 'honors' | 'blank';
  categoryLabel: string;
  badge: string;
  description: string;
  pages: number;
  icon: React.ReactNode;
  popular?: boolean;
}

export const ALL_TEMPLATES: TemplateItem[] = [
  {
    id: 'invoice',
    title: 'Business Tax Invoice',
    category: 'business',
    categoryLabel: 'Business & Finance',
    badge: 'Popular',
    description: 'Professional invoice with billed-to box, multi-row line items, tax calculations, and banking payment notes.',
    pages: 1,
    icon: <FileSpreadsheet size={18} />,
    popular: true,
  },
  {
    id: 'resume',
    title: 'Executive Resume / CV',
    category: 'career',
    categoryLabel: 'Career & Jobs',
    badge: 'Trending',
    description: 'Modern executive curriculum vitae with career summary, multi-role experience timeline, skills matrix, and education.',
    pages: 1,
    icon: <Briefcase size={18} />,
    popular: true,
  },
  {
    id: 'contract',
    title: 'Non-Disclosure Agreement (NDA)',
    category: 'legal',
    categoryLabel: 'Legal & Contracts',
    badge: 'Verified',
    description: 'Standard 3-year mutual confidentiality agreement with numbered clauses, governing law, and dual signature blocks.',
    pages: 1,
    icon: <Scale size={18} />,
    popular: true,
  },
  {
    id: 'certificate',
    title: 'Certificate of Recognition',
    category: 'honors',
    categoryLabel: 'Awards & Honors',
    badge: 'New',
    description: 'High-res landscape award certificate with double gold border, official emblem seal, recipient title, and executive sign-off.',
    pages: 1,
    icon: <Award size={18} />,
    popular: true,
  },
  {
    id: 'proposal',
    title: 'Business Project Proposal',
    category: 'business',
    categoryLabel: 'Business & Finance',
    badge: 'New',
    description: 'Corporate project scope proposal with executive summary, 4-phase milestone deliverables table, investment totals, and authorization.',
    pages: 1,
    icon: <FileText size={18} />,
    popular: false,
  },
  {
    id: 'letter',
    title: 'Formal Business Letter',
    category: 'business',
    categoryLabel: 'Business & Finance',
    badge: 'Classic',
    description: 'Official corporate correspondence letterhead with date, recipient address, 3-paragraph executive body, and signature line.',
    pages: 1,
    icon: <Mail size={18} />,
    popular: false,
  },
  {
    id: 'blank',
    title: 'Blank Canvas Document',
    category: 'blank',
    categoryLabel: 'Create New',
    badge: 'Custom',
    description: 'Clean standard A4 blank canvas ready for custom vector text, shapes, signatures, images, and stamp annotations.',
    pages: 1,
    icon: <PlusCircle size={18} />,
    popular: false,
  },
];

interface TemplateGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateId: TemplateId) => void;
}

export const TemplateGalleryModal: React.FC<TemplateGalleryModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const filteredTemplates = ALL_TEMPLATES.filter((tpl) => {
    const matchesCategory = selectedCategory === 'all' || tpl.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      tpl.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content ai-modal-card template-gallery-modal"
        style={{ maxWidth: '880px', width: '92vw', maxHeight: '88vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header" style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              className="tool-card-icon"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                width: '38px',
                height: '38px',
              }}
            >
              <Sparkles size={19} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 className="modal-title" style={{ fontSize: '18px' }}>
                  PDF Template Library
                </h3>
                <span className="section-pill-tag" style={{ fontSize: '10.5px', padding: '2px 8px' }}>
                  {ALL_TEMPLATES.length} READY-TO-USE
                </span>
              </div>
              <p className="modal-subtitle" style={{ fontSize: '12.5px', marginTop: '2px' }}>
                Select a professionally pre-formatted PDF document to edit, fill, customize, or export.
              </p>
            </div>
          </div>
          <button className="nav-btn" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Toolbar: Search + Category Filter Tabs */}
        <div
          style={{
            padding: '14px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-tertiary)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Search bar */}
          <div style={{ position: 'relative' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              className="inspector-input"
              placeholder="Search templates (e.g. invoice, resume, agreement, certificate)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                paddingLeft: '36px',
                width: '100%',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-medium)',
                height: '38px',
                fontSize: '13px',
              }}
            />
          </div>

          {/* Category Filter Chips */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Templates' },
              { id: 'business', label: '💼 Business & Finance' },
              { id: 'career', label: '👤 Career & Resume' },
              { id: 'legal', label: '⚖️ Legal & Contracts' },
              { id: 'honors', label: '🏆 Awards & Honors' },
              { id: 'blank', label: '➕ Blank Canvas' },
            ].map((cat) => (
              <button
                key={cat.id}
                className={`sample-chip ${selectedCategory === cat.id ? 'active' : ''}`}
                style={{
                  fontSize: '12px',
                  padding: '5px 12px',
                  backgroundColor: selectedCategory === cat.id ? 'var(--accent-primary)' : 'var(--bg-primary)',
                  color: selectedCategory === cat.id ? '#ffffff' : 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '999px',
                }}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Body: Templates Grid */}
        <div className="modal-body" style={{ maxHeight: '58vh', overflowY: 'auto', padding: '20px 24px' }}>
          {filteredTemplates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <FileText size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
              <h4 style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>No templates found</h4>
              <p style={{ fontSize: '13px' }}>Try adjusting your search query or filter category.</p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '16px',
              }}
            >
              {filteredTemplates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="template-gallery-card"
                  onClick={() => {
                    onSelectTemplate(tpl.id);
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '16px',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-medium)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                  }}
                >
                  <div>
                    {/* Top Row: Icon & Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          backgroundColor: 'rgba(99, 102, 241, 0.15)',
                          color: 'var(--accent-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid rgba(99, 102, 241, 0.25)',
                        }}
                      >
                        {tpl.icon}
                      </div>

                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '3px 8px',
                          borderRadius: '999px',
                          backgroundColor: tpl.popular ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg-surface)',
                          color: tpl.popular ? 'var(--accent-primary)' : 'var(--text-muted)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        {tpl.badge}
                      </span>
                    </div>

                    {/* Title */}
                    <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {tpl.title}
                    </h4>

                    {/* Category Label */}
                    <div style={{ fontSize: '11.5px', color: 'var(--accent-primary)', fontWeight: '600', marginBottom: '8px' }}>
                      {tpl.categoryLabel}
                    </div>

                    {/* Description */}
                    <p
                      style={{
                        fontSize: '12px',
                        lineHeight: '1.45',
                        color: 'var(--text-secondary)',
                        margin: '0 0 16px 0',
                      }}
                    >
                      {tpl.description}
                    </p>
                  </div>

                  {/* Action Button */}
                  <button
                    className="btn-primary"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '12.5px',
                      justifyContent: 'center',
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    }}
                  >
                    <span>Use Template</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="modal-footer"
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            All templates generate vector text elements ready for instant editing, OCR, and AI rewriting.
          </span>
          <button className="btn-secondary" onClick={onClose} style={{ padding: '6px 16px' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
