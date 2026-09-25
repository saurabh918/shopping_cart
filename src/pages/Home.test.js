import React from 'react';
import { render, screen, within, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Home from './Home';
import { CartContext } from '../context/Context';

function buildProduct(id) {
  return {
    id,
    name: `Test Product ${id}`,
    price: 100 + id,
    image: 'https://example.com/image.jpg',
    inStock: 5,
    fastDelivery: true,
    deliveryDays: 2,
    ratings: 4,
    qty: 1,
  };
}

function renderHome({
  products = Array.from({ length: 50 }, (_, i) => buildProduct(i)),
  filterState = {
    byStock: true,
    byFastDelivery: false,
    rating: 0,
    searchStr: '',
    sort: '',
  },
} = {}) {
  const dispatch = jest.fn();
  const filterDispatch = jest.fn();
  render(
    <CartContext.Provider
      value={{
        state: { product: products, cart: [] },
        dispatch,
        filterState,
        filterDispatch,
      }}
    >
      <Home />
    </CartContext.Provider>,
  );
  return { dispatch, filterDispatch };
}

jest.mock('../data/catalogRuntimeMeta', () => ({
  catalogMeta: {
    isStagingCatalog: false,
    totalProducts: 50,
  },
  shouldShowProductionCatalogDevHint: () => false,
}));

describe('Home Load More', () => {
  test('default visible count is 24', () => {
    renderHome();
    expect(screen.getByText(/Showing 24 of 50 products/i)).toBeInTheDocument();
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(24);
  });

  test('Load More increases visible products by 24', () => {
    renderHome();
    fireEvent.click(screen.getByRole('button', { name: /load .* more products/i }));
    expect(screen.getByText(/Showing 48 of 50 products/i)).toBeInTheDocument();
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(48);
  });

  test('Load More does not exceed matching product count', () => {
    renderHome();
    fireEvent.click(screen.getByRole('button', { name: /load .* more products/i }));
    fireEvent.click(screen.getByRole('button', { name: /load .* more products/i }));
    expect(screen.getByText(/Showing 50 of 50 products/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /load .* more products/i })).not.toBeInTheDocument();
  });

  test('Load More is hidden when all matching products fit in one page', () => {
    renderHome({ products: Array.from({ length: 10 }, (_, i) => buildProduct(i)) });
    expect(screen.getByText(/Showing 10 of 10 products/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /load .* more products/i })).not.toBeInTheDocument();
  });

  test('empty filter results show empty state', () => {
    renderHome({ filterState: { byStock: true, byFastDelivery: false, rating: 0, searchStr: 'zzznomatch', sort: '' } });
    expect(screen.getByText(/no products match your filters/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /load .* more products/i })).not.toBeInTheDocument();
  });

  test('filter changes reset visible count to 24', () => {
    const products = Array.from({ length: 50 }, (_, i) => buildProduct(i));
    let filterState = {
      byStock: true,
      byFastDelivery: false,
      rating: 0,
      searchStr: '',
      sort: '',
    };
    const dispatch = jest.fn();
    const filterDispatch = jest.fn();
    const { rerender } = render(
      <CartContext.Provider
        value={{ state: { product: products, cart: [] }, dispatch, filterState, filterDispatch }}
      >
        <Home />
      </CartContext.Provider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /load .* more products/i }));
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(48);

    filterState = { ...filterState, searchStr: 'Test Product 4' };
    rerender(
      <CartContext.Provider
        value={{ state: { product: products, cart: [] }, dispatch, filterState, filterDispatch }}
      >
        <Home />
      </CartContext.Provider>,
    );
    expect(within(screen.getByRole('list')).getAllByRole('listitem').length).toBeLessThanOrEqual(24);
    expect(screen.getByText(/Showing \d+ of \d+ products/i)).toBeInTheDocument();
  });
});

describe('Home staging indicator', () => {
  test('does not show staging banner when staging catalog is inactive', () => {
    renderHome();
    expect(screen.queryByText(/staging catalog/i)).not.toBeInTheDocument();
  });
});
