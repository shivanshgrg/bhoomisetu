import {
  ACQUISITION_STAGES,
  DEMO_REFERENCE_DATE,
  DOCUMENT_KIND_LABELS,
  STAGE_BY_ID,
  type DocumentKind,
  type StageDefinition,
  type StageId,
} from './constants';
import type {
  AcquisitionParcel,
  AcquisitionProject,
  AdvanceGate,
  Alert,
  DashboardStatus,
  DashboardSummary,
  ISODateString,
  NationalSummary,
  ParcelCalculatedStatus,
  ParcelDocument,
  ParcelObjection,
  ProjectCalculatedStatus,
  StageDurationStat,
} from './types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function parseISODate(date: ISODateString | string) {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

export function addDays(date: ISODateString, days: number): ISODateString {
  const nextDate = new Date(parseISODate(date) + days * MS_PER_DAY);
  return nextDate.toISOString().slice(0, 10) as ISODateString;
}

export function daysBetween(startDate: ISODateString, endDate: ISODateString) {
  return Math.max(0, Math.floor((parseISODate(endDate) - parseISODate(startDate)) / MS_PER_DAY));
}

export function getStageDefinition(stageId: StageId): StageDefinition {
  return STAGE_BY_ID[stageId];
}

export function getNextStage(stageId: StageId): StageDefinition | undefined {
  const currentOrder = getStageDefinition(stageId).order;
  return ACQUISITION_STAGES.find((stage) => stage.order === currentOrder + 1);
}

export function getRequiredDocumentKinds(stageId: StageId): readonly DocumentKind[] {
  return getStageDefinition(stageId).requiredDocumentKinds;
}

export function getDocumentsForStage(
  parcel: AcquisitionParcel,
  stageId: StageId = parcel.currentStage,
): ParcelDocument[] {
  return parcel.documents.filter((document) => document.stage === stageId);
}

export function getMissingRequiredDocuments(
  parcel: AcquisitionParcel,
  stageId: StageId = parcel.currentStage,
): DocumentKind[] {
  const verifiedKinds = new Set(
    getDocumentsForStage(parcel, stageId)
      .filter((document) => document.status === 'verified')
      .map((document) => document.kind),
  );

  return getRequiredDocumentKinds(stageId).filter((documentKind) => !verifiedKinds.has(documentKind));
}

export function getOpenObjections(parcel: AcquisitionParcel): ParcelObjection[] {
  return parcel.objections.filter((objection) => objection.status !== 'resolved');
}

export function getDaysInCurrentStage(
  parcel: AcquisitionParcel,
  asOfDate: ISODateString = DEMO_REFERENCE_DATE,
) {
  return daysBetween(parcel.stageEnteredOn, asOfDate);
}

export function isParcelStuck(
  parcel: AcquisitionParcel,
  asOfDate: ISODateString = DEMO_REFERENCE_DATE,
) {
  return getDaysInCurrentStage(parcel, asOfDate) > getStageDefinition(parcel.currentStage).thresholdDays;
}

export function getAdvanceGate(parcel: AcquisitionParcel): AdvanceGate {
  const nextStage = getNextStage(parcel.currentStage);
  const missingDocumentKinds = getMissingRequiredDocuments(parcel);
  const openObjections = getOpenObjections(parcel);
  const reasons: string[] = [];

  if (!nextStage) {
    reasons.push('Parcel is already in the final workflow stage.');
  }

  if (missingDocumentKinds.length > 0) {
    const missingDocuments = missingDocumentKinds
      .map((documentKind) => DOCUMENT_KIND_LABELS[documentKind])
      .join(', ');
    reasons.push(`Missing required document: ${missingDocuments}.`);
  }

  if (parcel.currentStage === 'objection_review' && openObjections.length > 0) {
    reasons.push('Pending or under-review objections must be resolved before advancing.');
  }

  if (reasons.length > 0 || !nextStage) {
    return {
      canAdvance: false,
      fromStage: parcel.currentStage,
      toStage: nextStage?.id,
      reasons,
    };
  }

  return {
    canAdvance: true,
    fromStage: parcel.currentStage,
    toStage: nextStage.id,
    reasons: [],
  };
}

