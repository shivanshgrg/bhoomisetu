import type {
  AcquisitionParcel,
  AcquisitionProject,
  DocumentStatus,
  ISODateString,
  ObjectionStatus,
  OfficialRole,
  ParcelDocument,
  ParcelObjection,
  StageId,
} from '../domain';

export type AdvanceStageInput = {
  parcelId: string;
  toStage: StageId;
  handledByRole: OfficialRole;
  note: string;
  enteredOn: ISODateString;
};

// `status` defaults to 'pending_verification' in each implementation when
// omitted (mirrors demoData's seeded documents, which pass 'verified'
// explicitly instead) — see Step 27 handoff notes in IMPLEMENTATION_PROGRESS.md.
export type AddDocumentInput = Omit<ParcelDocument, 'id' | 'status'> & {
  status?: DocumentStatus;
};

export type AddObjectionInput = Omit<ParcelObjection, 'id' | 'status' | 'updatedOn'> & {
  status?: ObjectionStatus;
};

export type UpdateObjectionStatusInput = {
  objectionId: string;
  status: ObjectionStatus;
  updatedOn: ISODateString;
};

export type VerifyDocumentInput = {
  documentId: string;
  status: Extract<DocumentStatus, 'verified' | 'rejected'>;
  reviewedByRole: OfficialRole;
  reviewedOn: ISODateString;
  rejectionReason?: string;
};

/**
 * Typed data-access boundary. Both the demo (in-memory) and Supabase
 * implementations satisfy this interface so pages never branch on which
 * backend is active — see src/data/index.ts for the selection logic.
 */
export interface ParcelRepository {
  listParcels(): Promise<AcquisitionParcel[]>;
  getParcelById(parcelId: string): Promise<AcquisitionParcel | undefined>;
  getParcelBySurveyNumber(surveyNumber: string): Promise<AcquisitionParcel | undefined>;
  advanceParcelStage(input: AdvanceStageInput): Promise<AcquisitionParcel>;
  addDocument(input: AddDocumentInput): Promise<ParcelDocument>;
  verifyDocument(input: VerifyDocumentInput): Promise<ParcelDocument>;
  addObjection(input: AddObjectionInput): Promise<ParcelObjection>;
  updateObjectionStatus(input: UpdateObjectionStatusInput): Promise<ParcelObjection>;
  listProjects(): Promise<AcquisitionProject[]>;
  getProjectById(projectId: string): Promise<AcquisitionProject | undefined>;
}
