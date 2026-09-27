/**
 * Structured catalog filters (category, price, rating, delivery) applied as AND conditions.
 * Keep in sync with src/retrieval/structuredFilters.js
 */

const PRICE_LT_PATTERN =
  /\b(?:under|below|less than|cheaper than)\s+\$?(\d+(?:\.\d+)?)(?:\s+dollars?)?\b/;
const PRICE_GT_PATTERN =
  /\b(?:over|more than)\s+\$?(\d+(?:\.\d+)?)(?:\s+dollars?)?\b/;

const INR_CURRENCY_PATTERN = /₹|\brs\.?\b|\binr\b|\brupees?\b/i;

const RATING_ABOVE_PATTERN =
  /\b(?:rated|rating|ratings)\s+(?:above|over)\s+(\d+)\b/;
const RATED_AND_ABOVE_PATTERN =
  /\brated\s+(\d+)\s+and\s+above\b/;
const RATING_AT_LEAST_PATTERN =
  /\b(?:rated|rating|ratings)\s+(?:at least|minimum)\s+(\d+)\b/;
const RATING_BELOW_PATTERN =
  /\b(?:rated|rating|ratings)\s+below\s+(\d+)\b/;

function queryUsesInrCurrency(normalized) {
  return INR_CURRENCY_PATTERN.test(normalized);
}

function inrPriceFilterRequested(normalized) {
  if (!normalized || !queryUsesInrCurrency(normalized)) return false;
  return (
    /\b(under|below|less than|cheaper than|over|more than)\b/.test(normalized)
    && /\d/.test(normalized)
  );
}

function parsePriceFilter(normalized) {
  if (!normalized) return null;
  if (inrPriceFilterRequested(normalized)) {
    return { inrUnsupported: true };
  }

  const ltMatch = normalized.match(PRICE_LT_PATTERN);
  if (ltMatch) {
    const threshold = Number(ltMatch[1]);
    if (Number.isFinite(threshold)) {
      return { operator: "lt", threshold };
    }
  }

  const gtMatch = normalized.match(PRICE_GT_PATTERN);
  if (gtMatch) {
    const threshold = Number(gtMatch[1]);
    if (Number.isFinite(threshold)) {
      return { operator: "gt", threshold };
    }
  }

  const ratingAboveNear = /\b(?:rated|rating|ratings)\s+above\s+\d+\b/.test(normalized);
  if (!ratingAboveNear) {
    const aboveMatch = normalized.match(/\babove\s+\$?(\d+(?:\.\d+)?)\b/);
    if (aboveMatch) {
      const threshold = Number(aboveMatch[1]);
      if (Number.isFinite(threshold)) {
        return { operator: "gt", threshold };
      }
    }
  }

  return null;
}

function parseRatingFilter(normalized) {
  if (!normalized) return null;

  let match = normalized.match(RATING_ABOVE_PATTERN);
  if (match) {
    return { operator: "gt", threshold: Number(match[1]) };
  }

  match = normalized.match(RATED_AND_ABOVE_PATTERN);
  if (match) {
    return { operator: "gte", threshold: Number(match[1]) };
  }

  match = normalized.match(RATING_AT_LEAST_PATTERN);
  if (match) {
    return { operator: "gte", threshold: Number(match[1]) };
  }

  match = normalized.match(RATING_BELOW_PATTERN);
  if (match) {
    return { operator: "lt", threshold: Number(match[1]) };
  }

  return null;
}

function parseCategoryFilter(normalized) {
  if (!normalized) return null;

  const hasMacbookLine = /\bmacbooks?\b/.test(normalized);
  const hasIphoneLine = /\biphones?\b/.test(normalized);

  const hasLaptop =
    /\b(laptops?|notebooks?)(?:\s+products?)?\b/.test(normalized)
    || /\bshow me (?:the )?(laptops?|notebooks?)\b/.test(normalized)
    || hasMacbookLine;
  const hasMobile =
    /\bmobile(?:\s+products?)?\b/.test(normalized)
    || /\b(?:phones|mobiles)(?:\s+products?)?\b/.test(normalized)
    || /\bphone products\b/.test(normalized)
    || hasIphoneLine;

  if (hasLaptop && !hasMobile) return "laptop";
  if (hasMobile && !hasLaptop) return "mobile";
  return null;
}

