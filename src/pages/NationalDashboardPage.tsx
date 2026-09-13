import { useEffect, useMemo, useState } from 'react';
import { ProjectTimeline } from '../components/ProjectTimeline';
import { TimeTravelScrubber } from '../components/TimeTravelScrubber';
import { Badge, Card, DataTable, EmptyState, PageContainer, PageHeader } from '../components/ui';
import { repository } from '../data';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useDataSaver } from '../i18n/DataSaverContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useSession } from '../i18n/SessionContext';
import { appRoleLabels, projectStatusLabels, uiText } from '../i18n/translations';
import {
  DEMO_REFERENCE_DATE,
  PROJECT_SECTOR_LABELS,
  STATE_NAME_LABELS,
  getLapseStatus,
  getNationalSummary,
  getParcelsStateAsOf,
  scopeParcelsToSession,
  scopeProjectsToSession,
  type AcquisitionParcel,
  type AcquisitionProject,
  type ISODateString,
} from '../domain';
import { getProjectStatusIcon, getProjectStatusTone } from './statusDisplay';

const SCRUBBER_DEBOUNCE_MS = 150;

function formatCurrency(amount: number) {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function formatHectares(amount: number) {
  return `${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })} ha`;
}

export function NationalDashboardPage() {
  const { session } = useSession();
  const { isDataSaverOn } = useDataSaver();
  const { t } = useLanguage();
  const role = session?.role;
  const [projects, setProjects] = useState<AcquisitionProject[]>([]);
  const [parcels, setParcels] = useState<AcquisitionParcel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | undefined>(undefined);
  const [scrubberDate, setScrubberDate] = useState<ISODateString>(DEMO_REFERENCE_DATE);

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
          setLoadError(t(uiText.nationalDashboard.loadError));
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

  const scrubberMinDate = useMemo(() => {
    const allEnteredOn = scopedParcels.flatMap((parcel) => parcel.history.map((entry) => entry.enteredOn));
    return allEnteredOn.length > 0 ? allEnteredOn.sort()[0] : DEMO_REFERENCE_DATE;
  }, [scopedParcels]);

  const debouncedScrubberDate = useDebouncedValue(scrubberDate, SCRUBBER_DEBOUNCE_MS);

  const snapshotParcels = useMemo(
    () => getParcelsStateAsOf(scopedParcels, debouncedScrubberDate),
    [scopedParcels, debouncedScrubberDate],
  );

  const nationalSummary = useMemo(
    () => getNationalSummary(scopedProjects, snapshotParcels, debouncedScrubberDate),
    [scopedProjects, snapshotParcels, debouncedScrubberDate],
  );

  const lapseRiskCounts = useMemo(() => {
    return scopedParcels.reduce(
      (counts, parcel) => {
        const risk = getLapseStatus(parcel).risk;
        if (risk === 'approaching') {
          counts.approaching += 1;
        } else if (risk === 'lapsed') {
          counts.lapsed += 1;
        }
        return counts;
      },
      { approaching: 0, lapsed: 0 },
    );
  }, [scopedParcels]);

  const rAndRTotals = useMemo(
    () =>
      scopedProjects.reduce(
        (totals, project) => ({
          affectedFamilies: totals.affectedFamilies + project.rAndR.affectedFamilies,
          displacedFamilies: totals.displacedFamilies + project.rAndR.displacedFamilies,
          familiesResettled: totals.familiesResettled + project.rAndR.familiesResettled,
          checklistCompleteCount: totals.checklistCompleteCount + (project.rAndR.rrChecklistComplete ? 1 : 0),
        }),
        { affectedFamilies: 0, displacedFamilies: 0, familiesResettled: 0, checklistCompleteCount: 0 },
      ),
    [scopedProjects],
  );

  const resettlementPercent =
    rAndRTotals.displacedFamilies > 0
      ? Math.round((rAndRTotals.familiesResettled / rAndRTotals.displacedFamilies) * 100)
      : 0;

  const rAndRRows = scopedProjects.map((project) => {
    const displaced = project.rAndR.displacedFamilies;
    const resettledPercent = displaced > 0 ? Math.round((project.rAndR.familiesResettled / displaced) * 100) : 0;

    return [
      project.name,
      STATE_NAME_LABELS[project.state],
      project.rAndR.affectedFamilies.toLocaleString('en-IN'),
      project.rAndR.displacedFamilies.toLocaleString('en-IN'),
      `${project.rAndR.familiesResettled.toLocaleString('en-IN')} (${resettledPercent}%)`,
      <Badge key={`${project.id}-rr-checklist`} tone={project.rAndR.rrChecklistComplete ? 'success' : 'warning'}>
        {project.rAndR.rrChecklistComplete
          ? t(uiText.nationalDashboard.checklistComplete)
          : t(uiText.nationalDashboard.checklistPending)}
      </Badge>,
    ];
  });

  const projectRows = scopedProjects.map((project) => {
    const status = nationalSummary.projectStatuses.find((entry) => entry.projectId === project.id);
    if (!status) {
      return [];
    }

    return [
      project.name,
      STATE_NAME_LABELS[project.state],
      PROJECT_SECTOR_LABELS[project.sector],
      `${formatHectares(status.areaAcquiredHectares)} / ${formatHectares(status.areaNotifiedHectares)}`,
      `${status.areaAcquiredPercent}%`,
      `${formatCurrency(status.compensationPaid)} / ${formatCurrency(status.compensationAssessed)}`,
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
        eyebrow={t(uiText.nationalDashboard.eyebrow)}
        title={t(uiText.nationalDashboard.title)}
        description={t(uiText.nationalDashboard.description)}
        actions={
          role && (
            <Badge tone="info">
              {t(uiText.nationalDashboard.viewingAsPrefix)} {t(appRoleLabels[role])}
            </Badge>
          )
        }
      />

      {loadError && (
        <Card>
          <EmptyState title={t(uiText.nationalDashboard.loadErrorTitle)} description={loadError} />
        </Card>
      )}

      {!loadError && (
        <>
          <TimeTravelScrubber
            minDate={scrubberMinDate}
            maxDate={DEMO_REFERENCE_DATE}
            value={scrubberDate}
            onChange={setScrubberDate}
          />

          <section className="summary-grid" aria-label="National summary">
            <Card eyebrow={t(uiText.nationalDashboard.coverageEyebrow)} title={t(uiText.nationalDashboard.projectsStatesTitle)}>
              <p className="metric">{nationalSummary.totalProjects}</p>
              <p>
                {t(uiText.nationalDashboard.acrossWord)} {nationalSummary.totalStates}{' '}
                {t(uiText.nationalDashboard.statesSuffix)}
              </p>
            </Card>
            <Card eyebrow={t(uiText.nationalDashboard.landEyebrow)} title={t(uiText.nationalDashboard.areaAcquiredNotifiedTitle)}>
              <p className="metric">{formatHectares(nationalSummary.areaAcquiredHectares)}</p>
              <p>
                {t(uiText.nationalDashboard.ofWord)} {formatHectares(nationalSummary.areaNotifiedHectares)}{' '}
                {t(uiText.nationalDashboard.notifiedNationallySuffix)}
              </p>
            </Card>
            <Card eyebrow={t(uiText.nationalDashboard.compensationEyebrow)} title={t(uiText.nationalDashboard.paidAssessedTitle)}>
              <p className="metric">{formatCurrency(nationalSummary.compensationPaid)}</p>
              <p>
                {t(uiText.nationalDashboard.ofWord)} {formatCurrency(nationalSummary.compensationAssessed)}{' '}
                {t(uiText.nationalDashboard.assessedNationallySuffix)}
              </p>
            </Card>
            <Card
              eyebrow={t(uiText.nationalDashboard.timelineAdherenceEyebrow)}
              title={t(uiText.nationalDashboard.projectStatusTitle)}
            >
              <p className="metric">
                {nationalSummary.onTrackCount} {t(uiText.nationalDashboard.onTrackSuffix)}
              </p>
              <p>
                {nationalSummary.atRiskCount} {t(uiText.nationalDashboard.atRiskSuffix)} {nationalSummary.delayedCount}{' '}
                {t(uiText.nationalDashboard.delayedSuffix)} {nationalSummary.completeCount}{' '}
                {t(uiText.nationalDashboard.completeSuffix)}
              </p>
            </Card>
            <Card
              eyebrow={t(uiText.lapseClock.eyebrow)}
              title={t(uiText.lapseClock.dashboardTileTitle)}
            >
              <p className="metric">
                {lapseRiskCounts.approaching + lapseRiskCounts.lapsed} {t(uiText.lapseClock.dashboardOfWord)}{' '}
                {scopedParcels.length} {t(uiText.lapseClock.dashboardParcelsSuffix)}
              </p>
              <p>
                {lapseRiskCounts.approaching} {t(uiText.lapseClock.dashboardApproachingSuffix)}, {lapseRiskCounts.lapsed}{' '}
                {t(uiText.lapseClock.dashboardLapsedSuffix)}
              </p>
            </Card>
            <Card
              eyebrow={t(uiText.nationalDashboard.socialImpactEyebrow)}
              title={t(uiText.nationalDashboard.rAndRAffectedFamiliesTitle)}
            >
              <p className="metric">
                {rAndRTotals.familiesResettled.toLocaleString('en-IN')} / {rAndRTotals.displacedFamilies.toLocaleString('en-IN')}
              </p>
              <p>
                {t(uiText.nationalDashboard.familiesResettledOfWord)} {rAndRTotals.displacedFamilies.toLocaleString('en-IN')}{' '}
                {t(uiText.nationalDashboard.displacedWord)} ({resettlementPercent}%), {t(uiText.nationalDashboard.outOfWord)}{' '}
                {rAndRTotals.affectedFamilies.toLocaleString('en-IN')} {t(uiText.nationalDashboard.affectedNationallySuffix)}{' '}
                {rAndRTotals.checklistCompleteCount} {t(uiText.nationalDashboard.checklistCompleteMiddleWord)}{' '}
                {scopedProjects.length} {t(uiText.nationalDashboard.projectsChecklistSuffix)}
              </p>
            </Card>
          </section>

          <Card eyebrow={t(uiText.timeline.eyebrow)} title={t(uiText.timeline.title)}>
            {isLoading ? (
              <p>{t(uiText.nationalDashboard.loadingNationalDashboard)}</p>
            ) : isDataSaverOn ? (
              <EmptyState
                title={t(uiText.timeline.tableFallbackTitle)}
                description={t(uiText.timeline.tableFallbackDescription)}
              />
            ) : scopedProjects.length > 0 ? (
              <>
                <p>{t(uiText.timeline.description)}</p>
                <ProjectTimeline projects={scopedProjects} statuses={nationalSummary.projectStatuses} />
              </>
            ) : (
              <EmptyState
                title={t(uiText.nationalDashboard.noProjectsFoundTitle)}
                description={t(uiText.nationalDashboard.noProjectsFoundDescription)}
              />
            )}
          </Card>

          <Card
            eyebrow={`${scopedProjects.length} ${t(uiText.nationalDashboard.projectsSuffix)}`}
            title={t(uiText.nationalDashboard.rAndRByProjectTitle)}
          >
            {isLoading ? (
              <p>{t(uiText.nationalDashboard.loadingNationalDashboard)}</p>
            ) : rAndRRows.length > 0 ? (
              <DataTable
                caption={t(uiText.nationalDashboard.rAndRCaption)}
                columns={[
                  t(uiText.nationalDashboard.colProject),
                  t(uiText.nationalDashboard.colState),
                  t(uiText.nationalDashboard.colAffectedFamilies),
                  t(uiText.nationalDashboard.colDisplacedFamilies),
                  t(uiText.nationalDashboard.colResettledPercent),
                  t(uiText.nationalDashboard.colRAndRChecklist),
                ]}
                rows={rAndRRows}
              />
            ) : (
              <EmptyState
                title={t(uiText.nationalDashboard.noProjectsFoundTitle)}
                description={t(uiText.nationalDashboard.noProjectsFoundDescription)}
              />
            )}
          </Card>

          <Card
            eyebrow={`${scopedProjects.length} ${t(uiText.nationalDashboard.projectsSuffix)}`}
            title={t(uiText.nationalDashboard.projectWiseProgressTitle)}
          >
            {isLoading ? (
              <p>{t(uiText.nationalDashboard.loadingNationalDashboard)}</p>
            ) : projectRows.length > 0 ? (
              <DataTable
                caption={t(uiText.nationalDashboard.projectProgressCaption)}
                columns={[
                  t(uiText.nationalDashboard.colProject),
                  t(uiText.nationalDashboard.colState),
                  t(uiText.nationalDashboard.colSector),
                  t(uiText.nationalDashboard.colAreaAcquiredNotified),
                  t(uiText.nationalDashboard.colAreaPercent),
                  t(uiText.nationalDashboard.colCompensationPaidAssessed),
                  t(uiText.nationalDashboard.colCompensationPercent),
                  t(uiText.nationalDashboard.colPossessionPercent),
                  t(uiText.nationalDashboard.colTimelineStatus),
                ]}
                rows={projectRows}
              />
            ) : (
              <EmptyState
                title={t(uiText.nationalDashboard.noProjectsFoundTitle)}
                description={t(uiText.nationalDashboard.noProjectsFoundDescription)}
              />
            )}
          </Card>
        </>
      )}
    </PageContainer>
  );
}
