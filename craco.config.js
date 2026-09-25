const path = require("path");

const productionCatalogModule = path.resolve(
  __dirname,
  "src/data/productCatalog.production.js",
);
const stagingCatalogModule = path.resolve(
  __dirname,
  "src/data/productCatalog.staging.js",
);

module.exports = {
  webpack: {
    alias: {
      ...(process.env.REACT_APP_USE_STAGING_CATALOG === "true"
        ? { [productionCatalogModule]: stagingCatalogModule }
        : {}),
    },
  },
};
