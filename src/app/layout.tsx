import type { Metadata } from 'next';
import './globals.css';
import './editor.css';

export const metadata: Metadata = {
  title: 'PDFly — Next-Gen PDF Studio with Smart Font Matching',
  description:
    'Edit any PDF online with automatic font matching, in-place text editing, annotations, digital signatures, vector shapes, and page management with 100% privacy and high-fidelity vector PDF export.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark">
      <body>{children}</body>
    </html>
  );
}
