export const reducer = (state,action)=>{
  switch(action.type) {
    case "Remove from cart":
      return removeProduct(state,action)
    case "Add to cart":
      return addProduct(state,action)
    default:
      return state;
  }
}

const addProduct = (state,action)=> {
  state = {...state,cart:[...state.cart,action.payload.id]}
  window.localStorage.setItem("cart", [...state.cart]);
  return state;
}

const removeProduct = (state,action)=> {
  state = {...state,cart:[...state.cart.filter(cart=> cart !== action.payload.id)]}
    window.localStorage.setItem("cart",[...state.cart]);
    console.log(localStorage.getItem("cart"))
  return state
}

