export const reducer = (state,action)=>{
  switch(action.type) {
    case "Add to cart":
      return {...state,cart:[...state.cart,"new product added"]}
     default:
      return state;
  }
}