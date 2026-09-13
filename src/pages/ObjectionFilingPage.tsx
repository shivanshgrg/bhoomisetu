import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Card, EmptyState, PageContainer, PageHeader } from '../components/ui';
import { QrCode } from '../components/QrCode';
import { repository } from '../data';
import {
  buildObjectionFilingContent,
  type AcquisitionParcel,
  type ObjectionFilingContent,
  type ParcelObjection,
} from '../domain';
import { LANGUAGE_META, objectionReasonLabels, uiText, type Language } from '../i18n/translations';
import { useLanguage } from '../i18n/LanguageContext';

// The ground label on each printed copy must be resolved in THAT copy's own
// language (English copy in English, owner-language copy in the owner's
// language) — never through `t()`, which always resolves in the
// currently-selected UI language regardless of which copy is being rendered.
function resolveGroundLabel(reason: ParcelObjection['reason'], language: Language): string {
  const entry = objectionReasonLabels[reason];
  return language === 'en' ? entry.en : (entry[language] ?? entry.en);
}

function FilingCopy({
  content,
  languageLabel,
  objection,
  qrUrl,
}: {
  content: ObjectionFilingContent;
  languageLabel: string;
  objection: ParcelObjection;
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
        <strong>{content.params.surveyNumber}</strong>
        <span>{labels.ownerLabel}</span>
        <strong>{content.params.submittedBy}</strong>
        <span>{labels.villageLabel}</span>
        <strong>{content.params.village}</strong>
        <span>{labels.tehsilLabel}</span>
        <strong>{content.params.tehsil}</strong>
        <span>{labels.districtLabel}</span>
        <strong>{content.params.district}</strong>
        <span>{labels.groundLabel}</span>
        <strong>{content.groundLabel}</strong>
        <span>{labels.citationLabel}</span>
        <strong>{content.citation}</strong>
        <span>{labels.filedOnLabel}</span>
        <strong>{content.params.submittedOn}</strong>
      </div>

      <p>
        <strong>{labels.descriptionLabel}:</strong> {objection.description}
      </p>

      <div className="notice-qr-block">
        <QrCode value={qrUrl} ariaLabel={labels.qrCaption} />
        <p>{labels.qrCaption}</p>
        <p className="notice-qr-url">{qrUrl}</p>
      </div>

      <p className="notice-signature">{labels.signatureLabel}</p>
      <p className="notice-disclaimer">{labels.classifierNote}</p>
      <p className="notice-disclaimer">{labels.disclaimer}</p>
    </div>
  );
}

export function ObjectionFilingPage() {
  const { id, objectionId } = useParams<{ id: string; objectionId: string }>();
  const { t } = useLanguage();

  const [parcel, setParcel] = useState<AcquisitionParcel | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | undefined>(undefined);

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
      .then((loadedParcel) => {
        if (!isCancelled) {
          setParcel(loadedParcel);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setLoadError(t(uiText.landownerStatus.loadError));
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
  }, [id]);

  const objection = useMemo(
    () => parcel?.objections.find((candidate) => candidate.id === objectionId),
    [parcel, objectionId],
  );

  const qrUrl = useMemo(() => (parcel ? `${window.location.origin}/landowner/status/${parcel.id}` : ''), [parcel]);

  const englishContent = useMemo(
    () =>
      parcel && objection
        ? buildObjectionFilingContent(
            objection,
            resolveGroundLabel(objection.reason, 'en'),
            {
              surveyNumber: parcel.surveyNumber,
              village: parcel.village,
              tehsil: parcel.tehsil,
              district: parcel.district,
              submittedOn: objection.submittedOn,
              submittedBy: objection.submittedBy,
              description: objection.description,
            },
            'en',
          )
        : undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parcel, objection],
  );

  const ownerContent = useMemo(
    () =>
      parcel && objection && parcel.owner.preferredLanguage !== 'en'
        ? buildObjectionFilingContent(
            objection,
            resolveGroundLabel(objection.reason, parcel.owner.preferredLanguage),
            {
              surveyNumber: parcel.surveyNumber,
              village: parcel.village,
              tehsil: parcel.tehsil,
              district: parcel.district,
              submittedOn: objection.submittedOn,
              submittedBy: objection.submittedBy,
              description: objection.description,
            },
            parcel.owner.preferredLanguage,
          )
        : undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parcel, objection],
  );

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader eyebrow={t(uiText.objectionFiling.eyebrow)} title={t(uiText.objectionFiling.title)} />
        <Card>
          <p>{t(uiText.landownerStatus.loading)}</p>
        </Card>
      </PageContainer>
    );
  }

  if (loadError || !parcel || !objection || !englishContent) {
    return (
      <PageContainer>
        <PageHeader eyebrow={t(uiText.objectionFiling.eyebrow)} title={t(uiText.objectionFiling.title)} />
        <Card>
          <EmptyState
            title={t(uiText.objectionFiling.notFoundTitle)}
            description={loadError ?? t(uiText.objectionFiling.notFoundDescription)}
            action={
              <Link to={id ? `/landowner/status/${id}` : '/landowner'}>
                <Button type="button" variant="secondary">
                  {t(uiText.objectionFiling.backToStatus)}
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
        eyebrow={t(uiText.objectionFiling.eyebrow)}
        title={`${t(uiText.objectionFiling.title)} — ${objection.id}`}
        actions={
          <div className="page-actions-group">
            <Button type="button" onClick={() => window.print()}>
              {t(uiText.objectionFiling.printButton)}
            </Button>
            <Link to={`/landowner/status/${parcel.id}`}>
              <Button type="button" variant="secondary">
                {t(uiText.objectionFiling.backToStatus)}
              </Button>
            </Link>
          </div>
        }
      />

      <Card>
        <p>{t(uiText.objectionFiling.helpNote)}</p>
        <p className="notice-meta">
          {t(uiText.objectionFiling.referenceLabel)}: {objection.id} · {t(uiText.objectionFiling.generatedOnLabel)}:{' '}
          {objection.submittedOn}
        </p>
      </Card>

      <Card>
        <div className="notice-sheet">
          <FilingCopy content={englishContent} languageLabel="English" objection={objection} qrUrl={qrUrl} />
          {ownerContent && (
            <FilingCopy
              content={ownerContent}
              languageLabel={LANGUAGE_META[parcel.owner.preferredLanguage].endonym}
              objection={objection}
              qrUrl={qrUrl}
            />
          )}
        </div>
      </Card>
    </PageContainer>
  );
}
