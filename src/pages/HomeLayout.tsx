import { useEffect, useState } from "react";
import { api, uploadImage } from "../api";

type Section = {
  id?: string;
  title: string;
  type: "recommendation" | "manual" | "category";
  layout: "rail" | "grid";
  product_ids: string[];
  category_id: string | null;
  limit: number;
  order: number;
  active: boolean;
};

type Prod = {
  id: string; title: string; brand?: string; images?: string[];
  category_id?: string | null; is_active?: boolean;
  total_stock?: number; in_stock?: boolean; low_stock?: boolean;
};
type Cat = { id: string; name: string };

const BLANK: Section = {
  title: "", type: "manual", layout: "rail", product_ids: [],
  category_id: null, limit: 10, order: 0, active: true,
};

const TYPE_LABEL: Record<string, string> = {
  recommendation: "AI Recommendation",
  manual: "Hand-picked products",
  category: "From a category",
};

type SiteMediaItem = {
  id?: string;
  section: string;
  url: string;
  poster?: string | null;
  title: string;
  subtitle: string;
  order: number;
  active: boolean;
};

type SiteMediaSpec = {
  key: string;
  label: string;
  kind: string;
  slots: number;
  aspect: string;
  description: string;
  captions: boolean;
};

export default function HomeLayout() {
  const [tab, setTab] = useState<"sections" | "media">("sections");
  const [sections, setSections] = useState<Section[]>([]);
  const [products, setProducts] = useState<Prod[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [editing, setEditing] = useState<Section | null>(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [desc, setDesc] = useState<Record<string, string[]>>({}); // category -> itself + children
  const [saving, setSaving] = useState(false);

  // Site Media state
  const [mediaSpecs, setMediaSpecs] = useState<SiteMediaSpec[]>([]);
  const [mediaItems, setMediaItems] = useState<SiteMediaItem[]>([]);
  const [mediaTab, setMediaTab] = useState("");
  const [mediaEditing, setMediaEditing] = useState<SiteMediaItem | null>(null);
  const [mediaSaving, setMediaSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = () =>
    api.get<Section[]>("/home-sections").then(setSections).catch(() => {});

  // Fetch the whole catalogue (the API caps a page at 100, so page through it).
  const loadAllProducts = async () => {
    const all: Prod[] = [];
    for (let skip = 0; skip < 10000; skip += 100) {
      const page = await api.get<Prod[]>(`/products?limit=100&skip=${skip}&admin=true`);
      all.push(...page);
      if (page.length < 100) break;
    }
    setProducts(all);
  };

  const loadMedia = async () => {
    try {
      const [specs, items] = await Promise.all([
        api.get<SiteMediaSpec[]>("/site-media/sections"),
        api.get<SiteMediaItem[]>("/site-media/admin"),
      ]);
      setMediaSpecs(specs);
      setMediaItems(items);
      if (!mediaTab && specs.length > 0) setMediaTab(specs[0].key);
    } catch {}
  };

  useEffect(() => {
    load();
    loadMedia();
    loadAllProducts().catch(() => {});
    api.get<any[]>("/categories/tree").then((tree) => {
      const flat: Cat[] = [];
      const d: Record<string, string[]> = {};
      (tree || []).forEach((t) => {
        flat.push({ id: t.id, name: t.name });
        const childIds = (t.children || []).map((c: any) => c.id);
        d[t.id] = [t.id, ...childIds]; // picking a parent includes its sub-categories
        (t.children || []).forEach((c: any) => {
          flat.push({ id: c.id, name: `${t.name} › ${c.name}` });
          d[c.id] = [c.id];
        });
      });
      setCats(flat);
      setDesc(d);
    }).catch(() => {});
  }, []);

  // ── Site Media helpers ──
  const currentSpec = mediaSpecs.find((s) => s.key === mediaTab);
  const currentMediaItems = mediaItems
    .filter((m) => m.section === mediaTab)
    .sort((a, b) => a.order - b.order);

  const handleMediaUpload = async (file: File) => {
    if (!currentSpec) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      const item: Omit<SiteMediaItem, "id"> = {
        section: mediaTab,
        url,
        title: "",
        subtitle: "",
        order: currentMediaItems.length,
        active: true,
      };
      await api.post("/site-media", item);
      await loadMedia();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setUploading(false);
    }
  };

  const saveMedia = async () => {
    if (!mediaEditing) return;
    setMediaSaving(true);
    try {
      if (mediaEditing.id) {
        await api.patch(`/site-media/${mediaEditing.id}`, {
          url: mediaEditing.url,
          title: mediaEditing.title,
          subtitle: mediaEditing.subtitle,
          active: mediaEditing.active,
          order: mediaEditing.order,
        });
      } else {
        await api.post("/site-media", mediaEditing);
      }
      setMediaEditing(null);
      await loadMedia();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setMediaSaving(false);
    }
  };

  const deleteMedia = async (item: SiteMediaItem) => {
    if (!item.id || !confirm("Delete this media item?")) return;
    await api.del(`/site-media/${item.id}`);
    await loadMedia();
  };

  const toggleMediaActive = async (item: SiteMediaItem) => {
    if (!item.id) return;
    await api.patch(`/site-media/${item.id}`, { active: !item.active });
    await loadMedia();
  };

  const handleMediaReplace = async (item: SiteMediaItem, file: File) => {
    if (!item.id) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      await api.patch(`/site-media/${item.id}`, { url });
      await loadMedia();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setUploading(false);
    }
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const next = [...sections];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setSections(next);
    await api.put("/home-sections/order", { ids: next.map((s) => s.id) });
  };

  const toggleActive = async (s: Section) => {
    await api.patch(`/home-sections/${s.id}`, { active: !s.active });
    load();
  };

  const remove = async (s: Section) => {
    if (!confirm(`Delete section "${s.title}"?`)) return;
    await api.del(`/home-sections/${s.id}`);
    load();
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.title.trim()) return alert("Title is required");
    if (editing.type === "manual" && editing.product_ids.length === 0)
      return alert("Pick at least one product");
    if (editing.type === "category" && !editing.category_id)
      return alert("Choose a category");
    setSaving(true);
    try {
      const body = { ...editing, title: editing.title.trim() };
      if (editing.id) await api.patch(`/home-sections/${editing.id}`, body);
      else await api.post("/home-sections", { ...body, order: sections.length });
      setEditing(null);
      setSearch("");
      setCatFilter("");
      load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleProduct = (id: string) => {
    if (!editing) return;
    const has = editing.product_ids.includes(id);
    setEditing({
      ...editing,
      product_ids: has
        ? editing.product_ids.filter((p) => p !== id)
        : [...editing.product_ids, id],
    });
  };

  const filtered = products.filter((p) => {
    const inCat = !catFilter || (desc[catFilter] || [catFilter]).includes(p.category_id || "");
    const inSearch = (p.title + " " + (p.brand || "")).toLowerCase().includes(search.toLowerCase());
    return inCat && inSearch;
  });

  return (
    <>
      <div className="flex" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h1>Home Layout</h1>
      </div>

      {/* Tab bar */}
      <div className="flex" style={{ gap: 0, marginBottom: 16, borderBottom: "2px solid var(--border)" }}>
        <button
          className="btn ghost"
          style={{
            borderRadius: 0,
            borderBottom: tab === "sections" ? "2px solid var(--accent)" : "2px solid transparent",
            fontWeight: tab === "sections" ? 600 : 400,
            marginBottom: -2,
          }}
          onClick={() => setTab("sections")}
        >
          Product Sections
        </button>
        <button
          className="btn ghost"
          style={{
            borderRadius: 0,
            borderBottom: tab === "media" ? "2px solid var(--accent)" : "2px solid transparent",
            fontWeight: tab === "media" ? 600 : 400,
            marginBottom: -2,
          }}
          onClick={() => setTab("media")}
        >
          Site Media
        </button>
      </div>

      {/* ── Site Media Tab ── */}
      {tab === "media" && (
        <>
          <p className="muted" style={{ marginTop: -6 }}>
            Upload and manage images for home page sections. Changes appear on the website immediately.
          </p>

          {/* Media section tabs */}
          <div className="flex" style={{ gap: 6, flexWrap: "wrap", marginTop: 12, marginBottom: 16 }}>
            {mediaSpecs.map((spec) => (
              <button
                key={spec.key}
                className={`btn ${mediaTab === spec.key ? "" : "ghost"} sm`}
                onClick={() => { setMediaTab(spec.key); setMediaEditing(null); }}
              >
                {spec.label}
              </button>
            ))}
          </div>

          {currentSpec && (
            <>
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="flex" style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ margin: 0 }}>{currentSpec.label}</h3>
                    <p className="muted" style={{ marginTop: 4 }}>{currentSpec.description}</p>
                    <p className="muted" style={{ fontSize: 12 }}>
                      Aspect ratio: <b>{currentSpec.aspect}</b> · Max {currentSpec.slots} slot{currentSpec.slots !== 1 ? "s" : ""} · {currentSpec.kind === "video" ? "Video" : "Image"}
                    </p>
                  </div>
                  <label className="btn" style={{ cursor: "pointer", opacity: uploading ? 0.6 : 1 }}>
                    {uploading ? "Uploading…" : "+ Upload Image"}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      disabled={uploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleMediaUpload(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Media items grid */}
              {currentMediaItems.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: 40 }}>
                  <p className="muted">No images uploaded yet for this section.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                  {currentMediaItems.map((item) => (
                    <div key={item.id} className="card" style={{ padding: 0, overflow: "hidden", opacity: item.active ? 1 : 0.5 }}>
                      <div style={{ position: "relative", background: "#f5f3ef" }}>
                        <img
                          src={item.url}
                          alt={item.title || "Media"}
                          style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }}
                        />
                        {!item.active && (
                          <span className="pill" style={{ position: "absolute", top: 8, right: 8, background: "#FDECEC", color: "#E23744" }}>
                            Hidden
                          </span>
                        )}
                      </div>
                      <div style={{ padding: "12px 16px" }}>
                        {item.title && <p style={{ margin: 0, fontWeight: 600 }}>{item.title}</p>}
                        {item.subtitle && <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>{item.subtitle}</p>}
                        {!item.title && !item.subtitle && <p className="muted" style={{ margin: 0, fontSize: 13 }}>No title set</p>}
                        <div className="flex" style={{ gap: 6, marginTop: 10 }}>
                          <button className="btn ghost sm" onClick={() => setMediaEditing({ ...item })}>Edit</button>
                          <button className="btn ghost sm" onClick={() => toggleMediaActive(item)}>
                            {item.active ? "Hide" : "Show"}
                          </button>
                          <label className="btn ghost sm" style={{ cursor: "pointer" }}>
                            Replace
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: "none" }}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleMediaReplace(item, f);
                                e.target.value = "";
                              }}
                            />
                          </label>
                          <button className="btn danger sm" onClick={() => deleteMedia(item)}>Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Media editor */}
              {mediaEditing && (
                <div className="card" style={{ marginTop: 16 }}>
                  <h3 style={{ marginTop: 0 }}>Edit Media</h3>
                  <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <img
                      src={mediaEditing.url}
                      alt="Preview"
                      style={{ width: 160, height: 120, objectFit: "cover", borderRadius: 8, background: "#f5f3ef" }}
                    />
                    <div style={{ flex: 1 }}>
                      <div className="row">
                        <div style={{ flex: 1 }}>
                          <label>Title</label>
                          <input
                            value={mediaEditing.title}
                            onChange={(e) => setMediaEditing({ ...mediaEditing, title: e.target.value })}
                            placeholder="e.g. Cotton Delight"
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label>Subtitle / Description</label>
                          <input
                            value={mediaEditing.subtitle}
                            onChange={(e) => setMediaEditing({ ...mediaEditing, subtitle: e.target.value })}
                            placeholder="e.g. Small-batch dyed · 50g skein"
                          />
                        </div>
                      </div>
                      <div className="row" style={{ marginTop: 8 }}>
                        <div>
                          <label>Order</label>
                          <input
                            type="number"
                            value={mediaEditing.order}
                            onChange={(e) => setMediaEditing({ ...mediaEditing, order: Number(e.target.value) || 0 })}
                            style={{ width: 80 }}
                          />
                        </div>
                        <div>
                          <label className="flex" style={{ gap: 6, marginTop: 22 }}>
                            <input type="checkbox" style={{ width: "auto" }} checked={mediaEditing.active} onChange={(e) => setMediaEditing({ ...mediaEditing, active: e.target.checked })} />
                            Visible
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex" style={{ marginTop: 14 }}>
                    <button className="btn" onClick={saveMedia} disabled={mediaSaving}>
                      {mediaSaving ? "Saving…" : "Save"}
                    </button>
                    <button className="btn ghost" onClick={() => setMediaEditing(null)}>Cancel</button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Product Sections Tab ── */}
      {tab === "sections" && (
      <>
      <div className="flex" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <p className="muted" style={{ marginTop: -6 }}>
          Build the website home layout. Drag order with ▲▼ — the top section shows first.
        </p>
        <button className="btn" onClick={() => setEditing({ ...BLANK })}>+ Add Section</button>
      </div>

      {/* Section list */}
      <div className="card">
        <table>
          <thead>
            <tr><th>Order</th><th>Title</th><th>Type</th><th>View</th><th>Items</th><th>Live</th><th></th></tr>
          </thead>
          <tbody>
            {sections.map((s, i) => (
              <tr key={s.id}>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button className="btn ghost sm" disabled={i === 0} onClick={() => move(i, -1)}>▲</button>{" "}
                  <button className="btn ghost sm" disabled={i === sections.length - 1} onClick={() => move(i, 1)}>▼</button>
                </td>
                <td><b>{s.title}</b></td>
                <td><span className="pill" style={{ background: "#f1eee9" }}>{TYPE_LABEL[s.type] || s.type}</span></td>
                <td>{s.layout === "rail" ? "Side-by-side" : "Grid"}</td>
                <td className="muted">
                  {s.type === "manual" ? (
                    (() => {
                      const hidden = s.product_ids.filter((id) => products.find((p) => p.id === id)?.is_active === false).length;
                      return `${s.product_ids.length} picked${hidden ? ` · ${hidden} hidden` : ""}`;
                    })()
                  ) : s.type === "category" ? "category" : "auto"}
                </td>
                <td>
                  <label className="flex" style={{ gap: 6 }}>
                    <input type="checkbox" style={{ width: "auto" }} checked={s.active} onChange={() => toggleActive(s)} />
                  </label>
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button className="btn ghost sm" onClick={() => setEditing({ ...s })}>Edit</button>{" "}
                  <button className="btn danger sm" onClick={() => remove(s)}>Delete</button>
                </td>
              </tr>
            ))}
            {sections.length === 0 && <tr><td colSpan={7} className="muted">No sections yet. Add one to build the home screen.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Editor */}
      {editing && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{editing.id ? "Edit section" : "New section"}</h3>
          <div className="row">
            <div style={{ flex: 2 }}>
              <label>Section title</label>
              <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="e.g. Summer Collection" />
            </div>
            <div>
              <label>Content</label>
              <select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value as Section["type"] })}>
                <option value="recommendation">AI Recommendation</option>
                <option value="manual">Hand-picked products</option>
                <option value="category">From a category</option>
              </select>
            </div>
            <div>
              <label>View</label>
              <select value={editing.layout} onChange={(e) => setEditing({ ...editing, layout: e.target.value as Section["layout"] })}>
                <option value="rail">Side-by-side (rail)</option>
                <option value="grid">Grid (stacked)</option>
              </select>
            </div>
            <div>
              <label>Max items</label>
              <input type="number" value={editing.limit} onChange={(e) => setEditing({ ...editing, limit: Math.max(1, Number(e.target.value) || 1) })} />
            </div>
          </div>

          {editing.type === "category" && (
            <div style={{ marginTop: 12 }}>
              <label>Category</label>
              <select value={editing.category_id || ""} onChange={(e) => setEditing({ ...editing, category_id: e.target.value || null })}>
                <option value="">Select a category…</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {editing.type === "manual" && (
            <div style={{ marginTop: 12 }}>
              <label>Products ({editing.product_ids.length} selected — shown in the order you pick)</label>
              <div className="row">
                <div style={{ flex: 1 }}>
                  <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
                    <option value="">All categories</option>
                    {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <input placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>
              <div style={{ maxHeight: 280, overflow: "auto", marginTop: 10, border: "1px solid var(--border)", borderRadius: 10 }}>
                {filtered.map((p) => {
                  const sel = editing.product_ids.includes(p.id);
                  const pos = editing.product_ids.indexOf(p.id) + 1;
                  return (
                    <label key={p.id} className="flex" style={{ gap: 10, padding: "8px 12px", borderBottom: "1px solid var(--border)", cursor: "pointer", background: sel ? "#FFF3EB" : undefined }}>
                      <input type="checkbox" style={{ width: "auto" }} checked={sel} onChange={() => toggleProduct(p.id)} />
                      <img className="thumb" src={p.images?.[0] || "https://via.placeholder.com/40"} style={{ width: 34, height: 34 }} />
                      <span style={{ flex: 1 }}>{p.title}{p.brand ? <span className="muted"> · {p.brand}</span> : null}</span>
                      {p.in_stock === false ? (
                        <span className="pill" style={{ background: "#FDECEC", color: "#E23744" }}>Out of stock</span>
                      ) : (
                        <span className="pill" style={{ background: p.low_stock ? "#FFF1E8" : "#EAF7EE", color: p.low_stock ? "#F26A21" : "#2F8F46" }}>
                          {p.total_stock ?? 0} in stock
                        </span>
                      )}
                      {p.is_active === false && (
                        <span className="pill" style={{ background: "#FDECEC", color: "#E23744" }}>Inactive · hidden</span>
                      )}
                      {sel && <span className="pill" style={{ background: "#F26A21", color: "#fff" }}>#{pos}</span>}
                    </label>
                  );
                })}
                {filtered.length === 0 && <div className="muted" style={{ padding: 12 }}>No products match.</div>}
              </div>
            </div>
          )}

          {editing.type === "recommendation" && (
            <p className="muted" style={{ marginTop: 12 }}>
              Auto-filled with personalised AI recommendations for each shopper. No manual picking needed.
            </p>
          )}

          <label className="flex" style={{ marginTop: 14 }}>
            <input type="checkbox" style={{ width: "auto" }} checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
            Visible on home screen
          </label>

          <div className="flex" style={{ marginTop: 14 }}>
            <button className="btn" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save section"}</button>
            <button className="btn ghost" onClick={() => { setEditing(null); setSearch(""); setCatFilter(""); }}>Cancel</button>
          </div>
        </div>
      )}
      </>
      )}
    </>
  );
}
