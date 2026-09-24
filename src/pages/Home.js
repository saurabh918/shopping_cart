import React, { useContext } from 'react'
import { CartContext } from '../context/Context'
import Filter from '../compoments/Filter';
import Product from '../compoments/Product';


const Home = () => {
  const {state,filterState:{ byStock,byFastDelivery,rating,searchStr,sort },dispatch} = useContext(CartContext);

  const filterProducts = ()=>{
    let filteredProducts = [...state.product];

    if(sort) {
      filteredProducts.sort((a,b)=>sort === "lowToHigh" ? a.price - b.price : sort === "HighToLow" ? b.price - a.price : 0)
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
      const query = searchStr.toLowerCase();
      filteredProducts = filteredProducts.filter((prod) => prod.name.toLowerCase().includes(query))
    }
    return filteredProducts;
  }
  const visibleProducts = filterProducts();
  return (
    <main id="main-content" className='home-page' tabIndex={-1}>
    <div className='wrapper home-page__layout'>
      <Filter />
    {visibleProducts.length ? (
    <section className="home-page__products" aria-labelledby="products-heading">
      <h1 id="products-heading" className="page-heading">Products</h1>
    <ul className='product-list'>
      {visibleProducts.map((prod)=>(
        <Product product={prod} dispatch={dispatch} cart={state.cart} key={prod.id} />
      ))}
    </ul>
    </section>
    ) : (
      <section className="home-page__products" aria-labelledby="products-heading">
        <h1 id="products-heading" className="page-heading">Products</h1>
      <p className="empty-state" role="status">No products match your filters.</p>
      </section>
    )}
    </div>
    </main>
  )
}

export default Home
