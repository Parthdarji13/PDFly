'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Check,
  Copy,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Languages,
  CheckCircle2,
  FileEdit,
} from 'lucide-react';
import { TextElement } from '../../lib/types';

interface AiTextAssistModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTextElement: TextElement | null;
  onApplyReplacement: (elementId: string, newText: string) => void;
  onShowToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

const ACTION_PRESETS = [
  { id: 'fix_grammar', label: '✍️ Fix Grammar & Typos', desc: 'Fix spelling, punctuation, capitalization' },
  { id: 'make_concise', label: '✂️ Make Concise', desc: 'Remove fluff while keeping core meaning' },
  { id: 'tone_formal', label: '👔 Formal Business', desc: 'Polished, authoritative executive tone' },
  { id: 'tone_casual', label: '💬 Casual & Friendly', desc: 'Approachable, warm conversational tone' },
  { id: 'tone_persuasive', label: '🎯 Persuasive', desc: 'Compelling and action-oriented tone' },
  { id: 'tone_legal', label: '⚖️ Legal & Contractual', desc: 'Precise and unambiguous terminology' },
  { id: 'translate', label: '🌐 Translate', desc: 'Accurate multilingual translation' },
];

const LANGUAGES = [
  'Spanish',
  'French',
  'German',
  'Japanese',
  'Chinese (Simplified)',
  'Hindi',
  'Portuguese',
  'Arabic',
  'Italian',
  'Russian',
];

export const AiTextAssistModal: React.FC<AiTextAssistModalProps> = ({
  isOpen,
  onClose,
  selectedTextElement,
  onApplyReplacement,
  onShowToast,
}) => {
  const [currentAction, setCurrentAction] = useState<string>('fix_grammar');
  const [targetLanguage, setTargetLanguage] = useState<string>('Spanish');
  const [originalText, setOriginalText] = useState<string>('');
  const [improvedText, setImprovedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Sync original text when modal opens or element changes
  useEffect(() => {
    if (selectedTextElement) {
      setOriginalText(selectedTextElement.text || '');
      setImprovedText('');
      setErrorMsg(null);
    }
  }, [selectedTextElement, isOpen]);

  const handleProcessText = async (actionToUse?: string) => {
    const action = actionToUse || currentAction;
    if (!originalText.trim()) {
      setErrorMsg('Please enter or select text to transform.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/ai/edit-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalText: originalText.trim(),
          action,
          targetLanguage: action === 'translate' ? targetLanguage : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process AI text assist');
      }

      setImprovedText(data.improvedText || '');
    } catch (err: any) {
      console.error('AI Text Assist error:', err);
      setErrorMsg(err.message || 'Failed to process AI text assist. Please check your API key.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptReplacement = () => {
    if (!selectedTextElement || !improvedText) return;
    onApplyReplacement(selectedTextElement.id, improvedText);
    onShowToast('Applied AI text replacement to canvas', 'success');
    onClose();
  };

  const handleCopyImproved = () => {
    if (!improvedText) return;
    navigator.clipboard.writeText(improvedText);
    setIsCopied(true);
    onShowToast('Improved text copied to clipboard', 'info');
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content ai-modal-card"
        style={{ maxWidth: '780px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              className="tool-card-icon"
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                width: '36px',
                height: '36px',
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="modal-title">AI Smart Text Assist</h3>
              <p className="modal-subtitle">
                Transform, refine, and translate canvas text with AI Intelligence
              </p>
            </div>
          </div>
          <button className="nav-btn" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
          {/* Action Selector Pills */}
          <div style={{ marginBottom: '14px' }}>
            <span className="inspector-label" style={{ marginBottom: '6px', display: 'block' }}>
              Choose AI Action:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {ACTION_PRESETS.map((act) => (
                <button
                  key={act.id}
                  className={`sample-chip ${currentAction === act.id ? 'active' : ''}`}
                  style={{
                    backgroundColor:
                      currentAction === act.id ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    color: currentAction === act.id ? '#ffffff' : 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                    padding: '6px 12px',
                    fontSize: '12.5px',
                  }}
                  onClick={() => {
                    setCurrentAction(act.id);
                    handleProcessText(act.id);
                  }}
                >
                  {act.label}
                </button>
              ))}
            </div>
          </div>

          {/* Translation Language Selector */}
          {currentAction === 'translate' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Languages size={16} style={{ color: 'var(--accent-primary)' }} />
              <span className="inspector-label">Translate to:</span>
              <select
                className="inspector-select"
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                style={{ width: '180px' }}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
              <button
                className="btn-secondary"
                onClick={() => handleProcessText('translate')}
                style={{ padding: '4px 10px' }}
              >
                Translate Now
              </button>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="ai-error-banner" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
              <button
                className="btn-secondary"
                style={{ padding: '4px 10px', fontSize: '11.5px', flexShrink: 0 }}
                onClick={() => handleProcessText()}
              >
                <RefreshCw size={12} />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* Side-by-Side Diff Comparison */}
          <div className="ai-diff-grid">
            {/* Left Column: Original Text */}
            <div className="ai-diff-column">
              <div className="ai-diff-header">
                <span>Original Text</span>
                <span className="ai-diff-badge original">Before</span>
              </div>
              <textarea
                className="ai-diff-textarea"
                value={originalText}
                onChange={(e) => setOriginalText(e.target.value)}
                placeholder="Enter or edit text here..."
              />
            </div>

            {/* Middle Divider Icon */}
            <div className="ai-diff-arrow">
              <ArrowRight size={18} />
            </div>

            {/* Right Column: AI Improved Text */}
            <div className="ai-diff-column">
              <div className="ai-diff-header">
                <span>AI Refined Text</span>
                <span className="ai-diff-badge improved">AI Refined</span>
              </div>

              {isLoading ? (
                <div className="ai-diff-loading">
                  <div className="ai-typing-indicator" style={{ marginBottom: '8px' }}>
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Generating refined text...
                  </span>
                </div>
              ) : (
                <textarea
                  className="ai-diff-textarea improved-box"
                  value={improvedText}
                  onChange={(e) => setImprovedText(e.target.value)}
                  placeholder="AI improved text will appear here. Click an action above to transform."
                />
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button
            className="btn-secondary"
            onClick={() => handleProcessText()}
            disabled={isLoading || !originalText.trim()}
          >
            <RefreshCw size={14} className={isLoading ? 'spin-icon' : ''} />
            <span>Regenerate</span>
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn-secondary"
              onClick={handleCopyImproved}
              disabled={!improvedText || isLoading}
            >
              {isCopied ? <Check size={14} /> : <Copy size={14} />}
              <span>{isCopied ? 'Copied' : 'Copy Result'}</span>
            </button>
            <button
              className="btn-primary"
              onClick={handleAcceptReplacement}
              disabled={!improvedText || isLoading}
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
            >
              <CheckCircle2 size={15} />
              <span>Accept & Replace on Canvas</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
