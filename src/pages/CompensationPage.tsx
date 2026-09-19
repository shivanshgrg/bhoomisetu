import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, DataTable, EmptyState, PageContainer, PageHeader } from '../components/ui';
import { repository } from '../data';
import { useLanguage } from '../i18n/LanguageContext';
import { useSession } from '../i18n/SessionContext';
import { stageLabels, uiText } from '../i18n/translations';
import { scopeParcelsToSession, type AcquisitionParcel, type AcquisitionProject } from '../domain';

const money = (value: number) => `₹${value.toLocaleString('en-IN')}`;

export function CompensationPage() {
  const { session } = useSession(); const { t } = useLanguage();
  const [parcels, setParcels] = useState<AcquisitionParcel[]>([]); const [projects, setProjects] = useState<AcquisitionProject[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { Promise.all([repository.listParcels(), repository.listProjects()]).then(([p, pr]) => { setParcels(p); setProjects(pr); }).finally(() => setLoading(false)); }, []);
  const scoped = useMemo(() => scopeParcelsToSession(parcels, projects, session), [parcels, projects, session]);
  const assessed = scoped.reduce((sum, parcel) => sum + parcel.compensationEstimate, 0);
  const paid = scoped.reduce((sum, parcel) => sum + parcel.compensationPaid, 0);
  return <PageContainer>
    <PageHeader eyebrow={t(uiText.compensation.eyebrow)} title={t(uiText.compensation.title)} description={t(uiText.compensation.description)} />
    <section className="summary-grid">
      <Card eyebrow={t(uiText.compensation.assessed)} title={money(assessed)}><p>{scoped.length} {t(uiText.compensation.parcelsSuffix)}</p></Card>
      <Card eyebrow={t(uiText.compensation.paid)} title={money(paid)}><p>{assessed ? `${Math.round((paid / assessed) * 100)}% ${t(uiText.compensation.ofAssessed)}` : '—'}</p></Card>
      <Card eyebrow={t(uiText.compensation.remaining)} title={money(assessed - paid)}><p>{t(uiText.compensation.pendingRelease)}</p></Card>
    </section>
    <Card eyebrow={t(uiText.compensation.parcelLedger)} title={t(uiText.compensation.title)}>
      {loading ? <p>{t(uiText.parcelDetail.loading)}</p> : scoped.length ? <DataTable caption={t(uiText.compensation.caption)} columns={[t(uiText.compensation.colParcel), t(uiText.compensation.colProject), t(uiText.parcelDetail.currentStageLabel), t(uiText.compensation.assessed), t(uiText.compensation.paid), t(uiText.compensation.remaining)]} rows={scoped.map(parcel => {
        const project = projects.find(entry => entry.id === parcel.projectId);
        return [<Link key={parcel.id} to={`/official/parcel/${parcel.id}`}>{parcel.surveyNumber}</Link>, project?.name ?? '—', t(stageLabels[parcel.currentStage]), money(parcel.compensationEstimate), money(parcel.compensationPaid), money(parcel.compensationEstimate - parcel.compensationPaid)];
      })} /> : <EmptyState title={t(uiText.compensation.emptyTitle)} description={t(uiText.compensation.emptyDescription)} />}
    </Card>
  </PageContainer>;
}
