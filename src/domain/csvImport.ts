import { ACQUISITION_STAGES, OFFICIAL_ROLES, STAGE_BY_ID, STAGE_HANDLER_ROLE, type StageId } from './constants';
import { parseISODate } from './rules';
import type { AcquisitionProject, ISODateString, ParcelOwner } from './types';

// The columns a bulk-import CSV is expected to carry, in the shape a district
// office could plausibly export from an existing spreadsheet. Header
// matching is case/whitespace-insensitive and also accepts a couple of
// common synonyms per field (see HEADER_ALIASES) so the mapper can
// auto-detect a real-world file, not just a hand-crafted one.
export const IMPORT_FIELDS = [
  'surveyNumber',
  'projectId',
  'ownerName',
  'ownerPhone',
  'ownerPreferredLanguage',
  'village',
  'tehsil',
  'district',
  'areaHectares',
  'currentStage',
  'stageEnteredOn',
  'compensationEstimate',
  'compensationPaid',
  'latitude',
  'longitude',
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];

const HEADER_ALIASES: Record<ImportField, string[]> = {
  surveyNumber: ['survey_number', 'survey no', 'survey'],
  projectId: ['project_id', 'project'],
  ownerName: ['owner_name', 'owner'],
  ownerPhone: ['owner_phone', 'phone', 'mobile'],
  ownerPreferredLanguage: ['owner_preferred_language', 'preferred_language', 'language'],
  village: [],
  tehsil: ['taluka', 'taluk'],
  district: [],
  areaHectares: ['area_hectares', 'area', 'area_ha'],
  currentStage: ['current_stage', 'stage'],
  stageEnteredOn: ['stage_entered_on', 'stage_start', 'entered_on'],
  compensationEstimate: ['compensation_estimate', 'compensation_assessed'],
  compensationPaid: ['compensation_paid'],
  latitude: ['lat'],
  longitude: ['lng', 'lon', 'long'],
};

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s_-]+/g, ' ');
}

// Best-effort auto-detection of which CSV column maps to which import field,
// by matching normalized headers against the field name and its aliases.
// Returns a partial map — anything unmatched is left for the officer to pick
// by hand in the column mapper UI.
export function autoDetectColumnMapping(headers: string[]): Partial<Record<ImportField, number>> {
  const mapping: Partial<Record<ImportField, number>> = {};
  const normalizedHeaders = headers.map(normalizeHeader);

  IMPORT_FIELDS.forEach((field) => {
    const candidates = [normalizeHeader(field), ...HEADER_ALIASES[field].map(normalizeHeader)];
    const matchIndex = normalizedHeaders.findIndex((header) => candidates.includes(header));
    if (matchIndex !== -1) {
      mapping[field] = matchIndex;
    }
  });

  return mapping;
}

// Minimal RFC-4180-ish CSV parser: handles quoted fields, escaped quotes
// (""), and commas/newlines inside quotes. No external dependency — this is
// the same "hand-roll rather than add a package" discipline the rest of the
// plan asks for (QR code, convex hull, etc.).
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      pushField();
    } else if (char === '\n') {
      pushRow();
    } else if (char === '\r') {
      // skip — \r\n line endings are handled by the following \n
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    pushRow();
  }

  return rows.filter((parsedRow) => !(parsedRow.length === 1 && parsedRow[0] === ''));
}

export type ParsedImportRow = {
  rowNumber: number; // 1-based, counting from the first data row (header excluded)
  raw: Record<ImportField, string>;
};

export function applyColumnMapping(
  dataRows: string[][],
  mapping: Partial<Record<ImportField, number>>,
): ParsedImportRow[] {
  return dataRows.map((cells, index) => {
    const raw = {} as Record<ImportField, string>;
    IMPORT_FIELDS.forEach((field) => {
      const columnIndex = mapping[field];
      raw[field] = columnIndex !== undefined ? (cells[columnIndex] ?? '').trim() : '';
    });
    return { rowNumber: index + 1, raw };
  });
}

export type ImportRowIssue = { field: ImportField | 'row'; message: string };

export type ValidatedImportRow = {
  rowNumber: number;
  raw: Record<ImportField, string>;
  errors: ImportRowIssue[];
  warnings: ImportRowIssue[];
  parsed?: {
    surveyNumber: string;
    projectId: string;
    owner: ParcelOwner;
    village: string;
    tehsil: string;
    district: string;
    areaHectares: number;
    currentStage: StageId;
    stageEnteredOn: ISODateString;
    compensationEstimate: number;
    compensationPaid: number;
    coordinates: { lat: number; lng: number };
    handledByRole: (typeof OFFICIAL_ROLES)[number];
  };
};

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const VALID_LANGUAGES = new Set(['en', 'hi', 'mr', 'bn', 'te', 'ta', 'gu', 'kn', 'or', 'pa']);

function isValidDate(value: string): value is ISODateString {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const ms = parseISODate(value as ISODateString);
  return Number.isFinite(ms);
}

