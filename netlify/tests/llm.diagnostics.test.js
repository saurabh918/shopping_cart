/**
 * LLM diagnostics and provider error classification (no live API key).
 */
const assert = require("assert");
const {
  classifyProviderErrorCode,
  sanitizeLogEntry,
  logAssistantEvent,
  createCorrelationId,
} = require("../lib/llm/diagnostics.cjs");
const { createLlmClient } = require("../lib/llm/provider.cjs");
const { handleAskRequest } = require("../lib/askOrchestrator.cjs");

async function run() {
  let passed = 0;
  const check = (name, fn) => {
    fn();
    passed += 1;
    console.log(`OK ${name}`);
  };
  const checkAsync = async (name, fn) => {
    await fn();
    passed += 1;
    console.log(`OK ${name}`);
  };

  check("classifies provider error codes", () => {
    assert.strictEqual(classifyProviderErrorCode("LLM_TIMEOUT"), "provider_timeout");
    assert.strictEqual(classifyProviderErrorCode("LLM_BAD_RESPONSE"), "invalid_provider_response");
    assert.strictEqual(classifyProviderErrorCode("LLM_EMPTY_RESPONSE"), "empty_provider_content");
    assert.strictEqual(classifyProviderErrorCode("LLM_RATE_LIMIT", 429), "provider_http_error");
    assert.strictEqual(classifyProviderErrorCode("LLM_PROVIDER_ERROR", 500), "provider_http_error");
  });

  check("sanitizeLogEntry drops sensitive keys", () => {
    const safe = sanitizeLogEntry({
      correlationId: "abc",
      LLM_API_KEY: "secret",
      authorization: "Bearer secret",
      question: "hidden",
      products: [{ name: "x" }],
      classification: "provider_timeout",
    });
    assert.strictEqual(safe.correlationId, "abc");
    assert.strictEqual(safe.classification, "provider_timeout");
    assert.strictEqual(safe.LLM_API_KEY, undefined);
    assert.strictEqual(safe.authorization, undefined);
    assert.strictEqual(safe.question, undefined);
    assert.strictEqual(safe.products, undefined);
  });

  check("logAssistantEvent output excludes secrets", () => {
    const lines = [];
    logAssistantEvent(
      {
        correlationId: "test-id",
        classification: "provider_http_error",
        providerHttpStatus: 429,
        apiKey: "must-not-appear",
      },
      (line) => lines.push(line),
    );
    assert.strictEqual(lines.length, 1);
    assert.ok(!lines[0].includes("must-not-appear"));
    assert.ok(lines[0].includes("provider_http_error"));
  });

  check("createCorrelationId returns non-empty string", () => {
    const id = createCorrelationId();
    assert.ok(typeof id === "string" && id.length >= 8);
  });

  await checkAsync("provider attaches classification on HTTP error", async () => {
    const client = createLlmClient({
      env: {
        LLM_API_KEY: "test-key-not-real",
        LLM_PROVIDER: "groq",
        LLM_MODEL: "test-model",
      },
      fetchImpl: async () => ({
        ok: false,
        status: 503,
        text: async () => '{"error":"service unavailable"}',
      }),
    });
    try {
      await client.generateAnswer({ question: "q", products: [] });
      assert.fail("expected throw");
    } catch (err) {
      assert.strictEqual(err.code, "LLM_PROVIDER_ERROR");
      assert.strictEqual(err.status, 503);
      assert.strictEqual(err.classification, "provider_http_error");
      assert.ok(typeof err.durationMs === "number");
      assert.ok(!JSON.stringify(err).includes("test-key-not-real"));
    }
  });

  await checkAsync("orchestrator logs grounding_rejection without exposing answer", async () => {
    const logs = [];
    const mockClient = {
      isConfigured: () => true,
      generateAnswer: async () => "Macbook Air is a good choice.",
    };
    const result = await handleAskRequest("What is the price of iPhone 6S?", {
      records: [
        {
          id: 0,
          name: "iPhone 6S",
          price: 1,
          inStock: 1,
          fastDelivery: true,
          deliveryDays: 1,
          ratings: 4,
          stockStatus: "in_stock",
          blurb: "b",
          searchText: "s",
        },
        {
          id: 3,
          name: "Macbook Air",
          price: 2,
          inStock: 1,
          fastDelivery: false,
          deliveryDays: 2,
          ratings: 3,
          stockStatus: "in_stock",
          blurb: "b",
          searchText: "s",
        },
      ],
      llmClient: mockClient,
      correlationId: "corr-grounding",
      logEvent: (line) => logs.push(JSON.parse(line)),
    });
    assert.strictEqual(result.answerSource, "provider-error-fallback");
    assert.ok(logs.some((entry) => entry.classification === "grounding_rejection"));
    assert.ok(logs.every((entry) => entry.answer === undefined));
    assert.strictEqual(logs[0].correlationId, "corr-grounding");
  });

  await checkAsync("orchestrator logs provider failure metadata on generate error", async () => {
    const logs = [];
    const mockClient = {
      isConfigured: () => true,
      generateAnswer: async () => {
        const error = new Error("Provider request timed out.");
        error.code = "LLM_TIMEOUT";
        error.classification = "provider_timeout";
        error.durationMs = 42;
        throw error;
      },
    };
    const result = await handleAskRequest("What is the price of iPhone 6S?", {
      llmClient: mockClient,
      correlationId: "corr-timeout",
      logEvent: (line) => logs.push(JSON.parse(line)),
    });
    assert.strictEqual(result.answerSource, "provider-error-fallback");
    assert.ok(logs.some((e) => e.classification === "provider_timeout" && e.stage === "llm_generate"));
    assert.ok(!JSON.stringify(result).includes("classification"));
  });

  console.log(`\n${passed} llm.diagnostics tests passed.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
