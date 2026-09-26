import React, { useContext, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from 'react-bootstrap'
import { AiOutlineShoppingCart } from 'react-icons/ai'
import { CartContext } from '../context/Context'
import Amount from '../compoments/amount/Amount'
import Product from '../compoments/Product'
import DemoCheckoutModal from '../compoments/checkout/DemoCheckoutModal'

const Cart = () => {
  const { state, dispatch } = useContext(CartContext)
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  const addedProducts = useMemo(
    () => state.cart
      .map((id) => state.product.find((product) => product.id === id))
      .filter(Boolean),
    [state.cart, state.product],
  )

  const amount = addedProducts.reduce((accumulator, product) => {
    const totalProductPrice = product.price * product.qty
    return accumulator + totalProductPrice
  }, 0)

  const itemCount = addedProducts.reduce((sum, product) => sum + product.qty, 0)

  const checkoutLineItems = addedProducts.map((product) => ({
    id: product.id,
    name: product.name,
    price: product.price,
    qty: product.qty,
  }))

  const handlePaymentSuccess = () => {
    dispatch({ type: 'clearCart' })
  }

  return (
    <main id="main-content" className="cart-products" tabIndex={-1}>
      <div className="wrapper cart-page">
        <div className="cart-page-header">
          <h1 className="cart-page-title">My Cart</h1>
          <Link to="/" className="cart-page-continue">
            Continue shopping
          </Link>
        </div>

        {addedProducts.length ? (
          <div className="cart-details">
            <section className="cart-details__items cart-panel" aria-labelledby="cart-items-heading">
              <h2 id="cart-items-heading" className="cart-panel__title">Your cart</h2>
              <ul className="product-list cart-item-list">
                {addedProducts.map((prod) => (
                  <Product
                    product={prod}
                    dispatch={dispatch}
                    cart={state.cart}
                    layout="row"
                    key={prod.id}
                  />
                ))}
              </ul>
            </section>

            <aside className="amount-section" aria-labelledby="order-summary-heading">
              <h2 id="order-summary-heading" className="sr-only">Order summary</h2>
              <Amount
                amount={amount}
                itemCount={itemCount}
                onProceedToCheckout={() => setCheckoutOpen(true)}
              />
            </aside>
          </div>
        ) : (
          <div className="cart-empty" role="status">
            <AiOutlineShoppingCart className="cart-empty__icon" aria-hidden="true" />
            <h2 className="cart-empty__title">Your cart is empty</h2>
            <p className="cart-empty__text">
              Looks like you haven&apos;t added anything to your cart yet.
            </p>
            <Button as={Link} to="/" variant="primary" className="cart-empty__cta">
              Continue shopping
            </Button>
          </div>
        )}
      </div>

      <DemoCheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        lineItems={checkoutLineItems}
        totalAmount={amount}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </main>
  )
}

export default Cart
