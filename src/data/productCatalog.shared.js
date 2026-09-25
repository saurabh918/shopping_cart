/**
 * Shared catalog helpers; production and staging entry modules supply the JSON document.
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

export function createCatalogExports(activeCatalog, useStagingCatalog) {
  const productRecords = activeCatalog.products;
  const initialCatalogProducts = productRecords.map(toCatalogProduct);

  const catalogMeta = {
    isStagingCatalog: useStagingCatalog,
    sourceLabel: useStagingCatalog ? "products.generated.json" : "products.json",
    totalProducts: productRecords.length,
  };

  function getProductKnowledgeBase() {
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
      }),
    );
  }

  function validateProductCatalog(records = productRecords) {
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

  return {
    catalogMeta,
    productRecords,
    initialCatalogProducts,
    getProductKnowledgeBase,
    validateProductCatalog,
  };
}
