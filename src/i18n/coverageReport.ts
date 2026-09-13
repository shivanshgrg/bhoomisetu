import {
  LANGUAGES,
  appRoleLabels,
  dashboardStatusLabels,
  documentCheckVerdictLabels,
  documentKindLabels,
  documentStatusLabels,
  objectionReasonLabels,
  objectionStatusLabels,
  officialRoleLabels,
  projectStatusLabels,
  riskLevelLabels,
  stageLabels,
  stageShortLabels,
  uiText,
  type TranslationEntry,
} from './translations';

const ALL_TRANSLATION_SOURCES: unknown[] = [
  uiText,
  stageLabels,
  stageShortLabels,
  documentKindLabels,
  objectionReasonLabels,
  objectionStatusLabels,
  dashboardStatusLabels,
  officialRoleLabels,
  appRoleLabels,
  documentStatusLabels,
  riskLevelLabels,
  documentCheckVerdictLabels,
  projectStatusLabels,
];

function isTranslationEntry(value: unknown): value is TranslationEntry {
  return typeof value === 'object' && value !== null && typeof (value as { en?: unknown }).en === 'string';
}

function collectEntries(node: unknown, out: TranslationEntry[]): void {
  if (isTranslationEntry(node)) {
    out.push(node);
    return;
  }
  if (node && typeof node === 'object') {
    for (const value of Object.values(node)) {
      collectEntries(value, out);
    }
  }
}

/**
 * Dev-only diagnostic: prints, per language, how many of the app's
 * TranslationEntry leaves have a real (non-English-fallback) string.
 * Enabled by appending `?coverage=1` to the URL in a dev build — see
 * `src/main.tsx`. Gives the exact "citizen coverage" number for the pitch.
 */
export function logTranslationCoverage(): void {
  const entries: TranslationEntry[] = [];
  for (const source of ALL_TRANSLATION_SOURCES) {
    collectEntries(source, entries);
  }

  const total = entries.length;
  const rows = LANGUAGES.map((language) => {
    const covered = language === 'en' ? total : entries.filter((entry) => entry[language] !== undefined).length;
    return {
      language,
      covered,
      total,
      coverage: `${Math.round((covered / total) * 100)}%`,
    };
  });

  // eslint-disable-next-line no-console
  console.table(rows);
}
