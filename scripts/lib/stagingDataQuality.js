const { deriveCategoryForId, searchTextMatchesCategory } = require("./deriveCategory");
const { getSeedProducts } = require("./catalogSeed");

const DEFAULT_SEED = 20250925;
const SEED_ID_MAX = 5;

function auditStagingDataQuality(catalog, options = {}) {
  const seed = Number.isInteger(options.seed) ? options.seed : DEFAULT_SEED;
  const errors = [];
  const products = catalog?.products || [];
  const generated = products.filter((p) => p.id > SEED_ID_MAX);

  let laptopsBelow500 = 0;
  let laptopsAtOrAbove500 = 0;
  let laptopMin = Infinity;
  let laptopMax = -Infinity;

  let fastWithSlowDays = 0;
  let slowWithFastDays = 0;
  let categoryKeywordMismatch = 0;

  generated.forEach((product) => {
    const category = deriveCategoryForId(product.id, seed);

    if (category === "laptops") {
      if (product.price < 500) laptopsBelow500 += 1;
      else laptopsAtOrAbove500 += 1;
      laptopMin = Math.min(laptopMin, product.price);
      laptopMax = Math.max(laptopMax, product.price);
      if (!(product.price > 0)) errors.push(`Invalid laptop price at id ${product.id}`);
    }

    if (product.fastDelivery && product.deliveryDays > 3) {
      fastWithSlowDays += 1;
    }
    if (!product.fastDelivery && product.deliveryDays < 3) {
      slowWithFastDays += 1;
    }

    if (!searchTextMatchesCategory(product.searchText, category)) {
      categoryKeywordMismatch += 1;
      errors.push(`Category searchText mismatch at id ${product.id}.`);
    }

    const expectedStock = product.inStock > 0 ? "in_stock" : "out_of_stock";
    if (product.stockStatus !== expectedStock) {
      errors.push(`stockStatus mismatch at id ${product.id}.`);
    }
  });

  if (laptopsBelow500 === 0) {
    errors.push("Expected at least one generated laptop priced below 500.");
  }

  if (fastWithSlowDays > 0) {
    errors.push(`fastDelivery true with deliveryDays > 3: ${fastWithSlowDays} product(s).`);
  }
  if (slowWithFastDays > 0) {
    errors.push(`fastDelivery false with deliveryDays < 3: ${slowWithFastDays} product(s).`);
  }
  if (categoryKeywordMismatch > 0 && errors.length === categoryKeywordMismatch) {
    // already listed per id
  }

  const seedProducts = getSeedProducts(options.sourceCatalog);
  for (let id = 0; id <= SEED_ID_MAX; id += 1) {
    const found = products.find((p) => p.id === id);
    if (JSON.stringify(found) !== JSON.stringify(seedProducts[id])) {
      errors.push(`Seed product id ${id} was modified.`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    metrics: {
      generatedCount: generated.length,
      laptopsBelow500,
      laptopsAtOrAbove500,
      laptopMin: Number.isFinite(laptopMin) ? laptopMin : null,
      laptopMax: Number.isFinite(laptopMax) ? laptopMax : null,
      fastWithSlowDays,
      slowWithFastDays,
      categoryKeywordMismatch,
      withCategoryKeywords: generated.length - categoryKeywordMismatch,
    },
  };
}

module.exports = {
  auditStagingDataQuality,
  DEFAULT_SEED,
};
