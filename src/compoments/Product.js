import React, { useContext } from 'react'
import { Form } from 'react-bootstrap'
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
        cart.some(p => p === product.id) ? (
          <button className='remove-button' disabled={(!product.inStock)} onClick={()=>dispatch({type:"Remove from cart",payload:{id:product.id}})} >{!product.inStock ? "Out of Stock" : "Remove from cart" } </button>
        ):(
          <button disabled={(!product.inStock)} onClick={()=>dispatch({type:"Add to cart",payload:{id:product.id}})} >{!product.inStock ? "Out of Stock" : "Add to Cart" } </button>
        )
      }
          <Form.Group controlId="formBasicSelect" className='quantity-dropdown'>
        <Form.Label>Select Quantity</Form.Label>
        <Form.Control
          className='qty-input'
          as="select"
          value={product.qty}
          onChange={(e) => {dispatch({type:"quantityUpdated",payload:{id:product.id,qty:e.target.value}}) }}
        >
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
        </Form.Control>
      </Form.Group>
    </li>
  )
}

export default Product