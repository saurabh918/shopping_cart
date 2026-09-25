/** Categories allowed for generated products (must have a non-empty verified image pool). */
const GENERATION_CATEGORIES = ["mobiles", "laptops"];

const NAME_PREFIX = {
  mobiles: ["Apex Phone", "Nova Mobile", "Pulse Phone", "Core Mobile"],
  laptops: ["Nova Laptop", "Apex Notebook", "Pulse Book", "Core Laptop"],
  headphones: ["Pulse Audio", "Nova Headphones", "Apex Earbuds", "Core Sound"],
  accessories: ["Apex Case", "Nova Charger", "Pulse Cable", "Core Stand"],
};

function deriveCategoryForId(productId, globalSeed) {
  const index = (productId * 31 + globalSeed) % GENERATION_CATEGORIES.length;
  return GENERATION_CATEGORIES[index];
}

function buildProductName(category, productId, globalSeed) {
  const prefixes = NAME_PREFIX[category] || NAME_PREFIX.mobiles;
  const prefix = prefixes[(productId + globalSeed) % prefixes.length];
  return `${prefix} ${productId}`;
}

function isHeadphonesOrAccessoriesName(name) {
  if (typeof name !== "string") return false;
  const lower = name.toLowerCase();
  return (
    lower.includes("headphone")
    || lower.includes("earbud")
    || lower.includes("audio")
    || lower.includes(" sound ")
    || lower.startsWith("pulse audio")
    || lower.includes("charger")
    || lower.includes(" cable")
    || lower.includes(" case")
    || lower.includes(" stand")
  );
}

/** Normalized category tokens for generated searchText (not persisted as a JSON field). */
function getSearchTextCategoryKeywords(category) {
  if (category === "mobiles") {
    return ["category mobile", "category phone"];
  }
  if (category === "laptops") {
    return ["category laptop", "category notebook"];
  }
  return [];
}

function searchTextMatchesCategory(searchText, category) {
  const keywords = getSearchTextCategoryKeywords(category);
  if (!keywords.length) return false;
  const lower = String(searchText).toLowerCase();
  return keywords.every((token) => lower.includes(token));
}

module.exports = {
  GENERATION_CATEGORIES,
  deriveCategoryForId,
  buildProductName,
  isHeadphonesOrAccessoriesName,
  getSearchTextCategoryKeywords,
  searchTextMatchesCategory,
};
