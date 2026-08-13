import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { getUser, hasSection, isSuper, logout } from "../auth";
import { SECTIONS } from "../sections";

// Owner-only links (super admin).
const superLinks = [{ to: "/admins", label: "Team & Access" }];

export default function Layout() {
  const nav = useNavigate();
  const user = getUser();
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">Royaall<span>.</span>Wool</div>
        <nav className="nav">
          {SECTIONS.filter((s) => hasSection(s.key)).map((s) => (
            <NavLink key={s.path} to={s.path} end={s.end}>
              {s.label}
            </NavLink>
          ))}
          {isSuper() &&
            superLinks.map((l) => (
              <NavLink key={l.to} to={l.to}>
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
