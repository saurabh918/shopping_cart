/**
 * Server-side copy of src/retrieval/retrieveProducts.js (keyword-based, not vector search).
 * Keep algorithm in sync with the browser module; validate with npm run demo:retrieval
 * and npm run test:ask-api.
 */
const { getProductKnowledgeBase } = require("./catalog.cjs");
const {
  parsePriceFilter,
  parseStructuredQuery,
  hasStructuredFilters,
  productMatchesStructured,
  sortStructuredMatches,
  structuredMatchReasons,
  queryAsksFastDelivery,
} = require("./structuredFilters.cjs");

const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "which", "what", "who", "whom", "where", "when", "why", "how",
  "show", "me", "tell", "give", "list", "find", "get",
  "do", "does", "did", "have", "has", "had",
  "with", "for", "of", "and", "or", "to", "in", "on", "at", "by", "from",
  "this", "that", "these", "those", "my", "your", "our",
  "product", "products", "item", "items",
]);

const INTENT_WORDS = new Set([
  "stock", "in", "out", "available", "availability", "unavailable",
  "price", "prices", "cost", "costs", "much",
  "delivery", "deliver", "shipping", "ship", "days", "day",
  "fast", "quick", "express",
  "rating", "ratings", "star", "stars", "rated", "high", "best", "low",
  "category", "mobile", "phone", "laptop", "notebook",
]);

const DEFAULT_MIN_SCORE = 4;
const DEFAULT_LIMIT = 3;

function normalizeQuery(query) {
  if (query == null || typeof query !== "string") {
    return { original: "", normalized: "", tokens: [] };
  }

  const original = query.trim();
  const normalized = original.toLowerCase().replace(/\s+/g, " ");
  if (!normalized) {
    return { original: "", normalized: "", tokens: [] };
  }

  const tokens = normalized
    .split(" ")
    .map((token) => token.replace(/[^a-z0-9$]/g, ""))
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));

  return { original, normalized, tokens };
}

function buildCatalogTokenSet(records) {
  const catalogTokens = new Set(INTENT_WORDS);
  records.forEach((record) => {
    record.searchText.split(" ").forEach((token) => {
      if (token) catalogTokens.add(token);
    });
    record.name.toLowerCase().split(" ").forEach((token) => {
      if (token) catalogTokens.add(token);
    });
  });
  return catalogTokens;
}

function findUnsupportedTerms(tokens, catalogTokens) {
  return tokens.filter((token) => !catalogTokens.has(token));
}

function queryAsksInStock(normalized) {
  return (
    /\b(in stock|in-stock|available)\b/.test(normalized)
    || (/\bstock\b/.test(normalized) && !/\bout of stock\b/.test(normalized))
  );
}

function queryAsksOutOfStock(normalized) {
  return /\b(out of stock|out-of-stock|unavailable)\b/.test(normalized);
}

function queryAsksRating(normalized) {
  return /\b(rating|ratings|star|stars|high rating|best rating|top rated)\b/.test(normalized);
}

function queryAsksPrice(normalized) {
  return /\b(price|prices|cost|how much|\$)\b/.test(normalized);
}

function queryAsksDelivery(normalized) {
  return /\bdelivery\b/.test(normalized) || /\bshipping\b/.test(normalized);
}

function retrieveByStructuredFilters(records, structured, queryInfo, limit) {
  const { original, normalized } = queryInfo;

  const filtered = records.filter((product) => productMatchesStructured(product, structured));
  const sorted = sortStructuredMatches(filtered, structured);

  const matches = sorted.slice(0, limit).map((product) => ({
    product,
    score: 10,
    reasons: structuredMatchReasons(product, structured),
    matchedTerms: [],
  }));

  if (matches.length === 0) {
    return {
      query: original,
      normalizedQuery: normalized,
      matches: [],
      message: "No catalog products matched the requested filters.",
      unsupportedTerms: [],
    };
  }

  return {
    query: original,
    normalizedQuery: normalized,
    matches,
    message: `Found ${matches.length} catalog record(s) matching the requested filters.`,
    unsupportedTerms: [],
  };
}

function nameMatchesQuery(product, normalized, tokens) {
  const nameLower = product.name.toLowerCase();
  if (normalized.includes(nameLower)) return true;

  const nameParts = nameLower.split(" ").filter((part) => part.length >= 2);
  if (nameParts.length === 0) return false;

  const matchedParts = nameParts.filter(
    (part) => normalized.includes(part) || tokens.includes(part)
  );
  if (matchedParts.length === nameParts.length) return true;

  if (matchedParts.length > 0 && tokens.includes(nameParts[0])) return true;

  return false;
}

