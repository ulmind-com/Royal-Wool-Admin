import { useEffect, useState } from "react";
import { api } from "../api";
import { fmtDateTime } from "../date";

export default function Waitlist() {
  const [items, setItems] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const load = () => {
    api.get<any[]>("/waitlist/admin/summary").then(setItems).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const resolve = async (productId: string, title: string) => {
    if (!confirm(`Mark "${title}" as restocked and clear the waitlist?`)) return;
    setBusy(true);
    try {
      await api.post(`/waitlist/admin/${productId}/resolve`, {});
      load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
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
        .waitlist-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          margin-top: 16px;
        }
        .waitlist-table th {
          text-align: left;
          padding: 14px 20px;
          background: #f8fafc;
          color: #64748b;
          font-weight: 700;
          font-size: 12px;
          border-bottom: 1px solid #e2e8f0;
          border-top: 1px solid #e2e8f0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .waitlist-table th:first-child { border-top-left-radius: 8px; border-left: 1px solid #e2e8f0; }
        .waitlist-table th:last-child { border-top-right-radius: 8px; border-right: 1px solid #e2e8f0; }
        
        .waitlist-table td {
          padding: 16px 20px;
          border-bottom: 1px solid #f1f5f9;
          color: #1e293b;
          font-size: 15px;
          font-weight: 600;
        }
        .waitlist-table tr:hover td {
          background: #f8fafc;
        }
      `}</style>

      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Restock Waitlist</h1>
          <p className="dashboard-subtitle">See which out-of-stock yarns your customers are waiting for the most.</p>
        </div>
      </div>

      <div className="fatafati-card">
        {items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", background: "#f8fafc", borderRadius: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#ecfdf5", color: "#10b981", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <h3 style={{ margin: "0 0 8px 0", color: "#0f172a", fontSize: 20 }}>No Pending Requests</h3>
            <p style={{ margin: 0, color: "#64748b" }}>You've caught up! No customers are currently waiting for out-of-stock items.</p>
          </div>
        ) : (
          <table className="waitlist-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Customers Waiting</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const p = row.product;
                const image = p.images?.[0];
                const isOpen = open === p.id;
                return (
                  <>
                  <tr key={p.id}>
                    <td>
                      <div className="flex" style={{ alignItems: "center", gap: 16 }}>
                        {image ? (
                          <img src={image} style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 12, border: "1px solid #e2e8f0" }} />
                        ) : (
                          <FallbackImage size={48} />
                        )}
                        <div>
                          <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 16 }}>{p.title}</div>
                          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                            Current Stock: <span style={{ color: p.total_stock > 0 ? "#10b981" : "#ef4444", fontWeight: 600 }}>{p.total_stock}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <button
                        onClick={() => setOpen(isOpen ? null : p.id)}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 6,
                          background: "#fff7ed", color: "#ea580c", padding: "6px 12px",
                          borderRadius: 20, fontSize: 14, fontWeight: 700,
                          border: "none", cursor: "pointer",
                        }}
                        title="Click to see who's waiting"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        {row.count} waiting
                      </button>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button className="btn ghost sm" style={{ marginRight: 8 }} onClick={() => setOpen(isOpen ? null : p.id)}>
                        {isOpen ? "Hide" : "View"}
                      </button>
                      <button
                        className="btn ghost"
                        style={{ color: "#3b82f6", background: "#eff6ff" }}
                        onClick={() => resolve(p.id, p.title)}
                        disabled={busy}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6, verticalAlign: "text-bottom" }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        Mark as Restocked
                      </button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr key={p.id + "-detail"}>
                      <td colSpan={3} style={{ background: "#faf9f8" }}>
                        <div style={{ padding: "6px 4px 14px" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                              <tr>
                                <th style={{ textAlign: "left", padding: "6px 10px", fontSize: 12, color: "#64748b", textTransform: "uppercase" }}>Customer</th>
                                <th style={{ textAlign: "left", padding: "6px 10px", fontSize: 12, color: "#64748b", textTransform: "uppercase" }}>Phone</th>
                                <th style={{ textAlign: "left", padding: "6px 10px", fontSize: 12, color: "#64748b", textTransform: "uppercase" }}>Email</th>
                                <th style={{ textAlign: "left", padding: "6px 10px", fontSize: 12, color: "#64748b", textTransform: "uppercase" }}>Shade Waiting For</th>
                                <th style={{ textAlign: "left", padding: "6px 10px", fontSize: 12, color: "#64748b", textTransform: "uppercase" }}>Waiting Since</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(row.waiting || []).map((w: any, i: number) => (
                                <tr key={i}>
                                  <td style={{ padding: "8px 10px", fontWeight: 600, fontSize: 14 }}>{w.name}</td>
                                  <td style={{ padding: "8px 10px", fontSize: 14 }}>{w.phone || "—"}</td>
                                  <td style={{ padding: "8px 10px", fontSize: 14 }}>{w.email || "—"}</td>
                                  <td style={{ padding: "8px 10px", fontSize: 14 }}>{w.color_name || "Any shade"}</td>
                                  <td style={{ padding: "8px 10px", fontSize: 14, color: "#64748b" }}>{fmtDateTime(w.waiting_since)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
