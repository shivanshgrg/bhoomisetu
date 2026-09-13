import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, DataTable, EmptyState, FileField, PageContainer, PageHeader, SelectField } from '../components/ui';
import { repository } from '../data';
import { useLanguage } from '../i18n/LanguageContext';
import { useSession } from '../i18n/SessionContext';
import { uiText } from '../i18n/translations';
import {
  IMPORT_FIELDS,
  applyColumnMapping,
  autoDetectColumnMapping,
  buildImportErrorReportCsv,
  parseCsv,
  scopeProjectsToSession,
  validateImportRows,
  type AcquisitionProject,
  type ImportField,
  type ValidatedImportRow,
} from '../domain';

const FIELD_LABELS: Record<ImportField, string> = {
  surveyNumber: 'Survey number',
  projectId: 'Project id',
  ownerName: 'Owner name',
  ownerPhone: 'Owner phone',
  ownerPreferredLanguage: 'Owner preferred language',
  village: 'Village',
  tehsil: 'Tehsil',
  district: 'District',
  areaHectares: 'Area (hectares)',
  currentStage: 'Current stage',
  stageEnteredOn: 'Stage entered on (YYYY-MM-DD)',
  compensationEstimate: 'Compensation estimate',
  compensationPaid: 'Compensation paid',
  latitude: 'Latitude',
  longitude: 'Longitude',
};

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

type Stage = 'upload' | 'map' | 'preview' | 'done';

