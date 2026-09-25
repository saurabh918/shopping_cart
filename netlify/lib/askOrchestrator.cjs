const { retrieveProducts } = require("./retrieveProducts.cjs");
const {
  getProductKnowledgeBase,
  getCatalogMode,
  CatalogConfigurationError,
} = require("./catalog.cjs");
const { createLlmClient } = require("./llm/provider.cjs");
const { MAX_CONTEXT_PRODUCTS } = require("./llm/prompt.cjs");
const { logAssistantEvent } = require("./llm/diagnostics.cjs");

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

async function handleAskRequest(question, options = {}) {
  const env = options.env || process.env;
  const requestStartedAt = options.requestStartedAt ?? Date.now();

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

  const retrieval = retrieveProducts(question, { records });
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

module.exports = {
  handleAskRequest,
  getContextProducts,
  buildRetrievalFallbackAnswer,
  mentionsOnlyRetrievedProducts,
};
