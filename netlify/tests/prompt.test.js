/**
 * Prompt instruction tests (no live LLM).
 * Run: node netlify/tests/prompt.test.js
 */
const assert = require("assert");
const {
  SYSTEM_INSTRUCTIONS,
  buildChatMessages,
} = require("../lib/llm/prompt.cjs");

function run() {
  let passed = 0;
  const check = (name, fn) => {
    fn();
    passed += 1;
    console.log(`OK ${name}`);
  };

  check("system instructions require exact product names from context", () => {
    assert.ok(SYSTEM_INSTRUCTIONS.includes("exactly as it appears in the catalog context"));
    assert.ok(SYSTEM_INSTRUCTIONS.includes("Do not shorten names"));
    assert.ok(SYSTEM_INSTRUCTIONS.includes("merge similar names"));
    assert.ok(SYSTEM_INSTRUCTIONS.includes("substitute one retrieved product for another"));
  });

  check("system instructions forbid non-context products and substitution", () => {
    assert.ok(SYSTEM_INSTRUCTIONS.includes("not listed in the catalog context"));
    assert.ok(SYSTEM_INSTRUCTIONS.includes("available retrieved results are limited"));
    assert.ok(SYSTEM_INSTRUCTIONS.includes("inventing or substituting products"));
  });

  check("buildChatMessages still embeds catalog context and question", () => {
    const messages = buildChatMessages("Show me products with fast delivery", [
      {
        id: 5,
        name: "Macbook Air 2022",
        price: 499,
        inStock: 0,
        stockStatus: "out_of_stock",
        fastDelivery: true,
        deliveryDays: 2,
        ratings: 3,
        blurb: "Macbook Air 2022 is listed at $499.",
      },
    ]);
    assert.strictEqual(messages[0].content, SYSTEM_INSTRUCTIONS);
    assert.ok(messages[1].content.includes("Macbook Air 2022"));
    assert.ok(messages[1].content.includes("CATALOG CONTEXT"));
  });

  console.log(`\n${passed} prompt tests passed.`);
}

run();
