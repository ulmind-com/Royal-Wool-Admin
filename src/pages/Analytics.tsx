import { useEffect, useState } from "react";
import { api } from "../api";

export default function Analytics() {
  const [data, setData] = useState<any>(null);
  
  useEffect(() => {
    api.get("/analytics/dashboard").then(setData).catch(() => {});
  }, []);

  if (!data) return (
    <div style={{ padding: 60, textAlign: "center", color: "#64748b" }}>
      Gathering insights...
    </div>
  );

  const maxTrend = Math.max(...(data.sales_trend?.length ? data.sales_trend.map((s: any) => s.revenue) : [100]), 100);
  const maxCategory = Math.max(...(data.category_revenue?.length ? data.category_revenue.map((c: any) => c.revenue) : [100]), 100);

  const formatCurrency = (val: number) => "₹" + val.toLocaleString('en-IN', { maximumFractionDigits: 0 });

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
        
        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        
        /* Bar chart styling */
        .chart-container {
          display: flex;
          align-items: flex-end;
          gap: 12px;
          height: 200px;
          padding-top: 20px;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 12px;
          overflow-x: auto;
        }
        .bar-wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          min-width: 40px;
        }
        .bar-fill {
          width: 100%;
          background: linear-gradient(to top, #3b82f6, #60a5fa);
          border-radius: 6px 6px 0 0;
          transition: height 1s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }
        .bar-fill:hover {
          background: linear-gradient(to top, #2563eb, #3b82f6);
        }
        .bar-tooltip {
          position: absolute;
          top: -35px;
          left: 50%;
          transform: translateX(-50%);
          background: #1e293b;
          color: #fff;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          opacity: 0;
          transition: opacity 0.2s;
          pointer-events: none;
          white-space: nowrap;
        }
        .bar-fill:hover .bar-tooltip {
          opacity: 1;
        }
        .bar-label {
          font-size: 11px;
          color: #64748b;
          margin-top: 8px;
          font-weight: 600;
          text-transform: uppercase;
        }

        /* Horizontal bar chart */
        .hz-bar-wrapper {
          display: flex;
          align-items: center;
          margin-bottom: 16px;
        }
        .hz-label {
          width: 120px;
          font-size: 13px;
          font-weight: 600;
          color: #334155;
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
        }
        .hz-track {
          flex: 1;
          height: 16px;
          background: #f1f5f9;
          border-radius: 8px;
          margin: 0 16px;
          overflow: hidden;
        }
        .hz-fill {
          height: 100%;
          background: linear-gradient(to right, #8b5cf6, #a78bfa);
          border-radius: 8px;
          transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .hz-value {
          width: 80px;
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
          text-align: right;
        }
      `}</style>

      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Detailed Analytics</h1>
          <p className="dashboard-subtitle">Deep insights into your store's performance and inventory movement.</p>
        </div>
      </div>

      <div className="fatafati-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h3 style={{ margin: "0 0 4px 0", color: "#0f172a", fontSize: 18 }}>Monthly Revenue Trend</h3>
            <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>Total Revenue: <span style={{ fontWeight: 700, color: "#0f172a" }}>{formatCurrency(data.total_revenue)}</span></p>
          </div>
        </div>
        
        {data.sales_trend?.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>No sales data available yet.</div>
        ) : (
          <div className="chart-container">
            {data.sales_trend.map((s: any) => (
              <div className="bar-wrapper" key={s.month}>
                <div 
                  className="bar-fill" 
                  style={{ height: `${Math.max((s.revenue / maxTrend) * 100, 2)}%` }}
                >
                  <div className="bar-tooltip">{formatCurrency(s.revenue)}</div>
                </div>
                <div className="bar-label">{s.month.split("-")[1]}/{s.month.split("-")[0].slice(2)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid-2">
        <div className="fatafati-card">
          <h3 style={{ margin: "0 0 24px 0", color: "#0f172a", fontSize: 18 }}>Top Selling Yarns</h3>
          {data.top_products?.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>No products sold yet.</div>
          ) : (
            <div>
              {data.top_products.map((p: any, idx: number) => (
                <div key={p.product_id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#cbd5e1", width: 20 }}>{idx + 1}</div>
                  {p.image ? (
                    <img src={p.image} style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: "#f1f5f9" }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: "#1e293b", fontSize: 15 }}>{p.title}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 800, color: "#3b82f6", fontSize: 16 }}>{p.qty}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>units sold</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="fatafati-card">
          <h3 style={{ margin: "0 0 24px 0", color: "#0f172a", fontSize: 18 }}>Revenue by Category</h3>
          {data.category_revenue?.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>No category data yet.</div>
          ) : (
            <div>
              {data.category_revenue.map((c: any) => (
                <div className="hz-bar-wrapper" key={c.category_id}>
                  <div className="hz-label" title={c.name}>{c.name}</div>
                  <div className="hz-track">
                    <div className="hz-fill" style={{ width: `${Math.max((c.revenue / maxCategory) * 100, 2)}%` }} />
                  </div>
                  <div className="hz-value">{formatCurrency(c.revenue)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
