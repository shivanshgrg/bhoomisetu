import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  FileField,
  PageContainer,
  PageHeader,
  Pagination,
  SelectField,
  TextField,
} from '../components/ui';
import { AuditChainLedger } from '../components/AuditChainLedger';
import { SmsPreviewPanel } from '../components/SmsPreviewPanel';
import { repository } from '../data';
import { analyzeImageFile } from '../data/imageAnalysis';
import { runOcr } from '../data/ocr';
import { extractPdfText } from '../data/pdfText';
import { uploadDocumentFile } from '../data/upload';
import { usePagination } from '../hooks/usePagination';
import { useLanguage } from '../i18n/LanguageContext';
import { useOffline } from '../i18n/OfflineContext';
import { useSession } from '../i18n/SessionContext';
import {
  dashboardStatusLabels,
  documentCheckVerdictLabels,
  documentKindLabels,
  documentStatusLabels,
  escalationLevelLabels,
  lapseRiskLabels,
  objectionReasonLabels,
  objectionStatusLabels,
  officialRoleLabels,
  riskLevelLabels,
  stageLabels,
  stageShortLabels,
  uiText,
} from '../i18n/translations';
import {
  ACQUISITION_STAGES,
  DEMO_REFERENCE_DATE,
  OBJECTION_REASON_STATUTES,
  OBJECTION_STATUSES,
  OFFICIAL_ROLES,
  STAGE_HANDLER_ROLE,
  getAdvanceGate,
  getDocumentsForStage,
  getEscalationStatus,
  getLapseStatus,
  getParcelCalculatedStatus,
  getParcelRiskAssessment,
  getStageDefinition,
  isParcelInScope,
  runDocumentQualityCheck,
  type AcquisitionParcel,
  type AcquisitionProject,
  type DocumentCheckInput,
  type DocumentCheckResult,
  type DocumentCheckSignal,
  type DocumentKind,
  type ObjectionStatus,
  type OfficialRole,
  type StageId,
} from '../domain';
import {
  getAdvanceGateReasonText,
  getBadgeTone,
  getDocumentStatusTone,
  getEscalationTone,
  getLapseMonthsElapsed,
  getLapseRiskIcon,
  getLapseRiskTone,
  getPaginationPageLabel,
  getPaginationSummary,
  getRiskTone,
  getSignalTone,
  getStatusIcon,
} from './statusDisplay';

const DOCUMENTS_PAGE_SIZE = 5;

