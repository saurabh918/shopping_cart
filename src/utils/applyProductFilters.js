/**
 * Applies home-page filters and sorting to the full product list (before pagination).
 */
export const PRODUCTS_PAGE_SIZE = 24;

export function applyProductFilters(
  products,
  { byStock, byFastDelivery, rating, searchStr, sort },
) {
  let filteredProducts = [...products];

  if (sort) {
    filteredProducts.sort((a, b) => (
      sort === "lowToHigh" ? a.price - b.price : sort === "HighToLow" ? b.price - a.price : 0
    ));
  }
  if (!byStock) {
    filteredProducts = filteredProducts.filter((prod) => prod.inStock);
  }
  if (byFastDelivery) {
    filteredProducts = filteredProducts.filter((prod) => prod.fastDelivery);
  }
  if (rating) {
    filteredProducts = filteredProducts.filter((prod) => prod.ratings >= rating);
  }
  if (searchStr) {
    const query = searchStr.toLowerCase();
    filteredProducts = filteredProducts.filter((prod) => prod.name.toLowerCase().includes(query));
  }

  return filteredProducts;
}
