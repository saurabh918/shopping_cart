import productionCatalog from "./products.json";
import { createCatalogExports, toCatalogProduct } from "./productCatalog.shared";

const exportsFromCatalog = createCatalogExports(productionCatalog, false);

export { toCatalogProduct };
export const catalogMeta = exportsFromCatalog.catalogMeta;
export const productRecords = exportsFromCatalog.productRecords;
export const initialCatalogProducts = exportsFromCatalog.initialCatalogProducts;
export const getProductKnowledgeBase = exportsFromCatalog.getProductKnowledgeBase;
export const validateProductCatalog = exportsFromCatalog.validateProductCatalog;
