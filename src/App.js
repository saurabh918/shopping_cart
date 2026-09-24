import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.css';
import Cart from './pages/Cart';
import { Header } from './compoments/Header';
import Home from './pages/Home';

function App() {
  return (
    <BrowserRouter>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Header />
      <Routes>
        <Route path='/' element={<Home />} exact />
        <Route path='/cart' element={<Cart />} exact />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