export function ParcelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { session } = useSession();
  const { t } = useLanguage();
  const { pendingCountForParcel } = useOffline();

  const [parcel, setParcel] = useState<AcquisitionParcel | undefined>(undefined);
  const [project, setProject] = useState<AcquisitionProject | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | undefined>(undefined);

  const [handledByRole, setHandledByRole] = useState<OfficialRole>('land_acquisition_officer');
  const [advanceNote, setAdvanceNote] = useState('');
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [advanceError, setAdvanceError] = useState<string | undefined>(undefined);
  const [advanceMessage, setAdvanceMessage] = useState<string | undefined>(undefined);

  const [uploadStage, setUploadStage] = useState<StageId>('notification');
  const [uploadKind, setUploadKind] = useState<DocumentKind>('section_11_notification');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadedByRole, setUploadedByRole] = useState<OfficialRole>('land_acquisition_officer');
  const [uploadFile, setUploadFile] = useState<File | undefined>(undefined);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | undefined>(undefined);
  const [uploadMessage, setUploadMessage] = useState<string | undefined>(undefined);
  const [lastCheckResult, setLastCheckResult] = useState<DocumentCheckResult | undefined>(undefined);
  const [lastCheckInput, setLastCheckInput] = useState<DocumentCheckInput | undefined>(undefined);
  const [lastUploadedFile, setLastUploadedFile] = useState<File | undefined>(undefined);
  const [isReadingScan, setIsReadingScan] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanError, setScanError] = useState<string | undefined>(undefined);

  const [updatingObjectionId, setUpdatingObjectionId] = useState<string | undefined>(undefined);
  const [objectionStatusError, setObjectionStatusError] = useState<string | undefined>(undefined);

  const [verifyingDocumentId, setVerifyingDocumentId] = useState<string | undefined>(undefined);
  const [rejectingDocumentId, setRejectingDocumentId] = useState<string | undefined>(undefined);
  const [rejectReason, setRejectReason] = useState('');
  const [documentActionError, setDocumentActionError] = useState<string | undefined>(undefined);

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
        const loadedProject = loadedParcel
          ? await repository.getProjectById(loadedParcel.projectId)
          : undefined;
        if (isCancelled) {
          return;
        }
        setProject(loadedProject);
        const inScope = !!loadedParcel && isParcelInScope(loadedParcel, loadedProject, session);
        setParcel(inScope ? loadedParcel : undefined);
        if (loadedParcel && inScope) {
          const nextStage = getAdvanceGate(loadedParcel).toStage;
          setHandledByRole(
            nextStage ? STAGE_HANDLER_ROLE[nextStage] : STAGE_HANDLER_ROLE[loadedParcel.currentStage],
          );
          setUploadStage(loadedParcel.currentStage);
          setUploadKind(getStageDefinition(loadedParcel.currentStage).requiredDocumentKinds[0]);
          setUploadedByRole(STAGE_HANDLER_ROLE[loadedParcel.currentStage]);
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

  const calculatedStatus = useMemo(() => (parcel ? getParcelCalculatedStatus(parcel) : undefined), [parcel]);
  const advanceGate = useMemo(() => (parcel ? getAdvanceGate(parcel) : undefined), [parcel]);
  const documentsPagination = usePagination(parcel?.documents ?? [], DOCUMENTS_PAGE_SIZE, parcel?.id);
  const riskAssessment = useMemo(
    () => (parcel && project ? getParcelRiskAssessment(parcel, project) : undefined),
    [parcel, project],
  );
  const escalationStatus = useMemo(() => (parcel ? getEscalationStatus(parcel) : undefined), [parcel]);
  const lapseStatus = useMemo(() => (parcel ? getLapseStatus(parcel) : undefined), [parcel]);

  async function handleAdvance() {
    if (!parcel || !advanceGate?.canAdvance) {
      return;
    }

    setIsAdvancing(true);
    setAdvanceError(undefined);
    setAdvanceMessage(undefined);

    try {
      const updatedParcel = await repository.advanceParcelStage({
        parcelId: parcel.id,
        toStage: advanceGate.toStage,
        handledByRole,
        note:
          advanceNote.trim() ||
          `${t(uiText.parcelDetail.advancedToStagePrefix)} ${t(stageLabels[advanceGate.toStage])} ${t(uiText.parcelDetail.advancedToStageSuffix)}`,
        enteredOn: DEMO_REFERENCE_DATE,
      });
      setParcel(updatedParcel);
      setAdvanceNote('');
      setAdvanceMessage(`${t(uiText.parcelDetail.movedToPrefix)} ${t(stageLabels[updatedParcel.currentStage])}.`);
    } catch {
      setAdvanceError(t(uiText.parcelDetail.advanceErrorMessage));
    } finally {
      setIsAdvancing(false);
    }
  }

  async function handleObjectionStatusChange(objectionId: string, status: ObjectionStatus) {
    if (!parcel) {
      return;
    }

    setUpdatingObjectionId(objectionId);
    setObjectionStatusError(undefined);

    try {
      await repository.updateObjectionStatus({ objectionId, status, updatedOn: DEMO_REFERENCE_DATE });
      const refreshedParcel = await repository.getParcelById(parcel.id);
      setParcel(refreshedParcel);
    } catch {
      setObjectionStatusError(t(uiText.parcelDetail.objectionStatusErrorMessage));
    } finally {
      setUpdatingObjectionId(undefined);
    }
  }

  async function handleVerifyDocument(documentId: string, stage: StageId) {
    if (!parcel) {
      return;
    }

    setVerifyingDocumentId(documentId);
    setDocumentActionError(undefined);

    try {
      await repository.verifyDocument({
        documentId,
        status: 'verified',
        reviewedByRole: STAGE_HANDLER_ROLE[stage],
        reviewedOn: DEMO_REFERENCE_DATE,
      });
      const refreshedParcel = await repository.getParcelById(parcel.id);
      setParcel(refreshedParcel);
    } catch {
      setDocumentActionError(t(uiText.parcelDetail.verifyErrorMessage));
    } finally {
      setVerifyingDocumentId(undefined);
    }
  }

  function handleStartReject(documentId: string) {
    setRejectingDocumentId(documentId);
    setRejectReason('');
    setDocumentActionError(undefined);
  }

  function handleCancelReject() {
    setRejectingDocumentId(undefined);
    setRejectReason('');
  }

  async function handleConfirmReject(documentId: string, stage: StageId) {
    if (!parcel || !rejectReason.trim()) {
      setDocumentActionError(t(uiText.parcelDetail.rejectReasonRequiredError));
      return;
    }

    setVerifyingDocumentId(documentId);
    setDocumentActionError(undefined);

    try {
      await repository.verifyDocument({
        documentId,
        status: 'rejected',
        reviewedByRole: STAGE_HANDLER_ROLE[stage],
        reviewedOn: DEMO_REFERENCE_DATE,
        rejectionReason: rejectReason.trim(),
      });
      const refreshedParcel = await repository.getParcelById(parcel.id);
      setParcel(refreshedParcel);
      setRejectingDocumentId(undefined);
      setRejectReason('');
    } catch {
      setDocumentActionError(t(uiText.parcelDetail.rejectErrorMessage));
    } finally {
      setVerifyingDocumentId(undefined);
    }
  }

  function handleUploadStageChange(stage: StageId) {
    setUploadStage(stage);
    setUploadKind(getStageDefinition(stage).requiredDocumentKinds[0]);
    setUploadedByRole(STAGE_HANDLER_ROLE[stage]);
  }

  async function handleUpload() {
    if (!parcel || !uploadFile) {
      setUploadError(t(uiText.parcelDetail.chooseFileError));
      return;
    }

    setIsUploading(true);
    setUploadError(undefined);
    setUploadMessage(undefined);
    setLastCheckResult(undefined);
    setLastCheckInput(undefined);
    setLastUploadedFile(undefined);
    setScanError(undefined);

    try {
      const { url, fileType } = await uploadDocumentFile(parcel.id, uploadStage, uploadFile);

      let pdfExtraction: Awaited<ReturnType<typeof extractPdfText>> | undefined;
      if (fileType === 'pdf') {
        try {
          pdfExtraction = await extractPdfText(uploadFile);
        } catch {
          pdfExtraction = { pageCount: 0, hasTextLayer: false, text: '' };
        }
      }

      let imageAnalysis: Awaited<ReturnType<typeof analyzeImageFile>> | undefined;
      if (fileType === 'image') {
        try {
          imageAnalysis = await analyzeImageFile(uploadFile);
        } catch {
          imageAnalysis = undefined;
        }
      }

      const checkInput: DocumentCheckInput = {
        name: uploadFile.name,
        size: uploadFile.size,
        type: fileType,
        content: {
          documentKind: uploadKind,
          surveyNumber: parcel.surveyNumber,
          referenceDate: DEMO_REFERENCE_DATE,
          projectSanctionedOn: project?.sanctionedOn,
          pdfExtraction,
          imageAnalysis,
        },
      };
      const checkResult = runDocumentQualityCheck(checkInput);
      setLastCheckInput(checkInput);
      setLastUploadedFile(uploadFile);
      await repository.addDocument({
        parcelId: parcel.id,
        stage: uploadStage,
        kind: uploadKind,
        title: uploadTitle.trim() || t(documentKindLabels[uploadKind]),
        uploadedOn: DEMO_REFERENCE_DATE,
        uploadedByRole,
        fileType,
        url,
        status: 'pending_verification',
        qualityCheckVerdict: checkResult.verdict,
      });
      const refreshedParcel = await repository.getParcelById(parcel.id);
      setParcel(refreshedParcel);
      setLastCheckResult(checkResult);
      setUploadTitle('');
      setUploadFile(undefined);
      setFileInputKey((key) => key + 1);
      setUploadMessage(
        `${t(uiText.parcelDetail.uploadedMessagePrefix)} ${t(documentKindLabels[uploadKind])} ${t(
          uiText.parcelDetail.uploadedMessageForWord,
        )} ${t(stageLabels[uploadStage])}.`,
      );
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : t(uiText.parcelDetail.uploadErrorFallback));
    } finally {
      setIsUploading(false);
    }
  }

  async function handleReadScan() {
    if (!lastUploadedFile || !lastCheckInput) {
      return;
    }

    setIsReadingScan(true);
    setScanProgress(0);
    setScanError(undefined);

    try {
      const { text, confidence } = await runOcr(lastUploadedFile, setScanProgress);
      const updatedInput: DocumentCheckInput = {
        ...lastCheckInput,
        content: lastCheckInput.content
          ? { ...lastCheckInput.content, ocrText: text, ocrConfidence: confidence }
          : undefined,
      };
      setLastCheckInput(updatedInput);
      setLastCheckResult(runDocumentQualityCheck(updatedInput));
    } catch {
      setScanError(t(uiText.parcelDetail.ocrErrorMessage));
    } finally {
      setIsReadingScan(false);
    }
  }

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader eyebrow={t(uiText.parcelDetail.eyebrowWorkspace)} title={t(uiText.parcelDetail.title)} />
        <Card>
          <p>{t(uiText.parcelDetail.loading)}</p>
        </Card>
      </PageContainer>
    );
  }

  if (loadError || !parcel || !calculatedStatus || !advanceGate) {
    return (
      <PageContainer>
        <PageHeader eyebrow={t(uiText.parcelDetail.eyebrowWorkspace)} title={t(uiText.parcelDetail.title)} />
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

  const currentStageOrder = getStageDefinition(parcel.currentStage).order;
  const documentsForStage = getDocumentsForStage(parcel);

  const documentRows = documentsPagination.pageItems.map((document) => [
    t(stageShortLabels[document.stage]),
    t(documentKindLabels[document.kind]),
    document.title,
    document.uploadedOn,
    t(officialRoleLabels[document.uploadedByRole]),
    document.fileType.toUpperCase(),
    <div key={`${document.id}-status`}>
      <Badge tone={getDocumentStatusTone(document.status)}>{t(documentStatusLabels[document.status])}</Badge>
      {document.status === 'rejected' && document.rejectionReason && <p>{document.rejectionReason}</p>}
    </div>,
    document.qualityCheckVerdict ? (
      <Badge
        key={`${document.id}-quality`}
        tone={
          document.qualityCheckVerdict === 'looks_complete'
            ? 'success'
            : document.qualityCheckVerdict === 'needs_review'
              ? 'warning'
              : 'danger'
        }
      >
        {t(documentCheckVerdictLabels[document.qualityCheckVerdict])}
      </Badge>
    ) : (
      '—'
    ),
    rejectingDocumentId === document.id ? (
      <div className="row-inline-form" key={`${document.id}-reject-form`}>
        <TextField
          label={t(uiText.parcelDetail.rejectionReasonLabel)}
          value={rejectReason}
          onChange={(event) => setRejectReason(event.target.value)}
        />
        <Button
          type="button"
          disabled={verifyingDocumentId === document.id}
          onClick={() => void handleConfirmReject(document.id, document.stage)}
        >
          {t(uiText.parcelDetail.confirmRejectButton)}
        </Button>
        <Button type="button" variant="secondary" onClick={handleCancelReject}>
          {t(uiText.parcelDetail.cancelButton)}
        </Button>
      </div>
    ) : (
      <div key={`${document.id}-actions`} className="row-actions">
        <Button
          type="button"
          disabled={verifyingDocumentId === document.id}
          onClick={() => void handleVerifyDocument(document.id, document.stage)}
        >
          {t(uiText.parcelDetail.verifyButton)}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={verifyingDocumentId === document.id}
          onClick={() => handleStartReject(document.id)}
        >
          {t(uiText.parcelDetail.rejectButton)}
        </Button>
      </div>
    ),
  ]);

  const objectionRows = parcel.objections.map((objection) => [
    objection.id,
    objection.submittedOn,
    objection.submittedBy,
    t(objectionReasonLabels[objection.reason]),
    OBJECTION_REASON_STATUTES[objection.reason],
    objection.description,
    <Badge
      key={`${objection.id}-status`}
      tone={objection.status === 'resolved' ? 'success' : objection.status === 'under_review' ? 'info' : 'warning'}
    >
      {t(objectionStatusLabels[objection.status])}
    </Badge>,
    <select
      key={`${objection.id}-status-select`}
      aria-label={`${t(uiText.parcelDetail.updateStatusAriaPrefix)} ${objection.id}`}
      value={objection.status}
      disabled={updatingObjectionId === objection.id}
      onChange={(event) => void handleObjectionStatusChange(objection.id, event.target.value as ObjectionStatus)}
    >
      {OBJECTION_STATUSES.map((status) => (
        <option key={status} value={status}>
          {t(objectionStatusLabels[status])}
        </option>
      ))}
    </select>,
    <SmsPreviewPanel
      key={`${objection.id}-sms`}
      ownerLanguage={parcel.owner.preferredLanguage}
      event={{ kind: 'objection_status', surveyNumber: parcel.surveyNumber, status: objection.status }}
      triggerLabel={t(uiText.parcelDetail.notifySmsLabel)}
    />,
  ]);

  const currentStageLabel = t(stageLabels[parcel.currentStage]);
  const dashboardStatusLabel = t(dashboardStatusLabels[calculatedStatus.status]);

  const lapseKillShotText =
    lapseStatus && lapseStatus.risk !== 'safe'
      ? t(
          lapseStatus.risk === 'lapsed'
            ? uiText.lapseClock.lapsedKillShotTemplate
            : uiText.lapseClock.approachingKillShotTemplate,
        )
          .replace('{amount}', parcel.compensationEstimate.toLocaleString('en-IN'))
          .replace('{months}', String(getLapseMonthsElapsed(lapseStatus)))
          .replace('{days}', String(Math.abs(lapseStatus.daysRemaining)))
          .replace(
            '{statute}',
            t(lapseStatus.statute === 'section_24' ? uiText.lapseClock.statuteSection24 : uiText.lapseClock.statuteSection19),
          )
      : undefined;

  return (
    <PageContainer>
      <PageHeader
        eyebrow={parcel.district}
        title={`Survey ${parcel.surveyNumber}`}
        description={`${parcel.owner.name} · ${parcel.village}, ${parcel.tehsil}`}
        actions={
          <div className="page-actions-group">
            <Link to={`/official/parcel/${parcel.id}/notice`}>
              <Button type="button" variant="secondary">
                {t(uiText.parcelDetail.generateNoticeButton)}
              </Button>
            </Link>
            <Link to={`/official/parcel/${parcel.id}/audit-export`}>
              <Button type="button" variant="secondary">
                {t(uiText.parcelDetail.exportAuditBundleButton)}
              </Button>
            </Link>
            <Link to="/official">
              <Button type="button" variant="secondary">
                {t(uiText.parcelDetail.backToDashboard)}
              </Button>
            </Link>
          </div>
        }
      />

      {pendingCountForParcel(parcel.id) > 0 && (
        <Badge tone="warning">
          {pendingCountForParcel(parcel.id)} {t(uiText.offline.pendingBadgePrefix)} — {t(uiText.offline.parcelPendingNote)}
        </Badge>
      )}

      {lapseStatus && lapseStatus.risk !== 'safe' && (
        <div className={`lapse-banner lapse-banner-${lapseStatus.risk}`} role="alert">
          <span className="lapse-banner-title">
            <span aria-hidden="true">{getLapseRiskIcon(lapseStatus.risk)}</span> {t(uiText.lapseClock.cardTitle)}:{' '}
            {t(lapseRiskLabels[lapseStatus.risk])}
          </span>
          <span>{lapseKillShotText}</span>
          <span className="lapse-banner-note">
            {t(uiText.lapseClock.deadlineLabel)}: {lapseStatus.deadlineOn} — {t(uiText.lapseClock.disclaimerNote)}
          </span>
        </div>
      )}

      <section className="landowner-grid">
        <Card eyebrow={t(uiText.parcelDetail.overviewEyebrow)} title={t(uiText.parcelDetail.overviewTitle)}>
          <div className="status-list">
            <span>{t(uiText.parcelDetail.ownerLabel)}</span>
            <strong>{parcel.owner.name}</strong>
            <span>{t(uiText.parcelDetail.phoneLabel)}</span>
            <strong>{parcel.owner.phone}</strong>
            <span>{t(uiText.parcelDetail.locationLabel)}</span>
            <strong>
              {parcel.village}, {parcel.tehsil}, {parcel.district}
            </strong>
            <span>{t(uiText.parcelDetail.areaLabel)}</span>
            <strong>{parcel.areaHectares} ha</strong>
            <span>{t(uiText.parcelDetail.coordinatesLabel)}</span>
            <strong>
              {parcel.coordinates.lat.toFixed(4)}, {parcel.coordinates.lng.toFixed(4)}
            </strong>
            <span>{t(uiText.parcelDetail.compensationEstimateLabel)}</span>
            <strong>₹{parcel.compensationEstimate.toLocaleString('en-IN')}</strong>
          </div>
        </Card>

        <Card eyebrow={t(uiText.parcelDetail.statusEyebrow)} title={t(uiText.parcelDetail.statusTitle)}>
          <div className="status-list">
            <span>{t(uiText.parcelDetail.currentStageLabel)}</span>
            <strong>{currentStageLabel}</strong>
            <span>{t(uiText.parcelDetail.daysInStageLabel)}</span>
            <strong>
              {calculatedStatus.daysInStage} {t(uiText.parcelDetail.daysInStageOfWord)} {calculatedStatus.thresholdDays}{' '}
              {t(uiText.parcelDetail.dayThresholdSuffix)}
            </strong>
            <span>{t(uiText.parcelDetail.statusLabel)}</span>
            <Badge tone={getBadgeTone(calculatedStatus.status)}>
              <span aria-hidden="true">{getStatusIcon(calculatedStatus.status)}</span> {dashboardStatusLabel}
            </Badge>
            <span>{t(uiText.parcelDetail.missingDocumentsLabel)}</span>
            <strong>
              {calculatedStatus.missingDocumentKinds.length === 0
                ? t(uiText.parcelDetail.missingDocumentsNone)
                : calculatedStatus.missingDocumentKinds.map((kind) => t(documentKindLabels[kind])).join(', ')}
            </strong>
            <span>{t(uiText.parcelDetail.openObjectionsLabel)}</span>
            <strong>{calculatedStatus.openObjectionCount}</strong>
          </div>
        </Card>
      </section>

      {riskAssessment && (
        <Card eyebrow={t(uiText.parcelDetail.riskEyebrow)} title={t(uiText.parcelDetail.riskTitle)}>
          <div className="status-list">
            <span>{t(uiText.parcelDetail.scoreLabel)}</span>
            <strong>
              {riskAssessment.score} {t(uiText.parcelDetail.scoreSuffix)}
            </strong>
            <span>{t(uiText.parcelDetail.levelLabel)}</span>
            <Badge tone={getRiskTone(riskAssessment.level)}>{t(riskLevelLabels[riskAssessment.level])}</Badge>
            <span>{t(uiText.parcelDetail.responsibleRoleLabel)}</span>
            <strong>{t(officialRoleLabels[riskAssessment.responsibleRole])}</strong>
            {riskAssessment.contributors.map((contributor) => (
              <Fragment key={contributor.label}>
                <span>{contributor.label}</span>
                <strong>
                  {contributor.points} {t(uiText.parcelDetail.pointsSuffix)}
                </strong>
              </Fragment>
            ))}
          </div>
          <p>{riskAssessment.recommendedAction}</p>
        </Card>
      )}

      {escalationStatus && (
        <Card eyebrow={t(uiText.escalation.parcelEyebrow)} title={t(uiText.escalation.parcelTitle)}>
          <div className="status-list">
            <span>{t(uiText.escalation.levelLabel)}</span>
            <Badge tone={getEscalationTone(escalationStatus.level)}>
              {t(escalationLevelLabels[escalationStatus.level])}
            </Badge>
            <span>{t(uiText.escalation.daysPastSlaLabel)}</span>
            <strong>
              {escalationStatus.daysPastSla > 0 ? escalationStatus.daysPastSla : t(uiText.escalation.daysPastSlaNone)}
            </strong>
          </div>
          <p>{t(uiText.escalation.explainer)}</p>
        </Card>
      )}

      <Card eyebrow={t(uiText.parcelDetail.workflowEyebrow)} title={t(uiText.parcelDetail.acquisitionStagesTitle)}>
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
                      ? t(uiText.parcelDetail.stepInProgress)
                      : stepState === 'complete'
                        ? t(uiText.parcelDetail.stepDone)
                        : t(uiText.parcelDetail.stepUpcoming)}
                  </span>
                </span>
                {index < ACQUISITION_STAGES.length - 1 && <span className="step-connector" aria-hidden="true" />}
              </li>
            );
          })}
        </ol>
      </Card>

      <Card eyebrow={t(uiText.parcelDetail.actionEyebrow)} title={t(uiText.parcelDetail.advanceWorkflowTitle)}>
        {advanceGate.canAdvance ? (
          <>
            <p>
              {t(uiText.parcelDetail.meetsRequirementsPrefix)} {currentStageLabel}
              {t(uiText.parcelDetail.meetsRequirementsMiddle)} {t(stageLabels[advanceGate.toStage])}.
            </p>
            <form
              className="filter-grid"
              onSubmit={(event) => {
                event.preventDefault();
                void handleAdvance();
              }}
            >
              <SelectField
                label={t(uiText.parcelDetail.handledByLabel)}
                value={handledByRole}
                onChange={(event) => setHandledByRole(event.target.value as OfficialRole)}
              >
                {OFFICIAL_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {t(officialRoleLabels[role])}
                  </option>
                ))}
              </SelectField>
              <TextField
                label={t(uiText.parcelDetail.noteLabel)}
                placeholder={`${t(uiText.parcelDetail.advancedToStagePrefix)} ${t(stageLabels[advanceGate.toStage])} ${t(
                  uiText.parcelDetail.advancedToStageSuffix,
                )}`}
                value={advanceNote}
                onChange={(event) => setAdvanceNote(event.target.value)}
              />
              <Button disabled={isAdvancing} type="submit">
                {isAdvancing
                  ? t(uiText.parcelDetail.advancingButton)
                  : `${t(uiText.parcelDetail.advanceToButtonPrefix)} ${t(stageLabels[advanceGate.toStage])}`}
              </Button>
            </form>
            {advanceMessage && <p>{advanceMessage}</p>}
            {advanceError && <p>{advanceError}</p>}
          </>
        ) : (
          <EmptyState
            title={advanceGate.toStage ? t(uiText.parcelDetail.cannotAdvanceYetTitle) : t(uiText.parcelDetail.workflowCompleteTitle)}
            description={getAdvanceGateReasonText(parcel.currentStage, calculatedStatus, advanceGate, t)}
          />
        )}
        <SmsPreviewPanel
          ownerLanguage={parcel.owner.preferredLanguage}
          event={{ kind: 'stage_advance', surveyNumber: parcel.surveyNumber, stage: parcel.currentStage }}
        />
      </Card>

      <Card eyebrow={t(uiText.auditChain.eyebrow)} title={t(uiText.auditChain.title)}>
        <p>{t(uiText.auditChain.description)}</p>
        <AuditChainLedger history={parcel.history} />
      </Card>

      <Card eyebrow={t(uiText.parcelDetail.uploadEyebrow)} title={t(uiText.parcelDetail.uploadDocumentTitle)}>
        <form
          className="filter-grid"
          onSubmit={(event) => {
            event.preventDefault();
            void handleUpload();
          }}
        >
          <SelectField
            label={t(uiText.parcelDetail.stageFieldLabel)}
            value={uploadStage}
            onChange={(event) => handleUploadStageChange(event.target.value as StageId)}
          >
            {ACQUISITION_STAGES.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {t(stageLabels[stage.id])}
              </option>
            ))}
          </SelectField>
          <SelectField
            label={t(uiText.parcelDetail.documentTypeLabel)}
            value={uploadKind}
            onChange={(event) => setUploadKind(event.target.value as DocumentKind)}
          >
            {getStageDefinition(uploadStage).requiredDocumentKinds.map((kind) => (
              <option key={kind} value={kind}>
                {t(documentKindLabels[kind])}
              </option>
            ))}
          </SelectField>
          <TextField
            label={t(uiText.parcelDetail.titleFieldLabel)}
            placeholder={t(documentKindLabels[uploadKind])}
            value={uploadTitle}
            onChange={(event) => setUploadTitle(event.target.value)}
          />
          <SelectField
            label={t(uiText.parcelDetail.uploadedByLabel)}
            value={uploadedByRole}
            onChange={(event) => setUploadedByRole(event.target.value as OfficialRole)}
          >
            {OFFICIAL_ROLES.map((role) => (
              <option key={role} value={role}>
                {t(officialRoleLabels[role])}
              </option>
            ))}
          </SelectField>
          <FileField
            key={fileInputKey}
            label={t(uiText.parcelDetail.fileLabel)}
            accept="application/pdf,image/*"
            hint={t(uiText.parcelDetail.fileHint)}
            onChange={(event) => setUploadFile(event.target.files?.[0])}
          />
          <Button disabled={isUploading} type="submit">
            {isUploading ? t(uiText.parcelDetail.uploadingButton) : t(uiText.parcelDetail.uploadDocumentButton)}
          </Button>
        </form>
        {uploadMessage && <p>{uploadMessage}</p>}
        {lastCheckResult && (
          <div className="document-check-result">
            <p>
              <Badge
                tone={
                  lastCheckResult.verdict === 'looks_complete'
                    ? 'success'
                    : lastCheckResult.verdict === 'needs_review'
                      ? 'warning'
                      : 'danger'
                }
              >
                {t(uiText.parcelDetail.aiCheckPrefix)} {t(documentCheckVerdictLabels[lastCheckResult.verdict])}
              </Badge>
            </p>
            <p className="eyebrow">{t(uiText.parcelDetail.signalBreakdownLabel)}</p>
            <ul className="signal-list">
              {lastCheckResult.signals.map((signal: DocumentCheckSignal) => (
                <li key={signal.id}>
                  <Badge tone={getSignalTone(signal.status)}>{signal.label}</Badge>
                  <span>{signal.detail}</span>
                </li>
              ))}
            </ul>
            {lastCheckResult.signals.some((signal) => signal.id === 'text_presence' && signal.status === 'warning') && (
              <p>
                <Button type="button" variant="secondary" disabled={isReadingScan} onClick={() => void handleReadScan()}>
                  {isReadingScan
                    ? `${t(uiText.parcelDetail.ocrRunningButton)} ${scanProgress}%`
                    : t(uiText.parcelDetail.ocrButton)}
                </Button>
                <br />
                <small>{t(uiText.parcelDetail.ocrNetworkNote)}</small>
              </p>
            )}
            {scanError && <p>{scanError}</p>}
          </div>
        )}
        {uploadError && <p>{uploadError}</p>}
      </Card>

      <Card
        eyebrow={`${documentsForStage.length} ${t(uiText.parcelDetail.documentsEyebrowSuffix)}`}
        title={t(uiText.parcelDetail.documentsTitle)}
      >
        {documentRows.length > 0 ? (
          <>
            <DataTable
              caption={t(uiText.parcelDetail.documentsCaption)}
              tableClassName="table-wide"
              columns={[
                t(uiText.parcelDetail.colStage),
                t(uiText.parcelDetail.colDocument),
                t(uiText.parcelDetail.titleFieldLabel),
                t(uiText.parcelDetail.colUploaded),
                t(uiText.parcelDetail.colBy),
                t(uiText.parcelDetail.colType),
                t(uiText.parcelDetail.statusLabel),
                t(uiText.parcelDetail.colQualityCheck),
                t(uiText.parcelDetail.colVerifyReject),
              ]}
              rows={documentRows}
            />
            <Pagination
              page={documentsPagination.page}
              pageCount={documentsPagination.pageCount}
              onPageChange={documentsPagination.setPage}
              summary={getPaginationSummary(parcel.documents.length, documentsPagination.page, DOCUMENTS_PAGE_SIZE, t)}
              pageLabel={getPaginationPageLabel(documentsPagination.page, documentsPagination.pageCount, t)}
              previousLabel={t(uiText.pagination.previous)}
              nextLabel={t(uiText.pagination.next)}
            />
          </>
        ) : (
          <EmptyState
            title={t(uiText.parcelDetail.noDocumentsUploadedTitle)}
            description={t(uiText.parcelDetail.noDocumentsUploadedDescription)}
          />
        )}
        {documentActionError && <p>{documentActionError}</p>}
      </Card>

      <Card
        eyebrow={`${parcel.objections.length} ${t(uiText.parcelDetail.objectionsEyebrowSuffix)}`}
        title={t(uiText.parcelDetail.objectionsTitle)}
      >
        {objectionRows.length > 0 ? (
          <DataTable
            caption={t(uiText.parcelDetail.objectionsCaption)}
            columns={[
              t(uiText.parcelDetail.colId),
              t(uiText.parcelDetail.colSubmitted),
              t(uiText.parcelDetail.colBy),
              t(uiText.parcelDetail.colReason),
              t(uiText.parcelDetail.colStatute),
              t(uiText.parcelDetail.colDescription),
              t(uiText.parcelDetail.statusLabel),
              t(uiText.parcelDetail.colUpdateStatus),
              t(uiText.parcelDetail.colNotify),
            ]}
            rows={objectionRows}
          />
        ) : (
          <EmptyState
            title={t(uiText.parcelDetail.noObjectionsFiledTitle)}
            description={t(uiText.parcelDetail.noObjectionsFiledDescription)}
          />
        )}
        {objectionStatusError && <p>{objectionStatusError}</p>}
      </Card>
    </PageContainer>
  );
}
