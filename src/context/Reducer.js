export const reducer = (state,action)=>{
  switch(action.type) {
    case "Remove from cart":
      return {...state,cart:[...state.cart.filter(cart=> cart !== action.payload.id)]}
    case "Add to cart":
      return {...state,cart:[...state.cart,action.payload.id]}
     default:
      return state;
  }
}