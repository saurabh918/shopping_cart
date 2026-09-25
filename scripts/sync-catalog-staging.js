/**
 * Opt-in copy of the generated staging catalog for Netlify Functions (local/staging API testing).
 * Does not modify production catalog or run during prebuild.
 * Source: src/data/products.generated.json
 * Target: netlify/lib/products.staging.json
 */
const fs = require("fs");
const path = require("path");

const source = path.join(__dirname, "..", "src", "data", "products.generated.json");
const target = path.join(__dirname, "..", "netlify", "lib", "products.staging.json");

if (!fs.existsSync(source)) {
  console.error(`Staging source catalog not found: ${source}`);
  console.error("Generate it first (e.g. node scripts/generate-catalog.js --count=1000).");
  process.exit(1);
}

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.copyFileSync(source, target);
console.log(`Synced staging catalog: ${source} -> ${target}`);
