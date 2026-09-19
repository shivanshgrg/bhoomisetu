import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Card, DataTable, EmptyState, PageContainer, PageHeader } from '../components/ui';
import { repository } from '../data';
import { useLanguage } from '../i18n/LanguageContext';
import { useSession } from '../i18n/SessionContext';
import { documentKindLabels, documentStatusLabels, stageLabels, uiText } from '../i18n/translations';
import { scopeParcelsToSession, type AcquisitionParcel, type AcquisitionProject } from '../domain';
import { getDocumentStatusTone } from './statusDisplay';

/** A scoped hand-off surface: review always happens in the existing parcel workspace. */
export function DocumentReviewQueuePage() {
  const { session } = useSession();
  const { t } = useLanguage();
  const [parcels, setParcels] = useState<AcquisitionParcel[]>([]);
  const [projects, setProjects] = useState<AcquisitionProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([repository.listParcels(), repository.listProjects()])
      .then(([nextParcels, nextProjects]) => { setParcels(nextParcels); setProjects(nextProjects); })
      .finally(() => setLoading(false));
  }, []);

  const pending = useMemo(
    () => scopeParcelsToSession(parcels, projects, session).flatMap((parcel) =>
      parcel.documents
        .filter((document) => document.status === 'pending_verification')
        .map((document) => ({ parcel, document })),
    ),
    [parcels, projects, session],
  );

  return (
    <PageContainer>
      <PageHeader
        eyebrow={t(uiText.documentQueue.eyebrow)}
        title={t(uiText.documentQueue.title)}
        description={t(uiText.documentQueue.description)}
      />
      <Card eyebrow={`${pending.length} ${t(uiText.documentQueue.pendingSuffix)}`} title={t(uiText.documentQueue.pendingTitle)}>
        {loading ? <p>{t(uiText.parcelDetail.loading)}</p> : pending.length === 0 ? (
          <EmptyState title={t(uiText.documentQueue.emptyTitle)} description={t(uiText.documentQueue.emptyDescription)} />
        ) : (
          <DataTable
            caption={t(uiText.documentQueue.caption)}
            columns={[
              t(uiText.documentQueue.colParcel), t(uiText.parcelDetail.colDocument), t(uiText.parcelDetail.titleFieldLabel),
              t(uiText.parcelDetail.colStage), t(uiText.documentQueue.colQuality), t(uiText.documentQueue.colOpen),
            ]}
            rows={pending.map(({ parcel, document }) => [
              <Link key={parcel.id} to={`/official/parcel/${parcel.id}#documents`}>{parcel.surveyNumber}</Link>,
              t(documentKindLabels[document.kind]), document.title, t(stageLabels[document.stage]),
              document.qualityCheckVerdict ? <Badge key={document.id} tone={document.qualityCheckVerdict === 'flagged' ? 'danger' : 'warning'}>{document.qualityCheckVerdict}</Badge> : <Badge key={document.id} tone={getDocumentStatusTone(document.status)}>{t(documentStatusLabels[document.status])}</Badge>,
              <Link key={`${document.id}-open`} to={`/official/parcel/${parcel.id}#documents`}>{t(uiText.documentQueue.openWorkspace)}</Link>,
            ])}
          />
        )}
      </Card>
    </PageContainer>
  );
}
