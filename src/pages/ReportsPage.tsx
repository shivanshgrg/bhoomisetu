import { useEffect, useMemo, useState } from 'react';
import { StageDurationChart } from '../components/StageDurationChart';
import { Badge, Button, Card, DataTable, EmptyState, PageContainer, PageHeader } from '../components/ui';
import { repository } from '../data';
import { useLanguage } from '../i18n/LanguageContext';
import { useSession } from '../i18n/SessionContext';
import { appRoleLabels, projectStatusLabels, riskLevelLabels, stageLabels, uiText } from '../i18n/translations';
import {
  ACQUISITION_STAGES,
  STATE_NAME_LABELS,
  getActionCenterQueue,
  getDashboardSummary,
  getNationalSummary,
  getStageDurationStats,
  scopeParcelsToSession,
  scopeProjectsToSession,
  type AcquisitionParcel,
  type AcquisitionProject,
} from '../domain';
import { getProjectStatusIcon, getProjectStatusTone, getRiskTone } from './statusDisplay';

const TOP_RISK_PARCEL_COUNT = 10;

export function ReportsPage() {
  const { session } = useSession();
  const { t } = useLanguage();
  const role = session?.role;
  const [projects, setProjects] = useState<AcquisitionProject[]>([]);
  const [parcels, setParcels] = useState<AcquisitionParcel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let isCancelled = false;

    Promise.all([repository.listProjects(), repository.listParcels()])
      .then(([loadedProjects, loadedParcels]) => {
        if (!isCancelled) {
          setProjects(loadedProjects);
          setParcels(loadedParcels);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setLoadError(t(uiText.reports.loadError));
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

  const scopedProjects = useMemo(() => scopeProjectsToSession(projects, session), [projects, session]);
  const scopedParcels = useMemo(
    () => scopeParcelsToSession(parcels, projects, session),
    [parcels, projects, session],
  );

  const dashboardSummary = useMemo(() => getDashboardSummary(scopedParcels), [scopedParcels]);
  const nationalSummary = useMemo(
    () => getNationalSummary(scopedProjects, scopedParcels),
    [scopedProjects, scopedParcels],
  );
  const riskQueue = useMemo(
    () => getActionCenterQueue(scopedParcels, scopedProjects).slice(0, TOP_RISK_PARCEL_COUNT),
    [scopedParcels, scopedProjects],
  );
  const stageDurationStats = useMemo(() => getStageDurationStats(scopedParcels), [scopedParcels]);
  const hasStageDurationData = stageDurationStats.some((stat) => stat.sampleSize > 0);

  const summaryRows = [
    [t(uiText.reports.totalParcelsLabel), dashboardSummary.total],
    [t(uiText.reports.stuckLabel), dashboardSummary.stuck],
    [t(uiText.reports.blockedLabel), dashboardSummary.blocked],
    [t(uiText.reports.readyToAdvanceLabel), dashboardSummary.readyToAdvance],
    [t(uiText.reports.completeLabel), dashboardSummary.complete],
    [t(uiText.reports.missingDocumentsLabel), dashboardSummary.missingDocuments],
    [t(uiText.reports.openObjectionsLabel), dashboardSummary.openObjections],
  ];

  const stageRows = ACQUISITION_STAGES.map((stage) => [
    t(stageLabels[stage.id]),
    dashboardSummary.byStage[stage.id],
  ]);

  const riskRows = riskQueue.map(({ parcel, riskAssessment }) => [
    parcel.surveyNumber,
    parcel.district,
    t(stageLabels[parcel.currentStage]),
    riskAssessment.score,
    <Badge key={`${parcel.id}-level`} tone={getRiskTone(riskAssessment.level)}>
      {t(riskLevelLabels[riskAssessment.level])}
    </Badge>,
    riskAssessment.recommendedAction,
  ]);

  const projectRows = scopedProjects.map((project) => {
    const status = nationalSummary.projectStatuses.find((entry) => entry.projectId === project.id);
    if (!status) {
      return [];
    }

    return [
      project.name,
      STATE_NAME_LABELS[project.state],
      `${status.areaAcquiredPercent}%`,
      `${status.compensationPaidPercent}%`,
      `${status.possessionPercent}%`,
      <Badge key={`${project.id}-status`} tone={getProjectStatusTone(status.status)}>
        <span aria-hidden="true">{getProjectStatusIcon(status.status)}</span> {t(projectStatusLabels[status.status])}
      </Badge>,
    ];
  });

  return (
    <PageContainer>
      <PageHeader
        eyebrow={t(uiText.reports.eyebrow)}
        title={t(uiText.reports.title)}
        description={t(uiText.reports.description)}
        actions={
          <div className="page-actions-group">
            {role && (
              <Badge tone="info">
                {t(uiText.reports.viewingAsPrefix)} {t(appRoleLabels[role])}
              </Badge>
            )}
            <Button onClick={() => window.print()} variant="secondary">
              {t(uiText.reports.printButtonLabel)}
            </Button>
          </div>
        }
      />

      {loadError && (
        <Card>
          <EmptyState title={t(uiText.reports.loadErrorTitle)} description={loadError} />
        </Card>
      )}

      {!loadError && isLoading && <p>{t(uiText.reports.loadingReport)}</p>}

      {!loadError && !isLoading && (
        <>
          <Card eyebrow={t(uiText.reports.summaryEyebrow)} title={t(uiText.reports.summaryTitle)}>
            <DataTable
              caption={t(uiText.reports.summaryTitle)}
              columns={[t(uiText.reports.colMetric), t(uiText.reports.colValue)]}
              rows={summaryRows}
            />
          </Card>

          <Card eyebrow={t(uiText.reports.summaryEyebrow)} title={t(uiText.reports.stageBreakdownTitle)}>
            <DataTable
              caption={t(uiText.reports.stageBreakdownCaption)}
              columns={[t(uiText.reports.colStage), t(uiText.reports.colCount)]}
              rows={stageRows}
            />
          </Card>

          <Card eyebrow={t(uiText.stageDurationChart.eyebrow)} title={t(uiText.stageDurationChart.title)}>
            {hasStageDurationData ? (
              <>
                <p>{t(uiText.stageDurationChart.caption)}</p>
                <StageDurationChart stats={stageDurationStats} />
              </>
            ) : (
              <EmptyState
                title={t(uiText.stageDurationChart.noDataTitle)}
                description={t(uiText.stageDurationChart.noDataDescription)}
              />
            )}
          </Card>

          <Card
            eyebrow={`${riskQueue.length} ${t(uiText.reports.ofTotalWord)} ${scopedParcels.length}`}
            title={t(uiText.reports.topRiskTitle)}
          >
            {riskRows.length > 0 ? (
              <DataTable
                caption={t(uiText.reports.topRiskCaption)}
                columns={[
                  t(uiText.reports.colSurvey),
                  t(uiText.reports.colDistrict),
                  t(uiText.reports.colStage),
                  t(uiText.reports.colScore),
                  t(uiText.reports.colLevel),
                  t(uiText.reports.colRecommendedAction),
                ]}
                rows={riskRows}
              />
            ) : (
              <EmptyState
                title={t(uiText.reports.noRiskyParcelsTitle)}
                description={t(uiText.reports.noRiskyParcelsDescription)}
              />
            )}
          </Card>

          <Card eyebrow={`${scopedProjects.length} ${t(uiText.reports.projectsSuffix)}`} title={t(uiText.reports.projectProgressTitle)}>
            {projectRows.length > 0 ? (
              <DataTable
                caption={t(uiText.reports.projectProgressCaption)}
                columns={[
                  t(uiText.reports.colProject),
                  t(uiText.reports.colState),
                  t(uiText.reports.colAreaPercent),
                  t(uiText.reports.colCompensationPercent),
                  t(uiText.reports.colPossessionPercent),
                  t(uiText.reports.colTimelineStatus),
                ]}
                rows={projectRows}
              />
            ) : (
              <EmptyState
                title={t(uiText.reports.noProjectsTitle)}
                description={t(uiText.reports.noProjectsDescription)}
              />
            )}
          </Card>
        </>
      )}
    </PageContainer>
  );
}
