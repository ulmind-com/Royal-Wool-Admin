import { Navigate, Route, Routes } from "react-router-dom";
import { hasSection, isAdmin, isSuper } from "./auth";
import { SECTIONS } from "./sections";
import Admins from "./pages/Admins";
import Layout from "./components/Layout";
import Blog from "./pages/Blog";
import Categories from "./pages/Categories";
import Combos from "./pages/Combos";
import Coupons from "./pages/Coupons";
import Dashboard from "./pages/Dashboard";
import HomeLayout from "./pages/HomeLayout";
import Login from "./pages/Login";
import Orders from "./pages/Orders";
import ProductEditor from "./pages/ProductEditor";
import Products from "./pages/Products";
import Reviews from "./pages/Reviews";
import Settings from "./pages/Settings";
import Announcements from "./pages/Announcements";
import Users from "./pages/Users";
import Waitlist from "./pages/Waitlist";
import Analytics from "./pages/Analytics";
import Invoice from "./pages/Invoice";

function Guard({ children }: { children: React.ReactNode }) {
  return isAdmin() ? <>{children}</> : <Navigate to="/login" replace />;
}

function SuperGuard({ children }: { children: React.ReactNode }) {
  if (!isAdmin()) return <Navigate to="/login" replace />;
  return isSuper() ? <>{children}</> : <Navigate to="/" replace />;
}

const firstAllowedPath = (): string | null => {
  const s = SECTIONS.find((s) => hasSection(s.key));
  return s ? s.path : null;
};

function NoAccess() {
  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h2>No sections assigned</h2>
      <p className="muted">Your account doesn't have access to any section yet. Please ask the store owner to grant you access.</p>
    </div>
  );
}

// Gate a route by its section key: allowed -> render; otherwise send the admin
// to their first accessible section (or a friendly message if they have none).
function Sec({ k, children }: { k: string; children: React.ReactNode }) {
  if (!isAdmin()) return <Navigate to="/login" replace />;
  if (hasSection(k)) return <>{children}</>;
  const dest = firstAllowedPath();
  return dest ? <Navigate to={dest} replace /> : <NoAccess />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/orders/:id/invoice" element={<Guard><Sec k="orders"><Invoice /></Sec></Guard>} />
      <Route
        element={
          <Guard>
            <Layout />
          </Guard>
        }
      >
        <Route path="/" element={<Sec k="dashboard"><Dashboard /></Sec>} />
        <Route path="/products" element={<Sec k="products"><Products /></Sec>} />
        <Route path="/products/new" element={<Sec k="products"><ProductEditor /></Sec>} />
        <Route path="/products/:id" element={<Sec k="products"><ProductEditor /></Sec>} />
        <Route path="/categories" element={<Sec k="categories"><Categories /></Sec>} />
        <Route path="/combos" element={<Sec k="combos"><Combos /></Sec>} />
        <Route path="/waitlist" element={<Sec k="waitlist"><Waitlist /></Sec>} />
        <Route path="/analytics" element={<Sec k="analytics"><Analytics /></Sec>} />
        <Route path="/coupons" element={<Sec k="coupons"><Coupons /></Sec>} />
        <Route path="/orders" element={<Sec k="orders"><Orders /></Sec>} />
        <Route path="/users" element={<Sec k="users"><Users /></Sec>} />
        <Route path="/home-layout" element={<Sec k="home-layout"><HomeLayout /></Sec>} />
        <Route path="/blog" element={<Sec k="blog"><Blog /></Sec>} />
        <Route path="/reviews" element={<Sec k="reviews"><Reviews /></Sec>} />
        <Route path="/settings" element={<Sec k="settings"><Settings /></Sec>} />
        <Route path="/announcements" element={<Sec k="announcements"><Announcements /></Sec>} />
        <Route path="/admins" element={<SuperGuard><Admins /></SuperGuard>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
