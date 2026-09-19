import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SpeakButton } from '../components/SpeakButton';
import { VoiceInputButton } from '../components/VoiceInputButton';
import { Badge, Button, Card, PageContainer, PageHeader, TextField } from '../components/ui';
import { repository } from '../data';
import { APP_ROLE_LABELS } from '../domain';
import { useLanguage } from '../i18n/LanguageContext';
import { useSession } from '../i18n/SessionContext';
import { uiText } from '../i18n/translations';

// Best-effort cleanup of a spoken survey number: spoken digits/words come through
// as plain text (e.g. "one two four slash seven" or "124 7"), so this normalizes
// the common "slash"/spacing variants into the "124/7" format the app expects.
function parseSpokenSurveyNumber(transcript: string): string {
  let text = transcript.trim().toLowerCase();
  text = text.replace(/\bslash\b/g, '/');
  text = text.replace(/\bdash\b/g, '/');
  // Speech engines often return "124 slash 7" with spaces around the
  // recognized slash. Deal with that before turning spaces into separators,
  // then collapse any duplicate separators (the old order made 124///7).
  text = text.replace(/\s*\/\s*/g, '/');
  text = text.replace(/[^a-z0-9/]+/g, ' ').trim();
  text = text.replace(/\s+/g, '/');
  text = text.replace(/\/{2,}/g, '/');
  text = text.replace(/^\/|\/$/g, '');
  return text;
}

export function LandownerPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { session } = useSession();
  const role = session?.role;
  const [surveyNumber, setSurveyNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | undefined>(undefined);

  async function handleSearch(overrideSurveyNumber?: string) {
    const trimmedSurveyNumber = (overrideSurveyNumber ?? surveyNumber).trim();
    if (!trimmedSurveyNumber) {
      setSearchError(t(uiText.landownerSearch.emptySurveyNumberError));
      return;
    }

    setIsSearching(true);
    setSearchError(undefined);

    try {
      const parcel = await repository.getParcelBySurveyNumber(trimmedSurveyNumber);
      if (!parcel) {
        setSearchError(`No parcel found for survey number ${trimmedSurveyNumber}.`);
        return;
      }
      navigate(`/landowner/status/${parcel.id}`);
    } catch {
      setSearchError(t(uiText.landownerSearch.genericSearchError));
    } finally {
      setIsSearching(false);
    }
  }

  function handleVoiceResult(transcript: string) {
    const parsed = parseSpokenSurveyNumber(transcript);
    setSurveyNumber(parsed);
    if (parsed) {
      void handleSearch(parsed);
    }
  }

  const description = t(uiText.landownerSearch.description);

  return (
    <PageContainer>
      <PageHeader
        eyebrow={t(uiText.landownerSearch.eyebrow)}
        title={t(uiText.landownerSearch.title)}
        description={description}
        actions={
          <div className="page-actions-group">
            {role && <Badge tone="info">Viewing as: {APP_ROLE_LABELS[role]}</Badge>}
            <SpeakButton text={`${t(uiText.landownerSearch.title)}. ${description}`} />
          </div>
        }
      />

      <Card eyebrow={t(uiText.landownerSearch.cardEyebrow)} title={t(uiText.landownerSearch.cardTitle)}>
        <p className="demo-survey-note"><strong>{t(uiText.landownerSearch.demoNumberLabel)}</strong> <button type="button" className="auth-link-btn" onClick={() => { setSurveyNumber('124/7'); void handleSearch('124/7'); }}>124/7</button></p>
        <form
          className="search-panel"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSearch();
          }}
        >
          <TextField
            label={t(uiText.landownerSearch.fieldLabel)}
            placeholder={t(uiText.landownerSearch.placeholder)}
            hint={t(uiText.landownerSearch.hint)}
            value={surveyNumber}
            onChange={(event) => setSurveyNumber(event.target.value)}
          />
          <VoiceInputButton onResult={handleVoiceResult} />
          <Button disabled={isSearching} type="submit">
            {isSearching ? t(uiText.landownerSearch.searching) : t(uiText.landownerSearch.searchButton)}
          </Button>
        </form>
        {searchError && <p role="alert">{searchError}</p>}
      </Card>
    </PageContainer>
  );
}
