import { useEffect, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { uiText } from '../i18n/translations';
import { Button } from './ui';

type SpeakButtonProps = {
  text: string;
};

function pickVoice(voices: SpeechSynthesisVoice[], languageTag: 'hi' | 'en') {
  const preferredPrefix = languageTag === 'hi' ? 'hi' : 'en';
  return (
    voices.find((voice) => voice.lang.toLowerCase().startsWith(preferredPrefix)) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith('en')) ??
    voices[0]
  );
}

export function SpeakButton({ text }: SpeakButtonProps) {
  const { language, t } = useLanguage();
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    setIsSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
  }, []);

  useEffect(() => {
    if (!isSupported) {
      return;
    }
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [isSupported]);

  if (!isSupported) {
    return null;
  }

  function handleClick() {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    const voice = pickVoice(window.speechSynthesis.getVoices(), language);
    if (voice) {
      utterance.voice = voice;
    }
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  return (
    <Button className="speak-btn" onClick={handleClick} type="button" variant="ghost">
      <span aria-hidden="true">{isSpeaking ? '⏹' : '🔊'}</span>
      {isSpeaking ? t(uiText.speech.stop) : t(uiText.speech.listen)}
    </Button>
  );
}
