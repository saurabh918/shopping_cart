/**
 * Structured catalog filters (category, price, rating, delivery) applied as AND conditions.
 */

const PRICE_LT_PATTERN =
  /\b(?:under|below|less than|cheaper than)\s+\$?(\d+(?:\.\d+)?)\b/;
const PRICE_GT_PATTERN =
  /\b(?:over|more than)\s+\$?(\d+(?:\.\d+)?)\b/;

const RATING_ABOVE_PATTERN =
  /\b(?:rated|rating|ratings)\s+(?:above|over)\s+(\d+)\b/;
const RATED_AND_ABOVE_PATTERN =
  /\brated\s+(\d+)\s+and\s+above\b/;
const RATING_AT_LEAST_PATTERN =
  /\b(?:rated|rating|ratings)\s+(?:at least|minimum)\s+(\d+)\b/;
const RATING_BELOW_PATTERN =
  /\b(?:rated|rating|ratings)\s+below\s+(\d+)\b/;

export function parsePriceFilter(normalized) {
  if (!normalized) return null;

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

export function parseRatingFilter(normalized) {
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

export function parseCategoryFilter(normalized) {
  if (!normalized) return null;

  const hasLaptop =
    /\b(laptops?|notebooks?)(?:\s+products?)?\b/.test(normalized)
    || /\bshow me (?:the )?(laptops?|notebooks?)\b/.test(normalized);
  const hasMobile =
    /\bmobile(?:\s+products?)?\b/.test(normalized)
    || /\b(?:phones|mobiles)(?:\s+products?)?\b/.test(normalized)
    || /\bphone products\b/.test(normalized);

  if (hasLaptop && !hasMobile) return "laptop";
  if (hasMobile && !hasLaptop) return "mobile";
  return null;
}

export function queryAsksFastDelivery(normalized) {
  return (
    /\b(fast delivery|fast shipping|express delivery)\b/.test(normalized)
    || (/\bfast\b/.test(normalized) && /\bdelivery\b/.test(normalized))
    || normalized === "fast"
  );
}

/**
 * @returns {{ category: string|null, priceFilter: object|null, ratingFilter: object|null, fastDelivery: boolean|null }}
 */
export function parseStructuredQuery(normalized) {
  return {
    category: parseCategoryFilter(normalized),
    priceFilter: parsePriceFilter(normalized),
    ratingFilter: parseRatingFilter(normalized),
    fastDelivery: queryAsksFastDelivery(normalized) ? true : null,
  };
}

export function hasStructuredFilters(structured) {
  return Boolean(
    structured.category
    || structured.priceFilter
    || structured.ratingFilter
    || structured.fastDelivery === true,
  );
}

/** @returns {'laptop'|'mobile'|null} */
export function productCategory(product) {
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

export function productMatchesStructured(product, structured) {
  if (structured.category) {
    if (productCategory(product) !== structured.category) return false;
  }

  if (structured.priceFilter) {
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

export function sortStructuredMatches(products, structured) {
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
  sorted.sort((a, b) => a.id - b.id);
  return sorted;
}

export function structuredMatchReasons(product, structured) {
  const reasons = [];
  if (structured.category) {
    reasons.push(`Product category matches ${structured.category}`);
  }
  if (structured.priceFilter) {
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
