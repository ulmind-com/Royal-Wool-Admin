import { useEffect, useState } from "react";
import { api, uploadImage } from "../api";

const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const thumb = (size = 44): React.CSSProperties => ({
  width: size, height: size, borderRadius: 12, objectFit: "cover", background: "#f8fafc", border: "1px solid #e2e8f0"
});

export default function Categories() {
  const [tree, setTree] = useState<any[]>([]);
  const [topName, setTopName] = useState("");
  const [topImg, setTopImg] = useState("");
  const [busy, setBusy] = useState(false);
  const [scales, setScales] = useState<Record<string, number>>({}); 

  const load = () =>
    api.get<any[]>("/categories/tree").then((t) => {
      setTree(t);
      const sc: Record<string, number> = {};
      (t || []).forEach((c) => { sc[c.id] = Math.round((c.image_scale || 1) * 100); });
      setScales(sc);
    }).catch(() => {});
  useEffect(() => { load(); }, []);

  const saveScale = (id: string, pct: number) => {
    api.patch(`/categories/${id}`, { image_scale: pct / 100 }).catch(() => {});
  };

  const upload = async (file: File | undefined, cb: (url: string) => void) => {
    if (!file) return;
    setBusy(true);
    try { cb(await uploadImage(file)); } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  };

  const setCatImage = async (id: string, file: File | undefined) => {
    await upload(file, async (url) => { await api.patch(`/categories/${id}`, { image: url }); load(); });
  };

  const addTop = async () => {
    if (!topName.trim()) return;
    await api.post("/categories", { name: topName.trim(), slug: slug(topName), parent_id: null, image: topImg || null });
    setTopName(""); setTopImg(""); load();
  };
  const addSub = async (parentId: string) => {
    const name = prompt("Sub-category name (e.g. Merino, Cashmere, DK Weight)");
    if (!name?.trim()) return;
    await api.post("/categories", { name: name.trim(), slug: slug(name) + "-" + Date.now().toString().slice(-4), parent_id: parentId });
    load();
  };
  const setBlurb = async (id: string, current?: string) => {
    const text = prompt("Tagline shown under this range in the site nav", current || "");
    if (text === null) return;
    await api.patch(`/categories/${id}`, { blurb: text.trim() });
    load();
  };
  const del = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    await api.del(`/categories/${id}`); load();
  };

  const FallbackImage = ({ size = 44 }) => (
    <div style={{ width: size, height: size, borderRadius: 12, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #e2e8f0" }}>
      <svg width={size * 0.4} height={size * 0.4} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
    </div>
  );

  return (
    <>
      <style>{`
        .fatafati-card {
          background: #fff;
          border-radius: 20px;
          padding: 28px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
          border: 1px solid rgba(0,0,0,0.04);
          margin-bottom: 24px;
        }
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 32px;
        }
        .dashboard-title {
          font-size: 32px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 6px 0;
          letter-spacing: -0.5px;
        }
        .dashboard-subtitle {
          color: #64748b;
          font-size: 16px;
          margin: 0;
          font-weight: 500;
        }
        .pill-preview {
          position: relative; 
          width: 180px; 
          height: 52px; 
          background: #fff; 
          border: 1px solid #e2e8f0; 
          border-radius: 26px; 
          display: flex; 
          align-items: center; 
          padding-left: 64px; 
          box-shadow: 0 4px 12px rgba(0,0,0,0.05); 
          flex: 0 0 auto;
        }
        .subcat-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          margin-top: 16px;
        }
        .subcat-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #f1f5f9;
        }
        .subcat-table tr:hover td {
          background: #f8fafc;
        }
        .subcat-table tr:first-child td:first-child { border-top-left-radius: 12px; }
        .subcat-table tr:first-child td:last-child { border-top-right-radius: 12px; }
        .subcat-table tr:last-child td:first-child { border-bottom-left-radius: 12px; }
        .subcat-table tr:last-child td:last-child { border-bottom-right-radius: 12px; }
        .subcat-table td:first-child { border-left: 1px solid #f1f5f9; }
        .subcat-table td:last-child { border-right: 1px solid #f1f5f9; }
        .subcat-table tr:first-child td { border-top: 1px solid #f1f5f9; }
      `}</style>

      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Yarn Categories</h1>
          <p className="dashboard-subtitle">Organize your beautiful wool collections and fibers.</p>
        </div>
      </div>

      <div className="fatafati-card" style={{ background: "linear-gradient(to right, #ffffff, #f8fafc)" }}>
        <h3 style={{ margin: "0 0 16px 0", color: "#0f172a", fontSize: 18 }}>Create Top-Level Category</h3>
        <div className="flex" style={{ alignItems: "center", gap: 16 }}>
          {topImg ? <img src={topImg} style={thumb(48)} /> : <FallbackImage size={48} />}
          <div style={{ flex: 1, position: "relative" }}>
            <input 
              value={topName} 
              onChange={(e) => setTopName(e.target.value)} 
              placeholder="e.g. Animal Fibers, Plant Fibers, Synthetic Blends..." 
              style={{ width: "100%", margin: 0, padding: "12px 16px", borderRadius: 12, border: "1px solid #cbd5e1" }}
            />
          </div>
          <label className="btn ghost" style={{ cursor: "pointer", whiteSpace: "nowrap", margin: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6, display: "inline-block", verticalAlign: "middle" }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            {topImg ? "Change Photo" : "Upload Photo"}
            <input type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0], setTopImg)} />
          </label>
          <button className="btn" onClick={addTop} disabled={busy} style={{ margin: 0, padding: "12px 24px" }}>
            {busy ? "Uploading..." : "Create Category"}
          </button>
        </div>
        <p className="muted" style={{ margin: "12px 0 0 0", fontSize: 13 }}>
          <span style={{ color: "#3b82f6", fontWeight: 600 }}>Tip:</span> These images will appear as beautiful category pills on the mobile app home screen.
        </p>
      </div>

      {tree.map((c) => (
        <div className="fatafati-card" key={c.id}>
          <div className="between" style={{ paddingBottom: 20, borderBottom: "1px solid #f1f5f9" }}>
            <div className="flex" style={{ alignItems: "center", gap: 16 }}>
              {c.image ? <img src={c.image} style={thumb(56)} /> : <FallbackImage size={56} />}
              <div>
                <h3 style={{ margin: 0, fontSize: 22, color: "#0f172a" }}>{c.name}</h3>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
                  {c.blurb || "No tagline yet"}{" "}
                  <button
                    onClick={() => setBlurb(c.id, c.blurb)}
                    style={{ border: 0, background: "none", color: "#3b82f6", fontWeight: 600, cursor: "pointer", padding: 0 }}
                  >
                    Edit tagline
                  </button>
                </p>
                <label style={{ cursor: "pointer", color: "#3b82f6", fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                  {c.image ? "Change icon" : "Add icon"}
                  <input type="file" accept="image/*" hidden onChange={(e) => setCatImage(c.id, e.target.files?.[0])} />
                </label>
              </div>
            </div>
            <div className="flex" style={{ gap: 12 }}>
              <button className="btn ghost" onClick={() => addSub(c.id)} style={{ color: "#0f172a" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6, verticalAlign: "text-bottom" }}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Add Sub-category
              </button>
              <button className="btn ghost" onClick={() => del(c.id, c.name)} style={{ color: "#ef4444", background: "#fef2f2" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4, verticalAlign: "text-bottom" }}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                Delete
              </button>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 24, padding: "16px 20px", background: "#f8fafc", borderRadius: 12 }}>
            <div className="pill-preview">
              {c.image ? (
                <img
                  src={c.image}
                  style={{ position: "absolute", left: 6, bottom: 0, height: 62 * ((scales[c.id] ?? 100) / 100), width: 54 * ((scales[c.id] ?? 100) / 100), objectFit: "contain", filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.1))" }}
                />
              ) : (
                <div style={{ position: "absolute", left: 8, bottom: 8, height: 36, width: 36, borderRadius: "50%", background: "#e2e8f0" }} />
              )}
              <span style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{c.name}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <label style={{ margin: 0, fontWeight: 600, color: "#334155" }}>App Home Image Size</label>
                <span style={{ fontWeight: 700, color: "#3b82f6" }}>{scales[c.id] ?? 100}%</span>
              </div>
              <input
                type="range" min={70} max={170} step={5}
                value={scales[c.id] ?? 100}
                onChange={(e) => setScales((s) => ({ ...s, [c.id]: Number(e.target.value) }))}
                onMouseUp={() => saveScale(c.id, scales[c.id] ?? 100)}
                onTouchEnd={() => saveScale(c.id, scales[c.id] ?? 100)}
                style={{ width: "100%", accentColor: "#3b82f6" }}
              />
              <p className="muted" style={{ margin: "4px 0 0 0", fontSize: 13 }}>Adjust how large the wool ball pops out of the pill on the app home screen.</p>
            </div>
          </div>

          {c.children?.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h4 style={{ margin: "0 0 8px 0", color: "#475569", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5 }}>Sub-categories</h4>
              <table className="subcat-table">
                <tbody>
                  {c.children.map((s: any) => (
                    <tr key={s.id}>
                      <td style={{ width: "100%" }}>
                        <div className="flex" style={{ alignItems: "center", gap: 12 }}>
                          {s.image ? <img src={s.image} style={thumb(36)} /> : <FallbackImage size={36} />}
                          <span style={{ fontWeight: 600, color: "#1e293b", fontSize: 15 }}>{s.name}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <label className="btn ghost sm" style={{ cursor: "pointer", color: "#3b82f6", marginRight: 8 }}>
                          {s.image ? "Change Photo" : "Add Photo"}
                          <input type="file" accept="image/*" hidden onChange={(e) => setCatImage(s.id, e.target.files?.[0])} />
                        </label>
                        <button className="btn ghost sm" onClick={() => del(s.id, s.name)} style={{ color: "#ef4444" }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
      
      {tree.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: 20, border: "1px dashed #cbd5e1", marginTop: 24 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#f1f5f9", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
             <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
          </div>
          <h3 style={{ margin: "0 0 8px 0", color: "#0f172a" }}>No categories yet</h3>
          <p className="muted" style={{ margin: 0, maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>Create your first top-level category above (like Animal Fibers) to start organizing your wool inventory.</p>
        </div>
      )}
    </>
  );
}
