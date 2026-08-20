import { useEffect, useState } from "react";
import { api } from "../api";
import { API_URL } from "../config";
import PaymentInfo from "../components/PaymentInfo";
import { fmtDate } from "../date";
import {
  IconBox, IconNew, IconProcessing, IconShipped, IconDelivery,
  IconDelivered, IconCancelled, IconDownload, IconPrinter, IconWhatsApp,
} from "../icons";

const STAGES = ["placed", "confirmed", "shipped", "out_for_delivery", "delivered", "cancelled"];
const label = (s: string) => s.replace(/_/g, " ");

// WhatsApp number that order details are shared to (with country code, no +).
// LIVE (client): 8910792214  ·  test was 8537861040.
const SHARE_WHATSAPP = "918910792214";

const absImg = (src?: string) => {
  if (!src) return "";
  return src.startsWith("http") ? src : `${API_URL}${src.startsWith("/") ? "" : "/"}${src}`;
};

const buildOrderMessage = (o: any) => {
  const orderId = `#${o.id.slice(-6).toUpperCase()}`;
  const addr = [o.address?.house, o.address?.area, o.address?.city, o.address?.state, o.address?.pincode]
    .filter(Boolean).join(", ");
  const lines: string[] = [];
  lines.push("🧶 *Royaall Wool — Order Details*");
  lines.push("");
  lines.push(`*Order:* ${orderId}`);
  lines.push(`*Date:* ${fmtDate(o.created_at)}`);
  lines.push(`*Status:* ${label(o.status)}`);
  lines.push("");
  lines.push("👤 *Customer*");
  lines.push(`Name: ${o.address?.name || "—"}`);
  lines.push(`Phone: ${o.address?.phone || "—"}`);
  lines.push("");
  lines.push("📍 *Delivery Address*");
  lines.push(addr || "—");
  if (o.distance_km != null) lines.push(`Distance: ${o.distance_km} km`);
  lines.push("");
  lines.push(`🛒 *Items (${o.items?.length || 0})*`);
  (o.items || []).forEach((it: any, i: number) => {
    const variant = [it.color, it.size].filter(Boolean).join(" · ");
    lines.push(`${i + 1}. ${it.title}${variant ? ` (${variant})` : ""}`);
    lines.push(`   Product ID: ${it.product_id}`);
    lines.push(`   Qty: ${it.qty} × ₹${it.price} = ₹${(it.price * it.qty).toFixed(2)}`);
    const img = absImg(it.image);
    if (img) lines.push(`   Image: ${img}`);
  });
  lines.push("");
  lines.push("💰 *Bill*");
  lines.push(`Subtotal: ₹${o.subtotal}`);
  lines.push(`Discount: ₹${o.discount}`);
  lines.push(`Delivery: ₹${o.delivery}`);
  lines.push(`Tax: ₹${o.tax}`);
  lines.push(`*Total: ₹${o.amount}*`);
  lines.push("");
  const paid = o.payment_method === "online" && o.razorpay_payment_id;
  lines.push(`Payment: ${(o.payment_method || "—").toUpperCase()}${o.payment_method === "online" ? (paid ? " · PAID" : " · UNPAID") : ""}`);
  return lines.join("\n");
};

