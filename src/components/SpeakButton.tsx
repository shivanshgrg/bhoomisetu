import { useEffect, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { uiText } from '../i18n/translations';
import { Button } from './ui';

type SpeakButtonProps = {
  text: string;
};

function pickVoice(voices: SpeechSynthesisVoice[], languageTag: string) {
  const prefixes = { en: 'en', hi: 'hi', mr: 'mr', bn: 'bn', te: 'te', ta: 'ta', gu: 'gu', kn: 'kn', or: 'or', pa: 'pa' } as const;
  const preferredPrefix = prefixes[languageTag as keyof typeof prefixes] ?? 'en';
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
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    setIsSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
  }, []);

  useEffect(() => {
    if (!isSupported) return;
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, [isSupported]);

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
    const locales = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN', bn: 'bn-IN', te: 'te-IN', ta: 'ta-IN', gu: 'gu-IN', kn: 'kn-IN', or: 'or-IN', pa: 'pa-IN' } as const;
    utterance.lang = locales[language];
    const voice = pickVoice(voices, language);
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
