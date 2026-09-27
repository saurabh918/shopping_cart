const { retrieveProducts } = require("./retrieveProducts.cjs");
const {
  getProductKnowledgeBase,
  getCatalogMode,
  CatalogConfigurationError,
} = require("./catalog.cjs");
const { createLlmClient } = require("./llm/provider.cjs");
const { MAX_CONTEXT_PRODUCTS } = require("./llm/prompt.cjs");
const { logAssistantEvent } = require("./llm/diagnostics.cjs");
const { classifyIntent, INTENTS } = require("./intentRouter.cjs");
const {
  detectProductFollowUp,
  detectFollowUpOperation,
  applyFollowUpOperation,
  hasRecentProductContext,
  shouldClearProductContextForQuestion,
  isStandaloneProductQuery,
  historyContainsProductRelatedUserMessage,
  buildExpandedRetrievalQuery,
  resolveProductsByIds,
  productsToMatches,
  FOLLOW_UP_CLARIFICATION,
  sanitizeHistory,
  validateContextProductIds,
} = require("./conversationContext.cjs");

const GREETING_ANSWER =
  "Hi! 👋 I can help you explore products, compare options, or answer general questions about tech and shopping.";

function getContextProducts(matches) {
  return matches.slice(0, MAX_CONTEXT_PRODUCTS).map((entry) => entry.product);
}

function buildRetrievalFallbackAnswer(retrieval) {
  if (retrieval.unsupportedTerms?.length > 0) {
    return "I could not find catalog information to answer that question. "
      + "The current catalog does not include details about those topics.";
  }
  return "I could not find a matching product in the current catalog.";
}

function mentionsOnlyRetrievedProducts(answer, retrievedProducts, allProducts) {
  const answerLower = answer.toLowerCase();
  const retrievedNames = new Set(
    retrievedProducts.map((product) => product.name.toLowerCase())
  );

  return allProducts.every((product) => {
    const nameLower = product.name.toLowerCase();
    if (!answerLower.includes(nameLower)) return true;
    if (retrievedNames.has(nameLower)) return true;

    const coveredByMatchedRetrievedName = [...retrievedNames].some(
      (retrievedName) =>
        retrievedName !== nameLower
        && retrievedName.includes(nameLower)
        && answerLower.includes(retrievedName)
    );

    return coveredByMatchedRetrievedName;
  });
}

function buildCatalogConfigurationFailure(question, error) {
  return {
    success: false,
    error: error.message,
    query: question,
    normalizedQuery: "",
    matches: [],
    message: error.message,
    unsupportedTerms: [],
    answer: "The assistant catalog is not configured correctly.",
    answerSource: "configuration-fallback",
  };
}

function buildNonRetrievalSuccessResponse(question, { answer, answerSource, message }) {
  const trimmed = question.trim();
  return {
    success: true,
    query: trimmed,
    normalizedQuery: trimmed.toLowerCase().replace(/\s+/g, " "),
    matches: [],
    message,
    unsupportedTerms: [],
    answer,
    answerSource,
  };
}

function catalogModeForDiagnostics(env) {
  try {
    return getCatalogMode(env);
  } catch {
    const raw = env?.ASSISTANT_CATALOG_MODE;
    if (raw == null || String(raw).trim() === "") {
      return "production";
    }
    return "invalid";
  }
}

function emitDiagnostic(options, entry) {
  const env = options.env || process.env;
  const payload = {
    correlationId: options.correlationId,
    catalogMode: catalogModeForDiagnostics(env),
    ...entry,
  };
  if (typeof options.logEvent === "function") {
    logAssistantEvent(payload, options.logEvent);
    return;
  }
  logAssistantEvent(payload);
}

function isProductIntent(intent) {
  return (
    intent === INTENTS.PRODUCT_SEARCH
    || intent === INTENTS.PRODUCT_RECOMMENDATION
    || intent === INTENTS.PRODUCT_SPECIFIC
  );
}

