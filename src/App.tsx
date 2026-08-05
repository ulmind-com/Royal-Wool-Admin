import { Navigate, Route, Routes } from "react-router-dom";
import { isAdmin } from "./auth";
import Layout from "./components/Layout";
import Categories from "./pages/Categories";
import Combos from "./pages/Combos";
import Coupons from "./pages/Coupons";
import Dashboard from "./pages/Dashboard";
import HomeLayout from "./pages/HomeLayout";
import Login from "./pages/Login";
import Media from "./pages/Media";
import Orders from "./pages/Orders";
import ProductEditor from "./pages/ProductEditor";
import Products from "./pages/Products";
import Reviews from "./pages/Reviews";
import Settings from "./pages/Settings";
import Users from "./pages/Users";
import Waitlist from "./pages/Waitlist";
import Analytics from "./pages/Analytics";
import Invoice from "./pages/Invoice";

function Guard({ children }: { children: React.ReactNode }) {
  return isAdmin() ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/orders/:id/invoice" element={<Guard><Invoice /></Guard>} />
      <Route
        element={
          <Guard>
            <Layout />
          </Guard>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/new" element={<ProductEditor />} />
        <Route path="/products/:id" element={<ProductEditor />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/combos" element={<Combos />} />
        <Route path="/waitlist" element={<Waitlist />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/coupons" element={<Coupons />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/users" element={<Users />} />
        <Route path="/home-layout" element={<HomeLayout />} />
        <Route path="/media" element={<Media />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
