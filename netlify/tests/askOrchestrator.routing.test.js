/**
 * Orchestrator intent routing tests (mocked retrieval/LLM).
 * Run: node netlify/tests/askOrchestrator.routing.test.js
 */
const assert = require("assert");
const { handleAskRequest } = require("../lib/askOrchestrator.cjs");

function createMockLlm({
  configured = true,
  answer = "Mocked answer.",
  generalAnswer = "Mocked general knowledge answer.",
  mixedAnswer =
    "GENERAL EXPLANATION\nLaptops are portable computers you can use on the go.\n\n"
    + "CATALOG RESULTS\nMatching products from this store are listed in the retrieved matches below.",
  shouldFail = false,
  failMixedOnly = false,
} = {}) {
  const productCalls = [];
  const generalCalls = [];
  const mixedCalls = [];

  const maybeFail = (failScope) => {
    if (shouldFail || (failMixedOnly && failScope === "mixed")) {
      const error = new Error("Provider request failed.");
      error.code = "LLM_PROVIDER_ERROR";
      throw error;
    }
  };

  return {
    productCalls,
    generalCalls,
    mixedCalls,
    client: {
      isConfigured: () => configured,
      getConfig: () => ({ provider: "groq", model: "test-model", hasApiKey: configured }),
      generateAnswer: async (payload) => {
        productCalls.push(payload);
        maybeFail("product");
        return answer;
      },
      generateGeneralKnowledgeAnswer: async (payload) => {
        generalCalls.push(payload);
        maybeFail("general");
        return generalAnswer;
      },
      generateMixedAnswer: async (payload) => {
        mixedCalls.push(payload);
        maybeFail("mixed");
        return mixedAnswer;
      },
    },
  };
}

