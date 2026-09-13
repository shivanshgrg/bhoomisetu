import type { ImageAnalysisSummary } from '../domain';

/**
 * Cheap, deterministic canvas-based signals for a scanned/photographed image
 * upload — no library, no network call. The image is decoded and analysed
 * entirely in the browser, at a small downsampled size (analysis cost is
 * independent of the original file's resolution), and only the numeric
 * summary is handed to `runDocumentQualityCheck` (Step 52/53) for
 * interpretation, so that pure function never touches the DOM/canvas APIs
 * itself.
 */

const SAMPLE_MAX_DIMENSION = 400;

export async function analyzeImageFile(file: File): Promise<ImageAnalysisSummary> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, SAMPLE_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const sampleWidth = Math.max(1, Math.round(bitmap.width * scale));
    const sampleHeight = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      throw new Error('Canvas 2D context is not available.');
    }
    context.drawImage(bitmap, 0, 0, sampleWidth, sampleHeight);

    const { data } = context.getImageData(0, 0, sampleWidth, sampleHeight);
    const grayscale = new Float32Array(sampleWidth * sampleHeight);
    let sum = 0;
    for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      grayscale[p] = gray;
      sum += gray;
    }

    const meanBrightness = sum / grayscale.length;
    let varianceSum = 0;
    for (let p = 0; p < grayscale.length; p += 1) {
      const diff = grayscale[p] - meanBrightness;
      varianceSum += diff * diff;
    }
    const brightnessVariance = varianceSum / grayscale.length;

    let gradientSum = 0;
    let gradientSamples = 0;
    for (let y = 1; y < sampleHeight - 1; y += 1) {
      for (let x = 1; x < sampleWidth - 1; x += 1) {
        const idx = y * sampleWidth + x;
        const gx = grayscale[idx + 1] - grayscale[idx - 1];
        const gy = grayscale[idx + sampleWidth] - grayscale[idx - sampleWidth];
        gradientSum += Math.sqrt(gx * gx + gy * gy);
        gradientSamples += 1;
      }
    }
    const averageGradient = gradientSamples > 0 ? gradientSum / gradientSamples : 0;
    // Empirically, a crisp flatbed/app scan of text/lines averages well over
    // 40 in this 0-255-per-step gradient; normalise and clamp to 0-1.
    const edgeSharpnessScore = Math.max(0, Math.min(1, averageGradient / 60));

    return {
      meanBrightness,
      brightnessVariance,
      widthPx: bitmap.width,
      heightPx: bitmap.height,
      edgeSharpnessScore,
    };
  } finally {
    bitmap.close();
  }
}
