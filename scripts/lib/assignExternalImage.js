const fs = require("fs");
const path = require("path");

const POOL_PATH = path.join(__dirname, "..", "external-image-pool.json");

function loadImagePool(poolPath = POOL_PATH) {
  const raw = fs.readFileSync(poolPath, "utf8");
  const pool = JSON.parse(raw);
  return pool;
}

function getApprovedUrlsForCategory(pool, category) {
  const images = Array.isArray(pool[category]) ? pool[category] : [];
  return images.filter(
    (url) => typeof url === "string" && url.startsWith("https://") && url.length > 12,
  );
}

/** All HTTPS URLs approved for assigning to newly generated products (mobiles + laptops only). */
function getApprovedGenerationImageUrls(pool) {
  return new Set([
    ...getApprovedUrlsForCategory(pool, "mobiles"),
    ...getApprovedUrlsForCategory(pool, "laptops"),
  ]);
}

function stableHash(value) {
  let hash = 2166136261;
  const text = String(value);
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Deterministic external URL from the category pool only (no cross-category fallback).
 */
function assignExternalImage(productId, category, pool, stats) {
  const images = getApprovedUrlsForCategory(pool, category);

  if (images.length === 0) {
    throw new Error(
      `No verified image pool for category "${category}". `
      + "Generated products use only mobiles and laptops with non-empty pools.",
    );
  }

  const index = stableHash(`${category}:${productId}`) % images.length;
  const image = images[index];

  if (stats) {
    stats.reusedImages += 1;
    stats.imageUseCount[image] = (stats.imageUseCount[image] || 0) + 1;
  }

  return image;
}

module.exports = {
  POOL_PATH,
  loadImagePool,
  stableHash,
  assignExternalImage,
  getApprovedUrlsForCategory,
  getApprovedGenerationImageUrls,
};