export function getParcelCalculatedStatus(
  parcel: AcquisitionParcel,
  asOfDate: ISODateString = DEMO_REFERENCE_DATE,
): ParcelCalculatedStatus {
  const stage = getStageDefinition(parcel.currentStage);
  const missingDocumentKinds = getMissingRequiredDocuments(parcel);
  const openObjectionCount = getOpenObjections(parcel).length;
  const advanceGate = getAdvanceGate(parcel);
  const isStuck = isParcelStuck(parcel, asOfDate);
  let status: DashboardStatus = 'on_track';

  if (!getNextStage(parcel.currentStage) && missingDocumentKinds.length === 0) {
    status = 'complete';
  } else if (isStuck) {
    status = 'stuck';
  } else if (!advanceGate.canAdvance) {
    status = 'blocked';
  } else {
    status = 'ready_to_advance';
  }

  return {
    parcelId: parcel.id,
    stage: parcel.currentStage,
    daysInStage: getDaysInCurrentStage(parcel, asOfDate),
    thresholdDays: stage.thresholdDays,
    isStuck,
    status,
    missingDocumentKinds,
    openObjectionCount,
  };
}

export function getDashboardSummary(
  parcels: AcquisitionParcel[],
  asOfDate: ISODateString = DEMO_REFERENCE_DATE,
): DashboardSummary {
  const byStage = Object.fromEntries(
    ACQUISITION_STAGES.map((stage) => [stage.id, 0]),
  ) as Record<StageId, number>;

  return parcels.reduce<DashboardSummary>(
    (summary, parcel) => {
      const calculatedStatus = getParcelCalculatedStatus(parcel, asOfDate);

      summary.byStage[parcel.currentStage] += 1;
      summary.stuck += calculatedStatus.status === 'stuck' ? 1 : 0;
      summary.readyToAdvance += calculatedStatus.status === 'ready_to_advance' ? 1 : 0;
      summary.blocked += calculatedStatus.status === 'blocked' ? 1 : 0;
      summary.complete += calculatedStatus.status === 'complete' ? 1 : 0;
      summary.missingDocuments += calculatedStatus.missingDocumentKinds.length;
      summary.openObjections += calculatedStatus.openObjectionCount;

      return summary;
    },
    {
      total: parcels.length,
      stuck: 0,
      readyToAdvance: 0,
      blocked: 0,
      complete: 0,
      missingDocuments: 0,
      openObjections: 0,
      byStage,
    },
  );
}

