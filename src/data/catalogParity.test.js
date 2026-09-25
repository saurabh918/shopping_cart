const productionCatalog = require('./products.json');
const { getProductKnowledgeBase } = require('../../netlify/lib/catalog.cjs');

describe('production catalog parity (browser vs server)', () => {
  test('frontend and server share the same product count and ids', () => {
    jest.resetModules();
    const { productRecords } = require('./productCatalog');
    const serverRecords = getProductKnowledgeBase({ ASSISTANT_CATALOG_MODE: 'production' });

    expect(productRecords.length).toBe(1000);
    expect(serverRecords.length).toBe(1000);

    const frontendIds = productRecords.map((p) => p.id).join(',');
    const serverIds = serverRecords.map((p) => p.id).join(',');
    expect(frontendIds).toBe(serverIds);

    const jsonIds = productionCatalog.products.map((p) => p.id).join(',');
    expect(frontendIds).toBe(jsonIds);
  });
});
