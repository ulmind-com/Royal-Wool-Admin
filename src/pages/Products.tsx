import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

export default function Products() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const [categories, setCategories] = useState<any[]>([]);

  const load = () => {
    setLoading(true);
    api.get("/products?limit=100&admin=true").then(setItems).catch(() => {}).finally(() => setLoading(false));
  };
  
  const loadCats = () => {
    api.get("/categories").then(setCategories).catch(() => {});
  };

  useEffect(() => { load(); loadCats(); }, []);

  const del = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    await api.del(`/products/${id}`);
    setItems((p) => p.filter((x) => x.id !== id));
  };

  const filteredItems = items.filter((p) => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !(p.sku || "").toLowerCase().includes(search.toLowerCase())) return false;
    if (catFilter && p.category_id !== catFilter) return false;
    if (statusFilter === "active" && !p.is_active) return false;
    if (statusFilter === "hidden" && p.is_active) return false;
    if (statusFilter === "low_stock" && p.total_stock > (p.low_stock_threshold || 5)) return false;
    return true;
  });

  return (
    <>
      <div className="between">
        <h1>Products</h1>
        <Link to="/products/new" className="btn">+ Add Product</Link>
      </div>
      
      <div className="card" style={{ marginTop: 18, marginBottom: -18, padding: 12, display: "flex", gap: 12, background: "#fafafa", border: "1px solid #eaeaea" }}>
        <input 
          placeholder="Search by title or SKU..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          style={{ flex: 1, margin: 0, padding: "8px 12px" }}
        />
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ margin: 0, padding: "8px 12px", width: 200 }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ margin: 0, padding: "8px 12px", width: 160 }}>
          <option value="all">All Status</option>
          <option value="active">Active Only</option>
          <option value="hidden">Hidden Only</option>
          <option value="low_stock">Low Stock</option>
        </select>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : (
          <table>
            <thead>
              <tr><th></th><th>Product Info</th><th>Specs & Stats</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {filteredItems.map((p) => (
                <React.Fragment key={p.id}>
                  <tr>
                    <td><img className="thumb" src={p.images?.[0] || p.colors?.[0]?.images?.[0] || "https://via.placeholder.com/60"} /></td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.title}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {p.brand && <span>{p.brand} • </span>}
                        {p.sku && <span>SKU: {p.sku}</span>}
                        {!p.sku && !p.brand && <span>No Brand/SKU</span>}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 12 }}>
                        {p.skein_weight && <span style={{ background: "#f0f0f0", padding: "2px 6px", borderRadius: 4, marginRight: 6 }}>{p.skein_weight}g</span>}
                        {p.yarn_weight && <span style={{ background: "#f0f0f0", padding: "2px 6px", borderRadius: 4 }}>{p.yarn_weight}</span>}
                      </div>
                      <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                        {p.sold_count > 0 ? `🔥 ${p.sold_count} sold` : "0 sold"}
                        {p.review_count > 0 ? ` • ★ ${p.rating?.toFixed(1)} (${p.review_count})` : " • No reviews"}
                      </div>
                    </td>
                    <td>
                      {p.struck_price && <span style={{ textDecoration: "line-through", color: "#a79e95", marginRight: 6 }}>₹{p.struck_price}</span>}
                      <b>₹{p.final_price}</b>
                      {p.off_pct > 0 && <span style={{ color: "#2fae5f" }}> ({p.off_pct}% off)</span>}
                    </td>
                    <td>
                      <span className="pill" style={{ background: p.total_stock <= 5 ? "#fdecec" : "#eaf7ee", color: p.total_stock <= 5 ? "#e23744" : "#2fae5f" }}>
                        {p.total_stock}
                      </span>
                    </td>
                    <td>{p.is_active ? "Active" : <span className="muted">Hidden</span>}</td>
                    <td className="flex">
                      <Link to={`/products/${p.id}`} className="btn ghost sm">Edit</Link>
                      <button className="btn danger sm" onClick={() => del(p.id, p.title)}>Delete</button>
                    </td>
                  </tr>
                  
                  {p.colors && p.colors.length > 0 && p.colors.map((c: any, i: number) => {
                    const cStock = c.dye_lots && c.dye_lots.length > 0 
                      ? c.dye_lots.reduce((acc: number, dl: any) => acc + (dl.stock || 0), 0)
                      : (c.stock || 0);
                      
                    return (
                      <tr key={`${p.id}-col-${i}`} style={{ background: "#fafafa" }}>
                        <td style={{ paddingLeft: 30 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ color: "#ccc", fontSize: 16 }}>↳</span>
                            {c.images?.[0] ? (
                               <img src={c.images[0]} style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover" }} />
                            ) : (
                               <div style={{ width: 40, height: 40, borderRadius: 6, background: "#eee" }}></div>
                            )}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {c.swatch_image ? (
                               <img src={c.swatch_image} style={{ width: 20, height: 20, borderRadius: 4, objectFit: "cover", border: "1px solid #e1e1e1" }} />
                            ) : (
                               <div style={{ width: 20, height: 20, borderRadius: 4, background: c.hex || "#ccc", border: "1px solid #e1e1e1" }}></div>
                            )}
                            <div style={{ fontSize: 13, color: "#444" }}>{c.name} {c.color_family ? <span style={{ color: "#888" }}>({c.color_family})</span> : ""}</div>
                          </div>
                        </td>
                        <td></td>
                        <td>
                          {c.price ? <b style={{ fontSize: 13, color: "#666" }}>₹{c.price}</b> : <span className="muted" style={{ fontSize: 12 }}>Inherits base (₹{p.final_price})</span>}
                        </td>
                        <td>
                          <span className="pill" style={{ fontSize: 11, padding: "2px 6px", background: cStock <= 5 ? "#fdecec" : "#eaf7ee", color: cStock <= 5 ? "#e23744" : "#2fae5f" }}>
                            {cStock}
                          </span>
                        </td>
                        <td></td>
                        <td></td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
              {filteredItems.length === 0 && <tr><td colSpan={7} className="muted">No products found matching filters.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
