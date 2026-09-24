import React, { useContext } from 'react'
import { Link } from 'react-router-dom'
import { CartContext } from '../context/Context'
import Amount from '../compoments/amount/Amount'
import Product from '../compoments/Product'

const Cart = () => {
  const {state,dispatch} = useContext(CartContext)
  const addedProducts = state.cart
    .map((id) => state.product.find((product) => product.id === id))
    .filter(Boolean)
  const amount = addedProducts.reduce((accumulator,number) => {
    const totalProductPrice = number.price * number.qty
    return parseInt(accumulator + totalProductPrice, 10)
  }, 0)
  
  return (
    <main id="main-content" className='cart-products' tabIndex={-1}>
      <div className="wrapper">
      <h1 className="cart-page-title">My Cart</h1>
      {addedProducts.length ? (
      <div className='cart-details'>
      <section className="cart-details__items" aria-labelledby="cart-items-heading">
        <h2 id="cart-items-heading" className="sr-only">Cart items</h2>
      <ul className='product-list'>
      {addedProducts.map((prod)=>(
        <Product product={prod} dispatch={dispatch} cart={state.cart} layout="row" key={prod.id} />
      ))}
      </ul>
      </section>
      <aside className="amount-section" aria-labelledby="order-summary-heading">
        <h2 id="order-summary-heading" className="sr-only">Order summary</h2>
        <Amount amount={amount}/>
      </aside>
      </div>
      ) : (
        <div className="empty-state" role="status">
          <p>Your cart is empty.</p>
          <Link to="/">Continue shopping</Link>
        </div>
      )}
      </div>
    </main>
  )
}

export default Cart
