import { useEffect, useRef, useState } from "react";
import { api } from "../api";

declare const L: any; // Leaflet loaded via CDN

export default function Settings() {
  const [s, setS] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const [mapSearch, setMapSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);


  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const debounceRef = useRef<any>(null);

  useEffect(() => { api.get("/settings").then(setS).catch((e) => setErr(e.message)); }, []);

  // Initialize Leaflet map once settings are loaded
  useEffect(() => {
    if (!s || !mapRef.current || leafletMap.current) return;

    const lat = s.shop.lat || 22.0667;
    const lng = s.shop.lng || 88.0698;

    const map = L.map(mapRef.current).setView([lat, lng], 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
    markerRef.current = marker;

    // When marker is dragged, update lat/lng
    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      setS((p: any) => ({
        ...p,
        shop: { ...p.shop, lat: parseFloat(pos.lat.toFixed(6)), lng: parseFloat(pos.lng.toFixed(6)) },
      }));
    });

    // Click on map to move marker
    map.on("click", (e: any) => {
      marker.setLatLng(e.latlng);
      map.panTo(e.latlng);
      setS((p: any) => ({
        ...p,
        shop: { ...p.shop, lat: parseFloat(e.latlng.lat.toFixed(6)), lng: parseFloat(e.latlng.lng.toFixed(6)) },
      }));
    });

    leafletMap.current = map;

    // Fix map rendering issues
    setTimeout(() => map.invalidateSize(), 200);
  }, [s]);

  // Update marker when lat/lng change from manual input
  useEffect(() => {
    if (!markerRef.current || !leafletMap.current || !s) return;
    const lat = Number(s.shop.lat);
    const lng = Number(s.shop.lng);
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      markerRef.current.setLatLng([lat, lng]);
      leafletMap.current.setView([lat, lng], leafletMap.current.getZoom());
    }
  }, [s?.shop?.lat, s?.shop?.lng]);

  // Search places using Nominatim (OpenStreetMap free geocoding)
  const handleMapSearch = (query: string) => {
    setMapSearch(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setSearchResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        // Proxy through the backend — direct Nominatim calls get blocked by
        // ad-blockers / Nominatim's User-Agent policy from the browser.
        const data = await api.get<any[]>(`/settings/geocode?q=${encodeURIComponent(query)}&limit=5`);
        setSearchResults(Array.isArray(data) ? data : []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const selectPlace = (place: any) => {
    const lat = parseFloat(parseFloat(place.lat).toFixed(6));
    const lng = parseFloat(parseFloat(place.lon).toFixed(6));
    setS((p: any) => ({
      ...p,
      shop: { ...p.shop, lat, lng, address: place.display_name },
    }));
    if (markerRef.current && leafletMap.current) {
      markerRef.current.setLatLng([lat, lng]);
      leafletMap.current.setView([lat, lng], 16);
    }
    setMapSearch("");
    setSearchResults([]);
  };

  if (err && !s) return <div className="err">{err}</div>;
  if (!s) return <p className="muted">Loading…</p>;

  const set = (k: string, v: any) => setS((p: any) => ({ ...p, [k]: v }));
  const setShop = (k: string, v: any) => setS((p: any) => ({ ...p, shop: { ...p.shop, [k]: v } }));
  const setDel = (k: string, v: any) => setS((p: any) => ({ ...p, delivery: { ...p.delivery, [k]: v } }));

  const sup = s.support || {};
  const setSup = (k: string, v: any) =>
    setS((p: any) => ({ ...p, support: { ...(p.support || {}), [k]: v } }));
  const socials: any[] = sup.socials || [];
  const setSocials = (next: any[]) => setSup("socials", next);
  const updSocial = (i: number, k: string, v: string) =>
    setSocials(socials.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));



  const useMyLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setShop("lat", lat);
        setShop("lng", lng);
        if (markerRef.current && leafletMap.current) {
          markerRef.current.setLatLng([lat, lng]);
          leafletMap.current.setView([lat, lng], 16);
        }
      },
      () => alert("Could not get location")
    );
  };

  const save = async () => {
    setErr(""); setSaved(false);
    try {
      const body = {
        currency: s.currency, currency_code: s.currency_code,

        shop: {
          ...s.shop,
          lat: s.shop.lat === "" ? null : Number(s.shop.lat),
          lng: s.shop.lng === "" ? null : Number(s.shop.lng),
        },
        delivery: {
          free_above: Number(s.delivery.free_above || 0),
          home_state: s.delivery.home_state || "West Bengal",
          home_base_fee: Number(s.delivery.home_base_fee || 0),
          home_base_weight_kg: Number(s.delivery.home_base_weight_kg || 1),
          home_extra_fee_per_kg: Number(s.delivery.home_extra_fee_per_kg || 0),
          rest_base_fee: Number(s.delivery.rest_base_fee || 0),
          rest_base_weight_kg: Number(s.delivery.rest_base_weight_kg || 1),
          rest_extra_fee_per_kg: Number(s.delivery.rest_extra_fee_per_kg || 0),
        },
        support: {
          ...(s.support || {}),
          // Drop half-filled social rows so the storefront never renders a dead link.
          socials: (s.support?.socials || []).filter(
            (r: any) => (r?.label || "").trim() && (r?.href || "").trim()
          ),
        },
      };
      const res = await api.put("/settings", body);
      setS(res); setSaved(true);
    } catch (e: any) { setErr(e.message); }
  };

  return (
    <>
      <h1>Settings</h1>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Store</h3>
        <div className="row">
          <div><label>Currency symbol</label><input value={s.currency} onChange={(e) => set("currency", e.target.value)} /></div>
          <div><label>Currency code</label><input value={s.currency_code} onChange={(e) => set("currency_code", e.target.value)} /></div>
        </div>
        <p className="muted" style={{ marginTop: 4 }}>GST is set per product (CGST / SGST / IGST) in the product editor.</p>




      </div>



      <div className="card">
        <div className="between"><h3 style={{ margin: 0 }}>Shop location</h3>
          <button className="btn ghost sm" onClick={useMyLocation}>📍 Use my current location</button></div>

        <div className="row">
          <div style={{ flex: 2 }}><label>Shop name</label><input value={s.shop.name || ""} onChange={(e) => setShop("name", e.target.value)} /></div>
          <div style={{ flex: 1 }}><label>Phone number</label><input type="tel" value={s.shop.phone || ""} placeholder="+91 XXXXX XXXXX" onChange={(e) => setShop("phone", e.target.value)} /></div>
          <div style={{ flex: 1 }}><label>Support email</label><input type="email" value={s.shop.email || ""} placeholder="support@store.com" onChange={(e) => setShop("email", e.target.value)} /></div>
        </div>

        <div className="row">
          <div style={{ flex: 1 }}>
            <label>State</label>
            <input value={s.shop.state || ""} placeholder="West Bengal" onChange={(e) => setShop("state", e.target.value)} />
          </div>
          <div style={{ flex: 1 }} />
        </div>

        <label>Address</label>
        <input value={s.shop.address || ""} onChange={(e) => setShop("address", e.target.value)} />

        {/* Map with search */}
        <div style={{ marginTop: 16, position: "relative" }}>
          <label>Search location on map</label>
          <input
            value={mapSearch}
            onChange={(e) => handleMapSearch(e.target.value)}
            placeholder="Search for a place, city, or address..."
            style={{ marginBottom: 0 }}
          />
          {/* Search results dropdown */}
          {searchResults.length > 0 && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0, zIndex: 1000,
              background: "#1e1e2e", border: "1px solid #333", borderRadius: 8,
              maxHeight: 200, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,.4)"
            }}>
              {searchResults.map((p: any, i: number) => (
                <div
                  key={i}
                  onClick={() => selectPlace(p)}
                  style={{
                    padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #2a2a3a",
                    fontSize: 13, color: "#ccc",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#2a2a3a")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  📍 {p.display_name}
                </div>
              ))}
            </div>
          )}
          {searching && <p className="muted" style={{ margin: "4px 0" }}>Searching...</p>}
          {!searching && mapSearch.trim() && searchResults.length === 0 && (
            <p className="muted" style={{ margin: "4px 0" }}>No matching places found.</p>
          )}
        </div>

        {/* Leaflet map */}
        <div
          ref={mapRef}
          style={{
            width: "100%", height: 350, borderRadius: 12, marginTop: 12,
            border: "2px solid #333", overflow: "hidden",
          }}
        />

        <div className="row" style={{ marginTop: 12 }}>
          <div><label>Latitude</label><input type="number" value={s.shop.lat ?? ""} onChange={(e) => setShop("lat", e.target.value)} /></div>
          <div><label>Longitude</label><input type="number" value={s.shop.lng ?? ""} onChange={(e) => setShop("lng", e.target.value)} /></div>
        </div>
        <p className="muted">Click on the map or drag the marker to set location. Lat/Lng update automatically.</p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Support card (Contact page)</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Everything the storefront's support card shows. Phone, email and address come from
          <b> Shop location</b> above. Leave a field blank to hide that row on the site.
        </p>

        <div className="row">
          <div style={{ flex: 2 }}>
            <label>Card heading</label>
            <input value={sup.title || ""} placeholder="We're always here to help you." onChange={(e) => setSup("title", e.target.value)} />
          </div>
          <div style={{ flex: 2 }}>
            <label>Card sub-line</label>
            <input value={sup.note || ""} placeholder="Reach us on whichever channel suits you." onChange={(e) => setSup("note", e.target.value)} />
          </div>
        </div>

        <div className="row">
          <div style={{ flex: 1 }}>
            <label>WhatsApp number</label>
            <input value={sup.whatsapp || ""} placeholder="+91 89107 92214" onChange={(e) => setSup("whatsapp", e.target.value)} />
          </div>
          <div style={{ flex: 2 }}>
            <label>WhatsApp pre-filled message</label>
            <input value={sup.whatsapp_message || ""} placeholder="Hi Royaall Wool, I have a question about your yarns." onChange={(e) => setSup("whatsapp_message", e.target.value)} />
          </div>
        </div>

        <div className="row">
          <div style={{ flex: 1 }}>
            <label>Opening hours line</label>
            <input value={sup.hours || ""} placeholder="Open 10am – 7pm IST, every day" onChange={(e) => setSup("hours", e.target.value)} />
          </div>
        </div>

        <details style={{ marginTop: 8 }}>
          <summary className="muted" style={{ cursor: "pointer" }}>Rename the row labels</summary>
          <div className="row" style={{ marginTop: 12 }}>
            <div><label>Phone row</label><input value={sup.hotline_label || ""} placeholder="Hotline" onChange={(e) => setSup("hotline_label", e.target.value)} /></div>
            <div><label>WhatsApp row</label><input value={sup.whatsapp_label || ""} placeholder="SMS / WhatsApp" onChange={(e) => setSup("whatsapp_label", e.target.value)} /></div>
            <div><label>Email row</label><input value={sup.email_label || ""} placeholder="Email" onChange={(e) => setSup("email_label", e.target.value)} /></div>
            <div><label>Address row</label><input value={sup.address_label || ""} placeholder="Studio" onChange={(e) => setSup("address_label", e.target.value)} /></div>
          </div>
        </details>

        <div className="between" style={{ marginTop: 20 }}>
          <h4 style={{ margin: 0 }}>Connect with us</h4>
          <button className="btn ghost sm" onClick={() => setSocials([...socials, { label: "", href: "" }])}>+ Add link</button>
        </div>
        {socials.length === 0 && <p className="muted">No social links yet — the section stays hidden on the site.</p>}
        {socials.map((row: any, i: number) => (
          <div className="row" key={i} style={{ alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label>Label</label>
              <input value={row.label || ""} placeholder="Instagram" onChange={(e) => updSocial(i, "label", e.target.value)} />
            </div>
            <div style={{ flex: 3 }}>
              <label>Link</label>
              <input value={row.href || ""} placeholder="https://instagram.com/royaallwool" onChange={(e) => updSocial(i, "href", e.target.value)} />
            </div>
            <button className="btn danger sm" onClick={() => setSocials(socials.filter((_, idx) => idx !== i))}>Remove</button>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Pan-India Delivery Rules</h3>
        
        <div style={{ marginBottom: 24 }}>
          <h4 style={{ margin: "0 0 8px 0" }}>Home State Pricing</h4>
          <div className="row">
            <div><label>Home State Name</label><input value={s.delivery.home_state || ""} placeholder="West Bengal" onChange={(e) => setDel("home_state", e.target.value)} /></div>
            <div><label>Free delivery above order value ₹</label><input type="number" value={s.delivery.free_above} onChange={(e) => setDel("free_above", e.target.value)} /></div>
          </div>
          <div className="row">
            <div><label>Base fee ₹</label><input type="number" value={s.delivery.home_base_fee} onChange={(e) => setDel("home_base_fee", e.target.value)} /></div>
            <div><label>Up to weight (Kg)</label><input type="number" value={s.delivery.home_base_weight_kg} onChange={(e) => setDel("home_base_weight_kg", e.target.value)} /></div>
            <div><label>Extra fee per additional Kg ₹</label><input type="number" value={s.delivery.home_extra_fee_per_kg} onChange={(e) => setDel("home_extra_fee_per_kg", e.target.value)} /></div>
          </div>
        </div>

        <div>
          <h4 style={{ margin: "0 0 8px 0" }}>Rest of India Pricing</h4>
          <div className="row">
            <div><label>Base fee ₹</label><input type="number" value={s.delivery.rest_base_fee} onChange={(e) => setDel("rest_base_fee", e.target.value)} /></div>
            <div><label>Up to weight (Kg)</label><input type="number" value={s.delivery.rest_base_weight_kg} onChange={(e) => setDel("rest_base_weight_kg", e.target.value)} /></div>
            <div><label>Extra fee per additional Kg ₹</label><input type="number" value={s.delivery.rest_extra_fee_per_kg} onChange={(e) => setDel("rest_extra_fee_per_kg", e.target.value)} /></div>
          </div>
        </div>
        
        <p className="muted" style={{ marginTop: 16 }}>
          Example: In {s.delivery.home_state || "Home State"}, up to {s.delivery.home_base_weight_kg || 1}Kg costs ₹{s.delivery.home_base_fee || 0}. Every additional Kg costs ₹{s.delivery.home_extra_fee_per_kg || 0}.
        </p>
      </div>

      {err && <div className="err">{err}</div>}
      <div className="flex">
        <button className="btn" onClick={save}>Save settings</button>
        {saved && <span style={{ color: "#2fae5f", fontWeight: 600 }}>Saved ✓</span>}
      </div>
    </>
  );
}
