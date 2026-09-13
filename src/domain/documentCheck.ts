/**
 * Deterministic heuristic "document quality check" — NOT real ML and NOT a
 * call to any external API. It flags a small set of file-shape and
 * document-content signals (size, filename, extension, page count, expected
 * wording, survey-number mention, date plausibility) that a real intake
 * officer would glance at. Must always be shown in the UI as a labeled
 * prototype heuristic, the same honest-disclaimer style already used for the
 * illustrative compensation calculator — never presented as a real
 * correctness/authenticity check.
 *
 * This module is a pure function of its inputs: it never reads a file, calls
 * pdfjs/tesseract, or touches the network itself. Text/page extraction
 * happens in `src/data/pdfText.ts` (Step 52) and `src/data/imageAnalysis.ts`
 * / `src/data/ocr.ts` (Step 53); this file only reasons over the results, so
 * it stays testable and network-free and the same file always produces the
 * same verdict.
 */

import { DOCUMENT_KIND_LABELS, type DocumentKind } from './constants';

export type DocumentCheckVerdict = 'looks_complete' | 'needs_review' | 'flagged';

export type DocumentCheckSignalStatus = 'pass' | 'info' | 'warning' | 'fail';

export type DocumentCheckSignal = {
  id: string;
  label: string;
  status: DocumentCheckSignalStatus;
  detail: string;
};

export type PdfExtraction = {
  pageCount: number;
  hasTextLayer: boolean;
  text: string;
};

export type ImageAnalysisSummary = {
  meanBrightness: number; // 0 (black) – 255 (white)
  brightnessVariance: number; // pixel variance; near-zero means a flat/blank image
  widthPx: number;
  heightPx: number;
  edgeSharpnessScore: number; // 0-1, higher = crisper edges (flatbed scan-like)
};

export type DocumentCheckContentInput = {
  documentKind: DocumentKind;
  surveyNumber: string;
  /** ISO date string (yyyy-mm-dd). Defaults to "now" when omitted. */
  referenceDate?: string;
  /** ISO date string (yyyy-mm-dd) the project was sanctioned on, if known. */
  projectSanctionedOn?: string;
  /** Text layer already extracted client-side from an uploaded PDF (Step 52). */
  pdfExtraction?: PdfExtraction;
  /** Canvas-derived signal summary for an uploaded image/scan (Step 53). */
  imageAnalysis?: ImageAnalysisSummary;
  /** Text already recovered via on-demand OCR (Step 53) — optional, officer-triggered. */
  ocrText?: string;
  /** 0-100 OCR engine confidence, shown alongside any OCR-derived signal. */
  ocrConfidence?: number;
};

export type DocumentCheckInput = {
  name: string;
  size: number;
  type: 'pdf' | 'image';
  /** Optional content-aware signals (Steps 52-53). Omit to fall back to file-shape checks only. */
  content?: DocumentCheckContentInput;
};

