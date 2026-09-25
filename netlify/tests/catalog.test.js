/**
 * Server catalog resolver tests.
 * Run: node netlify/tests/catalog.test.js
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  getCatalogMode,
  getCatalogMetadata,
  getProductKnowledgeBase,
  CatalogConfigurationError,
  __resetCatalogCacheForTests,
} = require("../lib/catalog.cjs");

const STAGING_PATH = path.join(__dirname, "..", "lib", "products.staging.json");
const KB_FIELDS = [
  "id",
  "name",
  "price",
  "inStock",
  "fastDelivery",
  "deliveryDays",
  "ratings",
  "stockStatus",
  "blurb",
  "searchText",
];

function withEnv(envPatch, fn) {
  const prior = { ...process.env };
  Object.keys(envPatch).forEach((key) => {
    if (envPatch[key] == null) delete process.env[key];
    else process.env[key] = envPatch[key];
  });
  __resetCatalogCacheForTests();
  try {
    fn();
  } finally {
    Object.keys(envPatch).forEach((key) => {
      if (prior[key] === undefined) delete process.env[key];
      else process.env[key] = prior[key];
    });
    __resetCatalogCacheForTests();
  }
}

function assertKbShape(records) {
  assert.ok(records.length > 0);
  records.forEach((record) => {
    KB_FIELDS.forEach((field) => {
      assert.ok(Object.prototype.hasOwnProperty.call(record, field), `missing ${field}`);
    });
    assert.strictEqual(typeof record.searchText, "string");
    assert.strictEqual(typeof record.blurb, "string");
  });
}

function run() {
  let passed = 0;
  const check = (name, fn) => {
    fn();
    passed += 1;
    console.log(`OK ${name}`);
  };

  check("default mode is production with 6 products", () => {
    withEnv({ ASSISTANT_CATALOG_MODE: undefined }, () => {
      assert.strictEqual(getCatalogMode(), "production");
      const records = getProductKnowledgeBase();
      assert.strictEqual(records.length, 6);
      assertKbShape(records);
    });
  });

  check("explicit production mode uses production catalog", () => {
    withEnv({ ASSISTANT_CATALOG_MODE: "production" }, () => {
      const meta = getCatalogMetadata();
      assert.strictEqual(meta.mode, "production");
      assert.strictEqual(meta.productCount, 6);
      assert.strictEqual(meta.source, "products.json");
    });
  });

  check("invalid mode throws CatalogConfigurationError", () => {
    withEnv({ ASSISTANT_CATALOG_MODE: "xyzzy" }, () => {
      assert.throws(
        () => getProductKnowledgeBase(),
        (err) => err instanceof CatalogConfigurationError,
      );
    });
  });

  check("staging path resolves from project netlify/lib (bundled function cwd fallback)", () => {
    withEnv({ ASSISTANT_CATALOG_MODE: "staging" }, () => {
      const { resolveStagingCatalogPath } = require("../lib/catalog.cjs");
      const resolved = resolveStagingCatalogPath();
      if (!fs.existsSync(STAGING_PATH)) {
        assert.strictEqual(resolved, null);
        return;
      }
      assert.ok(resolved);
      assert.ok(fs.existsSync(resolved));
      assert.ok(resolved.replace(/\\/g, "/").endsWith("netlify/lib/products.staging.json"));
    });
  });

  check("production mode does not require staging file", () => {
    withEnv({ ASSISTANT_CATALOG_MODE: "production" }, () => {
      const stagingExists = fs.existsSync(STAGING_PATH);
      if (stagingExists) {
        const backup = `${STAGING_PATH}.catalog-test-bak`;
        fs.renameSync(STAGING_PATH, backup);
        try {
          assert.strictEqual(getProductKnowledgeBase().length, 6);
        } finally {
          fs.renameSync(backup, STAGING_PATH);
        }
      } else {
        assert.strictEqual(getProductKnowledgeBase().length, 6);
      }
    });
  });

  if (!fs.existsSync(STAGING_PATH)) {
    console.log("SKIP staging catalog tests (run npm run sync:catalog:staging first)");
  } else {
    check("staging mode loads 1000-product catalog", () => {
      withEnv({ ASSISTANT_CATALOG_MODE: "staging" }, () => {
        const meta = getCatalogMetadata();
        assert.strictEqual(meta.mode, "staging");
        assert.strictEqual(meta.productCount, 1000);
        assert.strictEqual(meta.source, "products.staging.json");
        const records = getProductKnowledgeBase();
        assert.strictEqual(records.length, 1000);
        assertKbShape(records);
      });
    });

    check("missing staging file fails when staging mode is explicit", () => {
      withEnv({ ASSISTANT_CATALOG_MODE: "staging" }, () => {
        const backup = `${STAGING_PATH}.catalog-test-bak`;
        fs.renameSync(STAGING_PATH, backup);
        try {
          assert.throws(
            () => getProductKnowledgeBase(),
            (err) =>
              err instanceof CatalogConfigurationError
              && err.message.includes("missing"),
          );
        } finally {
          fs.renameSync(backup, STAGING_PATH);
          __resetCatalogCacheForTests();
        }
      });
    });
  }

  console.log(`\n${passed} catalog tests passed.`);
}

run();
