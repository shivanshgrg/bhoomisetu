import type { ObjectionReason } from './constants';

// Step 65: closed keyword-matching classifier that routes a spoken or typed
// objection to a LARR Section 15 ground — mirrors `matchChatTopic` in
// `chatbotContent.ts` exactly (same scoring shape, same "closed classifier,
// not free-form AI" framing). This is NOT an NLP/LLM step: it is a fixed
// keyword vocabulary scored against the transcript, and it only ever
// pre-selects a dropdown option that the landowner can override before
// filing — it never files anything on its own.
type ObjectionGroundKeywords = {
  id: ObjectionReason;
  keywords: string[];
};

const OBJECTION_GROUND_KEYWORDS: readonly ObjectionGroundKeywords[] = [
  {
    id: 'ownership',
    keywords: [
      'ownership', 'owner', 'my land', 'belongs to me', 'title', 'inherited', 'inheritance', 'not mine',
      'wrong person', 'wrong name', 'wrong owner',
      'मालिक', 'मालिकाना', 'स्वामित्व', 'मेरी जमीन', 'मेरा नाम', 'गलत व्यक्ति', 'विरासत',
    ],
  },
  {
    id: 'measurement',
    keywords: [
      'measurement', 'measure', 'survey', 'area is wrong', 'wrong area', 'boundary', 'size', 'acres', 'hectares',
      'माप', 'नाप', 'सर्वे', 'क्षेत्रफल गलत', 'सीमा', 'हद',
    ],
  },
  {
    id: 'valuation',
    keywords: [
      'valuation', 'value', 'rate', 'undervalued', 'market rate', 'wrong valuation', 'low value',
      'मूल्यांकन', 'मूल्य', 'दर', 'कम मूल्यांकन', 'बाजार दर',
    ],
  },
  {
    id: 'compensation',
    keywords: [
      'compensation', 'payment', 'money', 'amount', 'not paid', 'less money', 'rupees', 'paid less',
      'मुआवज़ा', 'मुआवजा', 'भुगतान', 'पैसा', 'कम पैसा', 'रकम', 'नहीं मिला',
    ],
  },
  {
    id: 'other',
    keywords: ['other', 'something else', 'different problem', 'अन्य', 'कुछ और', 'दूसरी समस्या'],
  },
];

export function matchObjectionGround(rawInput: string): ObjectionReason | undefined {
  const normalized = rawInput.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  let bestGround: ObjectionReason | undefined;
  let bestScore = 0;

  for (const ground of OBJECTION_GROUND_KEYWORDS) {
    const score = ground.keywords.reduce((count, keyword) => (normalized.includes(keyword) ? count + 1 : count), 0);
    if (score > bestScore) {
      bestScore = score;
      bestGround = ground.id;
    }
  }

  return bestGround;
}
