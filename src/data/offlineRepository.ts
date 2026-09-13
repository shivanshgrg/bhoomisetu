import type {
  AcquisitionParcel,
  AcquisitionProject,
  ParcelDocument,
  ParcelObjection,
} from '../domain';
import type {
  AddDocumentInput,
  AddObjectionInput,
  AdvanceStageInput,
  ParcelRepository,
  UpdateObjectionStatusInput,
  VerifyDocumentInput,
} from './types';

// Step 55 — offline-first field capture. Field officers work where there is
// no signal, so every read serves from an IndexedDB cache when offline, and
// every write is queued in IndexedDB and replayed against the real backend
// once back online. The optimistic mutations below deliberately mirror
// `demoRepository.ts`'s own logic (the same shapes, the same in-memory
// pattern) so a queued write is reflected in the UI immediately, not just
// silently accepted — that is the difference between "usable offline" and
// "accepts input and hopes for the best."
//
// Known, disclosed limitation: this is last-write-wins with no conflict
// resolution across two devices editing the same parcel offline — acceptable
// for a single field officer's own device, not a distributed-editing system.

const DB_NAME = 'bhoomisetu-offline';
const DB_VERSION = 1;
const STORE_PARCELS = 'parcelCache';
const STORE_PROJECTS = 'projectCache';
const STORE_QUEUE = 'queue';

export type PendingActionKind =
  | 'advanceParcelStage'
  | 'addDocument'
  | 'verifyDocument'
  | 'addObjection'
  | 'updateObjectionStatus';

export type PendingAction = {
  id: number;
  kind: PendingActionKind;
  parcelId: string;
  input: AdvanceStageInput | AddDocumentInput | VerifyDocumentInput | AddObjectionInput | UpdateObjectionStatusInput;
  createdAt: string;
};

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this environment.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_PARCELS)) {
        db.createObjectStore(STORE_PARCELS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open the offline database.'));
  });
}

async function withStore<T>(storeName: string, mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const request = run(tx.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error(`IndexedDB operation on "${storeName}" failed.`));
  });
}

async function cacheParcel(parcel: AcquisitionParcel): Promise<void> {
  await withStore(STORE_PARCELS, 'readwrite', (store) => store.put(parcel));
}

async function getCachedParcel(id: string): Promise<AcquisitionParcel | undefined> {
  const result = await withStore<AcquisitionParcel | undefined>(STORE_PARCELS, 'readonly', (store) => store.get(id));
  return result ?? undefined;
}

async function getAllCachedParcels(): Promise<AcquisitionParcel[]> {
  return withStore<AcquisitionParcel[]>(STORE_PARCELS, 'readonly', (store) => store.getAll());
}

async function cacheProject(project: AcquisitionProject): Promise<void> {
  await withStore(STORE_PROJECTS, 'readwrite', (store) => store.put(project));
}

async function getCachedProject(id: string): Promise<AcquisitionProject | undefined> {
  const result = await withStore<AcquisitionProject | undefined>(STORE_PROJECTS, 'readonly', (store) => store.get(id));
  return result ?? undefined;
}

async function getAllCachedProjects(): Promise<AcquisitionProject[]> {
  return withStore<AcquisitionProject[]>(STORE_PROJECTS, 'readonly', (store) => store.getAll());
}

async function enqueue(action: Omit<PendingAction, 'id'>): Promise<void> {
  await withStore(STORE_QUEUE, 'readwrite', (store) => store.add(action));
  notifyQueueChanged();
}

async function removeFromQueue(id: number): Promise<void> {
  await withStore(STORE_QUEUE, 'readwrite', (store) => store.delete(id));
  notifyQueueChanged();
}

export async function getPendingActions(): Promise<PendingAction[]> {
  try {
    return await withStore<PendingAction[]>(STORE_QUEUE, 'readonly', (store) => store.getAll());
  } catch {
    return [];
  }
}

const queueListeners = new Set<() => void>();

