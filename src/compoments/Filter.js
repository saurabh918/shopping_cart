import React, { useContext, useState } from 'react'
import { Button, FormCheck } from 'react-bootstrap'
import { Form } from 'react-router-dom'
import { CartContext } from '../context/Context'
import Rating from './Rating'

const Filter = () => {
  const { filterState:{sort,byStock,byFastDelivery,rating,searchStr},filterDispatch } = useContext(CartContext)
  console.log(sort,byStock,byFastDelivery,rating,searchStr)
  return (
    <div className='filter-options'>
      <span className="title">Filter Products</span>
      <span>
        <FormCheck inline label="Ascending" name="group1" type="radio" onChange={()=>filterDispatch({type:"sortByPrice",payload:"lowToHigh"})} />
      </span>
      <span>
        <FormCheck inline label="Descending" name="group1" type="radio" onChange={()=>filterDispatch({type:"sortByPrice",payload:"HighToLow"})} />
      </span>
      <span>
        <FormCheck inline label="Include Out of Stock" name="group1" type="checkbox" onChange={()=>filterDispatch({type:"filterByStock"})} checked={byStock} />
      </span>
      <span>
        <FormCheck inline label="Fast Delivery Only" name="group1" type="checkbox" onChange={()=>filterDispatch({type:"filterByFastDelivery"})} checked={byFastDelivery} />
      </span>
      <span className='star-ratings'>
        <Rating onClick={(i)=>{ filterDispatch({type:"filterByRating",payload: i+1 })}} style={{ cursor:"pointer" }}/>
      </span>
      <Button onClick={()=>filterDispatch({type:"clearFilter"})}>
        Clear Filters
      </Button>
    </div>
  )
}

export default Filter