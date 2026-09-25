#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { validateGeneratedCatalog, DEFAULT_SEED } = require("./lib/validateGeneratedCatalog");
const { GENERATED_PATH, DEFAULT_SEED: GENERATOR_SEED } = require("./generate-catalog");

const target = process.argv[2] || GENERATED_PATH;

function main() {
  if (!fs.existsSync(target)) {
    console.error(`Catalog file not found: ${target}`);
    process.exit(1);
  }

  const catalog = JSON.parse(fs.readFileSync(target, "utf8"));
  const result = validateGeneratedCatalog(catalog, {
    seed: GENERATOR_SEED || DEFAULT_SEED,
    expectedCount: catalog.products?.length,
  });

  if (!result.ok) {
    console.error(`Validation failed for ${target}:`);
    result.errors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  }

  console.log(`Validation passed: ${target}`);
  console.log(`Product count: ${result.count}`);
}

if (require.main === module) {
  main();
}

module.exports = { main };
