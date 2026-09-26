/**
 * Counts non-default filter selections for UI badge display only.
 * Uses the same filterState shape as the existing filter reducer.
 */
export function countActiveFilters(filterState) {
  if (!filterState) return 0;

  let count = 0;
  if (filterState.sort) count += 1;
  if (filterState.byStock) count += 1;
  if (filterState.byFastDelivery) count += 1;
  if (filterState.rating > 0) count += 1;
  if (String(filterState.searchStr || "").trim()) count += 1;
  return count;
}