async function handleMixedRequest(question, options, requestStartedAt) {
  const env = options.env || process.env;
  const runRetrieval = options.retrieveProductsFn || retrieveProducts;

  let records;
  try {
    records = options.records || getProductKnowledgeBase(env);
  } catch (err) {
    if (err instanceof CatalogConfigurationError || err.code === "CATALOG_CONFIGURATION_ERROR") {
      emitDiagnostic(options, {
        stage: "catalog_resolve",
        classification: "orchestrator_error",
        durationMs: Date.now() - requestStartedAt,
        answerSource: "configuration-fallback",
        intent: INTENTS.MIXED,
      });
      return buildCatalogConfigurationFailure(question, err);
    }
    throw err;
  }

  const retrieval = runRetrieval(question, { records });
  const baseResponse = {
    success: true,
    query: retrieval.query,
    normalizedQuery: retrieval.normalizedQuery,
    matches: retrieval.matches,
    message: retrieval.message,
    unsupportedTerms: retrieval.unsupportedTerms,
  };

  const llmClient = options.llmClient || createLlmClient({ env });
  const contextProducts = getContextProducts(retrieval.matches);
  const allProducts = options.allProducts || records;

  if (!llmClient.isConfigured()) {
    emitDiagnostic(options, {
      stage: "llm_config",
      classification: "orchestrator_error",
      durationMs: Date.now() - requestStartedAt,
      matchCount: retrieval.matches.length,
      answerSource: "configuration-fallback",
      intent: INTENTS.MIXED,
    });
    return {
      ...baseResponse,
      answer: "Mixed general and catalog answers are not configured yet. "
        + (retrieval.matches.length > 0
          ? "Please review the retrieved product matches below."
          : "Please set up the AI provider on the server."),
      answerSource: "configuration-fallback",
      message: "Mixed query handling requires AI generation, which is not configured.",
    };
  }

  const llmStartedAt = Date.now();
  try {
    const generated = await llmClient.generateMixedAnswer({
      question,
      products: contextProducts,
      history: options.history,
    });

    if (!mentionsOnlyRetrievedProducts(generated, contextProducts, allProducts)) {
      emitDiagnostic(options, {
        stage: "grounding_guard",
        classification: "grounding_rejection",
        durationMs: Date.now() - requestStartedAt,
        llmDurationMs: Date.now() - llmStartedAt,
        matchCount: retrieval.matches.length,
        contextProductCount: contextProducts.length,
        answerSource: "provider-error-fallback",
        intent: INTENTS.MIXED,
      });
      return {
        ...baseResponse,
        answer: "I found relevant information, but I cannot provide a confident mixed summary. "
          + (retrieval.matches.length > 0
            ? "Please review the retrieved product records below."
            : "Please try again or ask separate general and product questions."),
        answerSource: "provider-error-fallback",
        message: "The generated answer mentioned products outside the retrieved context.",
      };
    }

    emitDiagnostic(options, {
      stage: "complete",
      classification: null,
      durationMs: Date.now() - requestStartedAt,
      llmDurationMs: Date.now() - llmStartedAt,
      matchCount: retrieval.matches.length,
      answerSource: "mixed",
      intent: INTENTS.MIXED,
    });

    return {
      ...baseResponse,
      answer: generated,
      answerSource: "mixed",
      message: retrieval.matches.length > 0
        ? "Generated mixed general and catalog response."
        : "Generated mixed response with no catalog matches.",
    };
  } catch (err) {
    emitDiagnostic(options, {
      stage: "llm_generate",
      classification: err.classification || "orchestrator_error",
      providerErrorCode: err.code,
      providerHttpStatus: err.status,
      durationMs: Date.now() - requestStartedAt,
      llmDurationMs: Date.now() - llmStartedAt,
      matchCount: retrieval.matches.length,
      answerSource: "provider-error-fallback",
      intent: INTENTS.MIXED,
    });
    return {
      ...baseResponse,
      answer: "I could not generate a mixed answer right now. "
        + (retrieval.matches.length > 0
          ? "Please use the product matches below."
          : "Please try again in a moment."),
      answerSource: "provider-error-fallback",
      message: "Mixed AI generation failed.",
    };
  }
}

