import { DocumentState } from '../types';

/**
 * Extracts and reconstructs clean text in natural reading order from a PDFly DocumentState.
 * Includes both original detected text and user-added text layers.
 */
export function extractDocumentText(docState: DocumentState): string {
  if (!docState || !docState.pages || docState.pages.length === 0) {
    return '';
  }

  const pageTexts: string[] = [];

  docState.pages.forEach((page, pIdx) => {
    const pageLines: string[] = [];
    pageLines.push(`--- PAGE ${pIdx + 1} OF ${docState.pages.length} ---`);

    // 1. Gather original detected text items for this page
    const originalItems = (page.textItems || []).map((item) => ({
      text: item.text || '',
      y: typeof item.visualY === 'number' ? item.visualY : page.height - item.y,
      x: typeof item.visualX === 'number' ? item.visualX : item.x,
      fontSize: item.fontSize || 12,
    }));

    // 2. Gather user-added text elements for this page
    const addedTextElements = (docState.elements || [])
      .filter((el) => el.pageIndex === pIdx && el.type === 'text')
      .map((el: any) => ({
        text: el.text || '',
        y: el.y || 0,
        x: el.x || 0,
        fontSize: el.fontSize || 12,
      }));

    const allItems = [...originalItems, ...addedTextElements].filter(
      (item) => item.text && item.text.trim().length > 0
    );

    if (allItems.length === 0) {
      pageLines.push('[Empty page or non-text graphical content]');
    } else {
      // Sort items top-to-bottom, left-to-right
      allItems.sort((a, b) => {
        // Group items within 6pt vertical tolerance into the same line
        const yDiff = a.y - b.y;
        if (Math.abs(yDiff) > 6) {
          return yDiff;
        }
        return a.x - b.x;
      });

      // Group into lines
      let currentLine: string[] = [];
      let lastY = -1;

      allItems.forEach((item) => {
        if (lastY === -1 || Math.abs(item.y - lastY) <= 6) {
          currentLine.push(item.text);
          lastY = item.y;
        } else {
          pageLines.push(currentLine.join(' '));
          currentLine = [item.text];
          lastY = item.y;
        }
      });

      if (currentLine.length > 0) {
        pageLines.push(currentLine.join(' '));
      }
    }

    pageTexts.push(pageLines.join('\n'));
  });

  return pageTexts.join('\n\n');
}

/**
 * Detects whether a document is mostly scanned or empty (lacks extractable vector text)
 */
export function isDocumentScannedOrEmpty(docState: DocumentState): boolean {
  if (!docState || !docState.pages || docState.pages.length === 0) {
    return false;
  }

  let emptyPagesCount = 0;
  for (const page of docState.pages) {
    const textItemsCount = (page.textItems || []).filter(
      (item) => item.text && item.text.trim().length > 0
    ).length;
    const addedCount = (docState.elements || []).filter(
      (el) =>
        el.pageIndex === page.pageIndex &&
        el.type === 'text' &&
        (el as any).text &&
        (el as any).text.trim().length > 0
    ).length;

    if (textItemsCount + addedCount === 0) {
      emptyPagesCount++;
    }
  }

  return emptyPagesCount >= Math.ceil(docState.pages.length / 2);
}

/**
 * Estimates token count from text string (~4 characters per token)
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}
