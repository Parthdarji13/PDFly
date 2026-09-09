'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  X,
  Trash2,
  Copy,
  Check,
  Bot,
  User,
  RefreshCw,
  FileText,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { DocumentState } from '../../lib/types';
import { extractDocumentText, estimateTokens } from '../../lib/ai/textExtractor';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface AiChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  documentState: DocumentState;
  activePageIndex: number;
}

const QUICK_PROMPTS = [
  '📋 Summarize the key points of this document',
  '💰 What are all financial amounts and totals mentioned?',
  '📅 List all key dates, deadlines, and milestones',
  '⚖️ Are there any risks, penalties, or obligations?',
];

export const AiChatDrawer: React.FC<AiChatDrawerProps> = ({
  isOpen,
  onClose,
  documentState,
  activePageIndex,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const docText = React.useMemo(() => extractDocumentText(documentState), [documentState]);
  const tokenCount = React.useMemo(() => estimateTokens(docText), [docText]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputPrompt).trim();
    if (!query || isLoading) return;

    setErrorMsg(null);
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: Date.now(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputPrompt('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentText: docText,
          fileName: documentState.fileName || 'document.pdf',
          messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Error ${response.status}: Failed to get answer`);
      }

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.answer || 'No response generated.',
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setErrorMsg(err.message || 'An unexpected error occurred. Please check your API key.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    setMessages([]);
    setErrorMsg(null);
  };

  if (!isOpen) return null;

  return (
    <div className="ai-drawer-overlay" onClick={onClose}>
      <aside className="ai-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="ai-drawer-header">
          <div className="ai-drawer-header-left">
            <div className="ai-avatar-icon">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="ai-drawer-title">
                <span>PDFly AI Assistant</span>
                <span className="ai-model-badge">AI Intelligence</span>
              </div>
              <div className="ai-drawer-subtitle">
                {documentState.fileName || 'Document'} ({documentState.pageCount} pages, ~{tokenCount.toLocaleString()} tokens)
              </div>
            </div>
          </div>

          <div className="ai-drawer-actions">
            {messages.length > 0 && (
              <button
                className="nav-btn"
                onClick={clearChat}
                title="Clear conversation"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button className="nav-btn" onClick={onClose} title="Close AI Assistant">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Drawer Body / Message List */}
        <div className="ai-drawer-body">
          {messages.length === 0 ? (
            <div className="ai-welcome-container">
              <div className="ai-welcome-badge">
                <Sparkles size={20} />
              </div>
              <h3 className="ai-welcome-title">Ask anything about your PDF</h3>
              <p className="ai-welcome-desc">
                AI will analyze all pages and extract answers, verify clauses, or summarize content with precision citations.
              </p>

              {/* Quick Prompts */}
              <div className="ai-quick-prompts">
                <span className="ai-quick-prompts-label">✨ Quick Questions:</span>
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    className="ai-quick-prompt-btn"
                    onClick={() => handleSendMessage(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
                <button
                  className="ai-quick-prompt-btn"
                  onClick={() =>
                    handleSendMessage(`Explain the contents and details on Page ${activePageIndex + 1}`)
                  }
                >
                  📄 Explain Page {activePageIndex + 1}
                </button>
              </div>
            </div>
          ) : (
            <div className="ai-messages-list">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`ai-message-row ${msg.role === 'user' ? 'user-row' : 'assistant-row'}`}
                >
                  <div className="ai-message-avatar">
                    {msg.role === 'user' ? <User size={15} /> : <Bot size={15} />}
                  </div>

                  <div className="ai-message-bubble">
                    <div className="ai-message-content">
                      {msg.content.split('\n').map((line, lIdx) => (
                        <p key={lIdx} style={{ margin: line ? '4px 0' : '8px 0' }}>
                          {line}
                        </p>
                      ))}
                    </div>

                    <div className="ai-message-footer">
                      <span className="ai-message-time">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {msg.role === 'assistant' && (
                        <button
                          className="ai-copy-btn"
                          onClick={() => copyToClipboard(msg.content, msg.id)}
                          title="Copy message"
                        >
                          {copiedId === msg.id ? <Check size={12} /> : <Copy size={12} />}
                          <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="ai-message-row assistant-row">
                  <div className="ai-message-avatar">
                    <Bot size={15} />
                  </div>
                  <div className="ai-message-bubble loading-bubble">
                    <div className="ai-typing-indicator">
                      <span className="dot" />
                      <span className="dot" />
                      <span className="dot" />
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      AI is analyzing document...
                    </span>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="ai-error-banner">
                  <AlertCircle size={16} />
                  <div style={{ flex: 1 }}>{errorMsg}</div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Drawer Footer / Input Bar */}
        <div className="ai-drawer-footer">
          <div className="ai-input-wrapper">
            <textarea
              ref={textareaRef}
              className="ai-chat-textarea"
              rows={2}
              placeholder="Ask AI a question about this document... (Enter to send)"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            <button
              className="ai-send-btn"
              disabled={!inputPrompt.trim() || isLoading}
              onClick={() => handleSendMessage()}
              title="Send question (Enter)"
            >
              <Send size={16} />
            </button>
          </div>
          <div className="ai-footer-note">
            PDFly AI reads extracted vector and OCR text. Files remain secure and private.
          </div>
        </div>
      </aside>
    </div>
  );
};
