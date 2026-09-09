# PDFly — AI-Powered Next-Gen PDF Editor & Studio 🚀

**PDFly** is a high-performance Next.js + TypeScript PDF editor and document intelligence workspace powered by **Anthropic Claude AI (`claude-sonnet-4-6` / `claude-3-5-sonnet`)**. It combines 100% private client-side vector editing, automatic font matching, multi-page organizing, and secure server-side AI intelligence.

---

## ✨ AI-Powered Features (Anthropic Claude)

PDFly integrates Anthropic's Claude API through secure server-side Next.js route handlers (`/api/ai/*`) where API keys remain strictly confidential on the server and are never exposed to client browsers.

### 1. 💬 Chat with Your PDF (`POST /api/ai/chat`)
- Slide-out AI assistant drawer to ask questions about your document's contents.
- Automatic text extraction from all PDF pages and added text elements with natural reading order reconstruction.
- Smart context windowing (preserves critical sections while staying within token limits).
- Quick question chips (Executive summary, Financial totals, Milestones & dates, Legal obligations, Page-specific explanations).
- Multi-turn conversation history with 1-click answer copy.

### 2. 📝 AI Auto-Summarize (`POST /api/ai/summarize`)
- Synthesizes any PDF into an Executive Overview, Key Highlights & Takeaways, and Action Items.
- 1-click export to Markdown (`.md`), Plain Text (`.txt`), or clipboard.
- Fast re-generation with custom summary lengths.

### 3. ✍️ AI Smart Text Assist & Diff (`POST /api/ai/edit-assist`)
- Select any text element on the canvas and trigger **✨ AI Assist** in the floating inspector.
- Transformation presets:
  - **✍️ Fix Grammar & Typos**
  - **✂️ Make Concise & Direct**
  - **👔 Formal Business Tone**
  - **💬 Casual & Friendly**
  - **🎯 Persuasive & Compelling**
  - **⚖️ Legal & Contractual Precision**
  - **🌐 Multilingual Translation** (Spanish, French, German, Japanese, Chinese, Hindi, Portuguese, Arabic, Italian, Russian)
- Visual side-by-side **Diff view** (Original vs. AI Improved).
- Direct **"Accept & Replace on Canvas"** 1-click update.

### 4. 🧠 AI Document Intelligence & Insights (`POST /api/ai/insights`)
- Automated classification (Invoice, Contract, Resume, Financial Report, etc.) with confidence scoring.
- Smart File Renamer: Suggests clean, descriptive filenames with 1-click rename.
- Structured entity extraction:
  - Document IDs & Reference numbers
  - Key Dates & Deadlines
  - Primary Organizations & Counterparties
  - Monetary Totals & Currencies
- Table & Line-Item parser.
- Export insights to structured **CSV (`.csv`)** and **JSON (`.json`)**.

---

## 🔒 Security, Robustness & Retry Logic

- **Anthropic Claude Exclusive:** All AI calls communicate directly with `https://api.anthropic.com/v1/messages` using `claude-sonnet-4-6` (with `claude-3-5-sonnet-20241022` fallback).
- **Zero Key Leakage:** `ANTHROPIC_API_KEY` is loaded strictly on the server in Next.js route handlers. No API key is sent to or stored in the browser.
- **Exponential Backoff Retries:** Automatically performs up to 3 retries with exponential backoff on HTTP 429 (Rate limit), 503 (Service unavailable), 529 (Overloaded), and network failures so temporary traffic spikes do not fail user requests.
- **User-Friendly Error Handling:** If all retries fail, clean and reassuring messages are surfaced in the UI (*"The AI assistant is temporarily busy. Please try again in a moment."*) rather than raw unformatted API stack traces.
- **In-Memory Rate Limiting:** Built-in sliding rate limiters protect routes from client-side flooding.
- **Context Guardrails:** Safe text chunking prevents payload overflows and handles documents of any page length.

---

## 🛠️ Environment Configuration

1. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

2. Add your Anthropic API Key in `.env.local`:
```env
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-api-key-here
ANTHROPIC_MODEL=claude-sonnet-4-6
```

> **Note:** If `claude-sonnet-4-6` is not enabled on your Anthropic account tier, PDFly will automatically fallback to `claude-3-5-sonnet-20241022`.

---

## 🚀 Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Core Editor Capabilities

- **Edit Original Text:** Vector font matching (detects family, weight, point size, and fill color).
- **Add Elements:** Text boxes, vector shapes (rectangles, circles, lines, arrows, checkmarks), freehand pen, and transparent highlighters.
- **Digital Signatures:** Draw by hand, type in cursive, or upload PNG/SVG signature images.
- **Page Organizer:** Rotate 90°, reorder, duplicate, add blank pages, or delete pages.
- **PDF Conversion:** PDF to JPG/PNG image extraction & Image to multi-page PDF generator.
- **PDF Tools:** Merge multiple PDFs, split page ranges, compress file size, add diagonal text watermarks, and redact/whiteout.
- **Export Engine:** High-fidelity PDF generation with standard embedded fonts.
