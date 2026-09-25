/**
 * Copies the authoritative catalog into netlify/lib for serverless bundling.
 * Source of truth: src/data/products.json
 */
const fs = require("fs");
const path = require("path");

const source = path.join(__dirname, "..", "src", "data", "products.json");
const targetDir = path.join(__dirname, "..", "netlify", "lib");
const target = path.join(targetDir, "products.json");

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(source, target);
console.log(`Synced catalog: ${source} -> ${target}`);
