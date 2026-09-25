const fs = require("fs");
const path = require("path");

const SOURCE_CATALOG = path.join(__dirname, "..", "..", "src", "data", "products.json");
const SEED_ID_MAX = 5;

function loadSourceCatalog() {
  const raw = fs.readFileSync(SOURCE_CATALOG, "utf8");
  const catalog = JSON.parse(raw);
  if (!catalog || !Array.isArray(catalog.products)) {
    throw new Error("Invalid source catalog: products array missing.");
  }
  return catalog;
}

function getSeedProducts(catalog = loadSourceCatalog()) {
  const seeds = catalog.products.filter((p) => p.id >= 0 && p.id <= SEED_ID_MAX);
  if (seeds.length !== SEED_ID_MAX + 1) {
    throw new Error(`Expected ${SEED_ID_MAX + 1} seed products (ids 0–${SEED_ID_MAX}).`);
  }
  const byId = [...seeds].sort((a, b) => a.id - b.id);
  for (let id = 0; id <= SEED_ID_MAX; id += 1) {
    if (byId[id].id !== id) {
      throw new Error(`Missing seed product id ${id}.`);
    }
  }
  return byId.map((product) => ({ ...product }));
}

module.exports = {
  SOURCE_CATALOG,
  SEED_ID_MAX,
  loadSourceCatalog,
  getSeedProducts,
};
