import { catalogMeta } from "./productCatalog";

/** Dev-only hint when the small legacy seed catalog is active (optional staging UI for full catalog testing). */
export function shouldShowProductionCatalogDevHint() {
  return (
    process.env.NODE_ENV === "development"
    && !catalogMeta.isStagingCatalog
    && catalogMeta.totalProducts <= 6
  );
}

export { catalogMeta };
