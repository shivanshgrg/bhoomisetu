import type {
  DocumentKind,
  DocumentStatus,
  ObjectionReason,
  ObjectionStatus,
  OfficialRole,
  ProjectSector,
  ProjectStatus,
  RiskLevel,
  StageId,
  StateName,
  UserRole,
} from './constants';
import type { DocumentCheckVerdict } from './documentCheck';

export type ISODateString = `${number}-${number}-${number}`;

export type GeoPoint = {
  lat: number;
  lng: number;
};

export type ParcelOwner = {
  name: string;
  phone: string;
  preferredLanguage: 'en' | 'hi' | 'mr';
};

export type StageHistoryEntry = {
  id: string;
  parcelId: string;
  stage: StageId;
  enteredOn: ISODateString;
  exitedOn?: ISODateString;
  handledByRole: OfficialRole;
  note: string;
};

export type ParcelDocument = {
  id: string;
  parcelId: string;
  stage: StageId;
  kind: DocumentKind;
  title: string;
  uploadedOn: ISODateString;
  uploadedByRole: OfficialRole;
  fileType: 'pdf' | 'image';
  url: string;
  status: DocumentStatus;
  rejectionReason?: string;
  reviewedByRole?: OfficialRole;
  reviewedOn?: ISODateString;
  qualityCheckVerdict?: DocumentCheckVerdict;
};

export type ParcelObjection = {
  id: string;
  parcelId: string;
  submittedOn: ISODateString;
  submittedBy: string;
  reason: ObjectionReason;
  description: string;
  status: ObjectionStatus;
  updatedOn: ISODateString;
  assignedToRole: OfficialRole;
};

export type AcquisitionParcel = {
  id: string;
  projectId: string;
  surveyNumber: string;
  owner: ParcelOwner;
  village: string;
  tehsil: string;
  district: string;
  areaHectares: number;
  currentStage: StageId;
  stageEnteredOn: ISODateString;
  compensationEstimate: number;
  compensationPaid: number;
  coordinates: GeoPoint;
  history: StageHistoryEntry[];
  documents: ParcelDocument[];
  objections: ParcelObjection[];
};

export type RAndRStatus = {
  affectedFamilies: number;
  displacedFamilies: number;
  familiesResettled: number;
  rrChecklistComplete: boolean;
};

export type AcquisitionProject = {
  id: string;
  name: string;
  sector: ProjectSector;
  state: StateName;
  implementingAgency: string;
  sanctionedOn: ISODateString;
  targetCompletionOn: ISODateString;
  totalAreaRequiredHectares: number;
  compensationSanctioned: number;
  rAndR: RAndRStatus;
};

export type DashboardStatus =
  | 'on_track'
  | 'stuck'
  | 'blocked'
  | 'ready_to_advance'
  | 'complete';

export type ParcelCalculatedStatus = {
  parcelId: string;
  stage: StageId;
  daysInStage: number;
  thresholdDays: number;
  isStuck: boolean;
  status: DashboardStatus;
  missingDocumentKinds: DocumentKind[];
  openObjectionCount: number;
};

export type AdvanceGate =
  | {
      canAdvance: true;
      fromStage: StageId;
      toStage: StageId;
      reasons: [];
    }
  | {
      canAdvance: false;
      fromStage: StageId;
      toStage?: StageId;
      reasons: string[];
    };

export type DashboardSummary = {
  total: number;
  stuck: number;
  readyToAdvance: number;
  blocked: number;
  complete: number;
  missingDocuments: number;
  openObjections: number;
  byStage: Record<StageId, number>;
};

export type ProjectCalculatedStatus = {
  projectId: string;
  status: ProjectStatus;
  parcelCount: number;
  parcelsAtPossession: number;
  areaNotifiedHectares: number;
  areaAcquiredHectares: number;
  areaAcquiredPercent: number;
  compensationAssessed: number;
  compensationPaid: number;
  compensationPaidPercent: number;
  possessionPercent: number;
  daysToTarget: number;
};

export type AlertType = 'stuck' | 'missing_document' | 'open_objection';
export type AlertSeverity = 'high' | 'medium';

export type Alert = {
  id: string;
  parcelId: string;
  surveyNumber: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
};

export type NationalSummary = {
  totalProjects: number;
  totalStates: number;
  areaNotifiedHectares: number;
  areaAcquiredHectares: number;
  compensationAssessed: number;
  compensationPaid: number;
  onTrackCount: number;
  atRiskCount: number;
  delayedCount: number;
  completeCount: number;
  projectStatuses: ProjectCalculatedStatus[];
};

export type RiskContributor = {
  label: string;
  points: number;
};

export type ParcelRiskAssessment = {
  parcelId: string;
  score: number;
  level: RiskLevel;
  contributors: RiskContributor[];
  recommendedAction: string;
  responsibleRole: OfficialRole;
};

export type ActionCenterEntry = {
  parcel: AcquisitionParcel;
  project: AcquisitionProject;
  riskAssessment: ParcelRiskAssessment;
};

export type AuthenticatedUser = {
  id: string;
  name: string;
  role: UserRole;
  officialRole?: OfficialRole;
};
