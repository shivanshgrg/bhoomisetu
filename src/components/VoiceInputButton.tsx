import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { uiText } from '../i18n/translations';
import { Button } from './ui';

type VoiceInputButtonProps = {
  onResult: (transcript: string) => void;
};

function getSpeechRecognitionConstructor(): (new () => SpeechRecognitionLike) | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

export function VoiceInputButton({ onResult }: VoiceInputButtonProps) {
  const { language, t } = useLanguage();
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setIsSupported(Boolean(getSpeechRecognitionConstructor()));
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  if (!isSupported) {
    return (
      <p className="voice-input-unsupported" role="note">
        <span aria-hidden="true">🎤</span> {t(uiText.voiceInput.unsupported)}
      </p>
    );
  }

  function handleClick() {
    const RecognitionConstructor = getSpeechRecognitionConstructor();
    if (!RecognitionConstructor) {
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    setError(undefined);
    const recognition = new RecognitionConstructor();
    recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const lastResult = event.results[event.results.length - 1];
      const transcript = lastResult?.[0]?.transcript ?? '';
      if (transcript.trim()) {
        onResult(transcript);
      } else {
        setError(t(uiText.voiceInput.notHeard));
      }
    };
    recognition.onerror = () => {
      setError(t(uiText.voiceInput.notHeard));
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }

  return (
    <div className="voice-input">
      <Button className="voice-input-btn" onClick={handleClick} type="button" variant="ghost">
        <span aria-hidden="true">{isListening ? '⏹' : '🎤'}</span>
        {isListening ? t(uiText.voiceInput.listening) : t(uiText.voiceInput.speak)}
      </Button>
      {error && (
        <p className="voice-input-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