function notifyQueueChanged(): void {
  queueListeners.forEach((listener) => listener());
}

export function subscribeOfflineQueue(listener: () => void): () => void {
  queueListeners.add(listener);
  return () => queueListeners.delete(listener);
}

// Optimistic mutations — same field logic as demoRepository.ts's mutators,
// applied to the cached parcel snapshot so the UI reflects a queued write
// immediately instead of only after a sync round-trip.
function applyAdvanceParcelStage(parcel: AcquisitionParcel, input: AdvanceStageInput): AcquisitionParcel {
  const history = parcel.history.map((entry) =>
    entry.stage === parcel.currentStage && !entry.exitedOn ? { ...entry, exitedOn: input.enteredOn } : entry,
  );
  history.push({
    id: `${input.parcelId}-history-${input.toStage}-offline-${Date.now()}`,
    parcelId: input.parcelId,
    stage: input.toStage,
    enteredOn: input.enteredOn,
    handledByRole: input.handledByRole,
    note: input.note,
  });
  return { ...parcel, currentStage: input.toStage, stageEnteredOn: input.enteredOn, history };
}

function applyAddDocument(parcel: AcquisitionParcel, input: AddDocumentInput): { parcel: AcquisitionParcel; document: ParcelDocument } {
  const document: ParcelDocument = { ...input, id: `offline-doc-${Date.now()}`, status: input.status ?? 'pending_verification' };
  return { parcel: { ...parcel, documents: [...parcel.documents, document] }, document };
}

function applyVerifyDocument(parcel: AcquisitionParcel, input: VerifyDocumentInput): { parcel: AcquisitionParcel; document: ParcelDocument } {
  let updated: ParcelDocument | undefined;
  const documents = parcel.documents.map((document) => {
    if (document.id !== input.documentId) {
      return document;
    }
    updated = {
      ...document,
      status: input.status,
      reviewedByRole: input.reviewedByRole,
      reviewedOn: input.reviewedOn,
      rejectionReason: input.status === 'rejected' ? input.rejectionReason : undefined,
    };
    return updated;
  });
  if (!updated) {
    throw new Error(`Unknown document id: ${input.documentId}`);
  }
  return { parcel: { ...parcel, documents }, document: updated };
}

function applyAddObjection(parcel: AcquisitionParcel, input: AddObjectionInput): { parcel: AcquisitionParcel; objection: ParcelObjection } {
  const objection: ParcelObjection = { ...input, id: `offline-obj-${Date.now()}`, status: input.status ?? 'pending', updatedOn: input.submittedOn };
  return { parcel: { ...parcel, objections: [...parcel.objections, objection] }, objection };
}

function applyUpdateObjectionStatus(
  parcel: AcquisitionParcel,
  input: UpdateObjectionStatusInput,
): { parcel: AcquisitionParcel; objection: ParcelObjection } {
  let updated: ParcelObjection | undefined;
  const objections = parcel.objections.map((objection) => {
    if (objection.id !== input.objectionId) {
      return objection;
    }
    updated = { ...objection, status: input.status, updatedOn: input.updatedOn };
    return updated;
  });
  if (!updated) {
    throw new Error(`Unknown objection id: ${input.objectionId}`);
  }
  return { parcel: { ...parcel, objections }, objection: updated };
}

async function findCachedParcelByDocumentId(documentId: string): Promise<AcquisitionParcel | undefined> {
  const all = await getAllCachedParcels();
  return all.find((parcel) => parcel.documents.some((document) => document.id === documentId));
}

async function findCachedParcelByObjectionId(objectionId: string): Promise<AcquisitionParcel | undefined> {
  const all = await getAllCachedParcels();
  return all.find((parcel) => parcel.objections.some((objection) => objection.id === objectionId));
}

let registeredBase: ParcelRepository | undefined;

