import { supabase } from '../lib/supabaseClient';
import type {
  AcquisitionParcel,
  AcquisitionProject,
  DocumentCheckVerdict,
  DocumentKind,
  DocumentStatus,
  ISODateString,
  ObjectionStatus,
  OfficialRole,
  ParcelDocument,
  ParcelObjection,
  ProjectSector,
  StageHistoryEntry,
  StageId,
  StateName,
} from '../domain';
import type {
  AddDocumentInput,
  AddObjectionInput,
  AdvanceStageInput,
  ParcelRepository,
  UpdateObjectionStatusInput,
  VerifyDocumentInput,
} from './types';

// Row shapes mirror supabase/schema.sql exactly (snake_case columns).
type ParcelRow = {
  id: string;
  project_id: string;
  survey_number: string;
  owner_name: string;
  owner_phone: string;
  owner_preferred_language: 'en' | 'hi' | 'mr';
  village: string;
  tehsil: string;
  district: string;
  area_hectares: number;
  current_stage: StageId;
  stage_entered_on: string;
  compensation_estimate: number;
  compensation_paid: number;
  latitude: number;
  longitude: number;
  stage_history: StageHistoryRow[];
  documents: DocumentRow[];
  objections: ObjectionRow[];
};

type ProjectRow = {
  id: string;
  name: string;
  sector: ProjectSector;
  state: StateName;
  implementing_agency: string;
  sanctioned_on: string;
  target_completion_on: string;
  total_area_required_hectares: number;
  compensation_sanctioned: number;
  affected_families: number;
  displaced_families: number;
  families_resettled: number;
  rr_checklist_complete: boolean;
};

type StageHistoryRow = {
  id: string;
  parcel_id: string;
  stage: StageId;
  entered_on: string;
  exited_on: string | null;
  handled_by_role: OfficialRole;
  note: string;
};

type DocumentRow = {
  id: string;
  parcel_id: string;
  stage: StageId;
  kind: DocumentKind;
  title: string;
  uploaded_on: string;
  uploaded_by_role: OfficialRole;
  file_type: 'pdf' | 'image';
  url: string;
  status: DocumentStatus;
  rejection_reason: string | null;
  reviewed_by_role: OfficialRole | null;
  reviewed_on: string | null;
  quality_check_verdict: DocumentCheckVerdict | null;
};

type ObjectionRow = {
  id: string;
  parcel_id: string;
  submitted_on: string;
  submitted_by: string;
  reason: ParcelObjection['reason'];
  description: string;
  status: ObjectionStatus;
  updated_on: string;
  assigned_to_role: OfficialRole;
};

const PARCEL_SELECT = '*, stage_history(*), documents(*), objections(*)';

function requireClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  return supabase;
}

function mapHistoryRow(row: StageHistoryRow): StageHistoryEntry {
  return {
    id: row.id,
    parcelId: row.parcel_id,
    stage: row.stage,
    enteredOn: row.entered_on as ISODateString,
    exitedOn: row.exited_on ? (row.exited_on as ISODateString) : undefined,
    handledByRole: row.handled_by_role,
    note: row.note,
  };
}

function mapDocumentRow(row: DocumentRow): ParcelDocument {
  return {
    id: row.id,
    parcelId: row.parcel_id,
    stage: row.stage,
    kind: row.kind,
    title: row.title,
    uploadedOn: row.uploaded_on as ISODateString,
    uploadedByRole: row.uploaded_by_role,
    fileType: row.file_type,
    url: row.url,
    status: row.status,
    rejectionReason: row.rejection_reason ?? undefined,
    reviewedByRole: row.reviewed_by_role ?? undefined,
    reviewedOn: row.reviewed_on ? (row.reviewed_on as ISODateString) : undefined,
    qualityCheckVerdict: row.quality_check_verdict ?? undefined,
  };
}

function mapObjectionRow(row: ObjectionRow): ParcelObjection {
  return {
    id: row.id,
    parcelId: row.parcel_id,
    submittedOn: row.submitted_on as ISODateString,
    submittedBy: row.submitted_by,
    reason: row.reason,
    description: row.description,
    status: row.status,
    updatedOn: row.updated_on as ISODateString,
    assignedToRole: row.assigned_to_role,
  };
}

function mapParcelRow(row: ParcelRow): AcquisitionParcel {
  return {
    id: row.id,
    projectId: row.project_id,
    surveyNumber: row.survey_number,
    owner: {
      name: row.owner_name,
      phone: row.owner_phone,
      preferredLanguage: row.owner_preferred_language,
    },
    village: row.village,
    tehsil: row.tehsil,
    district: row.district,
    areaHectares: row.area_hectares,
    currentStage: row.current_stage,
    stageEnteredOn: row.stage_entered_on as ISODateString,
    compensationEstimate: row.compensation_estimate,
    compensationPaid: row.compensation_paid,
    coordinates: { lat: row.latitude, lng: row.longitude },
    history: row.stage_history.map(mapHistoryRow),
    documents: row.documents.map(mapDocumentRow),
    objections: row.objections.map(mapObjectionRow),
  };
}