const shareOrderToWhatsApp = (o: any) => {
  const text = encodeURIComponent(buildOrderMessage(o));
  window.open(`https://wa.me/${SHARE_WHATSAPP}?text=${text}`, "_blank");
};

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [counts, setCounts] = useState<Record<string, number>>({});

  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("shipped");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [trackingModal, setTrackingModal] = useState<{ id: string, status: string } | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setSelectedOrders(new Set());
  }, [orders]);

  const dateStr = (d: Date) => d.toISOString().slice(0, 10);
  const applyDatePreset = (daysBack: number) => {
    const from = new Date();
    from.setDate(from.getDate() - daysBack);
    setStartDate(dateStr(from));
    setEndDate(dateStr(new Date()));
  };

  const filterParams = () => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.append("status", statusFilter);
    if (search.trim()) params.append("q", search.trim());
    if (startDate) params.append("start_date", new Date(startDate).toISOString());
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      params.append("end_date", end.toISOString());
    }
    return params;
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await api.download(`/orders/admin/export?${filterParams().toString()}`, "Orders_Royal_Wool.xlsx");
    } catch (e: any) {
      alert(e.message || "Export failed");
    }
    setExporting(false);
  };

  const handleBulkApply = async () => {
    if (selectedOrders.size === 0) return;
    setBulkLoading(true);
    try {
      await api.patch("/orders/admin/bulk-status", {
        order_ids: Array.from(selectedOrders),
        status: bulkStatus
      });
      setSelectedOrders(new Set());
      load();
      loadCounts();
    } catch (e) {
      console.error(e);
    }
    setBulkLoading(false);
  };

  const loadCounts = () => api.get("/orders/admin/status-counts").then(setCounts).catch(() => {});

  const load = () => {
    api.get(`/orders/admin/all?${filterParams().toString()}`).then(setOrders).catch(() => {});
  };

  useEffect(() => { loadCounts(); }, []);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 400);
    return () => clearTimeout(timer);
  }, [search, startDate, endDate, statusFilter]);

  const setStatus = async (id: string, status: string, tracking_id?: string, tracking_url?: string) => {
    await api.patch(`/orders/${id}/status`, { status, tracking_id, tracking_url });
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status, tracking_id: tracking_id || o.tracking_id, tracking_url: tracking_url || o.tracking_url } : o)));
    loadCounts();
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    if (newStatus === "shipped") {
      setTrackingModal({ id, status: newStatus });
    } else {
      setStatus(id, newStatus);
    }
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>Orders</h1>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
        {[
          { id: "all", label: "All Orders", icon: <IconBox /> },
          { id: "placed", label: "New", icon: <IconNew /> },
          { id: "confirmed", label: "Processing", icon: <IconProcessing /> },
          { id: "shipped", label: "Shipped", icon: <IconShipped /> },
          { id: "out_for_delivery", label: "Out for Delivery", icon: <IconDelivery /> },
          { id: "delivered", label: "Delivered", icon: <IconDelivered /> },
          { id: "cancelled", label: "Cancelled", icon: <IconCancelled /> },
        ].map(t => {
          const total = t.id === "all" ? Object.values(counts).reduce((a, b) => a + b, 0) : (counts[t.id] || 0);
          const active = statusFilter === t.id;
          return (
            <button 
              key={t.id} 
              onClick={() => setStatusFilter(t.id)}
              style={{
                background: active ? "#1e293b" : "#fff",
                color: active ? "#fff" : "#475569",
                border: `1px solid ${active ? "#1e293b" : "#cbd5e1"}`,
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
              <span style={{ display: "inline-flex", alignItems: "center" }}>{t.icon}</span> {t.label}
              <span style={{ 
                background: active ? "rgba(255,255,255,0.2)" : "#f1f5f9", 
                padding: "2px 8px", 
                borderRadius: 12, 
                fontSize: 12 
              }}>
                {total}
              </span>
            </button>
          )
        })}
      </div>
      
      <div className="card" style={{ padding: 16, marginBottom: 20, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
        <div style={{ flex: 1, minWidth: 250 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Search Orders</label>
          <input 
            type="text" 
            placeholder="Search by Order ID, Name, or Phone..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1" }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>From Date</label>
          <input 
            type="date" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1" }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>To Date</label>
          <input 
            type="date" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1" }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Quick Range</label>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn ghost sm" onClick={() => applyDatePreset(0)}>Today</button>
            <button className="btn ghost sm" onClick={() => applyDatePreset(2)}>2 Days</button>
            <button className="btn ghost sm" onClick={() => applyDatePreset(7)}>7 Days</button>
          </div>
        </div>
        <div style={{ alignSelf: "flex-end", display: "flex", gap: 8 }}>
          <button
            className="btn ghost"
            onClick={() => { setSearch(""); setStartDate(""); setEndDate(""); }}
            style={{ height: 37 }}
          >
            Clear Filters
          </button>
          <button
            className="btn"
            onClick={handleExport}
            disabled={exporting}
            title="Download the orders currently shown (matching Search/Status/Date filters) as an Excel file"
            style={{ height: 37, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <IconDownload size={16} /> {exporting ? "Exporting…" : "Export to Excel"}
          </button>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}><input type="checkbox" checked={orders.length > 0 && selectedOrders.size === orders.length} onChange={(e) => setSelectedOrders(e.target.checked ? new Set(orders.map(o => o.id)) : new Set())} /></th>
              <th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Pay</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <>
                <tr key={o.id} style={{ background: selectedOrders.has(o.id) ? "#f1f5f9" : "transparent" }}>
                  <td><input type="checkbox" checked={selectedOrders.has(o.id)} onChange={(e) => {
                    const next = new Set(selectedOrders);
                    if (e.target.checked) next.add(o.id);
                    else next.delete(o.id);
                    setSelectedOrders(next);
                  }} /></td>
                  <td><b>#{o.id.slice(-6).toUpperCase()}</b><div className="muted">{fmtDate(o.created_at)}</div></td>
                  <td>{o.address?.name || "—"}<div className="muted">{o.address?.phone}</div></td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: 220 }}>
                      {o.items?.slice(0, 2).map((it: any, i: number) => (
                        <div key={i} style={{ fontSize: 13, color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          <span style={{ fontWeight: 700, color: "#3b82f6" }}>{it.qty}x</span> {it.title}
                        </div>
                      ))}
                      {o.items?.length > 2 && <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>+{o.items.length - 2} more item{o.items.length - 2 > 1 ? 's' : ''}</div>}
                    </div>
                  </td>
                  <td><b>₹{o.amount?.toFixed(2)}</b></td>
                  <td>
                    {o.payment_method === "online" && o.razorpay_payment_id ? (
                      <span className="pill" style={{ background: "#dcfce7", color: "#15803d", fontWeight: 600 }}>PAID</span>
                    ) : o.payment_method === "online" ? (
                      <span className="pill" style={{ background: "#fee2e2", color: "#b91c1c", fontWeight: 600 }}>UNPAID</span>
                    ) : (
                      <span className="pill" style={{ background: "#f1f1f4" }}>{o.payment_method?.toUpperCase()}</span>
                    )}
                  </td>
                  <td>
                    <select value={o.status} onChange={(e) => handleStatusChange(o.id, e.target.value)}>
                      {STAGES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
                    </select>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn ghost sm" onClick={() => setOpen(open === o.id ? null : o.id)}>{open === o.id ? "Hide" : "View"}</button>
                      <button className="btn ghost sm" onClick={() => shareOrderToWhatsApp(o)} title="Share order on WhatsApp" style={{ color: "#25D366", display: "inline-flex", alignItems: "center", gap: 6 }}><IconWhatsApp size={16} /> Share</button>
                      <button className="btn ghost sm" onClick={() => window.open(`/orders/${o.id}/invoice`, '_blank')} title="Print Invoice" style={{ display: "inline-flex", alignItems: "center" }}><IconPrinter size={16} /></button>
                    </div>
                  </td>
                </tr>
                {open === o.id && (
                  <tr key={o.id + "d"}>
                    <td colSpan={8} style={{ background: "#faf9f8" }}>
                      <div style={{ padding: "6px 4px" }}>
                        <b>Delivery to:</b> {[o.address?.house, o.address?.area, o.address?.city, o.address?.state, o.address?.pincode].filter(Boolean).join(", ")}
                        {o.distance_km != null && <span className="muted"> · {o.distance_km} km</span>}
                        <table style={{ marginTop: 10 }}>
                          <tbody>
                            {o.items?.map((it: any, i: number) => (
                              <tr key={i}>
                                <td><img className="thumb" src={it.image || "https://via.placeholder.com/40"} /></td>
                                <td>{it.title}{it.color ? ` · ${it.color}` : ""}{it.size ? ` · ${it.size}` : ""}</td>
                                <td>x{it.qty}</td>
                                <td>₹{(it.price * it.qty).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="muted" style={{ marginTop: 8 }}>
                          Subtotal ₹{o.subtotal} · Discount ₹{o.discount} · Delivery ₹{o.delivery} · Tax ₹{o.tax} · <b>Total ₹{o.amount}</b>
                        </div>
                        <div style={{ marginTop: 14 }}>
                          <PaymentInfo o={o} orderId={o.id} />
                        </div>
                        {o.tracking_id && (
                          <div style={{ marginTop: 16, padding: "12px 16px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", display: "inline-block" }}>
                            <b style={{ color: "#475569", fontSize: 13, textTransform: "uppercase" }}>Tracking Info:</b> <span style={{ marginLeft: 8, fontWeight: 600 }}>{o.tracking_id}</span>
                            {o.tracking_url && <a href={o.tracking_url} target="_blank" rel="noreferrer" style={{ marginLeft: 16, color: "#3b82f6", fontWeight: 500, textDecoration: "none" }}>Track Package ↗</a>}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
            {orders.length === 0 && <tr><td colSpan={8} className="muted">No orders yet.</td></tr>}
          </tbody>
        </table>
      </div>
      
      {selectedOrders.size > 0 && (
        <div style={{
          position: "fixed", bottom: 40, left: "50%", transform: "translateX(-50%)",
          background: "#1e293b", color: "#fff", padding: "16px 24px", borderRadius: 12,
          boxShadow: "0 10px 25px rgba(0,0,0,0.2)", display: "flex", gap: 20, alignItems: "center",
          zIndex: 1000
        }}>
          <div style={{ fontWeight: 600 }}>{selectedOrders.size} order{selectedOrders.size > 1 ? 's' : ''} selected</div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#94a3b8" }}>Change Status:</span>
            <select 
              value={bulkStatus} 
              onChange={e => setBulkStatus(e.target.value)}
              style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #475569", background: "#334155", color: "#fff", outline: "none" }}
            >
              {STAGES.map(s => <option key={s} value={s}>{label(s)}</option>)}
            </select>
            <button 
              onClick={handleBulkApply} 
              disabled={bulkLoading}
              style={{ background: "#3b82f6", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 6, cursor: bulkLoading ? "not-allowed" : "pointer", fontWeight: 600 }}
            >
              {bulkLoading ? "Applying..." : "Apply"}
            </button>
          </div>
        </div>
      )}
      
      {trackingModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", width: 400, borderRadius: 12, overflow: "hidden", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}>
            <div style={{ padding: 20, borderBottom: "1px solid #e2e8f0" }}>
              <h3 style={{ margin: 0, fontSize: 18, color: "#1e293b" }}>Enter Tracking Info</h3>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>Order will be marked as shipped.</p>
            </div>
            <form onSubmit={(e: any) => {
              e.preventDefault();
              setStatus(trackingModal.id, trackingModal.status, e.target.tracking_id.value, e.target.tracking_url.value);
              setTrackingModal(null);
            }}>
              <div style={{ padding: 20 }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Tracking ID (Optional)</label>
                  <input name="tracking_id" type="text" placeholder="e.g. DLY-12345678" style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #cbd5e1" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Courier Link (Optional)</label>
                  <input name="tracking_url" type="url" placeholder="https://..." style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #cbd5e1" }} />
                </div>
              </div>
              <div style={{ padding: "16px 20px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setTrackingModal(null)} className="btn ghost">Cancel</button>
                <button type="button" onClick={() => {
                  setStatus(trackingModal.id, trackingModal.status);
                  setTrackingModal(null);
                }} className="btn ghost" style={{ color: "#64748b" }}>Skip</button>
                <button type="submit" className="btn solid" style={{ background: "#3b82f6", color: "#fff" }}>Save & Ship</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
