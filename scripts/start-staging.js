#!/usr/bin/env node
/**
 * Starts CRA with the staging catalog (products.generated.json).
 * Does not modify products.json or require .env.local.
 */
process.env.REACT_APP_USE_STAGING_CATALOG = "true";
// eslint-disable-next-line import/no-dynamic-require, global-require
require("@craco/craco/dist/scripts/start");