async function handleGeneralConversationRequest(question, options, requestStartedAt) {
  const llmClient = options.llmClient || createLlmClient({ env: options.env || process.env });

  if (!llmClient.isConfigured()) {
    emitDiagnostic(options, {
      stage: "llm_config",
      classification: "orchestrator_error",
      durationMs: Date.now() - requestStartedAt,
      matchCount: 0,
      answerSource: "configuration-fallback",
      intent: INTENTS.UNKNOWN,
    });
    return buildNonRetrievalSuccessResponse(question, {
      answer:
        "I can chat about general topics when the AI provider is configured. "
        + "For product questions, try asking about items in the catalog.",
      answerSource: "configuration-fallback",
      message: "General conversation is not configured.",
    });
  }

  const llmStartedAt = Date.now();
  try {
    const generated = await llmClient.generateGeneralConversationAnswer({
      question,
      history: options.history,
    });
    emitDiagnostic(options, {
      stage: "complete",
      classification: null,
      durationMs: Date.now() - requestStartedAt,
      llmDurationMs: Date.now() - llmStartedAt,
      matchCount: 0,
      answerSource: "general-conversation",
      intent: INTENTS.UNKNOWN,
    });
    return buildNonRetrievalSuccessResponse(question, {
      answer: generated,
      answerSource: "general-conversation",
      message: "Generated general conversation response.",
    });
  } catch (err) {
    emitDiagnostic(options, {
      stage: "llm_generate",
      classification: err.classification || "orchestrator_error",
      providerErrorCode: err.code,
      providerHttpStatus: err.status,
      durationMs: Date.now() - requestStartedAt,
      llmDurationMs: Date.now() - llmStartedAt,
      matchCount: 0,
      answerSource: "provider-error-fallback",
      intent: INTENTS.UNKNOWN,
    });
    return buildNonRetrievalSuccessResponse(question, {
      answer: "I could not reply right now. Please try again in a moment.",
      answerSource: "provider-error-fallback",
      message: "General conversation AI generation failed.",
    });
  }
}

async function handleGeneralKnowledgeRequest(question, options, requestStartedAt) {
  const llmClient = options.llmClient || createLlmClient({ env: options.env || process.env });

  if (!llmClient.isConfigured()) {
    emitDiagnostic(options, {
      stage: "llm_config",
      classification: "orchestrator_error",
      durationMs: Date.now() - requestStartedAt,
      matchCount: 0,
      answerSource: "configuration-fallback",
      intent: INTENTS.GENERAL_KNOWLEDGE,
    });
    return buildNonRetrievalSuccessResponse(question, {
      answer: "General-knowledge answers are not configured yet. Please set up the AI provider on the server.",
      answerSource: "configuration-fallback",
      message: "AI general-knowledge generation is not configured.",
    });
  }

  const llmStartedAt = Date.now();
  try {
    const generated = await llmClient.generateGeneralKnowledgeAnswer({
      question,
      history: options.history,
    });
    emitDiagnostic(options, {
      stage: "complete",
      classification: null,
      durationMs: Date.now() - requestStartedAt,
      llmDurationMs: Date.now() - llmStartedAt,
      matchCount: 0,
      answerSource: "general-knowledge",
      intent: INTENTS.GENERAL_KNOWLEDGE,
    });
    return buildNonRetrievalSuccessResponse(question, {
      answer: generated,
      answerSource: "general-knowledge",
      message: "Generated general-knowledge response.",
    });
  } catch (err) {
    emitDiagnostic(options, {
      stage: "llm_generate",
      classification: err.classification || "orchestrator_error",
      providerErrorCode: err.code,
      providerHttpStatus: err.status,
      durationMs: Date.now() - requestStartedAt,
      llmDurationMs: Date.now() - llmStartedAt,
      matchCount: 0,
      answerSource: "provider-error-fallback",
      intent: INTENTS.GENERAL_KNOWLEDGE,
    });
    return buildNonRetrievalSuccessResponse(question, {
      answer: "I could not generate a general-knowledge answer right now. Please try again in a moment.",
      answerSource: "provider-error-fallback",
      message: "General-knowledge AI generation failed.",
    });
  }
}

