import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Card, DataTable, EmptyState, PageContainer, PageHeader } from '../components/ui';
import { repository } from '../data';
import { useLanguage } from '../i18n/LanguageContext';
import { useSession } from '../i18n/SessionContext';
import { appRoleLabels, riskLevelLabels, stageLabels, uiText, type TranslationEntry } from '../i18n/translations';
import {
  getActionCenterQueue,
  scopeParcelsToSession,
  scopeProjectsToSession,
  type AcquisitionParcel,
  type AcquisitionProject,
} from '../domain';
import { getRiskTone } from './statusDisplay';

function formatReasons(
  contributors: { label: string; points: number }[],
  t: (entry: TranslationEntry) => string,
) {
  const activeContributors = contributors.filter((contributor) => contributor.points > 0);
  if (activeContributors.length === 0) {
    return t(uiText.actionCenter.noRiskFactors);
  }
  return activeContributors.map((contributor) => `${contributor.label} (${contributor.points})`).join(', ');
}

export function ActionCenterPage() {
  const { session } = useSession();
  const { t } = useLanguage();
  const role = session?.role;
  const [parcels, setParcels] = useState<AcquisitionParcel[]>([]);
  const [projects, setProjects] = useState<AcquisitionProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let isCancelled = false;

    Promise.all([repository.listParcels(), repository.listProjects()])
      .then(([loadedParcels, loadedProjects]) => {
        if (!isCancelled) {
          setParcels(loadedParcels);
          setProjects(loadedProjects);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setLoadError(t(uiText.actionCenter.loadError));
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scopedParcels = useMemo(
    () => scopeParcelsToSession(parcels, projects, session),
    [parcels, projects, session],
  );
  const scopedProjects = useMemo(() => scopeProjectsToSession(projects, session), [projects, session]);

  const queue = useMemo(() => getActionCenterQueue(scopedParcels, scopedProjects), [scopedParcels, scopedProjects]);

  const queueRows = queue.map(({ parcel, riskAssessment }) => [
    <Link key={`${parcel.id}-link`} to={`/official/parcel/${parcel.id}`}>
      {parcel.surveyNumber}
    </Link>,
    parcel.district,
    t(stageLabels[parcel.currentStage]),
    riskAssessment.score,
    <Badge key={`${parcel.id}-level`} tone={getRiskTone(riskAssessment.level)}>
      {t(riskLevelLabels[riskAssessment.level])}
    </Badge>,
    formatReasons(riskAssessment.contributors, t),
    riskAssessment.recommendedAction,
  ]);

  return (
    <PageContainer>
      <PageHeader
        eyebrow={t(uiText.actionCenter.eyebrow)}
        title={t(uiText.actionCenter.title)}
        description={t(uiText.actionCenter.description)}
        actions={
          role && (
            <Badge tone="info">
              {t(uiText.actionCenter.viewingAsPrefix)} {t(appRoleLabels[role])}
            </Badge>
          )
        }
      />

      {loadError && (
        <Card>
          <EmptyState title={t(uiText.actionCenter.loadErrorTitle)} description={loadError} />
        </Card>
      )}

      {!loadError && (
        <Card eyebrow={`${queue.length} ${t(uiText.actionCenter.inScopeSuffix)}`} title={t(uiText.actionCenter.riskQueueTitle)}>
          {isLoading ? (
            <p>{t(uiText.actionCenter.loadingParcels)}</p>
          ) : queueRows.length > 0 ? (
            <DataTable
              caption={t(uiText.actionCenter.queueCaption)}
              columns={[
                t(uiText.actionCenter.colSurvey),
                t(uiText.actionCenter.colDistrict),
                t(uiText.actionCenter.colStage),
                t(uiText.actionCenter.colScore),
                t(uiText.actionCenter.colLevel),
                t(uiText.actionCenter.colReasons),
                t(uiText.actionCenter.colRecommendedAction),
              ]}
              rows={queueRows}
            />
          ) : (
            <EmptyState
              title={t(uiText.actionCenter.noParcelsInScopeTitle)}
              description={t(uiText.actionCenter.noParcelsInScopeDescription)}
            />
          )}
        </Card>
      )}
    </PageContainer>
  );
}
