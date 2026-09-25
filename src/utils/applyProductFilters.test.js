import { applyProductFilters, PRODUCTS_PAGE_SIZE } from './applyProductFilters';

const sampleProducts = [
  { id: 0, name: 'Alpha Phone', price: 100, inStock: 2, fastDelivery: true, ratings: 5 },
  { id: 1, name: 'Beta Laptop', price: 300, inStock: 0, fastDelivery: false, ratings: 3 },
  { id: 2, name: 'Gamma Phone', price: 200, inStock: 1, fastDelivery: false, ratings: 4 },
];

describe('applyProductFilters', () => {
  test('filters are applied to the full list before slicing', () => {
    const filtered = applyProductFilters(sampleProducts, {
      byStock: false,
      byFastDelivery: false,
      rating: 0,
      searchStr: 'phone',
      sort: '',
    });
    expect(filtered).toHaveLength(2);
    expect(filtered.every((p) => p.name.toLowerCase().includes('phone'))).toBe(true);
  });

  test('sorting is applied before slicing', () => {
    const filtered = applyProductFilters(sampleProducts, {
      byStock: false,
      byFastDelivery: false,
      rating: 0,
      searchStr: '',
      sort: 'lowToHigh',
    });
    expect(filtered.map((p) => p.id)).toEqual([0, 2]);
    expect(filtered[0].price).toBeLessThanOrEqual(filtered[1].price);
  });

  test('page size constant is 24', () => {
    expect(PRODUCTS_PAGE_SIZE).toBe(24);
  });
});