async function handleProductCatalogRequest(question, options, requestStartedAt) {
  const env = options.env || process.env;
  const runRetrieval = options.retrieveProductsFn || retrieveProducts;

  let records;
  try {
    records = options.records || getProductKnowledgeBase(env);
  } catch (err) {
    if (err instanceof CatalogConfigurationError || err.code === "CATALOG_CONFIGURATION_ERROR") {
      emitDiagnostic(options, {
        stage: "catalog_resolve",
        classification: "orchestrator_error",
        durationMs: Date.now() - requestStartedAt,
        answerSource: "configuration-fallback",
      });
      return buildCatalogConfigurationFailure(question, err);
    }
    throw err;
  }

  const retrieval = runRetrieval(question, { records });
  const baseResponse = {
    success: true,
    query: retrieval.query,
    normalizedQuery: retrieval.normalizedQuery,
    matches: retrieval.matches,
    message: retrieval.message,
    unsupportedTerms: retrieval.unsupportedTerms,
  };

  if (retrieval.matches.length === 0) {
    return {
      ...baseResponse,
      answer: buildRetrievalFallbackAnswer(retrieval),
      answerSource: "retrieval-fallback",
      message: "I could not find a matching product in the current catalog.",
    };
  }

  const llmClient = options.llmClient || createLlmClient({ env });
  const contextProducts = getContextProducts(retrieval.matches);
  const allProducts = options.allProducts || records;

  if (!llmClient.isConfigured()) {
    emitDiagnostic(options, {
      stage: "llm_config",
      classification: "orchestrator_error",
      durationMs: Date.now() - requestStartedAt,
      matchCount: retrieval.matches.length,
      answerSource: "configuration-fallback",
    });
    return {
      ...baseResponse,
      answer: "AI responses are not configured yet. Please review the retrieved catalog matches.",
      answerSource: "configuration-fallback",
      message: "Retrieved catalog matches are available, but AI generation is not configured.",
    };
  }

  const llmStartedAt = Date.now();
  try {
    const generated = await llmClient.generateAnswer({
      question,
      products: contextProducts,
      history: options.history,
    });

    if (!mentionsOnlyRetrievedProducts(generated, contextProducts, allProducts)) {
      emitDiagnostic(options, {
        stage: "grounding_guard",
        classification: "grounding_rejection",
        durationMs: Date.now() - requestStartedAt,
        llmDurationMs: Date.now() - llmStartedAt,
        matchCount: retrieval.matches.length,
        contextProductCount: contextProducts.length,
        answerSource: "provider-error-fallback",
      });
      return {
        ...baseResponse,
        answer: "I found relevant catalog items, but I cannot provide a confident AI summary. "
          + "Please review the retrieved product records.",
        answerSource: "provider-error-fallback",
        message: "The generated answer mentioned products outside the retrieved context.",
      };
    }

    emitDiagnostic(options, {
      stage: "complete",
      classification: null,
      durationMs: Date.now() - requestStartedAt,
      llmDurationMs: Date.now() - llmStartedAt,
      matchCount: retrieval.matches.length,
      answerSource: "llm",
    });

    return {
      ...baseResponse,
      answer: generated,
      answerSource: "llm",
      message: "Generated response based on retrieved catalog context.",
    };
  } catch (err) {
    emitDiagnostic(options, {
      stage: "llm_generate",
      classification: err.classification || "orchestrator_error",
      providerErrorCode: err.code,
      providerHttpStatus: err.status,
      durationMs: Date.now() - requestStartedAt,
      llmDurationMs: Date.now() - llmStartedAt,
      matchCount: retrieval.matches.length,
      answerSource: "provider-error-fallback",
    });
    return {
      ...baseResponse,
      answer: "I retrieved relevant catalog items, but the AI service is unavailable right now. "
        + "Please use the product matches below.",
      answerSource: "provider-error-fallback",
      message: "AI generation failed. Retrieved catalog matches are still included.",
    };
  }
}