/** Product family stem matched against actual catalog names (macbook, iphone). */
function parseProductLineFilter(normalized) {
  if (!normalized) return null;
  if (/\bmacbooks?\b/.test(normalized)) return "macbook";
  if (/\biphones?\b/.test(normalized)) return "iphone";
  return null;
}

function productMatchesProductLine(product, stem) {
  if (!stem) return true;
  const name = String(product.name || "").toLowerCase();
  const searchText = String(product.searchText || "").toLowerCase();
  return name.includes(stem) || searchText.includes(stem);
}

function detectUnsupportedCatalogConstraints(normalized) {
  if (!normalized) return [];

  const constraints = [];
  const asksLaptop = /\b(laptops?|notebooks?|macbooks?)\b/.test(normalized);

  if (/\b\d+\s*gb\b/.test(normalized)) {
    constraints.push("memory/storage capacity (GB)");
  }
  if (/\bram\b/.test(normalized) && asksLaptop) {
    constraints.push("RAM");
  }
  if (/\bssd\b/.test(normalized) && asksLaptop) {
    constraints.push("SSD");
  }
  if (/\bprogramming\b/.test(normalized) && asksLaptop) {
    constraints.push("programming use-case");
  }
  if (asksLaptop) {
    if (/\bfor\s+students?\b/.test(normalized) || (/\bstudents?\b/.test(normalized) && /\b(for|good)\b/.test(normalized))) {
      constraints.push("student use-case");
    }
    if (/\bfor\s+office\b/.test(normalized) || /\boffice\s+work\b/.test(normalized)) {
      constraints.push("office use-case");
    }
  }

  return constraints;
}

function compareCategoryBrowseProducts(a, b, structured) {
  let lineBoostA = 0;
  let lineBoostB = 0;
  if (structured.productLine) {
    lineBoostA = productMatchesProductLine(a, structured.productLine) ? 1 : 0;
    lineBoostB = productMatchesProductLine(b, structured.productLine) ? 1 : 0;
  }
  if (lineBoostB !== lineBoostA) return lineBoostB - lineBoostA;

  const stockA = a.stockStatus === "in_stock" ? 1 : 0;
  const stockB = b.stockStatus === "in_stock" ? 1 : 0;
  if (stockB !== stockA) return stockB - stockA;

  if (b.ratings !== a.ratings) return b.ratings - a.ratings;

  return a.id - b.id;
}

function queryAsksFastDelivery(normalized) {
  return (
    /\b(fast delivery|fast shipping|express delivery)\b/.test(normalized)
    || (/\bfast\b/.test(normalized) && /\bdelivery\b/.test(normalized))
    || normalized === "fast"
  );
}

function parseStructuredQuery(normalized) {
  return {
    category: parseCategoryFilter(normalized),
    priceFilter: parsePriceFilter(normalized),
    ratingFilter: parseRatingFilter(normalized),
    fastDelivery: queryAsksFastDelivery(normalized) ? true : null,
    productLine: parseProductLineFilter(normalized),
  };
}

function hasStructuredFilters(structured) {
  return Boolean(
    structured.category
    || structured.productLine
    || (structured.priceFilter && !structured.priceFilter.inrUnsupported)
    || structured.ratingFilter
    || structured.fastDelivery === true,
  );
}

function isInrPriceFilter(structured) {
  return Boolean(structured.priceFilter?.inrUnsupported);
}

