'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Edit3,
  Combine,
  Scissors,
  Minimize2,
  Image as ImageIcon,
  FilePlus,
  Layers,
  Droplet,
  PenLine,
  Eraser,
  Search,
  Plus,
  Sun,
  Moon,
  ShieldCheck,
  Zap,
  Lock,
  ArrowRight,
  FolderOpen,
  ChevronDown,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { AppState } from '../../lib/state/store';

export type ToolId =
  | 'edit'
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
  | 'blank';

interface HomePageProps {
  state: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
  onOpenTool: (toolId: ToolId) => void;
  onOpenFile: (file: File) => void;
  onLoadSample: (sampleType: 'invoice' | 'resume' | 'contract' | 'blank') => void;
}

interface ToolCardInfo {
  id: ToolId;
  title: string;
  description: string;
  category: 'organize' | 'convert' | 'edit' | 'optimize';
  badge?: string;
  icon: React.ReactNode;
  gradient: string;
}

const TOOLS_LIST: ToolCardInfo[] = [
  {
    id: 'edit',
    title: 'Edit PDF',
    description: 'Edit original text with auto font matching, insert shapes, draw annotations, and add images.',
    category: 'edit',
    badge: 'POPULAR',
    icon: <Edit3 size={22} />,
    gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
  },
  {
    id: 'merge',
    title: 'Merge PDF',
    description: 'Combine multiple PDF files in any order you want into a single organized document.',
    category: 'organize',
    badge: 'NEW',
    icon: <Combine size={22} />,
    gradient: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
  },
  {
    id: 'split',
    title: 'Split PDF',
    description: 'Separate one page or a whole set for easy conversion into independent PDF files.',
    category: 'organize',
    icon: <Scissors size={22} />,
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  },
  {
    id: 'compress',
    title: 'Compress PDF',
    description: 'Reduce PDF file size while optimizing for maximal quality and fast loading.',
    category: 'optimize',
    icon: <Minimize2 size={22} />,
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  },
  {
    id: 'pdfToImage',
    title: 'PDF to JPG / PNG',
    description: 'Extract every page of a PDF document into high-resolution JPG or PNG images.',
    category: 'convert',
    icon: <ImageIcon size={22} />,
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)',
  },
  {
    id: 'imageToPdf',
    title: 'JPG / PNG to PDF',
    description: 'Transform multiple photos, scans, and graphic images into a multi-page PDF document.',
    category: 'convert',
    icon: <FilePlus size={22} />,
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
  },
  {
    id: 'organize',
    title: 'Organize Pages',
    description: 'Sort, reorder, rotate 90°, duplicate, or delete unwanted pages in your PDF.',
    category: 'organize',
    icon: <Layers size={22} />,
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
  },
  {
    id: 'watermark',
    title: 'Watermark PDF',
    description: 'Stamp custom text or confidential copyright watermarks over all PDF pages.',
    category: 'edit',
    icon: <Droplet size={22} />,
    gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
  },
  {
    id: 'sign',
    title: 'Sign PDF',
    description: 'Create and place legal digital signatures by drawing, typing cursive, or uploading.',
    category: 'edit',
    badge: 'FEATURED',
    icon: <PenLine size={22} />,
    gradient: 'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)',
  },
  {
    id: 'redact',
    title: 'Redact & Whiteout',
    description: 'Permanently blackout or whiteout sensitive text, numbers, and graphics.',
    category: 'edit',
    icon: <Eraser size={22} />,
    gradient: 'linear-gradient(135deg, #64748b 0%, #334155 100%)',
  },
  {
    id: 'searchReplace',
    title: 'Search & Replace',
    description: 'Find any keyword across the entire PDF and replace it matching original typography.',
    category: 'edit',
    icon: <Search size={22} />,
    gradient: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
  },
  {
    id: 'blank',
    title: 'New Blank PDF',
    description: 'Start with a fresh vector canvas to build invoices, flyers, or documents from scratch.',
    category: 'organize',
    icon: <Plus size={22} />,
    gradient: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
  },
];

const FAQS = [
  {
    q: 'Is PDFly really 100% free and private?',
    a: 'Yes! All PDF processing, font detection, text editing, merging, and rendering executes locally in your web browser. Your files are never uploaded to any cloud server.',
  },
  {
    q: 'How does Smart Font Matching work?',
    a: 'When you click any existing text on a PDF page, PDFly analyzes the vector glyph metrics to match font family, weight, point size, and fill color so your edits blend seamlessly.',
  },
  {
    q: 'Can I combine multiple tools in one workflow?',
    a: 'Absolutely. You can open any PDF in the Studio, add signatures and watermarks, reorder pages, and export your polished document in a single session.',
  },
];

