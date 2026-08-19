import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

export default function Dashboard() {
  const [stats, setStats] = useState({ products: 0, categories: 0, orders: 0, revenue: 0, customers: 0 });
  const [lowStock, setLowStock] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [prods, cats, orders, low, users] = await Promise.all([
          api.get("/products?limit=100&admin=true"),
          api.get("/categories"),
          api.get("/orders/admin/all"),
          api.get("/products/admin/low-stock"),
          api.get("/users/admin/count"),
        ]);
        const revenue = orders
          .filter((o: any) => o.status !== "cancelled")
          .reduce((s: number, o: any) => s + (o.amount || 0), 0);
        setStats({ products: prods.length, categories: cats.length, orders: orders.length, revenue, customers: users.count });
        setLowStock(low);
      } catch {}
    })();
  }, []);

  return (
    <>
      <style>{`
        .fatafati-card {
          background: #fff;
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
          border: 1px solid rgba(0,0,0,0.04);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
          cursor: default;
        }
        .fatafati-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 30px rgba(0,0,0,0.08);
        }
        .icon-wrapper {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }
        .stat-label {
          font-size: 14px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 6px;
        }
        .stat-value {
          font-size: 36px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -1px;
          line-height: 1.1;
        }
        .low-stock-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          margin-top: 8px;
        }
        .low-stock-table th {
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
        .low-stock-table th:first-child { border-top-left-radius: 8px; border-left: 1px solid #e2e8f0; }
        .low-stock-table th:last-child { border-top-right-radius: 8px; border-right: 1px solid #e2e8f0; }
        
        .low-stock-table td {
          padding: 16px 20px;
          border-bottom: 1px solid #f1f5f9;
          color: #1e293b;
          font-size: 15px;
          font-weight: 600;
        }
        .low-stock-table tr:hover td {
          background: #f8fafc;
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
        .bg-pattern {
          position: absolute;
          top: -20px;
          right: -20px;
          opacity: 0.05;
          transform: scale(2);
          pointer-events: none;
        }
      `}</style>

      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Welcome back! 👋</h1>
          <p className="dashboard-subtitle">Here is what's happening in your Royaall Wool store today.</p>
        </div>
      </div>

      <div className="grid5">
        {/* Products Card */}
        <div className="fatafati-card">
          <svg className="bg-pattern" width="100" height="100" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
          <div className="icon-wrapper" style={{ background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)", color: "#3b82f6" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
          </div>
          <div className="stat-label">Total Products</div>
          <div className="stat-value">{stats.products}</div>
        </div>

        {/* Categories Card */}
        <div className="fatafati-card">
          <svg className="bg-pattern" width="100" height="100" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          <div className="icon-wrapper" style={{ background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)", color: "#8b5cf6" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          </div>
          <div className="stat-label">Categories</div>
          <div className="stat-value">{stats.categories}</div>
        </div>

        {/* Orders Card */}
        <div className="fatafati-card">
          <svg className="bg-pattern" width="100" height="100" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
          <div className="icon-wrapper" style={{ background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)", color: "#10b981" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
          </div>
          <div className="stat-label">Total Orders</div>
          <div className="stat-value">{stats.orders}</div>
        </div>

        {/* Revenue Card */}
        <div className="fatafati-card">
          <svg className="bg-pattern" width="100" height="100" viewBox="0 0 24 24" fill="currentColor" stroke="none"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          <div className="icon-wrapper" style={{ background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)", color: "#f97316" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          </div>
          <div className="stat-label">Revenue</div>
          <div className="stat-value">₹{stats.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
        </div>

        {/* Customers Card */}
        <Link to="/users" className="fatafati-card" style={{ textDecoration: "none" }}>
          <svg className="bg-pattern" width="100" height="100" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          <div className="icon-wrapper" style={{ background: "linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)", color: "#ec4899" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          </div>
          <div className="stat-label">Customers Signed Up</div>
          <div className="stat-value">{stats.customers}</div>
        </Link>
      </div>

      <div className="fatafati-card" style={{ marginTop: 24, padding: "28px" }}>
        <div className="between" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "#fef2f2", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 20, color: "#0f172a" }}>Low Stock Alerts</h3>
              <p style={{ margin: "2px 0 0 0", fontSize: 14, color: "#64748b" }}>Products that need your attention</p>
            </div>
          </div>
          <Link to="/products" className="btn ghost">Manage Inventory →</Link>
        </div>
        
        {lowStock.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", background: "#f8fafc", borderRadius: 12, marginTop: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#ecfdf5", color: "#10b981", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <h4 style={{ margin: "0 0 4px 0", color: "#0f172a", fontSize: 16 }}>All Clear!</h4>
            <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>All products are well stocked and ready to sell.</p>
          </div>
        ) : (
          <table className="low-stock-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th style={{ width: 120, textAlign: "right" }}>Remaining Stock</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 8, border: "1px solid #e2e8f0" }} />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: "#f1f5f9", border: "1px solid #e2e8f0" }} />
                      )}
                      <div>
                        <div style={{ fontWeight: 600, color: "#0f172a" }}>{p.title}</div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>₹{p.price}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <span style={{ 
                      display: "inline-flex", alignItems: "center", gap: 6,
                      background: "#fef2f2", color: "#dc2626", padding: "6px 12px", 
                      borderRadius: 20, fontSize: 13, fontWeight: 700 
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#dc2626" }} />
                      {p.total_stock} left
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

