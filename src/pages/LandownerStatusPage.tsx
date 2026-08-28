import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SpeakButton } from '../components/SpeakButton';
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  PageContainer,
  PageHeader,
  SelectField,
  TextAreaField,
  TextField,
} from '../components/ui';
import { repository } from '../data';
import {
  ACQUISITION_STAGES,
  DEMO_REFERENCE_DATE,
  OBJECTION_REASONS,
  STAGE_HANDLER_ROLE,
  getAdvanceGate,
  getParcelCalculatedStatus,
  getStageDefinition,
  type AcquisitionParcel,
  type ObjectionReason,
} from '../domain';
import { useLanguage } from '../i18n/LanguageContext';
import {
  dashboardStatusLabels,
  documentKindLabels,
  objectionReasonLabels,
  objectionStatusLabels,
  stageLabels,
  stageShortLabels,
  uiText,
} from '../i18n/translations';
import { getBadgeTone, getStatusIcon } from './statusDisplay';

export function LandownerStatusPage() {
  const { id } = useParams<{ id: string }>();
  const { language, t } = useLanguage();

  const [parcel, setParcel] = useState<AcquisitionParcel | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | undefined>(undefined);

  const [objectionReason, setObjectionReason] = useState<ObjectionReason>('ownership');
  const [objectionDescription, setObjectionDescription] = useState('');
  const [isSubmittingObjection, setIsSubmittingObjection] = useState(false);
  const [objectionError, setObjectionError] = useState<string | undefined>(undefined);
  const [objectionMessage, setObjectionMessage] = useState<string | undefined>(undefined);

  const [calcArea, setCalcArea] = useState('');
  const [calcRate, setCalcRate] = useState('');
  const [calcFactor, setCalcFactor] = useState('1');

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

  const calculatedStatus = useMemo(() => (parcel ? getParcelCalculatedStatus(parcel) : undefined), [parcel]);
  const advanceGate = useMemo(() => (parcel ? getAdvanceGate(parcel) : undefined), [parcel]);

  useEffect(() => {
    if (!parcel) {
      return;
    }
    setCalcArea(String(parcel.areaHectares));
    setCalcRate(String(Math.round(parcel.compensationEstimate / parcel.areaHectares)));
    setCalcFactor('1');
  }, [parcel]);

  const calculatorEstimate = useMemo(() => {
    const area = Number.parseFloat(calcArea);
    const rate = Number.parseFloat(calcRate);
    const factor = Number.parseFloat(calcFactor);

    if (!Number.isFinite(area) || !Number.isFinite(rate) || !Number.isFinite(factor)) {
      return undefined;
    }
    if (area < 0 || rate < 0 || factor < 0) {
      return undefined;
    }

    return Math.round(area * rate * factor);
  }, [calcArea, calcRate, calcFactor]);

  async function handleObjectionSubmit() {
    if (!parcel) {
      return;
    }
    if (!objectionDescription.trim()) {
      setObjectionError(t(uiText.landownerStatus.objectionEmptyDescriptionError));
      return;
    }

    setIsSubmittingObjection(true);
    setObjectionError(undefined);
    setObjectionMessage(undefined);

    try {
      const objection = await repository.addObjection({
        parcelId: parcel.id,
        submittedOn: DEMO_REFERENCE_DATE,
        submittedBy: parcel.owner.name,
        reason: objectionReason,
        description: objectionDescription.trim(),
        assignedToRole: STAGE_HANDLER_ROLE.objection_review,
      });
      const refreshedParcel = await repository.getParcelById(parcel.id);
      setParcel(refreshedParcel);
      setObjectionDescription('');
      setObjectionMessage(
        `${t(uiText.landownerStatus.objectionSubmittedPrefix)} ${objection.id} ${t(uiText.landownerStatus.objectionSubmittedSuffix)}`,
      );
    } catch {
      setObjectionError(t(uiText.landownerStatus.objectionGenericError));
    } finally {
      setIsSubmittingObjection(false);
    }
  }

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader eyebrow={t(uiText.landownerStatus.eyebrow)} title={t(uiText.landownerStatus.title)} />
        <Card>
          <p>{t(uiText.landownerStatus.loading)}</p>
        </Card>
      </PageContainer>
    );
  }

  if (loadError || !parcel || !calculatedStatus || !advanceGate) {
    return (
      <PageContainer>
        <PageHeader eyebrow={t(uiText.landownerStatus.eyebrow)} title={t(uiText.landownerStatus.title)} />
        <Card>
          <EmptyState
            title={t(uiText.landownerStatus.notFoundTitle)}
            description={loadError ?? t(uiText.landownerStatus.notFoundDescription)}
            action={
              <Link to="/landowner">
                <Button type="button" variant="secondary">
                  {t(uiText.landownerStatus.backToSearch)}
                </Button>
              </Link>
            }
          />
        </Card>
      </PageContainer>
    );
  }

  const currentStageOrder = getStageDefinition(parcel.currentStage).order;

  const actionRequired = !advanceGate.canAdvance
    ? advanceGate.toStage === undefined
      ? t(uiText.landownerStatus.actionRequiredFinalStage)
      : calculatedStatus.missingDocumentKinds.length > 0
        ? `${t(uiText.landownerStatus.actionRequiredMissingDocumentPrefix)} ${calculatedStatus.missingDocumentKinds
            .map((kind) => t(documentKindLabels[kind]))
            .join(', ')}.`
        : parcel.currentStage === 'objection_review' && calculatedStatus.openObjectionCount > 0
          ? t(uiText.landownerStatus.actionRequiredOpenObjections)
          : t(uiText.landownerStatus.actionRequiredFinalStage)
    : t(uiText.landownerStatus.actionRequiredNone);

  const statusLabel = t(dashboardStatusLabels[calculatedStatus.status]);
  const stageLabel = t(stageLabels[parcel.currentStage]);

  const documentRows = parcel.documents.map((document) => [
    t(stageShortLabels[document.stage]),
    t(documentKindLabels[document.kind]),
    document.title,
    document.uploadedOn,
    document.fileType.toUpperCase(),
  ]);

  const objectionRows = parcel.objections.map((objection) => [
    objection.id,
    objection.submittedOn,
    t(objectionReasonLabels[objection.reason]),
    objection.description,
    <Badge
      key={`${objection.id}-status`}
      tone={objection.status === 'resolved' ? 'success' : objection.status === 'under_review' ? 'info' : 'warning'}
    >
      {t(objectionStatusLabels[objection.status])}
    </Badge>,
  ]);

  const speechSummary = `Survey ${parcel.surveyNumber}. ${t(uiText.landownerStatus.currentStage)}: ${stageLabel}. ${t(
    uiText.landownerStatus.status,
  )}: ${statusLabel}. ${t(uiText.landownerStatus.actionRequired)}: ${actionRequired}`;

  return (
    <PageContainer>
      <PageHeader
        eyebrow={parcel.district}
        title={`Survey ${parcel.surveyNumber}`}
        description={`${parcel.village}, ${parcel.tehsil}`}
        actions={
          <>
            <SpeakButton text={speechSummary} />
            <Link to="/landowner">
              <Button type="button" variant="secondary">
                {t(uiText.landownerStatus.searchAnother)}
              </Button>
            </Link>
          </>
        }
      />

      <section className="landowner-grid">
        <Card eyebrow={t(uiText.landownerStatus.overviewEyebrow)} title={t(uiText.landownerStatus.overviewTitle)}>
          <div className="status-list">
            <span>{t(uiText.landownerStatus.owner)}</span>
            <strong>{parcel.owner.name}</strong>
            <span>{t(uiText.landownerStatus.surveyNumber)}</span>
            <strong>{parcel.surveyNumber}</strong>
            <span>{t(uiText.landownerStatus.location)}</span>
            <strong>
              {parcel.village}, {parcel.tehsil}, {parcel.district}
            </strong>
            <span>{t(uiText.landownerStatus.area)}</span>
            <strong>{parcel.areaHectares} ha</strong>
            <span>{t(uiText.landownerStatus.compensationEstimate)}</span>
            <strong>₹{parcel.compensationEstimate.toLocaleString(language === 'hi' ? 'hi-IN' : 'en-IN')}</strong>
          </div>
        </Card>

        <Card eyebrow={t(uiText.landownerStatus.statusEyebrow)} title={t(uiText.landownerStatus.statusTitle)}>
          <div className="status-list">
            <span>{t(uiText.landownerStatus.currentStage)}</span>
            <strong>{stageLabel}</strong>
            <span>{t(uiText.landownerStatus.status)}</span>
            <Badge tone={getBadgeTone(calculatedStatus.status)}>
              <span aria-hidden="true">{getStatusIcon(calculatedStatus.status)}</span> {statusLabel}
            </Badge>
            <span>{t(uiText.landownerStatus.actionRequired)}</span>
            <strong>{actionRequired}</strong>
          </div>
        </Card>
      </section>

      <Card eyebrow={t(uiText.landownerStatus.workflowEyebrow)} title={t(uiText.landownerStatus.workflowTitle)}>
        <ol className="stepper">
          {ACQUISITION_STAGES.map((stage, index) => {
            const stepState =
              stage.order < currentStageOrder
                ? 'complete'
                : stage.order === currentStageOrder
                  ? 'current'
                  : 'upcoming';

            return (
              <li className={`step step-${stepState}`} key={stage.id}>
                <span className="step-marker" aria-hidden="true">
                  {stepState === 'complete' ? '✓' : stepState === 'current' ? '▶' : stage.order}
                </span>
                <span className="step-label">
                  <strong>{t(stageLabels[stage.id])}</strong>
                  <span>
                    {stepState === 'current'
                      ? t(uiText.landownerStatus.stepInProgress)
                      : stepState === 'complete'
                        ? t(uiText.landownerStatus.stepDone)
                        : t(uiText.landownerStatus.stepUpcoming)}
                  </span>
                </span>
                {index < ACQUISITION_STAGES.length - 1 && <span className="step-connector" aria-hidden="true" />}
              </li>
            );
          })}
        </ol>
      </Card>

      <Card
        eyebrow={`${parcel.documents.length} ${t(uiText.landownerStatus.documentsOnFile)}`}
        title={t(uiText.landownerStatus.documentsTitle)}
      >
        {documentRows.length > 0 ? (
          <DataTable
            caption={t(uiText.landownerStatus.documentsCaption)}
            columns={[
              t(uiText.landownerStatus.documentColStage),
              t(uiText.landownerStatus.documentColKind),
              t(uiText.landownerStatus.documentColTitle),
              t(uiText.landownerStatus.documentColUploaded),
              t(uiText.landownerStatus.documentColType),
            ]}
            rows={documentRows}
          />
        ) : (
          <EmptyState
            title={t(uiText.landownerStatus.noDocumentsTitle)}
            description={t(uiText.landownerStatus.noDocumentsDescription)}
          />
        )}
      </Card>

      <Card eyebrow={t(uiText.landownerStatus.calculatorEyebrow)} title={t(uiText.landownerStatus.calculatorTitle)}>
        <p role="note">{t(uiText.landownerStatus.calculatorDisclaimer)}</p>
        <form className="filter-grid" onSubmit={(event) => event.preventDefault()}>
          <TextField
            label={t(uiText.landownerStatus.calculatorAreaLabel)}
            type="number"
            min="0"
            step="0.01"
            value={calcArea}
            onChange={(event) => setCalcArea(event.target.value)}
          />
          <TextField
            label={t(uiText.landownerStatus.calculatorRateLabel)}
            type="number"
            min="0"
            step="1"
            value={calcRate}
            onChange={(event) => setCalcRate(event.target.value)}
          />
          <TextField
            label={t(uiText.landownerStatus.calculatorFactorLabel)}
            hint={t(uiText.landownerStatus.calculatorFactorHint)}
            type="number"
            min="0"
            step="0.1"
            value={calcFactor}
            onChange={(event) => setCalcFactor(event.target.value)}
          />
        </form>
        <div className="status-list">
          <span>{t(uiText.landownerStatus.calculatorResultLabel)}</span>
          <strong>
            {calculatorEstimate !== undefined
              ? `₹${calculatorEstimate.toLocaleString(language === 'hi' ? 'hi-IN' : 'en-IN')}`
              : '—'}
          </strong>
        </div>
      </Card>

      <Card eyebrow={t(uiText.landownerStatus.objectionFormEyebrow)} title={t(uiText.landownerStatus.objectionFormTitle)}>
        <form
          className="filter-grid"
          onSubmit={(event) => {
            event.preventDefault();
            void handleObjectionSubmit();
          }}
        >
          <SelectField
            label={t(uiText.landownerStatus.objectionReasonLabel)}
            value={objectionReason}
            onChange={(event) => setObjectionReason(event.target.value as ObjectionReason)}
          >
            {OBJECTION_REASONS.map((reason) => (
              <option key={reason.id} value={reason.id}>
                {t(objectionReasonLabels[reason.id])}
              </option>
            ))}
          </SelectField>
          <TextAreaField
            label={t(uiText.landownerStatus.objectionDescriptionLabel)}
            placeholder={t(uiText.landownerStatus.objectionDescriptionPlaceholder)}
            value={objectionDescription}
            onChange={(event) => setObjectionDescription(event.target.value)}
            required
          />
          <Button disabled={isSubmittingObjection} type="submit">
            {isSubmittingObjection ? t(uiText.landownerStatus.objectionSubmitting) : t(uiText.landownerStatus.objectionSubmit)}
          </Button>
        </form>
        {objectionMessage && <p role="status">{objectionMessage}</p>}
        {objectionError && <p role="alert">{objectionError}</p>}
      </Card>

      <Card
        eyebrow={`${parcel.objections.length} ${t(uiText.landownerStatus.objectionsFiled)}`}
        title={t(uiText.landownerStatus.yourObjectionsTitle)}
      >
        {objectionRows.length > 0 ? (
          <DataTable
            caption={t(uiText.landownerStatus.objectionsCaption)}
            columns={[
              t(uiText.landownerStatus.objectionColId),
              t(uiText.landownerStatus.objectionColSubmitted),
              t(uiText.landownerStatus.objectionColReason),
              t(uiText.landownerStatus.objectionColDescription),
              t(uiText.landownerStatus.objectionColStatus),
            ]}
            rows={objectionRows}
          />
        ) : (
          <EmptyState
            title={t(uiText.landownerStatus.noObjectionsTitle)}
            description={t(uiText.landownerStatus.noObjectionsDescription)}
          />
        )}
      </Card>
    </PageContainer>
  );
}