async function handleProductFollowUpRequest(
  question,
  options,
  requestStartedAt,
  { validatedContextIds }
) {
  const env = options.env || process.env;
  const runRetrieval = options.retrieveProductsFn || retrieveProducts;
  const classifyFn = createIntentClassifier(options);
  const history = options.history || [];

  let records;
  try {
    records = options.records || getProductKnowledgeBase(env);
  } catch (err) {
    if (err instanceof CatalogConfigurationError || err.code === "CATALOG_CONFIGURATION_ERROR") {
      emitDiagnostic(options, {
        stage: "catalog_resolve",
        classification: "orchestrator_error",
        durationMs: Date.now() - requestStartedAt,
        answerSource: "configuration-fallback",
      });
      return buildCatalogConfigurationFailure(question, err);
    }
    throw err;
  }

  let contextIds = [...validatedContextIds];
  let products = resolveProductsByIds(records, contextIds);

  if (products.length === 0 && historyContainsProductRelatedUserMessage(history, classifyFn)) {
    const expandedQuery = buildExpandedRetrievalQuery(history, question);
    if (expandedQuery) {
      const retrieval = runRetrieval(expandedQuery, { records });
      products = retrieval.matches.map((entry) => entry.product).slice(0, 10);
      contextIds = products.map((product) => product.id);
    }
  }

  if (products.length === 0) {
    emitDiagnostic(options, {
      stage: "product_follow_up",
      durationMs: Date.now() - requestStartedAt,
      matchCount: 0,
      answerSource: "general-conversation",
    });
    return buildNonRetrievalSuccessResponse(question, {
      answer: FOLLOW_UP_CLARIFICATION,
      answerSource: "general-conversation",
      message: "Product follow-up lacked usable context.",
    });
  }

  const operation = detectFollowUpOperation(question);
  const resolvedProducts = applyFollowUpOperation(products, operation, contextIds);
  const effectiveProducts = resolvedProducts.length > 0 ? resolvedProducts : products;
  const matches = productsToMatches(effectiveProducts);
  const contextProducts = getContextProducts(matches);
  const allProducts = options.allProducts || records;

  const baseResponse = {
    success: true,
    query: question,
    normalizedQuery: question.toLowerCase().replace(/\s+/g, " "),
    matches,
    message: "Resolved product follow-up from conversation context.",
    unsupportedTerms: [],
  };

  const llmClient = options.llmClient || createLlmClient({ env });
  if (!llmClient.isConfigured()) {
    return {
      ...baseResponse,
      answer: "AI responses are not configured yet. Please review the product matches below.",
      answerSource: "configuration-fallback",
      message: "Product follow-up requires AI generation, which is not configured.",
    };
  }

  const llmStartedAt = Date.now();
  try {
    const generated = await llmClient.generateAnswer({
      question,
      products: contextProducts,
      history,
    });

    if (!mentionsOnlyRetrievedProducts(generated, contextProducts, allProducts)) {
      emitDiagnostic(options, {
        stage: "grounding_guard",
        classification: "grounding_rejection",
        durationMs: Date.now() - requestStartedAt,
        llmDurationMs: Date.now() - llmStartedAt,
        matchCount: matches.length,
        contextProductCount: contextProducts.length,
        answerSource: "provider-error-fallback",
      });
      return {
        ...baseResponse,
        answer: "I found relevant catalog items, but I cannot provide a confident AI summary. "
          + "Please review the product records below.",
        answerSource: "provider-error-fallback",
        message: "The generated answer mentioned products outside the retrieved context.",
      };
    }

    emitDiagnostic(options, {
      stage: "complete",
      classification: null,
      durationMs: Date.now() - requestStartedAt,
      llmDurationMs: Date.now() - llmStartedAt,
      matchCount: matches.length,
      answerSource: "llm",
    });

    return {
      ...baseResponse,
      answer: generated,
      answerSource: "llm",
      message: "Generated product follow-up response from validated catalog context.",
    };
  } catch (err) {
    emitDiagnostic(options, {
      stage: "llm_generate",
      classification: err.classification || "orchestrator_error",
      providerErrorCode: err.code,
      providerHttpStatus: err.status,
      durationMs: Date.now() - requestStartedAt,
      llmDurationMs: Date.now() - llmStartedAt,
      matchCount: matches.length,
      answerSource: "provider-error-fallback",
    });
    return {
      ...baseResponse,
      answer: "I resolved the products for your follow-up, but the AI service is unavailable right now. "
        + "Please use the product matches below.",
      answerSource: "provider-error-fallback",
      message: "Product follow-up AI generation failed.",
    };
  }
}