export const HomePage: React.FC<HomePageProps> = ({
  state,
  onUpdateState,
  onOpenTool,
  onOpenFile,
  onLoadSample,
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'organize' | 'convert' | 'edit' | 'optimize'>('all');
  const [isDragging, setIsDragging] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const toggleTheme = () => {
    const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    onUpdateState((prev) => ({ ...prev, theme: nextTheme }));
  };

  const filteredTools =
    activeCategory === 'all'
      ? TOOLS_LIST
      : TOOLS_LIST.filter((t) => t.category === activeCategory);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        onOpenFile(file);
      } else if (file.type.startsWith('image/')) {
        onOpenTool('imageToPdf');
      }
    }
  };

  return (
    <div className="home-container">
      {/* ================= Top Sticky Header ================= */}
      <header className="home-nav">
        <div className="home-nav-inner">
          <div className="brand-section">
            <div className="brand-logo" title="PDFly">
              <Sparkles size={19} />
            </div>
            <div className="brand-meta">
              <div className="brand-title-wrap">
                <span className="brand-title">PDFly</span>
                <span className="brand-badge">PRO</span>
              </div>
            </div>
          </div>

          <nav className="home-nav-links">
            <a href="#tools" className="home-nav-link">Tools</a>
            <a href="#features" className="home-nav-link">Features</a>
            <a href="#templates" className="home-nav-link">Templates</a>
            <a href="#faq" className="home-nav-link">FAQ</a>
          </nav>

          <div className="home-nav-actions">
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
            <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
              <FolderOpen size={15} />
              <span className="hide-on-mobile">Open PDF</span>
            </button>

            <button className="nav-btn" onClick={toggleTheme} title="Toggle Theme">
              {state.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button className="btn-primary" onClick={() => onOpenTool('edit')}>
              <Edit3 size={15} />
              <span>Launch Studio</span>
            </button>
          </div>
        </div>
      </header>

      {/* ================= Hero Section ================= */}
      <section className="home-hero">
        <div className="hero-pill-badge">
          <Sparkles size={14} style={{ color: 'var(--accent-primary)' }} />
          <span>Next-Gen Private PDF Studio</span>
        </div>

        <h1 className="hero-title">
          Every tool you need to work with PDFs in <span className="hero-title-gradient">one place</span>
        </h1>
        <p className="hero-subtitle">
          100% Free, client-side private PDF workspace. Edit original text with auto font matching, merge, split, convert, watermark, and sign documents instantly.
        </p>

        {/* Global File Drop Box */}
        <div
          className={`hero-drop-zone ${isDragging ? 'dragging' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="drop-icon-box">
            <FolderOpen size={28} />
          </div>
          <div>
            <div style={{ fontSize: '15.5px', fontWeight: '700', color: 'var(--text-primary)' }}>
              Select PDF file or drag and drop here
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '3px' }}>
              Files stay completely private on your device. Never uploaded to external servers.
            </div>
          </div>
        </div>

        {/* Quick Sample Launchers */}
        <div id="templates" className="hero-samples-bar">
          <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>✨ Or try instant templates:</span>
          <button className="sample-chip" onClick={() => onLoadSample('invoice')}>
            📄 Business Invoice
          </button>
          <button className="sample-chip" onClick={() => onLoadSample('resume')}>
            👤 Executive Resume
          </button>
          <button className="sample-chip" onClick={() => onLoadSample('contract')}>
            ⚖️ Legal NDA
          </button>
        </div>
      </section>

      {/* ================= Category Tabs & Tools Grid ================= */}
      <section id="tools" className="home-tools-section">
        {/* Category Tabs */}
        <div className="tools-category-tabs">
          {[
            { id: 'all', label: 'All Tools' },
            { id: 'organize', label: 'Organize PDF' },
            { id: 'convert', label: 'Convert to/from PDF' },
            { id: 'edit', label: 'Edit & Security' },
            { id: 'optimize', label: 'Optimize' },
          ].map((cat) => (
            <button
              key={cat.id}
              className={`category-tab-btn ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id as any)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* 12 Interactive Tool Cards Grid */}
        <div className="tools-grid">
          {filteredTools.map((tool) => (
            <div
              key={tool.id}
              className="tool-card"
              onClick={() => onOpenTool(tool.id)}
            >
              <div className="tool-card-header">
                <div className="tool-card-icon" style={{ background: tool.gradient }}>
                  {tool.icon}
                </div>
                {tool.badge && <span className="tool-card-badge">{tool.badge}</span>}
              </div>

              <h3 className="tool-card-title">{tool.title}</h3>
              <p className="tool-card-desc">{tool.description}</p>

              <div className="tool-card-action">
                <span>Launch tool</span>
                <ArrowRight size={14} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= Trust & Features Section ================= */}
      <section id="features" className="home-features-section">
        <div className="feature-trust-card">
          <div style={{ color: 'var(--accent-success)' }}>
            <ShieldCheck size={30} />
          </div>
          <h4>100% Client-Side Privacy</h4>
          <p>Your documents never leave your browser. All PDF rendering, text editing, and page manipulation happens securely on your device.</p>
        </div>

        <div className="feature-trust-card">
          <div style={{ color: 'var(--accent-primary)' }}>
            <Zap size={30} />
          </div>
          <h4>AI Smart Font Matching</h4>
          <p>Click any existing text in your PDF to edit it effortlessly. PDFly automatically extracts and preserves font family, size, and style.</p>
        </div>

        <div className="feature-trust-card">
          <div style={{ color: 'var(--accent-cyan)' }}>
            <Lock size={30} />
          </div>
          <h4>Vector Sharpness</h4>
          <p>Preserves crystal-clear vector fonts, annotations, shapes, and scalable graphic paths upon final PDF export.</p>
        </div>
      </section>

      {/* ================= Interactive FAQ Section ================= */}
      <section id="faq" className="faq-section">
        <h3 className="faq-title">Frequently Asked Questions</h3>
        {FAQS.map((faq, idx) => (
          <div key={idx} className="faq-item">
            <div
              className="faq-question"
              onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
            >
              <span>{faq.q}</span>
              <ChevronDown
                size={18}
                style={{
                  transform: openFaq === idx ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform var(--transition-fast)',
                }}
              />
            </div>
            {openFaq === idx && <div className="faq-answer">{faq.a}</div>}
          </div>
        ))}
      </section>

      {/* ================= Footer ================= */}
      <footer className="home-footer">
        <div className="home-footer-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="brand-logo" style={{ width: '28px', height: '28px' }}>
              <Sparkles size={15} />
            </div>
            <span style={{ fontWeight: '700', fontSize: '15px' }}>PDFly Studio</span>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '12.5px' }}>
            © {new Date().getFullYear()} PDFly. Client-side private PDF workspace.
          </div>
        </div>
      </footer>
    </div>
  );
};
