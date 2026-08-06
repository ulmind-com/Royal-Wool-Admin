import { useEffect, useState } from "react";
import { api } from "../api";

export default function Announcements() {
  const [s, setS] = useState<any>(null);
  const [items, setItems] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);

  useEffect(() => {
    api.get("/settings").then((data: any) => {
      setS(data);
      // Fallback for missing announcements
      setItems(data.announcements || [
        "Free delivery on orders above {free_delivery}",
        "{coupon}",
        "Support 10am–7pm IST, all days",
        "Small-batch colour, wound for stitch definition"
      ]);
    }).catch((e: any) => setErr(e.message));
  }, []);

  if (!s) return <p className="muted">Loading…</p>;

  const save = async () => {
    setErr("");
    setSaved(false);
    setSaving(true);
    try {
      const res = await api.put("/settings", {
        ...s,
        announcements: items.map(t => t.trim()).filter(Boolean)
      });
      setS(res);
      setItems(res.announcements || []);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const updateItem = (idx: number, val: string) => {
    const next = [...items];
    next[idx] = val;
    setItems(next);
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const addItem = () => {
    setItems([...items, ""]);
  };

  // Drag and drop handlers
  const onDragStart = (idx: number) => setDragIdx(idx);
  const onDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault(); // Necessary to allow dropping
    if (dragIdx === null || dragIdx === idx) return;
    setDropIdx(idx);
  };
  const onDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) {
      setDropIdx(null);
      return;
    }
    const next = [...items];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(idx, 0, moved);
    setItems(next);
    setDragIdx(null);
    setDropIdx(null);
  };
  const onDragEnd = () => {
    setDragIdx(null);
    setDropIdx(null);
  };

  return (
    <>
      <div className="flex" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h1>Store Marquee</h1>
        <button className="btn ghost" onClick={addItem}>+ Add Message</button>
      </div>
      <p className="muted" style={{ marginTop: -6, marginBottom: 24 }}>
        Manage the scrolling announcement banner at the top of the website. 
        You can drag to reorder. Empty items will be ignored.
      </p>

      {/* Preview Section */}
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 24 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "#fbfbfc" }}>
          <h4 style={{ margin: 0, fontSize: 13, textTransform: "uppercase", color: "var(--muted)", letterSpacing: 0.5 }}>Live Preview</h4>
        </div>
        <div style={{ background: "#2B211E", color: "#E0D7D0", padding: "8px 0", overflow: "hidden", whiteSpace: "nowrap", position: "relative" }}>
          <div style={{ display: "inline-flex", gap: 40, animation: "marquee 15s linear infinite", paddingLeft: 20 }}>
            {[...items, ...items, ...items].filter(Boolean).map((text, i) => {
              let display = text;
              if (display.includes("{free_delivery}")) display = display.replace("{free_delivery}", `₹${s.delivery?.free_above || "1,500"}`);
              if (display.includes("{coupon_code}")) display = display.replace("{coupon_code}", "WELCOME10");
              if (display.includes("{coupon_desc}")) display = display.replace("{coupon_desc}", "10% off");
              if (display === "{coupon}") display = "Use code WELCOME10 — 10% off your first order";
              return (
                <span key={i} style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 40 }}>
                  {display}
                  <span style={{ color: "var(--orange)" }}>✦</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-33.33%); } }
        .drag-item {
          display: flex; gap: 12px; align-items: center; padding: 14px 16px; 
          background: var(--card); border: 1px solid var(--border); border-radius: 12px; margin-bottom: 12px;
          transition: all 0.2s;
        }
        .drag-item:focus-within { border-color: var(--orange); box-shadow: 0 4px 12px rgba(242, 106, 33, 0.08); }
        .drag-item.dragging { opacity: 0.4; transform: scale(0.98); }
        .drag-item.drag-over { border-top: 3px solid var(--orange); padding-top: 12px; }
        .drag-handle { cursor: grab; color: var(--muted); font-size: 18px; padding: 0 4px; user-select: none; }
        .drag-handle:active { cursor: grabbing; }
        .smart-tags { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
        .smart-tag { background: #fff7f3; color: var(--orange); border: 1px dashed rgba(242, 106, 33, 0.4); padding: 4px 8px; border-radius: 6px; font-size: 12px; font-family: monospace; font-weight: 600; cursor: pointer; user-select: text; }
      `}</style>

      {/* Editor Section */}
      <div>
        {items.map((item, idx) => (
          <div 
            key={idx} 
            className={\`drag-item \${dragIdx === idx ? "dragging" : ""} \${dropIdx === idx ? "drag-over" : ""}\`}
            draggable
            onDragStart={() => onDragStart(idx)}
            onDragOver={(e) => onDragOver(e, idx)}
            onDrop={(e) => onDrop(e, idx)}
            onDragEnd={onDragEnd}
          >
            <div className="drag-handle" title="Drag to reorder">⋮⋮</div>
            <div style={{ flex: 1 }}>
              <input 
                value={item}
                onChange={(e) => updateItem(idx, e.target.value)}
                placeholder="e.g. Free delivery on all orders!"
                style={{ border: "none", padding: 0, fontSize: 15, background: "transparent", fontWeight: 500 }}
              />
            </div>
            <button className="btn danger sm" onClick={() => removeItem(idx)}>Remove</button>
          </div>
        ))}
        {items.length === 0 && <p className="muted">No announcements. The marquee will be hidden.</p>}
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h4 style={{ margin: "0 0 8px 0" }}>Smart Tags</h4>
        <p className="muted" style={{ margin: 0 }}>Use these placeholders in your text to automatically insert dynamic store data:</p>
        <div className="smart-tags">
          <span className="smart-tag" title="Inserts the free delivery threshold amount (e.g. ₹1,500)">{`{free_delivery}`}</span>
          <span className="smart-tag" title="Inserts the currently active coupon code (e.g. WELCOME10)">{`{coupon_code}`}</span>
          <span className="smart-tag" title="Inserts the active coupon's description">{`{coupon_desc}`}</span>
          <span className="smart-tag" title="A pre-formatted sentence for the active coupon">{`{coupon}`}</span>
        </div>
      </div>

      {err && <div className="err" style={{ marginBottom: 16 }}>{err}</div>}
      
      <div className="flex" style={{ marginTop: 24 }}>
        <button className="btn" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
        {saved && <span style={{ color: "var(--green)", fontWeight: 600 }}>Saved ✓</span>}
      </div>
    </>
  );
}