export type DocumentCheckResult = {
  verdict: DocumentCheckVerdict;
  /** Flattened, human-readable list of every non-passing signal's detail — kept for simple display. */
  reasons: string[];
  /** Full per-signal breakdown, in the order the checks ran, pass or not. */
  signals: DocumentCheckSignal[];
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

// ---------------------------------------------------------------------------
// Content signals (Step 52: PDF text; Step 53: images and OCR text feed the
// same keyword/survey-number/date checks below).
// ---------------------------------------------------------------------------

const RUPEE_AMOUNT_PATTERN =
  /₹\s?[\d,]+(\.\d+)?|rs\.?\s?[\d,]+(\.\d+)?|rupees?\s+[\d,]+|\b\d[\d,]{2,}\s*(lakh|lakhs|crore|crores)\b/i;

const DOCUMENT_KIND_KEYWORDS: Record<DocumentKind, { en: string[]; hi: string[]; amountPattern?: RegExp }> = {
  section_11_notification: {
    en: ['section 11', 'notification', 'declaration', 'public purpose'],
    hi: ['धारा 11', 'अधिसूचना', 'घोषणा'],
  },
  joint_survey_sketch: {
    en: ['joint survey', 'survey sketch', 'measurement'],
    hi: ['संयुक्त सर्वेक्षण', 'सर्वेक्षण', 'मापन'],
  },
  ownership_record: {
    en: ['ownership', 'record of rights', 'khata', 'title'],
    hi: ['स्वामित्व', 'अधिकार अभिलेख', 'खाता'],
  },
  objection_hearing_minutes: {
    en: ['objection', 'hearing', 'minutes'],
    hi: ['आपत्ति', 'सुनवाई', 'कार्यवृत्त'],
  },
  valuation_report: {
    en: ['valuation', 'market value', 'assessed value'],
    hi: ['मूल्यांकन', 'बाजार मूल्य'],
    amountPattern: RUPEE_AMOUNT_PATTERN,
  },
  compensation_statement: {
    en: ['compensation', 'approval', 'award amount'],
    hi: ['प्रतिकर', 'मुआवजा', 'स्वीकृति'],
    amountPattern: RUPEE_AMOUNT_PATTERN,
  },
  award_order: {
    en: ['award', 'section 23', 'order'],
    hi: ['अधिनिर्णय', 'आदेश'],
    amountPattern: RUPEE_AMOUNT_PATTERN,
  },
  possession_memo: {
    en: ['possession', 'handover', 'memo'],
    hi: ['कब्जा', 'हस्तांतरण', 'ज्ञापन'],
  },
};

const PAGE_COUNT_EXPECTATIONS: Record<DocumentKind, { min: number; max: number }> = {
  section_11_notification: { min: 1, max: 6 },
  joint_survey_sketch: { min: 1, max: 10 },
  ownership_record: { min: 1, max: 6 },
  objection_hearing_minutes: { min: 1, max: 12 },
  valuation_report: { min: 2, max: 25 },
  compensation_statement: { min: 1, max: 8 },
  award_order: { min: 2, max: 20 },
  possession_memo: { min: 1, max: 6 },
};

const MIN_READABLE_TEXT_LENGTH = 20;
const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];
const MONTH_PATTERN = new RegExp(
  `\\b(\\d{1,2})\\s+(${MONTHS.join('|')}|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\\.?,?\\s+(\\d{4})\\b`,
  'gi',
);
const TOO_EARLY_BUFFER_MS = 3 * 365 * 24 * 60 * 60 * 1000; // 3 years

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Matches a survey number like "124/7" even if punctuation has stray spacing ("124 / 7"). */
function buildSurveyNumberPattern(surveyNumber: string): RegExp {
  const trimmed = surveyNumber.trim();
  const pattern = trimmed
    .split('')
    .map((char) => (/[a-z0-9]/i.test(char) ? escapeRegExp(char) : `\\s*${escapeRegExp(char)}\\s*`))
    .join('');
  return new RegExp(pattern, 'i');
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isValidCalendarDate(year: number, month1to12: number, day: number): boolean {
  return month1to12 >= 1 && month1to12 <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2200;
}

/** Extracts plausible calendar dates from free text — dd/mm/yyyy, yyyy-mm-dd, and "12 March 2026" forms. */
function extractDates(text: string): Date[] {
  const dates: Date[] = [];

  const slashOrDash = /\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})\b/g;
  for (const match of text.matchAll(slashOrDash)) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    if (isValidCalendarDate(year, month, day)) {
      dates.push(new Date(Date.UTC(year, month - 1, day)));
    }
  }

  const isoLike = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
  for (const match of text.matchAll(isoLike)) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (isValidCalendarDate(year, month, day)) {
      dates.push(new Date(Date.UTC(year, month - 1, day)));
    }
  }

  for (const match of text.matchAll(MONTH_PATTERN)) {
    const day = Number(match[1]);
    const year = Number(match[3]);
    const monthToken = match[2].toLowerCase().slice(0, 3);
    const monthIndex = MONTHS.findIndex((month) => month.startsWith(monthToken));
    if (monthIndex >= 0 && isValidCalendarDate(year, monthIndex + 1, day)) {
      dates.push(new Date(Date.UTC(year, monthIndex, day)));
    }
  }

  return dates;
}

function runPageCountSignal(documentKind: DocumentKind, pageCount: number): DocumentCheckSignal {
  const range = PAGE_COUNT_EXPECTATIONS[documentKind];
  const kindLabel = DOCUMENT_KIND_LABELS[documentKind];
  if (pageCount < range.min) {
    return {
      id: 'page_count',
      label: 'Page count',
      status: 'warning',
      detail: `Only ${pageCount} page(s) — a ${kindLabel.toLowerCase()} is typically ${range.min}-${range.max} pages. Confirm nothing is missing.`,
    };
  }
  if (pageCount > range.max) {
    return {
      id: 'page_count',
      label: 'Page count',
      status: 'warning',
      detail: `${pageCount} pages is unusually long for a ${kindLabel.toLowerCase()} — check it is not several documents merged together.`,
    };
  }
  return {
    id: 'page_count',
    label: 'Page count',
    status: 'pass',
    detail: `${pageCount} page(s), within the typical range for this document type.`,
  };
}