function mapProjectRow(row: ProjectRow): AcquisitionProject {
  return {
    id: row.id,
    name: row.name,
    sector: row.sector,
    state: row.state,
    implementingAgency: row.implementing_agency,
    sanctionedOn: row.sanctioned_on as ISODateString,
    targetCompletionOn: row.target_completion_on as ISODateString,
    totalAreaRequiredHectares: row.total_area_required_hectares,
    compensationSanctioned: row.compensation_sanctioned,
    rAndR: {
      affectedFamilies: row.affected_families,
      displacedFamilies: row.displaced_families,
      familiesResettled: row.families_resettled,
      rrChecklistComplete: row.rr_checklist_complete,
    },
  };
}

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

async function fetchParcel(matcher: { column: 'id' | 'survey_number'; value: string }) {
  const client = requireClient();
  const { data, error } = await client
    .from('parcels')
    .select(PARCEL_SELECT)
    .eq(matcher.column, matcher.value)
    .maybeSingle<ParcelRow>();

  if (error) {
    throw error;
  }

  return data ? mapParcelRow(data) : undefined;
}

export const supabaseRepository: ParcelRepository = {
  async listParcels() {
    const client = requireClient();
    const { data, error } = await client.from('parcels').select(PARCEL_SELECT).returns<ParcelRow[]>();

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapParcelRow);
  },

  async getParcelById(parcelId) {
    return fetchParcel({ column: 'id', value: parcelId });
  },

  async getParcelBySurveyNumber(surveyNumber) {
    return fetchParcel({ column: 'survey_number', value: surveyNumber });
  },

  async advanceParcelStage({ parcelId, toStage, handledByRole, note, enteredOn }: AdvanceStageInput) {
    const client = requireClient();

    // Not run inside a database transaction: supabase-js issues plain REST
    // calls, and this prototype has no RPC/edge function defined. Acceptable
    // for a single-operator demo; a production version should wrap this in
    // a Postgres function called via `client.rpc(...)`.
    const { error: closeHistoryError } = await client
      .from('stage_history')
      .update({ exited_on: enteredOn })
      .eq('parcel_id', parcelId)
      .is('exited_on', null);

    if (closeHistoryError) {
      throw closeHistoryError;
    }

    const { error: insertHistoryError } = await client.from('stage_history').insert({
      id: `${parcelId}-history-${toStage}`,
      parcel_id: parcelId,
      stage: toStage,
      entered_on: enteredOn,
      handled_by_role: handledByRole,
      note,
    });

    if (insertHistoryError) {
      throw insertHistoryError;
    }

    const { error: updateParcelError } = await client
      .from('parcels')
      .update({ current_stage: toStage, stage_entered_on: enteredOn, updated_at: new Date().toISOString() })
      .eq('id', parcelId);

    if (updateParcelError) {
      throw updateParcelError;
    }

    const parcel = await fetchParcel({ column: 'id', value: parcelId });
    if (!parcel) {
      throw new Error(`Parcel ${parcelId} not found after advancing stage.`);
    }
    return parcel;
  },

  async addDocument(input: AddDocumentInput) {
    const client = requireClient();
    const row: DocumentRow = {
      id: newId('document'),
      parcel_id: input.parcelId,
      stage: input.stage,
      kind: input.kind,
      title: input.title,
      uploaded_on: input.uploadedOn,
      uploaded_by_role: input.uploadedByRole,
      file_type: input.fileType,
      url: input.url,
      status: input.status ?? 'pending_verification',
      rejection_reason: null,
      reviewed_by_role: null,
      reviewed_on: null,
      quality_check_verdict: input.qualityCheckVerdict ?? null,
    };

    const { error } = await client.from('documents').insert(row);
    if (error) {
      throw error;
    }

    return mapDocumentRow(row);
  },

  async verifyDocument({ documentId, status, reviewedByRole, reviewedOn, rejectionReason }: VerifyDocumentInput) {
    const client = requireClient();
    const { data, error } = await client
      .from('documents')
      .update({
        status,
        reviewed_by_role: reviewedByRole,
        reviewed_on: reviewedOn,
        rejection_reason: status === 'rejected' ? rejectionReason ?? null : null,
      })
      .eq('id', documentId)
      .select()
      .single<DocumentRow>();

    if (error) {
      throw error;
    }

    return mapDocumentRow(data);
  },

  async addObjection(input: AddObjectionInput) {
    const client = requireClient();
    const status = input.status ?? 'pending';
    const row: ObjectionRow = {
      id: newId('objection'),
      parcel_id: input.parcelId,
      submitted_on: input.submittedOn,
      submitted_by: input.submittedBy,
      reason: input.reason,
      description: input.description,
      status,
      updated_on: input.submittedOn,
      assigned_to_role: input.assignedToRole,
    };

    const { error } = await client.from('objections').insert(row);
    if (error) {
      throw error;
    }

    return mapObjectionRow(row);
  },

  async updateObjectionStatus({ objectionId, status, updatedOn }: UpdateObjectionStatusInput) {
    const client = requireClient();
    const { data, error } = await client
      .from('objections')
      .update({ status, updated_on: updatedOn })
      .eq('id', objectionId)
      .select()
      .single<ObjectionRow>();

    if (error) {
      throw error;
    }

    return mapObjectionRow(data);
  },

  async listProjects() {
    const client = requireClient();
    const { data, error } = await client.from('projects').select('*').returns<ProjectRow[]>();

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapProjectRow);
  },

  async getProjectById(projectId) {
    const client = requireClient();
    const { data, error } = await client
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .maybeSingle<ProjectRow>();

    if (error) {
      throw error;
    }

    return data ? mapProjectRow(data) : undefined;
  },
};
