import { type ObjectionStatus, type StageId } from './constants';
import type { AlertType } from './types';

// The owner's stored preferred language (`ParcelOwner.preferredLanguage`),
// distinct from the official UI's language toggle (`en` | `hi` only) — SMS
// previews are addressed to the landowner, not the currently-signed-in
// official, so they use the owner's own language setting.
export type SmsOwnerLanguage = 'en' | 'hi' | 'mr';

export type SmsPreviewEvent =
  | { kind: 'stage_advance'; surveyNumber: string; stage: StageId }
  | { kind: 'objection_status'; surveyNumber: string; status: ObjectionStatus }
  | { kind: 'alert'; surveyNumber: string; alertType: AlertType; detail: string };

type Bilingual = { en: string; hi: string };

const STAGE_NAME: Record<StageId, Bilingual> = {
  notification: { en: 'Notification', hi: 'अधिसूचना' },
  survey: { en: 'Joint Survey', hi: 'संयुक्त सर्वेक्षण' },
  objection_review: { en: 'Objection Review', hi: 'आपत्ति समीक्षा' },
  valuation: { en: 'Valuation', hi: 'मूल्यांकन' },
  compensation_approval: { en: 'Compensation Approval', hi: 'मुआवज़ा स्वीकृति' },
  award: { en: 'Award', hi: 'पुरस्कार' },
  possession: { en: 'Possession Handover', hi: 'कब्ज़ा हस्तांतरण' },
};

const OBJECTION_STATUS_NAME: Record<ObjectionStatus, Bilingual> = {
  pending: { en: 'Pending', hi: 'लंबित' },
  under_review: { en: 'Under Review', hi: 'समीक्षाधीन' },
  resolved: { en: 'Resolved', hi: 'हल हो गया' },
};

const ALERT_TYPE_NAME: Record<AlertType, Bilingual> = {
  stuck: { en: 'a delay', hi: 'देरी' },
  missing_document: { en: 'a pending document', hi: 'एक लंबित दस्तावेज़' },
  open_objection: { en: 'an open objection', hi: 'एक खुली आपत्ति' },
};

function pick(entry: Bilingual, ownerLanguage: SmsOwnerLanguage): string {
  // Only `en`/`hi` copy exists. `mr` (Marathi) has no translated template
  // yet, so it falls back to English rather than showing untranslated text.
  return ownerLanguage === 'hi' ? entry.hi : entry.en;
}

// Builds simulated SMS message text for the landowner-notification prototype
// feature — deterministic, no network call, no real SMS provider involved.
// The message text is chosen by `ownerLanguage`, falling back to English for
// any language with no translated template.
export function buildSmsPreview(event: SmsPreviewEvent, ownerLanguage: SmsOwnerLanguage): string {
  const isHindi = ownerLanguage === 'hi';
  const prefix = 'BhoomiSetu:';

  switch (event.kind) {
    case 'stage_advance': {
      const stageName = pick(STAGE_NAME[event.stage], ownerLanguage);
      return isHindi
        ? `${prefix} आपकी भूमि (सर्वे ${event.surveyNumber}) अब "${stageName}" चरण में पहुँच गई है।`
        : `${prefix} Your land (Survey ${event.surveyNumber}) has moved to ${stageName} stage.`;
    }
    case 'objection_status': {
      const statusName = pick(OBJECTION_STATUS_NAME[event.status], ownerLanguage);
      return isHindi
        ? `${prefix} आपकी भूमि (सर्वे ${event.surveyNumber}) पर दर्ज आपत्ति की स्थिति अब "${statusName}" है।`
        : `${prefix} The objection on your land (Survey ${event.surveyNumber}) is now "${statusName}".`;
    }
    case 'alert': {
      const alertName = pick(ALERT_TYPE_NAME[event.alertType], ownerLanguage);
      return isHindi
        ? `${prefix} आपकी भूमि (सर्वे ${event.surveyNumber}) के लिए ${alertName} है: ${event.detail}`
        : `${prefix} There is ${alertName} on your land (Survey ${event.surveyNumber}): ${event.detail}`;
    }
  }
}