function runKeywordSignal(documentKind: DocumentKind, text: string, sourceNote: string): DocumentCheckSignal {
  const spec = DOCUMENT_KIND_KEYWORDS[documentKind];
  const lower = text.toLowerCase();
  const hasKeyword = spec.en.some((keyword) => lower.includes(keyword)) || spec.hi.some((keyword) => text.includes(keyword));
  const hasAmount = spec.amountPattern ? spec.amountPattern.test(text) : true;

  if (!hasKeyword) {
    return {
      id: 'keyword_match',
      label: 'Expected wording',
      status: 'fail',
      detail: `${sourceNote}the text does not contain wording expected in a ${DOCUMENT_KIND_LABELS[documentKind].toLowerCase()} (e.g. "${spec.en[0]}").`,
    };
  }
  if (!hasAmount) {
    return {
      id: 'keyword_match',
      label: 'Expected wording',
      status: 'warning',
      detail: `${sourceNote}found expected wording, but no rupee figure — confirm the amount was captured correctly.`,
    };
  }
  return {
    id: 'keyword_match',
    label: 'Expected wording',
    status: 'pass',
    detail: `${sourceNote}contains wording expected for a ${DOCUMENT_KIND_LABELS[documentKind].toLowerCase()}.`,
  };
}

function runSurveyNumberSignal(surveyNumber: string, text: string, sourceNote: string): DocumentCheckSignal {
  const pattern = buildSurveyNumberPattern(surveyNumber);
  if (pattern.test(text)) {
    return {
      id: 'survey_number_match',
      label: 'Survey number',
      status: 'pass',
      detail: `${sourceNote}mentions survey number ${surveyNumber}.`,
    };
  }
  return {
    id: 'survey_number_match',
    label: 'Survey number',
    status: 'fail',
    detail: `${sourceNote}does not mention this parcel's survey number (${surveyNumber}) anywhere — confirm this is the right document before verifying.`,
  };
}

function runDatePlausibilitySignal(
  text: string,
  referenceDateInput: string | undefined,
  projectSanctionedOnInput: string | undefined,
): DocumentCheckSignal {
  const dates = extractDates(text);
  const referenceDate = referenceDateInput ? new Date(referenceDateInput) : new Date();
  const sanctionedOn = projectSanctionedOnInput ? new Date(projectSanctionedOnInput) : undefined;
  const earliestPlausible = sanctionedOn ? new Date(sanctionedOn.getTime() - TOO_EARLY_BUFFER_MS) : undefined;

  const futureDate = dates.find((date) => date.getTime() > referenceDate.getTime());
  if (futureDate) {
    return {
      id: 'date_plausibility',
      label: 'Date plausibility',
      status: 'fail',
      detail: `Found a date (${formatDate(futureDate)}) after today's date — check this is not a data-entry error.`,
    };
  }

  const tooEarlyDate = earliestPlausible ? dates.find((date) => date.getTime() < earliestPlausible.getTime()) : undefined;
  if (tooEarlyDate) {
    return {
      id: 'date_plausibility',
      label: 'Date plausibility',
      status: 'warning',
      detail: `Found a date (${formatDate(tooEarlyDate)}) more than three years before the project was sanctioned — confirm it belongs to this project.`,
    };
  }

  if (dates.length > 0) {
    return {
      id: 'date_plausibility',
      label: 'Date plausibility',
      status: 'pass',
      detail: 'Dates found in the text are consistent with the project timeline.',
    };
  }

  return {
    id: 'date_plausibility',
    label: 'Date plausibility',
    status: 'info',
    detail: 'No recognisable dates were found in the text.',
  };
}

// ---------------------------------------------------------------------------
// Image signals (Step 53): cheap, deterministic canvas-derived checks for a
// scanned/photographed image upload. `imageAnalysis` is computed in the
// browser by `src/data/imageAnalysis.ts`; this file only interprets the
// resulting numbers, so it stays a pure function like everything else here.
// ---------------------------------------------------------------------------

