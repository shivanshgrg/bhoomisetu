import { type ObjectionStatus, type StageId } from './constants';
import type { AlertType } from './types';

// The owner's stored preferred language (`ParcelOwner.preferredLanguage`),
// distinct from the official UI's language toggle — SMS previews are
// addressed to the landowner, not the currently-signed-in official, so they
// use the owner's own language setting. Every one of the ten supported
// languages has a real translated template below (no English fallback).
export type SmsOwnerLanguage = 'en' | 'hi' | 'mr' | 'bn' | 'te' | 'ta' | 'gu' | 'kn' | 'or' | 'pa';

export type SmsPreviewEvent =
  | { kind: 'stage_advance'; surveyNumber: string; stage: StageId }
  | { kind: 'objection_status'; surveyNumber: string; status: ObjectionStatus }
  | { kind: 'alert'; surveyNumber: string; alertType: AlertType; detail: string };

type Multilingual = Record<SmsOwnerLanguage, string>;

// Kept self-contained (not imported from `src/i18n/translations.ts`) to avoid
// a circular import — `translations.ts` imports domain types via
// `src/domain/index.ts`, which re-exports this module.
const STAGE_NAME: Record<StageId, Multilingual> = {
  notification: {
    en: 'Notification',
    hi: 'अधिसूचना',
    mr: 'अधिसूचना',
    gu: 'સૂચના',
    te: 'నోటిఫికేషన్',
    ta: 'அறிவிப்பு',
    kn: 'ಅಧಿಸೂಚನೆ',
    bn: 'বিজ্ঞপ্তি',
    or: 'ବିଜ୍ଞପ୍ତି',
    pa: 'ਸੂਚਨਾ',
  },
  survey: {
    en: 'Joint Survey',
    hi: 'संयुक्त सर्वेक्षण',
    mr: 'संयुक्त सर्वेक्षण',
    gu: 'સંયુક્ત સર્વે',
    te: 'సంయుక్త సర్వే',
    ta: 'கூட்டு சர்வே',
    kn: 'ಜಂಟಿ ಸರ್ವೆ',
    bn: 'যৌথ জরিপ',
    or: 'ମିଳିତ ସର୍ଭେ',
    pa: 'ਸਾਂਝਾ ਸਰਵੇਖਣ',
  },
  objection_review: {
    en: 'Objection Review',
    hi: 'आपत्ति समीक्षा',
    mr: 'आपत्ती पुनरावलोकन',
    gu: 'વાંધા સમીક્ષા',
    te: 'అభ్యంతరాల సమీక్ష',
    ta: 'எதிர்ப்பு மதிப்பாய்வு',
    kn: 'ಆಕ್ಷೇಪಣೆ ಪರಿಶೀಲನೆ',
    bn: 'আপত্তি পর্যালোচনা',
    or: 'ଆପତ୍ତି ସମୀକ୍ଷା',
    pa: 'ਇਤਰਾਜ਼ ਸਮੀਖਿਆ',
  },
  valuation: {
    en: 'Valuation',
    hi: 'मूल्यांकन',
    mr: 'मूल्यांकन',
    gu: 'મૂલ્યાંકન',
    te: 'మూల్యాంకనం',
    ta: 'மதிப்பீடு',
    kn: 'ಮೌಲ್ಯಮಾಪನ',
    bn: 'মূল্যায়ন',
    or: 'ମୂଲ୍ୟାଙ୍କନ',
    pa: 'ਮੁਲਾਂਕਣ',
  },
  compensation_approval: {
    en: 'Compensation Approval',
    hi: 'मुआवज़ा स्वीकृति',
    mr: 'मोबदला मंजुरी',
    gu: 'વળતર મંજૂરી',
    te: 'పరిహార ఆమోదం',
    ta: 'இழப்பீடு ஒப்புதல்',
    kn: 'ಪರಿಹಾರ ಅನುಮೋದನೆ',
    bn: 'ক্ষতিপূরণ অনুমোদন',
    or: 'କ୍ଷତିପୂରଣ ଅନୁମୋଦନ',
    pa: 'ਮੁਆਵਜ਼ਾ ਮਨਜ਼ੂਰੀ',
  },
  award: {
    en: 'Award',
    hi: 'पुरस्कार',
    mr: 'पुरस्कार',
    gu: 'પુરસ્કાર',
    te: 'పురస్కారం',
    ta: 'விருது',
    kn: 'ಪುರಸ್ಕಾರ',
    bn: 'পুরস্কার',
    or: 'ପୁରସ୍କାର',
    pa: 'ਪੁਰਸਕਾਰ',
  },
  possession: {
    en: 'Possession Handover',
    hi: 'कब्ज़ा हस्तांतरण',
    mr: 'कब्जा हस्तांतरण',
    gu: 'કબજો હસ્તાંતરણ',
    te: 'స్వాధీన బదిలీ',
    ta: 'உடைமை மாற்றம்',
    kn: 'ಸ್ವಾಧೀನ ಹಸ್ತಾಂತರ',
    bn: 'দখল হস্তান্তর',
    or: 'ଦଖଲ ହସ୍ତାନ୍ତର',
    pa: 'ਕਬਜ਼ਾ ਸੌਂਪਣਾ',
  },
};

