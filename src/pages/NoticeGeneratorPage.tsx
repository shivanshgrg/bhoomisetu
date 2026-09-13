import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Card, EmptyState, PageContainer, PageHeader, SelectField } from '../components/ui';
import { QrCode } from '../components/QrCode';
import { repository } from '../data';
import {
  DEMO_REFERENCE_DATE,
  STAGE_BY_ID,
  buildNoticeContent,
  getStageDefinition,
  isParcelInScope,
  type AcquisitionParcel,
  type AcquisitionProject,
  type NoticeContent,
  type NoticeType,
} from '../domain';
import { LANGUAGE_META, uiText } from '../i18n/translations';
import { useLanguage } from '../i18n/LanguageContext';
import { useSession } from '../i18n/SessionContext';

function NoticeCopy({
  content,
  languageLabel,
  parcel,
  project,
  qrUrl,
}: {
  content: NoticeContent;
  languageLabel: string;
  parcel: AcquisitionParcel;
  project: AcquisitionProject | undefined;
  qrUrl: string;
}) {
  const { labels } = content;

  return (
    <div className="notice-copy">
      <p className="notice-copy-language">{languageLabel}</p>
      <p className="notice-office-header">{labels.officeHeader}</p>
      <h2 className="notice-title">{content.title}</h2>

      <div className="notice-fields">
        <span>{labels.surveyLabel}</span>
        <strong>{parcel.surveyNumber}</strong>
        <span>{labels.ownerLabel}</span>
        <strong>{parcel.owner.name}</strong>
        <span>{labels.villageLabel}</span>
        <strong>{parcel.village}</strong>
        <span>{labels.tehsilLabel}</span>
        <strong>{parcel.tehsil}</strong>
        <span>{labels.districtLabel}</span>
        <strong>{parcel.district}</strong>
        <span>{labels.projectLabel}</span>
        <strong>{project?.name ?? '—'}</strong>
        <span>{labels.areaLabel}</span>
        <strong>{parcel.areaHectares} ha</strong>
        <span>{labels.compensationAssessedLabel}</span>
        <strong>₹{parcel.compensationEstimate.toLocaleString('en-IN')}</strong>
        <span>{labels.compensationPaidLabel}</span>
        <strong>₹{parcel.compensationPaid.toLocaleString('en-IN')}</strong>
        <span>{labels.dateLabel}</span>
        <strong>{DEMO_REFERENCE_DATE}</strong>
      </div>

      <p className="notice-body">{content.body}</p>

      <div className="notice-qr-block">
        <QrCode value={qrUrl} ariaLabel={labels.qrCaption} />
        <p>{labels.qrCaption}</p>
        <p className="notice-qr-url">{qrUrl}</p>
      </div>

      <p className="notice-signature">{labels.signatureLabel}</p>
      <p className="notice-disclaimer">{labels.disclaimer}</p>
    </div>
  );
}

