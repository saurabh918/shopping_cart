const { getSeedProducts, loadSourceCatalog, SEED_ID_MAX } = require("./catalogSeed");
const {
  GENERATION_CATEGORIES,
  deriveCategoryForId,
  buildProductName,
  isHeadphonesOrAccessoriesName,
} = require("./deriveCategory");
const {
  loadImagePool,
  getApprovedUrlsForCategory,
  getApprovedGenerationImageUrls,
} = require("./assignExternalImage");

const DEFAULT_SEED = 20250925;

function isHttpsUrl(value) {
  return typeof value === "string" && value.startsWith("https://") && value.length > 12;
}

function validateGeneratedCatalog(catalog, options = {}) {
  const errors = [];
  const sourceCatalog = options.sourceCatalog || loadSourceCatalog();
  const seedProducts = getSeedProducts(sourceCatalog);
  const globalSeed = Number.isInteger(options.seed) ? options.seed : DEFAULT_SEED;
  const pool = options.imagePool || loadImagePool();
  const approvedGenerationUrls = getApprovedGenerationImageUrls(pool);

  if (!catalog || typeof catalog !== "object") {
    return { ok: false, errors: ["Catalog must be an object."] };
  }

  if (!Array.isArray(catalog.products)) {
    return { ok: false, errors: ["Catalog.products must be an array."] };
  }

  const products = catalog.products;
  const ids = products.map((p) => p.id);
  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    errors.push("Duplicate product ids detected.");
  }

  const sorted = [...products].sort((a, b) => a.id - b.id);
  for (let i = 0; i < sorted.length; i += 1) {
    if (sorted[i].id !== i) {
      errors.push(`Catalog ids must be contiguous 0..n-1; expected id ${i}, found ${sorted[i]?.id}.`);
      break;
    }
  }

  if (Number.isInteger(options.expectedCount) && products.length !== options.expectedCount) {
    errors.push(`Expected ${options.expectedCount} products, found ${products.length}.`);
  }

  for (let id = 0; id <= SEED_ID_MAX; id += 1) {
    const generated = products.find((p) => p.id === id);
    const seed = seedProducts[id];
    if (!generated) {
      errors.push(`Missing seed product id ${id}.`);
      continue;
    }
    const seedJson = JSON.stringify(seed);
    const genJson = JSON.stringify(generated);
    if (seedJson !== genJson) {
      errors.push(`Seed product id ${id} was modified during generation.`);
    }
  }

  products.forEach((item) => {
    if (!Number.isInteger(item.id) || item.id < 0) {
      errors.push(`Invalid id: ${item.id}`);
      return;
    }
    if (typeof item.name !== "string" || !item.name.trim()) {
      errors.push(`Invalid name at id ${item.id}.`);
    }
    if (!Number.isFinite(Number(item.price)) || item.price <= 0) {
      errors.push(`Invalid price at id ${item.id}.`);
    }
    if (!Number.isFinite(Number(item.inStock)) || item.inStock < 0) {
      errors.push(`Invalid inStock at id ${item.id}.`);
    }
    if (typeof item.fastDelivery !== "boolean") {
      errors.push(`Invalid fastDelivery at id ${item.id}.`);
    }
    if (!Number.isFinite(Number(item.deliveryDays)) || item.deliveryDays < 1) {
      errors.push(`Invalid deliveryDays at id ${item.id}.`);
    }
    if (!Number.isFinite(Number(item.ratings)) || item.ratings < 1 || item.ratings > 5) {
      errors.push(`Invalid ratings at id ${item.id}.`);
    }
    const expectedStock = item.inStock > 0 ? "in_stock" : "out_of_stock";
    if (item.stockStatus !== expectedStock) {
      errors.push(`stockStatus mismatch at id ${item.id}.`);
    }
    if (!isHttpsUrl(item.image)) {
      errors.push(`Invalid image URL at id ${item.id}.`);
    }
    if (typeof item.blurb !== "string" || !item.blurb.trim()) {
      errors.push(`Missing blurb at id ${item.id}.`);
    }
    if (typeof item.searchText !== "string" || !item.searchText.trim()) {
      errors.push(`Missing searchText at id ${item.id}.`);
    }
    if (item.category != null) {
      errors.push(`Unexpected category field at id ${item.id}.`);
    }

    if (item.id > SEED_ID_MAX) {
      if (isHeadphonesOrAccessoriesName(item.name)) {
        errors.push(`Unsupported headphones/accessories product at id ${item.id}: ${item.name}.`);
      }

      const category = deriveCategoryForId(item.id, globalSeed);
      if (!GENERATION_CATEGORIES.includes(category)) {
        errors.push(`Unsupported generation category at id ${item.id}.`);
      }

      const expectedName = buildProductName(category, item.id, globalSeed);
      if (item.name !== expectedName) {
        errors.push(`Product name does not match category at id ${item.id}.`);
      }

      if (!approvedGenerationUrls.has(item.image)) {
        errors.push(`Image URL at id ${item.id} is not in the approved generation pool.`);
      }

      const categoryUrls = new Set(getApprovedUrlsForCategory(pool, category));
      if (!categoryUrls.has(item.image)) {
        errors.push(`Cross-category image at id ${item.id} (expected ${category} pool).`);
      }
    }
  });

  return {
    ok: errors.length === 0,
    errors,
    count: products.length,
    seedPreserved: !errors.some((e) => e.includes("Seed product")),
  };
}

module.exports = {
  validateGeneratedCatalog,
  isHttpsUrl,
  DEFAULT_SEED,
};
