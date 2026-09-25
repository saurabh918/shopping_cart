/**
 * Live staging + LLM validation (local Netlify functions server or handler).
 * Safe metadata only. Run: node netlify/tests/live-staging-llm.validation.js
 */
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { mentionsOnlyRetrievedProducts } = require("../lib/askOrchestrator.cjs");
const { getProductKnowledgeBase } = require("../lib/catalog.cjs");

const BASE_URL = process.env.LIVE_ASK_BASE_URL || "http://localhost:8888";
const STAGING_ENV = { ASSISTANT_CATALOG_MODE: "staging" };
const PRODUCTION_ENV = { ASSISTANT_CATALOG_MODE: "production" };
const FAST_DELIVERY_QUERY = "Show me products with fast delivery";
const STRUCTURED_STAGING_QUERY = "Show me laptops under 500";

function loadDotEnv() {
  const envPath = path.join(__dirname, "..", "..", ".env");
  if (!fs.existsSync(envPath)) return false;
  fs.readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) return;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"'))
        || (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] == null || key === "ASSISTANT_CATALOG_MODE") {
        process.env[key] = value;
      }
    });
  return true;
}

async function postAsk(question, extraBody = {}) {
  const res = await fetch(`${BASE_URL}/.netlify/functions/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, ...extraBody }),
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { parseError: true, rawLength: text.length };
  }
  return { status: res.status, body };
}

function classifyFallback(body) {
  if (body.answerSource === "llm") {
    return { errorCategory: null, providerInvoked: true };
  }
  if (body.answerSource === "configuration-fallback") {
    return { errorCategory: "llm_not_configured", providerInvoked: false };
  }
  if (body.answerSource !== "provider-error-fallback") {
    return { errorCategory: "other", providerInvoked: false };
  }

  const message = String(body.message || "");
  const answer = String(body.answer || "");

  if (message.includes("mentioned products outside the retrieved context")) {
    return { errorCategory: "grounding_rejection", providerInvoked: true };
  }
  if (message.includes("AI generation failed")) {
    return { errorCategory: "orchestrator_provider_error", providerInvoked: true };
  }
  if (answer.includes("cannot provide a confident AI summary")) {
    return { errorCategory: "grounding_rejection", providerInvoked: true };
  }
  if (answer.includes("unavailable right now")) {
    return { errorCategory: "orchestrator_provider_error", providerInvoked: true };
  }
  return { errorCategory: "other_orchestrator_error", providerInvoked: true };
}

function groundingPassed(body, catalogEnv) {
  const matches = body.matches || [];
  if (body.answerSource !== "llm" || !matches.length || !body.answer) {
    return body.answerSource === "retrieval-fallback" ? "n/a" : false;
  }
  const retrieved = matches.map((m) => m.product).slice(0, 5);
  const allProducts = getProductKnowledgeBase(catalogEnv);
  return mentionsOnlyRetrievedProducts(body.answer, retrieved, allProducts);
}

function safeResponseMeta(label, status, body, catalogEnv) {
  const matches = body.matches || [];
  const ids = matches.map((m) => m.product.id);
  const { errorCategory, providerInvoked } = classifyFallback(body);
  const serialized = JSON.stringify(body);
  return {
    label,
    httpStatus: status,
    answerSource: body.answerSource || (body.success === false ? "error" : "unknown"),
    matchCount: matches.length,
    productIds: ids,
    maxProductId: ids.length ? Math.max(...ids) : null,
    minProductId: ids.length ? Math.min(...ids) : null,
    hasHighStagingId: ids.some((id) => id > 5),
    providerInvoked,
    errorCategory,
    groundingPassed: groundingPassed(body, catalogEnv),
    exposesPath: body.error ? /[\\/]lib[\\/]/.test(String(body.error)) : false,
    exposesSecret: serialized.includes("LLM_API_KEY") || /Bearer\s+[A-Za-z0-9._-]{20,}/.test(serialized),
    responseMessageSnippet: body.message
      ? String(body.message).slice(0, 80)
      : undefined,
  };
}

async function invokeHandler(body, envPatch = {}) {
  const { handler } = require("../functions/ask");
  const prior = { ...process.env };
  Object.assign(process.env, envPatch);
  const { __resetCatalogCacheForTests } = require("../lib/catalog.cjs");
  __resetCatalogCacheForTests();
  try {
    const event = {
      httpMethod: "POST",
      body: JSON.stringify(body),
      isBase64Encoded: false,
    };
    const result = await handler(event);
    return { status: result.statusCode, body: JSON.parse(result.body) };
  } finally {
    Object.keys(envPatch).forEach((key) => {
      if (prior[key] === undefined) delete process.env[key];
      else process.env[key] = prior[key];
    });
    __resetCatalogCacheForTests();
  }
}

async function main() {
  loadDotEnv();
  process.env.ASSISTANT_CATALOG_MODE = "staging";

  const meta = getProductKnowledgeBase(STAGING_ENV);
  const { createLlmClient } = require("../lib/llm/provider.cjs");
  const llmConfigured = createLlmClient().isConfigured();

  console.log(
    JSON.stringify(
      {
        setup: {
          stagingFileExists: fs.existsSync(
            path.join(__dirname, "..", "lib", "products.staging.json"),
          ),
          catalogProductCount: meta.length,
          serverCatalogMode: "staging",
          llmProviderConfigured: llmConfigured,
          askBaseUrl: BASE_URL,
        },
      },
      null,
      2,
    ),
  );

  const catalogOverrides = [];

  try {
    const stagingHttp = await postAsk(STRUCTURED_STAGING_QUERY, { catalogMode: "production" });
    catalogOverrides.push({
      case: "env_staging_body_catalogMode_production",
      via: "http",
      ...safeResponseMeta(
        STRUCTURED_STAGING_QUERY,
        stagingHttp.status,
        stagingHttp.body,
        STAGING_ENV,
      ),
      bodyCannotSwitchToProduction:
        stagingHttp.body.matches?.some((m) => m.product.id > 5) ?? false,
    });
  } catch (err) {
    catalogOverrides.push({
      case: "env_staging_body_catalogMode_production",
      fetchFailed: true,
      error: err.message,
    });
  }

  const stagingHandler = await invokeHandler(
    { question: STRUCTURED_STAGING_QUERY, catalogMode: "production" },
    STAGING_ENV,
  );
  catalogOverrides.push({
    case: "env_staging_body_catalogMode_production",
    via: "handler",
    ...safeResponseMeta(
      STRUCTURED_STAGING_QUERY,
      stagingHandler.status,
      stagingHandler.body,
      STAGING_ENV,
    ),
    bodyCannotSwitchToProduction:
      stagingHandler.body.matches?.some((m) => m.product.id > 5) ?? false,
  });

  const productionHandler = await invokeHandler(
    { question: STRUCTURED_STAGING_QUERY, catalogMode: "staging" },
    PRODUCTION_ENV,
  );
  catalogOverrides.push({
    case: "env_production_body_catalogMode_staging",
    via: "handler",
    ...safeResponseMeta(
      STRUCTURED_STAGING_QUERY,
      productionHandler.status,
      productionHandler.body,
      PRODUCTION_ENV,
    ),
    bodyCannotSwitchToStaging:
      (productionHandler.body.matches || []).every((m) => m.product.id <= 5),
    productionLaptopUnder500Only:
      JSON.stringify((productionHandler.body.matches || []).map((m) => m.product.id)) === "[5]",
  });

  console.log("CATALOG_MODE_OVERRIDE_TESTS", JSON.stringify(catalogOverrides, null, 2));

  const fastDeliveryRuns = [];
  for (let i = 1; i <= 5; i += 1) {
    try {
      const { status, body } = await postAsk(FAST_DELIVERY_QUERY);
      fastDeliveryRuns.push({
        run: i,
        ...safeResponseMeta(FAST_DELIVERY_QUERY, status, body, STAGING_ENV),
      });
    } catch (err) {
      fastDeliveryRuns.push({ run: i, fetchFailed: true, error: err.message });
    }
  }

  const llmSuccessCount = fastDeliveryRuns.filter((r) => r.answerSource === "llm").length;
  const fallbackCount = fastDeliveryRuns.filter(
    (r) => r.answerSource === "provider-error-fallback",
  ).length;
  const groundingRejectCount = fastDeliveryRuns.filter(
    (r) => r.errorCategory === "grounding_rejection",
  ).length;
  const providerErrorCount = fastDeliveryRuns.filter(
    (r) => r.errorCategory === "orchestrator_provider_error",
  ).length;

  console.log(
    "FAST_DELIVERY_FIVE_RUN",
    JSON.stringify(
      {
        summary: {
          totalRuns: 5,
          answerSourceLlm: llmSuccessCount,
          answerSourceProviderErrorFallback: fallbackCount,
          errorCategoryGroundingRejection: groundingRejectCount,
          errorCategoryOrchestratorProviderError: providerErrorCount,
        },
        runs: fastDeliveryRuns,
      },
      null,
      2,
    ),
  );

  const serialized = JSON.stringify({ catalogOverrides, fastDeliveryRuns });
  assert.ok(!serialized.includes("LLM_API_KEY"));
  assert.ok(!/sk-[a-zA-Z0-9]{10,}/.test(serialized));
  assert.ok(!catalogOverrides.some((t) => t.exposesPath));
  assert.ok(!catalogOverrides.some((t) => t.exposesSecret));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
