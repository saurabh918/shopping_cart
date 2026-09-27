/**
 * Intent router unit tests.
 * Run: node netlify/tests/intentRouter.test.js
 */
const assert = require("assert");
const { INTENTS, classifyIntent } = require("../lib/intentRouter.cjs");

function expectIntent(question, expectedIntent) {
  const result = classifyIntent(question);
  assert.strictEqual(
    result.intent,
    expectedIntent,
    `question="${question}" expected ${expectedIntent}, got ${result.intent} (confidence=${result.confidence})`,
  );
  assert.ok(result.confidence, "confidence should be set");
}

let passed = 0;

function check(label, fn) {
  fn();
  passed += 1;
  console.log(`OK ${label}`);
}

check("GREETING: Hi", () => {
  expectIntent("Hi", INTENTS.GREETING);
});

check("GREETING: Hello", () => {
  expectIntent("Hello", INTENTS.GREETING);
});

check("GREETING: Hey there", () => {
  expectIntent("Hey there", INTENTS.GREETING);
});

check("GENERAL_KNOWLEDGE: What is a laptop?", () => {
  expectIntent("What is a laptop?", INTENTS.GENERAL_KNOWLEDGE);
});

check("GENERAL_KNOWLEDGE: What is RAM?", () => {
  expectIntent("What is RAM?", INTENTS.GENERAL_KNOWLEDGE);
});

check("GENERAL_KNOWLEDGE: What is an SSD?", () => {
  expectIntent("What is an SSD?", INTENTS.GENERAL_KNOWLEDGE);
});

check("GENERAL_KNOWLEDGE: What is a MacBook?", () => {
  expectIntent("What is a MacBook?", INTENTS.GENERAL_KNOWLEDGE);
});

check("GENERAL_KNOWLEDGE: What is an iPhone?", () => {
  expectIntent("What is an iPhone?", INTENTS.GENERAL_KNOWLEDGE);
});

check("GENERAL_KNOWLEDGE: What is SSD?", () => {
  expectIntent("What is SSD?", INTENTS.GENERAL_KNOWLEDGE);
});

check("GENERAL_KNOWLEDGE: What is a computer?", () => {
  expectIntent("What is a computer?", INTENTS.GENERAL_KNOWLEDGE);
});

check("GENERAL_KNOWLEDGE: What is a processor?", () => {
  expectIntent("What is a processor?", INTENTS.GENERAL_KNOWLEDGE);
});

check("GENERAL_KNOWLEDGE: What is a keyboard?", () => {
  expectIntent("What is a keyboard?", INTENTS.GENERAL_KNOWLEDGE);
});

check("GENERAL_KNOWLEDGE: difference between laptop and desktop", () => {
  expectIntent(
    "What is the difference between laptop and desktop?",
    INTENTS.GENERAL_KNOWLEDGE,
  );
});

check("PRODUCT_SEARCH: Show me laptops", () => {
  expectIntent("Show me laptops", INTENTS.PRODUCT_SEARCH);
});

check("PRODUCT_SEARCH: Show me MacBooks", () => {
  expectIntent("Show me MacBooks", INTENTS.PRODUCT_SEARCH);
});

check("PRODUCT_SEARCH: Which laptops do you have?", () => {
  expectIntent("Which laptops do you have?", INTENTS.PRODUCT_SEARCH);
});

check("PRODUCT_SEARCH: How many MacBooks are there?", () => {
  expectIntent("How many MacBooks are there?", INTENTS.PRODUCT_SEARCH);
});

check("PRODUCT_RECOMMENDATION: Which MacBook is cheapest?", () => {
  expectIntent("Which MacBook is cheapest?", INTENTS.PRODUCT_RECOMMENDATION);
});

check("PRODUCT_SPECIFIC: What is the rating of Apex Notebook 24?", () => {
  expectIntent("What is the rating of Apex Notebook 24?", INTENTS.PRODUCT_SPECIFIC);
});

check("PRODUCT_RECOMMENDATION: Which laptop is good for work?", () => {
  expectIntent("Which laptop is good for work?", INTENTS.PRODUCT_RECOMMENDATION);
});

check("PRODUCT_RECOMMENDATION: Recommend a laptop", () => {
  expectIntent("Recommend a laptop", INTENTS.PRODUCT_RECOMMENDATION);
});

check("PRODUCT_SPECIFIC: What is the price of iPhone 6S?", () => {
  expectIntent("What is the price of iPhone 6S?", INTENTS.PRODUCT_SPECIFIC);
});

check("PRODUCT_SPECIFIC: Is iPhone 6S in stock?", () => {
  expectIntent("Is iPhone 6S in stock?", INTENTS.PRODUCT_SPECIFIC);
});

check("MIXED: What is a MacBook and which MacBooks do you have?", () => {
  expectIntent(
    "What is a MacBook and which MacBooks do you have?",
    INTENTS.MIXED,
  );
});

check("UNKNOWN: Tell me a joke", () => {
  expectIntent("Tell me a joke", INTENTS.UNKNOWN);
});

check("UNKNOWN: What is the weather today?", () => {
  expectIntent("What is the weather today?", INTENTS.UNKNOWN);
});

check('priority: "What is a laptop?" is not PRODUCT_SEARCH', () => {
  const result = classifyIntent("What is a laptop?");
  assert.notStrictEqual(result.intent, INTENTS.PRODUCT_SEARCH);
  assert.strictEqual(result.intent, INTENTS.GENERAL_KNOWLEDGE);
});

check('priority: mixed MacBook query is MIXED', () => {
  expectIntent(
    "What is a MacBook and which MacBooks do you have?",
    INTENTS.MIXED,
  );
});

check('priority: iPhone price query is PRODUCT_SPECIFIC', () => {
  expectIntent("What is the price of iPhone 6S?", INTENTS.PRODUCT_SPECIFIC);
});

console.log(`\n${passed} intent router tests passed.`);
