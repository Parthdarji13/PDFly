'use client';

import React, { useRef, useState } from 'react';
import {
  Sparkles,
  MessageSquare,
  Brain,
  Bot,
  X,
  Upload,
  FolderOpen,
  FileText,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export type AiFeatureType = 'chat' | 'summarize' | 'insights' | 'aiAssist' | 'general';

interface AiSelectPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: AiFeatureType;
  onSelectFile: (file: File) => void;
  onSelectSample: (sampleType: 'invoice' | 'resume' | 'contract' | 'certificate' | 'proposal' | 'letter' | 'blank') => void;
}

const FEATURE_CONFIG: Record<
  AiFeatureType,
  {
    title: string;
    badge: string;
    description: string;
    gradient: string;
    icon: React.ReactNode;
    recommendedSample: 'invoice' | 'resume' | 'contract';
    samplePrompt: string;
  }
> = {
  chat: {
    title: 'Chat with PDF',
    badge: 'PDFLY AI ASSISTANT',
    description:
      'Please select or upload a PDF document to start asking questions, extracting citations, and querying document clauses.',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    icon: <MessageSquare size={22} />,
    recommendedSample: 'contract',
    samplePrompt: 'e.g. Legal NDA, Lease Agreements, Reports',
  },
  summarize: {
    title: 'AI Auto-Summarize',
    badge: 'EXECUTIVE SUMMARY',
    description:
      'Please select or upload a PDF document to generate structured executive summaries, bullet highlights, and key takeaways.',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
    icon: <Sparkles size={22} />,
    recommendedSample: 'contract',
    samplePrompt: 'e.g. Reports, Research Papers, Contracts',
  },
  insights: {
    title: 'AI Document Insights',
    badge: 'SMART DATA EXTRACTION',
    description:
      'Please select or upload a PDF document to classify content, extract financial tables, entities, dates, and export to CSV.',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)',
    icon: <Brain size={22} />,
    recommendedSample: 'invoice',
    samplePrompt: 'e.g. Invoices, Receipts, Financial Statements',
  },
  aiAssist: {
    title: 'AI Text Assist & Rewrite',
    badge: 'TONE & GRAMMAR REWRITE',
    description:
      'Please select or upload a PDF document to polish copywriting, fix grammar, adjust tone, and translate canvas text.',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    icon: <Bot size={22} />,
    recommendedSample: 'resume',
    samplePrompt: 'e.g. Resumes, CVs, Marketing Materials',
  },
  general: {
    title: 'AI PDF Studio',
    badge: 'AI POWERED',
    description: 'Please select or upload a PDF document to get started with PDFly AI document intelligence.',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
    icon: <Sparkles size={22} />,
    recommendedSample: 'invoice',
    samplePrompt: 'Select any PDF file from your device',
  },
};

export const AiSelectPdfModal: React.FC<AiSelectPdfModalProps> = ({
  isOpen,
  onClose,
  feature,
  onSelectFile,
  onSelectSample,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  const currentFeature = FEATURE_CONFIG[feature] || FEATURE_CONFIG.general;

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
      onSelectFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSelectFile(file);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-dialog modal-large"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '620px',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.7), 0 0 30px rgba(99, 102, 241, 0.25)',
        }}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-glass-heavy)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: currentFeature.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              }}
            >
              {currentFeature.icon}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700' }}>{currentFeature.title}</h3>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    padding: '2px 7px',
                    borderRadius: '999px',
                    background: 'rgba(99, 102, 241, 0.15)',
                    color: 'var(--accent-primary)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    letterSpacing: '0.04em',
                  }}
                >
                  {currentFeature.badge}
                </span>
              </div>
              <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                Document required to proceed with AI analysis
              </p>
            </div>
          </div>
          <button className="nav-btn" onClick={onClose} title="Close dialog">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Informational Callout Alert */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.22)',
            }}
          >
            <Sparkles size={18} style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '13px', lineHeight: '1.45', color: 'var(--text-secondary)' }}>
              <span style={{ fontWeight: '600', color: 'var(--text-primary)', display: 'block', marginBottom: '2px' }}>
                Please select or upload a PDF document first
              </span>
              {currentFeature.description}
            </div>
          </div>

          {/* Primary Dropzone */}
          <input
            type="file"
            ref={fileInputRef}
            accept="application/pdf,.pdf"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          <div
            className={`hero-drop-zone ${isDragging ? 'dragging' : ''}`}
            style={{
              padding: '32px 20px',
              border: '2px dashed var(--border-medium)',
              borderRadius: 'var(--radius-lg)',
              background: isDragging ? 'var(--bg-active)' : 'var(--bg-tertiary)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              textAlign: 'center',
              transition: 'all var(--transition-fast)',
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: 'rgba(99, 102, 241, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-primary)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
              }}
            >
              <Upload size={24} />
            </div>

            <div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                Click to Browse or Drag & Drop PDF
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Supports standard .pdf files up to 50MB (Client-side private)
              </div>
            </div>

            <button
              type="button"
              className="btn-primary"
              style={{
                padding: '8px 18px',
                fontSize: '13px',
                marginTop: '4px',
                background: currentFeature.gradient,
              }}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <FolderOpen size={15} />
              <span>Select PDF File</span>
            </button>
          </div>

          {/* Quick Sample Template Section */}
          <div style={{ marginTop: '2px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '10px',
                fontSize: '12px',
                fontWeight: '600',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              <Zap size={13} style={{ color: 'var(--accent-warning)' }} />
              <span>Or explore immediately with a sample document</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'left',
                  gap: '4px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                }}
                onClick={() => onSelectSample('invoice')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '16px' }}>📄</span>
                  <span style={{ fontSize: '12.5px', fontWeight: '600' }}>Invoice</span>
                </div>
                <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Financial & table data</span>
              </button>

              <button
                type="button"
                className="btn-secondary"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'left',
                  gap: '4px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                }}
                onClick={() => onSelectSample('resume')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '16px' }}>📝</span>
                  <span style={{ fontSize: '12.5px', fontWeight: '600' }}>Resume</span>
                </div>
                <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Tone & rewrite assist</span>
              </button>

              <button
                type="button"
                className="btn-secondary"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'left',
                  gap: '4px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                }}
                onClick={() => onSelectSample('contract')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '16px' }}>⚖️</span>
                  <span style={{ fontSize: '12.5px', fontWeight: '600' }}>NDA Contract</span>
                </div>
                <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Q&A & summary</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className="modal-footer"
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-glass-heavy)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
            <ShieldCheck size={14} style={{ color: 'var(--accent-success)' }} />
            <span>Files processed securely & privately</span>
          </div>

          <button className="btn-secondary" onClick={onClose} style={{ padding: '6px 14px', fontSize: '12.5px' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
