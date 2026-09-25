#!/usr/bin/env node
const fs = require("fs");
const { GENERATED_PATH, DEFAULT_SEED } = require("./generate-catalog");
const { auditStagingDataQuality } = require("./lib/stagingDataQuality");

const target = process.argv[2] || GENERATED_PATH;

function main() {
  if (!fs.existsSync(target)) {
    console.error(`Catalog file not found: ${target}`);
    process.exit(1);
  }

  const catalog = JSON.parse(fs.readFileSync(target, "utf8"));
  const result = auditStagingDataQuality(catalog, { seed: DEFAULT_SEED });

  if (!result.ok) {
    console.error(`Staging data quality check failed for ${target}:`);
    result.errors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  }

  console.log(`Staging data quality passed: ${target}`);
  console.log(JSON.stringify(result.metrics, null, 2));
}

if (require.main === module) {
  main();
}

module.exports = { main };