// Progress toward physical possession is used as the proxy for both "area
// acquired" and overall completion — a parcel only reaches the final
// `possession` stage once notification, survey, valuation, and compensation
// award are all behind it, so it's the one stage that means "done" for the
// national-level rollup.
export function getProjectCalculatedStatus(
  project: AcquisitionProject,
  parcels: AcquisitionParcel[],
  asOfDate: ISODateString = DEMO_REFERENCE_DATE,
): ProjectCalculatedStatus {
  const projectParcels = parcels.filter((parcel) => parcel.projectId === project.id);
  const parcelCount = projectParcels.length;
  const parcelsAtPossession = projectParcels.filter((parcel) => parcel.currentStage === 'possession').length;

  const areaNotifiedHectares = Number(
    projectParcels.reduce((sum, parcel) => sum + parcel.areaHectares, 0).toFixed(2),
  );
  const areaAcquiredHectares = Number(
    projectParcels
      .filter((parcel) => parcel.currentStage === 'possession')
      .reduce((sum, parcel) => sum + parcel.areaHectares, 0)
      .toFixed(2),
  );
  const compensationAssessed = projectParcels.reduce((sum, parcel) => sum + parcel.compensationEstimate, 0);
  const compensationPaid = projectParcels.reduce((sum, parcel) => sum + parcel.compensationPaid, 0);

  const totalStages = ACQUISITION_STAGES.length;
  const progressFraction =
    parcelCount === 0
      ? 0
      : projectParcels.reduce((sum, parcel) => sum + getStageDefinition(parcel.currentStage).order, 0) /
        (parcelCount * totalStages);

  const totalTimelineDays = Math.max(1, daysBetween(project.sanctionedOn, project.targetCompletionOn));
  const elapsedDays = daysBetween(project.sanctionedOn, asOfDate);
  const timeFraction = Math.min(1.5, elapsedDays / totalTimelineDays);
  const daysToTarget = Math.round(
    (parseISODate(project.targetCompletionOn) - parseISODate(asOfDate)) / MS_PER_DAY,
  );

  let status: ProjectCalculatedStatus['status'];
  if (progressFraction >= 1) {
    status = 'complete';
  } else if (daysToTarget < 0) {
    status = 'delayed';
  } else if (progressFraction >= timeFraction - 0.1) {
    status = 'on_track';
  } else if (progressFraction >= timeFraction - 0.25) {
    status = 'at_risk';
  } else {
    status = 'delayed';
  }

  return {
    projectId: project.id,
    status,
    parcelCount,
    parcelsAtPossession,
    areaNotifiedHectares,
    areaAcquiredHectares,
    areaAcquiredPercent: areaNotifiedHectares === 0 ? 0 : Math.round((areaAcquiredHectares / areaNotifiedHectares) * 100),
    compensationAssessed,
    compensationPaid,
    compensationPaidPercent:
      compensationAssessed === 0 ? 0 : Math.round((compensationPaid / compensationAssessed) * 100),
    possessionPercent: parcelCount === 0 ? 0 : Math.round((parcelsAtPossession / parcelCount) * 100),
    progressPercent: Math.round(Math.min(1, progressFraction) * 100),
    daysToTarget,
  };
}

export function getNationalSummary(
  projects: AcquisitionProject[],
  parcels: AcquisitionParcel[],
  asOfDate: ISODateString = DEMO_REFERENCE_DATE,
): NationalSummary {
  const projectStatuses = projects.map((project) => getProjectCalculatedStatus(project, parcels, asOfDate));

  const summary = projectStatuses.reduce<NationalSummary>(
    (running, projectStatus) => {
      running.areaNotifiedHectares += projectStatus.areaNotifiedHectares;
      running.areaAcquiredHectares += projectStatus.areaAcquiredHectares;
      running.compensationAssessed += projectStatus.compensationAssessed;
      running.compensationPaid += projectStatus.compensationPaid;

      if (projectStatus.status === 'on_track') {
        running.onTrackCount += 1;
      } else if (projectStatus.status === 'at_risk') {
        running.atRiskCount += 1;
      } else if (projectStatus.status === 'delayed') {
        running.delayedCount += 1;
      } else {
        running.completeCount += 1;
      }

      return running;
    },
    {
      totalProjects: projects.length,
      totalStates: new Set(projects.map((project) => project.state)).size,
      areaNotifiedHectares: 0,
      areaAcquiredHectares: 0,
      compensationAssessed: 0,
      compensationPaid: 0,
      onTrackCount: 0,
      atRiskCount: 0,
      delayedCount: 0,
      completeCount: 0,
      projectStatuses,
    },
  );

  summary.areaNotifiedHectares = Number(summary.areaNotifiedHectares.toFixed(2));
  summary.areaAcquiredHectares = Number(summary.areaAcquiredHectares.toFixed(2));

  return summary;
}

