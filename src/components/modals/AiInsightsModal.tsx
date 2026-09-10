'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Copy,
  Check,
  Download,
  FileSpreadsheet,
  FileCode,
  Tag,
  Calendar,
  DollarSign,
  Building,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  FileText,
  FolderOpen,
  Upload,
} from 'lucide-react';
import { DocumentState } from '../../lib/types';
import { extractDocumentText, estimateTokens } from '../../lib/ai/textExtractor';

interface AiInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentState: DocumentState;
  onRenameDocument?: (newName: string) => void;
  onShowToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  onOpenFile?: (file: File) => void;
  onLoadSample?: (sampleType: 'invoice' | 'resume' | 'contract' | 'certificate' | 'proposal' | 'letter' | 'blank') => void;
}

interface ExtractedInsights {
  documentType: string;
  suggestedFileName: string;
  confidence: string;
  language: string;
  entities: Array<{ label: string; value: string }>;
  tableRows?: Array<Record<string, any>>;
  quickInsights?: string[];
}

export const AiInsightsModal: React.FC<AiInsightsModalProps> = ({
  isOpen,
  onClose,
  documentState,
  onRenameDocument,
  onShowToast,
  onOpenFile,
  onLoadSample,
}) => {
  const [insights, setInsights] = useState<ExtractedInsights | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const hasDocument = documentState.pages && documentState.pages.length > 0;
  const docText = React.useMemo(() => extractDocumentText(documentState), [documentState]);
  const tokenCount = React.useMemo(() => estimateTokens(docText), [docText]);

  const extractInsights = async () => {
    if (!hasDocument || !docText || docText.trim().length === 0) {
      setErrorMsg('Please select or upload a readable PDF document first.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentText: docText,
          fileName: documentState.fileName || 'document.pdf',
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Failed to extract document insights');
      }

      setInsights(resData.data);
      onShowToast('Document insights extracted successfully!', 'success');
    } catch (err: any) {
      console.error('Insights error:', err);
      setErrorMsg(err.message || 'Failed to extract insights. Please check your AI API key.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && hasDocument && !insights && !isLoading && !errorMsg) {
      extractInsights();
    }
  }, [isOpen, hasDocument]);

  const handleApplySmartName = () => {
    if (!insights?.suggestedFileName || !onRenameDocument) return;
    onRenameDocument(insights.suggestedFileName);
    onShowToast(`Renamed document to "${insights.suggestedFileName}"`, 'success');
  };

  const handleExportCSV = () => {
    if (!insights) return;

    let csvContent = 'data:text/csv;charset=utf-8,Category,Field,Value\n';
    csvContent += `Metadata,Document Type,"${insights.documentType || 'N/A'}"\n`;
    csvContent += `Metadata,Language,"${insights.language || 'English'}"\n`;

    (insights.entities || []).forEach((e) => {
      csvContent += `Entity,"${(e.label || '').replace(/"/g, '""')}","${(e.value || '').replace(/"/g, '""')}"\n`;
    });

    if (insights.tableRows && insights.tableRows.length > 0) {
      csvContent += '\nTable / Line Items\n';
      const keys = Object.keys(insights.tableRows[0] || {});
      csvContent += keys.join(',') + '\n';
      insights.tableRows.forEach((row) => {
        const rowVals = keys.map((k) => `"${String(row[k] || '').replace(/"/g, '""')}"`);
        csvContent += rowVals.join(',') + '\n';
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const baseName = (documentState.fileName || 'document').replace(/\.[^/.]+$/, '');
    link.setAttribute('download', `${baseName}_insights.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('Exported insights as CSV', 'success');
  };

  const handleExportJSON = () => {
    if (!insights) return;
    const jsonStr = JSON.stringify(insights, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const baseName = (documentState.fileName || 'document').replace(/\.[^/.]+$/, '');
    a.href = url;
    a.download = `${baseName}_insights.json`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast('Exported structured JSON', 'success');
  };

  const handleCopy = () => {
    if (!insights) return;
    navigator.clipboard.writeText(JSON.stringify(insights, null, 2));
    setIsCopied(true);
    onShowToast('Copied JSON insights to clipboard', 'info');
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content ai-modal-card"
        style={{ maxWidth: '750px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              className="tool-card-icon"
              style={{
                background: 'linear-gradient(135deg, #06b6d4, #0284c7)',
                width: '36px',
                height: '36px',
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="modal-title">AI Document Intelligence & Insights</h3>
              <p className="modal-subtitle">
                Automated classification, key entity extraction & structured table parsing
              </p>
            </div>
          </div>
          <button className="nav-btn" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          accept="application/pdf,.pdf"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f && onOpenFile) {
              onOpenFile(f);
            }
          }}
        />

        {/* Modal Body */}
        <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
          {!hasDocument ? (
            <div style={{ textAlign: 'center', padding: '36px 20px' }}>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  marginBottom: '14px',
                  boxShadow: '0 8px 20px rgba(6, 182, 212, 0.3)',
                }}
              >
                <FolderOpen size={26} />
              </div>
              <h4 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
                Please select or upload a PDF
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '380px', margin: '0 auto 20px', lineHeight: '1.5' }}>
                To extract structured insights, entities, and table data, AI needs a PDF document to analyze.
              </p>

              {onOpenFile && (
                <button
                  type="button"
                  className="btn-primary"
                  style={{
                    padding: '10px 22px',
                    fontSize: '13.5px',
                    margin: '0 auto 18px',
                    background: 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)',
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={16} />
                  <span>Choose PDF Document</span>
                </button>
              )}

              {onLoadSample && (
                <div style={{ marginTop: '10px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                    Or extract insights from a sample template:
                  </span>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button className="sample-chip" onClick={() => onLoadSample('invoice')}>
                      📄 Invoice (Tables & Amounts)
                    </button>
                    <button className="sample-chip" onClick={() => onLoadSample('contract')}>
                      ⚖️ NDA (Dates & Parties)
                    </button>
                    <button className="sample-chip" onClick={() => onLoadSample('resume')}>
                      📝 Resume (Entities)
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : isLoading ? (
            <div className="ai-loading-state">
              <div className="ai-typing-indicator" style={{ marginBottom: '12px' }}>
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
              <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                Extracting structured entities with AI Intelligence...
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Classifying document type, identifying key parties, deadlines, and amounts.
              </p>
            </div>
          ) : errorMsg ? (
            <div className="ai-error-banner">
              <AlertCircle size={20} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', marginBottom: '2px' }}>Failed to extract insights</div>
                <div style={{ fontSize: '12.5px' }}>{errorMsg}</div>
              </div>
              <button className="btn-secondary" onClick={extractInsights} style={{ padding: '4px 10px' }}>
                <RefreshCw size={13} />
                <span>Retry</span>
              </button>
            </div>
          ) : insights ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Classification Card */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
                    Document Classification
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>
                    {insights.documentType}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <span className="ai-model-badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                    Confidence: {insights.confidence || 'High'}
                  </span>
                  <span className="ai-model-badge" style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}>
                    {insights.language || 'English'}
                  </span>
                </div>
              </div>

              {/* Smart Rename Card */}
              {insights.suggestedFileName && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    backgroundColor: 'rgba(99, 102, 241, 0.08)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={16} style={{ color: 'var(--accent-primary)' }} />
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                      Suggested Smart Name:{' '}
                      <strong style={{ color: 'var(--accent-primary)' }}>{insights.suggestedFileName}</strong>
                    </span>
                  </div>
                  {onRenameDocument && (
                    <button className="btn-secondary" onClick={handleApplySmartName} style={{ padding: '4px 10px', fontSize: '12px' }}>
                      <CheckCircle2 size={13} />
                      <span>Apply Name</span>
                    </button>
                  )}
                </div>
              )}

              {/* Extracted Key Entities */}
              {insights.entities && insights.entities.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '13.5px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
                    Extracted Key Entities
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '10px' }}>
                    {insights.entities.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '10px 12px',
                          backgroundColor: 'var(--bg-tertiary)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px', wordBreak: 'break-word' }}>
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Insights List */}
              {insights.quickInsights && insights.quickInsights.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '13.5px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
                    Key Observations
                  </h4>
                  <ul style={{ paddingLeft: '18px', margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    {insights.quickInsights.map((q, idx) => (
                      <li key={idx}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Extracted Tables / Line Items */}
              {insights.tableRows && insights.tableRows.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '13.5px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
                    Extracted Line Items & Tables
                  </h4>
                  <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>
                          {Object.keys(insights.tableRows[0] || {}).map((k) => (
                            <th key={k} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '700' }}>
                              {k}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {insights.tableRows.map((row, rIdx) => (
                          <tr key={rIdx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            {Object.keys(insights.tableRows![0] || {}).map((k) => (
                              <td key={k} style={{ padding: '8px 12px' }}>
                                {String(row[k] || '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button
            className="btn-secondary"
            onClick={extractInsights}
            disabled={isLoading || !hasDocument}
            title={!hasDocument ? 'Please select a PDF document first' : 'Re-analyze document'}
          >
            <RefreshCw size={14} className={isLoading ? 'spin-icon' : ''} />
            <span>Re-analyze</span>
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn-secondary"
              onClick={handleCopy}
              disabled={!insights || isLoading}
            >
              {isCopied ? <Check size={14} /> : <Copy size={14} />}
              <span>{isCopied ? 'Copied' : 'Copy JSON'}</span>
            </button>
            <button
              className="btn-secondary"
              onClick={handleExportCSV}
              disabled={!insights || isLoading}
            >
              <FileSpreadsheet size={14} />
              <span>Export CSV</span>
            </button>
            <button
              className="btn-primary"
              onClick={handleExportJSON}
              disabled={!insights || isLoading}
            >
              <FileCode size={14} />
              <span>Export JSON</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
