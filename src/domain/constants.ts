export const DEMO_REFERENCE_DATE = '2026-08-27' as const;

export const USER_ROLES = ['official', 'landowner'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const OFFICIAL_ROLES = [
  'district_collector',
  'land_acquisition_officer',
  'survey_officer',
  'valuation_officer',
  'compensation_officer',
] as const;
export type OfficialRole = (typeof OFFICIAL_ROLES)[number];

// Prototype-only stakeholder view picker (Step 17). This is NOT real access
// control — it just biases which page a viewer lands on and labels the
// current view. Nothing in the repository/data layer is scoped by this role.
export const STAKEHOLDER_ROLES = [
  'central_state_viewer',
  'district_officer',
  'project_agency',
  'landowner',
] as const;
export type StakeholderRole = (typeof STAKEHOLDER_ROLES)[number];

export const STAKEHOLDER_ROLE_LABELS: Record<StakeholderRole, string> = {
  central_state_viewer: 'Central / State Viewer',
  district_officer: 'District Officer',
  project_agency: 'Project Implementing Agency',
  landowner: 'Landowner',
};

export const OBJECTION_STATUSES = ['pending', 'under_review', 'resolved'] as const;
export type ObjectionStatus = (typeof OBJECTION_STATUSES)[number];

export const OBJECTION_STATUS_LABELS: Record<ObjectionStatus, string> = {
  pending: 'Pending',
  under_review: 'Under Review',
  resolved: 'Resolved',
};

export const OBJECTION_REASONS = [
  { id: 'ownership', label: 'Ownership dispute' },
  { id: 'measurement', label: 'Measurement error' },
  { id: 'valuation', label: 'Valuation objection' },
  { id: 'compensation', label: 'Compensation dispute' },
  { id: 'other', label: 'Other' },
] as const;
export type ObjectionReason = (typeof OBJECTION_REASONS)[number]['id'];

export const OBJECTION_REASON_LABELS: Record<ObjectionReason, string> = Object.fromEntries(
  OBJECTION_REASONS.map((objectionReason) => [objectionReason.id, objectionReason.label]),
) as Record<ObjectionReason, string>;

export const DOCUMENT_KINDS = [
  { id: 'section_11_notification', label: 'Section 11 notification' },
  { id: 'joint_survey_sketch', label: 'Joint survey sketch' },
  { id: 'ownership_record', label: 'Ownership record extract' },
  { id: 'objection_hearing_minutes', label: 'Objection hearing minutes' },
  { id: 'valuation_report', label: 'Valuation report' },
  { id: 'compensation_statement', label: 'Compensation approval statement' },
  { id: 'award_order', label: 'Award order' },
  { id: 'possession_memo', label: 'Possession handover memo' },
] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number]['id'];

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = Object.fromEntries(
  DOCUMENT_KINDS.map((documentKind) => [documentKind.id, documentKind.label]),
) as Record<DocumentKind, string>;

export const ACQUISITION_STAGES = [
  {
    id: 'notification',
    label: 'Notification',
    shortLabel: 'Notice',
    order: 1,
    thresholdDays: 30,
    requiredDocumentKinds: ['section_11_notification'],
  },
  {
    id: 'survey',
    label: 'Joint Survey',
    shortLabel: 'Survey',
    order: 2,
    thresholdDays: 21,
    requiredDocumentKinds: ['joint_survey_sketch', 'ownership_record'],
  },
  {
    id: 'objection_review',
    label: 'Objection Review',
    shortLabel: 'Objections',
    order: 3,
    thresholdDays: 30,
    requiredDocumentKinds: ['objection_hearing_minutes'],
  },
  {
    id: 'valuation',
    label: 'Valuation',
    shortLabel: 'Value',
    order: 4,
    thresholdDays: 21,
    requiredDocumentKinds: ['valuation_report'],
  },
  {
    id: 'compensation_approval',
    label: 'Compensation Approval',
    shortLabel: 'Approval',
    order: 5,
    thresholdDays: 21,
    requiredDocumentKinds: ['compensation_statement'],
  },
  {
    id: 'award',
    label: 'Award',
    shortLabel: 'Award',
    order: 6,
    thresholdDays: 21,
    requiredDocumentKinds: ['award_order'],
  },
  {
    id: 'possession',
    label: 'Possession Handover',
    shortLabel: 'Possession',
    order: 7,
    thresholdDays: 30,
    requiredDocumentKinds: ['possession_memo'],
  },
] as const satisfies readonly {
  id: string;
  label: string;
  shortLabel: string;
  order: number;
  thresholdDays: number;
  requiredDocumentKinds: readonly DocumentKind[];
}[];

