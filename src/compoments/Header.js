import React from 'react'
import { Container, FormControl, Navbar, NavbarBrand,Dropdown } from 'react-bootstrap'
import { Link } from 'react-router-dom'

export const Header = () => {
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
              My cart
            </Dropdown.Toggle>

            <Dropdown.Menu variant='success' bg="success">
              <Dropdown.Item eventKey="1">This cart is empty!</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </Container>
      </Navbar>
      </div>
    </div>
  )
}
