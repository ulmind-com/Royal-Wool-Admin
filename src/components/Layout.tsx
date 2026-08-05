import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { getUser, logout } from "../auth";

const links = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/analytics", label: "Analytics & Reports" },
  { to: "/products", label: "Yarn Inventory" },
  { to: "/categories", label: "Yarn Categories" },
  { to: "/waitlist", label: "Restock Waitlist" },
  { to: "/combos", label: "Bundle Offers" },
  { to: "/orders", label: "Customer Orders" },
  { to: "/users", label: "Customers" },
  { to: "/reviews", label: "Product Reviews" },
  { to: "/coupons", label: "Discount Codes" },
  { to: "/home-layout", label: "Web Layout" },
  { to: "/media", label: "Photo Library" },
  { to: "/settings", label: "Store Settings" },
];

export default function Layout() {
  const nav = useNavigate();
  const user = getUser();
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">Royaall<span>.</span>Wool</div>
        <nav className="nav">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="main">
        <div className="topbar">
          <div />
          <div className="flex">
            <span className="muted">{user?.email}</span>
            <button
              className="logout"
              onClick={() => {
                logout();
                nav("/login");
              }}
            >
              Log out
            </button>
          </div>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
