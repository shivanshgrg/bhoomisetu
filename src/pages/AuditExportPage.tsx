import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Card, DataTable, EmptyState, PageContainer, PageHeader } from '../components/ui';
import { repository } from '../data';
import {
  DEMO_REFERENCE_DATE,
  auditExportFilename,
  buildAuditExportBundle,
  isParcelInScope,
  type AcquisitionParcel,
  type AcquisitionProject,
  type AuditExportBundle,
} from '../domain';
import { useLanguage } from '../i18n/LanguageContext';
import { useSession } from '../i18n/SessionContext';
import { officialRoleLabels, stageLabels, uiText } from '../i18n/translations';

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function AuditExportPage() {
  const { id } = useParams<{ id: string }>();
  const { session } = useSession();
  const { t } = useLanguage();

  const [parcel, setParcel] = useState<AcquisitionParcel | undefined>(undefined);
  const [project, setProject] = useState<AcquisitionProject | undefined>(undefined);
  const [bundle, setBundle] = useState<AuditExportBundle | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setLoadError(undefined);

    repository
      .getParcelById(id)
      .then(async (loadedParcel) => {
        if (isCancelled) return;
        const loadedProject = loadedParcel ? await repository.getProjectById(loadedParcel.projectId) : undefined;
        if (isCancelled) return;
        const inScope = !!loadedParcel && !!loadedProject && isParcelInScope(loadedParcel, loadedProject, session);
        setParcel(inScope ? loadedParcel : undefined);
        setProject(inScope ? loadedProject : undefined);
        if (inScope && loadedParcel && loadedProject) {
          const built = await buildAuditExportBundle(loadedParcel, loadedProject);
          if (!isCancelled) setBundle(built);
        }
      })
      .catch(() => {
        if (!isCancelled) setLoadError(t(uiText.parcelDetail.loadError));
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, session]);

  const verifierUrl = useMemo(() => `${window.location.origin}/verify.html`, []);

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader eyebrow={t(uiText.auditExport.eyebrow)} title={t(uiText.auditExport.title)} />
        <Card>
          <p>{t(uiText.parcelDetail.loading)}</p>
        </Card>
      </PageContainer>
    );
  }

  if (loadError || !parcel || !project || !bundle) {
    return (
      <PageContainer>
        <PageHeader eyebrow={t(uiText.auditExport.eyebrow)} title={t(uiText.auditExport.title)} />
        <Card>
          <EmptyState
            title={t(uiText.parcelDetail.notFoundTitle)}
            description={loadError ?? t(uiText.parcelDetail.notFoundDescriptionFallback)}
            action={
              <Link to="/official">
                <Button type="button" variant="secondary">
                  {t(uiText.parcelDetail.backToDashboard)}
                </Button>
              </Link>
            }
          />
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow={t(uiText.auditExport.eyebrow)}
        title={`${t(uiText.auditExport.title)} — ${parcel.surveyNumber}`}
        actions={
          <div className="page-actions-group">
            <Button type="button" onClick={() => downloadJson(auditExportFilename(parcel), bundle)}>
              {t(uiText.auditExport.downloadJsonButton)}
            </Button>
            <Button type="button" variant="secondary" onClick={() => window.print()}>
              {t(uiText.auditExport.printPdfButton)}
            </Button>
            <Link to={`/official/parcel/${parcel.id}`}>
              <Button type="button" variant="secondary">
                {t(uiText.auditExport.backToParcel)}
              </Button>
            </Link>
          </div>
        }
      />

      <Card>
        <p>{t(uiText.auditExport.helpNote)}</p>
        <p className="notice-meta">
          {t(uiText.auditExport.verifierNote)} <code>{verifierUrl}</code>
        </p>
      </Card>

      <Card>
        <div className="notice-sheet">
          <div className="notice-copy">
            <p className="notice-copy-language">{t(uiText.auditExport.coverLabel)}</p>
            <p className="notice-office-header">{t(uiText.auditExport.officeHeader)}</p>
            <h2 className="notice-title">{t(uiText.auditExport.coverTitle)}</h2>

            <div className="notice-fields">
              <span>{t(uiText.auditExport.surveyLabel)}</span>
              <strong>{parcel.surveyNumber}</strong>
              <span>{t(uiText.auditExport.ownerLabel)}</span>
              <strong>{parcel.owner.name}</strong>
              <span>{t(uiText.auditExport.locationLabel)}</span>
              <strong>
                {parcel.village}, {parcel.tehsil}, {parcel.district}
              </strong>
              <span>{t(uiText.auditExport.projectLabel)}</span>
              <strong>{project.name}</strong>
              <span>{t(uiText.auditExport.currentStageLabel)}</span>
              <strong>{t(stageLabels[parcel.currentStage])}</strong>
              <span>{t(uiText.auditExport.generatedOnLabel)}</span>
              <strong>{DEMO_REFERENCE_DATE}</strong>
              <span>{t(uiText.auditExport.chainLinksLabel)}</span>
              <strong>{bundle.auditChain.links.length}</strong>
              <span>{t(uiText.auditExport.genesisHashLabel)}</span>
              <strong>{bundle.auditChain.genesisHash.slice(0, 16)}…</strong>
            </div>

            <p className="notice-body">{t(uiText.auditExport.coverBody)}</p>

            <DataTable
              caption={t(uiText.auditExport.chainTableCaption)}
              columns={[
                t(uiText.auditExport.colStage),
                t(uiText.auditExport.colEnteredOn),
                t(uiText.auditExport.colExitedOn),
                t(uiText.auditExport.colHandledBy),
                t(uiText.auditExport.colHash),
              ]}
              rows={bundle.stageHistory.map((entry, index) => [
                t(stageLabels[entry.stage]),
                entry.enteredOn,
                entry.exitedOn ?? '—',
                t(officialRoleLabels[entry.handledByRole]),
                `${bundle.auditChain.links[index]?.hash.slice(0, 12) ?? '—'}…`,
              ])}
            />

            <p className="notice-signature">{t(uiText.auditExport.signatureLabel)}</p>
            <p className="notice-disclaimer">{t(uiText.auditExport.disclaimer)}</p>
          </div>
        </div>
      </Card>
    </PageContainer>
  );
}