// Row-by-row validation against the same domain rules the rest of the app
// enforces (valid stage id, non-negative area/compensation, paid <=
// estimate, a real project, a plausible date) — same discipline as Step 50's
// database constraints, just checked client-side before anything is
// committed.
export function validateImportRow(
  row: ParsedImportRow,
  existingSurveyNumbersByProject: Map<string, Set<string>>,
  seenInBatch: Set<string>,
  projectsById: Map<string, AcquisitionProject>,
): ValidatedImportRow {
  const errors: ImportRowIssue[] = [];
  const warnings: ImportRowIssue[] = [];
  const { raw } = row;

  if (!raw.surveyNumber) {
    errors.push({ field: 'surveyNumber', message: 'Survey number is required.' });
  }

  const project = projectsById.get(raw.projectId);
  if (!raw.projectId) {
    errors.push({ field: 'projectId', message: 'Project id is required.' });
  } else if (!project) {
    errors.push({ field: 'projectId', message: `Unknown project id "${raw.projectId}".` });
  }

  if (raw.surveyNumber && raw.projectId) {
    const batchKey = `${raw.projectId}::${raw.surveyNumber}`;
    if (seenInBatch.has(batchKey)) {
      errors.push({ field: 'surveyNumber', message: 'Duplicate survey number within this project, elsewhere in this file.' });
    } else {
      seenInBatch.add(batchKey);
    }
    if (existingSurveyNumbersByProject.get(raw.projectId)?.has(raw.surveyNumber)) {
      errors.push({ field: 'surveyNumber', message: 'Survey number already exists for this project.' });
    }
  }

  if (!raw.ownerName) {
    errors.push({ field: 'ownerName', message: 'Owner name is required.' });
  }
  if (!raw.ownerPhone) {
    errors.push({ field: 'ownerPhone', message: 'Owner phone is required.' });
  } else if (!/^\d{7,15}$/.test(raw.ownerPhone.replace(/[\s+-]/g, ''))) {
    warnings.push({ field: 'ownerPhone', message: 'Phone number looks unusual — check the digit count.' });
  }

  const language = raw.ownerPreferredLanguage || 'en';
  if (!VALID_LANGUAGES.has(language)) {
    errors.push({ field: 'ownerPreferredLanguage', message: `Unknown language code "${language}".` });
  }

  if (!raw.village) errors.push({ field: 'village', message: 'Village is required.' });
  if (!raw.tehsil) errors.push({ field: 'tehsil', message: 'Tehsil is required.' });
  if (!raw.district) errors.push({ field: 'district', message: 'District is required.' });

  const area = Number(raw.areaHectares);
  if (!raw.areaHectares || Number.isNaN(area) || area <= 0) {
    errors.push({ field: 'areaHectares', message: 'Area (hectares) must be a positive number.' });
  }

  const stage = STAGE_BY_ID[raw.currentStage as StageId];
  if (!raw.currentStage) {
    errors.push({ field: 'currentStage', message: 'Current stage is required.' });
  } else if (!stage) {
    errors.push({
      field: 'currentStage',
      message: `Unknown stage "${raw.currentStage}" — expected one of ${ACQUISITION_STAGES.map((s) => s.id).join(', ')}.`,
    });
  }

  if (!raw.stageEnteredOn) {
    errors.push({ field: 'stageEnteredOn', message: 'Stage entered date is required (YYYY-MM-DD).' });
  } else if (!isValidDate(raw.stageEnteredOn)) {
    errors.push({ field: 'stageEnteredOn', message: 'Stage entered date must be a valid YYYY-MM-DD date.' });
  }

  const compensationEstimate = Number(raw.compensationEstimate);
  if (!raw.compensationEstimate || Number.isNaN(compensationEstimate) || compensationEstimate < 0) {
    errors.push({ field: 'compensationEstimate', message: 'Compensation estimate must be a non-negative number.' });
  }

  const compensationPaid = raw.compensationPaid === '' ? 0 : Number(raw.compensationPaid);
  if (Number.isNaN(compensationPaid) || compensationPaid < 0) {
    errors.push({ field: 'compensationPaid', message: 'Compensation paid must be a non-negative number.' });
  } else if (!Number.isNaN(compensationEstimate) && compensationPaid > compensationEstimate) {
    errors.push({ field: 'compensationPaid', message: 'Compensation paid cannot exceed compensation estimate.' });
  }

  const latitude = Number(raw.latitude);
  const longitude = Number(raw.longitude);
  if (!raw.latitude || Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
    errors.push({ field: 'latitude', message: 'Latitude must be a number between -90 and 90.' });
  }
  if (!raw.longitude || Number.isNaN(longitude) || longitude < -180 || longitude > 180) {
    errors.push({ field: 'longitude', message: 'Longitude must be a number between -180 and 180.' });
  }

  if (errors.length > 0) {
    return { rowNumber: row.rowNumber, raw, errors, warnings };
  }

  return {
    rowNumber: row.rowNumber,
    raw,
    errors,
    warnings,
    parsed: {
      surveyNumber: raw.surveyNumber,
      projectId: raw.projectId,
      owner: {
        name: raw.ownerName,
        phone: raw.ownerPhone,
        preferredLanguage: language as ParcelOwner['preferredLanguage'],
      },
      village: raw.village,
      tehsil: raw.tehsil,
      district: raw.district,
      areaHectares: area,
      currentStage: raw.currentStage as StageId,
      stageEnteredOn: raw.stageEnteredOn as ISODateString,
      compensationEstimate,
      compensationPaid,
      coordinates: { lat: latitude, lng: longitude },
      handledByRole: STAGE_HANDLER_ROLE[raw.currentStage as StageId],
    },
  };
}

export function validateImportRows(
  rows: ParsedImportRow[],
  existingSurveyNumbersByProject: Map<string, Set<string>>,
  projectsById: Map<string, AcquisitionProject>,
): ValidatedImportRow[] {
  const seenInBatch = new Set<string>();
  return rows.map((row) => validateImportRow(row, existingSurveyNumbersByProject, seenInBatch, projectsById));
}

export function buildImportErrorReportCsv(validatedRows: ValidatedImportRow[]): string {
  const header = ['row', 'field', 'message'];
  const lines: string[] = [header.join(',')];

  validatedRows.forEach((row) => {
    row.errors.forEach((issue) => {
      lines.push([row.rowNumber, issue.field, `"${issue.message.replace(/"/g, '""')}"`].join(','));
    });
  });

  return lines.join('\n');
}
