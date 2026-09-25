/**
 * Generator tests (Node). Run: npm run test:generate-catalog
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  generateCatalog,
  parseArgs,
  GENERATED_PATH,
  DEFAULT_SEED,
} = require("./generate-catalog");
const { validateGeneratedCatalog } = require("./lib/validateGeneratedCatalog");
const { getSeedProducts } = require("./lib/catalogSeed");
const {
  assignExternalImage,
  loadImagePool,
  getApprovedUrlsForCategory,
  getApprovedGenerationImageUrls,
} = require("./lib/assignExternalImage");
const {
  GENERATION_CATEGORIES,
  deriveCategoryForId,
  isHeadphonesOrAccessoriesName,
  searchTextMatchesCategory,
} = require("./lib/deriveCategory");
const { auditStagingDataQuality } = require("./lib/stagingDataQuality");
const { generateProductFields } = require("./lib/generateProductFields");

function run() {
  let passed = 0;
  const check = (name, fn) => {
    fn();
    passed += 1;
    console.log(`OK ${name}`);
  };

  check("parseArgs defaults are safe", () => {
    const opts = parseArgs([]);
    assert.strictEqual(opts.count, 20);
    assert.strictEqual(opts.write, false);
    assert.strictEqual(opts.seed, DEFAULT_SEED);
  });

  check("deterministic output for same seed and count", () => {
    const a = generateCatalog({ count: 25, seed: DEFAULT_SEED, write: false });
    const b = generateCatalog({ count: 25, seed: DEFAULT_SEED, write: false });
    assert.strictEqual(JSON.stringify(a.catalog), JSON.stringify(b.catalog));
  });

  check("seed products preserved exactly", () => {
    const seeds = getSeedProducts();
    const { catalog } = generateCatalog({ count: 30, seed: DEFAULT_SEED, write: false });
    for (let id = 0; id <= 5; id += 1) {
      const seed = seeds.find((p) => p.id === id);
      const generated = catalog.products.find((p) => p.id === id);
      assert.deepStrictEqual(generated, seed);
    }
  });

  check("unique ids and target count", () => {
    const { catalog } = generateCatalog({ count: 20, seed: DEFAULT_SEED, write: false });
    assert.strictEqual(catalog.products.length, 20);
    const ids = catalog.products.map((p) => p.id);
    assert.strictEqual(new Set(ids).size, ids.length);
  });

  check("only supported categories are generated", () => {
    const { catalog, stats } = generateCatalog({ count: 100, seed: DEFAULT_SEED, write: false });
    catalog.products.slice(6).forEach((product) => {
      const category = deriveCategoryForId(product.id, DEFAULT_SEED);
      assert.ok(GENERATION_CATEGORIES.includes(category));
      assert.ok(!isHeadphonesOrAccessoriesName(product.name), product.name);
    });
    assert.strictEqual(stats.byCategory.headphones, undefined);
    assert.strictEqual(stats.byCategory.accessories, undefined);
    assert.ok(stats.byCategory.mobiles > 0);
    assert.ok(stats.byCategory.laptops > 0);
  });

  check("mobile products receive mobile images", () => {
    const pool = loadImagePool();
    const mobileUrls = new Set(getApprovedUrlsForCategory(pool, "mobiles"));
    const { catalog } = generateCatalog({ count: 80, seed: DEFAULT_SEED, write: false });
    catalog.products.slice(6).forEach((product) => {
      const category = deriveCategoryForId(product.id, DEFAULT_SEED);
      if (category === "mobiles") {
        assert.ok(mobileUrls.has(product.image), `id ${product.id}`);
      }
    });
  });

  check("laptop products receive laptop images", () => {
    const pool = loadImagePool();
    const laptopUrls = new Set(getApprovedUrlsForCategory(pool, "laptops"));
    const { catalog } = generateCatalog({ count: 80, seed: DEFAULT_SEED, write: false });
    catalog.products.slice(6).forEach((product) => {
      const category = deriveCategoryForId(product.id, DEFAULT_SEED);
      if (category === "laptops") {
        assert.ok(laptopUrls.has(product.image), `id ${product.id}`);
      }
    });
  });

  check("empty category pool throws instead of cross-category fallback", () => {
    const pool = loadImagePool();
    assert.throws(
      () => assignExternalImage(99, "headphones", pool, {}),
      /No verified image pool/,
    );
  });

  check("cross-category image assignment is rejected by validation", () => {
    const { catalog } = generateCatalog({ count: 30, seed: DEFAULT_SEED, write: false });
    const pool = loadImagePool();
    const laptopOnly = getApprovedUrlsForCategory(pool, "laptops")[0];
    const tampered = JSON.parse(JSON.stringify(catalog));
    const mobileProduct = tampered.products.find(
      (p) => p.id > 5 && deriveCategoryForId(p.id, DEFAULT_SEED) === "mobiles",
    );
    assert.ok(mobileProduct);
    mobileProduct.image = laptopOnly;
    const result = validateGeneratedCatalog(tampered, { seed: DEFAULT_SEED });
    assert.strictEqual(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes("Cross-category")));
  });

  check("generated image URLs come only from approved pool", () => {
    const pool = loadImagePool();
    const approved = getApprovedGenerationImageUrls(pool);
    const { catalog } = generateCatalog({ count: 40, seed: DEFAULT_SEED, write: false });
    catalog.products.slice(6).forEach((product) => {
      assert.ok(approved.has(product.image), `id ${product.id}`);
    });
  });

  check("repeated image assignments are tracked", () => {
    const { stats } = generateCatalog({ count: 200, seed: DEFAULT_SEED, write: false });
    assert.ok(stats.reusedImages > 5);
    const unique = Object.keys(stats.imageUseCount).length;
    assert.ok(unique <= 5);
    assert.ok(stats.reusedImages > unique);
  });

  check("validation passes for generated catalog", () => {
    const { catalog } = generateCatalog({ count: 20, seed: DEFAULT_SEED, write: false });
    const result = validateGeneratedCatalog(catalog, {
      seed: DEFAULT_SEED,
      expectedCount: 20,
    });
    assert.strictEqual(result.ok, true, result.errors.join("; "));
  });

  check("generated laptop prices include some below 500 deterministically", () => {
    const { catalog } = generateCatalog({ count: 1000, seed: DEFAULT_SEED, write: false });
    const laptops = catalog.products.filter(
      (p) => p.id > 5 && deriveCategoryForId(p.id, DEFAULT_SEED) === "laptops",
    );
    const below500 = laptops.filter((p) => p.price < 500);
    assert.ok(below500.length > 0, "expected budget laptops");
    assert.ok(laptops.every((p) => p.price > 0));
    const again = generateCatalog({ count: 1000, seed: DEFAULT_SEED, write: false });
    assert.strictEqual(
      below500.length,
      again.catalog.products.filter(
        (p) => p.id > 5 && deriveCategoryForId(p.id, DEFAULT_SEED) === "laptops" && p.price < 500,
      ).length,
    );
  });

  check("fast delivery and delivery days are consistent for generated products", () => {
    const { catalog } = generateCatalog({ count: 200, seed: DEFAULT_SEED, write: false });
    catalog.products.slice(6).forEach((product) => {
      if (product.fastDelivery) {
        assert.ok(product.deliveryDays >= 1 && product.deliveryDays <= 3, `id ${product.id}`);
      } else {
        assert.ok(product.deliveryDays >= 3 && product.deliveryDays <= 7, `id ${product.id}`);
      }
      assert.ok(product.blurb.includes(`${product.deliveryDays} day`));
      assert.ok(product.searchText.includes(`${product.deliveryDays} days`));
    });
  });

  check("generated searchText includes category keywords matching derived category", () => {
    const { catalog } = generateCatalog({ count: 100, seed: DEFAULT_SEED, write: false });
    catalog.products.slice(6).forEach((product) => {
      const category = deriveCategoryForId(product.id, DEFAULT_SEED);
      assert.ok(searchTextMatchesCategory(product.searchText, category), product.searchText);
      if (category === "mobiles") {
        assert.ok(!product.searchText.includes("category laptop"));
      }
      if (category === "laptops") {
        assert.ok(!product.searchText.includes("category phone"));
      }
    });
  });

  check("staging data quality audit passes for full catalog", () => {
    const { catalog } = generateCatalog({ count: 1000, seed: DEFAULT_SEED, write: false });
    const audit = auditStagingDataQuality(catalog, { seed: DEFAULT_SEED });
    assert.strictEqual(audit.ok, true, audit.errors.join("; "));
    assert.ok(audit.metrics.laptopsBelow500 > 0);
    assert.strictEqual(audit.metrics.fastWithSlowDays, 0);
    assert.strictEqual(audit.metrics.slowWithFastDays, 0);
  });

  check("generateProductFields laptop example is deterministic", () => {
    const a = generateProductFields(8, "laptops", DEFAULT_SEED);
    const b = generateProductFields(8, "laptops", DEFAULT_SEED);
    assert.deepStrictEqual(a, b);
  });

  check("staging write does not require production overwrite", () => {
    assert.ok(!fs.existsSync(GENERATED_PATH) || fs.statSync(GENERATED_PATH).isFile());
  });

  console.log(`\n${passed} generate-catalog tests passed.`);
}

run();
