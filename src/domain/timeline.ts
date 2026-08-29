import { DEMO_REFERENCE_DATE, type ProjectStatus } from './constants';
import { parseISODate } from './rules';
import type { AcquisitionProject, ISODateString, ProjectCalculatedStatus } from './types';

export type TimelineTick = {
  label: string;
  percent: number;
};

export type ProjectTimelineBar = {
  projectId: string;
  name: string;
  status: ProjectStatus;
  startPercent: number;
  widthPercent: number;
  progressPercent: number;
  sanctionedOn: ISODateString;
  targetCompletionOn: ISODateString;
};

export type ProjectTimelineAxis = {
  axisStart: ISODateString;
  axisEnd: ISODateString;
  todayPercent: number;
  ticks: TimelineTick[];
  bars: ProjectTimelineBar[];
};

function quarterStart(year: number, quarterIndex: number): number {
  return Date.UTC(year, quarterIndex * 3, 1);
}

// Builds a shared time axis spanning every project's sanctioned→target
// window, then places each project as a bar on it — the standard
// "portfolio Gantt" shape, hand-rolled with plain percentages so the layout
// is just CSS (no charting library, no SVG math beyond the axis itself).
export function getProjectTimelineAxis(
  projects: AcquisitionProject[],
  statuses: ProjectCalculatedStatus[],
  asOfDate: ISODateString = DEMO_REFERENCE_DATE,
): ProjectTimelineAxis | undefined {
  if (projects.length === 0) {
    return undefined;
  }

  const axisStartMs = Math.min(...projects.map((project) => parseISODate(project.sanctionedOn)));
  const axisEndMs = Math.max(...projects.map((project) => parseISODate(project.targetCompletionOn)));
  const axisSpanMs = Math.max(1, axisEndMs - axisStartMs);

  const percentOf = (ms: number) => Math.min(100, Math.max(0, ((ms - axisStartMs) / axisSpanMs) * 100));

  const ticks: TimelineTick[] = [];
  const startDate = new Date(axisStartMs);
  const endDate = new Date(axisEndMs);
  let year = startDate.getUTCFullYear();
  let quarterIndex = Math.floor(startDate.getUTCMonth() / 3);

  while (quarterStart(year, quarterIndex) <= axisEndMs) {
    const tickMs = quarterStart(year, quarterIndex);
    if (tickMs >= axisStartMs) {
      ticks.push({ label: `Q${quarterIndex + 1} ${year}`, percent: percentOf(tickMs) });
    }
    quarterIndex += 1;
    if (quarterIndex > 3) {
      quarterIndex = 0;
      year += 1;
    }
  }

  if (ticks.length === 0 || ticks[ticks.length - 1].percent < 99) {
    ticks.push({ label: `Q${Math.floor(endDate.getUTCMonth() / 3) + 1} ${endDate.getUTCFullYear()}`, percent: 100 });
  }

  const bars: ProjectTimelineBar[] = projects.map((project) => {
    const status = statuses.find((entry) => entry.projectId === project.id);
    const startMs = parseISODate(project.sanctionedOn);
    const endMs = parseISODate(project.targetCompletionOn);

    return {
      projectId: project.id,
      name: project.name,
      status: status?.status ?? 'on_track',
      startPercent: percentOf(startMs),
      widthPercent: Math.max(1, percentOf(endMs) - percentOf(startMs)),
      progressPercent: status?.progressPercent ?? 0,
      sanctionedOn: project.sanctionedOn,
      targetCompletionOn: project.targetCompletionOn,
    };
  });

  return {
    axisStart: projects[0].sanctionedOn,
    axisEnd: projects[0].targetCompletionOn,
    todayPercent: percentOf(parseISODate(asOfDate)),
    ticks,
    bars,
  };
}
