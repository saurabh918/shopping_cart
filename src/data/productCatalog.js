import catalog from "./products.json";

/**
 * UI catalog shape used by CartContext (includes default qty).
 */
export function toCatalogProduct(record) {
  return {
    id: record.id,
    name: record.name,
    price: record.price,
    image: record.image,
    inStock: record.inStock,
    fastDelivery: record.fastDelivery,
    deliveryDays: record.deliveryDays,
    ratings: record.ratings,
    qty: 1,
  };
}

export const productRecords = catalog.products;

export const initialCatalogProducts = productRecords.map(toCatalogProduct);

/**
 * Retrieval-oriented records for a future RAG layer (no cart qty).
 */
export function getProductKnowledgeBase() {
  return productRecords.map(
    ({
      id,
      name,
      price,
      inStock,
      fastDelivery,
      deliveryDays,
      ratings,
      stockStatus,
      blurb,
      searchText,
    }) => ({
      id,
      name,
      price,
      inStock,
      fastDelivery,
      deliveryDays,
      ratings,
      stockStatus,
      blurb,
      searchText,
    })
  );
}

export function validateProductCatalog(records = productRecords) {
  const ids = records.map((item) => item.id);
  const uniqueIds = new Set(ids);
  const errors = [];

  if (records.length !== uniqueIds.size) {
    errors.push("Duplicate product ids detected.");
  }

  records.forEach((item, index) => {
    if (!Number.isInteger(item.id) || item.id < 0) {
      errors.push(`Invalid id at index ${index}: ${item.id}`);
    }
    if (item.stockStatus === "in_stock" && item.inStock <= 0) {
      errors.push(`Product ${item.id}: stockStatus in_stock but inStock is ${item.inStock}`);
    }
    if (item.stockStatus === "out_of_stock" && item.inStock !== 0) {
      errors.push(`Product ${item.id}: stockStatus out_of_stock but inStock is ${item.inStock}`);
    }
  });

  return { ok: errors.length === 0, errors, ids, count: records.length };
}

const validation = validateProductCatalog();
if (process.env.NODE_ENV !== "production" && !validation.ok) {
  // eslint-disable-next-line no-console
  console.warn("[product catalog]", validation.errors.join(" "));
}
