import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, DataTable, EmptyState, PageContainer, PageHeader } from '../components/ui';
import { repository } from '../data';
import { useRole } from '../i18n/RoleContext';
import {
  PROJECT_SECTOR_LABELS,
  STAKEHOLDER_ROLE_LABELS,
  STATE_NAME_LABELS,
  getNationalSummary,
  type AcquisitionParcel,
  type AcquisitionProject,
} from '../domain';
import { getProjectStatusIcon, getProjectStatusLabel, getProjectStatusTone } from './statusDisplay';

function formatCurrency(amount: number) {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function formatHectares(amount: number) {
  return `${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })} ha`;
}

export function NationalDashboardPage() {
  const { role } = useRole();
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
          setLoadError('National dashboard data could not be loaded. Try reloading the page.');
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

  const nationalSummary = useMemo(() => getNationalSummary(projects, parcels), [projects, parcels]);

  const rAndRTotals = useMemo(
    () =>
      projects.reduce(
        (totals, project) => ({
          affectedFamilies: totals.affectedFamilies + project.rAndR.affectedFamilies,
          displacedFamilies: totals.displacedFamilies + project.rAndR.displacedFamilies,
          familiesResettled: totals.familiesResettled + project.rAndR.familiesResettled,
          checklistCompleteCount: totals.checklistCompleteCount + (project.rAndR.rrChecklistComplete ? 1 : 0),
        }),
        { affectedFamilies: 0, displacedFamilies: 0, familiesResettled: 0, checklistCompleteCount: 0 },
      ),
    [projects],
  );

  const resettlementPercent =
    rAndRTotals.displacedFamilies > 0
      ? Math.round((rAndRTotals.familiesResettled / rAndRTotals.displacedFamilies) * 100)
      : 0;

  const rAndRRows = projects.map((project) => {
    const displaced = project.rAndR.displacedFamilies;
    const resettledPercent = displaced > 0 ? Math.round((project.rAndR.familiesResettled / displaced) * 100) : 0;

    return [
      project.name,
      STATE_NAME_LABELS[project.state],
      project.rAndR.affectedFamilies.toLocaleString('en-IN'),
      project.rAndR.displacedFamilies.toLocaleString('en-IN'),
      `${project.rAndR.familiesResettled.toLocaleString('en-IN')} (${resettledPercent}%)`,
      <Badge key={`${project.id}-rr-checklist`} tone={project.rAndR.rrChecklistComplete ? 'success' : 'warning'}>
        {project.rAndR.rrChecklistComplete ? 'Complete' : 'Pending'}
      </Badge>,
    ];
  });

  const projectRows = projects.map((project) => {
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
        <span aria-hidden="true">{getProjectStatusIcon(status.status)}</span> {getProjectStatusLabel(status.status)}
      </Badge>,
    ];
  });

  return (
    <PageContainer>
      <PageHeader
        eyebrow="National overview"
        title="National Dashboard"
        description="Aggregate progress across every state and project — area, compensation, possession, and timeline adherence."
        actions={
          <div className="page-actions-group">
            {role && <Badge tone="info">Viewing as: {STAKEHOLDER_ROLE_LABELS[role]}</Badge>}
            <Link to="/official">
              <Button type="button" variant="secondary">
                Back to district dashboard
              </Button>
            </Link>
          </div>
        }
      />

      {loadError && (
        <Card>
          <EmptyState title="Unable to load national data" description={loadError} />
        </Card>
      )}

      {!loadError && (
        <>
          <section className="summary-grid" aria-label="National summary">
            <Card eyebrow="Coverage" title="Projects & States">
              <p className="metric">{nationalSummary.totalProjects}</p>
              <p>Across {nationalSummary.totalStates} states.</p>
            </Card>
            <Card eyebrow="Land" title="Area Acquired / Notified">
              <p className="metric">{formatHectares(nationalSummary.areaAcquiredHectares)}</p>
              <p>of {formatHectares(nationalSummary.areaNotifiedHectares)} notified nationally.</p>
            </Card>
            <Card eyebrow="Compensation" title="Paid / Assessed">
              <p className="metric">{formatCurrency(nationalSummary.compensationPaid)}</p>
              <p>of {formatCurrency(nationalSummary.compensationAssessed)} assessed nationally.</p>
            </Card>
            <Card eyebrow="Timeline adherence" title="Project Status">
              <p className="metric">{nationalSummary.onTrackCount} on track</p>
              <p>
                {nationalSummary.atRiskCount} at risk, {nationalSummary.delayedCount} delayed,{' '}
                {nationalSummary.completeCount} complete.
              </p>
            </Card>
            <Card eyebrow="Social impact" title="R&R & Affected Families">
              <p className="metric">
                {rAndRTotals.familiesResettled.toLocaleString('en-IN')} / {rAndRTotals.displacedFamilies.toLocaleString('en-IN')}
              </p>
              <p>
                families resettled of {rAndRTotals.displacedFamilies.toLocaleString('en-IN')} displaced (
                {resettlementPercent}%), out of {rAndRTotals.affectedFamilies.toLocaleString('en-IN')} affected
                nationally. {rAndRTotals.checklistCompleteCount} of {projects.length} projects have a complete R&R
                checklist.
              </p>
            </Card>
          </section>

          <Card eyebrow={`${projects.length} projects`} title="Rehabilitation & Resettlement by Project">
            {isLoading ? (
              <p>Loading national dashboard…</p>
            ) : rAndRRows.length > 0 ? (
              <DataTable
                caption="Affected, displaced, and resettled families per project"
                columns={['Project', 'State', 'Affected families', 'Displaced families', 'Resettled (%)', 'R&R checklist']}
                rows={rAndRRows}
              />
            ) : (
              <EmptyState title="No projects found" description="No acquisition projects are configured yet." />
            )}
          </Card>

          <Card eyebrow={`${projects.length} projects`} title="Project-wise Progress">
            {isLoading ? (
              <p>Loading national dashboard…</p>
            ) : projectRows.length > 0 ? (
              <DataTable
                caption="Every acquisition project, state, and computed progress"
                columns={[
                  'Project',
                  'State',
                  'Sector',
                  'Area acquired / notified',
                  'Area %',
                  'Compensation paid / assessed',
                  'Compensation %',
                  'Possession %',
                  'Timeline status',
                ]}
                rows={projectRows}
              />
            ) : (
              <EmptyState title="No projects found" description="No acquisition projects are configured yet." />
            )}
          </Card>
        </>
      )}
    </PageContainer>
  );
}
