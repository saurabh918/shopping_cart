import { catalogMeta } from "./productCatalog";

/** Dev-only hint when the production catalog is active (staging is opt-in). */
export function shouldShowProductionCatalogDevHint() {
  return (
    process.env.NODE_ENV === "development"
    && !catalogMeta.isStagingCatalog
  );
}

export { catalogMeta };
