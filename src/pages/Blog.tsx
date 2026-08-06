import { useEffect, useMemo, useRef, useState } from "react";
import { api, uploadImage } from "../api";

type BlockType = "p" | "h2" | "quote" | "link";
interface Block { type: BlockType; text: string; url: string }

interface Post {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  image: string;
  author: string;
  tag: string;
  published_at: string;
  body: Block[];
  link: string;
  link_label: string;
  featured: boolean;
  published: boolean;
  order: number;
}

const BLOCK_LABELS: Record<BlockType, string> = {
  p: "Paragraph",
  h2: "Heading",
  quote: "Quote",
  link: "Link",
};

const TAGS = ["Journal", "Featured", "Guides", "Behind the scenes", "Care", "Patterns", "Dye house"];

const today = () => new Date().toISOString().slice(0, 10);

const empty = (): Post => ({
  title: "", slug: "", excerpt: "", image: "", author: "Royal Wool", tag: "Journal",
  published_at: today(), body: [{ type: "p", text: "", url: "" }],
  link: "", link_label: "", featured: false, published: true, order: 0,
});

const slugify = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const words = (p: Post) => [p.excerpt, ...p.body.map((b) => b.text)].join(" ").trim().split(/\s+/).filter(Boolean).length;
const prettyDate = (v: string) => {
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

export default function Blog() {
  const [items, setItems] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "published" | "draft" | "featured">("all");
  const [editing, setEditing] = useState<Post | null>(null);

  const load = () =>
    api
      .get("/blog/posts?admin=true&limit=50")
      .then((r: any) => setItems(r?.items ?? r ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((p) => {
      if (filter === "published" && !p.published) return false;
      if (filter === "draft" && p.published) return false;
      if (filter === "featured" && !p.featured) return false;
      if (!needle) return true;
      return `${p.title} ${p.tag} ${p.author} ${p.excerpt}`.toLowerCase().includes(needle);
    });
  }, [items, q, filter]);

  const patch = async (p: Post, body: Partial<Post>) => {
    await api.patch(`/blog/posts/${p.id}`, body);
    load();
  };

  const del = async (p: Post) => {
    if (!confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    await api.del(`/blog/posts/${p.id}`);
    load();
  };

  if (editing) {
    return (
      <Editor
        post={editing}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); load(); }}
      />
    );
  }

  const counts = {
    all: items.length,
    published: items.filter((p) => p.published).length,
    draft: items.filter((p) => !p.published).length,
    featured: items.filter((p) => p.featured).length,
  };

  return (
    <>
      <div className="between blog-head">
        <div>
          <h1 style={{ margin: 0 }}>Journal</h1>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            Stories published here appear on the website's <b>/blog</b> page instantly.
          </p>
        </div>
        <button className="btn" onClick={() => setEditing(empty())}>+ New story</button>
      </div>

      <div className="blog-toolbar">
        <div className="blog-tabs">
          {(["all", "published", "draft", "featured"] as const).map((k) => (
            <button
              key={k}
              className={`blog-tab${filter === k ? " on" : ""}`}
              onClick={() => setFilter(k)}
            >
              {k === "all" ? "All stories" : k[0].toUpperCase() + k.slice(1)}
              <span>{counts[k]}</span>
            </button>
          ))}
        </div>
        <input
          className="blog-search"
          placeholder="Search by title, tag or author…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="muted">Loading stories…</p>
      ) : shown.length === 0 ? (
        <div className="card blog-empty">
          <div className="blog-empty-mark">✎</div>
          <h3 style={{ margin: "12px 0 4px" }}>{items.length ? "No stories match that" : "No stories yet"}</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            {items.length
              ? "Try a different search or filter."
              : "The website is showing sample stories until you publish your first one."}
          </p>
          {!items.length && <button className="btn" onClick={() => setEditing(empty())}>Write the first story</button>}
        </div>
      ) : (
        <div className="blog-grid">
          {shown.map((p) => (
            <article className="blog-card" key={p.id}>
              <div className="blog-cover" onClick={() => setEditing(p)}>
                {p.image ? <img src={p.image} alt="" /> : <span className="muted">No cover</span>}
                <div className="blog-badges">
                  {p.featured && <span className="blog-badge gold">★ Featured</span>}
                  <span className={`blog-badge${p.published ? " live" : ""}`}>
                    {p.published ? "Live" : "Draft"}
                  </span>
                </div>
              </div>
              <div className="blog-card-body">
                <div className="blog-meta">{p.tag} · {prettyDate(p.published_at)}</div>
                <h3 onClick={() => setEditing(p)}>{p.title || "(untitled)"}</h3>
                <p className="blog-excerpt">{p.excerpt || "No summary yet."}</p>
                <div className="blog-meta">
                  {p.author} · {words(p)} words · /blog/{p.slug}
                </div>
                <div className="blog-actions">
                  <button className="btn ghost sm" onClick={() => setEditing(p)}>Edit</button>
                  <button className="btn ghost sm" onClick={() => patch(p, { published: !p.published })}>
                    {p.published ? "Unpublish" : "Publish"}
                  </button>
                  <button className="btn ghost sm" onClick={() => patch(p, { featured: !p.featured })}>
                    {p.featured ? "Unfeature" : "Feature"}
                  </button>
                  <button className="btn danger sm" onClick={() => del(p)}>Delete</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

/* ---------------------------------------------------------------- editor */

function Editor({ post, onClose, onSaved }: { post: Post; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Post>({ ...post, body: post.body?.length ? post.body.map((b) => ({ type: b.type ?? "p", text: b.text ?? "", url: (b as any).url ?? "" })) : [{ type: "p", text: "", url: "" }] });
  const [slugTouched, setSlugTouched] = useState(Boolean(post.slug));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const file = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Post>(k: K, v: Post[K]) => setF((p) => ({ ...p, [k]: v }));

  const setTitle = (v: string) =>
    setF((p) => ({ ...p, title: v, slug: slugTouched ? p.slug : slugify(v) }));

  const upload = async (files: FileList | null) => {
    if (!files?.[0]) return;
    setUploading(true);
    try { set("image", await uploadImage(files[0])); setErr(""); }
    catch (e: any) { setErr(e.message); }
    finally { setUploading(false); }
  };

  const blocks = f.body;
  const setBlock = (i: number, patch: Partial<Block>) =>
    setF((p) => ({ ...p, body: p.body.map((b, j) => (i === j ? { ...b, ...patch } : b)) }));
  const addBlock = (type: BlockType) =>
    setF((p) => ({ ...p, body: [...p.body, { type, text: "", url: "" }] }));
  const removeBlock = (i: number) =>
    setF((p) => ({ ...p, body: p.body.filter((_, j) => j !== i) }));
  const move = (i: number, dir: -1 | 1) =>
    setF((p) => {
      const next = [...p.body];
      const j = i + dir;
      if (j < 0 || j >= next.length) return p;
      [next[i], next[j]] = [next[j], next[i]];
      return { ...p, body: next };
    });

  const save = async (publish?: boolean) => {
    setErr("");
    if (!f.title.trim()) { setErr("A title is required."); return; }
    const body = {
      ...f,
      slug: slugify(f.slug || f.title),
      published: publish ?? f.published,
      order: Number(f.order) || 0,
      body: f.body.filter((b) => b.text.trim() || b.url.trim()),
    };
    delete (body as any).id;
    setSaving(true);
    try {
      if (f.id) await api.patch(`/blog/posts/${f.id}`, body);
      else await api.post("/blog/posts", body);
      onSaved();
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <>
      <div className="blog-bar">
        <div className="flex">
          <button className="btn ghost sm" onClick={onClose}>← Back</button>
          <div>
            <b>{f.id ? "Edit story" : "New story"}</b>
            <div className="muted" style={{ fontSize: 12 }}>
              {words(f)} words · ~{Math.max(1, Math.round(words(f) / 200))} min read
              {f.slug ? ` · /blog/${f.slug}` : ""}
            </div>
          </div>
        </div>
        <div className="flex">
          <span className={`blog-badge${f.published ? " live" : ""}`}>{f.published ? "Live" : "Draft"}</span>
          <button className="btn ghost sm" disabled={saving} onClick={() => save(false)}>Save as draft</button>
          <button className="btn" disabled={saving} onClick={() => save(true)}>
            {saving ? "Saving…" : f.published ? "Save & publish" : "Publish now"}
          </button>
        </div>
      </div>

      {err && <div className="err" style={{ marginBottom: 14 }}>{err}</div>}

      <div className="blog-editor">
        <div>
          <div className="card">
            <label>Cover photo</label>
            <p className="muted" style={{ marginTop: 0 }}>Recommended <b>1200 × 800 px</b> (3:2). Shown on the journal grid and at the top of the story.</p>
            {f.image ? (
              <div className="blog-cover-edit">
                <img src={f.image} alt="" />
                <div className="flex">
                  <button className="btn ghost sm" onClick={() => file.current?.click()}>Replace</button>
                  <button className="btn danger sm" onClick={() => set("image", "")}>Remove</button>
                </div>
              </div>
            ) : (
              <button className="addimg blog-drop" onClick={() => file.current?.click()} disabled={uploading}>
                {uploading ? "Uploading…" : "+ Upload cover photo"}
              </button>
            )}
            <input ref={file} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files)} />
          </div>

          <div className="card">
            <label>Heading</label>
            <input className="blog-title-input" value={f.title} onChange={(e) => setTitle(e.target.value)} placeholder="How to read a yarn label" />
            <div style={{ marginTop: 14 }}>
              <label>Summary (shown on the journal card)</label>
              <textarea rows={3} value={f.excerpt} onChange={(e) => set("excerpt", e.target.value)} placeholder="One or two lines that make someone want to read it." />
            </div>
          </div>

          <div className="card">
            <div className="between">
              <div>
                <label style={{ margin: 0 }}>Story</label>
                <p className="muted" style={{ margin: "4px 0 0" }}>Write in blocks — each one renders in the site's editorial style.</p>
              </div>
            </div>

            <div className="blog-blocks">
              {blocks.map((b, i) => (
                <div className={`blog-block ${b.type}`} key={i}>
                  <div className="blog-block-bar">
                    <div className="blog-types">
                      {(Object.keys(BLOCK_LABELS) as BlockType[]).map((t) => (
                        <button
                          key={t}
                          className={`blog-type${b.type === t ? " on" : ""}`}
                          onClick={() => setBlock(i, { type: t })}
                        >
                          {BLOCK_LABELS[t]}
                        </button>
                      ))}
                    </div>
                    <div className="flex">
                      <button className="blog-icon" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
                      <button className="blog-icon" onClick={() => move(i, 1)} disabled={i === blocks.length - 1}>↓</button>
                      <button className="blog-icon danger" onClick={() => removeBlock(i)}>✕</button>
                    </div>
                  </div>
                  <textarea
                    rows={b.type === "p" ? 4 : 2}
                    value={b.text}
                    onChange={(e) => setBlock(i, { text: e.target.value })}
                    placeholder={
                      b.type === "h2" ? "Section heading"
                        : b.type === "quote" ? "A line worth pulling out"
                        : b.type === "link" ? "Button text — e.g. Shop this yarn"
                        : "Write the paragraph…"
                    }
                  />
                  {b.type === "link" && (
                    <input
                      style={{ marginTop: 8 }}
                      value={b.url}
                      onChange={(e) => setBlock(i, { url: e.target.value })}
                      placeholder="https://royalwool.in/products/…"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="blog-add">
              {(Object.keys(BLOCK_LABELS) as BlockType[]).map((t) => (
                <button key={t} className="btn ghost sm" onClick={() => addBlock(t)}>+ {BLOCK_LABELS[t]}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="blog-side">
          <div className="card">
            <label>Publish date</label>
            <input type="date" value={(f.published_at || "").slice(0, 10)} onChange={(e) => set("published_at", e.target.value)} />
            <div style={{ marginTop: 14 }}>
              <label>Author</label>
              <input value={f.author} onChange={(e) => set("author", e.target.value)} />
            </div>
            <div style={{ marginTop: 14 }}>
              <label>Tag</label>
              <input list="blog-tags" value={f.tag} onChange={(e) => set("tag", e.target.value)} />
              <datalist id="blog-tags">{TAGS.map((t) => <option key={t} value={t} />)}</datalist>
            </div>
            <div style={{ marginTop: 14 }}>
              <label>URL slug</label>
              <input
                value={f.slug}
                onChange={(e) => { setSlugTouched(true); set("slug", e.target.value); }}
                onBlur={(e) => set("slug", slugify(e.target.value))}
                placeholder="auto from heading"
              />
              <p className="muted" style={{ margin: "6px 0 0", fontSize: 12 }}>royalwool.in/blog/{f.slug || "…"}</p>
            </div>
          </div>

          <div className="card">
            <label>Visibility</label>
            <div className="blog-toggles">
              <button className={`blog-toggle${f.published ? " on" : ""}`} onClick={() => set("published", !f.published)}>
                <b>Published</b><span>{f.published ? "Visible on the website" : "Hidden — only you can see it"}</span>
              </button>
              <button className={`blog-toggle${f.featured ? " on" : ""}`} onClick={() => set("featured", !f.featured)}>
                <b>Featured</b><span>{f.featured ? "Pinned to the big journal banner" : "Shows in the normal grid"}</span>
              </button>
            </div>
            <div style={{ marginTop: 14 }}>
              <label>Order (lower shows first)</label>
              <input type="number" value={f.order} onChange={(e) => set("order", Number(e.target.value) as any)} />
            </div>
          </div>

          <div className="card">
            <label>Call-to-action link (optional)</label>
            <p className="muted" style={{ marginTop: 0, fontSize: 12 }}>Shown as a button at the end of the story.</p>
            <input value={f.link} onChange={(e) => set("link", e.target.value)} placeholder="https://royalwool.in/products/merino" />
            <div style={{ marginTop: 12 }}>
              <label>Button text</label>
              <input value={f.link_label} onChange={(e) => set("link_label", e.target.value)} placeholder="Shop this yarn" />
            </div>
          </div>

          <div className="card blog-preview">
            <label>Card preview</label>
            <div className="blog-preview-img">{f.image ? <img src={f.image} alt="" /> : <span className="muted">No cover</span>}</div>
            <div className="blog-meta" style={{ marginTop: 10 }}>{f.tag} · {prettyDate(f.published_at)}</div>
            <b style={{ display: "block", marginTop: 4 }}>{f.title || "Your heading appears here"}</b>
            <p className="blog-excerpt" style={{ marginTop: 6 }}>{f.excerpt || "Your summary appears here."}</p>
          </div>
        </div>
      </div>
    </>
  );
}
