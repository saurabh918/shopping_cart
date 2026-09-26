import { validateDemoCheckout } from './demoCheckoutValidation';

describe('validateDemoCheckout', () => {
  it('accepts valid demo card fields', () => {
    const result = validateDemoCheckout('card', {
      cardholderName: 'Demo User',
      cardNumber: '4111 1111 1111 1111',
      expiry: '12/30',
      cvv: '123',
    });
    expect(result.isValid).toBe(true);
  });

  it('rejects invalid card fields', () => {
    const result = validateDemoCheckout('card', {
      cardholderName: 'A',
      cardNumber: '1234',
      expiry: '13/30',
      cvv: '12',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.cardNumber).toBeDefined();
  });

  it('accepts valid UPI id', () => {
    const result = validateDemoCheckout('upi', { upiId: 'demo@bank' });
    expect(result.isValid).toBe(true);
  });

  it('accepts cash on delivery without fields', () => {
    const result = validateDemoCheckout('cod', {});
    expect(result.isValid).toBe(true);
  });
});
