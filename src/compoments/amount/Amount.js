import React from 'react'

const Amount = ({ amount, itemCount, onProceedToCheckout }) => {
  return (
    <>
      <p className="amount-section__label" id="order-summary-label">Order summary</p>

      <dl className="amount-section__rows">
        <div className="amount-section__row">
          <dt>Subtotal</dt>
          <dd>${amount}</dd>
        </div>
        <div className="amount-section__row">
          <dt>Items</dt>
          <dd>{itemCount}</dd>
        </div>
      </dl>

      <div className="amount-section__divider" aria-hidden="true" />

      <p className="amount-section__total" aria-labelledby="order-summary-label">
        <span className="amount-section__total-label">Total</span>
        <span className="amount-section__total-value">${amount}</span>
      </p>

      <p className="amount-section__note">Taxes and shipping calculated at checkout.</p>
      <button
        type="button"
        className="btn-action btn-action--checkout"
        onClick={onProceedToCheckout}
      >
        Proceed to checkout
      </button>
    </>
  )
}

export default Amount
