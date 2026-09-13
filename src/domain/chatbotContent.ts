import { ACQUISITION_STAGES, type StageId } from './constants';

// Step 62 Part B: closed-menu help chatbot for the signed-in landowner
// portal. Deliberately NOT a free-form/LLM chatbot (Swiggy/Zomato-style
// "pick a button" support chat instead) — every reply is one of a fixed set
// of pre-written topics, so it can never be asked to produce something
// outside what it was built to say. The keyword lists below only decide
// which fixed topic a *typed or spoken* message routes to; they never
// influence the reply text itself.
export const CHAT_TOPIC_IDS = [
  'status',
  'stages',
  'documents',
  'objection',
  'compensation',
  'statusMeaning',
  'language',
  'contact',
  'about',
] as const;
export type ChatTopicId = (typeof CHAT_TOPIC_IDS)[number];

export type ChatTopic = {
  id: ChatTopicId;
  icon: string;
  keywords: string[];
};

export const CHAT_TOPICS: readonly ChatTopic[] = [
  {
    id: 'status',
    icon: '📍',
    keywords: [
      'status', 'check', 'my parcel', 'my land', 'survey number', 'survey no', 'track', 'progress',
      'स्थिति', 'सर्वे', 'जांच', 'ढूंढ', 'खोज', 'मेरी जमीन',
    ],
  },
  {
    id: 'stages',
    icon: '🗺️',
    keywords: [
      'stage', 'stages', 'process', 'steps', 'workflow', 'how does it work',
      'चरण', 'प्रक्रिया', 'कैसे काम',
    ],
  },
  {
    id: 'documents',
    icon: '📄',
    keywords: [
      'document', 'documents', 'papers', 'paperwork', 'required',
      'दस्तावेज़', 'कागज', 'कागजात',
    ],
  },
  {
    id: 'objection',
    icon: '✍️',
    keywords: [
      'objection', 'object', 'complaint', 'dispute', 'appeal', 'file a case',
      'आपत्ति', 'शिकायत', 'विरोध',
    ],
  },
  {
    id: 'compensation',
    icon: '💰',
    keywords: [
      'compensation', 'money', 'payment', 'amount', 'calculator', 'pay', 'paid', 'rupees', 'valuation',
      'मुआवज़ा', 'भुगतान', 'रकम', 'पैसा', 'मूल्यांकन',
    ],
  },
  {
    id: 'statusMeaning',
    icon: '🚦',
    keywords: [
      'stuck', 'blocked', 'meaning', 'icon', 'ready to advance', 'on track', 'what does', 'symbol',
      'अटका', 'मतलब', 'चिन्ह',
    ],
  },
  {
    id: 'language',
    icon: '🌐',
    keywords: ['language', 'hindi', 'marathi', 'translate', 'भाषा', 'हिंदी'],
  },
  {
    id: 'contact',
    icon: '📞',
    keywords: [
      'contact', 'officer', 'help', 'escalate', 'complain to', 'who handles', 'who is responsible',
      'संपर्क', 'अधिकारी', 'मदद', 'सहायता',
    ],
  },
  {
    id: 'about',
    icon: 'ℹ️',
    keywords: ['about', 'what is bhoomisetu', 'bhoomisetu', 'this app', 'this website', 'क्या है'],
  },
] as const;

export function matchChatTopic(rawInput: string): ChatTopicId | undefined {
  const normalized = rawInput.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  let bestTopic: ChatTopicId | undefined;
  let bestScore = 0;

  for (const topic of CHAT_TOPICS) {
    const score = topic.keywords.reduce((count, keyword) => (normalized.includes(keyword) ? count + 1 : count), 0);
    if (score > bestScore) {
      bestScore = score;
      bestTopic = topic.id;
    }
  }

  return bestTopic;
}

// English-only keyword fallback for matching typed/spoken text to a stage
// while the "documents" topic's stage sub-menu is open. This is a
// convenience path only — every stage is always also reachable by tapping
// its button, which is the primary interaction this widget is designed for.
const STAGE_KEYWORDS: Record<StageId, string[]> = {
  notification: ['notification', 'notice', 'section 11'],
  survey: ['survey', 'joint survey', 'measurement', 'measure'],
  objection_review: ['objection', 'objections'],
  valuation: ['valuation', 'value'],
  compensation_approval: ['approval', 'compensation approval'],
  award: ['award'],
  possession: ['possession', 'handover'],
};

export function matchChatStage(rawInput: string): StageId | undefined {
  const normalized = rawInput.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  return ACQUISITION_STAGES.map((stage) => stage.id).find((stageId) =>
    STAGE_KEYWORDS[stageId].some((keyword) => normalized.includes(keyword)),
  );
}
