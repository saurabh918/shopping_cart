import React, { useContext } from 'react'
import { CartContext } from '../context/Context'
import Amount from './Amount'
import Product from './Product'

const Cart = () => {
  const {state,dispatch} = useContext(CartContext)
  const addedProducts = state.cart.map(cart => state.product[cart])
  const amount = addedProducts.reduce((acc,number)=>parseInt(acc+(number.price * number.qty)),0)
  // console.log(amount)
  console.log(addedProducts)
  return (
    <div className='cart-products'>
      <div className="wrapper">
      <h1 className='ml-5 mb-5'>My Cart</h1>
      <div className='cart-details'>
      <ul className='product-list'>
      {addedProducts.map((prod)=>(
        <Product product={prod} dispatch={dispatch} cart={state.cart} key={prod.id} />
      ))}
      </ul>
      <div className="amount-section">
        <Amount amount={amount}/>
      </div>
      </div>
      </div>
    </div>
  )
}

export default Cart