export function BulkImportPage() {
  const { session } = useSession();
  const { t } = useLanguage();

  const [projects, setProjects] = useState<AcquisitionProject[]>([]);
  const [existingSurveysByProject, setExistingSurveysByProject] = useState<Map<string, Set<string>>>(new Map());
  const [stage, setStage] = useState<Stage>('upload');
  const [fileName, setFileName] = useState<string | undefined>(undefined);
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Partial<Record<ImportField, number>>>({});
  const [validatedRows, setValidatedRows] = useState<ValidatedImportRow[]>([]);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<{ imported: number } | undefined>(undefined);
  const [commitError, setCommitError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let isCancelled = false;
    Promise.all([repository.listProjects(), repository.listParcels()]).then(([loadedProjects, loadedParcels]) => {
      if (isCancelled) return;
      setProjects(loadedProjects);
      const byProject = new Map<string, Set<string>>();
      loadedParcels.forEach((parcel) => {
        const set = byProject.get(parcel.projectId) ?? new Set<string>();
        set.add(parcel.surveyNumber);
        byProject.set(parcel.projectId, set);
      });
      setExistingSurveysByProject(byProject);
    });
    return () => {
      isCancelled = true;
    };
  }, []);

  const scopedProjects = useMemo(() => scopeProjectsToSession(projects, session), [projects, session]);
  const projectsById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);

  async function handleFile(file: File) {
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length === 0) {
      return;
    }
    const [headerRow, ...rest] = rows;
    setFileName(file.name);
    setHeaders(headerRow);
    setDataRows(rest);
    setMapping(autoDetectColumnMapping(headerRow));
    setStage('map');
    setCommitResult(undefined);
    setCommitError(undefined);
  }

  function handleRunValidation() {
    const parsedRows = applyColumnMapping(dataRows, mapping);
    const validated = validateImportRows(parsedRows, existingSurveysByProject, projectsById);
    setValidatedRows(validated);
    setStage('preview');
  }

  async function handleCommit() {
    const validRows = validatedRows.filter((row) => row.parsed);
    if (validRows.length === 0) {
      return;
    }
    setIsCommitting(true);
    setCommitError(undefined);
    try {
      const result = await repository.importParcels(validRows.map((row) => row.parsed!));
      setCommitResult({ imported: result.imported });
      setStage('done');
    } catch {
      setCommitError(t(uiText.bulkImport.commitError));
    } finally {
      setIsCommitting(false);
    }
  }

  const validCount = validatedRows.filter((row) => row.parsed).length;
  const invalidCount = validatedRows.length - validCount;
  const errorCount = validatedRows.reduce((total, row) => total + row.errors.length, 0);

  return (
    <PageContainer>
      <PageHeader
        eyebrow={t(uiText.bulkImport.eyebrow)}
        title={t(uiText.bulkImport.title)}
        description={t(uiText.bulkImport.description)}
      />

      <Card eyebrow={t(uiText.bulkImport.step1Eyebrow)} title={t(uiText.bulkImport.uploadTitle)}>
        <FileField
          label={t(uiText.bulkImport.uploadFieldLabel)}
          accept=".csv,text/csv"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <p>{t(uiText.bulkImport.uploadHelp)}</p>
        {fileName && (
          <p className="notice-meta">
            {t(uiText.bulkImport.fileLoadedPrefix)} <strong>{fileName}</strong> · {dataRows.length}{' '}
            {t(uiText.bulkImport.rowsSuffix)}
          </p>
        )}
      </Card>

      {stage !== 'upload' && (
        <Card eyebrow={t(uiText.bulkImport.step2Eyebrow)} title={t(uiText.bulkImport.mapTitle)}>
          <p>{t(uiText.bulkImport.mapHelp)}</p>
          <div className="filter-grid">
            {IMPORT_FIELDS.map((field) => (
              <SelectField
                key={field}
                label={FIELD_LABELS[field]}
                value={mapping[field] !== undefined ? String(mapping[field]) : ''}
                onChange={(event) => {
                  const value = event.target.value;
                  setMapping((current) => ({
                    ...current,
                    [field]: value === '' ? undefined : Number(value),
                  }));
                }}
              >
                <option value="">{t(uiText.bulkImport.mapUnmappedOption)}</option>
                {headers.map((header, index) => (
                  <option key={header + index} value={index}>
                    {header || `${t(uiText.bulkImport.columnFallbackPrefix)} ${index + 1}`}
                  </option>
                ))}
              </SelectField>
            ))}
          </div>
          <Button type="button" onClick={handleRunValidation}>
            {t(uiText.bulkImport.validateButton)}
          </Button>
        </Card>
      )}

      {stage === 'preview' || stage === 'done' ? (
        <Card eyebrow={t(uiText.bulkImport.step3Eyebrow)} title={t(uiText.bulkImport.previewTitle)}>
          <div className="page-actions-group">
            <Badge tone="info">
              {validatedRows.length} {t(uiText.bulkImport.totalRowsSuffix)}
            </Badge>
            <Badge tone="success">
              {validCount} {t(uiText.bulkImport.validRowsSuffix)}
            </Badge>
            <Badge tone={invalidCount > 0 ? 'danger' : 'neutral'}>
              {invalidCount} {t(uiText.bulkImport.invalidRowsSuffix)}
            </Badge>
          </div>

          {errorCount > 0 && (
            <div className="page-actions-group" style={{ marginTop: 12 }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => downloadTextFile('bhoomisetu-import-errors.csv', buildImportErrorReportCsv(validatedRows), 'text/csv')}
              >
                {t(uiText.bulkImport.downloadErrorReportButton)}
              </Button>
            </div>
          )}

          <DataTable
            caption={t(uiText.bulkImport.previewTableCaption)}
            columns={[
              t(uiText.bulkImport.colRow),
              t(uiText.bulkImport.colSurvey),
              t(uiText.bulkImport.colProject),
              t(uiText.bulkImport.colStage),
              t(uiText.bulkImport.colResult),
            ]}
            rows={validatedRows.slice(0, 50).map((row) => [
              row.rowNumber,
              row.raw.surveyNumber || '—',
              row.raw.projectId || '—',
              row.raw.currentStage || '—',
              row.parsed ? (
                <Badge key={`${row.rowNumber}-ok`} tone="success">
                  {t(uiText.bulkImport.rowOk)}
                </Badge>
              ) : (
                <span key={`${row.rowNumber}-errors`}>
                  {row.errors.map((issue) => issue.message).join(' ')}
                </span>
              ),
            ])}
          />
          {validatedRows.length > 50 && (
            <p className="notice-meta">
              {t(uiText.bulkImport.previewTruncatedNote).replace('{count}', String(validatedRows.length))}
            </p>
          )}

          {stage === 'preview' && (
            <div className="page-actions-group" style={{ marginTop: 16 }}>
              <Button type="button" onClick={handleCommit} disabled={validCount === 0 || isCommitting}>
                {isCommitting
                  ? t(uiText.bulkImport.committingButton)
                  : `${t(uiText.bulkImport.commitButtonPrefix)} ${validCount} ${t(uiText.bulkImport.commitButtonSuffix)}`}
              </Button>
            </div>
          )}
          {commitError && <p className="form-error">{commitError}</p>}

          {stage === 'done' && commitResult && (
            <EmptyState
              title={t(uiText.bulkImport.doneTitle)}
              description={`${commitResult.imported} ${t(uiText.bulkImport.doneDescriptionSuffix)}`}
            />
          )}
        </Card>
      ) : null}

      <Card eyebrow={t(uiText.bulkImport.scopeNoteEyebrow)} title={t(uiText.bulkImport.scopeNoteTitle)}>
        <p>{t(uiText.bulkImport.scopeNoteBody)}</p>
        <p className="notice-meta">
          {t(uiText.bulkImport.projectsInScopePrefix)}{' '}
          {scopedProjects.map((project) => `${project.id} (${project.name})`).join(', ') || '—'}
        </p>
      </Card>
    </PageContainer>
  );
}
