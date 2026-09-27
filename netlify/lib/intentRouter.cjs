/**
 * Rule-based intent classification for the shopping assistant (no LLM, no catalog).
 * Wire into askOrchestrator in a later step.
 */

const INTENTS = Object.freeze({
  GREETING: "GREETING",
  GENERAL_KNOWLEDGE: "GENERAL_KNOWLEDGE",
  PRODUCT_SEARCH: "PRODUCT_SEARCH",
  PRODUCT_RECOMMENDATION: "PRODUCT_RECOMMENDATION",
  PRODUCT_SPECIFIC: "PRODUCT_SPECIFIC",
  MIXED: "MIXED",
  UNKNOWN: "UNKNOWN",
});

const CONFIDENCE = Object.freeze({
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
});

const GREETING_PATTERN =
  /^(?:hi|hello|hey)(?:\s+there)?(?:[\s,!?.]+|$)|^good\s+(?:morning|afternoon|evening)(?:[\s,!?.]+|$)/i;

const MIXED_GENERAL_LEAD =
  /\b(?:what(?:'s| is| are)|explain(?: what)?)\b/i;

const MIXED_SEARCH_TAIL =
  /\b(?:which|show me|find(?: me)?|list|do you have|are there|you have|available(?:\s+in|\s+to|\s+for)?)\b/i;

const PRODUCT_SPECIFIC_PATTERNS = [
  /\b(?:price|cost)\s+of\b/i,
  /\bhow much (?:is|does|are|do)\b/i,
  /\bis .+ in stock\b/i,
  /\bin stock\b/i,
  /\bdelivery\b/i,
  /\bhow fast\b.+\bdeliver/i,
  /\bdeliver(?:y|ed)\b.+\?/i,
  /^tell me about\b/i,
];

const PRODUCT_RECOMMENDATION_PATTERNS = [
  /\brecommend(?:ation)?\b/i,
  /\bsuggest(?:ion)?\b/i,
  /\bwhich .+\b(?:best|better)\b/i,
  /\bwhat .+\b(?:should i buy|to buy)\b/i,
  /\bgood for\b/i,
  /\bbest .+\bfor\b/i,
  /\bhelp me choose\b/i,
];

const PRODUCT_SEARCH_PATTERNS = [
  /\bshow me\b/i,
  /\bfind(?: me)?\b/i,
  /\blist\b/i,
  /\bdo you have\b/i,
  /\bproducts under\b/i,
  /\bunder\s+\$?\d/i,
  /\b(?:any|available)\s+.+\b(?:in stock|for sale)\b/i,
];

const GENERAL_KNOWLEDGE_PATTERNS = [
  /^what is (?:a|an)\s+/i,
  /^what are\s+/i,
  /^what's (?:a|an)\s+/i,
  /\bwhat is the difference between\b/i,
  /^what is (?:ram|ssd|hdd|cpu|gpu|usb|wifi|bluetooth|cloud computing)\b/i,
  /^explain (?:what )?(?:a|an|the)\s+/i,
];

const UNKNOWN_PATTERNS = [
  /\b(?:tell me )?a joke\b/i,
  /\bweather\b/i,
  /\bnews\b/i,
  /\bwho (?:is|was|are)\b/i,
  /\bwhen (?:is|was|did)\b/i,
  /\bwhere (?:is|are|was)\b/i,
];

function normalizeQuestion(question) {
  if (question == null || typeof question !== "string") {
    return "";
  }
  return question.trim().replace(/\s+/g, " ");
}

function isMostlyGreeting(normalized) {
  if (!normalized) return false;
  const lower = normalized.toLowerCase().replace(/[!?.]+$/g, "").trim();
  if (lower.length > 48) return false;
  return GREETING_PATTERN.test(lower);
}

function isMixedIntent(lower) {
  if (!/\band\b/.test(lower)) {
    return false;
  }
  return MIXED_GENERAL_LEAD.test(lower) && MIXED_SEARCH_TAIL.test(lower);
}

function isProductSpecific(lower, normalized) {
  if (/\bwhat is the (?:price|cost)\b/i.test(normalized)) {
    return true;
  }
  if (PRODUCT_SPECIFIC_PATTERNS.some((pattern) => pattern.test(normalized))) {
    if (/^what is (?:a|an)\s+/i.test(normalized) && !/\b(?:price|stock|delivery)\b/i.test(lower)) {
      return false;
    }
    return true;
  }
  return false;
}

function isProductRecommendation(normalized) {
  return PRODUCT_RECOMMENDATION_PATTERNS.some((pattern) => pattern.test(normalized));
}

function isProductSearch(normalized, lower) {
  if (PRODUCT_SEARCH_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return true;
  }
  if (/\b(?:laptops?|macbooks?|iphones?|phones?|products?)\b/i.test(lower)
    && /\b(?:under|below|less than|cheaper than)\s+\$?\d/i.test(lower)) {
    return true;
  }
  return false;
}

function isGeneralKnowledge(normalized, lower) {
  if (GENERAL_KNOWLEDGE_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return true;
  }
  if (/^what is [a-z][a-z0-9\s-]+\?$/i.test(normalized)
    && !/\b(?:price|stock|delivery|in stock)\b/i.test(lower)) {
    return true;
  }
  return false;
}

function isUnknown(normalized) {
  return UNKNOWN_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * @param {string} question
 * @returns {{ intent: string, confidence: string }}
 */
function classifyIntent(question) {
  const normalized = normalizeQuestion(question);

  if (!normalized) {
    return { intent: INTENTS.UNKNOWN, confidence: CONFIDENCE.LOW };
  }

  const lower = normalized.toLowerCase();

  if (isMostlyGreeting(normalized)) {
    return { intent: INTENTS.GREETING, confidence: CONFIDENCE.HIGH };
  }

  if (isMixedIntent(lower)) {
    return { intent: INTENTS.MIXED, confidence: CONFIDENCE.HIGH };
  }

  if (isProductSpecific(lower, normalized)) {
    return { intent: INTENTS.PRODUCT_SPECIFIC, confidence: CONFIDENCE.HIGH };
  }

  if (isProductRecommendation(normalized)) {
    return { intent: INTENTS.PRODUCT_RECOMMENDATION, confidence: CONFIDENCE.HIGH };
  }

  if (isProductSearch(normalized, lower)) {
    return { intent: INTENTS.PRODUCT_SEARCH, confidence: CONFIDENCE.HIGH };
  }

  if (isUnknown(normalized)) {
    return { intent: INTENTS.UNKNOWN, confidence: CONFIDENCE.HIGH };
  }

  if (isGeneralKnowledge(normalized, lower)) {
    return { intent: INTENTS.GENERAL_KNOWLEDGE, confidence: CONFIDENCE.HIGH };
  }

  return { intent: INTENTS.UNKNOWN, confidence: CONFIDENCE.MEDIUM };
}

module.exports = {
  INTENTS,
  CONFIDENCE,
  normalizeQuestion,
  classifyIntent,
};
