import {
  DEMO_REFERENCE_DATE,
  DOCUMENT_KIND_LABELS,
  OFFICIAL_ROLE_LABELS,
  STAGE_HANDLER_ROLE,
  type RiskLevel,
} from './constants';
import {
  daysBetween,
  getDaysInCurrentStage,
  getMissingRequiredDocuments,
  getOpenObjections,
  getStageDefinition,
  isParcelStuck,
  parseISODate,
} from './rules';
import type {
  AcquisitionParcel,
  AcquisitionProject,
  ActionCenterEntry,
  ISODateString,
  ParcelRiskAssessment,
  RiskContributor,
} from './types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function getStageDelayScore(daysInStage: number, thresholdDays: number, isStuck: boolean): number {
  if (isStuck) {
    return Math.min(40, 20 + Math.round((daysInStage - thresholdDays) * 1.5));
  }
  return Math.round((daysInStage / thresholdDays) * 15);
}

function getMissingDocumentsScore(missingDocumentCount: number): number {
  return Math.min(30, missingDocumentCount * 15);
}

function getOpenObjectionsScore(openObjectionCount: number, isObjectionReviewStage: boolean): number {
  const perObjectionPoints = isObjectionReviewStage ? 20 : 10;
  return Math.min(20, openObjectionCount * perObjectionPoints);
}

// Signed days until the project's target completion date (negative = already
// overdue) — unlike rules.ts's daysBetween, this must not clamp at zero.
function getDaysToTarget(project: AcquisitionProject, asOfDate: ISODateString): number {
  return Math.round((parseISODate(project.targetCompletionOn) - parseISODate(asOfDate)) / MS_PER_DAY);
}

function getDeadlineScore(daysToTarget: number): number {
  return Math.max(0, Math.min(10, Math.round(10 - daysToTarget / 18)));
}

function getRiskLevel(score: number): RiskLevel {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

function buildRecommendedAction(
  parcel: AcquisitionParcel,
  responsibleRoleLabel: string,
  missingDocumentKindLabels: string[],
  isStuck: boolean,
  daysInStage: number,
  thresholdDays: number,
  openObjectionCount: number,
  daysToTarget: number,
): string {
  const stageLabel = getStageDefinition(parcel.currentStage).label;

  if (missingDocumentKindLabels.length > 0) {
    return `${responsibleRoleLabel} should verify the missing ${missingDocumentKindLabels.join(', ')} document(s) to unblock this parcel.`;
  }
  if (isStuck) {
    return `${responsibleRoleLabel} should escalate — parcel has been in ${stageLabel} for ${daysInStage} days, past the ${thresholdDays}-day threshold.`;
  }
  if (openObjectionCount > 0 && parcel.currentStage === 'objection_review') {
    return `${responsibleRoleLabel} should resolve the ${openObjectionCount} open objection(s) blocking Objection Review.`;
  }
  if (openObjectionCount > 0) {
    return `${responsibleRoleLabel} should monitor ${openObjectionCount} open objection(s) on this parcel.`;
  }
  if (daysToTarget < 30) {
    return `${responsibleRoleLabel} should prioritize this parcel — project deadline is ${
      daysToTarget < 0 ? 'already overdue' : `in ${daysToTarget} days`
    }.`;
  }
  return 'On track — no action needed.';
}

export function getParcelRiskAssessment(
  parcel: AcquisitionParcel,
  project: AcquisitionProject,
  asOfDate: ISODateString = DEMO_REFERENCE_DATE,
): ParcelRiskAssessment {
  const stage = getStageDefinition(parcel.currentStage);
  const daysInStage = getDaysInCurrentStage(parcel, asOfDate);
  const isStuck = isParcelStuck(parcel, asOfDate);
  const missingDocumentKinds = getMissingRequiredDocuments(parcel);
  const openObjectionCount = getOpenObjections(parcel).length;
  const daysToTarget = getDaysToTarget(project, asOfDate);
  const responsibleRole = STAGE_HANDLER_ROLE[parcel.currentStage];

  const stageDelayScore = getStageDelayScore(daysInStage, stage.thresholdDays, isStuck);
  const missingDocumentsScore = getMissingDocumentsScore(missingDocumentKinds.length);
  const objectionsScore = getOpenObjectionsScore(openObjectionCount, parcel.currentStage === 'objection_review');
  const deadlineScore = getDeadlineScore(daysToTarget);

  const score = Math.max(
    0,
    Math.min(100, stageDelayScore + missingDocumentsScore + objectionsScore + deadlineScore),
  );

  const contributors: RiskContributor[] = [
    { label: 'Stage delay', points: stageDelayScore },
    { label: 'Missing documents', points: missingDocumentsScore },
    { label: 'Open objections', points: objectionsScore },
    { label: 'Deadline proximity', points: deadlineScore },
  ];

  const missingDocumentKindLabels = missingDocumentKinds.map((kind) => DOCUMENT_KIND_LABELS[kind]);

  return {
    parcelId: parcel.id,
    score,
    level: getRiskLevel(score),
    contributors,
    recommendedAction: buildRecommendedAction(
      parcel,
      OFFICIAL_ROLE_LABELS[responsibleRole],
      missingDocumentKindLabels,
      isStuck,
      daysInStage,
      stage.thresholdDays,
      openObjectionCount,
      daysToTarget,
    ),
    responsibleRole,
  };
}

export function getActionCenterQueue(
  parcels: AcquisitionParcel[],
  projects: AcquisitionProject[],
  asOfDate: ISODateString = DEMO_REFERENCE_DATE,
): ActionCenterEntry[] {
  const projectById = new Map(projects.map((project) => [project.id, project]));

  return parcels
    .map((parcel): ActionCenterEntry | undefined => {
      const project = projectById.get(parcel.projectId);
      if (!project) {
        return undefined;
      }
      return { parcel, project, riskAssessment: getParcelRiskAssessment(parcel, project, asOfDate) };
    })
    .filter((entry): entry is ActionCenterEntry => entry !== undefined)
    .sort((first, second) => second.riskAssessment.score - first.riskAssessment.score);
}
