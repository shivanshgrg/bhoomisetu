import { ACQUISITION_STAGES, DEMO_REFERENCE_DATE, type StageId } from './constants';
import { daysBetween, getStageDurationStats, parseISODate } from './rules';
import type { AcquisitionParcel, AcquisitionProject, ISODateString, StageDurationStat } from './types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_WEEK = 7;

export type ProjectForecast = {
  projectId: string;
  projectName: string;
  targetCompletionOn: ISODateString;
  projectedCompletionOn: ISODateString;
  gapWeeks: number; // positive = projected later than target, negative = ahead of schedule
  bottleneckStage: StageId | undefined;
  bottleneckOverageDays: number;
  whatIfWeeksSaved: number; // weeks earlier the project would finish if the bottleneck stage met its SLA
};

export type BottleneckRanking = {
  groupLabel: string;
  stage: StageId;
  averageDays: number;
  thresholdDays: number;
  overageDays: number;
  sampleSize: number;
};

// Per-stage duration to use for forecasting: the observed average when there
// is enough sample to trust it, otherwise the SLA threshold itself (the best
// guess absent data). Never lets a thin sample (e.g. n=1 outlier) dominate —
// same "don't overclaim precision" discipline as the risk engine.
const MIN_SAMPLE_FOR_TRUST = 2;

function expectedDaysForStage(stat: StageDurationStat): number {
  return stat.sampleSize >= MIN_SAMPLE_FOR_TRUST ? stat.averageDays : stat.thresholdDays;
}

// Remaining calendar days for one parcel: whatever is left of its current
// stage's expected duration (bounded at zero — it may already be past
// average) plus the full expected duration of every stage still ahead of it.
function getRemainingDaysForParcel(
  parcel: AcquisitionParcel,
  statByStage: Map<StageId, StageDurationStat>,
  asOfDate: ISODateString,
): number {
  const currentStageDef = ACQUISITION_STAGES.find((stage) => stage.id === parcel.currentStage);
  if (!currentStageDef || currentStageDef.order === ACQUISITION_STAGES[ACQUISITION_STAGES.length - 1].order) {
    // Already at (or past) the last stage — treat as effectively complete.
    return 0;
  }

  const currentStat = statByStage.get(parcel.currentStage);
  const currentStageExpected = currentStat ? expectedDaysForStage(currentStat) : currentStageDef.thresholdDays;
  const daysSpentSoFar = daysBetween(parcel.stageEnteredOn, asOfDate);
  const remainingInCurrentStage = Math.max(0, currentStageExpected - daysSpentSoFar);

  const remainingStagesDays = ACQUISITION_STAGES.filter((stage) => stage.order > currentStageDef.order).reduce(
    (total, stage) => {
      const stat = statByStage.get(stage.id);
      return total + (stat ? expectedDaysForStage(stat) : stage.thresholdDays);
    },
    0,
  );

  return remainingInCurrentStage + remainingStagesDays;
}

function toStatMap(stats: StageDurationStat[]): Map<StageId, StageDurationStat> {
  return new Map(stats.map((stat) => [stat.stage, stat]));
}

// Ranks stages by how far the observed average runs over its SLA threshold —
// the stage a project or region should fix first. Only stages with at least
// one completed sample are ranked (nothing to say about a stage nobody has
// finished yet).
function rankBottleneck(stats: StageDurationStat[]): { stage: StageId; overageDays: number } | undefined {
  const overStages = stats
    .filter((stat) => stat.sampleSize > 0)
    .map((stat) => ({ stage: stat.stage, overageDays: stat.averageDays - stat.thresholdDays }))
    .sort((first, second) => second.overageDays - first.overageDays);

  return overStages[0];
}

