import { useEffect, useState } from "react";
import { api } from "../api";

const money = (n: any) => `₹${Number(n ?? 0).toFixed(2)}`;
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString() : "—");
const fmtDT = (d?: string) => (d ? new Date(d).toLocaleString() : "—");

const rolePill = (role?: string) => (
  <span
    className="pill"
    style={{
      background: role === "admin" ? "#eee7fb" : "#f1f1f4",
      color: role === "admin" ? "#6b3fd4" : "#6b6b70",
    }}
  >
    {(role || "user").toUpperCase()}
  </span>
);

export default function Users() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [userOrders, setUserOrders] = useState<Record<string, any[]>>({});

  const [quickFilter, setQuickFilter] = useState<"all" | "top_spenders" | "zero_orders">("all");
  const [sortBy, setSortBy] = useState<"joined_desc" | "joined_asc" | "spent_desc" | "spent_asc" | "orders_desc" | "orders_asc">("joined_desc");

  const processedRows = rows
    .filter(u => {
      if (quickFilter === "top_spenders") return u.total_spent > 0;

      if (quickFilter === "zero_orders") return u.orders_count === 0;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "joined_desc") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "joined_asc") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === "spent_desc") return b.total_spent - a.total_spent;
      if (sortBy === "spent_asc") return a.total_spent - b.total_spent;
      if (sortBy === "orders_desc") return b.orders_count - a.orders_count;
      if (sortBy === "orders_asc") return a.orders_count - b.orders_count;
      return 0;
    });

  const handleSort = (field: "joined" | "spent" | "orders") => {
    if (field === "joined") setSortBy(sortBy === "joined_desc" ? "joined_asc" : "joined_desc");
    if (field === "spent") setSortBy(sortBy === "spent_desc" ? "spent_asc" : "spent_desc");
    if (field === "orders") setSortBy(sortBy === "orders_desc" ? "orders_asc" : "orders_desc");
  };

  const handleView = (u: any) => {
    if (open === u.id) {
      setOpen(null);
    } else {
      setOpen(u.id);
      if (!userOrders[u.id] && u.orders_count > 0) {
        api.get(`/orders/admin/all?user_id=${u.id}&limit=5`).then(res => {
          setUserOrders(prev => ({ ...prev, [u.id]: res }));
        }).catch(console.error);
      }
    }
  };

  const load = (query = "") => {
    setLoading(true);
    api
      .get(`/users/admin/all${query ? `?q=${encodeURIComponent(query)}` : ""}`)
      .then(setRows)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  // Debounced search.
  useEffect(() => {
    const t = setTimeout(() => load(q.trim()), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);



  return (
    <>
      <h1>Users</h1>
      <p className="muted" style={{ marginTop: -8 }}>
        Every customer with full details and lifetime order stats.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
        {[
          { id: "all", label: "All Customers", icon: "📦" },
          { id: "top_spenders", label: "Top Spenders", icon: "🏆" },
          { id: "zero_orders", label: "Zero Orders", icon: "👻" },
        ].map(t => (
          <button 
            key={t.id} 
            onClick={() => {
              setQuickFilter(t.id as any);
              if (t.id === "top_spenders") setSortBy("spent_desc");
              if (t.id === "zero_orders") setSortBy("joined_desc");
            }}
            style={{
              background: quickFilter === t.id ? "#1e293b" : "#fff",
              color: quickFilter === t.id ? "#fff" : "#475569",
              border: `1px solid ${quickFilter === t.id ? "#1e293b" : "#cbd5e1"}`,
              padding: "8px 16px",
              borderRadius: 20,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              whiteSpace: "nowrap",
              transition: "all 0.2s"
            }}
          >
            <span>{t.icon}</span> {t.label} 
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 14 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, email or phone…"
          style={{ marginBottom: 0 }}
        />
      </div>

      {err && <div className="err">{err}</div>}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Customer</th><th>Phone</th><th>Role</th>
              <th onClick={() => handleSort("joined")} style={{ cursor: "pointer", userSelect: "none" }}>Joined {sortBy.startsWith("joined") ? (sortBy.endsWith("desc") ? "↓" : "↑") : ""}</th>
              <th>In Cart</th>
              <th onClick={() => handleSort("orders")} style={{ cursor: "pointer", userSelect: "none" }}>Orders {sortBy.startsWith("orders") ? (sortBy.endsWith("desc") ? "↓" : "↑") : ""}</th>
              <th onClick={() => handleSort("spent")} style={{ cursor: "pointer", userSelect: "none" }}>Spent {sortBy.startsWith("spent") ? (sortBy.endsWith("desc") ? "↓" : "↑") : ""}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {processedRows.map((u) => (
              <>
                <tr key={u.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {u.avatar ? (
                        <img src={u.avatar} alt="Avatar" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid #ddd" }} />
                      ) : (
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#f1f5f9", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 600, flexShrink: 0 }}>
                          {(u.name?.[0] || u.email?.[0] || "?").toUpperCase()}
                        </div>
                      )}
                      <div>
                        <b>{u.name || "—"}</b>
                        <div className="muted" style={{ fontSize: 13 }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{u.phone || <span className="muted">—</span>}</td>
                  <td>{rolePill(u.role)}</td>
                  <td className="muted">{fmtDate(u.created_at)}</td>
                  <td>
                    <span style={{ padding: "3px 8px", borderRadius: "100px", fontSize: "12px", background: u.cart_count > 0 ? "#fff3e0" : "#f5f5f5", color: u.cart_count > 0 ? "#e65100" : '#888', fontWeight: 600 }}>
                      {u.cart_count || 0} items
                    </span>
                  </td>
                  <td><b>{u.orders_count}</b></td>
                  <td><b>{money(u.total_spent)}</b></td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className="btn ghost sm" onClick={() => handleView(u)}>
                      {open === u.id ? "Hide" : "View"}
                    </button>
                  </td>
                </tr>
                {open === u.id && (
                  <tr key={u.id + "d"}>
                    <td colSpan={9} style={{ background: "#faf9f8" }}>
                      <div className="detailwrap">
                        <div className="section-title">Account</div>
                        <div className="pdetail">
                          <div className="kv"><span className="k">User ID</span><span className="v mono">{u.id}</span></div>
                          <div className="kv"><span className="k">Name</span><span className="v">{u.name || "—"}</span></div>
                          <div className="kv"><span className="k">Email</span><span className="v">{u.email || "—"}</span></div>
                          <div className="kv"><span className="k">Phone</span><span className="v">{u.phone || "—"}</span></div>
                          <div className="kv"><span className="k">Role</span><span className="v">{u.role}</span></div>
                          <div className="kv"><span className="k">Sign-in</span><span className="v">{u.provider || "email"}</span></div>
                          <div className="kv"><span className="k">Joined</span><span className="v">{fmtDT(u.created_at)}</span></div>
                          <div className="kv"><span className="k">Push devices</span><span className="v">{u.fcm_tokens}</span></div>

                        </div>

                        <div className="section-title">Lifetime</div>
                        <div className="pdetail">
                          <div className="kv"><span className="k">Orders</span><span className="v">{u.orders_count}</span></div>
                          <div className="kv"><span className="k">Total spent</span><span className="v">{money(u.total_spent)}</span></div>
                        </div>

                        <div className="section-title">Saved addresses ({(u.addresses || []).length})</div>
                        {(u.addresses || []).length === 0 ? (
                          <span className="muted">No saved addresses.</span>
                        ) : (
                          <div className="pdetail">
                            {(u.addresses || []).map((a: any, i: number) => (
                              <div className="kv" key={i}>
                                <span className="k">{a.tag || "Address"}</span>
                                <span className="v">
                                  {[a.house, a.area, a.city, a.state, a.pincode].filter(Boolean).join(", ") || "—"}
                                  {a.phone ? ` · ${a.phone}` : ""}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="section-title" style={{ marginTop: 14 }}>Active Cart Items ({(u.cart_items || []).length})</div>
                        {(u.cart_items || []).length === 0 ? (
                          <span className="muted">No items currently in cart.</span>
                        ) : (
                          <div className="pdetail" style={{ background: "#fff", padding: "8px 12px", borderRadius: "8px", border: "1px solid #eaeaea" }}>
                            {(u.cart_items || []).map((c: any, i: number) => (
                              <div className="kv" key={i} style={{ padding: "6px 0", borderBottom: i < (u.cart_items || []).length - 1 ? "1px solid #f0f0f0" : "none" }}>
                                <span className="k" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  {c.image && <img src={c.image} style={{ width: 24, height: 24, borderRadius: 4, objectFit: "cover" }} alt="" />}
                                  <b>{c.title || "Product"}</b> ({c.qty}x)
                                </span>
                                <span className="v">
                                  {c.color ? `Color: ${c.color}` : ""} {c.size ? `· Size: ${c.size}` : ""} · <b>{money((c.price || 0) * (c.qty || 1))}</b>
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="section-title" style={{ marginTop: 24 }}>Recent Orders (Last 5)</div>
                        {u.orders_count === 0 ? (
                          <span className="muted">No orders placed yet.</span>
                        ) : !userOrders[u.id] ? (
                          <span className="muted">Loading orders...</span>
                        ) : userOrders[u.id].length === 0 ? (
                          <span className="muted">No orders found.</span>
                        ) : (
                          <div style={{ overflowX: "auto" }}>
                            <table style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, marginTop: 8 }}>
                              <thead>
                                <tr style={{ background: "#f8fafc" }}>
                                  <th style={{ padding: "8px 12px", fontSize: 12, borderBottom: "1px solid #e2e8f0" }}>Order ID</th>
                                  <th style={{ padding: "8px 12px", fontSize: 12, borderBottom: "1px solid #e2e8f0" }}>Date</th>
                                  <th style={{ padding: "8px 12px", fontSize: 12, borderBottom: "1px solid #e2e8f0" }}>Items</th>
                                  <th style={{ padding: "8px 12px", fontSize: 12, borderBottom: "1px solid #e2e8f0" }}>Status</th>
                                  <th style={{ padding: "8px 12px", fontSize: 12, borderBottom: "1px solid #e2e8f0" }}>Amount</th>
                                  <th style={{ padding: "8px 12px", fontSize: 12, borderBottom: "1px solid #e2e8f0" }}></th>
                                </tr>
                              </thead>
                              <tbody>
                                {userOrders[u.id].map(o => (
                                  <tr key={o.id}>
                                    <td style={{ padding: "8px 12px", fontSize: 13, fontWeight: 600 }}>#{o.id.slice(-6).toUpperCase()}</td>
                                    <td style={{ padding: "8px 12px", fontSize: 13 }}>{fmtDate(o.created_at)}</td>
                                    <td style={{ padding: "8px 12px", fontSize: 13 }}>
                                      {o.items?.slice(0, 2).map((it: any, i: number) => (
                                        <div key={i} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>
                                          {it.qty}x {it.title}
                                        </div>
                                      ))}
                                      {o.items?.length > 2 && <div className="muted" style={{ fontSize: 11 }}>+{o.items.length - 2} more</div>}
                                    </td>
                                    <td style={{ padding: "8px 12px", fontSize: 13 }}>
                                      <span style={{ 
                                        background: o.status === "delivered" ? "#e7f5ec" : o.status === "cancelled" ? "#fdecec" : "#e0e7ff",
                                        color: o.status === "delivered" ? "#1c8a4a" : o.status === "cancelled" ? "#c0392b" : "#4338ca",
                                        padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600, textTransform: "uppercase" 
                                      }}>
                                        {o.status.replace(/_/g, " ")}
                                      </span>
                                    </td>
                                    <td style={{ padding: "8px 12px", fontSize: 13, fontWeight: 600 }}>₹{o.amount?.toFixed(2)}</td>
                                    <td style={{ padding: "8px 12px", fontSize: 13, textAlign: "right" }}>
                                      <button className="btn ghost sm" onClick={() => window.open(`/orders?q=${o.id}`, "_blank")} style={{ color: "#3b82f6", padding: 0 }}>View ↗</button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
            {!loading && processedRows.length === 0 && <tr><td colSpan={9} className="muted">No users found.</td></tr>}
            {loading && <tr><td colSpan={9} className="muted">Loading…</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