const OBJECTION_STATUS_NAME: Record<ObjectionStatus, Multilingual> = {
  pending: {
    en: 'Pending',
    hi: 'लंबित',
    mr: 'लंबित',
    gu: 'બાકી',
    te: 'పెండింగ్‌లో',
    ta: 'நிலுவையில்',
    kn: 'ಬಾಕಿ ಇದೆ',
    bn: 'মুলতুবি',
    or: 'ବିଚାରାଧୀନ',
    pa: 'ਬਕਾਇਆ',
  },
  under_review: {
    en: 'Under Review',
    hi: 'समीक्षाधीन',
    mr: 'पुनरावलोकनाधीन',
    gu: 'સમીક્ષા હેઠળ',
    te: 'సమీక్షలో',
    ta: 'மதிப்பாய்வில்',
    kn: 'ಪರಿಶೀಲನೆಯಲ್ಲಿ',
    bn: 'পর্যালোচনাধীন',
    or: 'ସମୀକ୍ଷାଧୀନ',
    pa: 'ਸਮੀਖਿਆ ਅਧੀਨ',
  },
  resolved: {
    en: 'Resolved',
    hi: 'हल हो गया',
    mr: 'निकाली काढले',
    gu: 'ઉકેલાયું',
    te: 'పరిష్కరించబడింది',
    ta: 'தீர்க்கப்பட்டது',
    kn: 'ಪರಿಹರಿಸಲಾಗಿದೆ',
    bn: 'সমাধান হয়েছে',
    or: 'ସମାଧାନ ହୋଇଛି',
    pa: 'ਹੱਲ ਹੋ ਗਿਆ',
  },
};

const ALERT_TYPE_NAME: Record<AlertType, Multilingual> = {
  stuck: {
    en: 'a delay',
    hi: 'देरी',
    mr: 'विलंब',
    gu: 'વિલંબ',
    te: 'ఆలస్యం',
    ta: 'தாமதம்',
    kn: 'ವಿಳಂಬ',
    bn: 'বিলম্ব',
    or: 'ବିଳମ୍ବ',
    pa: 'ਦੇਰੀ',
  },
  missing_document: {
    en: 'a pending document',
    hi: 'एक लंबित दस्तावेज़',
    mr: 'एक प्रलंबित कागदपत्र',
    gu: 'એક બાકી દસ્તાવેજ',
    te: 'పెండింగ్‌లో ఉన్న పత్రం',
    ta: 'நிலுவையில் உள்ள ஆவணம்',
    kn: 'ಬಾಕಿ ಇರುವ ದಾಖಲೆ',
    bn: 'একটি মুলতুবি নথি',
    or: 'ଏକ ବିଚାରାଧୀନ ଦଲିଲ',
    pa: 'ਇੱਕ ਬਕਾਇਆ ਦਸਤਾਵੇਜ਼',
  },
  open_objection: {
    en: 'an open objection',
    hi: 'एक खुली आपत्ति',
    mr: 'एक खुली आपत्ती',
    gu: 'એક ખુલ્લો વાંધો',
    te: 'తెరిచి ఉన్న అభ్యంతరం',
    ta: 'திறந்த எதிர்ப்பு',
    kn: 'ತೆರೆದ ಆಕ್ಷೇಪಣೆ',
    bn: 'একটি খোলা আপত্তি',
    or: 'ଏକ ଖୋଲା ଆପତ୍ତି',
    pa: 'ਇੱਕ ਖੁੱਲ੍ਹਾ ਇਤਰਾਜ਼',
  },
};