const BLANK_VARIANCE_FAIL_THRESHOLD = 25; // near-uniform pixels — almost certainly blank
const BLANK_VARIANCE_WARNING_THRESHOLD = 150; // low contrast — faint or underexposed
const MIN_PLAUSIBLE_DIMENSION_PX = 300; // below this, more like a thumbnail/screenshot crop
const MAX_PLAUSIBLE_ASPECT_RATIO = 3; // a full-page scan is rarely this elongated
const LOW_SHARPNESS_WARNING_THRESHOLD = 0.15; // below this, edges look soft/reflective

function runImageSignals(imageAnalysis: ImageAnalysisSummary): DocumentCheckSignal[] {
  const signals: DocumentCheckSignal[] = [];
  const { brightnessVariance, widthPx, heightPx, edgeSharpnessScore } = imageAnalysis;

  if (brightnessVariance < BLANK_VARIANCE_FAIL_THRESHOLD) {
    signals.push({
      id: 'image_blank',
      label: 'Blank scan check',
      status: 'fail',
      detail: 'This image looks blank or almost entirely one colour — check the scan captured the document before relying on it.',
    });
  } else if (brightnessVariance < BLANK_VARIANCE_WARNING_THRESHOLD) {
    signals.push({
      id: 'image_blank',
      label: 'Blank scan check',
      status: 'warning',
      detail: 'This image has unusually low contrast — it may be faint, underexposed, or partly blank.',
    });
  } else {
    signals.push({
      id: 'image_blank',
      label: 'Blank scan check',
      status: 'pass',
      detail: 'Image has typical contrast for a scanned or photographed document.',
    });
  }

  const shorterSide = Math.min(widthPx, heightPx);
  const aspectRatio = Math.max(widthPx, heightPx) / Math.max(1, shorterSide);
  if (shorterSide < MIN_PLAUSIBLE_DIMENSION_PX) {
    signals.push({
      id: 'image_resolution',
      label: 'Resolution / aspect ratio',
      status: 'warning',
      detail: `Image is only ${widthPx}×${heightPx}px — smaller than expected for a full-page scan.`,
    });
  } else if (aspectRatio > MAX_PLAUSIBLE_ASPECT_RATIO) {
    signals.push({
      id: 'image_resolution',
      label: 'Resolution / aspect ratio',
      status: 'warning',
      detail: `Image is unusually elongated (${widthPx}×${heightPx}px) for a full-page scan — check it is not a cropped portion of the document.`,
    });
  } else {
    signals.push({
      id: 'image_resolution',
      label: 'Resolution / aspect ratio',
      status: 'pass',
      detail: `Image is ${widthPx}×${heightPx}px, a plausible size and shape for a full-page scan.`,
    });
  }

  if (edgeSharpnessScore < LOW_SHARPNESS_WARNING_THRESHOLD) {
    signals.push({
      id: 'image_capture_quality',
      label: 'Capture quality',
      status: 'warning',
      detail: 'Edges look soft rather than crisp — this looks more like a photo of a screen or document than a flatbed/app scan, and may be reflective or out of focus.',
    });
  } else {
    signals.push({
      id: 'image_capture_quality',
      label: 'Capture quality',
      status: 'pass',
      detail: 'Edges are crisp, consistent with a flatbed or app scan rather than a photo of a screen.',
    });
  }

  return signals;
}