export function createOfflineAwareRepository(base: ParcelRepository): ParcelRepository {
  registeredBase = base;

  return {
    async listParcels() {
      if (isOffline()) {
        const cached = await getAllCachedParcels();
        if (cached.length > 0) {
          return cached;
        }
      }
      try {
        const parcels = await base.listParcels();
        await Promise.all(parcels.map(cacheParcel));
        return parcels;
      } catch (error) {
        const cached = await getAllCachedParcels();
        if (cached.length > 0) {
          return cached;
        }
        throw error;
      }
    },

    async getParcelById(parcelId) {
      if (isOffline()) {
        const cached = await getCachedParcel(parcelId);
        if (cached) {
          return cached;
        }
      }
      try {
        const parcel = await base.getParcelById(parcelId);
        if (parcel) {
          await cacheParcel(parcel);
        }
        return parcel;
      } catch (error) {
        const cached = await getCachedParcel(parcelId);
        if (cached) {
          return cached;
        }
        throw error;
      }
    },

    async getParcelBySurveyNumber(surveyNumber) {
      if (isOffline()) {
        const cached = (await getAllCachedParcels()).find((parcel) => parcel.surveyNumber === surveyNumber);
        if (cached) {
          return cached;
        }
      }
      try {
        const parcel = await base.getParcelBySurveyNumber(surveyNumber);
        if (parcel) {
          await cacheParcel(parcel);
        }
        return parcel;
      } catch (error) {
        const cached = (await getAllCachedParcels()).find((parcel) => parcel.surveyNumber === surveyNumber);
        if (cached) {
          return cached;
        }
        throw error;
      }
    },

    async listProjects() {
      if (isOffline()) {
        const cached = await getAllCachedProjects();
        if (cached.length > 0) {
          return cached;
        }
      }
      try {
        const projects = await base.listProjects();
        await Promise.all(projects.map(cacheProject));
        return projects;
      } catch (error) {
        const cached = await getAllCachedProjects();
        if (cached.length > 0) {
          return cached;
        }
        throw error;
      }
    },

    async getProjectById(projectId) {
      if (isOffline()) {
        const cached = await getCachedProject(projectId);
        if (cached) {
          return cached;
        }
      }
      try {
        const project = await base.getProjectById(projectId);
        if (project) {
          await cacheProject(project);
        }
        return project;
      } catch (error) {
        const cached = await getCachedProject(projectId);
        if (cached) {
          return cached;
        }
        throw error;
      }
    },

    async advanceParcelStage(input) {
      if (isOffline()) {
        const parcel = await getCachedParcel(input.parcelId);
        if (!parcel) {
          throw new Error('This parcel has not been loaded yet, so it cannot be advanced offline.');
        }
        const updated = applyAdvanceParcelStage(parcel, input);
        await cacheParcel(updated);
        await enqueue({ kind: 'advanceParcelStage', parcelId: input.parcelId, input, createdAt: new Date().toISOString() });
        return updated;
      }
      const result = await base.advanceParcelStage(input);
      await cacheParcel(result);
      return result;
    },

    async addDocument(input) {
      if (isOffline()) {
        const parcel = await getCachedParcel(input.parcelId);
        if (!parcel) {
          throw new Error('This parcel has not been loaded yet, so a document cannot be added offline.');
        }
        const { parcel: updated, document } = applyAddDocument(parcel, input);
        await cacheParcel(updated);
        await enqueue({ kind: 'addDocument', parcelId: input.parcelId, input, createdAt: new Date().toISOString() });
        return document;
      }
      const result = await base.addDocument(input);
      const refreshed = await base.getParcelById(input.parcelId);
      if (refreshed) {
        await cacheParcel(refreshed);
      }
      return result;
    },

    async verifyDocument(input) {
      if (isOffline()) {
        const parcel = await findCachedParcelByDocumentId(input.documentId);
        if (!parcel) {
          throw new Error('This document has not been loaded yet, so it cannot be verified offline.');
        }
        const { parcel: updated, document } = applyVerifyDocument(parcel, input);
        await cacheParcel(updated);
        await enqueue({ kind: 'verifyDocument', parcelId: parcel.id, input, createdAt: new Date().toISOString() });
        return document;
      }
      const result = await base.verifyDocument(input);
      const parcelId = (await findCachedParcelByDocumentId(input.documentId))?.id;
      if (parcelId) {
        const refreshed = await base.getParcelById(parcelId);
        if (refreshed) {
          await cacheParcel(refreshed);
        }
      }
      return result;
    },

    async addObjection(input) {
      if (isOffline()) {
        const parcel = await getCachedParcel(input.parcelId);
        if (!parcel) {
          throw new Error('This parcel has not been loaded yet, so an objection cannot be filed offline.');
        }
        const { parcel: updated, objection } = applyAddObjection(parcel, input);
        await cacheParcel(updated);
        await enqueue({ kind: 'addObjection', parcelId: input.parcelId, input, createdAt: new Date().toISOString() });
        return objection;
      }
      const result = await base.addObjection(input);
      const refreshed = await base.getParcelById(input.parcelId);
      if (refreshed) {
        await cacheParcel(refreshed);
      }
      return result;
    },

    async updateObjectionStatus(input) {
      if (isOffline()) {
        const parcel = await findCachedParcelByObjectionId(input.objectionId);
        if (!parcel) {
          throw new Error('This objection has not been loaded yet, so its status cannot be updated offline.');
        }
        const { parcel: updated, objection } = applyUpdateObjectionStatus(parcel, input);
        await cacheParcel(updated);
        await enqueue({ kind: 'updateObjectionStatus', parcelId: parcel.id, input, createdAt: new Date().toISOString() });
        return objection;
      }
      const result = await base.updateObjectionStatus(input);
      const parcelId = (await findCachedParcelByObjectionId(input.objectionId))?.id;
      if (parcelId) {
        const refreshed = await base.getParcelById(parcelId);
        if (refreshed) {
          await cacheParcel(refreshed);
        }
      }
      return result;
    },

    // Step 59: bulk import is deliberately NOT queued for offline replay like
    // the single-record mutations above — a 50-row (or 50,000-row) batch
    // insert is not a shape that makes sense to optimistically apply to a
    // local cache and replay later; it needs the real backend's constraints
    // (Step 50's unique survey-number-per-project, FK checks) enforced at
    // commit time, not deferred. Disclosed rather than silently degraded.
    async importParcels(inputs) {
      if (isOffline()) {
        throw new Error('Bulk import requires connectivity — it is not queued for offline sync like single-record edits.');
      }
      const result = await base.importParcels(inputs);
      await Promise.all(result.parcels.map((parcel) => cacheParcel(parcel)));
      return result;
    },
  };
}

// Replays queued actions against the real backend, in the order they were
// made. Stops at the first failure (still offline, or a genuine error) so a
// later action never gets applied before an earlier one on retry.
export async function drainOfflineQueue(): Promise<void> {
  if (!registeredBase) {
    return;
  }
  const base = registeredBase;
  const actions = await getPendingActions();

  for (const action of actions) {
    try {
      switch (action.kind) {
        case 'advanceParcelStage':
          await base.advanceParcelStage(action.input as AdvanceStageInput);
          break;
        case 'addDocument':
          await base.addDocument(action.input as AddDocumentInput);
          break;
        case 'verifyDocument':
          await base.verifyDocument(action.input as VerifyDocumentInput);
          break;
        case 'addObjection':
          await base.addObjection(action.input as AddObjectionInput);
          break;
        case 'updateObjectionStatus':
          await base.updateObjectionStatus(action.input as UpdateObjectionStatusInput);
          break;
      }
      const refreshed = await base.getParcelById(action.parcelId);
      if (refreshed) {
        await cacheParcel(refreshed);
      }
      await removeFromQueue(action.id);
    } catch {
      break;
    }
  }
}
