/**
 * Assistant API tests with ASSISTANT_CATALOG_MODE=staging.
 * Run: npm run test:ask-api:staging
 */
const assert = require("assert");
const path = require("path");
const fs = require("fs");
const { handleAskRequest, getContextProducts } = require("../lib/askOrchestrator.cjs");
const { retrieveProducts } = require("../lib/retrieveProducts.cjs");
const { getProductKnowledgeBase } = require("../lib/catalog.cjs");
const { productCategory } = require("../lib/structuredFilters.cjs");
const { deriveCategoryForId } = require("../../scripts/lib/deriveCategory");

const STAGING_PATH = path.join(__dirname, "..", "lib", "products.staging.json");
const STAGING_SEED = 20250925;
const STAGING_ENV = { ASSISTANT_CATALOG_MODE: "staging" };

function isStagingLaptop(product) {
  if (product.id <= 5) {
    return product.name.toLowerCase().includes("macbook");
  }
  return deriveCategoryForId(product.id, STAGING_SEED) === "laptops";
}

function isStagingMobile(product) {
  if (product.id <= 5) {
    return product.name.toLowerCase().includes("iphone");
  }
  return deriveCategoryForId(product.id, STAGING_SEED) === "mobiles";
}

function withStagingEnv(fn) {
  const prior = process.env.ASSISTANT_CATALOG_MODE;
  process.env.ASSISTANT_CATALOG_MODE = "staging";
  try {
    fn();
  } finally {
    if (prior === undefined) delete process.env.ASSISTANT_CATALOG_MODE;
    else process.env.ASSISTANT_CATALOG_MODE = prior;
  }
}

async function run() {
  if (!fs.existsSync(STAGING_PATH)) {
    console.error("Missing staging catalog. Run: npm run sync:catalog:staging");
    process.exit(1);
  }

  let passed = 0;
  const check = async (name, fn) => {
    await fn();
    passed += 1;
    console.log(`OK ${name}`);
  };

  let records;
  withStagingEnv(() => {
    records = getProductKnowledgeBase(STAGING_ENV);
  });
  assert.strictEqual(records.length, 1000);
  const recordIds = new Set(records.map((p) => p.id));

  const assertMatchesFromCatalog = (matches) => {
    matches.forEach((m) => {
      assert.ok(recordIds.has(m.product.id));
    });
  };

  await check("laptops under 500 — category and price AND, default limit 3", () => {
    const result = retrieveProducts("Show me laptops under 500", { records });
    assert.ok(result.matches.length > 0);
    assert.ok(result.matches.length <= 3);
    assertMatchesFromCatalog(result.matches);
    result.matches.forEach((m) => {
      assert.ok(m.product.price < 500);
      assert.ok(isStagingLaptop(m.product));
    });
  });

  await check("mobile products — mobile category only", () => {
    const result = retrieveProducts("Show me mobile products", { records });
    assert.ok(result.matches.length <= 3);
    assertMatchesFromCatalog(result.matches);
    result.matches.forEach((m) => {
      assert.ok(isStagingMobile(m.product));
      assert.strictEqual(productCategory(m.product), "mobile");
    });
  });

  await check("laptops — plural category filter", () => {
    const result = retrieveProducts("Show me laptops", { records });
    assert.ok(result.matches.length <= 3);
    result.matches.forEach((m) => assert.ok(isStagingLaptop(m.product)));
  });

  await check("rated above 4 — strict ratings > 4", () => {
    const result = retrieveProducts("Show me products rated above 4", { records });
    assert.ok(result.matches.length <= 3);
    result.matches.forEach((m) => assert.ok(m.product.ratings > 4));
  });

  await check("laptops under 500 with fast delivery — combined AND", () => {
    const result = retrieveProducts("Show me laptops under 500 with fast delivery", {
      records,
    });
    assert.ok(result.matches.length <= 3);
    result.matches.forEach((m) => {
      assert.ok(isStagingLaptop(m.product));
      assert.ok(m.product.price < 500);
      assert.ok(m.product.fastDelivery);
    });
  });

  await check("orchestrator uses staging catalog for retrieval and grounding catalog", async () => {
    const mockClient = {
      isConfigured: () => true,
      generateAnswer: async ({ products }) => {
        assert.ok(products.length >= 1);
        assert.ok(products.length <= 5);
        return `Summary for ${products[0].name}.`;
      },
    };

    const result = await handleAskRequest("Show me laptops under 500", {
      env: STAGING_ENV,
      llmClient: mockClient,
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.matches.length > 0);
    assert.ok(result.matches.length <= 3);
    const context = getContextProducts(result.matches);
    context.forEach((p) => {
      assert.ok(result.matches.some((m) => m.product.id === p.id));
    });
    result.matches.forEach((m) => {
      assert.ok(isStagingLaptop(m.product));
      assert.ok(m.product.price < 500);
    });
  });

  console.log(`\n${passed} ask.handler.staging tests passed.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