function scoreProduct(product, queryInfo) {
  const { normalized, tokens } = queryInfo;
  let score = 0;
  const reasons = [];
  const matchedTerms = [];

  const nameLower = product.name.toLowerCase();
  const haystack = `${product.searchText} ${product.blurb} ${nameLower}`;

  tokens.forEach((token) => {
    const variants = [token];
    if (token.endsWith("s") && token.length > 3) variants.push(token.slice(0, -1));
    else variants.push(`${token}s`);

    if (variants.some((variant) => haystack.includes(variant))) {
      score += 2;
      matchedTerms.push(token);
    }
  });

  if (nameMatchesQuery(product, normalized, tokens)) {
    score += 8;
    reasons.push("Product name matched the question");
  }

  if (queryAsksInStock(normalized)) {
    if (product.stockStatus === "in_stock") {
      score += 6;
      reasons.push("Listed as in stock in the catalog");
    } else {
      score -= 4;
    }
  }

  if (queryAsksOutOfStock(normalized)) {
    if (product.stockStatus === "out_of_stock") {
      score += 6;
      reasons.push("Listed as out of stock in the catalog");
    } else {
      score -= 4;
    }
  }

  if (queryAsksFastDelivery(normalized)) {
    if (product.fastDelivery) {
      score += 6;
      reasons.push("Fast delivery is available for this product");
    } else {
      score -= 2;
    }
  }

  if (queryAsksRating(normalized) && !parseStructuredQuery(normalized).ratingFilter) {
    score += product.ratings * 2;
    reasons.push(`Catalog rating is ${product.ratings} out of 5`);
  }

  if (queryAsksPrice(normalized)) {
    score += 3;
    reasons.push("Catalog includes price information");
    if (nameMatchesQuery(product, normalized, tokens)) {
      score += 4;
    }
  }

  if (queryAsksDelivery(normalized) && !queryAsksFastDelivery(normalized)) {
    score += 2;
    reasons.push("Catalog includes delivery day information");
  }

  return {
    score,
    reasons: [...new Set(reasons)],
    matchedTerms: [...new Set(matchedTerms)],
  };
}

function retrieveProducts(query, options = {}) {
  const minScore = options.minScore ?? DEFAULT_MIN_SCORE;
  const limit = options.limit ?? DEFAULT_LIMIT;
  const records = options.records ?? getProductKnowledgeBase();

  const queryInfo = normalizeQuery(query);
  const { original, normalized, tokens } = queryInfo;

  if (!normalized) {
    return {
      query: original,
      normalizedQuery: normalized,
      matches: [],
      message: "Please enter a question about products in the catalog.",
      unsupportedTerms: [],
    };
  }

  const structured = parseStructuredQuery(normalized);
  if (hasStructuredFilters(structured)) {
    return retrieveByStructuredFilters(records, structured, queryInfo, limit);
  }

  const catalogTokens = buildCatalogTokenSet(records);
  const unsupportedTerms = findUnsupportedTerms(tokens, catalogTokens);

  const scored = records.map((product) => {
    const { score, reasons, matchedTerms } = scoreProduct(product, queryInfo);
    return { product, score, reasons, matchedTerms };
  });

  let matches = scored
    .filter((entry) => entry.score >= minScore)
    .sort((a, b) => b.score - a.score || a.product.id - b.product.id)
    .slice(0, limit)
    .map((entry) => ({
      product: entry.product,
      score: entry.score,
      reasons: entry.reasons,
      matchedTerms: entry.matchedTerms,
    }));

  if (unsupportedTerms.length > 0 && matches.length === 0) {
    return {
      query: original,
      normalizedQuery: normalized,
      matches: [],
      message:
        `The catalog does not contain information about: ${unsupportedTerms.join(", ")}. `
        + "Answers must use catalog fields only (name, price, stock, delivery, rating).",
      unsupportedTerms,
    };
  }

  if (unsupportedTerms.length > 0 && matches.length > 0) {
    return {
      query: original,
      normalizedQuery: normalized,
      matches,
      message:
        "Retrieved catalog records for overlapping terms. "
        + `The catalog does not define: ${unsupportedTerms.join(", ")}.`,
      unsupportedTerms,
    };
  }

  if (matches.length === 0) {
    return {
      query: original,
      normalizedQuery: normalized,
      matches: [],
      message: "No catalog products matched this question strongly enough.",
      unsupportedTerms: [],
    };
  }

  return {
    query: original,
    normalizedQuery: normalized,
    matches,
    message: `Found ${matches.length} relevant catalog record(s) using keyword scoring.`,
    unsupportedTerms: [],
  };
}

module.exports = { normalizeQuery, parsePriceFilter, retrieveProducts };
