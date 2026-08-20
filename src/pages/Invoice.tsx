import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { API_URL } from "../config";
import { fmtDate } from "../date";

const absImg = (src?: string) => {
  if (!src) return "";
  return src.startsWith("http") ? src : `${API_URL}${src.startsWith("/") ? "" : "/"}${src}`;
};

export default function Invoice() {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/orders/${id}`)
      .then(res => {
        setOrder(res);
        setLoading(false);
        // Wait for product images to finish loading before opening the print dialog,
        // otherwise the PDF can render with blank/missing thumbnails.
        setTimeout(() => {
          let printed = false;
          const doPrint = () => { if (!printed) { printed = true; window.print(); } };
          const imgs = Array.from(document.querySelectorAll<HTMLImageElement>(".invoice-table img"));
          const pending = imgs.filter(im => !im.complete);
          if (pending.length === 0) { doPrint(); return; }
          let done = 0;
          const go = () => { if (++done >= pending.length) doPrint(); };
          pending.forEach(im => { im.addEventListener("load", go); im.addEventListener("error", go); });
          // Safety fallback in case some image never resolves.
          setTimeout(doPrint, 3000);
        }, 300);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Loading Invoice...</div>;
  if (!order) return <div style={{ padding: 40, textAlign: "center", color: "red" }}>Order not found.</div>;

  const date = fmtDate(order.created_at);

  return (
    <div className="invoice-container" style={{ padding: "40px", maxWidth: "800px", margin: "0 auto", color: "#0f172a", fontFamily: "system-ui, sans-serif" }}>
      <style>
        {`
          @media print {
            body { background: white; margin: 0; padding: 0; }
            .no-print { display: none !important; }
            .invoice-container { max-width: 100% !important; padding: 20px !important; }
            .invoice-table img { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            @page { margin: 0.5cm; }
          }
          .invoice-table { width: 100%; border-collapse: collapse; margin-top: 30px; margin-bottom: 30px; }
          .invoice-table th, .invoice-table td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
          .invoice-table th { background: #f8fafc; font-size: 13px; text-transform: uppercase; color: #64748b; font-weight: 700; }
          .invoice-table td { font-size: 14px; }
          .totals-table { width: 100%; border-collapse: collapse; }
          .totals-table td { padding: 8px; font-size: 14px; }
          .totals-table tr:last-child td { font-weight: bold; font-size: 16px; border-top: 2px solid #e2e8f0; padding-top: 12px; }
        `}
      </style>
      
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #1e293b", paddingBottom: 20, marginBottom: 30 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 32, letterSpacing: "-1px" }}>
            <span style={{ color: "#800000", fontWeight: "bold" }}>Royaall</span>{" "}
            <span style={{ color: "#D4AF37", fontStyle: "italic", fontWeight: 500 }}>Wool</span>
          </h1>
          <p style={{ margin: "5px 0 0", color: "#64748b", fontSize: 14 }}>Premium Yarn & Wool Retailer</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <h2 style={{ margin: 0, fontSize: 24, color: "#1e293b", textTransform: "uppercase" }}>Invoice</h2>
          <p style={{ margin: "5px 0 0", fontSize: 14 }}><b>Invoice #:</b> {order.id.slice(-8).toUpperCase()}</p>
          <p style={{ margin: "5px 0 0", fontSize: 14 }}><b>Date:</b> {date}</p>
        </div>
      </div>

      {/* Addresses */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 40 }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 14, color: "#64748b", textTransform: "uppercase" }}>Billed / Shipped To:</h3>
          <div style={{ fontSize: 15, lineHeight: 1.5 }}>
            <b>{order.address?.name}</b><br/>
            {order.address?.house}, {order.address?.area}<br/>
            {order.address?.city}, {order.address?.state} {order.address?.pincode}<br/>
            <b>Phone:</b> {order.address?.phone}
          </div>
        </div>
        <div style={{ flex: 1, textAlign: "right" }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 14, color: "#64748b", textTransform: "uppercase" }}>Payment Details:</h3>
          <div style={{ fontSize: 15, lineHeight: 1.5 }}>
            <b>Method:</b> {order.payment_method?.toUpperCase()}<br/>
            <b>Status:</b> {order.status === "cancelled" ? "Cancelled" : (order.payment_method === "cod" ? "Cash on Delivery" : "Paid")}<br/>
            {order.razorpay_payment_id && <><b>Txn ID:</b> {order.razorpay_payment_id}</>}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <table className="invoice-table">
        <thead>
          <tr>
            <th>Item Details</th>
            <th>Qty</th>
            <th>Rate</th>
            <th>Taxable Val</th>
            {order.gst?.interstate ? <th>IGST</th> : <th>CGST + SGST</th>}
            <th style={{ textAlign: "right" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {order.gst?.items?.map((it: any, i: number) => {
            const line = order.items?.[i] || {};
            const img = absImg(line.image);
            return (
              <tr key={i}>
                <td>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    {img && (
                      <img
                        src={img}
                        alt={it.title}
                        style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6, border: "1px solid #e2e8f0", flexShrink: 0 }}
                      />
                    )}
                    <div style={{ lineHeight: 1.4 }}>
                      <b>{it.title}</b>
                      {line.color && <div style={{ fontSize: 13, color: "#334155" }}>Shade: {line.color}</div>}
                      {line.size && <div style={{ fontSize: 13, color: "#334155" }}>Size: {line.size}</div>}
                      {line.product_id && <div style={{ fontSize: 12, color: "#94a3b8" }}>ID: {line.product_id}</div>}
                    </div>
                  </div>
                </td>
                <td>{it.qty}</td>
                <td>₹{it.rate ? it.rate.toFixed(2) : "0.00"}%</td>
                <td>₹{it.taxable?.toFixed(2)}</td>
                {order.gst?.interstate ? (
                  <td>₹{it.igst?.toFixed(2)}</td>
                ) : (
                  <td>₹{it.cgst?.toFixed(2)} + ₹{it.sgst?.toFixed(2)}</td>
                )}
                <td style={{ textAlign: "right", fontWeight: 500 }}>₹{(it.taxable + it.tax).toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ width: "350px" }}>
          <table className="totals-table">
            <tbody>
              <tr>
                <td>Subtotal:</td>
                <td style={{ textAlign: "right" }}>₹{order.subtotal?.toFixed(2)}</td>
              </tr>
              {order.discount > 0 && (
                <tr>
                  <td>Discount (Coupon + Bundle):</td>
                  <td style={{ textAlign: "right", color: "#16a34a" }}>-₹{order.discount?.toFixed(2)}</td>
                </tr>
              )}
              <tr>
                <td>Shipping & Handling:</td>
                <td style={{ textAlign: "right" }}>₹{order.delivery?.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Total GST:</td>
                <td style={{ textAlign: "right" }}>₹{order.tax?.toFixed(2)}</td>
              </tr>
              <tr>
                <td><b>Grand Total:</b></td>
                <td style={{ textAlign: "right" }}><b>₹{order.amount?.toFixed(2)}</b></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer / Signature */}
      <div style={{ marginTop: 80, borderTop: "1px solid #e2e8f0", paddingTop: 20, textAlign: "center", fontSize: 12, color: "#64748b" }}>
        <p>This is a computer generated invoice and does not require a signature.</p>
        <p>Thank you for shopping with Royaall Wool!</p>
      </div>

      {/* Action Button (Hidden on Print) */}
      <div className="no-print" style={{ marginTop: 40, textAlign: "center" }}>
        <button 
          onClick={() => window.print()}
          style={{ background: "#1e293b", color: "#fff", border: "none", padding: "10px 24px", borderRadius: 6, fontSize: 16, cursor: "pointer", fontWeight: 600 }}
        >
          🖨️ Print Document
        </button>
      </div>
    </div>
  );
}
