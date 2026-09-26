import { reducer } from './Reducer';

describe('cart reducer', () => {
  const baseState = {
    cart: [0, 1],
    product: [{ id: 0, qty: 1 }, { id: 1, qty: 2 }],
  };

  it('clears the cart on clearCart', () => {
    const next = reducer(baseState, { type: 'clearCart' });
    expect(next.cart).toEqual([]);
    expect(next.product).toEqual(baseState.product);
  });
});
