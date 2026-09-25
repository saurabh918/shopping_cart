import stagingCatalog from "../data/products.generated.json";

/**
 * Staging knowledge base for retrieval tests (same record shape as getProductKnowledgeBase).
 * Does not use REACT_APP_*; loads products.generated.json directly.
 */
export function getStagingProductKnowledgeBase() {
  return stagingCatalog.products.map(
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

export const STAGING_CATALOG_SIZE = stagingCatalog.products.length;
