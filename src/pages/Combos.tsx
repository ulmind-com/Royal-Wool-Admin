import { useEffect, useState } from "react";
import { api } from "../api";

const empty = { 
  name: "", description: "", qty: 3, price: 300, product_ids: [] as string[], 
  active: true, weight_target: "", start_date: "", end_date: "", rule_mode: "manual" 
};

export default function Combos() {
  const [items, setItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [f, setF] = useState({ ...empty });
  const [editId, setEditId] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");

  const load = () => api.get("/combos").then(setItems).catch(() => {});
  const loadProducts = () => api.get("/products?admin=true&limit=100").then(setProducts).catch(() => {});
  
  useEffect(() => { load(); loadProducts(); }, []);
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));
  const reset = () => { setF({ ...empty }); setEditId(null); setErr(""); };

  const save = async () => {
    setErr("");
    if (!f.name.trim()) { setErr("Combo name required"); return; }
    if (f.rule_mode === "manual" && f.product_ids.length === 0) { setErr("Please select at least one product"); return; }
    if (f.rule_mode === "weight" && !f.weight_target) { setErr("Please enter a target weight"); return; }
    
    const body = {
      ...f, 
      qty: Number(f.qty), 
      price: Number(f.price),
      weight_target: f.rule_mode === "weight" ? Number(f.weight_target) : null,
      product_ids: f.rule_mode === "manual" ? f.product_ids : [],
      start_date: f.start_date ? new Date(f.start_date).toISOString() : null,
      end_date: f.end_date ? new Date(f.end_date).toISOString() : null
    };
    try {
      if (editId) await api.put(`/combos/${editId}`, body);
      else await api.post("/combos", body);
      reset(); load();
    } catch (e: any) { setErr(e.message); }
  };

  const edit = (c: any) => {
    setF({
      name: c.name, description: c.description || "", qty: c.qty, price: c.price,
      product_ids: c.product_ids || [], active: c.active,
      weight_target: c.weight_target || "",
      start_date: c.start_date ? new Date(c.start_date).toISOString().slice(0, 16) : "",
      end_date: c.end_date ? new Date(c.end_date).toISOString().slice(0, 16) : "",
      rule_mode: c.weight_target ? "weight" : "manual"
    });
    setEditId(c.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggle = async (c: any) => { await api.put(`/combos/${c.id}`, { ...c, active: !c.active }); load(); };
  const del = async (id: string) => { if (confirm("Delete combo?")) { await api.del(`/combos/${id}`); if (editId === id) reset(); load(); } };

  const toggleProduct = (pid: string) => {
    const ids = f.product_ids.includes(pid)
      ? f.product_ids.filter((id) => id !== pid)
      : [...f.product_ids, pid];
    set("product_ids", ids);
  };

  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase()) || 
    (p.skein_weight && p.skein_weight.toString().includes(search))
  );

  const selectAllFiltered = () => {
    const newIds = new Set(f.product_ids);
    filteredProducts.forEach(p => newIds.add(p.id));
    set("product_ids", Array.from(newIds));
  };

  const deselectAllFiltered = () => {
    const toRemove = new Set(filteredProducts.map(p => p.id));
    set("product_ids", f.product_ids.filter(id => !toRemove.has(id)));
  };

  return (
    <>
      <h1>Bundle Offers (Combos)</h1>
      <p className="muted" style={{ marginTop: -12, marginBottom: 24 }}>Create mix-and-match bundle offers. E.g., "Buy any 5 of these wools for ₹375".</p>

      <div className="card">
        <div className="between">
          <h3 style={{ marginTop: 0 }}>{editId ? "Edit Combo" : "Create Combo"}</h3>
          {editId && <button className="btn ghost sm" onClick={reset}>Cancel edit</button>}
        </div>
        
        <div className="row">
          <div style={{ flex: 2 }}><label>Combo Name</label><input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Durga Puja Special" /></div>
        </div>
        
        <div className="row">
          <div><label>Required Quantity</label><input type="number" min="2" value={f.qty} onChange={(e) => set("qty", e.target.value)} /></div>
          <div><label>Bundle Price ₹</label><input type="number" min="0" value={f.price} onChange={(e) => set("price", e.target.value)} /></div>
        </div>
        <p className="muted">Example: Quantity = 5, Price = 375 means "Buy 5 for ₹375".</p>

        <label>Description (shown to users)</label>
        <input value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="Buy any 5 matching wools for just ₹375!" />

        <div className="row" style={{ marginTop: 16 }}>
          <div><label>Start Date (Optional)</label><input type="datetime-local" value={f.start_date} onChange={e => set("start_date", e.target.value)} /></div>
          <div><label>End Date (Optional)</label><input type="datetime-local" value={f.end_date} onChange={e => set("end_date", e.target.value)} /></div>
        </div>
        
        <label style={{ marginTop: 16 }}>Combo Rule Type</label>
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <label style={{ margin: 0, fontWeight: 400, display: "flex", alignItems: "center", gap: 6 }}>
            <input type="radio" checked={f.rule_mode === "manual"} onChange={() => set("rule_mode", "manual")} style={{ width: "auto" }} /> 
            Manually Select Products
          </label>
          <label style={{ margin: 0, fontWeight: 400, display: "flex", alignItems: "center", gap: 6 }}>
            <input type="radio" checked={f.rule_mode === "weight"} onChange={() => set("rule_mode", "weight")} style={{ width: "auto" }} /> 
            Match by Weight automatically
          </label>
        </div>

        {f.rule_mode === "weight" ? (
          <div>
            <label>Target Weight (grams)</label>
            <input type="number" value={f.weight_target} onChange={e => set("weight_target", e.target.value)} placeholder="e.g. 200" />
            <p className="muted" style={{ marginTop: 4 }}>Any product with this weight will automatically be eligible for the combo.</p>
          </div>
        ) : (
          <>
            <label style={{ marginTop: 16 }}>Select Eligible Products</label>
            <p className="muted" style={{ marginTop: -4 }}>Customers can mix and match any variants of these products to reach the required quantity.</p>
            
            <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <input 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="Search by name or weight (e.g. 25)..." 
                style={{ flex: 1, margin: 0 }}
              />
              <button className="btn ghost" onClick={selectAllFiltered}>Select All</button>
              <button className="btn ghost" onClick={deselectAllFiltered}>Deselect All</button>
            </div>
            
            <div style={{ maxHeight: 300, overflowY: "auto", border: "1px solid #e5e5e5", borderRadius: 8, padding: 12, background: "#fafafa" }}>
              {filteredProducts.map(p => (
                <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", cursor: "pointer", borderBottom: "1px solid #f0f0f0" }}>
                  <input 
                    type="checkbox" 
                    checked={f.product_ids.includes(p.id)} 
                    onChange={() => toggleProduct(p.id)} 
                    style={{ width: "auto", margin: 0 }} 
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {p.images?.[0] && <img src={p.images[0]} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6 }} />}
                    <div>
                      <div style={{ fontWeight: 600 }}>{p.title}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        ₹{p.price} {p.skein_weight ? `• ${p.skein_weight}g` : ""}
                      </div>
                    </div>
                  </div>
                </label>
              ))}
              {filteredProducts.length === 0 && <div className="muted">No products found matching your search.</div>}
            </div>
          </>
        )}

        {err && <div className="err" style={{ marginTop: 16 }}>{err}</div>}
        <button className="btn" style={{ marginTop: 16 }} onClick={save}>{editId ? "Save changes" : "Create combo"}</button>
      </div>

      <div className="card">
        <table>
          <thead><tr><th>Combo</th><th>Deal</th><th>Products Included</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} style={editId === c.id ? { background: "#fff6f0" } : {}}>
                <td>
                  <b>{c.name}</b>
                  <div className="muted" style={{ fontSize: 13 }}>{c.description}</div>
                </td>
                <td>
                  <span style={{ fontWeight: 600, color: "#10b981" }}>{c.qty} for ₹{c.price}</span>
                  {(c.start_date || c.end_date) && <div className="muted" style={{ fontSize: 11 }}>Limited time</div>}
                </td>
                <td>
                  {c.weight_target ? (
                    <span className="pill" style={{ background: "#f0f0f0" }}>{c.weight_target}g wools</span>
                  ) : (
                    <span>{c.product_ids?.length || 0} specific items</span>
                  )}
                </td>
                <td><button className="btn ghost sm" onClick={() => toggle(c)}>{c.active ? "Active ✓" : "Inactive"}</button></td>
                <td className="flex">
                  <button className="btn ghost sm" onClick={() => edit(c)}>Edit</button>
                  <button className="btn danger sm" onClick={() => del(c.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={5} className="muted">No combo offers yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
