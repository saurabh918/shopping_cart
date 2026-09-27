const { classifyIntent, INTENTS } = require("./intentRouter.cjs");

const MAX_HISTORY_MESSAGES = 6;
const MAX_MESSAGE_CHARS = 400;
const MAX_CONTEXT_IDS = 10;
const MAX_RESOLVED_PRODUCTS = 10;

const PRODUCT_FOLLOW_UP_PATTERNS = [
  /\bwhich one is (?:the )?cheapest\b/i,
  /\bwhich is (?:the )?cheapest\b/i,
  /\bcheapest one\b/i,
  /\bmost expensive\b/i,
  /\bhighest rating\b/i,
  /\blowest rating\b/i,
  /\blowest price\b/i,
  /\bsecond one\b/i,
  /\bthe other one\b/i,
  /\bwhich one has the highest rating\b/i,
  /\bis it in stock\b/i,
  /\bhow fast is it delivered\b/i,
  /\bhow long does it take to deliver\b/i,
  /\bcompare these\b/i,
  /\bwhich one should i choose\b/i,
  /\bfastest delivery\b/i,
];

const FOLLOW_UP_CLARIFICATION =
  "I am not sure which products you mean yet. "
  + "Try asking about products first, for example \"Show me MacBooks\", then ask your follow-up.";

function sanitizeHistory(raw) {
  if (raw == null) return [];
  if (!Array.isArray(raw)) return [];

  const cleaned = [];
  for (const entry of raw) {
    if (entry == null || typeof entry !== "object" || Array.isArray(entry)) continue;
    const role = entry.role;
    if (role !== "user" && role !== "assistant") continue;
    if (typeof entry.content !== "string") continue;
    let content = entry.content.trim();
    if (!content) continue;
    if (content.length > MAX_MESSAGE_CHARS) {
      content = content.slice(0, MAX_MESSAGE_CHARS);
    }
    cleaned.push({ role, content });
  }

  return cleaned.slice(-MAX_HISTORY_MESSAGES);
}

function sanitizeContextProductIds(raw) {
  if (raw == null) return [];
  if (!Array.isArray(raw)) return [];

  const ids = [];
  const seen = new Set();
  for (const value of raw) {
    const id = typeof value === "number" && Number.isInteger(value) ? value : null;
    if (id == null || id < 0) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (ids.length >= MAX_CONTEXT_IDS) break;
  }
  return ids;
}

function validateContextProductIds(rawIds, records) {
  const sanitized = sanitizeContextProductIds(rawIds);
  if (sanitized.length === 0) return [];
  const byId = new Map(records.map((product) => [product.id, product]));
  return sanitized.filter((id) => byId.has(id));
}

function resolveProductsByIds(records, ids) {
  const byId = new Map(records.map((product) => [product.id, product]));
  const resolved = [];
  for (const id of ids) {
    const product = byId.get(id);
    if (product) resolved.push(product);
    if (resolved.length >= MAX_RESOLVED_PRODUCTS) break;
  }
  return resolved;
}

function isProductIntent(intent) {
  return (
    intent === INTENTS.PRODUCT_SEARCH
    || intent === INTENTS.PRODUCT_RECOMMENDATION
    || intent === INTENTS.PRODUCT_SPECIFIC
    || intent === INTENTS.MIXED
  );
}

function classifyQuestionIntent(question, classifyFn) {
  if (typeof classifyFn === "function") {
    const result = classifyFn(question);
    if (result && typeof result === "object" && result.intent) {
      return result.intent;
    }
    return result;
  }
  return classifyIntent(question).intent;
}

function isStandaloneProductQuery(question, classifyFn) {
  const intent = classifyQuestionIntent(question, classifyFn);
  return isProductIntent(intent);
}

function shouldClearProductContextForQuestion(question, classifyFn) {
  const intent = classifyQuestionIntent(question, classifyFn);
  return (
    intent === INTENTS.GENERAL_KNOWLEDGE
    || intent === INTENTS.GREETING
    || isProductIntent(intent)
  );
}

function lastUserMessageContent(history) {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (history[i].role === "user") return history[i].content;
  }
  return null;
}

function historyContainsProductRelatedUserMessage(history, classifyFn) {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (history[i].role !== "user") continue;
    const intent = classifyQuestionIntent(history[i].content, classifyFn);
    if (isProductIntent(intent)) return true;
  }
  return false;
}

