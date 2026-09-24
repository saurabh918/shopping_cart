import React from 'react'

const Amount = ({ amount }) => {
  return (
    <>
      <p className="amount-section__label" id="order-summary-label">Order summary</p>
      <p className="amount-section__total" aria-labelledby="order-summary-label">
        <span className="sr-only">Total amount</span>
        ${amount}
      </p>
      <p className="amount-section__note">Taxes and shipping calculated at checkout.</p>
      <button type="button" className="btn-action btn-action--checkout">
        Proceed to checkout
      </button>
    </>
  )
}

export default Amount
