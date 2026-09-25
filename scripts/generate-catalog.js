#!/usr/bin/env node
/**
 * Deterministic catalog generator (staging output by default).
 * Preserves seed products ids 0–5 from src/data/products.json.
 */
const fs = require("fs");
const path = require("path");
const { getSeedProducts, loadSourceCatalog, SEED_ID_MAX } = require("./lib/catalogSeed");
const { deriveCategoryForId, GENERATION_CATEGORIES } = require("./lib/deriveCategory");
const { generateProductFields } = require("./lib/generateProductFields");
const { loadImagePool, assignExternalImage } = require("./lib/assignExternalImage");
const { validateGeneratedCatalog } = require("./lib/validateGeneratedCatalog");

const DEFAULT_COUNT = 20;
const DEFAULT_SEED = 20250925;
const GENERATED_PATH = path.join(__dirname, "..", "src", "data", "products.generated.json");
const PRODUCTION_PATH = path.join(__dirname, "..", "src", "data", "products.json");

function parseArgs(argv) {
  const options = {
    count: DEFAULT_COUNT,
    seed: DEFAULT_SEED,
    write: false,
  };

  argv.forEach((arg) => {
    if (arg === "--write") options.write = true;
    else if (arg.startsWith("--count=")) options.count = Number(arg.split("=")[1]);
    else if (arg.startsWith("--seed=")) options.seed = Number(arg.split("=")[1]);
  });

  if (!Number.isInteger(options.count) || options.count < SEED_ID_MAX + 1 || options.count > 1000) {
    throw new Error(`--count must be an integer between ${SEED_ID_MAX + 1} and 1000.`);
  }
  if (!Number.isInteger(options.seed)) {
    throw new Error("--seed must be an integer.");
  }

  return options;
}

function generateCatalog(options) {
  const source = loadSourceCatalog();
  const seeds = getSeedProducts(source);
  const pool = loadImagePool();
  const stats = {
    requested: options.count,
    generated: 0,
    skipped: 0,
    reusedImages: 0,
    imageUseCount: {},
    byCategory: Object.fromEntries(GENERATION_CATEGORIES.map((c) => [c, 0])),
  };

  const products = [...seeds];

  for (let id = SEED_ID_MAX + 1; id < options.count; id += 1) {
    try {
      const category = deriveCategoryForId(id, options.seed);
      const fields = generateProductFields(id, category, options.seed);
      const image = assignExternalImage(id, category, pool, stats);
      products.push({ ...fields, image });
      stats.generated += 1;
      stats.byCategory[category] += 1;
    } catch (err) {
      stats.skipped += 1;
      console.error(`Skipped id ${id}: ${err.message}`);
    }
  }

  if (stats.skipped > 0) {
    throw new Error(
      `Generation skipped ${stats.skipped} product(s). Fix image pools or category policy before retrying.`,
    );
  }

  if (products.length !== options.count) {
    throw new Error(`Expected ${options.count} products, produced ${products.length}.`);
  }

  const catalog = {
    version: source.version || 1,
    description:
      source.description
      || "Factual product catalog and retrieval-ready knowledge records for the shopping cart app.",
    products,
  };

  return { catalog, stats };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const pool = loadImagePool();
  const { catalog, stats } = generateCatalog(options);
  const validation = validateGeneratedCatalog(catalog, {
    seed: options.seed,
    expectedCount: options.count,
    imagePool: pool,
  });

  if (!validation.ok) {
    console.error("Generated catalog failed validation:");
    validation.errors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  }

  fs.writeFileSync(GENERATED_PATH, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  console.log(`Wrote staging catalog: ${GENERATED_PATH}`);
  console.log(`Products: ${catalog.products.length} (seed 0–${SEED_ID_MAX} preserved)`);
  const repeatedImageAssignments = stats.reusedImages - Object.keys(stats.imageUseCount).length;
  console.log("Summary:", {
    requested: stats.requested,
    generated: stats.generated,
    skipped: stats.skipped,
    byCategory: stats.byCategory,
    imageAssignments: stats.reusedImages,
    uniqueImageUrlsUsed: Object.keys(stats.imageUseCount).length,
    repeatedImageAssignments,
  });

  if (options.write) {
    fs.writeFileSync(PRODUCTION_PATH, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
    console.log(`Promoted to production catalog: ${PRODUCTION_PATH}`);
  } else {
    console.log("Production catalog unchanged (omit --write to keep staging only).");
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  parseArgs,
  generateCatalog,
  generateProductFields,
  GENERATED_PATH,
  PRODUCTION_PATH,
  DEFAULT_COUNT,
  DEFAULT_SEED,
};
