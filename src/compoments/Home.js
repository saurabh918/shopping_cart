import React, { useContext } from 'react'
import { CartContext } from '../context/Context'
import Filter from './Filter';
import Product from './Product';


const Home = () => {
  const {state,dispatch} = useContext(CartContext);
  console.log(state)
  return (
    <div className='home-page'>
    <div className='wrapper'>
      <Filter />
    <ul className='product-list'>
      {state.product.map((prod)=>(
        <Product product={prod} dispatch={dispatch} cart={state.cart} key={prod.id} />
      ))}
    </ul>
    </div>
    </div>
  )
}

export default Home