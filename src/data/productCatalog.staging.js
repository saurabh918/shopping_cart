import stagingCatalog from "./products.generated.json";
import { createCatalogExports, toCatalogProduct } from "./productCatalog.shared";

const exportsFromCatalog = createCatalogExports(stagingCatalog, true);

export { toCatalogProduct };
export const catalogMeta = exportsFromCatalog.catalogMeta;
export const productRecords = exportsFromCatalog.productRecords;
export const initialCatalogProducts = exportsFromCatalog.initialCatalogProducts;
export const getProductKnowledgeBase = exportsFromCatalog.getProductKnowledgeBase;
export const validateProductCatalog = exportsFromCatalog.validateProductCatalog;
