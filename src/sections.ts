// The single source of truth for the left-nav sections. Used by the sidebar,
// the route guards, and the per-admin access checkboxes so they never drift.
export type Section = { key: string; label: string; path: string; end?: boolean };

export const SECTIONS: Section[] = [
  { key: "dashboard", label: "Dashboard", path: "/", end: true },
  { key: "analytics", label: "Analytics & Reports", path: "/analytics" },
  { key: "products", label: "Yarn Inventory", path: "/products" },
  { key: "categories", label: "Yarn Categories", path: "/categories" },
  { key: "waitlist", label: "Restock Waitlist", path: "/waitlist" },
  { key: "combos", label: "Bundle Offers", path: "/combos" },
  { key: "orders", label: "Customer Orders", path: "/orders" },
  { key: "users", label: "Customers", path: "/users" },
  { key: "reviews", label: "Product Reviews", path: "/reviews" },
  { key: "coupons", label: "Discount Codes", path: "/coupons" },
  { key: "home-layout", label: "Web Layout", path: "/home-layout" },
  { key: "blog", label: "Journal / Blog", path: "/blog" },
  { key: "settings", label: "Store Settings", path: "/settings" },
  { key: "announcements", label: "Store Marquee", path: "/announcements" },
];

export const ALL_SECTION_KEYS = SECTIONS.map((s) => s.key);