export function getProjectForecast(
  project: AcquisitionProject,
  projectParcels: AcquisitionParcel[],
  asOfDate: ISODateString = DEMO_REFERENCE_DATE,
): ProjectForecast {
  const stats = getStageDurationStats(projectParcels);
  const statByStage = toStatMap(stats);

  const activeParcels = projectParcels.filter(
    (parcel) => parcel.currentStage !== ACQUISITION_STAGES[ACQUISITION_STAGES.length - 1].id,
  );
  const remainingDaysPerParcel = (activeParcels.length > 0 ? activeParcels : projectParcels).map((parcel) =>
    getRemainingDaysForParcel(parcel, statByStage, asOfDate),
  );
  // The project finishes when its slowest still-moving parcel finishes.
  const projectRemainingDays = remainingDaysPerParcel.length > 0 ? Math.max(...remainingDaysPerParcel) : 0;

  const projectedCompletionMs = parseISODate(asOfDate) + projectRemainingDays * MS_PER_DAY;
  const projectedCompletionOn = new Date(projectedCompletionMs).toISOString().slice(0, 10) as ISODateString;

  const targetMs = parseISODate(project.targetCompletionOn);
  const gapDays = Math.round((projectedCompletionMs - targetMs) / MS_PER_DAY);
  const gapWeeks = Math.round((gapDays / DAYS_PER_WEEK) * 10) / 10;

  const bottleneck = rankBottleneck(stats);

  // What-if: recompute the slowest parcel's remaining days with the
  // bottleneck stage's expected duration clamped to its SLA threshold
  // instead of its (higher) observed average.
  let whatIfWeeksSaved = 0;
  if (bottleneck && bottleneck.overageDays > 0) {
    const bottleneckStat = statByStage.get(bottleneck.stage);
    const slaStatByStage = new Map(statByStage);
    if (bottleneckStat) {
      slaStatByStage.set(bottleneck.stage, { ...bottleneckStat, averageDays: bottleneckStat.thresholdDays });
    }
    const whatIfRemainingDaysPerParcel = (activeParcels.length > 0 ? activeParcels : projectParcels).map((parcel) =>
      getRemainingDaysForParcel(parcel, slaStatByStage, asOfDate),
    );
    const whatIfRemainingDays =
      whatIfRemainingDaysPerParcel.length > 0 ? Math.max(...whatIfRemainingDaysPerParcel) : 0;
    const daysSaved = Math.max(0, projectRemainingDays - whatIfRemainingDays);
    whatIfWeeksSaved = Math.round((daysSaved / DAYS_PER_WEEK) * 10) / 10;
  }

  return {
    projectId: project.id,
    projectName: project.name,
    targetCompletionOn: project.targetCompletionOn,
    projectedCompletionOn,
    gapWeeks,
    bottleneckStage: bottleneck?.stage,
    bottleneckOverageDays: bottleneck ? Math.max(0, Math.round(bottleneck.overageDays * 10) / 10) : 0,
    whatIfWeeksSaved,
  };
}

export function getAllProjectForecasts(
  projects: AcquisitionProject[],
  parcels: AcquisitionParcel[],
  asOfDate: ISODateString = DEMO_REFERENCE_DATE,
): ProjectForecast[] {
  return projects.map((project) =>
    getProjectForecast(
      project,
      parcels.filter((parcel) => parcel.projectId === project.id),
      asOfDate,
    ),
  );
}

// Ranks the single worst bottleneck stage per group (district or state) —
// same overage math as the per-project forecast, just grouped differently.
function rankBottlenecksByGroup(
  parcels: AcquisitionParcel[],
  groupOf: (parcel: AcquisitionParcel) => string,
): BottleneckRanking[] {
  const parcelsByGroup = new Map<string, AcquisitionParcel[]>();
  parcels.forEach((parcel) => {
    const key = groupOf(parcel);
    const existing = parcelsByGroup.get(key) ?? [];
    existing.push(parcel);
    parcelsByGroup.set(key, existing);
  });

  const rankings: BottleneckRanking[] = [];
  parcelsByGroup.forEach((groupParcels, groupLabel) => {
    const stats = getStageDurationStats(groupParcels);
    const bottleneck = rankBottleneck(stats);
    if (!bottleneck || bottleneck.overageDays <= 0) {
      return;
    }
    const stat = stats.find((entry) => entry.stage === bottleneck.stage);
    if (!stat) {
      return;
    }
    rankings.push({
      groupLabel,
      stage: bottleneck.stage,
      averageDays: stat.averageDays,
      thresholdDays: stat.thresholdDays,
      overageDays: Math.round(bottleneck.overageDays * 10) / 10,
      sampleSize: stat.sampleSize,
    });
  });

  return rankings.sort((first, second) => second.overageDays - first.overageDays);
}

export function getDistrictBottleneckRanking(parcels: AcquisitionParcel[]): BottleneckRanking[] {
  return rankBottlenecksByGroup(parcels, (parcel) => parcel.district);
}

export function getStateBottleneckRanking(
  parcels: AcquisitionParcel[],
  projects: AcquisitionProject[],
): BottleneckRanking[] {
  const stateByProjectId = new Map(projects.map((project) => [project.id, project.state as string]));
  return rankBottlenecksByGroup(parcels, (parcel) => stateByProjectId.get(parcel.projectId) ?? 'unknown');
}
