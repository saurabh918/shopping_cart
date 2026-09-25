#!/usr/bin/env node
/**
 * Ensures canonical src/data/products.json matches netlify/lib/products.json (post sync).
 */
const fs = require("fs");
const path = require("path");
const { PRODUCTION_CATALOG_PRODUCT_COUNT } = require("./lib/catalogConstants");

const SOURCE = path.join(__dirname, "..", "src", "data", "products.json");
const NETLIFY_COPY = path.join(__dirname, "..", "netlify", "lib", "products.json");

function loadCatalog(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Catalog file not found: ${filePath}`);
  }
  const catalog = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!catalog || !Array.isArray(catalog.products)) {
    throw new Error(`Invalid catalog: ${filePath}`);
  }
  return catalog;
}

function catalogIdSignature(products) {
  return products.map((p) => p.id).join(",");
}

function validateCatalogSync() {
  const errors = [];
  const source = loadCatalog(SOURCE);
  const copy = loadCatalog(NETLIFY_COPY);

  if (source.products.length !== PRODUCTION_CATALOG_PRODUCT_COUNT) {
    errors.push(
      `src/data/products.json has ${source.products.length} products; expected ${PRODUCTION_CATALOG_PRODUCT_COUNT}.`,
    );
  }
  if (copy.products.length !== PRODUCTION_CATALOG_PRODUCT_COUNT) {
    errors.push(
      `netlify/lib/products.json has ${copy.products.length} products; expected ${PRODUCTION_CATALOG_PRODUCT_COUNT}.`,
    );
  }

  const sourceIds = catalogIdSignature(source.products);
  const copyIds = catalogIdSignature(copy.products);
  if (sourceIds !== copyIds) {
    errors.push("Product id sequences differ between src/data/products.json and netlify/lib/products.json.");
  }

  return { ok: errors.length === 0, errors, sourceCount: source.products.length, copyCount: copy.products.length };
}

function main() {
  try {
    const result = validateCatalogSync();
    if (!result.ok) {
      console.error("Catalog sync validation failed:");
      result.errors.forEach((err) => console.error(`  - ${err}`));
      process.exit(1);
    }
    console.log(
      `Catalog sync OK: ${result.sourceCount} products in src and netlify/lib (${PRODUCTION_CATALOG_PRODUCT_COUNT} expected).`,
    );
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  validateCatalogSync,
  SOURCE,
  NETLIFY_COPY,
};
