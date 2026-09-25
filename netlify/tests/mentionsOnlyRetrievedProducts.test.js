/**
 * Unit tests for LLM answer product-name guard.
 * Run: node netlify/tests/mentionsOnlyRetrievedProducts.test.js
 */
const assert = require("assert");
const { getProductKnowledgeBase } = require("../lib/catalog.cjs");
const { mentionsOnlyRetrievedProducts } = require("../lib/askOrchestrator.cjs");

const retrievedPair = [
  { id: 1, name: "iPhone 5S" },
  { id: 5, name: "Macbook Air 2022" },
];

function run() {
  let passed = 0;
  const check = (name, fn) => {
    fn();
    passed += 1;
    console.log(`OK ${name}`);
  };

  const allProducts = getProductKnowledgeBase();

  check("grounded answer with full retrieved names passes", () => {
    const answer =
      "Macbook Air 2022 costs $499.\niPhone 5S costs $349.";
    assert.strictEqual(
      mentionsOnlyRetrievedProducts(answer, retrievedPair, allProducts),
      true
    );
  });

  check("standalone Macbook mention fails when only Macbook Air 2022 retrieved", () => {
    const answer = "Macbook is available for $1499.";
    assert.strictEqual(
      mentionsOnlyRetrievedProducts(answer, retrievedPair, allProducts),
      false
    );
  });

  check("unrelated iPhone 6S mention fails", () => {
    const answer = "iPhone 6S costs $399.";
    assert.strictEqual(
      mentionsOnlyRetrievedProducts(answer, retrievedPair, allProducts),
      false
    );
  });

  check("case-insensitive full-name matching passes", () => {
    const answer = "MACBOOK AIR 2022 and iphone 5s are under $500.";
    assert.strictEqual(
      mentionsOnlyRetrievedProducts(answer, retrievedPair, allProducts),
      true
    );
  });

  check("exact retrieved name still passes (regression)", () => {
    const answer = "The iPhone 5S is listed at $349.";
    const one = [{ id: 1, name: "iPhone 5S" }];
    assert.strictEqual(
      mentionsOnlyRetrievedProducts(answer, one, allProducts),
      true
    );
  });

  console.log(`\n${passed} mentionsOnlyRetrievedProducts tests passed.`);
}

run();
