import React, { useContext } from 'react'
import { Container, FormControl, Navbar, NavbarBrand,Dropdown } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { CartContext } from '../context/Context'
import {AiFillDelete} from "react-icons/ai"


export const Header = () => {
  const {state,dispatch} = useContext(CartContext);
  console.log(state)
  return (
    <div className='headerComponent'>
      <div className="wrapper">
      <Navbar style={{height:80}}>
        <Container>
          <Navbar.Brand>
          <Link to="/">Shopping from Home</Link>
          </Navbar.Brand>
          <Navbar.Text>
            <FormControl
            placeholder='Add a product'
            style={{width: '500px'}} className="m-auto"
            />
          </Navbar.Text>
          <Dropdown align-end="true" className="ml-auto">
            <Dropdown.Toggle id="dropdown-custom-components" variant='success'>
              My cart {state.cart.length}
            </Dropdown.Toggle>

            <Dropdown.Menu variant='success' bg="success">
              {
                state.cart.length ? (
                  state.cart.map((cart) => {return (<div className='cartItem'>
                    <img src={state.product[cart].image} />
                    <span>{state.product[cart].name}</span>
                    <AiFillDelete />
                  </div>)} 
                  )
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
