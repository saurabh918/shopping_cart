import React, { useContext } from 'react'
import { CartContext } from '../context/Context'
import Filter from './Filter';
import Product from './Product';


const Home = () => {
  const {state,filterState:{ byStock,byFastDelivery,rating,searchStr,sort },dispatch} = useContext(CartContext);

  const filterProducts = ()=>{
    let filteredProducts = state.product;

    if(sort) {
      filteredProducts = filteredProducts.sort((a,b)=>sort === "lowToHigh" ? a.price - b.price : sort === "lowToHigh" ? b.price - a.price : 0)
    }
    if(!byStock) {
      filteredProducts = filteredProducts.filter((prod) => prod.inStock)
    }
    if(byFastDelivery) {
      filteredProducts = filteredProducts.filter((prod) => prod.fastDelivery)
    }
    if(rating) {
      filteredProducts = filteredProducts.filter((prod)=>prod.ratings >= rating)
    }
    if(searchStr) {
      filteredProducts = filteredProducts.filter((prod) => prod.name.toLowerCase().includes(searchStr))
    }
    return filteredProducts;
  }
  return (
    <div className='home-page'>
    <div className='wrapper'>
      <Filter />
    <ul className='product-list'>
      {filterProducts().map((prod)=>(
        <Product product={prod} dispatch={dispatch} cart={state.cart} key={prod.id} />
      ))}
    </ul>
    </div>
    </div>
  )
}

export default Home