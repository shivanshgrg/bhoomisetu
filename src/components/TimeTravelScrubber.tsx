import { addDays, daysBetween, type ISODateString } from '../domain';
import { useLanguage } from '../i18n/LanguageContext';
import { uiText } from '../i18n/translations';
import { Button } from './ui';

type TimeTravelScrubberProps = {
  minDate: ISODateString;
  maxDate: ISODateString;
  value: ISODateString;
  onChange: (date: ISODateString) => void;
};

// Step 64: shared slider used on the district dashboard, national dashboard
// and Action Center. maxDate doubles as "today" — the rightmost position is
// always the live view, so a page that never touches the scrubber renders
// exactly as it did before this feature existed.
export function TimeTravelScrubber({ minDate, maxDate, value, onChange }: TimeTravelScrubberProps) {
  const { t } = useLanguage();
  const totalDays = Math.max(1, daysBetween(minDate, maxDate));
  const selectedDayIndex = Math.min(totalDays, daysBetween(minDate, value));
  const isLive = value === maxDate;

  return (
    <div className="time-travel-scrubber">
      <label className="time-travel-scrubber-label" htmlFor="time-travel-scrubber-input">
        {t(uiText.timeTravel.scrubberLabel)}: <strong>{isLive ? t(uiText.timeTravel.todayLabel) : value}</strong>
      </label>
      <div className="time-travel-scrubber-row">
        <input
          id="time-travel-scrubber-input"
          type="range"
          min={0}
          max={totalDays}
          value={selectedDayIndex}
          onChange={(event) => onChange(addDays(minDate, Number(event.target.value)))}
          aria-valuetext={isLive ? t(uiText.timeTravel.todayLabel) : value}
        />
        {!isLive && (
          <Button type="button" variant="secondary" onClick={() => onChange(maxDate)}>
            {t(uiText.timeTravel.resetToTodayButton)}
          </Button>
        )}
      </div>
      <p className="time-travel-scrubber-note">
        {isLive
          ? t(uiText.timeTravel.liveBannerNote)
          : t(uiText.timeTravel.asOfBannerTemplate).replace('{date}', value)}
      </p>
    </div>
  );
}
