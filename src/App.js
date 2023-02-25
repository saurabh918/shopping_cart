import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.css';
import Cart from './compoments/Cart';
import { Header } from './compoments/Header';
import Home from './compoments/Home';

function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path='/' element={<Home />} exact />
        <Route path='/cart' element={<Cart />} exact />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
