#!/usr/bin/env node
/**
 * Post-build check: default production bundle must not reference the staging JSON module path.
 */
const fs = require("fs");
const path = require("path");

const BUILD_JS_DIR = path.join(__dirname, "..", "build", "static", "js");
/** Webpack must not pull staging-only modules into the default production build. */
const FORBIDDEN_MODULE_MARKERS = [
  "productCatalog.staging",
  "stagingKnowledgeBase",
];

function validateProductionBundle() {
  const errors = [];
  if (!fs.existsSync(BUILD_JS_DIR)) {
    errors.push(`Build output not found: ${BUILD_JS_DIR}. Run npm run build first.`);
    return { ok: false, errors };
  }

  const jsFiles = fs.readdirSync(BUILD_JS_DIR).filter((name) => name.endsWith(".js"));
  if (jsFiles.length === 0) {
    errors.push(`No JS bundles in ${BUILD_JS_DIR}.`);
    return { ok: false, errors };
  }

  jsFiles.forEach((fileName) => {
    const content = fs.readFileSync(path.join(BUILD_JS_DIR, fileName), "utf8");
    FORBIDDEN_MODULE_MARKERS.forEach((marker) => {
      if (content.includes(marker)) {
        errors.push(`${fileName} contains forbidden staging module marker "${marker}".`);
      }
    });
    const catalogVersionMarkers = content.match(/"version":1/g) || [];
    if (catalogVersionMarkers.length > 1) {
      errors.push(
        `${fileName} appears to embed multiple catalog JSON documents (${catalogVersionMarkers.length} version markers).`,
      );
    }
  });

  return { ok: errors.length === 0, errors, jsFiles };
}

function main() {
  const result = validateProductionBundle();
  if (!result.ok) {
    console.error("Production bundle validation failed:");
    result.errors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  }
  console.log(
    `Production bundle OK: no staging catalog paths in ${result.jsFiles.length} chunk(s).`,
  );
}

if (require.main === module) {
  main();
}

module.exports = { validateProductionBundle };
