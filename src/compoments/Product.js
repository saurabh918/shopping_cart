import React from 'react'
import Rating from './Rating'

const Product = ({product,dispatch,cart}) => {
  return (
    <li>
      <img src={product.image} />
      <p className='product-title'>{product.name}</p>
      <p>{product.price}$</p>
      <p>{product.deliveryDays} days delivery</p>
      <p><Rating rating={product.ratings} /></p>
      {
        cart.some(p=> p === product.id) ? (
          <button className='remove-button' disabled={(!product.inStock)} onClick={()=>dispatch({type:"Remove from cart",payload:{id:product.id}})} >{!product.inStock ? "Out of Stock" : "Remove from cart" } </button>
        ):(
          <button disabled={(!product.inStock)} onClick={()=>dispatch({type:"Add to cart",payload:{id:product.id}})} >{!product.inStock ? "Out of Stock" : "Add to Cart" } </button>
        )
      }
    </li>
  )
}

export default Product