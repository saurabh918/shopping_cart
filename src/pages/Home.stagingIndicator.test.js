import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CartContext } from '../context/Context';

jest.mock('../data/catalogRuntimeMeta', () => ({
  catalogMeta: {
    isStagingCatalog: true,
    totalProducts: 1000,
  },
  shouldShowProductionCatalogDevHint: () => false,
}));

const Home = require('./Home').default;

describe('Home staging indicator', () => {
  test('shows staging banner when staging catalog is active in non-production', () => {
    render(
      <CartContext.Provider
        value={{
          state: {
            product: [{
              id: 0,
              name: 'Test',
              price: 1,
              image: 'https://example.com/x.jpg',
              inStock: 1,
              fastDelivery: false,
              deliveryDays: 1,
              ratings: 3,
              qty: 1,
            }],
            cart: [],
          },
          dispatch: jest.fn(),
          filterState: { byStock: true, byFastDelivery: false, rating: 0, searchStr: '', sort: '' },
          filterDispatch: jest.fn(),
        }}
      >
        <Home />
      </CartContext.Provider>,
    );
    expect(screen.getByText(/Staging catalog: 1,000 products/i)).toBeInTheDocument();
  });
});
