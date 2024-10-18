# Shopping Cart Application

This is a React-based shopping cart application where users can browse a list of products, apply various filters, search for specific items, and manage their shopping cart. The application utilizes `useReducer` and `useContext` for state management, allowing users to adjust product quantities in the cart and view the total cost.

## Features

- **Product Browsing**: Users can browse through a list of products available for purchase.
- **Search**: Users can search for specific products using the search bar.
- **Filters**: Various filters can be applied to narrow down product listings (e.g., by category, price range, etc.).
- **Add to Cart**: Users can add products to the shopping cart.
- **Quantity Management**: Users can adjust the quantity of items in the cart directly from the cart view.
- **Total Cost Calculation**: The total cost in the cart is dynamically calculated based on the selected quantities.
- **State Management**: Application state is managed using `useReducer` and `useContext` hooks for efficient state sharing across components.

## Technologies Used

- **React**: The application is built with React to create interactive UI components.
- **useReducer and useContext**: These hooks are used for state management to maintain and update the cart and filter states across the app.
- **CSS/SCSS**: For styling the user interface.

## Getting Started

### Prerequisites

Make sure you have the following installed on your system:

- **Node.js** (>= 12.x)
- **npm** or **yarn**

### Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/shopping-cart-app.git
   cd shopping-cart-app
