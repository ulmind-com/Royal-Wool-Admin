import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

const empty = {
  name: "", description: "", qty: 3, price: 300, product_ids: [] as string[],
  active: true, weight_target: "", start_date: "", end_date: "", rule_mode: "manual"
};

interface EligibleRow {
  /** Bare product id (any shade eligible) or "<product_id>::<color_name>" (one exact shade). */
  key: string;
  label: string;
  sublabel: string;
  image: string | null;
  searchText: string;
}
interface ProductGroup {
  productId: string;
  productTitle: string;
  rows: EligibleRow[];
  hasVariants: boolean;
}

export default function Combos() {
  const [items, setItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [f, setF] = useState({ ...empty });
  const [editId, setEditId] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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
    const ids: string[] = c.product_ids || [];
    setF({
      name: c.name, description: c.description || "", qty: c.qty, price: c.price,
      product_ids: ids, active: c.active,
      weight_target: c.weight_target || "",
      start_date: c.start_date ? new Date(c.start_date).toISOString().slice(0, 16) : "",
      end_date: c.end_date ? new Date(c.end_date).toISOString().slice(0, 16) : "",
      rule_mode: c.weight_target ? "weight" : "manual"
    });
    // Auto-open any product's dropdown that already has a shade selected,
    // so editing a combo shows what's picked without extra clicking.
    setExpanded(new Set(groups.filter((g) => g.rows.some((r) => ids.includes(r.key))).map((g) => g.productId)));
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

  // Each product with colour variants expands into one selectable row per
  // shade (key "<product_id>::<color_name>"); a product with no variants is
  // still just one row (key = the bare product id) — same as before.
  const groups: ProductGroup[] = useMemo(() => {
    return products.map((p) => {
      const title = (p.title || "").trim();
      const hasVariants = Boolean(p.colors && p.colors.length > 0);
      const rows: EligibleRow[] = hasVariants
        ? p.colors.map((c: any) => ({
            key: `${p.id}::${c.name}`,
            label: c.name,
            sublabel: `₹${c.price ?? p.price}${p.skein_weight ? ` • ${p.skein_weight}g` : ""} • stock ${c.stock ?? 0}`,
            image: c.swatch_image || c.images?.[0] || p.images?.[0] || null,
            searchText: `${title} ${c.name} ${c.shade_code || ""} ${p.skein_weight || ""}`.toLowerCase(),
          }))
        : [{
            key: p.id,
            label: title,
            sublabel: `₹${p.price}${p.skein_weight ? ` • ${p.skein_weight}g` : ""} • stock ${p.total_stock ?? p.stock ?? 0}`,
            image: p.images?.[0] || null,
            searchText: `${title} ${p.skein_weight || ""}`.toLowerCase(),
          }];
      return { productId: p.id, productTitle: title, rows, hasVariants };
    });
  }, [products]);

  const filteredGroups: ProductGroup[] = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({ ...g, rows: g.rows.filter((r) => r.searchText.includes(q)) }))
      .filter((g) => g.rows.length > 0);
  }, [groups, search]);

  const filteredRowKeys = useMemo(
    () => filteredGroups.flatMap((g) => g.rows.map((r) => r.key)),
    [filteredGroups]
  );

  const selectAllFiltered = () => {
    const newIds = new Set(f.product_ids);
    filteredRowKeys.forEach((k) => newIds.add(k));
    set("product_ids", Array.from(newIds));
  };

  const deselectAllFiltered = () => {
    const toRemove = new Set(filteredRowKeys);
    set("product_ids", f.product_ids.filter(id => !toRemove.has(id)));
  };

  // While searching, force every group that still has matches open so
  // results are never hidden behind a collapsed dropdown.
  const isSearching = search.trim().length > 0;
  const isExpanded = (productId: string) => isSearching || expanded.has(productId);
  const toggleExpand = (productId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const selectAllInGroup = (g: ProductGroup) => {
    const keys = g.rows.map((r) => r.key);
    const newIds = new Set(f.product_ids);
    keys.forEach((k) => newIds.add(k));
    set("product_ids", Array.from(newIds));
  };
  const clearGroup = (g: ProductGroup) => {
    const toRemove = new Set(g.rows.map((r) => r.key));
    set("product_ids", f.product_ids.filter((id) => !toRemove.has(id)));
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
            <p className="muted" style={{ marginTop: -4 }}>Pick the exact shades (or the whole product, for single-shade items) eligible for this combo.</p>

            <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, shade or weight (e.g. 25)..."
                style={{ flex: 1, margin: 0 }}
              />
              <button className="btn ghost" onClick={selectAllFiltered}>Select All</button>
              <button className="btn ghost" onClick={deselectAllFiltered}>Deselect All</button>
            </div>

            <div style={{ maxHeight: 400, overflowY: "auto", border: "1px solid #e5e5e5", borderRadius: 8, padding: 12, background: "#fafafa" }}>
              {filteredGroups.map((g) => {
                const selectedCount = g.rows.filter((r) => f.product_ids.includes(r.key)).length;

                // A single-shade product has nothing to expand — just one plain row.
                if (!g.hasVariants) {
                  const row = g.rows[0];
                  return (
                    <label key={row.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0 8px 8px", cursor: "pointer", borderBottom: "1px solid #f0f0f0" }}>
                      <input
                        type="checkbox"
                        checked={f.product_ids.includes(row.key)}
                        onChange={() => toggleProduct(row.key)}
                        style={{ width: "auto", margin: 0 }}
                      />
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {row.image && <img src={row.image} alt="" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 6 }} />}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{row.label}</div>
                          <div className="muted" style={{ fontSize: 12 }}>{row.sublabel}</div>
                        </div>
                      </div>
                    </label>
                  );
                }

                const open = isExpanded(g.productId);
                return (
                  <div key={g.productId} style={{ marginBottom: 6, border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", overflow: "hidden" }}>
                    <button
                      type="button"
                      onClick={() => toggleExpand(g.productId)}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                        padding: "10px 12px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <span style={{ display: "inline-block", transition: "transform 0.15s", transform: open ? "rotate(90deg)" : "rotate(0deg)", fontSize: 11, color: "#64748b", flexShrink: 0 }}>▶</span>
                        <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{g.productTitle}</span>
                        <span className="muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>({g.rows.length} shades)</span>
                      </div>
                      <span
                        className="pill"
                        style={{
                          fontSize: 12, fontWeight: 700, flexShrink: 0,
                          background: selectedCount > 0 ? "#eff6ff" : "#f1f5f9",
                          color: selectedCount > 0 ? "#2563eb" : "#94a3b8",
                        }}
                      >
                        {selectedCount}/{g.rows.length} selected
                      </span>
                    </button>

                    {open && (
                      <div style={{ padding: "0 12px 10px" }}>
                        <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                          <button type="button" className="btn ghost sm" onClick={() => selectAllInGroup(g)}>Select all shades</button>
                          <button type="button" className="btn ghost sm" onClick={() => clearGroup(g)}>Clear</button>
                        </div>
                        {g.rows.map((row) => (
                          <label key={row.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 0", cursor: "pointer", borderBottom: "1px solid #f8fafc" }}>
                            <input
                              type="checkbox"
                              checked={f.product_ids.includes(row.key)}
                              onChange={() => toggleProduct(row.key)}
                              style={{ width: "auto", margin: 0 }}
                            />
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              {row.image && <img src={row.image} alt="" style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 6 }} />}
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{row.label}</div>
                                <div className="muted" style={{ fontSize: 11 }}>{row.sublabel}</div>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredGroups.length === 0 && <div className="muted">No products found matching your search.</div>}
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