async function run() {
  let passed = 0;

  const check = async (name, fn) => {
    await fn();
    passed += 1;
    console.log(`OK ${name}`);
  };

  await check("Hi uses GREETING path without retrieval or LLM", async () => {
    let retrieveCalled = false;
    const mock = createMockLlm();
    const result = await handleAskRequest("Hi", {
      llmClient: mock.client,
      retrieveProductsFn: () => {
        retrieveCalled = true;
        return { query: "", normalizedQuery: "", matches: [], message: "", unsupportedTerms: [] };
      },
    });
    assert.strictEqual(result.answerSource, "greeting");
    assert.strictEqual(result.matches.length, 0);
    assert.ok(result.answer.includes("I can help you explore products"));
    assert.strictEqual(retrieveCalled, false);
    assert.strictEqual(mock.productCalls.length, 0);
    assert.strictEqual(mock.generalCalls.length, 0);
  });

  await check("Hello uses GREETING path", async () => {
    const result = await handleAskRequest("Hello", {
      llmClient: createMockLlm().client,
      retrieveProductsFn: () => {
        throw new Error("retrieveProducts should not run");
      },
    });
    assert.strictEqual(result.answerSource, "greeting");
    assert.strictEqual(result.matches.length, 0);
  });

  await check("What is a laptop? uses GENERAL_KNOWLEDGE path", async () => {
    let retrieveCalled = false;
    const mock = createMockLlm();
    const result = await handleAskRequest("What is a laptop?", {
      llmClient: mock.client,
      retrieveProductsFn: () => {
        retrieveCalled = true;
        return { query: "", normalizedQuery: "", matches: [], message: "", unsupportedTerms: [] };
      },
    });
    assert.strictEqual(result.answerSource, "general-knowledge");
    assert.strictEqual(result.matches.length, 0);
    assert.strictEqual(retrieveCalled, false);
    assert.strictEqual(mock.generalCalls.length, 1);
    assert.strictEqual(mock.productCalls.length, 0);
  });

  await check("What is RAM? uses GENERAL_KNOWLEDGE path", async () => {
    const mock = createMockLlm();
    const result = await handleAskRequest("What is RAM?", { llmClient: mock.client });
    assert.strictEqual(result.answerSource, "general-knowledge");
    assert.strictEqual(mock.generalCalls.length, 1);
  });

  await check("iPhone price keeps PRODUCT_SPECIFIC retrieval path", async () => {
    const mock = createMockLlm({ answer: "The iPhone 6S is listed at $799." });
    const result = await handleAskRequest("What is the price of iPhone 6S?", {
      llmClient: mock.client,
    });
    assert.ok(result.matches.length > 0);
    assert.strictEqual(result.matches[0].product.id, 0);
    assert.strictEqual(result.answerSource, "llm");
    assert.strictEqual(mock.productCalls.length, 1);
    assert.strictEqual(mock.generalCalls.length, 0);
  });

  await check("Show me laptops keeps PRODUCT_SEARCH retrieval path", async () => {
    const mock = createMockLlm({ answer: "Here are some laptops from the catalog." });
    const result = await handleAskRequest("Show me laptops", { llmClient: mock.client });
    assert.ok(result.matches.length > 0);
    assert.strictEqual(mock.productCalls.length, 1);
    assert.strictEqual(mock.generalCalls.length, 0);
    assert.strictEqual(mock.mixedCalls.length, 0);
  });

  await check("MacBook mixed query uses retrieval and mixed LLM path", async () => {
    let retrieveCalled = false;
    const mock = createMockLlm();
    const question = "What is a MacBook and which MacBooks do you have?";
    const result = await handleAskRequest(question, {
      llmClient: mock.client,
      retrieveProductsFn: (q, opts) => {
        retrieveCalled = true;
        const { retrieveProducts } = require("../lib/retrieveProducts.cjs");
        return retrieveProducts(q, opts);
      },
    });
    assert.strictEqual(retrieveCalled, true);
    assert.strictEqual(mock.mixedCalls.length, 1);
    assert.strictEqual(mock.mixedCalls[0].question, question);
    assert.ok(Array.isArray(mock.mixedCalls[0].products));
    assert.strictEqual(mock.productCalls.length, 0);
    assert.strictEqual(mock.generalCalls.length, 0);
    assert.strictEqual(result.answerSource, "mixed");
    assert.ok(result.matches.length > 0);
  });

  await check("laptop under 1000 mixed query uses mixed path", async () => {
    const mock = createMockLlm();
    const result = await handleAskRequest("What is a laptop and show me laptops under $1000", {
      llmClient: mock.client,
    });
    assert.strictEqual(result.answerSource, "mixed");
    assert.strictEqual(mock.mixedCalls.length, 1);
    assert.ok(result.matches.length > 0);
  });

  await check("mixed query with zero matches still calls mixed LLM", async () => {
    const mock = createMockLlm({
      mixedAnswer:
        "GENERAL EXPLANATION\nThey are portable computers from a well-known maker.\n\n"
        + "CATALOG RESULTS\nNo matching products were found in the current catalog.",
    });
    const result = await handleAskRequest("What is a MacBook and which MacBooks do you have?", {
      llmClient: mock.client,
      retrieveProductsFn: () => ({
        query: "macbook",
        normalizedQuery: "macbook",
        matches: [],
        message: "No matches",
        unsupportedTerms: [],
      }),
    });
    assert.strictEqual(result.matches.length, 0);
    assert.strictEqual(result.answerSource, "mixed");
    assert.strictEqual(mock.mixedCalls.length, 1);
    assert.strictEqual(mock.mixedCalls[0].products.length, 0);
    assert.ok(result.answer.includes("CATALOG RESULTS"));
  });

  await check("mixed query provider failure uses safe fallback", async () => {
    const mock = createMockLlm({ failMixedOnly: true });
    const result = await handleAskRequest("What is a MacBook and which MacBooks do you have?", {
      llmClient: mock.client,
    });
    assert.strictEqual(result.answerSource, "provider-error-fallback");
    assert.ok(result.matches.length > 0);
    assert.ok(result.answer.includes("could not generate"));
  });

  await check("mixed query configuration fallback", async () => {
    const result = await handleAskRequest("What is a MacBook and which MacBooks do you have?", {
      llmClient: createMockLlm({ configured: false }).client,
    });
    assert.strictEqual(result.answerSource, "configuration-fallback");
    assert.ok(result.matches.length > 0);
    assert.ok(result.answer.includes("not configured"));
  });

  await check("GENERAL_KNOWLEDGE configuration fallback", async () => {
    const result = await handleAskRequest("What is SSD?", {
      llmClient: createMockLlm({ configured: false }).client,
    });
    assert.strictEqual(result.answerSource, "configuration-fallback");
    assert.strictEqual(result.matches.length, 0);
    assert.ok(result.answer.includes("not configured"));
  });

  await check("GENERAL_KNOWLEDGE provider-error fallback", async () => {
    const result = await handleAskRequest("What is SSD?", {
      llmClient: createMockLlm({ shouldFail: true }).client,
    });
    assert.strictEqual(result.answerSource, "provider-error-fallback");
    assert.strictEqual(result.matches.length, 0);
  });

  await check("product path configuration fallback unchanged", async () => {
    const result = await handleAskRequest("What is the price of iPhone 6S?", {
      llmClient: createMockLlm({ configured: false }).client,
    });
    assert.strictEqual(result.answerSource, "configuration-fallback");
    assert.ok(result.matches.length > 0);
  });

  console.log(`\n${passed} orchestrator routing tests passed.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
