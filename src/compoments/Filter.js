import React, { useContext } from 'react'
import { Button, FormCheck } from 'react-bootstrap'
import { CartContext } from '../context/Context'
import Rating from './Rating'

const Filter = () => {
  const { filterState: { byStock, byFastDelivery, rating }, filterDispatch } = useContext(CartContext)
  return (
    <aside className='filter-options' aria-label="Product filters">
      <h2 className="title">Filters</h2>

      <fieldset className="filter-group">
        <legend className="filter-group-label">Sort by price</legend>
        <FormCheck
          label="Low to high"
          name="sortPrice"
          type="radio"
          id="sort-low-high"
          onChange={() => filterDispatch({ type: "sortByPrice", payload: "lowToHigh" })}
        />
        <FormCheck
          label="High to low"
          name="sortPrice"
          type="radio"
          id="sort-high-low"
          onChange={() => filterDispatch({ type: "sortByPrice", payload: "HighToLow" })}
        />
      </fieldset>

      <fieldset className="filter-group">
        <legend className="filter-group-label">Availability</legend>
        <FormCheck
          label="Include out of stock"
          name="stockFilter"
          type="checkbox"
          id="filter-stock"
          onChange={() => filterDispatch({ type: "filterByStock" })}
          checked={byStock}
        />
        <FormCheck
          label="Fast delivery only"
          name="deliveryFilter"
          type="checkbox"
          id="filter-delivery"
          onChange={() => filterDispatch({ type: "filterByFastDelivery" })}
          checked={byFastDelivery}
        />
      </fieldset>

      <fieldset className="filter-group">
        <legend className="filter-group-label">Minimum rating</legend>
        <div className='star-ratings' role="group" aria-label="Minimum rating">
          <Rating rating={rating} onClick={(i) => { filterDispatch({ type: "filterByRating", payload: i + 1 }) }} style={{ cursor: "pointer" }} />
        </div>
      </fieldset>

      <Button type="button" className="filter-clear-btn" variant="outline-secondary" onClick={() => filterDispatch({ type: "clearFilter" })}>
        Clear filters
      </Button>
    </aside>
  )
}

export default Filter
