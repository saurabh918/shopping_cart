/**
 * Local handler tests (no Netlify CLI or live LLM calls).
 * Run: npm run test:ask-api
 */
const assert = require("assert");
const {
  handler,
  __setLlmClientForTests,
  __resetLlmClientForTests,
} = require("../functions/ask");
const {
  buildChatMessages,
  MAX_CONTEXT_PRODUCTS,
  SYSTEM_INSTRUCTIONS,
} = require("../lib/llm/prompt.cjs");
const { handleAskRequest } = require("../lib/askOrchestrator.cjs");
const { retrieveProducts: retrieveProductsServer } = require("../lib/retrieveProducts.cjs");

async function invoke(body, method = "POST") {
  const event = {
    httpMethod: method,
    body: body == null ? null : JSON.stringify(body),
    isBase64Encoded: false,
  };
  const result = await handler(event);
  return {
    statusCode: result.statusCode,
    body: JSON.parse(result.body),
  };
}

function createMockLlm({ configured = true, answer = "Mocked catalog answer.", shouldFail = false } = {}) {
  const calls = [];
  return {
    calls,
    client: {
      isConfigured: () => configured,
      getConfig: () => ({ provider: "groq", model: "test-model", hasApiKey: configured }),
      generateAnswer: async (payload) => {
        calls.push(payload);
        if (shouldFail) {
          const error = new Error("Provider request failed.");
          error.code = "LLM_PROVIDER_ERROR";
          throw error;
        }
        if (answer == null || answer === "") {
          const error = new Error("Provider returned an empty answer.");
          error.code = "LLM_EMPTY_RESPONSE";
          throw error;
        }
        return answer;
      },
    },
  };
}