type StageAdvanceTemplate = (survey: string, stageName: string) => string;
type ObjectionStatusTemplate = (survey: string, statusName: string) => string;
type AlertTemplate = (survey: string, alertName: string, detail: string) => string;

const STAGE_ADVANCE_TEMPLATE: Record<SmsOwnerLanguage, StageAdvanceTemplate> = {
  en: (survey, stage) => `Your land (Survey ${survey}) has moved to ${stage} stage.`,
  hi: (survey, stage) => `आपकी भूमि (सर्वे ${survey}) अब "${stage}" चरण में पहुँच गई है।`,
  mr: (survey, stage) => `तुमची जमीन (सर्वे ${survey}) आता "${stage}" टप्प्यात पोहोचली आहे.`,
  gu: (survey, stage) => `તમારી જમીન (સર્વે ${survey}) હવે "${stage}" તબક્કામાં પહોંચી ગઈ છે.`,
  te: (survey, stage) => `మీ భూమి (సర్వే ${survey}) ఇప్పుడు "${stage}" దశకు చేరుకుంది.`,
  ta: (survey, stage) => `உங்கள் நிலம் (சர்வே ${survey}) இப்போது "${stage}" நிலைக்கு வந்துவிட்டது.`,
  kn: (survey, stage) => `ನಿಮ್ಮ ಭೂಮಿ (ಸರ್ವೆ ${survey}) ಈಗ "${stage}" ಹಂತಕ್ಕೆ ತಲುಪಿದೆ.`,
  bn: (survey, stage) => `আপনার জমি (সার্ভে ${survey}) এখন "${stage}" পর্যায়ে পৌঁছেছে।`,
  or: (survey, stage) => `ଆପଣଙ୍କ ଜମି (ସର୍ଭେ ${survey}) ବର୍ତ୍ତମାନ "${stage}" ପର୍ଯ୍ୟାୟରେ ପହଞ୍ଚିଛି।`,
  pa: (survey, stage) => `ਤੁਹਾਡੀ ਜ਼ਮੀਨ (ਸਰਵੇ ${survey}) ਹੁਣ "${stage}" ਪੜਾਅ ਵਿੱਚ ਪਹੁੰਚ ਗਈ ਹੈ।`,
};