function runContentSignals(content: DocumentCheckContentInput): DocumentCheckSignal[] {
  const signals: DocumentCheckSignal[] = [];
  const { documentKind, pdfExtraction, imageAnalysis, ocrText, ocrConfidence } = content;

  if (imageAnalysis) {
    signals.push(...runImageSignals(imageAnalysis));
  }

  if (pdfExtraction) {
    signals.push(runPageCountSignal(documentKind, pdfExtraction.pageCount));
  }

  const pdfTextAvailable = !!pdfExtraction?.hasTextLayer && pdfExtraction.text.trim().length >= MIN_READABLE_TEXT_LENGTH;
  const ocrTextAvailable = !pdfTextAvailable && !!ocrText && ocrText.trim().length >= MIN_READABLE_TEXT_LENGTH;

  if (pdfExtraction && !ocrTextAvailable) {
    // PDF path: report the raw text-layer state (Step 52), unless an OCR pass has already
    // superseded it (a PDF with no text layer that the officer has since read via OCR).
    signals.push(
      pdfTextAvailable
        ? { id: 'text_presence', label: 'Text layer', status: 'pass', detail: 'Readable text layer found.' }
        : {
            id: 'text_presence',
            label: 'Text layer',
            status: 'warning',
            detail: 'This PDF has no readable text layer — it looks like a scan. Use "Read this scan" (OCR) to check its content.',
          },
    );
  } else if (imageAnalysis && !pdfExtraction) {
    // Image path (Step 53): there is no text layer to report on, only whether OCR has run yet.
    signals.push(
      ocrTextAvailable
        ? { id: 'text_presence', label: 'Text layer', status: 'pass', detail: 'Text recovered from this image via on-demand OCR.' }
        : {
            id: 'text_presence',
            label: 'Text layer',
            status: 'warning',
            detail: 'No text has been read from this image yet. Use "Read this scan" (OCR) to check its content.',
          },
    );
  }

  const effectiveText = pdfTextAvailable ? pdfExtraction!.text : ocrTextAvailable ? ocrText! : undefined;
  const sourceNote = ocrTextAvailable
    ? `Based on OCR text (${ocrConfidence !== undefined ? `${Math.round(ocrConfidence)}% confidence` : 'confidence unknown'}) — `
    : '';

  if (effectiveText) {
    signals.push(runKeywordSignal(documentKind, effectiveText, sourceNote));
    signals.push(runSurveyNumberSignal(content.surveyNumber, effectiveText, sourceNote));
    signals.push(runDatePlausibilitySignal(effectiveText, content.referenceDate, content.projectSanctionedOn));
  }

  return signals;
}

/**
 * Runs the prototype heuristic check. Pure function of the given input, so
 * the same file (same name/size/type/content) always produces the same
 * result — required so repeat demo runs never flicker between verdicts.
 */
export function runDocumentQualityCheck(input: DocumentCheckInput): DocumentCheckResult {
  const signals: DocumentCheckSignal[] = [];

  if (input.size <= 0) {
    signals.push({ id: 'file_size', label: 'File size', status: 'fail', detail: 'File appears to be empty.' });
  } else if (input.size < FLAGGED_MIN_SIZE_BYTES) {
    signals.push({
      id: 'file_size',
      label: 'File size',
      status: 'fail',
      detail: 'File is far smaller than a typical scanned document — may be blank or incomplete.',
    });
  } else if (input.size < REVIEW_MIN_SIZE_BYTES) {
    signals.push({
      id: 'file_size',
      label: 'File size',
      status: 'warning',
      detail: 'File is smaller than usual for a scanned document.',
    });
  } else if (input.size > REVIEW_MAX_SIZE_BYTES) {
    signals.push({
      id: 'file_size',
      label: 'File size',
      status: 'warning',
      detail: 'File is unusually large — check it is not several documents merged together.',
    });
  } else {
    signals.push({ id: 'file_size', label: 'File size', status: 'pass', detail: 'File size is typical for this document.' });
  }

  const extension = getExtension(input.name);
  if (!extensionMatchesType(extension, input.type)) {
    signals.push({
      id: 'file_extension',
      label: 'File extension',
      status: 'warning',
      detail: extension
        ? `File name extension ".${extension}" does not look like a ${input.type === 'pdf' ? 'PDF' : 'image'} file.`
        : 'File name has no recognizable extension.',
    });
  } else {
    signals.push({ id: 'file_extension', label: 'File extension', status: 'pass', detail: 'File extension matches the detected file type.' });
  }

  if (SUSPICIOUS_NAME_PATTERN.test(input.name)) {
    signals.push({
      id: 'file_name',
      label: 'File name',
      status: 'warning',
      detail: 'File name suggests a screenshot or temporary file rather than an official scan.',
    });
  } else {
    signals.push({ id: 'file_name', label: 'File name', status: 'pass', detail: 'File name does not look like a screenshot or temp file.' });
  }

  if (input.content) {
    signals.push(...runContentSignals(input.content));
  }

  const verdict: DocumentCheckVerdict = signals.some((signal) => signal.status === 'fail')
    ? 'flagged'
    : signals.some((signal) => signal.status === 'warning')
      ? 'needs_review'
      : 'looks_complete';

  const reasons = signals.filter((signal) => signal.status === 'fail' || signal.status === 'warning').map((signal) => signal.detail);

  return {
    verdict,
    reasons: reasons.length > 0 ? reasons : ['File size, name, type, and content signals all look typical for this document.'],
    signals,
  };
}
