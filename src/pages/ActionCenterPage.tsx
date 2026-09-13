import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { TimeTravelScrubber } from '../components/TimeTravelScrubber';
import { Badge, Card, DataTable, EmptyState, PageContainer, PageHeader, Pagination } from '../components/ui';
import { repository } from '../data';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { usePagination } from '../hooks/usePagination';
import { useLanguage } from '../i18n/LanguageContext';
import { useSession } from '../i18n/SessionContext';
import { appRoleLabels, escalationLevelLabels, lapseRiskLabels, riskLevelLabels, stageLabels, uiText, type TranslationEntry } from '../i18n/translations';
import {
  DEMO_REFERENCE_DATE,
  ESCALATION_LEVEL_TO_APP_ROLE,
  getActionCenterQueue,
  getEscalationStatus,
  getLapseStatus,
  getParcelsStateAsOf,
  scopeParcelsToSession,
  scopeProjectsToSession,
  type AcquisitionParcel,
  type AcquisitionProject,
  type ISODateString,
} from '../domain';

const SCRUBBER_DEBOUNCE_MS = 150;
import {
  getEscalationTone,
  getLapseRiskTone,
  getPaginationPageLabel,
  getPaginationSummary,
  getRiskTone,
} from './statusDisplay';

const QUEUE_PAGE_SIZE = 25;

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
  const [escalatedToMeOnly, setEscalatedToMeOnly] = useState(false);
  const [lapseRiskOnly, setLapseRiskOnly] = useState(false);
  const [scrubberDate, setScrubberDate] = useState<ISODateString>(DEMO_REFERENCE_DATE);

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

  const scrubberMinDate = useMemo(() => {
    const allEnteredOn = scopedParcels.flatMap((parcel) => parcel.history.map((entry) => entry.enteredOn));
    return allEnteredOn.length > 0 ? allEnteredOn.sort()[0] : DEMO_REFERENCE_DATE;
  }, [scopedParcels]);

  const debouncedScrubberDate = useDebouncedValue(scrubberDate, SCRUBBER_DEBOUNCE_MS);

  const snapshotParcels = useMemo(
    () => getParcelsStateAsOf(scopedParcels, debouncedScrubberDate),
    [scopedParcels, debouncedScrubberDate],
  );

  const fullQueue = useMemo(
    () => getActionCenterQueue(snapshotParcels, scopedProjects, debouncedScrubberDate),
    [snapshotParcels, scopedProjects, debouncedScrubberDate],
  );

  const escalationFilteredQueue = useMemo(() => {
    if (!escalatedToMeOnly || !role) {
      return fullQueue;
    }
    return fullQueue.filter(({ parcel }) => ESCALATION_LEVEL_TO_APP_ROLE[getEscalationStatus(parcel).level] === role);
  }, [fullQueue, escalatedToMeOnly, role]);

  // Step 63: reuses the same risk-score-sorted queue, just filtered and
  // re-sorted by urgency (soonest deadline first) — no new detection or
  // ranking logic, so a parcel approaching a statutory lapse surfaces in the
  // same list an officer already checks, not a separate one-off view.
  const queue = useMemo(() => {
    if (!lapseRiskOnly) {
      return escalationFilteredQueue;
    }
    return [...escalationFilteredQueue]
      .filter(({ parcel }) => getLapseStatus(parcel).risk !== 'safe')
      .sort((first, second) => getLapseStatus(first.parcel).daysRemaining - getLapseStatus(second.parcel).daysRemaining);
  }, [escalationFilteredQueue, lapseRiskOnly]);

  const { page, pageCount, pageItems, setPage } = usePagination(queue, QUEUE_PAGE_SIZE, queue.length);

  const queueRows = useMemo(
    () =>
      pageItems.map(({ parcel, riskAssessment }) => {
        const escalation = getEscalationStatus(parcel);
        const lapseStatus = getLapseStatus(parcel);
        return [
          <Link key={`${parcel.id}-link`} to={`/official/parcel/${parcel.id}`}>
            {parcel.surveyNumber}
          </Link>,
          parcel.district,
          t(stageLabels[parcel.currentStage]),
          riskAssessment.score,
          <Badge key={`${parcel.id}-level`} tone={getRiskTone(riskAssessment.level)}>
            {t(riskLevelLabels[riskAssessment.level])}
          </Badge>,
          <Badge key={`${parcel.id}-escalation`} tone={getEscalationTone(escalation.level)}>
            {t(escalationLevelLabels[escalation.level])}
          </Badge>,
          <Badge key={`${parcel.id}-lapse`} tone={getLapseRiskTone(lapseStatus.risk)}>
            {t(lapseRiskLabels[lapseStatus.risk])}
          </Badge>,
          formatReasons(riskAssessment.contributors, t),
          riskAssessment.recommendedAction,
        ];
      }),
    [pageItems, t],
  );

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
        <TimeTravelScrubber
          minDate={scrubberMinDate}
          maxDate={DEMO_REFERENCE_DATE}
          value={scrubberDate}
          onChange={setScrubberDate}
        />
      )}

      {!loadError && (
        <div className="row-actions" style={{ marginBottom: 12 }}>
          {role && role !== 'landowner' && (
            <label className="row-actions">
              <input
                type="checkbox"
                checked={escalatedToMeOnly}
                onChange={(event) => setEscalatedToMeOnly(event.target.checked)}
              />
              {t(uiText.escalation.escalatedToMeFilter)}
            </label>
          )}
          <label className="row-actions">
            <input
              type="checkbox"
              checked={lapseRiskOnly}
              onChange={(event) => setLapseRiskOnly(event.target.checked)}
            />
            {t(uiText.lapseClock.actionCenterFilterLabel)}
          </label>
        </div>
      )}

      {!loadError && (
        <Card eyebrow={`${queue.length} ${t(uiText.actionCenter.inScopeSuffix)}`} title={t(uiText.actionCenter.riskQueueTitle)}>
          {isLoading ? (
            <p>{t(uiText.actionCenter.loadingParcels)}</p>
          ) : queueRows.length > 0 ? (
            <>
              <DataTable
                caption={t(uiText.actionCenter.queueCaption)}
                columns={[
                  t(uiText.actionCenter.colSurvey),
                  t(uiText.actionCenter.colDistrict),
                  t(uiText.actionCenter.colStage),
                  t(uiText.actionCenter.colScore),
                  t(uiText.actionCenter.colLevel),
                  t(uiText.escalation.colLevel),
                  t(uiText.lapseClock.actionCenterColLapse),
                  t(uiText.actionCenter.colReasons),
                  t(uiText.actionCenter.colRecommendedAction),
                ]}
                rows={queueRows}
              />
              <Pagination
                page={page}
                pageCount={pageCount}
                onPageChange={setPage}
                summary={getPaginationSummary(queue.length, page, QUEUE_PAGE_SIZE, t)}
                pageLabel={getPaginationPageLabel(page, pageCount, t)}
                previousLabel={t(uiText.pagination.previous)}
                nextLabel={t(uiText.pagination.next)}
              />
            </>
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