const OBJECTION_STATUS_TEMPLATE: Record<SmsOwnerLanguage, ObjectionStatusTemplate> = {
  en: (survey, status) => `The objection on your land (Survey ${survey}) is now "${status}".`,
  hi: (survey, status) => `आपकी भूमि (सर्वे ${survey}) पर दर्ज आपत्ति की स्थिति अब "${status}" है।`,
  mr: (survey, status) => `तुमच्या जमिनीवरील (सर्वे ${survey}) आपत्तीची स्थिती आता "${status}" आहे.`,
  gu: (survey, status) => `તમારી જમીન (સર્વે ${survey}) પરનો વાંધો હવે "${status}" છે.`,
  te: (survey, status) => `మీ భూమిపై (సర్వే ${survey}) నమోదైన అభ్యంతరం స్థితి ఇప్పుడు "${status}".`,
  ta: (survey, status) => `உங்கள் நிலத்தில் (சர்வே ${survey}) பதிவான எதிர்ப்பின் நிலை இப்போது "${status}".`,
  kn: (survey, status) => `ನಿಮ್ಮ ಭೂಮಿಯ ಮೇಲಿನ (ಸರ್ವೆ ${survey}) ಆಕ್ಷೇಪಣೆಯ ಸ್ಥಿತಿ ಈಗ "${status}".`,
  bn: (survey, status) => `আপনার জমির (সার্ভে ${survey}) আপত্তির অবস্থা এখন "${status}"।`,
  or: (survey, status) => `ଆପଣଙ୍କ ଜମି (ସର୍ଭେ ${survey}) ଉପରେ ଥିବା ଆପତ୍ତିର ସ୍ଥିତି ବର୍ତ୍ତମାନ "${status}"।`,
  pa: (survey, status) => `ਤੁਹਾਡੀ ਜ਼ਮੀਨ (ਸਰਵੇ ${survey}) 'ਤੇ ਦਰਜ ਇਤਰਾਜ਼ ਦੀ ਸਥਿਤੀ ਹੁਣ "${status}" ਹੈ।`,
};

const ALERT_TEMPLATE: Record<SmsOwnerLanguage, AlertTemplate> = {
  en: (survey, alertName, detail) => `There is ${alertName} on your land (Survey ${survey}): ${detail}`,
  hi: (survey, alertName, detail) => `आपकी भूमि (सर्वे ${survey}) के लिए ${alertName} है: ${detail}`,
  mr: (survey, alertName, detail) => `तुमच्या जमिनीसाठी (सर्वे ${survey}) ${alertName} आहे: ${detail}`,
  gu: (survey, alertName, detail) => `તમારી જમીન (સર્વે ${survey}) માટે ${alertName} છે: ${detail}`,
  te: (survey, alertName, detail) => `మీ భూమి (సర్వే ${survey}) కోసం ${alertName} ఉంది: ${detail}`,
  ta: (survey, alertName, detail) => `உங்கள் நிலத்திற்கு (சர்வே ${survey}) ${alertName} உள்ளது: ${detail}`,
  kn: (survey, alertName, detail) => `ನಿಮ್ಮ ಭೂಮಿಗೆ (ಸರ್ವೆ ${survey}) ${alertName} ಇದೆ: ${detail}`,
  bn: (survey, alertName, detail) => `আপনার জমির (সার্ভে ${survey}) জন্য ${alertName} রয়েছে: ${detail}`,
  or: (survey, alertName, detail) => `ଆପଣଙ୍କ ଜମି (ସର୍ଭେ ${survey}) ପାଇଁ ${alertName} ଅଛି: ${detail}`,
  pa: (survey, alertName, detail) => `ਤੁਹਾਡੀ ਜ਼ਮੀਨ (ਸਰਵੇ ${survey}) ਲਈ ${alertName} ਹੈ: ${detail}`,
};

// Builds simulated SMS message text for the landowner-notification prototype
// feature — deterministic, no network call, no real SMS provider involved.
// Every supported `SmsOwnerLanguage` has a real translated template; there is
// no English-fallback branch left in this function.
export function buildSmsPreview(event: SmsPreviewEvent, ownerLanguage: SmsOwnerLanguage): string {
  const prefix = 'BhoomiSetu:';

  switch (event.kind) {
    case 'stage_advance': {
      const stageName = STAGE_NAME[event.stage][ownerLanguage];
      return `${prefix} ${STAGE_ADVANCE_TEMPLATE[ownerLanguage](event.surveyNumber, stageName)}`;
    }
    case 'objection_status': {
      const statusName = OBJECTION_STATUS_NAME[event.status][ownerLanguage];
      return `${prefix} ${OBJECTION_STATUS_TEMPLATE[ownerLanguage](event.surveyNumber, statusName)}`;
    }
    case 'alert': {
      const alertName = ALERT_TYPE_NAME[event.alertType][ownerLanguage];
      return `${prefix} ${ALERT_TEMPLATE[ownerLanguage](event.surveyNumber, alertName, event.detail)}`;
    }
  }
}
