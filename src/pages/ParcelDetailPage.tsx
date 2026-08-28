import { useEffect, useMemo, useState } from 'react';
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
  SelectField,
  TextField,
} from '../components/ui';
import { SmsPreviewPanel } from '../components/SmsPreviewPanel';
import { repository } from '../data';
import { uploadDocumentFile } from '../data/upload';
import {
  ACQUISITION_STAGES,
  DEMO_REFERENCE_DATE,
  DOCUMENT_CHECK_VERDICT_LABELS,
  DOCUMENT_KIND_LABELS,
  OBJECTION_REASON_LABELS,
  OBJECTION_STATUSES,
  OBJECTION_STATUS_LABELS,
  OFFICIAL_ROLES,
  OFFICIAL_ROLE_LABELS,
  STAGE_BY_ID,
  STAGE_HANDLER_ROLE,
  getAdvanceGate,
  getDocumentsForStage,
  getParcelCalculatedStatus,
  getStageDefinition,
  runDocumentQualityCheck,
  type AcquisitionParcel,
  type DocumentCheckResult,
  type DocumentKind,
  type ObjectionStatus,
  type OfficialRole,
  type StageId,
} from '../domain';
import { getBadgeTone, getStatusIcon, getStatusLabel } from './statusDisplay';

export function ParcelDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [parcel, setParcel] = useState<AcquisitionParcel | undefined>(undefined);
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

  const [updatingObjectionId, setUpdatingObjectionId] = useState<string | undefined>(undefined);
  const [objectionStatusError, setObjectionStatusError] = useState<string | undefined>(undefined);

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
        if (isCancelled) {
          return;
        }
        setParcel(loadedParcel);
        if (loadedParcel) {
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
  }, [id]);

  const calculatedStatus = useMemo(() => (parcel ? getParcelCalculatedStatus(parcel) : undefined), [parcel]);
  const advanceGate = useMemo(() => (parcel ? getAdvanceGate(parcel) : undefined), [parcel]);

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
        note: advanceNote.trim() || `Advanced to ${STAGE_BY_ID[advanceGate.toStage].label} stage.`,
        enteredOn: DEMO_REFERENCE_DATE,
      });
      setParcel(updatedParcel);
      setAdvanceNote('');
      setAdvanceMessage(`Moved to ${STAGE_BY_ID[updatedParcel.currentStage].label}.`);
    } catch {
      setAdvanceError('Could not advance the parcel. Try again.');
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
      setObjectionStatusError('Could not update the objection status. Try again.');
    } finally {
      setUpdatingObjectionId(undefined);
    }
  }

  function handleUploadStageChange(stage: StageId) {
    setUploadStage(stage);
    setUploadKind(getStageDefinition(stage).requiredDocumentKinds[0]);
    setUploadedByRole(STAGE_HANDLER_ROLE[stage]);
  }

  async function handleUpload() {
    if (!parcel || !uploadFile) {
      setUploadError('Choose a PDF or image file to upload.');
      return;
    }

    setIsUploading(true);
    setUploadError(undefined);
    setUploadMessage(undefined);
    setLastCheckResult(undefined);

    try {
      const { url, fileType } = await uploadDocumentFile(parcel.id, uploadStage, uploadFile);
      await repository.addDocument({
        parcelId: parcel.id,
        stage: uploadStage,
        kind: uploadKind,
        title: uploadTitle.trim() || DOCUMENT_KIND_LABELS[uploadKind],
        uploadedOn: DEMO_REFERENCE_DATE,
        uploadedByRole,
        fileType,
        url,
      });
      const refreshedParcel = await repository.getParcelById(parcel.id);
      setParcel(refreshedParcel);
      setLastCheckResult(
        runDocumentQualityCheck({ name: uploadFile.name, size: uploadFile.size, type: fileType }),
      );
      setUploadTitle('');
      setUploadFile(undefined);
      setFileInputKey((key) => key + 1);
      setUploadMessage(`Uploaded ${DOCUMENT_KIND_LABELS[uploadKind]} for ${STAGE_BY_ID[uploadStage].label}.`);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Could not upload the document. Try again.');
    } finally {
      setIsUploading(false);
    }
  }

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader eyebrow="Official workspace" title="Parcel Detail" />
        <Card>
          <p>Loading parcel…</p>
        </Card>
      </PageContainer>
    );
  }

  if (loadError || !parcel || !calculatedStatus || !advanceGate) {
    return (
      <PageContainer>
        <PageHeader eyebrow="Official workspace" title="Parcel Detail" />
        <Card>
          <EmptyState
            title="Parcel not found"
            description={loadError ?? 'No parcel matches this id. It may have been removed.'}
            action={
              <Link to="/official">
                <Button type="button" variant="secondary">
                  Back to dashboard
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

  const historyRows = [...parcel.history]
    .sort((first, second) => getStageDefinition(first.stage).order - getStageDefinition(second.stage).order)
    .map((entry) => [
      STAGE_BY_ID[entry.stage].label,
      entry.enteredOn,
      entry.exitedOn ?? '—',
      OFFICIAL_ROLE_LABELS[entry.handledByRole],
      entry.note,
    ]);

  const documentRows = parcel.documents.map((document) => [
    STAGE_BY_ID[document.stage].shortLabel,
    DOCUMENT_KIND_LABELS[document.kind],
    document.title,
    document.uploadedOn,
    OFFICIAL_ROLE_LABELS[document.uploadedByRole],
    document.fileType.toUpperCase(),
  ]);

  const objectionRows = parcel.objections.map((objection) => [
    objection.id,
    objection.submittedOn,
    objection.submittedBy,
    OBJECTION_REASON_LABELS[objection.reason],
    objection.description,
    <Badge
      key={`${objection.id}-status`}
      tone={objection.status === 'resolved' ? 'success' : objection.status === 'under_review' ? 'info' : 'warning'}
    >
      {OBJECTION_STATUS_LABELS[objection.status]}
    </Badge>,
    <select
      key={`${objection.id}-status-select`}
      aria-label={`Update status for objection ${objection.id}`}
      value={objection.status}
      disabled={updatingObjectionId === objection.id}
      onChange={(event) => void handleObjectionStatusChange(objection.id, event.target.value as ObjectionStatus)}
    >
      {OBJECTION_STATUSES.map((status) => (
        <option key={status} value={status}>
          {OBJECTION_STATUS_LABELS[status]}
        </option>
      ))}
    </select>,
    <SmsPreviewPanel
      key={`${objection.id}-sms`}
      ownerLanguage={parcel.owner.preferredLanguage}
      event={{ kind: 'objection_status', surveyNumber: parcel.surveyNumber, status: objection.status }}
      triggerLabel="Notify (SMS)"
    />,
  ]);

  return (
    <PageContainer>
      <PageHeader
        eyebrow={parcel.district}
        title={`Survey ${parcel.surveyNumber}`}
        description={`${parcel.owner.name} · ${parcel.village}, ${parcel.tehsil}`}
        actions={
          <Link to="/official">
            <Button type="button" variant="secondary">
              Back to dashboard
            </Button>
          </Link>
        }
      />

      <section className="landowner-grid">
        <Card eyebrow="Overview" title="Parcel Information">
          <div className="status-list">
            <span>Owner</span>
            <strong>{parcel.owner.name}</strong>
            <span>Phone</span>
            <strong>{parcel.owner.phone}</strong>
            <span>Location</span>
            <strong>
              {parcel.village}, {parcel.tehsil}, {parcel.district}
            </strong>
            <span>Area</span>
            <strong>{parcel.areaHectares} ha</strong>
            <span>Coordinates</span>
            <strong>
              {parcel.coordinates.lat.toFixed(4)}, {parcel.coordinates.lng.toFixed(4)}
            </strong>
            <span>Compensation estimate</span>
            <strong>₹{parcel.compensationEstimate.toLocaleString('en-IN')}</strong>
          </div>
        </Card>

        <Card eyebrow="Status" title="Workflow Status">
          <div className="status-list">
            <span>Current stage</span>
            <strong>{STAGE_BY_ID[parcel.currentStage].label}</strong>
            <span>Days in stage</span>
            <strong>
              {calculatedStatus.daysInStage} of {calculatedStatus.thresholdDays} day threshold
            </strong>
            <span>Status</span>
            <Badge tone={getBadgeTone(calculatedStatus.status)}>
              <span aria-hidden="true">{getStatusIcon(calculatedStatus.status)}</span> {getStatusLabel(calculatedStatus.status)}
            </Badge>
            <span>Missing documents</span>
            <strong>
              {calculatedStatus.missingDocumentKinds.length === 0
                ? 'None'
                : calculatedStatus.missingDocumentKinds.map((kind) => DOCUMENT_KIND_LABELS[kind]).join(', ')}
            </strong>
            <span>Open objections</span>
            <strong>{calculatedStatus.openObjectionCount}</strong>
          </div>
        </Card>
      </section>

      <Card eyebrow="Workflow" title="Acquisition Stages">
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
                  <strong>{stage.label}</strong>
                  <span>{stepState === 'current' ? 'In progress' : stepState === 'complete' ? 'Done' : 'Upcoming'}</span>
                </span>
                {index < ACQUISITION_STAGES.length - 1 && <span className="step-connector" aria-hidden="true" />}
              </li>
            );
          })}
        </ol>
      </Card>

      <Card eyebrow="Action" title="Advance Workflow">
        {advanceGate.canAdvance ? (
          <>
            <p>
              This parcel meets every requirement for {STAGE_BY_ID[parcel.currentStage].label}. Record who is
              advancing it and an optional note before moving it to {STAGE_BY_ID[advanceGate.toStage].label}.
            </p>
            <form
              className="filter-grid"
              onSubmit={(event) => {
                event.preventDefault();
                void handleAdvance();
              }}
            >
              <SelectField
                label="Handled by"
                value={handledByRole}
                onChange={(event) => setHandledByRole(event.target.value as OfficialRole)}
              >
                {OFFICIAL_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {OFFICIAL_ROLE_LABELS[role]}
                  </option>
                ))}
              </SelectField>
              <TextField
                label="Note"
                placeholder={`Advanced to ${STAGE_BY_ID[advanceGate.toStage].label} stage.`}
                value={advanceNote}
                onChange={(event) => setAdvanceNote(event.target.value)}
              />
              <Button disabled={isAdvancing} type="submit">
                {isAdvancing ? 'Advancing…' : `Advance to ${STAGE_BY_ID[advanceGate.toStage].label}`}
              </Button>
            </form>
            {advanceMessage && <p>{advanceMessage}</p>}
            {advanceError && <p>{advanceError}</p>}
          </>
        ) : (
          <EmptyState
            title={advanceGate.toStage ? 'Cannot advance yet' : 'Workflow complete'}
            description={advanceGate.reasons[0] ?? 'This parcel has completed every acquisition stage.'}
          />
        )}
        <SmsPreviewPanel
          ownerLanguage={parcel.owner.preferredLanguage}
          event={{ kind: 'stage_advance', surveyNumber: parcel.surveyNumber, stage: parcel.currentStage }}
        />
      </Card>

      <Card eyebrow="Timeline" title="Stage History">
        {historyRows.length > 0 ? (
          <DataTable
            caption="Stage history for this parcel"
            columns={['Stage', 'Entered', 'Exited', 'Handled by', 'Note']}
            rows={historyRows}
          />
        ) : (
          <EmptyState title="No history yet" description="This parcel has no recorded stage history." />
        )}
      </Card>

      <Card eyebrow="Upload" title="Upload Document">
        <form
          className="filter-grid"
          onSubmit={(event) => {
            event.preventDefault();
            void handleUpload();
          }}
        >
          <SelectField
            label="Stage"
            value={uploadStage}
            onChange={(event) => handleUploadStageChange(event.target.value as StageId)}
          >
            {ACQUISITION_STAGES.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.label}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Document type"
            value={uploadKind}
            onChange={(event) => setUploadKind(event.target.value as DocumentKind)}
          >
            {getStageDefinition(uploadStage).requiredDocumentKinds.map((kind) => (
              <option key={kind} value={kind}>
                {DOCUMENT_KIND_LABELS[kind]}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Title"
            placeholder={DOCUMENT_KIND_LABELS[uploadKind]}
            value={uploadTitle}
            onChange={(event) => setUploadTitle(event.target.value)}
          />
          <SelectField
            label="Uploaded by"
            value={uploadedByRole}
            onChange={(event) => setUploadedByRole(event.target.value as OfficialRole)}
          >
            {OFFICIAL_ROLES.map((role) => (
              <option key={role} value={role}>
                {OFFICIAL_ROLE_LABELS[role]}
              </option>
            ))}
          </SelectField>
          <FileField
            key={fileInputKey}
            label="File"
            accept="application/pdf,image/*"
            hint="PDF or image files only."
            onChange={(event) => setUploadFile(event.target.files?.[0])}
          />
          <Button disabled={isUploading} type="submit">
            {isUploading ? 'Uploading…' : 'Upload document'}
          </Button>
        </form>
        {uploadMessage && <p>{uploadMessage}</p>}
        {lastCheckResult && (
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
              AI-style check (prototype heuristic): {DOCUMENT_CHECK_VERDICT_LABELS[lastCheckResult.verdict]}
            </Badge>{' '}
            {lastCheckResult.reasons.join(' ')}
          </p>
        )}
        {uploadError && <p>{uploadError}</p>}
      </Card>

      <Card eyebrow={`${documentsForStage.length} for current stage`} title="Documents">
        {documentRows.length > 0 ? (
          <DataTable
            caption="Documents uploaded for this parcel"
            columns={['Stage', 'Document', 'Title', 'Uploaded', 'By', 'Type']}
            rows={documentRows}
          />
        ) : (
          <EmptyState title="No documents uploaded" description="No documents have been recorded for this parcel." />
        )}
      </Card>

      <Card eyebrow={`${parcel.objections.length} total`} title="Objections">
        {objectionRows.length > 0 ? (
          <DataTable
            caption="Objections filed for this parcel"
            columns={['ID', 'Submitted', 'By', 'Reason', 'Description', 'Status', 'Update status', 'Notify']}
            rows={objectionRows}
          />
        ) : (
          <EmptyState title="No objections filed" description="No landowner objections have been recorded." />
        )}
        {objectionStatusError && <p>{objectionStatusError}</p>}
      </Card>
    </PageContainer>
  );
}