export type StageId = (typeof ACQUISITION_STAGES)[number]['id'];

export type StageDefinition = {
  id: StageId;
  label: string;
  shortLabel: string;
  order: number;
  thresholdDays: number;
  requiredDocumentKinds: readonly DocumentKind[];
};

export const STAGE_BY_ID = ACQUISITION_STAGES.reduce(
  (stagesById, stage) => ({
    ...stagesById,
    [stage.id]: stage,
  }),
  {} as Record<StageId, StageDefinition>,
);

// Which official role is responsible for handling each stage, used both to
// seed demo history/documents and to record who advanced a stage.
export const STAGE_HANDLER_ROLE: Record<StageId, OfficialRole> = {
  notification: 'land_acquisition_officer',
  survey: 'survey_officer',
  objection_review: 'land_acquisition_officer',
  valuation: 'valuation_officer',
  compensation_approval: 'compensation_officer',
  award: 'district_collector',
  possession: 'district_collector',
};

export const OFFICIAL_ROLE_LABELS: Record<OfficialRole, string> = {
  district_collector: 'District Collector',
  land_acquisition_officer: 'Land Acquisition Officer',
  survey_officer: 'Survey Officer',
  valuation_officer: 'Valuation Officer',
  compensation_officer: 'Compensation Officer',
};

// Step 12+: national-dashboard project domain — sits above AcquisitionParcel,
// which now carries a projectId linking it to one of these.
export const PROJECT_SECTORS = [
  { id: 'national_highway', label: 'National Highway' },
  { id: 'railway', label: 'Railway' },
  { id: 'irrigation', label: 'Irrigation' },
  { id: 'industrial_corridor', label: 'Industrial Corridor' },
  { id: 'power_transmission', label: 'Power Transmission' },
  { id: 'urban_infrastructure', label: 'Urban Infrastructure' },
  { id: 'port', label: 'Port' },
  { id: 'mining', label: 'Mining' },
] as const;
export type ProjectSector = (typeof PROJECT_SECTORS)[number]['id'];

export const PROJECT_SECTOR_LABELS: Record<ProjectSector, string> = Object.fromEntries(
  PROJECT_SECTORS.map((sector) => [sector.id, sector.label]),
) as Record<ProjectSector, string>;

export const STATE_NAMES = [
  { id: 'maharashtra', label: 'Maharashtra' },
  { id: 'gujarat', label: 'Gujarat' },
  { id: 'madhya_pradesh', label: 'Madhya Pradesh' },
  { id: 'telangana', label: 'Telangana' },
  { id: 'odisha', label: 'Odisha' },
  { id: 'uttar_pradesh', label: 'Uttar Pradesh' },
  { id: 'rajasthan', label: 'Rajasthan' },
  { id: 'karnataka', label: 'Karnataka' },
  { id: 'tamil_nadu', label: 'Tamil Nadu' },
  { id: 'west_bengal', label: 'West Bengal' },
] as const;
export type StateName = (typeof STATE_NAMES)[number]['id'];

export const STATE_NAME_LABELS: Record<StateName, string> = Object.fromEntries(
  STATE_NAMES.map((state) => [state.id, state.label]),
) as Record<StateName, string>;

// Computed (not stored) per-project rollup status — populated by
// getProjectCalculatedStatus in a later step, mirroring DashboardStatus.
export const PROJECT_STATUSES = ['on_track', 'at_risk', 'delayed', 'complete'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  on_track: 'On Track',
  at_risk: 'At Risk',
  delayed: 'Delayed',
  complete: 'Complete',
};
