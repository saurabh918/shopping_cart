import { createContext, useReducer } from "react";
import { filterReducer, reducer } from "./Reducer";

export const CartContext = createContext()

export const CartProvider = ({children}) => {
  let cartArray;
  if(localStorage.getItem("cart")){
  cartArray = localStorage.getItem("cart").split(",").map(e=>parseInt(e));
} else {
  cartArray = false;
}
  const productData = [
    {
      id: 0,
      name: "iPhone 6S",
      price: 799,
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRS9VIXa2K5XYfjf4fjCc92rtzpX_1SizMkhw&s",
      inStock: 3,
      fastDelivery: true,
      deliveryDays: 1,
      ratings: 4,
      qty: 1
    },
    {
      id: 1,
      name: "iPhone 5S",
      price: 349,
      image: "https://img-new.cgtrader.com/items/901737/4a15f1e3c4/large/iphone-5s-3d-model-stl-sldprt-sldasm-slddrw-ige-igs-iges-stp.jpg",
      inStock: 5,
      fastDelivery: false,
      deliveryDays: 5,
      ratings: 2,
      qty: 1
    },
    {
      id: 2,
      name: "Macbook",
      price: 1499,
      image: "https://www.notebookcheck.net/fileadmin/Notebooks/News/_nc3/photo_1517336714731_489689fd1ca8_9.jpeg",
      inStock: 2,
      fastDelivery: true,
      deliveryDays: 2,
      ratings: 2,
      qty: 1
    },
    {
      id: 3,
      name: "Macbook Air",
      price: 999,
      image: "https://akm-img-a-in.tosshub.com/indiatoday/images/story/202207/MacBook_Air_M2_main.jpg?VersionId=9zEFIS24JT0DHsK8QeyI31iZLFfru048&size=690:388",
      inStock: 7,
      fastDelivery: false,
      deliveryDays: 6,
      ratings: 4,
      qty: 1
    },
    {
      id: 4,
      name: "Macbook Air 2017",
      price: 599,
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT28uAIIFumtx75qIiZN5IujwacEbv-sc0DVg&s",
      inStock: 0,
      fastDelivery: false,
      deliveryDays: 7,
      ratings: 3,
      qty: 1
    },
    {
      id: 5,
      name: "Macbook Air 2022",
      price: 499,
      image: "https://telecomtalk.info/wp-content/uploads/2021/10/macbook-air-2022-might-not-be-much.jpeg",
      inStock: 0,
      fastDelivery: true,
      deliveryDays: 2,
      ratings: 3,
      qty: 1
    }
  ];

  const [state,dispatch] = useReducer(reducer,{
    product: productData,
    cart: cartArray ? cartArray : []  
  })

  const [filterState,filterDispatch] = useReducer(filterReducer,{
    byStock: false,
    byFastDelivery: false,
    rating: 0,
    searchStr: ""
  })

  return(
    <CartContext.Provider value={{state,dispatch,filterState,filterDispatch}}>
      {children}
    </CartContext.Provider>
  )
}
