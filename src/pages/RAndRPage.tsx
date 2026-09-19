import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Card, DataTable, EmptyState, PageContainer, PageHeader } from '../components/ui';
import { repository } from '../data';
import { useLanguage } from '../i18n/LanguageContext';
import { useSession } from '../i18n/SessionContext';
import { uiText } from '../i18n/translations';
import { scopeProjectsToSession, type AcquisitionProject } from '../domain';

export function RAndRPage() {
  const { session } = useSession(); const { t } = useLanguage();
  const [projects, setProjects] = useState<AcquisitionProject[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { repository.listProjects().then(setProjects).finally(() => setLoading(false)); }, []);
  const scoped = useMemo(() => scopeProjectsToSession(projects, session), [projects, session]);
  const totals = scoped.reduce((sum, project) => ({ affected: sum.affected + project.rAndR.affectedFamilies, displaced: sum.displaced + project.rAndR.displacedFamilies, resettled: sum.resettled + project.rAndR.familiesResettled, complete: sum.complete + Number(project.rAndR.rrChecklistComplete) }), { affected: 0, displaced: 0, resettled: 0, complete: 0 });
  return <PageContainer>
    <PageHeader eyebrow={t(uiText.rAndR.eyebrow)} title={t(uiText.rAndR.title)} description={t(uiText.rAndR.description)} />
    <section className="summary-grid">
      <Card eyebrow={t(uiText.rAndR.affected)} title={totals.affected.toLocaleString('en-IN')}><p>{t(uiText.rAndR.portfolioTotal)}</p></Card>
      <Card eyebrow={t(uiText.rAndR.resettled)} title={`${totals.resettled.toLocaleString('en-IN')} / ${totals.displaced.toLocaleString('en-IN')}`}><p>{totals.displaced ? `${Math.round(totals.resettled / totals.displaced * 100)}%` : '—'}</p></Card>
      <Card eyebrow={t(uiText.rAndR.checklists)} title={`${totals.complete} / ${scoped.length}`}><p>{t(uiText.rAndR.projectsComplete)}</p></Card>
    </section>
    <Card eyebrow={t(uiText.rAndR.projectView)} title={t(uiText.rAndR.title)}>
      {loading ? <p>{t(uiText.parcelDetail.loading)}</p> : scoped.length ? <DataTable caption={t(uiText.rAndR.caption)} columns={[t(uiText.rAndR.colProject), t(uiText.rAndR.affected), t(uiText.rAndR.displaced), t(uiText.rAndR.resettled), t(uiText.rAndR.checklists)]} rows={scoped.map(project => [<Link key={project.id} to={`/official/project/${project.id}`}>{project.name}</Link>, project.rAndR.affectedFamilies, project.rAndR.displacedFamilies, `${project.rAndR.familiesResettled} (${project.rAndR.displacedFamilies ? Math.round(project.rAndR.familiesResettled / project.rAndR.displacedFamilies * 100) : 0}%)`, <Badge key={`${project.id}-check`} tone={project.rAndR.rrChecklistComplete ? 'success' : 'warning'}>{project.rAndR.rrChecklistComplete ? t(uiText.rAndR.complete) : t(uiText.rAndR.pending)}</Badge>])} /> : <EmptyState title={t(uiText.rAndR.emptyTitle)} description={t(uiText.rAndR.emptyDescription)} />}
    </Card>
  </PageContainer>;
}
