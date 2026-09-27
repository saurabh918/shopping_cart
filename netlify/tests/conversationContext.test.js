/**
 * Conversation context and follow-up helpers.
 * Run: node netlify/tests/conversationContext.test.js
 */
const assert = require("assert");
const { getProductKnowledgeBase } = require("../lib/catalog.cjs");
const {
  sanitizeHistory,
  sanitizeContextProductIds,
  validateContextProductIds,
  detectProductFollowUp,
  detectFollowUpOperation,
  applyFollowUpOperation,
  hasRecentProductContext,
  buildExpandedRetrievalQuery,
  resolveProductsByIds,
} = require("../lib/conversationContext.cjs");
const { handleAskRequest } = require("../lib/askOrchestrator.cjs");
const { classifyIntent } = require("../lib/intentRouter.cjs");

async function run() {
  let passed = 0;
  const check = async (name, fn) => {
    await fn();
    passed += 1;
    console.log(`OK ${name}`);
  };

  const records = getProductKnowledgeBase(process.env);

  await check("sanitizeHistory truncates to 6 messages", () => {
    const raw = [];
    for (let i = 0; i < 10; i += 1) {
      raw.push({ role: "user", content: `msg ${i}` });
    }
    const out = sanitizeHistory(raw);
    assert.strictEqual(out.length, 6);
    assert.strictEqual(out[0].content, "msg 4");
  });

  await check("sanitizeHistory ignores malformed entries", () => {
    const out = sanitizeHistory([
      null,
      { role: "system", content: "nope" },
      { role: "user", content: 123 },
      { role: "user", content: "valid" },
      "bad",
    ]);
    assert.strictEqual(out.length, 1);
    assert.strictEqual(out[0].content, "valid");
  });

  await check("sanitizeHistory treats non-array as empty", () => {
    assert.deepStrictEqual(sanitizeHistory("nope"), []);
    assert.deepStrictEqual(sanitizeHistory({}), []);
  });

  await check("context product ids dedupe and cap at 10", () => {
    const ids = sanitizeContextProductIds([2, 2, 3, "x", 3.5, ...Array.from({ length: 12 }, (_, i) => i)]);
    assert.strictEqual(ids.length, 10);
    assert.ok(ids.includes(2));
    assert.ok(!ids.includes("x"));
  });

  await check("validateContextProductIds drops unknown ids", () => {
    const valid = validateContextProductIds([2, 999999, 3], records);
    assert.deepStrictEqual(valid, [2, 3]);
  });

  await check("detectProductFollowUp requires phrasing", () => {
    assert.strictEqual(detectProductFollowUp("Which one is cheapest?"), true);
    assert.strictEqual(detectProductFollowUp("Show me MacBooks"), false);
  });

  await check("applyFollowUpOperation cheapest uses catalog prices", () => {
    const macbooks = resolveProductsByIds(records, [2, 3, 4, 5]);
    const sorted = applyFollowUpOperation(macbooks, "cheapest", [2, 3, 4, 5]);
    assert.strictEqual(sorted[0].name, "Macbook Air 2022");
    assert.strictEqual(sorted[0].price, 499);
  });

  await check("applyFollowUpOperation highest rating", () => {
    const macbooks = resolveProductsByIds(records, [2, 3, 4, 5]);
    const sorted = applyFollowUpOperation(macbooks, "highest_rating", [2, 3, 4, 5]);
    assert.strictEqual(sorted[0].name, "Macbook Air");
    assert.strictEqual(sorted[0].ratings, 4);
  });

  await check("hasRecentProductContext uses history product query", () => {
    const history = [
      { role: "user", content: "Show me MacBooks" },
      { role: "assistant", content: "Here are MacBooks." },
    ];
    assert.strictEqual(
      hasRecentProductContext(history, [], classifyIntent),
      true
    );
    assert.strictEqual(hasRecentProductContext([], [], classifyIntent), false);
  });

  await check("expanded retrieval query combines prior user question", () => {
    const q = buildExpandedRetrievalQuery(
      [{ role: "user", content: "Show me MacBooks" }],
      "Which one is cheapest?"
    );
    assert.ok(q.includes("Show me MacBooks"));
    assert.ok(q.includes("cheapest"));
  });

  await check("MacBooks then cheapest follow-up resolves grounded matches", async () => {
    const mockAnswer = "Macbook Air 2022 is the lowest-priced MacBook in this set at $499.";
    const mock = {
      isConfigured: () => true,
      getConfig: () => ({ provider: "groq", model: "test", hasApiKey: true }),
      generateAnswer: async ({ products }) => {
        assert.ok(products.some((p) => p.name === "Macbook Air 2022"));
        return mockAnswer;
      },
      generateGeneralKnowledgeAnswer: async () => "gk",
      generateGeneralConversationAnswer: async () => "conv",
      generateMixedAnswer: async () => "mixed",
    };

    const turn1 = await handleAskRequest("Show me MacBooks", {
      llmClient: {
        ...mock,
        generateAnswer: async ({ products }) => {
          const names = products.map((p) => p.name).join(", ");
          return `Here are MacBooks from the catalog: ${names}.`;
        },
      },
      records,
    });
    assert.ok(turn1.matches.length > 0);
    const ids = turn1.matches.map((m) => m.product.id);

    const turn2 = await handleAskRequest("Which one is cheapest?", {
      llmClient: mock,
      records,
      history: [
        { role: "user", content: "Show me MacBooks" },
        { role: "assistant", content: turn1.answer || "MacBooks listed." },
      ],
      contextProductIds: ids,
    });
    assert.strictEqual(turn2.answerSource, "llm");
    assert.ok(turn2.matches.length > 0);
    assert.strictEqual(turn2.matches[0].product.name, "Macbook Air 2022");
  });

  await check("no history cheapest asks for clarification", async () => {
    const result = await handleAskRequest("Which one is cheapest?", {
      llmClient: {
        isConfigured: () => true,
        generateAnswer: async () => "should not run",
        generateGeneralKnowledgeAnswer: async () => "gk",
        generateGeneralConversationAnswer: async () => "conv",
        generateMixedAnswer: async () => "mixed",
      },
      records,
    });
    assert.strictEqual(result.matches.length, 0);
    assert.ok(result.answer.includes("which products"));
  });

  await check("GK follow-up receives history in prompt path", async () => {
    let capturedHistory;
    const mock = {
      isConfigured: () => true,
      generateGeneralKnowledgeAnswer: async ({ history }) => {
        capturedHistory = history;
        return "RAM helps laptops run programs smoothly.";
      },
      generateAnswer: async () => "product",
      generateGeneralConversationAnswer: async ({ history }) => {
        capturedHistory = history;
        return "Yes, RAM is important for laptops.";
      },
      generateMixedAnswer: async () => "mixed",
    };
    const result = await handleAskRequest("Is it important for laptops?", {
      llmClient: mock,
      records,
      history: [
        { role: "user", content: "What is RAM?" },
        { role: "assistant", content: "RAM is memory for active programs." },
      ],
    });
    assert.ok(
      result.answerSource === "general-knowledge"
      || result.answerSource === "general-conversation"
    );
    assert.ok(Array.isArray(capturedHistory));
    assert.strictEqual(capturedHistory.length, 2);
  });

  await check("MacBooks then RAM clears product context on server", async () => {
    const mock = {
      isConfigured: () => true,
      generateGeneralKnowledgeAnswer: async () => "RAM explanation.",
      generateAnswer: async () => "product",
      generateGeneralConversationAnswer: async () => "conv",
      generateMixedAnswer: async () => "mixed",
    };
    const result = await handleAskRequest("What is RAM?", {
      llmClient: mock,
      records,
      history: [
        { role: "user", content: "Show me MacBooks" },
        { role: "assistant", content: "MacBooks here." },
      ],
      contextProductIds: [2, 3, 4, 5],
    });
    assert.strictEqual(result.answerSource, "general-knowledge");
    assert.strictEqual(result.matches.length, 0);
  });

  console.log(`\n${passed} conversation context tests passed.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
