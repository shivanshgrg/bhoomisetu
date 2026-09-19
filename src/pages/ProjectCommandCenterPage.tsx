import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ParcelMap } from '../components/ParcelMap';
import { Badge, Card, EmptyState, PageContainer, PageHeader } from '../components/ui';
import { repository } from '../data';
import { useDataSaver } from '../i18n/DataSaverContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useSession } from '../i18n/SessionContext';
import { projectStatusLabels, stageShortLabels, uiText } from '../i18n/translations';
import {
  ACQUISITION_STAGES,
  DEMO_REFERENCE_DATE,
  PROJECT_SECTOR_LABELS,
  STATE_NAME_LABELS,
  getActionCenterQueue,
  getProjectCalculatedStatus,
  getProjectForecast,
  scopeParcelsToSession,
  scopeProjectsToSession,
  type AcquisitionParcel,
  type AcquisitionProject,
} from '../domain';
import { getProjectStatusIcon, getProjectStatusTone, getRiskTone } from './statusDisplay';

function money(value: number) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

export function ProjectCommandCenterPage() {
  const { id } = useParams();
  const { session } = useSession();
  const { t } = useLanguage();
  const { isDataSaverOn } = useDataSaver();
  const isSeniorView = session?.role === 'national_admin' || session?.role === 'state_authority';
  const [projects, setProjects] = useState<AcquisitionProject[]>([]);
  const [parcels, setParcels] = useState<AcquisitionParcel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([repository.listProjects(), repository.listParcels()])
      .then(([nextProjects, nextParcels]) => {
        setProjects(nextProjects);
        setParcels(nextParcels);
      })
      .finally(() => setLoading(false));
  }, []);

  const scopedProjects = useMemo(() => scopeProjectsToSession(projects, session), [projects, session]);
  const scopedParcels = useMemo(() => scopeParcelsToSession(parcels, projects, session), [parcels, projects, session]);
  const project = scopedProjects.find((item) => item.id === id);
  const projectParcels = useMemo(() => scopedParcels.filter((parcel) => parcel.projectId === id), [scopedParcels, id]);
  const status = project ? getProjectCalculatedStatus(project, projectParcels) : undefined;
  const forecast = project ? getProjectForecast(project, projectParcels) : undefined;
  const queue = project ? getActionCenterQueue(projectParcels, [project]) : [];
  const stageCounts = useMemo(() => Object.fromEntries(ACQUISITION_STAGES.map((stage) => [stage.id, projectParcels.filter((parcel) => parcel.currentStage === stage.id).length])), [projectParcels]);

  if (!loading && !project) {
    return <PageContainer><EmptyState title={t(uiText.projectCommand.notFoundTitle)} description={t(uiText.projectCommand.notFoundDescription)} action={<Link className="command-inline-link" to="/official/national">{t(uiText.projectCommand.backToNational)}</Link>} /></PageContainer>;
  }

  if (!project || !status || !forecast) {
    return <PageContainer><p>{t(uiText.nationalDashboard.loadingNationalDashboard)}</p></PageContainer>;
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow={t(uiText.projectCommand.eyebrow)}
        title={project.name}
        description={`${STATE_NAME_LABELS[project.state]} · ${PROJECT_SECTOR_LABELS[project.sector]} · ${project.implementingAgency}`}
        actions={<Badge tone={getProjectStatusTone(status.status)}>{getProjectStatusIcon(status.status)} {t(projectStatusLabels[status.status])}</Badge>}
      />
      <section className="summary-grid command-kpi-grid" aria-label={t(uiText.projectCommand.kpiLabel)}>
        <Card eyebrow={t(uiText.projectCommand.landEyebrow)} title={t(uiText.projectCommand.acquiredTitle)}><p className="metric">{status.areaAcquiredPercent}%</p><p>{status.areaAcquiredHectares.toLocaleString('en-IN')} ha / {project.totalAreaRequiredHectares.toLocaleString('en-IN')} ha</p></Card>
        <Card eyebrow={t(uiText.projectCommand.compensationEyebrow)} title={t(uiText.projectCommand.paidTitle)}><p className="metric">{status.compensationPaidPercent}%</p><p>{money(status.compensationPaid)} / {money(status.compensationAssessed)}</p></Card>
        <Card eyebrow={t(uiText.projectCommand.possessionEyebrow)} title={t(uiText.projectCommand.possessionTitle)}><p className="metric">{status.possessionPercent}%</p><p>{status.parcelsAtPossession} / {status.parcelCount} {t(uiText.projectCommand.parcelsSuffix)}</p></Card>
      </section>
      <section className="national-command-grid">
        <Card eyebrow={t(uiText.projectCommand.pipelineEyebrow)} title={t(uiText.projectCommand.pipelineTitle)}>
          <div className="national-pipeline project-pipeline">{ACQUISITION_STAGES.map((stage) => isSeniorView ? <div className="national-pipeline-stage" key={stage.id}><span>{stage.order.toString().padStart(2, '0')}</span><strong>{stageCounts[stage.id] ?? 0}</strong><small>{t(stageShortLabels[stage.id])}</small></div> : <Link className="national-pipeline-stage" key={stage.id} to={`/official?project=${project.id}&stage=${stage.id}`}><span>{stage.order.toString().padStart(2, '0')}</span><strong>{stageCounts[stage.id] ?? 0}</strong><small>{t(stageShortLabels[stage.id])}</small></Link>)}</div>
        </Card>
        <Card eyebrow={t(uiText.projectCommand.bottleneckEyebrow)} title={t(uiText.projectCommand.bottleneckTitle)}>
          <p className="project-bottleneck-stage">{forecast.bottleneckStage ? t(stageShortLabels[forecast.bottleneckStage]) : t(uiText.projectCommand.noBottleneck)}</p>
          <p>{forecast.bottleneckOverageDays} {t(uiText.projectCommand.daysOverSla)} · {forecast.whatIfWeeksSaved} {t(uiText.projectCommand.weeksSaved)}</p>
          {isSeniorView ? <p>{queue.length} operational cases require field review. Senior view intentionally hides parcel identities.</p> : queue.slice(0, 3).map(({ parcel, riskAssessment }) => <Link className="project-risk-link" key={parcel.id} to={`/official/parcel/${parcel.id}`}><Badge tone={getRiskTone(riskAssessment.level)}>{parcel.surveyNumber} · {riskAssessment.score}/100</Badge><span>{riskAssessment.recommendedAction}</span></Link>)}
        </Card>
      </section>
      <Card eyebrow={t(uiText.projectCommand.mapEyebrow)} title={t(uiText.projectCommand.mapTitle)}>
        {isDataSaverOn ? <EmptyState title={t(uiText.official.mapHiddenTitle)} description={t(uiText.official.mapHiddenDescription)} /> : <ParcelMap parcels={projectParcels} projects={[project]} asOfDate={DEMO_REFERENCE_DATE} mode={isSeniorView ? 'project' : 'parcel'} />}
      </Card>
    </PageContainer>
  );
}
