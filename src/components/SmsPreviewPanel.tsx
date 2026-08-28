import { useState } from 'react';
import { buildSmsPreview, type SmsOwnerLanguage, type SmsPreviewEvent } from '../domain';
import { useLanguage } from '../i18n/LanguageContext';
import { uiText } from '../i18n/translations';
import { Badge, Button } from './ui';

type SmsLogEntry = {
  id: string;
  text: string;
  sentAt: string;
};

type SmsPreviewPanelProps = {
  ownerLanguage: SmsOwnerLanguage;
  event: SmsPreviewEvent;
  triggerLabel?: string;
};

let smsLogIdCounter = 0;

// Simulated SMS-notification prototype: builds the message text with
// `buildSmsPreview` (deterministic, no network call) and keeps a small
// in-session log of "sends" for this button instance. Nothing here ever
// contacts a real SMS provider.
export function SmsPreviewPanel({ event, ownerLanguage, triggerLabel }: SmsPreviewPanelProps) {
  const { t } = useLanguage();
  const [log, setLog] = useState<SmsLogEntry[]>([]);

  function handleSend() {
    const text = buildSmsPreview(event, ownerLanguage);
    smsLogIdCounter += 1;
    const entry: SmsLogEntry = {
      id: `sms-${smsLogIdCounter}`,
      text,
      sentAt: new Date().toLocaleTimeString(),
    };
    setLog((current) => [entry, ...current].slice(0, 5));
  }

  return (
    <div className="sms-preview">
      <Button type="button" variant="secondary" onClick={handleSend}>
        {triggerLabel ?? t(uiText.sms.triggerLabel)}
      </Button>
      {log.length > 0 && (
        <ul className="sms-log">
          {log.map((entry) => (
            <li className="sms-log-item" key={entry.id}>
              <p className="sms-log-text">{entry.text}</p>
              <p className="sms-log-meta">
                <Badge tone="success">{t(uiText.sms.sentBadge)}</Badge> {t(uiText.sms.sentAtPrefix)} {entry.sentAt}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