function createIntentClassifier(options) {
  if (options.classifyIntentFn) {
    return (q) => options.classifyIntentFn(q);
  }
  return (q) => classifyIntent(q);
}

function resolveConversationOptions(question, options) {
  const classifyFn = createIntentClassifier(options);
  const history = sanitizeHistory(options.history);

  let validatedContextIds = [];
  if (Array.isArray(options.contextProductIds) && options.contextProductIds.length > 0) {
    if (options.records) {
      validatedContextIds = validateContextProductIds(options.contextProductIds, options.records);
    } else {
      try {
        const records = getProductKnowledgeBase(options.env || process.env);
        validatedContextIds = validateContextProductIds(options.contextProductIds, records);
      } catch {
        validatedContextIds = [];
      }
    }
  }

  if (shouldClearProductContextForQuestion(question, classifyFn)) {
    validatedContextIds = [];
  }

  return { history, validatedContextIds, classifyFn };
}

async function handleAskRequest(question, options = {}) {
  const requestStartedAt = options.requestStartedAt ?? Date.now();
  const { history, validatedContextIds, classifyFn } = resolveConversationOptions(question, options);
  options = { ...options, history };

  const { intent } = classifyFn(question);

  if (
    !isStandaloneProductQuery(question, classifyFn)
    && detectProductFollowUp(question)
    && hasRecentProductContext(history, validatedContextIds, classifyFn)
  ) {
    return handleProductFollowUpRequest(question, options, requestStartedAt, {
      validatedContextIds,
    });
  }

  if (
    detectProductFollowUp(question)
    && !hasRecentProductContext(history, [], classifyFn)
    && !isStandaloneProductQuery(question, classifyFn)
  ) {
    emitDiagnostic(options, {
      stage: "product_follow_up_clarification",
      durationMs: Date.now() - requestStartedAt,
      matchCount: 0,
      answerSource: "general-conversation",
      intent,
    });
    return buildNonRetrievalSuccessResponse(question, {
      answer: FOLLOW_UP_CLARIFICATION,
      answerSource: "general-conversation",
      message: "Product follow-up without prior product context.",
    });
  }

  if (intent === INTENTS.GREETING) {
    emitDiagnostic(options, {
      stage: "intent_greeting",
      durationMs: Date.now() - requestStartedAt,
      matchCount: 0,
      answerSource: "greeting",
      intent,
    });
    return buildNonRetrievalSuccessResponse(question, {
      answer: GREETING_ANSWER,
      answerSource: "greeting",
      message: "Greeting response.",
    });
  }

  if (intent === INTENTS.GENERAL_KNOWLEDGE) {
    return handleGeneralKnowledgeRequest(question, options, requestStartedAt);
  }

  if (intent === INTENTS.MIXED) {
    return handleMixedRequest(question, options, requestStartedAt);
  }

  if (intent === INTENTS.UNKNOWN) {
    return handleGeneralConversationRequest(question, options, requestStartedAt);
  }

  if (isProductIntent(intent)) {
    return handleProductCatalogRequest(question, options, requestStartedAt);
  }

  return handleGeneralConversationRequest(question, options, requestStartedAt);
}

module.exports = {
  handleAskRequest,
  getContextProducts,
  buildRetrievalFallbackAnswer,
  mentionsOnlyRetrievedProducts,
  GREETING_ANSWER,
};
