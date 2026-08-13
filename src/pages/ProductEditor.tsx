import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, uploadImage } from "../api";

const empty = {
  title: "", description: "", short_description: "", tags: [] as string[], brand: "", category_id: "",
  mrp: 0, price: 0, discount_pct: 0, discount_on: "price",
  cgst: "" as number | string, sgst: "" as number | string, igst: "" as number | string,
  primary_color_name: "", primary_color_family: "", primary_shade_code: "",
  images: [] as string[],
  product_line: "",
  
  // Yarn specs
  yarn_weight: "", fiber_content: [] as { fiber: string; percentage: number }[],
  yardage: "" as number | string, skein_weight: "" as number | string, gauge_info: "", hook_size: "", certifications: "", care_instructions: "",

  sku: "", shipping_weight: "" as number | string, country_of_origin: "",
  stock: 0, low_stock_threshold: 5,
  rating: 0, review_count: 0, sold_count: 0, is_active: true, is_featured: false,
};

export default function ProductEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const [f, setF] = useState({ ...empty });
  const [cats, setCats] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [productLines, setProductLines] = useState<any[]>([]);
  const [brandFocus, setBrandFocus] = useState(false);
  const [brandCreating, setBrandCreating] = useState(false);
  const [productLineFocus, setProductLineFocus] = useState(false);
  const [productLineCreating, setProductLineCreating] = useState(false);
  const [certs, setCerts] = useState<any[]>([]);
  const [certFocus, setCertFocus] = useState(false);
  const [certCreating, setCertCreating] = useState(false);
  const [countries, setCountries] = useState<any[]>([]);
  const [countryFocus, setCountryFocus] = useState(false);
  const [countryCreating, setCountryCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [uploading, setUploading] = useState(false);
  const genFile = useRef<HTMLInputElement>(null);

  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    api.get("/categories").then(setCats).catch(() => {});
    api.get("/brands").then(setBrands).catch(() => {});
    api.get("/product-lines").then(setProductLines).catch(() => {});
    api.get("/certifications").then(setCerts).catch(() => {});
    api.get("/countries").then(setCountries).catch(() => {});
    if (id) api.get(`/products/${id}`).then((p) => setF({ ...empty, ...p, category_id: p.category_id || "" }));
  }, [id]);

  // live price preview
  const base = f.discount_on === "mrp" ? f.mrp : f.price;
  const final = f.discount_pct > 0 ? Math.round(base * (1 - f.discount_pct / 100) * 100) / 100 : f.price;
  const off = f.mrp > final ? Math.round(((f.mrp - final) / f.mrp) * 100) : 0;

  const uploadTo = async (files: FileList | null, cb: (urls: string[]) => void) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) urls.push(await uploadImage(file));
      cb(urls);
    } catch (e: any) { setErr(e.message); } finally { setUploading(false); }
  };

  const addFiber = () => set("fiber_content", [...f.fiber_content, { fiber: "", percentage: 100 }]);
  const updFiber = (fi: number, k: string, v: any) => set("fiber_content", f.fiber_content.map((fb, idx) => (idx === fi ? { ...fb, [k]: v } : fb)));
  const rmFiber = (fi: number) => set("fiber_content", f.fiber_content.filter((_, idx) => idx !== fi));

  const save = async () => {
    setErr("");
    if (!f.title || !f.price) { setErr("Title and needed price are required"); return; }
    
    // Validate fiber percentages
    const totalFiber = f.fiber_content.reduce((sum, fb) => sum + (Number(fb.percentage) || 0), 0);
    if (f.fiber_content.length > 0 && totalFiber !== 100) {
      setErr("Fiber content percentages must equal exactly 100%. Currently: " + totalFiber + "%");
      return;
    }

    const { rating, review_count, sold_count, ...rest } = f as any;
    const body = {
      ...rest,
      short_description: f.short_description || null,
      tags: f.tags,
      category_id: f.category_id || null,
      primary_color_name: f.primary_color_name || null,
      primary_color_family: f.primary_color_family || null,
      primary_shade_code: f.primary_shade_code || null,
      mrp: Number(f.mrp), price: Number(f.price), discount_pct: Number(f.discount_pct),
      cgst: f.cgst === "" ? null : Number(f.cgst),
      sgst: f.sgst === "" ? null : Number(f.sgst),
      igst: f.igst === "" ? null : Number(f.igst),
      stock: Number(f.stock), low_stock_threshold: Number(f.low_stock_threshold),
      yardage: f.yardage === "" ? null : Number(f.yardage),
      skein_weight: f.skein_weight === "" ? null : Number(f.skein_weight),
      yarn_weight: f.yarn_weight || null,
      gauge_info: f.gauge_info || null,
      hook_size: f.hook_size || null,
      certifications: f.certifications || null,
      care_instructions: f.care_instructions || null,
      product_line: f.product_line || null,
      sku: f.sku || null,
      shipping_weight: f.shipping_weight === "" ? null : Number(f.shipping_weight),
      country_of_origin: f.country_of_origin || null,
      is_featured: f.is_featured,
    };
    
    setSaving(true);
    try {
      if (id) await api.patch(`/products/${id}`, body);
      else await api.post("/products", body);
      nav("/products");
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  };

  return (
    <>
      <h1>{id ? "Edit Product" : "New Product"}</h1>

      <div className="card">
        <label>Title *</label>
        <input value={f.title} onChange={(e) => set("title", e.target.value)} />
        <label>Description</label>
        <textarea rows={3} value={f.description} onChange={(e) => set("description", e.target.value)} />
        <label>Short Description (Subtitle)</label>
        <input value={f.short_description || ""} onChange={(e) => set("short_description", e.target.value)} placeholder="e.g. A luxuriously soft merino blend perfect for baby blankets." />
        <label>Tags (Comma separated)</label>
        <input 
          value={f.tags.join(", ")} 
          onChange={(e) => set("tags", e.target.value.split(",").map(t => t.trim()).filter(Boolean))} 
          placeholder="e.g. winter, soft, baby-safe" 
        />
        <div className="row" style={{ marginTop: 16 }}>
          <div>
            <label>Primary Color Family</label>
            <select value={f.primary_color_family || ""} onChange={(e) => set("primary_color_family", e.target.value)}>
              <option value="">— select —</option>
              <optgroup label="Neutrals & Earth Tones">
                <option value="Black">Black</option>
                <option value="White">White</option>
                <option value="Grey / Silver">Grey / Silver</option>
                <option value="Cream / Ivory">Cream / Ivory</option>
                <option value="Beige / Khaki">Beige / Khaki</option>
                <option value="Brown">Brown</option>
              </optgroup>
              <optgroup label="Primary & Secondary">
                <option value="Red">Red</option>
                <option value="Blue">Blue</option>
                <option value="Yellow">Yellow</option>
                <option value="Green">Green</option>
                <option value="Orange">Orange</option>
                <option value="Purple / Violet">Purple / Violet</option>
              </optgroup>
              <optgroup label="Fashion & Blends">
                <option value="Pink">Pink</option>
                <option value="Burgundy / Maroon">Burgundy / Maroon</option>
                <option value="Navy">Navy</option>
                <option value="Teal / Aqua">Teal / Aqua</option>
                <option value="Peach / Coral">Peach / Coral</option>
                <option value="Mustard">Mustard</option>
                <option value="Olive">Olive</option>
                <option value="Plum">Plum</option>
              </optgroup>
              <optgroup label="Yarn Specials">
                <option value="Multi / Variegated">Multi / Variegated</option>
                <option value="Speckled">Speckled</option>
                <option value="Heathered">Heathered</option>
                <option value="Natural / Undyed">Natural / Undyed</option>
                <option value="Gradient / Ombre">Gradient / Ombre</option>
                <option value="Metallic">Metallic</option>
                <option value="Neon">Neon</option>
              </optgroup>
            </select>
          </div>
          <div>
            <label>Shade Code</label>
            <input value={f.primary_shade_code || ""} onChange={(e) => set("primary_shade_code", e.target.value)} placeholder="e.g. OLV001" />
            <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              Each shade is its own product — use the same Brand + Product Line + Weight so they group into one shade grid on the storefront.
            </p>
          </div>
          <div>
            <label>Primary Color Name</label>
            <input value={f.primary_color_name} onChange={(e) => set("primary_color_name", e.target.value)} placeholder="e.g. Azure Blue" />
          </div>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <div style={{ position: "relative" }}>
            <label>Brand</label>
            <input 
              type="text" 
              autoComplete="off" 
              value={f.brand} 
              onChange={(e) => set("brand", e.target.value)} 
              onFocus={() => setBrandFocus(true)}
              onBlur={() => setTimeout(() => setBrandFocus(false), 200)}
              placeholder="Select or type a brand..."
            />
            {brandFocus && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid var(--border)", zIndex: 10, borderRadius: 6, maxHeight: 200, overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", marginTop: 4 }}>
                {brands.filter((b) => b.name.toLowerCase().includes(f.brand.toLowerCase())).map((b) => (
                  <div key={b.slug} style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #f0f0f0", fontSize: 14 }} onClick={() => set("brand", b.name)}>
                    {b.name}
                  </div>
                ))}
                {!brands.some((b) => b.name.toLowerCase() === f.brand.trim().toLowerCase()) && f.brand.trim() !== "" && (
                  <div style={{ padding: "8px 12px", cursor: "pointer", color: "var(--orange)", fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }} 
                       onClick={async () => {
                         try {
                           setBrandCreating(true);
                           const slug = f.brand.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                           const res = await api.post("/brands", { name: f.brand.trim(), slug });
                           setBrands([...brands, res]);
                           set("brand", res.name);
                         } catch (e: any) {
                           setErr(e.message);
                         } finally {
                           setBrandCreating(false);
                         }
                       }}>
                    {brandCreating ? "Creating..." : `+ Add "${f.brand}" as new brand`}
                  </div>
                )}
                {brands.length === 0 && f.brand.trim() === "" && (
                  <div style={{ padding: "8px 12px", fontSize: 13, color: "#888" }}>No brands yet. Type to create one.</div>
                )}
              </div>
            )}
          </div>
          <div style={{ position: "relative" }}>
            <label>Product Line / Collection</label>
            <input 
              type="text" 
              autoComplete="off" 
              value={f.product_line || ""} 
              onChange={(e) => set("product_line", e.target.value)} 
              onFocus={() => setProductLineFocus(true)}
              onBlur={() => setTimeout(() => setProductLineFocus(false), 200)}
              placeholder={f.brand ? `Select or type line for ${f.brand}...` : "Select a brand first"}
              disabled={!f.brand}
            />
            {productLineFocus && f.brand && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid var(--border)", zIndex: 10, borderRadius: 6, maxHeight: 200, overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", marginTop: 4 }}>
                {productLines.filter((pl) => pl.brand === f.brand && pl.name.toLowerCase().includes((f.product_line || "").toLowerCase())).map((pl) => (
                  <div key={pl.slug} style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #f0f0f0", fontSize: 14 }} onClick={() => set("product_line", pl.name)}>
                    {pl.name}
                  </div>
                ))}
                {!productLines.some((pl) => pl.brand === f.brand && pl.name.toLowerCase() === (f.product_line || "").trim().toLowerCase()) && (f.product_line || "").trim() !== "" && (
                  <div style={{ padding: "8px 12px", cursor: "pointer", color: "var(--orange)", fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }} 
                       onClick={async () => {
                         try {
                           setProductLineCreating(true);
                           const slug = (f.product_line || "").toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                           const res = await api.post("/product-lines", { name: (f.product_line || "").trim(), brand: f.brand, slug });
                           setProductLines([...productLines, res]);
                           set("product_line", res.name);
                         } catch (e: any) {
                           setErr(e.message);
                         } finally {
                           setProductLineCreating(false);
                         }
                       }}>
                    {productLineCreating ? "Creating..." : `+ Add "${f.product_line}" to ${f.brand}`}
                  </div>
                )}
                {productLines.filter((pl) => pl.brand === f.brand).length === 0 && (f.product_line || "").trim() === "" && (
                  <div style={{ padding: "8px 12px", fontSize: 13, color: "#888" }}>No product lines for {f.brand} yet. Type to create one.</div>
                )}
              </div>
            )}
          </div>
          <div>
            <label>Category</label>
            <select value={f.category_id} onChange={(e) => set("category_id", e.target.value)}>
              <option value="">— none —</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Pricing</h3>
        <div className="row">
          <div><label>Actual price (MRP, struck)</label><input type="number" value={f.mrp} onChange={(e) => set("mrp", e.target.value)} /></div>
          <div><label>Needed price (selling)</label><input type="number" value={f.price} onChange={(e) => set("price", e.target.value)} /></div>
        </div>
        <div className="row">
          <div><label>Extra discount %</label><input type="number" value={f.discount_pct} onChange={(e) => set("discount_pct", e.target.value)} /></div>
          <div>
            <label>Discount applies on</label>
            <select value={f.discount_on} onChange={(e) => set("discount_on", e.target.value)}>
              <option value="price">Needed price</option>
              <option value="mrp">Actual price (MRP)</option>
            </select>
          </div>
        </div>
        <label style={{ marginTop: 8 }}>GST for this product (same-state = CGST + SGST · other state = IGST)</label>
        <div className="row">
          <div><label>CGST %</label><input type="number" value={f.cgst} onChange={(e) => set("cgst", e.target.value)} placeholder="e.g. 2.5, 6" /></div>
          <div><label>SGST %</label><input type="number" value={f.sgst} onChange={(e) => set("sgst", e.target.value)} placeholder="e.g. 2.5, 6" /></div>
          <div><label>IGST %</label><input type="number" value={f.igst} onChange={(e) => set("igst", e.target.value)} placeholder="e.g. 5, 12" /></div>
        </div>
        <p className="muted" style={{ marginTop: 14 }}>
          Customer sees: <span style={{ textDecoration: "line-through" }}>₹{f.mrp}</span>{" "}
          <b style={{ color: "#f26a21", fontSize: 16 }}>₹{final}</b>{" "}
          {off > 0 && <span style={{ color: "#2fae5f" }}>({off}% off)</span>}
          {" · "}GST added at checkout: CGST {f.cgst || 0}% + SGST {f.sgst || 0}% (same state), or IGST {f.igst || 0}% (other state)
        </p>
      </div>

      {/* General images */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Gallery images</h3>
        <div className="imgs">
          {f.images.map((u, i) => (
            <div className="imgbox" key={u + i}>
              <img src={u} />
              <button className="x" onClick={() => set("images", f.images.filter((_, idx) => idx !== i))}>×</button>
            </div>
          ))}
          <button className="addimg" onClick={() => genFile.current?.click()} disabled={uploading}>{uploading ? "…" : "+ Add"}</button>
          <input ref={genFile} type="file" accept="image/*" multiple hidden
            onChange={(e) => uploadTo(e.target.files, (urls) => set("images", [...f.images, ...urls]))} />
        </div>
      </div>

      {/* Yarn Details */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Yarn Details</h3>
        <div className="row">
          <div>
            <label>Yarn Thickness (Weight)</label>
            <select value={f.yarn_weight} onChange={(e) => set("yarn_weight", e.target.value)}>
              <option value="">— none —</option>
              <optgroup label="Very Thin">
                <option value="1-ply (Thread)">1-ply (Thread)</option>
                <option value="2-ply (Lace)">2-ply (Lace)</option>
                <option value="3-ply (Light Thin)">3-ply (Light Thin)</option>
              </optgroup>
              <optgroup label="Thin">
                <option value="4-ply (Regular Thin / Sock)">4-ply (Regular Thin / Sock)</option>
                <option value="5-ply (Baby Yarn)">5-ply (Baby Yarn)</option>
              </optgroup>
              <optgroup label="Medium / Normal">
                <option value="8-ply (Light Medium / DK)">8-ply (Light Medium / DK)</option>
                <option value="10-ply (Regular Medium / Worsted)">10-ply (Regular Medium / Worsted)</option>
                <option value="12-ply (Thick Medium / Aran)">12-ply (Thick Medium / Aran)</option>
              </optgroup>
              <optgroup label="Thick & Very Thick">
                <option value="14-ply (Thick / Chunky)">14-ply (Thick / Chunky)</option>
                <option value="16-ply (Very Thick / Super Chunky)">16-ply (Very Thick / Super Chunky)</option>
                <option value="Jumbo (Extremely Thick)">Jumbo (Extremely Thick)</option>
              </optgroup>
            </select>
          </div>
          <div><label>Total Length (Meters/Yards)</label><input type="number" value={f.yardage} onChange={(e) => set("yardage", e.target.value)} placeholder="e.g. 200" /></div>
          <div><label>Weight per Ball (Grams)</label><input type="number" value={f.skein_weight} onChange={(e) => set("skein_weight", e.target.value)} placeholder="e.g. 100" /></div>
        </div>
        <div>
          <label>Needle Size (Gauge)</label>
          <input value={f.gauge_info} onChange={(e) => set("gauge_info", e.target.value)} placeholder="e.g. 22 sts = 4 inches on 4mm needles" />
        </div>
        <div className="row">
          <div>
            <label>Crochet Hook Size</label>
            <input value={f.hook_size || ""} onChange={(e) => set("hook_size", e.target.value)} placeholder="e.g. 5.0 mm (H)" />
          </div>
          <div style={{ position: "relative" }}>
            <label>Certifications</label>
            <input 
              value={f.certifications || ""} 
              onChange={(e) => set("certifications", e.target.value)} 
              onFocus={() => setCertFocus(true)}
              onBlur={() => setTimeout(() => setCertFocus(false), 200)}
              placeholder="e.g. Oeko-Tex Standard 100, Organic" 
            />
            {certFocus && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid var(--border)", zIndex: 10, borderRadius: 6, maxHeight: 200, overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", marginTop: 4 }}>
                {certs.filter((c) => c.name.toLowerCase().includes((f.certifications || "").toLowerCase())).map((c) => (
                  <div key={c.slug} style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #f0f0f0", fontSize: 14 }} onClick={() => set("certifications", c.name)}>
                    {c.name}
                  </div>
                ))}
                {!certs.some((c) => c.name.toLowerCase() === (f.certifications || "").trim().toLowerCase()) && (f.certifications || "").trim() !== "" && (
                  <div style={{ padding: "8px 12px", cursor: "pointer", color: "var(--orange)", fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }} 
                       onClick={async () => {
                         try {
                           setCertCreating(true);
                           const slug = (f.certifications || "").toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                           const res = await api.post("/certifications", { name: (f.certifications || "").trim(), slug });
                           setCerts([...certs, res]);
                           set("certifications", res.name);
                         } catch (e: any) { setErr(e.message); } finally { setCertCreating(false); }
                       }}>
                    {certCreating ? "Creating..." : `+ Add "${f.certifications}" as new`}
                  </div>
                )}
                {certs.length === 0 && (f.certifications || "").trim() === "" && (
                  <div style={{ padding: "8px 12px", fontSize: 13, color: "#888" }}>No certifications yet. Type to create one.</div>
                )}
              </div>
            )}
          </div>
        </div>
        <div>
          <label>Washing Instructions (Optional)</label>
          <textarea rows={2} value={f.care_instructions} onChange={(e) => set("care_instructions", e.target.value)} placeholder="e.g. Gentle hand wash or machine wash on a delicate cycle. Do not bleach. Dry flat in the shade." />
        </div>
        
        <div className="between" style={{ marginTop: 12 }}>
          <label style={{ margin: 0 }}>Material Mix / Fiber (Must total 100%)</label>
          <button className="btn ghost sm" onClick={addFiber}>+ Add Material</button>
        </div>
        {f.fiber_content.length === 0 && <p className="muted" style={{ marginTop: 6 }}>No materials added yet.</p>}
        {f.fiber_content.map((fb, fi) => (
          <div className="row" key={fi} style={{ alignItems: "end", flexWrap: "wrap", marginTop: 8 }}>
            <div style={{ flex: 1 }}><label>Material / Fiber Type</label><input value={fb.fiber} placeholder="e.g. Cotton, Acrylic, Wool" onChange={(e) => updFiber(fi, "fiber", e.target.value)} /></div>
            <div><label>Percentage (%)</label><input type="number" value={fb.percentage} onChange={(e) => updFiber(fi, "percentage", Number(e.target.value))} /></div>
            <div style={{ flex: "0 0 auto" }}><label>&nbsp;</label><button className="btn danger sm" onClick={() => rmFiber(fi)}>Remove</button></div>
          </div>
        ))}
      </div>

      {/* Inventory & details */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Inventory & details</h3>
        <div className="row">
          <div><label>Stock</label><input type="number" value={f.stock} onChange={(e) => set("stock", e.target.value)} /></div>
          <div><label>Low-stock alert at</label><input type="number" value={f.low_stock_threshold} onChange={(e) => set("low_stock_threshold", e.target.value)} /></div>
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <div><label>SKU (Barcode / Item Code)</label><input value={f.sku || ""} onChange={(e) => set("sku", e.target.value)} placeholder="e.g. GY-COT-101" /></div>
          <div><label>Shipping Weight (grams)</label><input type="number" value={f.shipping_weight || ""} onChange={(e) => set("shipping_weight", e.target.value)} placeholder="Weight including packaging" /></div>
          <div style={{ position: "relative" }}>
            <label>Country of Origin</label>
            <input 
              value={f.country_of_origin || ""} 
              onChange={(e) => set("country_of_origin", e.target.value)} 
              onFocus={() => setCountryFocus(true)}
              onBlur={() => setTimeout(() => setCountryFocus(false), 200)}
              placeholder="e.g. Made in India" 
            />
            {countryFocus && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid var(--border)", zIndex: 10, borderRadius: 6, maxHeight: 200, overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", marginTop: 4 }}>
                {countries.filter((c) => c.name.toLowerCase().includes((f.country_of_origin || "").toLowerCase())).map((c) => (
                  <div key={c.slug} style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #f0f0f0", fontSize: 14 }} onClick={() => set("country_of_origin", c.name)}>
                    {c.name}
                  </div>
                ))}
                {!countries.some((c) => c.name.toLowerCase() === (f.country_of_origin || "").trim().toLowerCase()) && (f.country_of_origin || "").trim() !== "" && (
                  <div style={{ padding: "8px 12px", cursor: "pointer", color: "var(--orange)", fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }} 
                       onClick={async () => {
                         try {
                           setCountryCreating(true);
                           const slug = (f.country_of_origin || "").toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                           const res = await api.post("/countries", { name: (f.country_of_origin || "").trim(), slug });
                           setCountries([...countries, res]);
                           set("country_of_origin", res.name);
                         } catch (e: any) { setErr(e.message); } finally { setCountryCreating(false); }
                       }}>
                    {countryCreating ? "Creating..." : `+ Add "${f.country_of_origin}" as new`}
                  </div>
                )}
                {countries.length === 0 && (f.country_of_origin || "").trim() === "" && (
                  <div style={{ padding: "8px 12px", fontSize: 13, color: "#888" }}>No countries yet. Type to create one.</div>
                )}
              </div>
            )}
          </div>
        </div>
        <p className="muted" style={{ marginTop: 16 }}>
          Rating & reviews are collected from delivered customers. Units sold is
          counted automatically when orders are delivered. These update on their own.
          See the Reviews tab for all customer feedback.
        </p>


        <label className="flex" style={{ marginTop: 16 }}>
          <input type="checkbox" style={{ width: "auto" }} checked={f.is_active} onChange={(e) => set("is_active", e.target.checked)} />
          Visible in store
        </label>
        <label className="flex" style={{ marginTop: 8 }}>
          <input type="checkbox" style={{ width: "auto" }} checked={f.is_featured} onChange={(e) => set("is_featured", e.target.checked)} />
          Featured Product (Pin to Homepage)
        </label>
      </div>

      {err && <div className="err">{err}</div>}
      <div className="flex" style={{ marginTop: 8 }}>
        <button className="btn" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Product"}</button>
        <button className="btn ghost" onClick={() => nav("/products")}>Cancel</button>
      </div>
    </>
  );
}
