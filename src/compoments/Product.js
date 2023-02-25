import React from 'react'
import Rating from './Rating'

const Product = ({product,dispatch}) => {
  return (
    <li>
      <img src={product.image} />
      <p className='product-title'>{product.name}</p>
      <p>{product.price}$</p>
      <p>{product.deliveryDays} days delivery</p>
      <p><Rating rating={product.ratings} /></p>
      <button disabled={(!product.inStock)} onClick={()=>dispatch({type:"Add to cart"})} >{!product.inStock ? "Out of Stock" : "Add to Cart" } </button>
    </li>
  )
}

export default Product