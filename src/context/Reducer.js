export const reducer = (state,action)=>{
  switch(action.type) {
    case "Remove from cart":
      return removeProduct(state,action)
    case "Add to cart":
      return addProduct(state,action)
    case "quantityUpdated":
      return addQuantity(state,action)
    default:
      return state;
  }
}

export const filterReducer = (state,action) => {
  switch(action.type) {
    case "sortByPrice":
      return { ...state,sort: action.payload }
    case "filterByStock":
      return { ...state,byStock: !state.byStock }
    case "filterByFastDelivery":
      return { ...state,byFastDelivery: !state.byFastDelivery }
    case "filterByRating":
      return { ...state,rating: action.payload }
    case "filterBySearch":
      return { ...state,searchStr: action.payload }
    case "clearFilter":
      return {
        byStock: false,
        byFastDelivery: false,
        rating: 0,
        searchStr: ""
      }
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
  return state
}

const addQuantity = (state,action)=> {
  return { ...state,product: state.product.filter((p)=>(
    // eslint-disable-next-line
    p.id === action.payload.id ? (p.qty = action.payload.qty) : (p.qty = p.qty)
  ))}
}