async function run() {
  let passed = 0;
  const { __resetCatalogCacheForTests } = require("../lib/catalog.cjs");
  const priorCatalogMode = process.env.ASSISTANT_CATALOG_MODE;
  delete process.env.ASSISTANT_CATALOG_MODE;
  __resetCatalogCacheForTests();

  const check = async (name, fn) => {
    await fn();
    passed += 1;
    console.log(`OK ${name}`);
  };

  __resetLlmClientForTests();

  await check("rejects GET", async () => {
    const res = await invoke({ question: "test" }, "GET");
    assert.strictEqual(res.statusCode, 405);
    assert.strictEqual(res.body.success, false);
  });

  await check("missing body", async () => {
    const res = await invoke(null);
    assert.strictEqual(res.statusCode, 400);
  });

  await check("invalid JSON", async () => {
    const event = { httpMethod: "POST", body: "{not-json", isBase64Encoded: false };
    const result = await handler(event);
    assert.strictEqual(result.statusCode, 400);
  });

  await check("missing question", async () => {
    const res = await invoke({});
    assert.strictEqual(res.statusCode, 400);
  });

  await check("empty question", async () => {
    const res = await invoke({ question: "" });
    assert.strictEqual(res.statusCode, 400);
  });

  await check("whitespace question", async () => {
    const res = await invoke({ question: "   " });
    assert.strictEqual(res.statusCode, 400);
  });

  await check("question too long", async () => {
    const res = await invoke({ question: "a".repeat(501) });
    assert.strictEqual(res.statusCode, 400);
  });

  await check("invalid question type", async () => {
    const res = await invoke({ question: 123 });
    assert.strictEqual(res.statusCode, 400);
  });

  await check("in stock question retrieval matches", async () => {
    const res = await invoke({ question: "Which products are available?" }, "POST");
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.matches.length > 0);
    assert.ok(res.body.answerSource);
    assert.ok(typeof res.body.answer === "string");
  });

  await check("price question retrieval", async () => {
    const res = await invoke({ question: "What is the price of iPhone 6S?" });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.matches[0].product.id, 0);
  });

  await check("stock question retrieval", async () => {
    const res = await invoke({ question: "Which products are in stock?" });
    assert.strictEqual(res.statusCode, 200);
    const ids = res.body.matches.map((m) => m.product.id);
    assert.ok(ids.includes(0));
    assert.ok(!ids.includes(4));
  });

  await check("delivery question retrieval", async () => {
    const res = await invoke({ question: "Which product has fast delivery?" });
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.matches.every((m) => m.product.fastDelivery));
  });

  await check("price filter under 500 server retrieval", async () => {
    const result = retrieveProductsServer("Show me products under 500", { limit: 10 });
    assert.ok(result.matches.length > 0);
    assert.ok(result.matches.every((m) => m.product.price < 500));
    const ids = result.matches.map((m) => m.product.id);
    assert.ok(ids.includes(1));
    assert.ok(ids.includes(5));
    assert.ok(!ids.includes(0));
  });

  await check("price filter over 1000 server retrieval", async () => {
    const result = retrieveProductsServer("Products over 1000", { limit: 10 });
    assert.strictEqual(result.matches.length, 1);
    assert.strictEqual(result.matches[0].product.price, 1499);
  });

  await check("price filter under 500 via ask handler", async () => {
    const res = await invoke({ question: "Show me products under 500" });
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.matches.length > 0);
    assert.ok(res.body.matches.every((m) => m.product.price < 500));
  });

  await check("iphone product line server retrieval", async () => {
    const result = retrieveProductsServer("Show me iPhone products", { limit: 10 });
    const ids = result.matches.map((m) => m.product.id);
    assert.ok(ids.includes(0));
    assert.ok(ids.includes(1));
    assert.ok(!ids.includes(2));
  });

  await check("camera unsupported retrieval fallback", async () => {
    const res = await invoke({ question: "Which phone has the best camera?" });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.matches.length, 0);
    assert.ok(res.body.unsupportedTerms.includes("camera"));
    assert.strictEqual(res.body.answerSource, "retrieval-fallback");
    assert.ok(res.body.answer.includes("catalog"));
  });

  await check("no strong match retrieval fallback", async () => {
    const res = await invoke({ question: "xyzzy plugh" });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.matches.length, 0);
    assert.strictEqual(res.body.answerSource, "retrieval-fallback");
  });

  await check("missing API key uses configuration fallback", async () => {
    const result = await handleAskRequest("What is the price of iPhone 6S?", {
      llmClient: createMockLlm({ configured: false }).client,
    });
    assert.strictEqual(result.answerSource, "configuration-fallback");
    assert.ok(result.matches.length > 0);
    assert.ok(result.answer.includes("not configured"));
  });

  await check("relevant matches trigger mocked LLM", async () => {
    const mock = createMockLlm({ answer: "The iPhone 6S is listed at $799 in the catalog." });
    __setLlmClientForTests(mock.client);
    const res = await invoke({ question: "What is the price of iPhone 6S?" });
    assert.strictEqual(res.body.answerSource, "llm");
    assert.strictEqual(res.body.answer, "The iPhone 6S is listed at $799 in the catalog.");
    assert.strictEqual(mock.calls.length, 1);
    assert.ok(mock.calls[0].products.length >= 1);
    assert.ok(mock.calls[0].products.length <= MAX_CONTEXT_PRODUCTS);
    assert.strictEqual(mock.calls[0].products[0].id, 0);
    __resetLlmClientForTests();
  });

  await check("no matches do not trigger mocked LLM", async () => {
    const mock = createMockLlm();
    __setLlmClientForTests(mock.client);
    const res = await invoke({ question: "Which phone has the best camera?" });
    assert.strictEqual(mock.calls.length, 0);
    assert.strictEqual(res.body.answerSource, "retrieval-fallback");
    __resetLlmClientForTests();
  });

  await check("provider failure preserves matches", async () => {
    const mock = createMockLlm({ shouldFail: true });
    __setLlmClientForTests(mock.client);
    const res = await invoke({ question: "What is the price of iPhone 6S?" });
    assert.strictEqual(res.body.answerSource, "provider-error-fallback");
    assert.ok(res.body.matches.length > 0);
    assert.ok(res.body.answer.includes("unavailable"));
    __resetLlmClientForTests();
  });

  await check("empty provider response uses fallback", async () => {
    const mock = createMockLlm({ answer: "" });
    __setLlmClientForTests(mock.client);
    const res = await invoke({ question: "What is the price of iPhone 6S?" });
    assert.strictEqual(res.body.answerSource, "provider-error-fallback");
    __resetLlmClientForTests();
  });

  await check("response does not expose API key", async () => {
    const mock = createMockLlm({ answer: "Safe answer." });
    __setLlmClientForTests(mock.client);
    const res = await invoke({ question: "What is the price of iPhone 6S?" });
    const serialized = JSON.stringify(res.body);
    assert.ok(!serialized.includes("LLM_API_KEY"));
    assert.ok(!serialized.includes("your_api_key"));
    __resetLlmClientForTests();
  });

  await check("request body catalogMode staging cannot override production env", async () => {
    const res = await invoke({
      question: "Show me laptops under 500",
      catalogMode: "staging",
    });
    assert.strictEqual(res.statusCode, 200);
    const ids = res.body.matches.map((m) => m.product.id);
    assert.deepStrictEqual(ids, [5]);
  });

  await check("request body catalogMode production cannot override staging env", async () => {
    const prior = process.env.ASSISTANT_CATALOG_MODE;
    process.env.ASSISTANT_CATALOG_MODE = "staging";
    __resetCatalogCacheForTests();
    try {
      const res = await invoke({
        question: "Show me laptops under 500",
        catalogMode: "production",
      });
      assert.strictEqual(res.statusCode, 200);
      const ids = res.body.matches.map((m) => m.product.id);
      assert.ok(ids.length > 0);
      assert.ok(ids.every((id) => id > 5));
    } finally {
      if (prior === undefined) delete process.env.ASSISTANT_CATALOG_MODE;
      else process.env.ASSISTANT_CATALOG_MODE = prior;
      __resetCatalogCacheForTests();
    }
  });

  await check("invalid ASSISTANT_CATALOG_MODE returns 503 without filesystem paths", async () => {
    const { __resetCatalogCacheForTests } = require("../lib/catalog.cjs");
    const prior = process.env.ASSISTANT_CATALOG_MODE;
    process.env.ASSISTANT_CATALOG_MODE = "not-a-mode";
    try {
      const res = await invoke({ question: "What is the price of iPhone 6S?" });
      assert.strictEqual(res.statusCode, 503);
      assert.strictEqual(res.body.success, false);
      assert.ok(String(res.body.error).includes("ASSISTANT_CATALOG_MODE"));
      assert.ok(!String(res.body.error).includes(":\\"));
      assert.ok(!String(res.body.error).includes("/lib/"));
    } finally {
      if (prior === undefined) delete process.env.ASSISTANT_CATALOG_MODE;
      else process.env.ASSISTANT_CATALOG_MODE = prior;
      __resetCatalogCacheForTests();
    }
  });

  await check("product context limited to max products", async () => {
    const mock = createMockLlm({ answer: "Summary of in-stock items." });
    __setLlmClientForTests(mock.client);
    await invoke({ question: "Which products are in stock?" });
    assert.ok(mock.calls[0].products.length <= MAX_CONTEXT_PRODUCTS);
    __resetLlmClientForTests();
  });

  await check("prompt contains grounded instructions and context", async () => {
    const messages = buildChatMessages("What is the price of iPhone 6S?", [
      {
        id: 0,
        name: "iPhone 6S",
        price: 799,
        inStock: 3,
        stockStatus: "in_stock",
        fastDelivery: true,
        deliveryDays: 1,
        ratings: 4,
        blurb: "iPhone 6S is listed at $799.",
      },
    ]);
    assert.strictEqual(messages[0].role, "system");
    assert.ok(messages[0].content.includes("Never invent"));
    assert.ok(messages[1].content.includes("iPhone 6S"));
    assert.ok(messages[1].content.includes("What is the price of iPhone 6S?"));
    assert.ok(SYSTEM_INSTRUCTIONS.includes("catalog context"));
    assert.ok(SYSTEM_INSTRUCTIONS.includes("exactly as it appears in the catalog context"));
    assert.ok(SYSTEM_INSTRUCTIONS.includes("not listed in the catalog context"));
  });

  if (priorCatalogMode === undefined) delete process.env.ASSISTANT_CATALOG_MODE;
  else process.env.ASSISTANT_CATALOG_MODE = priorCatalogMode;
  __resetCatalogCacheForTests();

  console.log(`\n${passed} handler tests passed.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

