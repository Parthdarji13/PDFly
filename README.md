# PDFly — AI-Powered Next-Gen PDF Editor & Studio 🚀

**PDFly** is a high-performance Next.js + TypeScript PDF editor and document intelligence workspace powered by **Google Gemini AI**. It combines 100% private client-side vector editing, automatic font matching, multi-page organizing, and secure server-side AI intelligence.

---

## ✨ AI-Powered Features (Google Gemini AI)

PDFly integrates Google Gemini API through secure server-side Next.js route handlers (`/api/ai/*`) where API keys remain strictly confidential on the server and are never exposed to client browsers.

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

- **Server-Side AI Engine:** Powered by Google Gemini (`gemini-3.5-flash`, `gemini-flash-lite-latest`, `gemini-3.5-flash-lite`, `gemini-3.6-flash`, `gemini-flash-latest`, `gemini-3.7-flash`, `gemini-pro-latest`).
- **Zero Key Leakage:** API keys are loaded strictly on the server in Next.js route handlers. No API key is ever sent to or stored in the browser.
- **Exponential Backoff Retries:** Automatically performs retries and swift model fallbacks on HTTP 429 (Rate limit), 503 (High demand / Service unavailable), and network timeouts.
- **User-Friendly Error Handling:** If all retries fail, clean and reassuring messages are surfaced in the UI (*"The AI assistant is busy right now. Please try again in a moment."*) rather than raw unformatted API stack traces.
- **In-Memory Rate Limiting:** Built-in sliding rate limiters protect routes from client-side flooding.
- **Context Guardrails:** Safe text chunking prevents payload overflows and handles documents of any page length.

---

## 🛠️ Environment Configuration

1. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

2. Configure your AI API key in `.env.local`:
```env
# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash
```

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
- **Freehand Drawing & Highlighting:** Pressure-smooth SVG annotation tools with opacity control.
- **Vector Shapes:** Rectangles, rounded boxes, circles, lines, arrows, and checkmarks.
- **Digital Signatures:** Draw signature, type cursive signatures, or upload image stamps.
- **Image Insertion:** Insert PNG, JPEG, and vector stamps with rotation & resizing.
- **Multi-Page Management:** Reorder pages, rotate, duplicate, delete, and add blank pages.
- **PDF Operations:** Client-side merge, split by range, page organizing, watermarking, and compression.