// Thin reshape of the existing isParcelStuck/getMissingRequiredDocuments/
// getOpenObjections gating logic into a flat, sorted list for the
// notification bell — no new detection logic, just a new UI surface.
export function getAlerts(
  parcels: AcquisitionParcel[],
  asOfDate: ISODateString = DEMO_REFERENCE_DATE,
): Alert[] {
  const alerts: Alert[] = [];

  parcels.forEach((parcel) => {
    const stageLabel = getStageDefinition(parcel.currentStage).label;
    const missingDocumentKinds = getMissingRequiredDocuments(parcel);
    const openObjections = getOpenObjections(parcel);

    if (isParcelStuck(parcel, asOfDate)) {
      const daysInStage = getDaysInCurrentStage(parcel, asOfDate);
      alerts.push({
        id: `stuck-${parcel.id}`,
        parcelId: parcel.id,
        surveyNumber: parcel.surveyNumber,
        type: 'stuck',
        severity: 'high',
        message: `Survey ${parcel.surveyNumber} has been stuck in ${stageLabel} for ${daysInStage} days.`,
      });
    }

    if (missingDocumentKinds.length > 0) {
      const missingLabels = missingDocumentKinds
        .map((documentKind) => DOCUMENT_KIND_LABELS[documentKind])
        .join(', ');
      alerts.push({
        id: `missing-document-${parcel.id}`,
        parcelId: parcel.id,
        surveyNumber: parcel.surveyNumber,
        type: 'missing_document',
        severity: 'medium',
        message: `Survey ${parcel.surveyNumber} (${stageLabel}) is missing: ${missingLabels}.`,
      });
    }

    if (openObjections.length > 0) {
      alerts.push({
        id: `open-objection-${parcel.id}`,
        parcelId: parcel.id,
        surveyNumber: parcel.surveyNumber,
        type: 'open_objection',
        severity: 'medium',
        message: `Survey ${parcel.surveyNumber} has ${openObjections.length} open objection${
          openObjections.length > 1 ? 's' : ''
        }.`,
      });
    }
  });

  return alerts.sort((first, second) => {
    if (first.severity === second.severity) {
      return 0;
    }
    return first.severity === 'high' ? -1 : 1;
  });
}

export function getAttentionParcels(
  parcels: AcquisitionParcel[],
  asOfDate: ISODateString = DEMO_REFERENCE_DATE,
) {
  return [...parcels]
    .map((parcel) => ({
      parcel,
      calculatedStatus: getParcelCalculatedStatus(parcel, asOfDate),
      advanceGate: getAdvanceGate(parcel),
    }))
    .filter(
      ({ calculatedStatus }) =>
        calculatedStatus.status === 'stuck' || calculatedStatus.status === 'blocked',
    )
    .sort((first, second) => second.calculatedStatus.daysInStage - first.calculatedStatus.daysInStage);
}

// Average actual time spent per stage vs. its SLA threshold, using only
// completed history entries (those with an exitedOn). A parcel's current,
// still-open stage is deliberately excluded — its duration isn't final yet,
// so mixing it in would understate the average for stages most parcels are
// presently sitting in.
export function getStageDurationStats(parcels: AcquisitionParcel[]): StageDurationStat[] {
  const totalsByStage = new Map<StageId, { totalDays: number; count: number }>();

  parcels.forEach((parcel) => {
    parcel.history.forEach((entry) => {
      if (!entry.exitedOn) {
        return;
      }
      const duration = daysBetween(entry.enteredOn, entry.exitedOn);
      const existing = totalsByStage.get(entry.stage) ?? { totalDays: 0, count: 0 };
      totalsByStage.set(entry.stage, { totalDays: existing.totalDays + duration, count: existing.count + 1 });
    });
  });

  return ACQUISITION_STAGES.map((stage) => {
    const totals = totalsByStage.get(stage.id);
    const averageDays = totals && totals.count > 0 ? Math.round((totals.totalDays / totals.count) * 10) / 10 : 0;

    return {
      stage: stage.id,
      averageDays,
      thresholdDays: stage.thresholdDays,
      sampleSize: totals?.count ?? 0,
      isOverThreshold: averageDays > stage.thresholdDays,
    };
  });
}
