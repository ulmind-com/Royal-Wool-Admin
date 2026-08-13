import { Fragment, useEffect, useState } from "react";
import { api } from "../api";
import { fmtDateTime } from "../date";
import { ALL_SECTION_KEYS, SECTIONS } from "../sections";

const emptyForm = { name: "", email: "", password: "" };

// Turn a raw "POST /products" style entry into something readable for the owner.
function describe(a: any): string {
  if (a.action) return a.action;
  const seg = (a.path || "").split("/").filter(Boolean)[0] || "record";
  const verb =
    a.method === "POST" ? "Created" :
    a.method === "DELETE" ? "Deleted" :
    a.method === "PUT" || a.method === "PATCH" ? "Updated" : a.method;
  return `${verb} ${seg}`;
}

// Reusable grid of section checkboxes.
function SectionPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (key: string) =>
    onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);
  return (
    <div>
      <div className="flex" style={{ gap: 8, marginBottom: 8 }}>
        <button type="button" className="btn ghost sm" onClick={() => onChange([...ALL_SECTION_KEYS])}>Select all</button>
        <button type="button" className="btn ghost sm" onClick={() => onChange([])}>Clear</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
        {SECTIONS.map((s) => (
          <label key={s.key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
            <input
              type="checkbox"
              checked={value.includes(s.key)}
              onChange={() => toggle(s.key)}
              style={{ width: "auto", margin: 0 }}
            />
            {s.label}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function Admins() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [f, setF] = useState({ ...emptyForm });
  const [perms, setPerms] = useState<string[]>([...ALL_SECTION_KEYS]);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [activity, setActivity] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>(""); // admin_id filter, "" = everyone

  // Inline "edit access" editor state.
  const [editId, setEditId] = useState<string | null>(null);
  const [editPerms, setEditPerms] = useState<string[]>([]);

  const loadAdmins = () => api.get("/admins").then(setAdmins).catch((e) => setErr(e.message));
  const loadActivity = (adminId = filter) =>
    api.get(`/admins/activity${adminId ? `?admin_id=${adminId}` : ""}`).then(setActivity).catch(() => {});

  useEffect(() => { loadAdmins(); loadActivity(); }, []);

  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  const create = async () => {
    setErr(""); setOk("");
    if (!f.name.trim() || !f.email.trim() || f.password.length < 6) {
      setErr("Name, email and a password of at least 6 characters are required.");
      return;
    }
    try {
      await api.post("/admins", { name: f.name.trim(), email: f.email.trim(), password: f.password, permissions: perms });
      setF({ ...emptyForm });
      setPerms([...ALL_SECTION_KEYS]);
      setOk("Admin created. Share the email and password with your team member.");
      loadAdmins();
    } catch (e: any) { setErr(e.message); }
  };

  const revoke = async (a: any) => {
    if (!confirm(`Revoke admin access for ${a.email}? They will no longer be able to log in to the panel.`)) return;
    try { await api.del(`/admins/${a.id}`); loadAdmins(); }
    catch (e: any) { alert(e.message); }
  };

  const startEdit = (a: any) => {
    setEditId(a.id);
    setEditPerms(a.permissions == null ? [...ALL_SECTION_KEYS] : a.permissions);
  };
  const saveEdit = async (id: string) => {
    try { await api.patch(`/admins/${id}`, { permissions: editPerms }); setEditId(null); loadAdmins(); }
    catch (e: any) { alert(e.message); }
  };

  const applyFilter = (adminId: string) => { setFilter(adminId); loadActivity(adminId); };

  const accessLabel = (a: any) =>
    a.is_super || a.permissions == null ? "Full access" : `${a.permissions.length} section(s)`;

  return (
    <>
      <h1>Team &amp; Access</h1>
      <p className="muted" style={{ marginTop: -8 }}>
        Add admins so your team can help run the store. Tick only the sections each
        admin should reach — they won't see or be able to change anything else. You
        can update a member's access any time. Only you (the owner) can manage this.
      </p>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Add a new admin</h3>
        <div className="row">
          <div><label>Name</label><input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Team member name" /></div>
          <div><label>Email</label><input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="name@example.com" /></div>
          <div><label>Temporary password</label><input value={f.password} onChange={(e) => set("password", e.target.value)} placeholder="At least 6 characters" /></div>
        </div>
        <label style={{ marginTop: 12 }}>Sections this admin can access</label>
        <SectionPicker value={perms} onChange={setPerms} />
        {err && <div className="err">{err}</div>}
        {ok && <div className="muted" style={{ color: "#10b981", marginTop: 8 }}>{ok}</div>}
        <button className="btn" style={{ marginTop: 14 }} onClick={create}>Create admin</button>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Admins ({admins.length})</h3>
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Access</th><th>Last login</th><th></th></tr></thead>
          <tbody>
            {admins.map((a) => (
              <Fragment key={a.id}>
                <tr>
                  <td><b>{a.name || "—"}</b></td>
                  <td>{a.email}</td>
                  <td>
                    {a.is_super
                      ? <span style={{ fontSize: 11, fontWeight: 600, color: "#F26A21", background: "#fff3eb", padding: "2px 7px", borderRadius: 6 }}>Owner</span>
                      : <span style={{ fontSize: 11, fontWeight: 600, color: "#6366f1", background: "#eef", padding: "2px 7px", borderRadius: 6 }}>Admin</span>}
                  </td>
                  <td className="muted">{accessLabel(a)}</td>
                  <td className="muted">{a.last_login ? fmtDateTime(a.last_login) : "Never"}</td>
                  <td className="flex">
                    <button className="btn ghost sm" onClick={() => applyFilter(a.id)}>Activity</button>
                    {!a.is_super && <button className="btn ghost sm" onClick={() => (editId === a.id ? setEditId(null) : startEdit(a))}>{editId === a.id ? "Close" : "Edit access"}</button>}
                    {!a.is_super && <button className="btn danger sm" onClick={() => revoke(a)}>Revoke</button>}
                  </td>
                </tr>
                {editId === a.id && (
                  <tr>
                    <td colSpan={6} style={{ background: "#faf8ff" }}>
                      <div style={{ padding: "6px 2px" }}>
                        <label>Sections {a.name || a.email} can access</label>
                        <SectionPicker value={editPerms} onChange={setEditPerms} />
                        <div className="flex" style={{ marginTop: 12 }}>
                          <button className="btn sm" onClick={() => saveEdit(a.id)}>Save access</button>
                          <button className="btn ghost sm" onClick={() => setEditId(null)}>Cancel</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {admins.length === 0 && <tr><td colSpan={6} className="muted">No admins yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="between">
          <h3 style={{ marginTop: 0 }}>Activity log</h3>
          <div className="flex">
            <select value={filter} onChange={(e) => applyFilter(e.target.value)}>
              <option value="">All admins</option>
              {admins.map((a) => <option key={a.id} value={a.id}>{a.name || a.email}</option>)}
            </select>
            <button className="btn ghost sm" onClick={() => loadActivity()}>Refresh</button>
          </div>
        </div>
        <table>
          <thead><tr><th>When</th><th>Admin</th><th>Action</th><th>Details</th></tr></thead>
          <tbody>
            {activity.map((a) => (
              <tr key={a.id}>
                <td className="muted">{fmtDateTime(a.at)}</td>
                <td>{a.admin_name || a.admin_email}</td>
                <td>{describe(a)}</td>
                <td className="muted" style={{ fontSize: 12 }}>{a.method} {a.path}{a.status ? ` · ${a.status}` : ""}</td>
              </tr>
            ))}
            {activity.length === 0 && <tr><td colSpan={4} className="muted">No activity recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
