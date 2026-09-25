const fs = require("fs");
const path = require("path");

const STAGING_CATALOG_FILENAME = "products.staging.json";

class CatalogConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "CatalogConfigurationError";
    this.code = "CATALOG_CONFIGURATION_ERROR";
  }
}

function resolveCatalogMode(env = process.env) {
  const raw = env.ASSISTANT_CATALOG_MODE;
  if (raw == null || String(raw).trim() === "") {
    return "production";
  }
  const mode = String(raw).trim().toLowerCase();
  if (mode === "production") {
    return "production";
  }
  if (mode === "staging") {
    return "staging";
  }
  throw new CatalogConfigurationError(
    `Invalid ASSISTANT_CATALOG_MODE "${String(raw).trim()}". `
    + "Supported values: production, staging.",
  );
}

function mapProductsToKnowledgeBase(catalog) {
  return catalog.products.map(
    ({
      id,
      name,
      price,
      inStock,
      fastDelivery,
      deliveryDays,
      ratings,
      stockStatus,
      blurb,
      searchText,
    }) => ({
      id,
      name,
      price,
      inStock,
      fastDelivery,
      deliveryDays,
      ratings,
      stockStatus,
      blurb,
      searchText,
    }),
  );
}

let cachedProductionCatalog = null;
function loadProductionCatalogDocument() {
  if (!cachedProductionCatalog) {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    cachedProductionCatalog = require("./products.json");
  }
  return cachedProductionCatalog;
}

let cachedStagingCatalog = null;

/** Fixed trusted paths only (bundled functions may not colocate JSON with catalog.cjs). */
function resolveStagingCatalogPath() {
  const candidates = [
    path.join(__dirname, STAGING_CATALOG_FILENAME),
    path.join(__dirname, "..", "lib", STAGING_CATALOG_FILENAME),
    path.join(process.cwd(), "netlify", "lib", STAGING_CATALOG_FILENAME),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function loadStagingCatalogDocument() {
  const stagingPath = resolveStagingCatalogPath();
  if (!stagingPath) {
    throw new CatalogConfigurationError(
      "ASSISTANT_CATALOG_MODE is staging but the staging catalog file is missing. "
      + "Run npm run sync:catalog:staging to create products.staging.json for the Assistant API.",
    );
  }
  if (!cachedStagingCatalog) {
    cachedStagingCatalog = JSON.parse(fs.readFileSync(stagingPath, "utf8"));
  }
  return cachedStagingCatalog;
}

function getCatalogMode(env = process.env) {
  return resolveCatalogMode(env);
}

function getCatalogMetadata(env = process.env) {
  const mode = resolveCatalogMode(env);
  if (mode === "staging") {
    const catalog = loadStagingCatalogDocument();
    return {
      mode,
      productCount: catalog.products.length,
      source: STAGING_CATALOG_FILENAME,
    };
  }
  const catalog = loadProductionCatalogDocument();
  return {
    mode,
    productCount: catalog.products.length,
    source: "products.json",
  };
}

function getProductKnowledgeBase(env = process.env) {
  const mode = resolveCatalogMode(env);
  const catalog = mode === "staging"
    ? loadStagingCatalogDocument()
    : loadProductionCatalogDocument();
  return mapProductsToKnowledgeBase(catalog);
}

function __resetCatalogCacheForTests() {
  cachedStagingCatalog = null;
}

module.exports = {
  CatalogConfigurationError,
  getCatalogMode,
  getCatalogMetadata,
  getProductKnowledgeBase,
  resolveStagingCatalogPath,
  __resetCatalogCacheForTests,
};
