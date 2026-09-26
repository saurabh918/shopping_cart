/**
 * Derives browse-by-name links for the filter sidebar from the current product list.
 * Uses existing header/search name matching (filterBySearch) — no new filter rules.
 */
const BROWSE_DEFINITIONS = [
  { label: "Laptops", term: "laptop" },
  { label: "Macbooks", term: "macbook" },
  { label: "Phones", term: "phone" },
];

export function getSidebarBrowseCategories(products) {
  if (!Array.isArray(products) || products.length === 0) {
    return [];
  }

  return BROWSE_DEFINITIONS.filter(({ term }) =>
    products.some((product) =>
      String(product.name || "")
        .toLowerCase()
        .includes(term),
    ),
  );
}
