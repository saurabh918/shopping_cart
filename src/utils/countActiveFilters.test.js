import { countActiveFilters } from './countActiveFilters';

describe('countActiveFilters', () => {
  it('returns 0 for default filter state', () => {
    expect(countActiveFilters({
      byStock: false,
      byFastDelivery: false,
      rating: 0,
      searchStr: '',
      sort: '',
    })).toBe(0);
  });

  it('counts each active non-default filter', () => {
    expect(countActiveFilters({
      byStock: true,
      byFastDelivery: true,
      rating: 3,
      searchStr: 'phone',
      sort: 'lowToHigh',
    })).toBe(5);
  });
});
