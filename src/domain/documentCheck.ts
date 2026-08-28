/**
 * Deterministic heuristic "document quality check" — NOT real ML and NOT a
 * call to any external API. It flags a small set of file-shape signals
 * (size, filename, and whether the file extension matches the detected file
 * type) that a real intake officer would glance at. Must always be shown in
 * the UI as a labeled prototype heuristic, the same honest-disclaimer style
 * already used for the illustrative compensation calculator — never
 * presented as a real correctness/authenticity check.
 */

export type DocumentCheckVerdict = 'looks_complete' | 'needs_review' | 'flagged';

export type DocumentCheckInput = {
  name: string;
  size: number;
  type: 'pdf' | 'image';
};

export type DocumentCheckResult = {
  verdict: DocumentCheckVerdict;
  reasons: string[];
};

export const DOCUMENT_CHECK_VERDICT_LABELS: Record<DocumentCheckVerdict, string> = {
  looks_complete: 'Looks complete',
  needs_review: 'Needs review',
  flagged: 'Flagged',
};

const FLAGGED_MIN_SIZE_BYTES = 8 * 1024; // 8 KB — likely blank/corrupt scan
const REVIEW_MIN_SIZE_BYTES = 25 * 1024; // 25 KB — unusually thin for a scanned document
const REVIEW_MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB — unusually large, may be multiple docs merged

const PDF_EXTENSIONS = ['pdf'];
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic'];
const SUSPICIOUS_NAME_PATTERN = /screenshot|whatsapp|untitled|temp|test/i;

function getExtension(name: string): string | undefined {
  const match = /\.([a-z0-9]+)$/i.exec(name.trim());
  return match?.[1]?.toLowerCase();
}

function extensionMatchesType(extension: string | undefined, type: DocumentCheckInput['type']): boolean {
  if (!extension) {
    return false;
  }
  const expected = type === 'pdf' ? PDF_EXTENSIONS : IMAGE_EXTENSIONS;
  return expected.includes(extension);
}

/**
 * Runs the prototype heuristic check. Pure function of the given input, so
 * the same file (same name/size/type) always produces the same result —
 * required so repeat demo runs never flicker between verdicts.
 */
export function runDocumentQualityCheck(input: DocumentCheckInput): DocumentCheckResult {
  const flaggedReasons: string[] = [];
  const reviewReasons: string[] = [];

  if (input.size <= 0) {
    flaggedReasons.push('File appears to be empty.');
  } else if (input.size < FLAGGED_MIN_SIZE_BYTES) {
    flaggedReasons.push('File is far smaller than a typical scanned document — may be blank or incomplete.');
  } else if (input.size < REVIEW_MIN_SIZE_BYTES) {
    reviewReasons.push('File is smaller than usual for a scanned document.');
  }

  if (input.size > REVIEW_MAX_SIZE_BYTES) {
    reviewReasons.push('File is unusually large — check it is not several documents merged together.');
  }

  const extension = getExtension(input.name);
  if (!extensionMatchesType(extension, input.type)) {
    reviewReasons.push(
      extension
        ? `File name extension ".${extension}" does not look like a ${input.type === 'pdf' ? 'PDF' : 'image'} file.`
        : 'File name has no recognizable extension.',
    );
  }

  if (SUSPICIOUS_NAME_PATTERN.test(input.name)) {
    reviewReasons.push('File name suggests a screenshot or temporary file rather than an official scan.');
  }

  if (flaggedReasons.length > 0) {
    return { verdict: 'flagged', reasons: flaggedReasons };
  }

  if (reviewReasons.length > 0) {
    return { verdict: 'needs_review', reasons: reviewReasons };
  }

  return { verdict: 'looks_complete', reasons: ['File size, name, and type all look typical for this document.'] };
}
