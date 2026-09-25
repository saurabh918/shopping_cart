describe('productCatalog selection', () => {
  test('production mode uses the 6-product catalog by default', () => {
    jest.resetModules();
    const { catalogMeta, initialCatalogProducts } = require('./productCatalog');
    expect(catalogMeta.isStagingCatalog).toBe(false);
    expect(initialCatalogProducts).toHaveLength(6);
  });

  test('staging module uses the generated catalog', () => {
    jest.resetModules();
    const { catalogMeta, initialCatalogProducts } = require('./productCatalog.staging');
    expect(catalogMeta.isStagingCatalog).toBe(true);
    expect(initialCatalogProducts).toHaveLength(1000);
  });
});
