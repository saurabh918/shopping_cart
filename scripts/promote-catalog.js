#!/usr/bin/env node
/**
 * Promotes the validated generated catalog into src/data/products.json (production canonical).
 * Does not touch LLM or Netlify env configuration.
 */
const fs = require("fs");
const path = require("path");
const { validateGeneratedCatalog, DEFAULT_SEED } = require("./lib/validateGeneratedCatalog");
const { auditStagingDataQuality } = require("./lib/stagingDataQuality");
const { getSeedProducts, loadSourceCatalog } = require("./lib/catalogSeed");
const { PRODUCTION_CATALOG_PRODUCT_COUNT } = require("./lib/catalogConstants");
const { GENERATED_PATH, PRODUCTION_PATH } = require("./generate-catalog");

function loadGeneratedCatalog() {
  if (!fs.existsSync(GENERATED_PATH)) {
    throw new Error(
      `Generated catalog not found: ${GENERATED_PATH}. Run npm run generate:catalog -- --count=1000 first.`,
    );
  }
  return JSON.parse(fs.readFileSync(GENERATED_PATH, "utf8"));
}

function validateForPromotion(catalog) {
  const errors = [];
  const sourceCatalog = loadSourceCatalog();
  const seedProducts = getSeedProducts(sourceCatalog);

  const generatedValidation = validateGeneratedCatalog(catalog, {
    sourceCatalog,
    seed: DEFAULT_SEED,
    expectedCount: PRODUCTION_CATALOG_PRODUCT_COUNT,
  });
  if (!generatedValidation.ok) {
    errors.push(...generatedValidation.errors);
  }

  const quality = auditStagingDataQuality(catalog, { seed: DEFAULT_SEED });
  if (!quality.ok) {
    errors.push(...quality.errors);
  }

  for (let id = 0; id <= seedProducts.length - 1; id += 1) {
    const promoted = catalog.products.find((p) => p.id === id);
    if (!promoted) {
      errors.push(`Missing seed product id ${id} in generated catalog.`);
      continue;
    }
    if (JSON.stringify(promoted) !== JSON.stringify(seedProducts[id])) {
      errors.push(`Seed product id ${id} does not match current production seed.`);
    }
  }

  return { ok: errors.length === 0, errors };
}

function promoteCatalog({ dryRun = false } = {}) {
  const catalog = loadGeneratedCatalog();
  const validation = validateForPromotion(catalog);
  if (!validation.ok) {
    return { ok: false, errors: validation.errors };
  }

  if (dryRun) {
    return { ok: true, productCount: catalog.products.length, dryRun: true };
  }

  fs.writeFileSync(PRODUCTION_PATH, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  return { ok: true, productCount: catalog.products.length, target: PRODUCTION_PATH };
}

function main() {
  const dryRun = process.argv.includes("--dry-run");
  try {
    const result = promoteCatalog({ dryRun });
    if (!result.ok) {
      console.error("Promotion validation failed:");
      result.errors.forEach((err) => console.error(`  - ${err}`));
      process.exit(1);
    }
    if (result.dryRun) {
      console.log(`Promotion validation passed (${result.productCount} products). Dry run — no files written.`);
      return;
    }
    console.log(`Promoted catalog: ${GENERATED_PATH} -> ${result.target}`);
    console.log(`Product count: ${result.productCount}`);
    console.log("Run npm run sync:catalog (or npm run build) to refresh netlify/lib/products.json.");
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  promoteCatalog,
  validateForPromotion,
  loadGeneratedCatalog,
};
