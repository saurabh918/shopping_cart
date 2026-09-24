export const reducer = (state, action) => {
  switch (action.type) {
    case "Remove from cart":
      return removeProduct(state, action)
    case "Add to cart":
      return addProduct(state, action)
    case "quantityUpdated":
      return addQuantity(state, action)
    default:
      return state;
  }
}

export const filterReducer = (state, action) => {
  switch (action.type) {
    case "sortByPrice":
      return { ...state, sort: action.payload }
    case "filterByStock":
      return { ...state, byStock: !state.byStock }
    case "filterByFastDelivery":
      return { ...state, byFastDelivery: !state.byFastDelivery }
    case "filterByRating":
      return { ...state, rating: action.payload }
    case "filterBySearch":
      return { ...state, searchStr: action.payload }
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

const addProduct = (state, action) => {
  return { ...state, cart: [...state.cart, action.payload.id] }
}

const removeProduct = (state, action) => {
  return { ...state, cart: state.cart.filter((id) => id !== action.payload.id) }
}

export function clampQuantity(qty, inStock, fallback = 1) {
  const stock = Number(inStock);
  const stockLimit = Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : 0;
  const maxAllowed = Math.min(3, stockLimit);
  const fallbackNumber = Number(fallback);
  const safeFallback = Number.isFinite(fallbackNumber) && fallbackNumber >= 1
    ? Math.min(3, Math.floor(fallbackNumber))
    : 1;

  if (maxAllowed < 1) {
    return safeFallback;
  }

  const parsed = Number(qty);
  if (!Number.isFinite(parsed)) {
    return Math.min(Math.max(safeFallback, 1), maxAllowed);
  }

  const whole = Math.floor(parsed);
  if (whole < 1) return 1;
  if (whole > maxAllowed) return maxAllowed;
  return whole;
}

const addQuantity = (state, action) => {
  const id = action.payload?.id;
  return {
    ...state,
    product: state.product.map((product) => {
      if (product.id !== id) return product;
      const qty = clampQuantity(action.payload.qty, product.inStock, product.qty);
      if (qty === product.qty) return product;
      return { ...product, qty };
    }),
  };
}
