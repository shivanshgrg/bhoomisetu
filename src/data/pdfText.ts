import type { PdfExtraction } from '../domain';

/**
 * Extracts the text layer from a PDF entirely in the browser — the file
 * never leaves the device, nothing is uploaded to any service. Used by the
 * upload flow to feed `runDocumentQualityCheck`'s content-aware signals
 * (Step 52). Kept isolated from `src/domain/documentCheck.ts` so that module
 * stays a pure, network-free function of already-extracted text.
 */
export async function extractPdfText(file: File): Promise<PdfExtraction> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: buffer });
  const document = await loadingTask.promise;

  try {
    const pageCount = document.numPages;
    const pageTexts: string[] = [];

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => ('str' in item ? item.str : '')).join(' ');
      pageTexts.push(pageText);
    }

    const text = pageTexts.join('\n').trim();
    return { pageCount, hasTextLayer: text.length > 0, text };
  } finally {
    await loadingTask.destroy();
  }
}
