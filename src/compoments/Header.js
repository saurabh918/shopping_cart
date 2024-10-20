import React, { useContext, useState } from 'react'
import { Container, FormControl, Navbar,Dropdown, Button } from 'react-bootstrap'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { CartContext } from '../context/Context'
import {AiFillDelete} from "react-icons/ai"


export const Header = () => {
  const {state,dispatch,filterDispatch} = useContext(CartContext);
  const location = useLocation()
  const navigate = useNavigate()

  const [dropdownOpen,setDropdownOpen] = useState(false)

  const handleGoToCart = () => {
    setDropdownOpen(false)
    navigate('/cart')
  }
  return (
    <div className='headerComponent'>
      <div className="wrapper">
      <Navbar>
        <Container>
          <Navbar.Brand>
          <Link to="/">Lets Buy Something!</Link>
          </Navbar.Brand>
          {
            location.pathname === '/' &&
          <Navbar.Text>
            <FormControl
            placeholder='Search for a product'
             className="m-auto" onChange={(e)=>filterDispatch({ type:"filterBySearch",payload:e.target.value})}
            />
          </Navbar.Text>
          }
          <Dropdown align-end="true" className="ml-auto" show={dropdownOpen} onToggle={isOpen => setDropdownOpen(isOpen)}>
            <Dropdown.Toggle id="dropdown-custom-components" variant='success'>
              My cart {state.cart.length}
            </Dropdown.Toggle>

            <Dropdown.Menu variant='success' bg="success">
              {
                state.cart.length ? (
                    <>
                      {state.cart.map((cart) => (
                        <div className='cartItem' key={cart}>
                          <img src={state.product[cart].image} alt="My cart" />
                          <span>{state.product[cart].name}</span>
                          <AiFillDelete onClick={() => dispatch({type: "Remove from cart", payload: {id: cart}})} />
                        </div>
                      ))}
                      {/* <Link to="/cart"> */}
                        <Button onClick={handleGoToCart}>Go to cart</Button>
                      {/* </Link> */}
                    </>
                ):(
                  <Dropdown.Item eventKey="1">This cart is empty!</Dropdown.Item>
                )
              }
              
            </Dropdown.Menu>
          </Dropdown>
        </Container>
      </Navbar>
      </div>
    </div>
  )
}
