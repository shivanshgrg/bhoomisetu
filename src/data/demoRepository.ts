import { demoParcels, demoProjects } from '../domain';
import type { AcquisitionParcel, AcquisitionProject, ParcelDocument, ParcelObjection } from '../domain';
import type {
  AddDocumentInput,
  AddObjectionInput,
  AdvanceStageInput,
  ParcelRepository,
  UpdateObjectionStatusInput,
  VerifyDocumentInput,
} from './types';

function cloneParcels(): AcquisitionParcel[] {
  return demoParcels.map((parcel) => ({
    ...parcel,
    owner: { ...parcel.owner },
    coordinates: { ...parcel.coordinates },
    history: parcel.history.map((entry) => ({ ...entry })),
    documents: parcel.documents.map((document) => ({ ...document })),
    objections: parcel.objections.map((objection) => ({ ...objection })),
  }));
}

function cloneProjects(): AcquisitionProject[] {
  return demoProjects.map((project) => ({ ...project, rAndR: { ...project.rAndR } }));
}

// Module-level mutable store so edits made during a session (advancing a
// stage, uploading a document, filing an objection) persist across
// navigation without a backend. Resets on full page reload.
let parcels = cloneParcels();

// No mutators exist for projects yet (read-only through Step 12); still
// cloned from the seed like `parcels` for consistency if that changes later.
const projects = cloneProjects();

function requireParcelIndex(parcelId: string): number {
  const index = parcels.findIndex((candidate) => candidate.id === parcelId);
  if (index === -1) {
    throw new Error(`Unknown parcel id: ${parcelId}`);
  }
  return index;
}

// Swaps in a new parcel object (rather than mutating in place) so callers
// that memoize on parcel identity (e.g. React useMemo) see the change.
function replaceParcel(index: number, updated: AcquisitionParcel): AcquisitionParcel {
  parcels = [...parcels.slice(0, index), updated, ...parcels.slice(index + 1)];
  return updated;
}

function nextObjectionId(parcel: AcquisitionParcel): string {
  const sequence = parcel.objections.length + 1;
  const parcelSuffix = parcel.id.replace('parcel-', '').toUpperCase();
  return `OBJ-${parcelSuffix}-${String(sequence).padStart(2, '0')}`;
}

export const demoRepository: ParcelRepository = {
  async listParcels() {
    return parcels;
  },

  async getParcelById(parcelId) {
    return parcels.find((parcel) => parcel.id === parcelId);
  },

  async getParcelBySurveyNumber(surveyNumber) {
    return parcels.find((parcel) => parcel.surveyNumber === surveyNumber);
  },

  async advanceParcelStage({ parcelId, toStage, handledByRole, note, enteredOn }) {
    const index = requireParcelIndex(parcelId);
    const parcel = parcels[index];

    const history = parcel.history.map((entry) =>
      entry.stage === parcel.currentStage && !entry.exitedOn ? { ...entry, exitedOn: enteredOn } : entry,
    );
    history.push({
      id: `${parcelId}-history-${toStage}`,
      parcelId,
      stage: toStage,
      enteredOn,
      handledByRole,
      note,
    });

    return replaceParcel(index, {
      ...parcel,
      currentStage: toStage,
      stageEnteredOn: enteredOn,
      history,
    });
  },

  async addDocument(input) {
    const index = requireParcelIndex(input.parcelId);
    const parcel = parcels[index];
    const document: ParcelDocument = {
      ...input,
      id: `${input.parcelId}-document-${input.kind}-${parcel.documents.length + 1}`,
      status: input.status ?? 'pending_verification',
    };
    replaceParcel(index, { ...parcel, documents: [...parcel.documents, document] });
    return document;
  },

  async verifyDocument({ documentId, status, reviewedByRole, reviewedOn, rejectionReason }: VerifyDocumentInput) {
    const index = parcels.findIndex((candidate) =>
      candidate.documents.some((document) => document.id === documentId),
    );
    if (index === -1) {
      throw new Error(`Unknown document id: ${documentId}`);
    }

    const parcel = parcels[index];
    let updatedDocument: ParcelDocument | undefined;
    const documents = parcel.documents.map((document) => {
      if (document.id !== documentId) {
        return document;
      }
      updatedDocument = {
        ...document,
        status,
        reviewedByRole,
        reviewedOn,
        rejectionReason: status === 'rejected' ? rejectionReason : undefined,
      };
      return updatedDocument;
    });
    replaceParcel(index, { ...parcel, documents });
    return updatedDocument as ParcelDocument;
  },

  async addObjection(input) {
    const index = requireParcelIndex(input.parcelId);
    const parcel = parcels[index];
    const objection: ParcelObjection = {
      ...input,
      id: nextObjectionId(parcel),
      status: input.status ?? 'pending',
      updatedOn: input.submittedOn,
    };
    replaceParcel(index, { ...parcel, objections: [...parcel.objections, objection] });
    return objection;
  },

  async updateObjectionStatus({ objectionId, status, updatedOn }) {
    const index = parcels.findIndex((candidate) =>
      candidate.objections.some((objection) => objection.id === objectionId),
    );
    if (index === -1) {
      throw new Error(`Unknown objection id: ${objectionId}`);
    }

    const parcel = parcels[index];
    let updatedObjection: ParcelObjection | undefined;
    const objections = parcel.objections.map((objection) => {
      if (objection.id !== objectionId) {
        return objection;
      }
      updatedObjection = { ...objection, status, updatedOn };
      return updatedObjection;
    });
    replaceParcel(index, { ...parcel, objections });
    return updatedObjection as ParcelObjection;
  },

  async listProjects() {
    return projects;
  },

  async getProjectById(projectId) {
    return projects.find((project) => project.id === projectId);
  },
};
