/**
 * On-demand OCR for a scanned PDF (no text layer) or a photographed/scanned
 * image, English + Hindi. `tesseract.js` is a multi-megabyte dependency, so
 * it is imported dynamically here and nowhere else in the app — this module
 * must never be imported from a component's top level, only called from an
 * explicit "Read this scan" button handler, so it never lands in the
 * initial bundle (verified in the Step 53 build output).
 *
 * This never marks a document verified — it only recovers text for the same
 * deterministic checks `runDocumentQualityCheck` already runs on PDF text
 * (Step 52). The officer still verifies or rejects manually.
 */

export type OcrResult = {
  text: string;
  /** Tesseract's own mean confidence for the recognised text, 0-100. */
  confidence: number;
};

export async function runOcr(file: File, onProgress?: (percent: number) => void): Promise<OcrResult> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng+hin', undefined, {
    logger: (message) => {
      if (message.status === 'recognizing text') {
        onProgress?.(Math.round(message.progress * 100));
      }
    },
  });

  try {
    const {
      data: { text, confidence },
    } = await worker.recognize(file);
    return { text, confidence };
  } finally {
    await worker.terminate();
  }
}
