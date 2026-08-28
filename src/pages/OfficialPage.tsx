import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ParcelMap } from '../components/ParcelMap';
import {
  Badge,
  Card,
  DataTable,
  EmptyState,
  PageContainer,
  PageHeader,
  SelectField,
  TextField,
} from '../components/ui';
import { repository } from '../data';
import { useDataSaver } from '../i18n/DataSaverContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useSession } from '../i18n/SessionContext';
import { appRoleLabels, dashboardStatusLabels, stageLabels, stageShortLabels, uiText } from '../i18n/translations';
import {
  ACQUISITION_STAGES,
  getAdvanceGate,
  getAttentionParcels,
  getDashboardSummary,
  getParcelCalculatedStatus,
  scopeParcelsToSession,
  scopeProjectsToSession,
  type AcquisitionParcel,
  type AcquisitionProject,
  type DashboardStatus,
  type StageId,
} from '../domain';
import { getAdvanceGateReasonText, getBadgeTone, getStatusIcon } from './statusDisplay';

export function OfficialPage() {
  const { isDataSaverOn } = useDataSaver();
  const { session } = useSession();
  const { t } = useLanguage();
  const role = session?.role;
  const [parcels, setParcels] = useState<AcquisitionParcel[]>([]);
  const [projects, setProjects] = useState<AcquisitionProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | undefined>(undefined);

  const [surveyQuery, setSurveyQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [villageFilter, setVillageFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState<'all' | StageId>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | DashboardStatus>('all');

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
          setLoadError(t(uiText.official.loadError));
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

  const districts = useMemo(
    () => Array.from(new Set(scopedParcels.map((parcel) => parcel.district))).sort(),
    [scopedParcels],
  );

  const villages = useMemo(
    () => Array.from(new Set(scopedParcels.map((parcel) => parcel.village))).sort(),
    [scopedParcels],
  );

  const projectOptions = useMemo(
    () => [...scopedProjects].sort((a, b) => a.name.localeCompare(b.name)),
    [scopedProjects],
  );

  const dashboardSummary = useMemo(() => getDashboardSummary(scopedParcels), [scopedParcels]);

  const filteredParcels = useMemo(() => {
    const normalizedSurveyQuery = surveyQuery.trim().toLowerCase();

    return scopedParcels.filter((parcel) => {
      const calculatedStatus = getParcelCalculatedStatus(parcel);

      if (
        normalizedSurveyQuery &&
        !parcel.surveyNumber.toLowerCase().includes(normalizedSurveyQuery)
      ) {
        return false;
      }

      if (districtFilter !== 'all' && parcel.district !== districtFilter) {
        return false;
      }

      if (villageFilter !== 'all' && parcel.village !== villageFilter) {
        return false;
      }

      if (projectFilter !== 'all' && parcel.projectId !== projectFilter) {
        return false;
      }

      if (stageFilter !== 'all' && parcel.currentStage !== stageFilter) {
        return false;
      }

      if (statusFilter !== 'all' && calculatedStatus.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [scopedParcels, surveyQuery, districtFilter, villageFilter, projectFilter, stageFilter, statusFilter]);

  const attentionRows = getAttentionParcels(filteredParcels)
    .slice(0, 6)
    .map(({ parcel, calculatedStatus }) => {
      const gate = getAdvanceGate(parcel);
      const nextAction = gate.canAdvance
        ? `${calculatedStatus.daysInStage} ${t(uiText.official.daysInStageReviewDelaySuffix)}`
        : getAdvanceGateReasonText(parcel.currentStage, calculatedStatus, gate, t);

      return [
        <Link key={`${parcel.id}-link`} to={`/official/parcel/${parcel.id}`}>
          {parcel.surveyNumber}
        </Link>,
        t(stageLabels[parcel.currentStage]),
        <Badge key={`${parcel.id}-status`} tone={getBadgeTone(calculatedStatus.status)}>
          <span aria-hidden="true">{getStatusIcon(calculatedStatus.status)}</span>{' '}
          {t(dashboardStatusLabels[calculatedStatus.status])}
        </Badge>,
        nextAction,
      ];
    });

  const parcelRows = filteredParcels.map((parcel) => {
    const calculatedStatus = getParcelCalculatedStatus(parcel);

    return [
      <Link key={`${parcel.id}-link`} to={`/official/parcel/${parcel.id}`}>
        {parcel.surveyNumber}
      </Link>,
      parcel.village,
      parcel.district,
      t(stageLabels[parcel.currentStage]),
      `${calculatedStatus.daysInStage}d`,
      <Badge key={`${parcel.id}-status`} tone={getBadgeTone(calculatedStatus.status)}>
        <span aria-hidden="true">{getStatusIcon(calculatedStatus.status)}</span>{' '}
        {t(dashboardStatusLabels[calculatedStatus.status])}
      </Badge>,
      calculatedStatus.missingDocumentKinds.length,
      calculatedStatus.openObjectionCount,
    ];
  });

  // Prototype-only view default (Step 17, not real access control): a
  // national admin or state authority role lands directly on the national
  // rollup instead of the district-level parcel view.
  if (role === 'national_admin' || role === 'state_authority') {
    return <Navigate to="/official/national" replace />;
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow={t(uiText.official.eyebrow)}
        title={t(uiText.official.title)}
        description={t(uiText.official.description)}
        actions={
          role && (
            <Badge tone="info">
              {t(uiText.official.viewingAsPrefix)} {t(appRoleLabels[role])}
            </Badge>
          )
        }
      />

      {loadError && (
        <Card>
          <EmptyState title={t(uiText.official.loadErrorTitle)} description={t(uiText.official.loadError)} />
        </Card>
      )}

      {!loadError && (
        <>
          <section className="summary-grid" aria-label="Dashboard summary">
            <Card eyebrow={t(uiText.official.currentLoadEyebrow)} title={t(uiText.official.parcelsTitle)}>
              <p className="metric">{dashboardSummary.total}</p>
              <p>
                {dashboardSummary.complete} {t(uiText.official.completeSuffix)}
              </p>
            </Card>
            <Card eyebrow={t(uiText.official.attentionEyebrow)} title={t(uiText.official.stuckParcelsTitle)}>
              <p className="metric warning">{dashboardSummary.stuck}</p>
              <p>
                {dashboardSummary.blocked} {t(uiText.official.blockedAdditionalSuffix)}
              </p>
            </Card>
            <Card eyebrow={t(uiText.official.documentsEyebrow)} title={t(uiText.official.pendingUploadsTitle)}>
              <p className="metric">{dashboardSummary.missingDocuments}</p>
              <p>
                {dashboardSummary.openObjections} {t(uiText.official.openObjectionsAcrossSuffix)}
              </p>
            </Card>
          </section>

          <Card eyebrow={t(uiText.official.workflowEyebrow)} title={t(uiText.official.byStageTitle)}>
            <div className="stage-grid" aria-label="Parcel count by stage">
              {ACQUISITION_STAGES.map((stage) => (
                <div className="stage-tile" key={stage.id}>
                  <strong>{dashboardSummary.byStage[stage.id]}</strong>
                  <span>{t(stageShortLabels[stage.id])}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card eyebrow={t(uiText.official.controlsEyebrow)} title={t(uiText.official.filtersTitle)}>
            <form className="filter-grid" onSubmit={(event) => event.preventDefault()}>
              <TextField
                label={t(uiText.official.surveyNumberLabel)}
                placeholder={t(uiText.official.surveyNumberPlaceholder)}
                value={surveyQuery}
                onChange={(event) => setSurveyQuery(event.target.value)}
              />
              <SelectField
                label={t(uiText.official.districtLabel)}
                value={districtFilter}
                onChange={(event) => setDistrictFilter(event.target.value)}
              >
                <option value="all">{t(uiText.official.allDistricts)}</option>
                {districts.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label={t(uiText.official.villageLabel)}
                value={villageFilter}
                onChange={(event) => setVillageFilter(event.target.value)}
              >
                <option value="all">{t(uiText.official.allVillages)}</option>
                {villages.map((village) => (
                  <option key={village} value={village}>
                    {village}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label={t(uiText.official.projectLabel)}
                value={projectFilter}
                onChange={(event) => setProjectFilter(event.target.value)}
              >
                <option value="all">{t(uiText.official.allProjects)}</option>
                {projectOptions.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label={t(uiText.official.stageLabel)}
                value={stageFilter}
                onChange={(event) => setStageFilter(event.target.value as 'all' | StageId)}
              >
                <option value="all">{t(uiText.official.allStages)}</option>
                {ACQUISITION_STAGES.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {t(stageLabels[stage.id])}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label={t(uiText.official.statusLabel)}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'all' | DashboardStatus)}
              >
                <option value="all">{t(uiText.official.allStatuses)}</option>
                <option value="stuck">{t(uiText.official.stuckOnly)}</option>
                <option value="blocked">{t(uiText.official.blockedOnly)}</option>
                <option value="ready_to_advance">{t(uiText.official.readyToAdvanceOption)}</option>
                <option value="on_track">{t(uiText.official.onTrackOption)}</option>
                <option value="complete">{t(uiText.official.completeOption)}</option>
              </SelectField>
            </form>
          </Card>

          <Card
            eyebrow={`${filteredParcels.length} ${t(uiText.official.shownSuffix)}`}
            title={t(uiText.official.mapTitle)}
          >
            {isDataSaverOn ? (
              <EmptyState
                title={t(uiText.official.mapHiddenTitle)}
                description={t(uiText.official.mapHiddenDescription)}
              />
            ) : filteredParcels.length > 0 ? (
              <ParcelMap parcels={filteredParcels} projects={scopedProjects} />
            ) : (
              <EmptyState
                title={t(uiText.official.noParcelsMapTitle)}
                description={t(uiText.official.adjustFiltersDescription)}
              />
            )}
          </Card>

          <Card eyebrow={t(uiText.official.attentionQueueEyebrow)} title={t(uiText.official.parcelsNeedingReviewTitle)}>
            {attentionRows.length > 0 ? (
              <DataTable
                caption={t(uiText.official.attentionCaption)}
                columns={[
                  t(uiText.official.colSurvey),
                  t(uiText.official.colStage),
                  t(uiText.official.colStatus),
                  t(uiText.official.colNextAction),
                ]}
                rows={attentionRows}
              />
            ) : (
              <EmptyState
                title={t(uiText.official.nothingNeedsAttentionTitle)}
                description={t(uiText.official.nothingNeedsAttentionDescription)}
              />
            )}
          </Card>

          <Card
            eyebrow={`${filteredParcels.length} ${t(uiText.official.ofWord)} ${scopedParcels.length}`}
            title={t(uiText.official.parcelListTitle)}
          >
            {isLoading ? (
              <p>{t(uiText.official.loadingParcels)}</p>
            ) : parcelRows.length > 0 ? (
              <DataTable
                caption={t(uiText.official.listCaption)}
                columns={[
                  t(uiText.official.colSurvey),
                  t(uiText.official.colVillage),
                  t(uiText.official.colDistrict),
                  t(uiText.official.colStage),
                  t(uiText.official.colDaysInStage),
                  t(uiText.official.colStatus),
                  t(uiText.official.colMissingDocs),
                  t(uiText.official.colOpenObjections),
                ]}
                rows={parcelRows}
              />
            ) : (
              <EmptyState
                title={t(uiText.official.noParcelsMatchTitle)}
                description={t(uiText.official.adjustFiltersDescription)}
              />
            )}
          </Card>
        </>
      )}
    </PageContainer>
  );
}
