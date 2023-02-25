import React, { useState } from 'react'
import { Button, FormCheck } from 'react-bootstrap'
import { Form } from 'react-router-dom'
import Rating from './Rating'

const Filter = () => {
  const [rate,setRate] = useState(0)
  return (
    <div className='filter-options'>
      <span className="title">Filter Products</span>
      <span>
        <FormCheck inline label="Ascending" name="group1" type="radio"/>
      </span>
      <span>
        <FormCheck inline label="Descending" name="group1" type="radio"/>
      </span>
      <span>
        <FormCheck inline checked label="Include Out of Stock" name="group1" type="checkbox"/>
      </span>
      <span>
        <FormCheck inline label="Fast Delivery Only" name="group1" type="checkbox"/>
      </span>
      <span className='star-ratings'>
        <Rating rating={rate} onClick={(i)=>{ setRate(i+1)}} style={{ cursor:"pointer" }}/>
      </span>
      <Button>
        Clear Filters
      </Button>
    </div>
  )
}

export default Filter