export function NoticeGeneratorPage() {
  const { id } = useParams<{ id: string }>();
  const { session } = useSession();
  const { t } = useLanguage();

  const [parcel, setParcel] = useState<AcquisitionParcel | undefined>(undefined);
  const [project, setProject] = useState<AcquisitionProject | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | undefined>(undefined);
  const [noticeType, setNoticeType] = useState<NoticeType>('section_11');

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setLoadError(undefined);

    repository
      .getParcelById(id)
      .then(async (loadedParcel) => {
        if (isCancelled) {
          return;
        }
        const loadedProject = loadedParcel ? await repository.getProjectById(loadedParcel.projectId) : undefined;
        if (isCancelled) {
          return;
        }
        setProject(loadedProject);
        const inScope = !!loadedParcel && isParcelInScope(loadedParcel, loadedProject, session);
        setParcel(inScope ? loadedParcel : undefined);
        if (loadedParcel && inScope) {
          const hasReachedAward = getStageDefinition(loadedParcel.currentStage).order >= STAGE_BY_ID.award.order;
          setNoticeType(hasReachedAward ? 'award' : 'section_11');
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setLoadError(t(uiText.parcelDetail.loadError));
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
  }, [id, session]);

  const qrUrl = useMemo(() => (parcel ? `${window.location.origin}/landowner/status/${parcel.id}` : ''), [parcel]);

  const englishContent = useMemo(
    () =>
      parcel
        ? buildNoticeContent(noticeType, 'en', {
            projectName: project?.name ?? '—',
            surveyNumber: parcel.surveyNumber,
            village: parcel.village,
            tehsil: parcel.tehsil,
            district: parcel.district,
            compensationEstimateText: parcel.compensationEstimate.toLocaleString('en-IN'),
            compensationPaidText: parcel.compensationPaid.toLocaleString('en-IN'),
            referenceDate: DEMO_REFERENCE_DATE,
          })
        : undefined,
    [parcel, project, noticeType],
  );

  const ownerContent = useMemo(
    () =>
      parcel && parcel.owner.preferredLanguage !== 'en'
        ? buildNoticeContent(noticeType, parcel.owner.preferredLanguage, {
            projectName: project?.name ?? '—',
            surveyNumber: parcel.surveyNumber,
            village: parcel.village,
            tehsil: parcel.tehsil,
            district: parcel.district,
            compensationEstimateText: parcel.compensationEstimate.toLocaleString('en-IN'),
            compensationPaidText: parcel.compensationPaid.toLocaleString('en-IN'),
            referenceDate: DEMO_REFERENCE_DATE,
          })
        : undefined,
    [parcel, project, noticeType],
  );

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader eyebrow={t(uiText.notice.eyebrow)} title={t(uiText.notice.title)} />
        <Card>
          <p>{t(uiText.parcelDetail.loading)}</p>
        </Card>
      </PageContainer>
    );
  }

  if (loadError || !parcel || !englishContent) {
    return (
      <PageContainer>
        <PageHeader eyebrow={t(uiText.notice.eyebrow)} title={t(uiText.notice.title)} />
        <Card>
          <EmptyState
            title={t(uiText.parcelDetail.notFoundTitle)}
            description={loadError ?? t(uiText.parcelDetail.notFoundDescriptionFallback)}
            action={
              <Link to="/official">
                <Button type="button" variant="secondary">
                  {t(uiText.parcelDetail.backToDashboard)}
                </Button>
              </Link>
            }
          />
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow={t(uiText.notice.eyebrow)}
        title={`${t(uiText.notice.title)} — ${parcel.surveyNumber}`}
        actions={
          <div className="page-actions-group">
            <Button type="button" onClick={() => window.print()}>
              {t(uiText.notice.printButton)}
            </Button>
            <Link to={`/official/parcel/${parcel.id}`}>
              <Button type="button" variant="secondary">
                {t(uiText.notice.backToParcel)}
              </Button>
            </Link>
          </div>
        }
      />

      <Card>
        <div className="filter-grid">
          <SelectField
            label={t(uiText.notice.typeFieldLabel)}
            value={noticeType}
            onChange={(event) => setNoticeType(event.target.value as NoticeType)}
          >
            <option value="section_11">{t(uiText.notice.typeSection11)}</option>
            <option value="award">{t(uiText.notice.typeAward)}</option>
          </SelectField>
        </div>
        <p>{t(uiText.notice.helpNote)}</p>
        <p className="notice-meta">
          {t(uiText.notice.referenceLabel)}: {parcel.id} · {t(uiText.notice.generatedOnLabel)}: {DEMO_REFERENCE_DATE}
        </p>
      </Card>

      <Card>
        <div className="notice-sheet">
          <NoticeCopy
            content={englishContent}
            languageLabel={t(uiText.notice.copyLabelEnglish)}
            parcel={parcel}
            project={project}
            qrUrl={qrUrl}
          />
          {ownerContent && (
            <NoticeCopy
              content={ownerContent}
              languageLabel={`${t(uiText.notice.copyLabelOwnerLanguagePrefix)} — ${
                LANGUAGE_META[parcel.owner.preferredLanguage].endonym
              }`}
              parcel={parcel}
              project={project}
              qrUrl={qrUrl}
            />
          )}
        </div>
      </Card>
    </PageContainer>
  );
}
