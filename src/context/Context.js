import { createContext, useEffect, useReducer } from "react";
import { initialCatalogProducts } from "../data/productCatalog";
import { clampQuantity, filterReducer, reducer } from "./Reducer";

export const CartContext = createContext()

const productData = initialCatalogProducts;

function parseStoredId(value) {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number(value.trim());
  return null;
}

function parseJsonCart(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.flatMap((entry) => {
      if (typeof entry === "number" || typeof entry === "string") {
        const id = parseStoredId(entry);
        return id === null ? [] : [{ id }];
      }
      if (entry && typeof entry === "object") {
        const id = parseStoredId(entry.id);
        return id === null ? [] : [{ id, qty: entry.qty }];
      }
      return [];
    });
  } catch {
    return null;
  }
}

function readStoredCart() {
  if (typeof localStorage === "undefined") return [];

  let raw;
  try {
    raw = localStorage.getItem("cart");
  } catch {
    return [];
  }
  if (!raw) return [];

  const fromJson = parseJsonCart(raw);
  const entries = fromJson !== null
    ? fromJson
    : raw.split(",").flatMap((part) => {
      const id = parseStoredId(part);
      return id === null ? [] : [{ id }];
    });

  const seen = new Set();
  return entries.filter((entry) => {
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
}

function createInitialState() {
  const stored = readStoredCart();
  const product = productData.map((item) => {
    const saved = stored.find((entry) => entry.id === item.id);
    if (!saved || saved.qty == null || saved.qty === "") return { ...item };
    return { ...item, qty: clampQuantity(saved.qty, item.inStock, item.qty) };
  });
  const cart = stored
    .map((entry) => entry.id)
    .filter((id) => product.some((item) => item.id === id));

  return { product, cart };
}

function persistCart(cart, products) {
  if (typeof localStorage === "undefined") return;
  const payload = cart.flatMap((id) => {
    const product = products.find((item) => item.id === id);
    if (!product) return [];
    return [{ id: product.id, qty: product.qty }];
  });
  try {
    localStorage.setItem("cart", JSON.stringify(payload));
  } catch {
    // Keep the in-memory cart if the browser refuses storage writes.
  }
}

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, null, createInitialState)

  const [filterState, filterDispatch] = useReducer(filterReducer, {
    byStock: false,
    byFastDelivery: false,
    rating: 0,
    searchStr: ""
  })

  useEffect(() => {
    persistCart(state.cart, state.product);
  }, [state.cart, state.product]);

  return (
    <CartContext.Provider value={{ state, dispatch, filterState, filterDispatch }}>
      {children}
    </CartContext.Provider>
  )
}
