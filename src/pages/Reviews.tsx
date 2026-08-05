import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

type Review = {
  id: string;
  product_id: string;
  product_title: string;
  user_name: string;
  rating: number;
  title?: string;
  text?: string;
  photos?: string[];
  tags?: string[];
  helpful_count?: number;
  unhelpful_count?: number;
  created_at: string;
  admin_reply?: string;
  admin_reply_at?: string;
  is_hidden?: boolean;
};

function Star({ filled }: { filled: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" style={{ display: "inline-block" }}
      fill={filled ? "#F5A623" : "none"} stroke="#F5A623" strokeWidth="1.6"
      strokeLinejoin="round">
      <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 18.9 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z" />
    </svg>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <span style={{ whiteSpace: "nowrap", display: "inline-flex", gap: 1 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} filled={value >= n} />
      ))}
    </span>
  );
}

// Minimal inline icons (no emojis)
const ThumbUp = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3BB54A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3zm0 0l4-8a2 2 0 0 1 2 2v4h5a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 16.8 20H7" />
  </svg>
);
const ThumbDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E23744" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 13V4h3a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-3zm0 0l-4 8a2 2 0 0 1-2-2v-4H6a2 2 0 0 1-2-2.3l1.2-6A2 2 0 0 1 7.2 4H17" />
  </svg>
);

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<string>("");
  const [minStars, setMinStars] = useState<number>(0);
  const [replyModal, setReplyModal] = useState<{ id: string, text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get<Review[]>("/reviews/admin/all")
      .then(setReviews)
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, []);

  const saveReply = async () => {
    if (!replyModal || !replyModal.text.trim()) return;
    setBusy(true);
    try {
      const res = await api.patch(`/reviews/admin/${replyModal.id}/reply`, { text: replyModal.text });
      setReviews(prev => prev.map(r => r.id === replyModal.id ? { ...r, admin_reply: res.admin_reply, admin_reply_at: res.admin_reply_at } : r));
      setReplyModal(null);
    } catch (e) {
      alert("Failed to save reply");
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (r: Review) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await api.patch(`/reviews/admin/${r.id}/status`, { is_hidden: !r.is_hidden });
      setReviews(prev => prev.map(x => x.id === r.id ? { ...x, is_hidden: res.is_hidden } : x));
    } catch (e) {
      alert("Failed to update status");
    } finally {
      setBusy(false);
    }
  };

  const products = useMemo(() => {
    const map = new Map<string, string>();
    reviews.forEach((r) => map.set(r.product_id, r.product_title));
    return [...map.entries()];
  }, [reviews]);

  const filtered = reviews.filter(
    (r) => (!product || r.product_id === product) && (!minStars || r.rating >= minStars)
  );

  const avg = filtered.length
    ? (filtered.reduce((s, r) => s + r.rating, 0) / filtered.length).toFixed(1)
    : "0.0";

  return (
    <>
      <h1>Customer Reviews</h1>

      <div className="card" style={{ display: "flex", gap: 28, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div className="muted">Total reviews</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{reviews.length}</div>
        </div>
        <div>
          <div className="muted">Average rating</div>
          <div style={{ fontSize: 26, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            {avg} <Stars value={parseFloat(avg)} />
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
          <select value={product} onChange={(e) => setProduct(e.target.value)}>
            <option value="">All products</option>
            {products.map(([id, title]) => (
              <option key={id} value={id}>{title}</option>
            ))}
          </select>
          <select value={minStars} onChange={(e) => setMinStars(Number(e.target.value))}>
            <option value={0}>All ratings</option>
            {[5, 4, 3, 2, 1].map((s) => (
              <option key={s} value={s}>{s} stars & up</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Product</th>
              <th>Customer</th>
              <th>Rating</th>
              <th>Review</th>
              <th>Photos</th>
              <th>Helpful</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} style={{ opacity: r.is_hidden ? 0.6 : 1, transition: "opacity 0.2s" }}>
                <td>
                  <button 
                    onClick={() => toggleStatus(r)}
                    disabled={busy}
                    style={{
                      background: r.is_hidden ? "#fef2f2" : "#f0fdf4",
                      color: r.is_hidden ? "#991b1b" : "#166534",
                      border: `1px solid ${r.is_hidden ? "#fecaca" : "#bbf7d0"}`,
                      padding: "4px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.2s"
                    }}
                  >
                    {r.is_hidden ? "Hidden" : "Published"}
                  </button>
                </td>
                <td style={{ maxWidth: 160 }}>{r.product_title}</td>
                <td>{r.user_name}</td>
                <td><Stars value={r.rating} /></td>
                <td style={{ maxWidth: 320 }}>
                  {r.title && <div style={{ fontWeight: 600 }}>{r.title}</div>}
                  {r.text && <div className="muted" style={{ fontSize: 13 }}>{r.text}</div>}
                  {!!r.tags?.length && (
                    <div style={{ marginTop: 4, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {r.tags.map((t) => (
                        <span key={t} className="pill" style={{ background: "#FFF3EB", color: "#F26A21" }}>{t}</span>
                      ))}
                    </div>
                  )}
                  {r.admin_reply ? (
                    <div style={{ marginTop: 12, padding: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <b style={{ color: "#166534", fontSize: 13 }}>Seller Response</b>
                        <button className="btn ghost sm" style={{ padding: "0 4px", height: 24, fontSize: 12 }} onClick={() => setReplyModal({ id: r.id, text: r.admin_reply || "" })}>Edit</button>
                      </div>
                      <div style={{ fontSize: 13, color: "#15803d", whiteSpace: "pre-wrap" }}>{r.admin_reply}</div>
                    </div>
                  ) : (
                    <div style={{ marginTop: 8 }}>
                      <button className="btn ghost sm" style={{ padding: "0 8px", height: 28, fontSize: 13, background: "#f8fafc", border: "1px solid #e2e8f0" }} onClick={() => setReplyModal({ id: r.id, text: "" })}>
                        💬 Reply to Customer
                      </button>
                    </div>
                  )}
                </td>
                <td>
                  <div style={{ display: "flex", gap: 6 }}>
                    {(r.photos || []).slice(0, 3).map((p, i) => (
                      <a key={i} href={p} target="_blank" rel="noreferrer">
                        <img className="thumb" src={p} style={{ width: 40, height: 40, objectFit: "cover" }} />
                      </a>
                    ))}
                    {!r.photos?.length && <span className="muted">—</span>}
                  </div>
                </td>
                <td>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginRight: 10 }}>
                    <ThumbUp /> {r.helpful_count || 0}
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <ThumbDown /> {r.unhelpful_count || 0}
                  </span>
                </td>
                <td className="muted">{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={8} className="muted">No reviews yet.</td></tr>
            )}
            {loading && (
              <tr><td colSpan={8} className="muted">Loading…</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {replyModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div className="card" style={{ width: 400, padding: 24 }}>
            <h3>Reply to {reviews.find(r => r.id === replyModal.id)?.user_name}</h3>
            <p className="muted" style={{ marginBottom: 16 }}>This response will be visible publicly on the product page.</p>
            <textarea
              value={replyModal.text}
              onChange={e => setReplyModal({ ...replyModal, text: e.target.value })}
              placeholder="e.g. Hi, thanks for your feedback..."
              style={{ width: "100%", height: 120, resize: "none", marginBottom: 16 }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="btn ghost" disabled={busy} onClick={() => setReplyModal(null)}>Cancel</button>
              <button className="btn primary" disabled={busy || !replyModal.text.trim()} onClick={saveReply}>
                {busy ? "Saving..." : "Save Reply"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