function hasRecentProductContext(history, validatedContextIds, classifyFn) {
  if (Array.isArray(validatedContextIds) && validatedContextIds.length > 0) {
    return true;
  }
  return historyContainsProductRelatedUserMessage(history, classifyFn);
}

function detectProductFollowUp(question) {
  const trimmed = question.trim();
  if (!trimmed) return false;
  if (!PRODUCT_FOLLOW_UP_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return false;
  }
  // Broad catalog browse queries (no prior turn) should stay on the product-search path.
  if (/\bwhich products\b/i.test(trimmed)) return false;
  return true;
}

function detectFollowUpOperation(question) {
  const q = question.toLowerCase();
  if (/\bsecond one\b/.test(q)) return "second";
  if (/\bthe other one\b/.test(q)) return "second";
  if (/\bmost expensive\b/.test(q) || /\bhighest price\b/.test(q)) return "most_expensive";
  if (/\blowest price\b/.test(q) || /\bcheapest\b/.test(q)) return "cheapest";
  if (/\bhighest rating\b/.test(q)) return "highest_rating";
  if (/\blowest rating\b/.test(q)) return "lowest_rating";
  if (/\bfastest delivery\b/.test(q) || /\bhow fast is it delivered\b/.test(q)) {
    return "fastest_delivery";
  }
  if (/\bin stock\b/.test(q) || /\bis it in stock\b/.test(q)) return "in_stock";
  if (/\bcompare these\b/.test(q) || /\bwhich one should i choose\b/.test(q)) {
    return "compare";
  }
  return "general";
}

function applyFollowUpOperation(products, operation, orderedContextIds) {
  const list = [...products];
  if (list.length === 0) return list;

  switch (operation) {
    case "cheapest":
      return [...list].sort((a, b) => a.price - b.price);
    case "most_expensive":
      return [...list].sort((a, b) => b.price - a.price);
    case "highest_rating":
      return [...list].sort((a, b) => b.ratings - a.ratings);
    case "lowest_rating":
      return [...list].sort((a, b) => a.ratings - b.ratings);
    case "fastest_delivery":
      return [...list].sort((a, b) => a.deliveryDays - b.deliveryDays);
    case "in_stock":
      return list.filter((p) => Number(p.inStock) > 0 || p.stockStatus === "in_stock");
    case "second": {
      const order = orderedContextIds || list.map((p) => p.id);
      const byId = new Map(list.map((p) => [p.id, p]));
      const ordered = order.map((id) => byId.get(id)).filter(Boolean);
      const pool = ordered.length > 0 ? ordered : list;
      if (pool.length >= 2) return [pool[1]];
      return pool.length === 1 ? pool : [];
    }
    case "compare":
    case "general":
    default:
      if (orderedContextIds && orderedContextIds.length > 0) {
        const byId = new Map(list.map((p) => [p.id, p]));
        const ordered = orderedContextIds.map((id) => byId.get(id)).filter(Boolean);
        return ordered.length > 0 ? ordered : list;
      }
      return list;
  }
}

function buildExpandedRetrievalQuery(history, question) {
  const previousUser = lastUserMessageContent(history);
  if (!previousUser) return null;
  return `${previousUser} ${question}`.trim();
}

function productsToMatches(products) {
  return products.slice(0, MAX_RESOLVED_PRODUCTS).map((product) => ({
    product,
    score: 10,
    reasons: ["conversation_context"],
  }));
}

module.exports = {
  MAX_HISTORY_MESSAGES,
  MAX_MESSAGE_CHARS,
  MAX_CONTEXT_IDS,
  MAX_RESOLVED_PRODUCTS,
  FOLLOW_UP_CLARIFICATION,
  sanitizeHistory,
  sanitizeContextProductIds,
  validateContextProductIds,
  resolveProductsByIds,
  detectProductFollowUp,
  detectFollowUpOperation,
  applyFollowUpOperation,
  hasRecentProductContext,
  shouldClearProductContextForQuestion,
  isStandaloneProductQuery,
  historyContainsProductRelatedUserMessage,
  buildExpandedRetrievalQuery,
  productsToMatches,
  lastUserMessageContent,
};
