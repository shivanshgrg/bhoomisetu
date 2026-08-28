import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ParcelMap } from '../components/ParcelMap';
import {
  Badge,
  Button,
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
import { useRole } from '../i18n/RoleContext';
import {
  ACQUISITION_STAGES,
  STAGE_BY_ID,
  STAKEHOLDER_ROLE_LABELS,
  getAdvanceGate,
  getAttentionParcels,
  getDashboardSummary,
  getParcelCalculatedStatus,
  type AcquisitionParcel,
  type AcquisitionProject,
  type DashboardStatus,
  type StageId,
} from '../domain';
import { getBadgeTone, getStatusIcon, getStatusLabel } from './statusDisplay';

export function OfficialPage() {
  const { isDataSaverOn } = useDataSaver();
  const { role } = useRole();
  const [parcels, setParcels] = useState<AcquisitionParcel[]>([]);
  const [projects, setProjects] = useState<AcquisitionProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | undefined>(undefined);

  const [surveyQuery, setSurveyQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState('all');
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
          setLoadError('Parcel data could not be loaded. Try reloading the page.');
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
  }, []);

  const districts = useMemo(
    () => Array.from(new Set(parcels.map((parcel) => parcel.district))).sort(),
    [parcels],
  );

  const dashboardSummary = useMemo(() => getDashboardSummary(parcels), [parcels]);

  const filteredParcels = useMemo(() => {
    const normalizedSurveyQuery = surveyQuery.trim().toLowerCase();

    return parcels.filter((parcel) => {
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

      if (stageFilter !== 'all' && parcel.currentStage !== stageFilter) {
        return false;
      }

      if (statusFilter !== 'all' && calculatedStatus.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [parcels, surveyQuery, districtFilter, stageFilter, statusFilter]);

  const attentionRows = getAttentionParcels(filteredParcels)
    .slice(0, 6)
    .map(({ parcel, calculatedStatus }) => {
      const gate = getAdvanceGate(parcel);
      const nextAction = gate.canAdvance
        ? `${calculatedStatus.daysInStage} days in stage; review delay`
        : gate.reasons[0];

      return [
        <Link key={`${parcel.id}-link`} to={`/official/parcel/${parcel.id}`}>
          {parcel.surveyNumber}
        </Link>,
        STAGE_BY_ID[parcel.currentStage].label,
        <Badge key={`${parcel.id}-status`} tone={getBadgeTone(calculatedStatus.status)}>
          <span aria-hidden="true">{getStatusIcon(calculatedStatus.status)}</span> {getStatusLabel(calculatedStatus.status)}
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
      STAGE_BY_ID[parcel.currentStage].label,
      `${calculatedStatus.daysInStage}d`,
      <Badge key={`${parcel.id}-status`} tone={getBadgeTone(calculatedStatus.status)}>
        <span aria-hidden="true">{getStatusIcon(calculatedStatus.status)}</span> {getStatusLabel(calculatedStatus.status)}
      </Badge>,
      calculatedStatus.missingDocumentKinds.length,
      calculatedStatus.openObjectionCount,
    ];
  });

  // Prototype-only view default (Step 17, not real access control): a
  // Central/State viewer role lands directly on the national rollup instead
  // of the district-level parcel view.
  if (role === 'central_state_viewer') {
    return <Navigate to="/official/national" replace />;
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Official workspace"
        title="Parcel Monitoring"
        description="Live dashboard for stage counts, survey search, filters, attention queues, and parcel review."
        actions={
          <div className="page-actions-group">
            {role && <Badge tone="info">Viewing as: {STAKEHOLDER_ROLE_LABELS[role]}</Badge>}
            <Link to="/official/national">
              <Button type="button" variant="secondary">
                National Dashboard
              </Button>
            </Link>
          </div>
        }
      />

      {loadError && (
        <Card>
          <EmptyState title="Unable to load parcels" description={loadError} />
        </Card>
      )}

      {!loadError && (
        <>
          <section className="summary-grid" aria-label="Dashboard summary">
            <Card eyebrow="Current load" title="Parcels">
              <p className="metric">{dashboardSummary.total}</p>
              <p>{dashboardSummary.complete} complete of the full acquisition workflow.</p>
            </Card>
            <Card eyebrow="Attention" title="Stuck Parcels">
              <p className="metric warning">{dashboardSummary.stuck}</p>
              <p>{dashboardSummary.blocked} additional parcels blocked on documents or objections.</p>
            </Card>
            <Card eyebrow="Documents" title="Pending Uploads">
              <p className="metric">{dashboardSummary.missingDocuments}</p>
              <p>{dashboardSummary.openObjections} objections still open across all parcels.</p>
            </Card>
          </section>

          <Card eyebrow="Workflow" title="Parcels by Stage">
            <div className="stage-grid" aria-label="Parcel count by stage">
              {ACQUISITION_STAGES.map((stage) => (
                <div className="stage-tile" key={stage.id}>
                  <strong>{dashboardSummary.byStage[stage.id]}</strong>
                  <span>{stage.shortLabel}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card eyebrow="Controls" title="Survey Search and Filters">
            <form className="filter-grid" onSubmit={(event) => event.preventDefault()}>
              <TextField
                label="Survey number"
                placeholder="124/7"
                value={surveyQuery}
                onChange={(event) => setSurveyQuery(event.target.value)}
              />
              <SelectField
                label="District"
                value={districtFilter}
                onChange={(event) => setDistrictFilter(event.target.value)}
              >
                <option value="all">All districts</option>
                {districts.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Stage"
                value={stageFilter}
                onChange={(event) => setStageFilter(event.target.value as 'all' | StageId)}
              >
                <option value="all">All stages</option>
                {ACQUISITION_STAGES.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.label}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'all' | DashboardStatus)}
              >
                <option value="all">All statuses</option>
                <option value="stuck">Stuck only</option>
                <option value="blocked">Blocked only</option>
                <option value="ready_to_advance">Ready to advance</option>
                <option value="on_track">On track</option>
                <option value="complete">Complete</option>
              </SelectField>
            </form>
          </Card>

          <Card eyebrow={`${filteredParcels.length} shown`} title="Parcel Map">
            {isDataSaverOn ? (
              <EmptyState
                title="Map hidden to save data"
                description="Turn off Data Saver in the navigation bar to load the map tiles."
              />
            ) : filteredParcels.length > 0 ? (
              <ParcelMap parcels={filteredParcels} projects={projects} />
            ) : (
              <EmptyState
                title="No parcels to show on the map"
                description="Adjust the survey number, district, stage, or status filters."
              />
            )}
          </Card>

          <Card eyebrow="Attention queue" title="Parcels Needing Review">
            {attentionRows.length > 0 ? (
              <DataTable
                caption="Stuck or blocked parcels, most delayed first"
                columns={['Survey', 'Stage', 'Status', 'Next action']}
                rows={attentionRows}
              />
            ) : (
              <EmptyState
                title="Nothing needs attention"
                description="No stuck or blocked parcels match the current filters."
              />
            )}
          </Card>

          <Card eyebrow={`${filteredParcels.length} of ${parcels.length}`} title="Parcel List">
            {isLoading ? (
              <p>Loading parcels…</p>
            ) : parcelRows.length > 0 ? (
              <DataTable
                caption="Filtered parcel list"
                columns={[
                  'Survey',
                  'Village',
                  'District',
                  'Stage',
                  'Days in stage',
                  'Status',
                  'Missing docs',
                  'Open objections',
                ]}
                rows={parcelRows}
              />
            ) : (
              <EmptyState
                title="No parcels match these filters"
                description="Adjust the survey number, district, stage, or status filters."
              />
            )}
          </Card>
        </>
      )}
    </PageContainer>
  );
}
