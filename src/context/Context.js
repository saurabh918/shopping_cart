import { createContext, useContext, useEffect, useReducer } from "react";
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
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRvWgjt-jVo9kswK0rW2ssUtfrspHapt8bfw_rXiuSnJw&usqp=CAU&ec=48600112",
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
      image: "https://cdn.shopify.com/s/files/1/1684/4603/products/iphone5s_Space-Grey_600x.png?v=1573896984",
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
      image: "https://static.digit.in/default/f5022705a1597c3c2e87e1380dab4f02e4584b9f.png?tr=w-600",
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
      image: "https://images.indianexpress.com/2022/08/M2-Macbook-Air-featured-14082022.jpg",
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
