import type {
  AcquisitionParcel,
  AcquisitionProject,
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

export type AddDocumentInput = Omit<ParcelDocument, 'id'>;

export type AddObjectionInput = Omit<ParcelObjection, 'id' | 'status' | 'updatedOn'> & {
  status?: ObjectionStatus;
};

export type UpdateObjectionStatusInput = {
  objectionId: string;
  status: ObjectionStatus;
  updatedOn: ISODateString;
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
  addObjection(input: AddObjectionInput): Promise<ParcelObjection>;
  updateObjectionStatus(input: UpdateObjectionStatusInput): Promise<ParcelObjection>;
  listProjects(): Promise<AcquisitionProject[]>;
  getProjectById(projectId: string): Promise<AcquisitionProject | undefined>;
}
