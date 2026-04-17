import { BrowserRouter, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import AdminPage from "./pages/admin/AdminPage";
import AdminProductListPage from "./pages/admin/AdminProductListPage";
import AdminProductNewPage from "./pages/admin/AdminProductNewPage";
import AdminProductEditPage from "./pages/admin/AdminProductEditPage";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import SellerPage from "./pages/seller/SellerPage";
import SellerProductNewPage from "./pages/seller/SellerProductNewPage";
import SellerProductListPage from "./pages/seller/SellerProductListPage";
import SellerProfilePage from "./pages/seller/SellerProfilePage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CartPage from "./pages/CartPage";
import OrderPage from "./pages/OrderPage";
import OrderSuccessPage from "./pages/OrderSuccessPage";
import OrderFailPage from "./pages/OrderFailPage";
import OrdersPage from "./pages/OrdersPage";
import OrderDetailPage from "./pages/OrderDetailPage";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/order/success" element={<OrderSuccessPage />} />
        <Route path="/order/fail" element={<OrderFailPage />} />
        <Route path="/order" element={<OrderPage />} />
        <Route path="/orders/:id" element={<OrderDetailPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/products" element={<AdminProductListPage />} />
        <Route path="/admin/products/new" element={<AdminProductNewPage />} />
        <Route path="/admin/products/:id/edit" element={<AdminProductEditPage />} />
        <Route path="/admin/orders" element={<AdminOrdersPage />} />
        <Route path="/seller" element={<SellerPage />} />
        <Route path="/seller/products/new" element={<SellerProductNewPage />} />
        <Route path="/seller/products" element={<SellerProductListPage />} />
        <Route path="/seller/profile" element={<SellerProfilePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