function productCategory(product) {
  const searchText = String(product.searchText || "").toLowerCase();
  const name = String(product.name || "").toLowerCase();

  if (/\bcategory laptop\b/.test(searchText) || /\bcategory notebook\b/.test(searchText)) {
    return "laptop";
  }
  if (/\bcategory mobile\b/.test(searchText) || /\bcategory phone\b/.test(searchText)) {
    return "mobile";
  }

  if (name.includes("macbook") || /\bnotebook\b/.test(name) || /\blaptop\b/.test(name)) {
    return "laptop";
  }
  if (/\bpulse book\b/.test(name) || /\bcore laptop\b/.test(name) || /\bnova laptop\b/.test(name)) {
    return "laptop";
  }
  if (name.includes("iphone") || /\bphone\b/.test(name) || /\bmobile\b/.test(name)) {
    return "mobile";
  }

  return null;
}

function productMatchesStructured(product, structured) {
  if (structured.category) {
    if (productCategory(product) !== structured.category) return false;
  }

  if (structured.productLine) {
    if (!productMatchesProductLine(product, structured.productLine)) return false;
  }

  if (structured.priceFilter && !structured.priceFilter.inrUnsupported) {
    const price = Number(product.price);
    if (!Number.isFinite(price)) return false;
    const { operator, threshold } = structured.priceFilter;
    if (operator === "lt" && !(price < threshold)) return false;
    if (operator === "gt" && !(price > threshold)) return false;
  }

  if (structured.ratingFilter) {
    const ratings = Number(product.ratings);
    if (!Number.isFinite(ratings)) return false;
    const { operator, threshold } = structured.ratingFilter;
    if (operator === "gt" && !(ratings > threshold)) return false;
    if (operator === "gte" && !(ratings >= threshold)) return false;
    if (operator === "lt" && !(ratings < threshold)) return false;
  }

  if (structured.fastDelivery === true && !product.fastDelivery) {
    return false;
  }

  return true;
}

function sortStructuredMatches(products, structured) {
  const sorted = [...products];
  if (structured.priceFilter?.operator === "lt") {
    sorted.sort((a, b) => a.price - b.price || a.id - b.id);
    return sorted;
  }
  if (structured.priceFilter?.operator === "gt") {
    sorted.sort((a, b) => b.price - a.price || a.id - b.id);
    return sorted;
  }
  if (structured.ratingFilter) {
    sorted.sort((a, b) => b.ratings - a.ratings || a.id - b.id);
    return sorted;
  }
  sorted.sort((a, b) => compareCategoryBrowseProducts(a, b, structured));
  return sorted;
}

function structuredMatchReasons(product, structured) {
  const reasons = [];
  if (structured.category) {
    reasons.push(`Product category matches ${structured.category}`);
  }
  if (structured.priceFilter && !structured.priceFilter.inrUnsupported) {
    const { operator, threshold } = structured.priceFilter;
    reasons.push(
      operator === "lt"
        ? `Catalog price $${product.price} is under $${threshold}`
        : `Catalog price $${product.price} is over $${threshold}`,
    );
  }
  if (structured.ratingFilter) {
    const { operator, threshold } = structured.ratingFilter;
    if (operator === "gt") {
      reasons.push(`Catalog rating ${product.ratings} is above ${threshold}`);
    } else if (operator === "gte") {
      reasons.push(`Catalog rating ${product.ratings} is at least ${threshold}`);
    } else {
      reasons.push(`Catalog rating ${product.ratings} is below ${threshold}`);
    }
  }
  if (structured.fastDelivery === true) {
    reasons.push("Fast delivery is available for this product");
  }
  return reasons;
}

module.exports = {
  parsePriceFilter,
  parseRatingFilter,
  parseCategoryFilter,
  parseProductLineFilter,
  parseStructuredQuery,
  hasStructuredFilters,
  isInrPriceFilter,
  queryUsesInrCurrency,
  detectUnsupportedCatalogConstraints,
  productCategory,
  productMatchesProductLine,
  productMatchesStructured,
  sortStructuredMatches,
  structuredMatchReasons,
  queryAsksFastDelivery,
  compareCategoryBrowseProducts,
};
