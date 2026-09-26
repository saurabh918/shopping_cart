import React, { useContext, useEffect, useState } from 'react'
import { Button } from 'react-bootstrap'
import { CartContext } from '../context/Context'
import FilterDrawer from '../compoments/FilterDrawer';
import HomePageDiscovery from '../compoments/HomePageDiscovery';
import Product from '../compoments/Product';
import FloatingShoppingAssistant from '../compoments/ShoppingAssistant/FloatingShoppingAssistant';
import { catalogMeta, shouldShowProductionCatalogDevHint } from '../data/catalogRuntimeMeta';
import { applyProductFilters, PRODUCTS_PAGE_SIZE } from '../utils/applyProductFilters';

const showStagingIndicator = catalogMeta.isStagingCatalog && process.env.NODE_ENV !== 'production';
const showProductionDevHint = shouldShowProductionCatalogDevHint();

const Home = () => {
  const {
    state,
    filterState: { byStock, byFastDelivery, rating, searchStr, sort },
    dispatch,
  } = useContext(CartContext);

  const [visibleCount, setVisibleCount] = useState(PRODUCTS_PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PRODUCTS_PAGE_SIZE);
  }, [byStock, byFastDelivery, rating, searchStr, sort]);

  const filteredProducts = applyProductFilters(state.product, {
    byStock,
    byFastDelivery,
    rating,
    searchStr,
    sort,
  });

  const displayedProducts = filteredProducts.slice(0, visibleCount);
  const totalMatching = filteredProducts.length;
  const hasMore = visibleCount < totalMatching;

  const handleLoadMore = () => {
    setVisibleCount((current) => Math.min(current + PRODUCTS_PAGE_SIZE, totalMatching));
  };

  return (
    <FloatingShoppingAssistant>
    <main id="main-content" className='home-page' tabIndex={-1}>
    {showStagingIndicator && (
      <p className="catalog-staging-banner" role="status">
        Staging catalog: {catalogMeta.totalProducts.toLocaleString()} products
      </p>
    )}
    {showProductionDevHint && (
      <p className="catalog-staging-banner catalog-staging-banner--hint" role="status">
        Development catalog: {catalogMeta.totalProducts} products (production JSON).
        Run <code className="catalog-hint-code">npm run start:staging</code> or set
        {' '}
        <code className="catalog-hint-code">REACT_APP_USE_STAGING_CATALOG=true</code>
        {' '}
        in <code className="catalog-hint-code">.env.local</code> and restart the dev server for 1,000-product UI testing.
      </p>
    )}
    <div className="wrapper home-page__main">
    <div className="home-page__toolbar">
      <div className="home-page__toolbar-filters">
        <FilterDrawer />
      </div>
      <HomePageDiscovery />
    </div>
    {totalMatching ? (
    <section className="home-page__products" aria-labelledby="products-heading">
      <h1 id="products-heading" className="page-heading">Products</h1>
    <ul className='product-list'>
      {displayedProducts.map((prod)=>(
        <Product product={prod} dispatch={dispatch} cart={state.cart} key={prod.id} />
      ))}
    </ul>
    <div className="product-list-footer">
      <p className="product-list-summary" role="status">
        Showing {displayedProducts.length.toLocaleString()} of {totalMatching.toLocaleString()} products
      </p>
      {hasMore ? (
        <Button
          type="button"
          variant="outline-primary"
          className="load-more-btn"
          onClick={handleLoadMore}
          aria-label={`Load ${Math.min(PRODUCTS_PAGE_SIZE, totalMatching - visibleCount)} more products`}
        >
          Load more
        </Button>
      ) : null}
    </div>
    </section>
    ) : (
      <section className="home-page__products" aria-labelledby="products-heading">
        <h1 id="products-heading" className="page-heading">Products</h1>
      <p className="empty-state" role="status">No products match your filters.</p>
      </section>
    )}
    </div>
    </main>
    </FloatingShoppingAssistant>
  )
}

export default Home
