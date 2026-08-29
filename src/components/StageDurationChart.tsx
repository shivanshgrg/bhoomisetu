import type { StageDurationStat } from '../domain';
import { useLanguage } from '../i18n/LanguageContext';
import { stageShortLabels, uiText } from '../i18n/translations';

type StageDurationChartProps = {
  stats: StageDurationStat[];
};

export function StageDurationChart({ stats }: StageDurationChartProps) {
  const { t } = useLanguage();
  const maxDays = Math.max(1, ...stats.map((stat) => Math.max(stat.averageDays, stat.thresholdDays)));

  return (
    <div className="stage-duration-chart">
      {stats.map((stat) => (
        <div className="stage-duration-row" key={stat.stage}>
          <span className="stage-duration-label">{t(stageShortLabels[stat.stage])}</span>
          <span className="stage-duration-track">
            <span
              className="stage-duration-threshold"
              style={{ left: `${(stat.thresholdDays / maxDays) * 100}%` }}
              title={`${t(uiText.stageDurationChart.thresholdLabel)}: ${stat.thresholdDays}d`}
            />
            <span
              className={`stage-duration-bar ${stat.isOverThreshold ? 'stage-duration-bar-over' : ''}`}
              style={{ width: `${Math.min(100, (stat.averageDays / maxDays) * 100)}%` }}
            />
          </span>
          <span className="stage-duration-value">
            {stat.sampleSize > 0 ? `${stat.averageDays}d` : '—'}
            <small> / {stat.thresholdDays}d {t(uiText.stageDurationChart.slaSuffix)}</small>
          </span>
        </div>
      ))}
      <p className="stage-duration-legend">
        <span className="stage-duration-legend-swatch" /> {t(uiText.stageDurationChart.averageActualLabel)}
        <span className="stage-duration-legend-tick" /> {t(uiText.stageDurationChart.thresholdLabel)}
      </p>
    </div>
  );
}
