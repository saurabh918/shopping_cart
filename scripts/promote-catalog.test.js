/**
 * Promotion validation smoke test (dry run; does not write products.json).
 */
const assert = require("assert");
const { promoteCatalog } = require("./promote-catalog");

function run() {
  const result = promoteCatalog({ dryRun: true });
  assert.strictEqual(result.ok, true, "promotion validation should pass");
  assert.strictEqual(result.productCount, 1000);
  console.log("OK promote-catalog dry-run validation");
}

run();
