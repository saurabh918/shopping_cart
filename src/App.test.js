import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';
import { CartProvider } from './context/Context';

test('renders the ShopCart home page with navigation and products', () => {
  render(
    <CartProvider>
      <App />
    </CartProvider>
  );
  expect(screen.getByRole('link', { name: /shopcart/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /products/i })).toBeInTheDocument();
});
