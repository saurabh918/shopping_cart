import React from 'react'
import { Form } from 'react-bootstrap'
import Rating from './Rating'

const Product = ({ product, dispatch, cart, layout = 'grid' }) => {
  const stock = Number(product.inStock);
  const maxQty = Number.isFinite(stock) && stock > 0 ? Math.min(3, Math.floor(stock)) : 0;
  const qtyOptions = maxQty > 0
    ? Array.from({ length: maxQty }, (_, index) => index + 1)
    : [product.qty];
  const inCart = cart.some(p => p === product.id);
  const outOfStock = !product.inStock;

  let actionButton;
  if (inCart) {
    actionButton = (
      <button
        type="button"
        className={outOfStock ? "btn-action btn-action--unavailable remove-button" : "btn-action btn-action--danger remove-button"}
        disabled={outOfStock}
        onClick={() => dispatch({ type: "Remove from cart", payload: { id: product.id } })}
      >
        {outOfStock ? "Out of Stock" : "Remove from cart"}
      </button>
    );
  } else {
    actionButton = (
      <button
        type="button"
        className={outOfStock ? "btn-action btn-action--unavailable" : "btn-action btn-action--primary"}
        disabled={outOfStock}
        onClick={() => dispatch({ type: "Add to cart", payload: { id: product.id } })}
      >
        {outOfStock ? "Out of Stock" : "Add to Cart"}
      </button>
    );
  }

  return (
    <li className={`product-card product-card--${layout}`}>
      <div className="product-card__media">
        <img src={product.image} alt={product.name} />
      </div>
      <div className="product-card__body">
        <h3 className='product-title'>{product.name}</h3>
        <p className="product-price">${product.price}</p>
        <p className="product-meta">{product.deliveryDays} days delivery</p>
        <p className="product-card__rating">
          <span role="img" aria-label={`Rated ${product.ratings} out of 5`}>
            <Rating rating={product.ratings} />
          </span>
        </p>
      </div>
      <div className="product-card__side">
        <div className="product-card__actions">
          {actionButton}
        </div>
        <Form.Group controlId={`quantity-${product.id}`} className='quantity-dropdown'>
          <Form.Label className="quantity-dropdown__label">Quantity</Form.Label>
          <Form.Control
            className='qty-input'
            as="select"
            aria-label={`Quantity for ${product.name}`}
            value={product.qty}
            disabled={maxQty < 1}
            onChange={(e) => { dispatch({ type: "quantityUpdated", payload: { id: product.id, qty: Number(e.target.value) } }) }}
          >
            {qtyOptions.map((qty) => (
              <option value={qty} key={qty}>{qty}</option>
            ))}
          </Form.Control>
        </Form.Group>
      </div>
    </li>
  )
}

export default Product
