describe('productCatalog selection', () => {
  test('production mode uses the canonical 1,000-product catalog by default', () => {
    jest.resetModules();
    const { catalogMeta, initialCatalogProducts } = require('./productCatalog');
    expect(catalogMeta.isStagingCatalog).toBe(false);
    expect(catalogMeta.sourceLabel).toBe('products.json');
    expect(initialCatalogProducts).toHaveLength(1000);
  });

  test('staging module uses the generated catalog', () => {
    jest.resetModules();
    const { catalogMeta, initialCatalogProducts } = require('./productCatalog.staging');
    expect(catalogMeta.isStagingCatalog).toBe(true);
    expect(initialCatalogProducts).toHaveLength(1000);
  });
});
