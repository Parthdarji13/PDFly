'use client';

import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Edit3,
  Combine,
  Scissors,
  Minimize2,
  FilePlus,
  Layers,
  PenLine,
  Eraser,
  Lock,
  Unlock,
  ArrowRight,
  Sun,
  Moon,
  ShieldCheck,
  Zap,
  Gift,
  FileText,
  MessageSquare,
  Languages,
  Table,
  UploadCloud,
  Check,
  Send,
  FileSpreadsheet,
} from 'lucide-react';
import { AppState } from '../../lib/state/store';

export type ToolId =
  | 'edit'
  | 'chat'
  | 'summarize'
  | 'insights'
  | 'aiAssist'
  | 'merge'
  | 'split'
  | 'compress'
  | 'pdfToImage'
  | 'imageToPdf'
  | 'organize'
  | 'watermark'
  | 'sign'
  | 'redact'
  | 'searchReplace'
  | 'protect'
  | 'unlock'
  | 'blank';

interface HomePageProps {
  state: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
  onOpenTool: (toolId: ToolId) => void;
  onOpenFile: (file: File) => void;
  onLoadSample: (sampleType: 'invoice' | 'resume' | 'contract' | 'blank') => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  state,
  onUpdateState,
  onOpenTool,
  onOpenFile,
  onLoadSample,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleTheme = () => {
    const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    onUpdateState((prev) => ({ ...prev, theme: nextTheme }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        onOpenFile(file);
      } else if (file.type.startsWith('image/')) {
        onOpenTool('imageToPdf');
      }
    }
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput.trim()) {
      setSubscribed(true);
      setEmailInput('');
      setTimeout(() => setSubscribed(false), 4000);
    }
  };

  return (
    <div className="home-container" data-theme={state.theme}>
      {/* Hidden File Input for Direct PDF Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="application/pdf"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onOpenFile(f);
        }}
      />

      {/* ================= 1. Top Navigation Bar ================= */}
      <header className="home-nav">
        <div className="home-nav-inner">
          {/* Logo & Brand */}
          <div className="brand-section" onClick={() => onOpenTool('edit')} style={{ cursor: 'pointer' }}>
            <div className="brand-logo" title="PDFly">
              <Sparkles size={18} />
            </div>
            <div className="brand-meta">
              <div className="brand-title-wrap">
                <span className="brand-title">PDFly</span>
                <span className="brand-arrow-icon">✈</span>
              </div>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="home-nav-links">
            <a href="#tools" className="home-nav-link">Tools</a>
            <a href="#ai-studio" className="home-nav-link">AI Studio</a>
            <a href="#templates" className="home-nav-link">Templates</a>
            <a href="#pricing" className="home-nav-link">Pricing</a>
            <a href="#faq" className="home-nav-link">FAQ</a>
          </nav>

          {/* Nav Actions */}
          <div className="home-nav-actions">
            <button className="nav-btn theme-toggle-btn" onClick={toggleTheme} title="Toggle Dark/Light Mode">
              {state.theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            <button
              className="btn-ghost-signin"
              onClick={() => onOpenTool('edit')}
              title="Quick access to workspace"
            >
              Sign in
            </button>

            <button
              className="btn-open-studio"
              onClick={() => onOpenTool('edit')}
            >
              <span>Open Studio</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* ================= 2. Hero Section ================= */}
      <section className="home-hero-section">
        <div className="hero-grid-container">
          {/* Left Column: Heading & CTAs */}
          <div className="hero-left-col">
            <div className="hero-pill-badge">
              <span>Fast. Private. Powerful.</span>
            </div>

            <h1 className="hero-main-title">
              Your PDFs.<br />
              <span className="hero-gradient-text">Smarter. Simpler.</span>
            </h1>

            <p className="hero-lead-text">
              Edit, convert, organize and understand your PDFs with one powerful private workspace. No signup. No limits. Just results.
            </p>

            {/* CTA Buttons */}
            <div className="hero-cta-group">
              <button
                className="btn-hero-primary"
                onClick={() => onOpenTool('edit')}
              >
                <span>Open PDF Studio</span>
                <ArrowRight size={15} />
              </button>

              <a href="#tools" className="btn-hero-secondary">
                Explore Tools
              </a>
            </div>

            {/* Trust Checklist */}
            <div className="hero-trust-list">
              <div className="trust-item">
                <Check size={14} className="trust-check-icon" />
                <span>No signup required</span>
              </div>
              <div className="trust-item">
                <Check size={14} className="trust-check-icon" />
                <span>Files stay on your device</span>
              </div>
              <div className="trust-item">
                <Check size={14} className="trust-check-icon" />
                <span>100% free to start</span>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Upload Card & Social Proof */}
          <div className="hero-right-col">
            {/* Playful Handwritten Note */}
            <div className="try-it-callout">
              <span>Try it now!</span>
              <svg className="curved-arrow" viewBox="0 0 50 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 5 C 30 5, 45 15, 38 35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3"/>
                <path d="M30 30 L 38 36 L 42 26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            {/* Upload Drop Zone Box */}
            <div
              className={`hero-upload-box ${isDragging ? 'dragging' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="upload-cloud-icon-circle">
                <UploadCloud size={30} />
              </div>

              <div className="upload-box-title">Drop your PDF here</div>
              <div className="upload-box-subtitle">or click to browse files</div>

              <button
                type="button"
                className="btn-choose-pdf"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Choose PDF
              </button>

              <div className="upload-box-footnote">Supports PDF files up to 100MB</div>
            </div>

            {/* Social Proof */}
            <div className="social-proof-bar">
              <div className="social-proof-text">
                Trusted by students, professionals and creators worldwide
              </div>
              <div className="social-proof-bottom">
                <div className="avatar-stack">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80"
                    alt="User 1"
                    className="avatar-img"
                  />
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80"
                    alt="User 2"
                    className="avatar-img"
                  />
                  <img
                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&auto=format&fit=crop&q=80"
                    alt="User 3"
                    className="avatar-img"
                  />
                  <img
                    src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&auto=format&fit=crop&q=80"
                    alt="User 4"
                    className="avatar-img"
                  />
                </div>
                <div className="rating-info">
                  <span className="stars">★★★★★</span>
                  <span className="score">4.8/5</span>
                  <span className="count">from 10,000+ happy users</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 3. Feature Highlights Bar ================= */}
      <section className="feature-highlights-bar">
        <div className="feature-highlight-card">
          <div className="highlight-icon-box icon-blue">
            <Zap size={20} />
          </div>
          <div className="highlight-content">
            <h4>All-in-One</h4>
            <p>Edit, convert, merge, split and more — in one place.</p>
          </div>
        </div>

        <div className="feature-highlight-card">
          <div className="highlight-icon-box icon-purple">
            <Sparkles size={20} />
          </div>
          <div className="highlight-content">
            <h4>AI-Powered</h4>
            <p>Summarize, extract, chat and understand your PDFs.</p>
          </div>
        </div>

        <div className="feature-highlight-card">
          <div className="highlight-icon-box icon-green">
            <ShieldCheck size={20} />
          </div>
          <div className="highlight-content">
            <h4>100% Private</h4>
            <p>Your files never leave your device.</p>
          </div>
        </div>

        <div className="feature-highlight-card">
          <div className="highlight-icon-box icon-violet">
            <Gift size={20} />
          </div>
          <div className="highlight-content">
            <h4>Free to Use</h4>
            <p>Powerful tools, no signup, no hidden fees.</p>
          </div>
        </div>
      </section>

      {/* ================= 4. AI Studio Section ================= */}
      <section id="ai-studio" className="home-ai-studio-section">
        <div className="section-header-wrap">
          <div className="section-pill-tag">AI STUDIO</div>
        </div>

        <div className="ai-studio-grid">
          {/* Left Column */}
          <div className="ai-studio-left">
            <h2 className="ai-studio-title">
              Give your PDFs <span className="text-purple-accent">a brain.</span>
            </h2>
            <p className="ai-studio-subtitle">
              Use AI to summarize, extract data, chat, rewrite and do much more.
            </p>
            <button
              className="btn-explore-ai"
              onClick={() => onOpenTool('chat')}
            >
              <span>Explore AI Studio</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Right Column: 4 AI Cards */}
          <div className="ai-cards-row">
            {/* Card 1: Chat with PDF */}
            <div className="ai-feature-card" onClick={() => onOpenTool('chat')}>
              <div className="ai-card-icon icon-bg-purple">
                <MessageSquare size={20} />
              </div>
              <h3 className="ai-card-title">Chat with PDF</h3>
              <p className="ai-card-desc">Ask questions and get instant answers</p>
            </div>

            {/* Card 2: Summarize PDF */}
            <div className="ai-feature-card" onClick={() => onOpenTool('summarize')}>
              <div className="ai-card-icon icon-bg-red">
                <FileText size={20} />
              </div>
              <h3 className="ai-card-title">Summarize PDF</h3>
              <p className="ai-card-desc">Get concise summaries</p>
            </div>

            {/* Card 3: Extract Data */}
            <div className="ai-feature-card" onClick={() => onOpenTool('insights')}>
              <div className="ai-card-icon icon-bg-blue">
                <Table size={20} />
              </div>
              <h3 className="ai-card-title">Extract Data</h3>
              <p className="ai-card-desc">Pull key information</p>
            </div>

            {/* Card 4: Rewrite & Translate */}
            <div className="ai-feature-card" onClick={() => onOpenTool('aiAssist')}>
              <div className="ai-card-icon icon-bg-indigo">
                <Languages size={20} />
              </div>
              <h3 className="ai-card-title">Rewrite & Translate</h3>
              <p className="ai-card-desc">Rewrite, simplify or translate content</p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 5. PDF Tools Section ================= */}
      <section id="tools" className="home-pdf-tools-section">
        <div className="section-header-wrap">
          <div className="section-pill-tag">PDF TOOLS</div>
        </div>

        <div className="pdf-tools-header-row">
          <div>
            <h2 className="pdf-tools-title">
              Everything you need. <span className="text-indigo-accent">One workspace.</span>
            </h2>
            <p className="pdf-tools-subtitle">
              Powerful and easy-to-use tools to handle your PDFs, all in one place.
            </p>
          </div>
          <button className="btn-view-all-tools" onClick={() => onOpenTool('edit')}>
            <span>View all tools</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* 10 Tools 5x2 Grid */}
        <div className="tools-10-grid">
          {/* 1. Edit PDF */}
          <div className="tool-tile-card" onClick={() => onOpenTool('edit')}>
            <div className="tool-tile-top">
              <div className="tool-tile-icon-box bg-blue-tint">
                <Edit3 size={18} />
              </div>
              <ArrowRight size={14} className="tool-arrow-link" />
            </div>
            <h3 className="tool-tile-title">Edit PDF</h3>
            <p className="tool-tile-desc">Add text, images, shapes and more</p>
          </div>

          {/* 2. Merge PDF */}
          <div className="tool-tile-card" onClick={() => onOpenTool('merge')}>
            <div className="tool-tile-top">
              <div className="tool-tile-icon-box bg-purple-tint">
                <Combine size={18} />
              </div>
              <ArrowRight size={14} className="tool-arrow-link" />
            </div>
            <h3 className="tool-tile-title">Merge PDF</h3>
            <p className="tool-tile-desc">Combine multiple PDFs into one</p>
          </div>

          {/* 3. Split PDF */}
          <div className="tool-tile-card" onClick={() => onOpenTool('split')}>
            <div className="tool-tile-top">
              <div className="tool-tile-icon-box bg-orange-tint">
                <Scissors size={18} />
              </div>
              <ArrowRight size={14} className="tool-arrow-link" />
            </div>
            <h3 className="tool-tile-title">Split PDF</h3>
            <p className="tool-tile-desc">Extract or split pages easily</p>
          </div>

          {/* 4. Compress PDF */}
          <div className="tool-tile-card" onClick={() => onOpenTool('compress')}>
            <div className="tool-tile-top">
              <div className="tool-tile-icon-box bg-green-tint">
                <Minimize2 size={18} />
              </div>
              <ArrowRight size={14} className="tool-arrow-link" />
            </div>
            <h3 className="tool-tile-title">Compress PDF</h3>
            <p className="tool-tile-desc">Reduce file size without losing quality</p>
          </div>

          {/* 5. Convert PDF */}
          <div className="tool-tile-card" onClick={() => onOpenTool('pdfToImage')}>
            <div className="tool-tile-top">
              <div className="tool-tile-icon-box bg-red-tint">
                <FileSpreadsheet size={18} />
              </div>
              <ArrowRight size={14} className="tool-arrow-link" />
            </div>
            <h3 className="tool-tile-title">Convert PDF</h3>
            <p className="tool-tile-desc">To Word, Excel, PPT, JPG and more</p>
          </div>

          {/* 6. Sign PDF */}
          <div className="tool-tile-card" onClick={() => onOpenTool('sign')}>
            <div className="tool-tile-top">
              <div className="tool-tile-icon-box bg-pink-tint">
                <PenLine size={18} />
              </div>
              <ArrowRight size={14} className="tool-arrow-link" />
            </div>
            <h3 className="tool-tile-title">Sign PDF</h3>
            <p className="tool-tile-desc">Add digital signatures</p>
          </div>

          {/* 7. Redact PDF */}
          <div className="tool-tile-card" onClick={() => onOpenTool('redact')}>
            <div className="tool-tile-top">
              <div className="tool-tile-icon-box bg-rose-tint">
                <Eraser size={18} />
              </div>
              <ArrowRight size={14} className="tool-arrow-link" />
            </div>
            <h3 className="tool-tile-title">Redact PDF</h3>
            <p className="tool-tile-desc">Hide sensitive information</p>
          </div>

          {/* 8. Organize PDF */}
          <div className="tool-tile-card" onClick={() => onOpenTool('organize')}>
            <div className="tool-tile-top">
              <div className="tool-tile-icon-box bg-cyan-tint">
                <Layers size={18} />
              </div>
              <ArrowRight size={14} className="tool-arrow-link" />
            </div>
            <h3 className="tool-tile-title">Organize PDF</h3>
            <p className="tool-tile-desc">Reorder, rotate and delete pages</p>
          </div>

          {/* 9. Protect PDF */}
          <div className="tool-tile-card" onClick={() => onOpenTool('watermark')}>
            <div className="tool-tile-top">
              <div className="tool-tile-icon-box bg-amber-tint">
                <Lock size={18} />
              </div>
              <ArrowRight size={14} className="tool-arrow-link" />
            </div>
            <h3 className="tool-tile-title">Protect PDF</h3>
            <p className="tool-tile-desc">Add password encryption</p>
          </div>

          {/* 10. Unlock PDF */}
          <div className="tool-tile-card" onClick={() => onOpenTool('edit')}>
            <div className="tool-tile-top">
              <div className="tool-tile-icon-box bg-orange-tint">
                <Unlock size={18} />
              </div>
              <ArrowRight size={14} className="tool-arrow-link" />
            </div>
            <h3 className="tool-tile-title">Unlock PDF</h3>
            <p className="tool-tile-desc">Remove password protection</p>
          </div>
        </div>
      </section>

      {/* ================= 6. Templates Section ================= */}
      <section id="templates" className="home-templates-section">
        <div className="section-header-wrap">
          <div className="section-pill-tag">TEMPLATES</div>
        </div>

        <div className="templates-layout-grid">
          {/* Left Column */}
          <div className="templates-left-col">
            <h2 className="templates-title">Get started with ready-to-use templates.</h2>
            <p className="templates-subtitle">Save time with professionally designed PDF templates.</p>
            <button
              className="btn-browse-templates"
              onClick={() => onLoadSample('invoice')}
            >
              <span>Browse templates</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Right Column: 4 Document Previews */}
          <div className="templates-preview-row">
            {/* Template 1: Invoice */}
            <div className="template-card" onClick={() => onLoadSample('invoice')}>
              <div className="template-doc-thumbnail">
                <div className="mini-doc invoice-doc">
                  <div className="mini-doc-header">
                    <div className="mini-bar blue-bar" />
                    <div className="mini-bar short-bar" />
                  </div>
                  <div className="mini-doc-table">
                    <div className="mini-row head-row" />
                    <div className="mini-row" />
                    <div className="mini-row" />
                    <div className="mini-row" />
                  </div>
                  <div className="mini-doc-total">
                    <div className="mini-bar blue-bar" style={{ width: '40%', marginLeft: 'auto' }} />
                  </div>
                </div>
              </div>
              <span className="template-name">Invoice</span>
            </div>

            {/* Template 2: Resume */}
            <div className="template-card" onClick={() => onLoadSample('resume')}>
              <div className="template-doc-thumbnail">
                <div className="mini-doc resume-doc">
                  <div className="mini-resume-header">
                    <div className="mini-circle-avatar" />
                    <div className="mini-resume-name">
                      <div className="mini-bar" style={{ width: '80%' }} />
                      <div className="mini-bar" style={{ width: '50%' }} />
                    </div>
                  </div>
                  <div className="mini-resume-columns">
                    <div className="mini-resume-left">
                      <div className="mini-bar" />
                      <div className="mini-bar" />
                      <div className="mini-bar" />
                    </div>
                    <div className="mini-resume-right">
                      <div className="mini-bar" />
                      <div className="mini-bar" />
                      <div className="mini-bar" />
                      <div className="mini-bar" />
                    </div>
                  </div>
                </div>
              </div>
              <span className="template-name">Resume</span>
            </div>

            {/* Template 3: NDA Agreement */}
            <div className="template-card" onClick={() => onLoadSample('contract')}>
              <div className="template-doc-thumbnail">
                <div className="mini-doc nda-doc">
                  <div className="mini-bar" style={{ width: '60%', margin: '0 auto 8px auto', height: '4px' }} />
                  <div className="mini-bar" style={{ width: '90%' }} />
                  <div className="mini-bar" style={{ width: '100%' }} />
                  <div className="mini-bar" style={{ width: '85%' }} />
                  <div className="mini-bar" style={{ width: '95%' }} />
                  <div className="mini-bar" style={{ width: '70%' }} />
                  <div className="mini-sig-lines">
                    <div className="mini-sig-box" />
                    <div className="mini-sig-box" />
                  </div>
                </div>
              </div>
              <span className="template-name">NDA Agreement</span>
            </div>

            {/* Template 4: Blank Document */}
            <div className="template-card" onClick={() => onLoadSample('blank')}>
              <div className="template-doc-thumbnail">
                <div className="mini-doc blank-doc">
                  <div className="blank-watermark-icon">
                    <FilePlus size={24} style={{ opacity: 0.2 }} />
                  </div>
                </div>
              </div>
              <span className="template-name">Blank Document</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 7. Bottom Banner CTA Card ================= */}
      <section className="home-cta-banner-section">
        <div className="cta-banner-card">
          <div className="cta-banner-left">
            <h2 className="cta-banner-title">
              Stop fighting with PDFs.<br />
              Start creating.
            </h2>
            <p className="cta-banner-subtitle">
              A faster, smarter and more private way to work with your documents.
            </p>
          </div>

          <div className="cta-banner-right">
            <button
              className="btn-banner-white"
              onClick={() => onOpenTool('edit')}
            >
              <span>Open PDF Studio</span>
              <ArrowRight size={15} />
            </button>
            <div className="banner-subtext">Free • No signup • Works offline</div>
          </div>
        </div>
      </section>

      {/* ================= 8. Modern Footer ================= */}
      <footer id="faq" className="home-site-footer">
        <div className="footer-columns-container">
          {/* Brand Col */}
          <div className="footer-col footer-brand-col">
            <div className="brand-section">
              <div className="brand-logo" style={{ width: '32px', height: '32px' }}>
                <Sparkles size={16} />
              </div>
              <span className="brand-title" style={{ fontSize: '18px' }}>PDFly</span>
            </div>
            <p className="footer-tagline">Smarter PDFs for a simpler tomorrow.</p>
          </div>

          {/* Product Col */}
          <div className="footer-col">
            <h5 className="footer-heading">Product</h5>
            <ul className="footer-links-list">
              <li><a href="#tools" onClick={() => onOpenTool('edit')}>Tools</a></li>
              <li><a href="#ai-studio" onClick={() => onOpenTool('chat')}>AI Studio</a></li>
              <li><a href="#templates" onClick={() => onLoadSample('invoice')}>Templates</a></li>
              <li><a href="#pricing">Pricing</a></li>
            </ul>
          </div>

          {/* Support Col */}
          <div className="footer-col">
            <h5 className="footer-heading">Support</h5>
            <ul className="footer-links-list">
              <li><a href="#faq">FAQ</a></li>
              <li><a href="mailto:support@pdfly.app">Contact</a></li>
              <li><a href="#privacy">Privacy Policy</a></li>
              <li><a href="#terms">Terms of Service</a></li>
            </ul>
          </div>

          {/* Stay Updated Col */}
          <div className="footer-col footer-subscribe-col">
            <h5 className="footer-heading">Stay updated</h5>
            <p className="footer-sub-text">Get the latest features and tips.</p>

            <form className="footer-subscribe-form" onSubmit={handleSubscribe}>
              <input
                type="email"
                placeholder="Enter your email"
                className="footer-email-input"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
              />
              <button type="submit" className="btn-subscribe">
                {subscribed ? 'Subscribed!' : 'Subscribe'}
              </button>
            </form>

            <div className="footer-social-icons">
              <a href="https://github.com" target="_blank" rel="noreferrer" className="social-icon-btn" title="GitHub">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" className="social-icon-btn" title="Twitter / X">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="social-icon-btn" title="LinkedIn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              </a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer" className="social-icon-btn" title="YouTube">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Sub-footer */}
        <div className="footer-bottom-bar">
          <div className="footer-copyright">
            © {new Date().getFullYear()} PDFly. All rights reserved.
          </div>
          <div className="footer-built-with">
            Built with <span style={{ color: '#ef4444' }}>❤️</span> for a more productive you.
          </div>
        </div>
      </footer>
    </div>
  );
};
