import React, { useContext, useState } from 'react'
import { FormControl, Dropdown, Button } from 'react-bootstrap'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { CartContext } from '../context/Context'
import { AiFillDelete } from "react-icons/ai"

export const Header = () => {
  const { state, dispatch, filterDispatch } = useContext(CartContext);
  const location = useLocation()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const handleGoToCart = () => {
    setDropdownOpen(false)
    navigate('/cart')
  }

  const cartCount = state.cart.length
  const cartToggleLabel = `Shopping cart, ${cartCount} item${cartCount === 1 ? '' : 's'}`

  return (
    <header className="headerComponent">
      <div className="wrapper site-header">
        <div className="site-header__top">
          <Link to="/" className="site-header__brand">
            ShopCart
          </Link>
          <Dropdown
            alignRight
            className="site-header__cart"
            show={dropdownOpen}
            onToggle={(isOpen) => setDropdownOpen(isOpen)}
          >
            <Dropdown.Toggle
              id="header-cart-menu"
              variant="success"
              className="header-cart-toggle"
              aria-label={cartToggleLabel}
              aria-expanded={dropdownOpen}
              aria-haspopup="menu"
            >
              <span className="header-cart-toggle__text" aria-hidden="true">
                Cart ({cartCount})
              </span>
            </Dropdown.Toggle>

            <Dropdown.Menu aria-label="Mini cart" className="header-cart-menu">
              {state.cart.length ? (
                <>
                  <ul className="header-cart-menu__list">
                    {state.cart.map((id) => {
                      const product = state.product.find((item) => item.id === id);
                      if (!product) return null;
                      return (
                        <li className="cartItem" key={product.id}>
                          <img src={product.image} alt="" />
                          <span className="cartItem__name">{product.name}</span>
                          <button
                            type="button"
                            className="icon-button"
                            aria-label={`Remove ${product.name} from cart`}
                            onClick={() => dispatch({ type: "Remove from cart", payload: { id: product.id } })}
                          >
                            <AiFillDelete aria-hidden="true" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <Button type="button" className="cart-go-btn" onClick={handleGoToCart}>
                    Go to cart
                  </Button>
                </>
              ) : (
                <Dropdown.Item eventKey="empty">Your cart is empty.</Dropdown.Item>
              )}
            </Dropdown.Menu>
          </Dropdown>
        </div>

        {location.pathname === '/' && (
          <div className="site-header__search">
            <label htmlFor="product-search" className="sr-only">
              Search for a product
            </label>
            <FormControl
              id="product-search"
              type="search"
              placeholder="Search for a product"
              className="header-search"
              onChange={(e) => filterDispatch({ type: "filterBySearch", payload: e.target.value })}
            />
          </div>
        )}
      </div>
    </header>
  )
}
