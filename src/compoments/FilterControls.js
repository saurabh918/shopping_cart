import React, { useContext } from 'react'
import { FormCheck } from 'react-bootstrap'
import { CartContext } from '../context/Context'
import Rating from './Rating'

const FilterControls = ({ layout = 'default' }) => {
  const { filterState: { byStock, byFastDelivery, rating, sort }, filterDispatch } = useContext(CartContext)
  const sectionClass = layout === 'drawer' ? 'filter-drawer-section' : 'filter-group'
  const titleClass = layout === 'drawer' ? 'filter-drawer-section__title' : 'filter-group-label'

  return (
    <div className={`filter-controls ${layout === 'drawer' ? 'filter-controls--drawer' : ''}`}>
      <section className={sectionClass} aria-labelledby="filter-section-sort">
        <h3 id="filter-section-sort" className={titleClass}>
          Sort by
        </h3>
        <div className="filter-drawer-section__body">
          <FormCheck
            label="Low to high"
            name="sortPrice"
            type="radio"
            id="sort-low-high"
            checked={sort === 'lowToHigh'}
            onChange={() => filterDispatch({ type: 'sortByPrice', payload: 'lowToHigh' })}
          />
          <FormCheck
            label="High to low"
            name="sortPrice"
            type="radio"
            id="sort-high-low"
            checked={sort === 'HighToLow'}
            onChange={() => filterDispatch({ type: 'sortByPrice', payload: 'HighToLow' })}
          />
        </div>
      </section>

      <section className={sectionClass} aria-labelledby="filter-section-availability">
        <h3 id="filter-section-availability" className={titleClass}>
          Availability
        </h3>
        <div className="filter-drawer-section__body">
          <FormCheck
            label="Include out of stock"
            name="stockFilter"
            type="checkbox"
            id="filter-stock"
            onChange={() => filterDispatch({ type: 'filterByStock' })}
            checked={byStock}
          />
          <FormCheck
            label="Fast delivery only"
            name="deliveryFilter"
            type="checkbox"
            id="filter-delivery"
            onChange={() => filterDispatch({ type: 'filterByFastDelivery' })}
            checked={byFastDelivery}
          />
        </div>
      </section>

      <section className={sectionClass} aria-labelledby="filter-section-rating">
        <h3 id="filter-section-rating" className={titleClass}>
          Minimum rating
        </h3>
        <div className="filter-drawer-section__body">
          <div className="star-ratings" role="group" aria-label="Minimum rating">
            <Rating
              rating={rating}
              onClick={(i) => { filterDispatch({ type: 'filterByRating', payload: i + 1 }) }}
              style={{ cursor: 'pointer' }}
            />
          </div>
        </div>
      </section>
    </div>
  )
}

export default FilterControls
