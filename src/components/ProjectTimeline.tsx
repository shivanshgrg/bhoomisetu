import type { AcquisitionProject, ProjectCalculatedStatus } from '../domain';
import { getProjectTimelineAxis } from '../domain';
import { useLanguage } from '../i18n/LanguageContext';
import { projectStatusLabels, uiText } from '../i18n/translations';
import { getProjectStatusTone } from '../pages/statusDisplay';

type ProjectTimelineProps = {
  projects: AcquisitionProject[];
  statuses: ProjectCalculatedStatus[];
};

export function ProjectTimeline({ projects, statuses }: ProjectTimelineProps) {
  const { t } = useLanguage();
  const axis = getProjectTimelineAxis(projects, statuses);

  if (!axis) {
    return null;
  }

  return (
    <div className="timeline">
      <div className="timeline-axis" aria-hidden="true">
        {axis.ticks.map((tick) => (
          <span className="timeline-axis-tick" key={tick.label} style={{ left: `${tick.percent}%` }}>
            {tick.label}
          </span>
        ))}
      </div>
      <div className="timeline-rows">
        <span className="timeline-today-line" style={{ left: `${axis.todayPercent}%` }} title={t(uiText.timeline.todayLabel)} />
        {axis.bars.map((bar) => (
          <div className="timeline-row" key={bar.projectId}>
            <span className="timeline-row-label">{bar.name}</span>
            <span className="timeline-track">
              <span
                className={`timeline-bar timeline-bar-${getProjectStatusTone(bar.status)}`}
                style={{ left: `${bar.startPercent}%`, width: `${bar.widthPercent}%` }}
                title={`${bar.sanctionedOn} → ${bar.targetCompletionOn} · ${t(projectStatusLabels[bar.status])}`}
              >
                <span className="timeline-bar-fill" style={{ width: `${bar.progressPercent}%` }} />
              </span>
            </span>
          </div>
        ))}
      </div>
      <div className="timeline-legend">
        <span>
          <span className="timeline-legend-swatch timeline-bar-info" /> {t(projectStatusLabels.on_track)}
        </span>
        <span>
          <span className="timeline-legend-swatch timeline-bar-warning" /> {t(projectStatusLabels.at_risk)}
        </span>
        <span>
          <span className="timeline-legend-swatch timeline-bar-danger" /> {t(projectStatusLabels.delayed)}
        </span>
        <span>
          <span className="timeline-legend-swatch timeline-bar-success" /> {t(projectStatusLabels.complete)}
        </span>
        <span>
          <span className="timeline-legend-today" /> {t(uiText.timeline.todayLabel)}
        </span>
      </div>
    </div>
  );
}
