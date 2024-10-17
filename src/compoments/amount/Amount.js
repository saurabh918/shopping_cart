import React from 'react'

const Amount = ({amount}) => {
  return (
    <>
      <h2>Total amount:</h2>
      <h3>{amount}$</h3>
      <button>Click to pay</button>
    </>
  )
}

export default Amount