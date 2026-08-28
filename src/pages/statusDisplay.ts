import {
  PROJECT_STATUS_LABELS,
  type AdvanceGate,
  type DashboardStatus,
  type DocumentStatus,
  type ParcelCalculatedStatus,
  type ProjectStatus,
  type RiskLevel,
  type StageId,
} from '../domain';
import { documentKindLabels, uiText, type TranslationEntry } from '../i18n/translations';

export function getBadgeTone(status: DashboardStatus) {
  if (status === 'stuck') {
    return 'warning';
  }

  if (status === 'blocked') {
    return 'danger';
  }

  if (status === 'complete') {
    return 'success';
  }

  return 'info';
}

export function getStatusLabel(status: DashboardStatus) {
  switch (status) {
    case 'stuck':
      return 'Stuck';
    case 'blocked':
      return 'Blocked';
    case 'complete':
      return 'Complete';
    case 'ready_to_advance':
      return 'Ready to advance';
    default:
      return 'On track';
  }
}

export function getStatusIcon(status: DashboardStatus) {
  switch (status) {
    case 'stuck':
      return '⚠️';
    case 'blocked':
      return '⛔';
    case 'complete':
      return '✅';
    case 'ready_to_advance':
      return '➡️';
    default:
      return '🟢';
  }
}

export function getProjectStatusTone(status: ProjectStatus) {
  if (status === 'at_risk') {
    return 'warning';
  }

  if (status === 'delayed') {
    return 'danger';
  }

  if (status === 'complete') {
    return 'success';
  }

  return 'info';
}

export function getProjectStatusLabel(status: ProjectStatus) {
  return PROJECT_STATUS_LABELS[status];
}

export function getProjectStatusIcon(status: ProjectStatus) {
  switch (status) {
    case 'at_risk':
      return '⚠️';
    case 'delayed':
      return '⛔';
    case 'complete':
      return '✅';
    default:
      return '🟢';
  }
}

export function getDocumentStatusTone(status: DocumentStatus) {
  if (status === 'verified') {
    return 'success';
  }

  if (status === 'rejected') {
    return 'danger';
  }

  return 'warning';
}

// Reconstructs getAdvanceGate()'s English reason sentence (src/domain/rules.ts)
// from structured fields instead of displaying it directly, so official-side
// pages can show it bilingually — the same approach LandownerStatusPage.tsx's
// "actionRequired" text uses for the equivalent landowner-facing string.
export function getAdvanceGateReasonText(
  currentStage: StageId,
  calculatedStatus: ParcelCalculatedStatus,
  advanceGate: AdvanceGate,
  t: (entry: TranslationEntry) => string,
): string {
  if (advanceGate.toStage === undefined) {
    return t(uiText.parcelDetail.workflowCompleteDescription);
  }

  if (calculatedStatus.missingDocumentKinds.length > 0) {
    const missingDocuments = calculatedStatus.missingDocumentKinds.map((kind) => t(documentKindLabels[kind])).join(', ');
    return `${t(uiText.landownerStatus.actionRequiredMissingDocumentPrefix)} ${missingDocuments}.`;
  }

  if (currentStage === 'objection_review' && calculatedStatus.openObjectionCount > 0) {
    return t(uiText.landownerStatus.actionRequiredOpenObjections);
  }

  return t(uiText.parcelDetail.workflowCompleteDescription);
}

export function getRiskTone(level: RiskLevel) {
  if (level === 'critical') {
    return 'danger';
  }

  if (level === 'high') {
    return 'warning';
  }

  if (level === 'medium') {
    return 'info';
  }

  return 'success';
}
