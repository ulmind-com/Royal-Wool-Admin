import { useEffect, useState } from "react";
import { api } from "../api";
import { fmtDateTime } from "../date";

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

export default function Admins() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [f, setF] = useState({ ...emptyForm });
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [activity, setActivity] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>(""); // admin_id filter, "" = everyone

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
      await api.post("/admins", { name: f.name.trim(), email: f.email.trim(), password: f.password });
      setF({ ...emptyForm });
      setOk("Admin created. Share the email and password with your team member.");
      loadAdmins();
    } catch (e: any) { setErr(e.message); }
  };

  const revoke = async (a: any) => {
    if (!confirm(`Revoke admin access for ${a.email}? They will no longer be able to log in to the panel.`)) return;
    try { await api.del(`/admins/${a.id}`); loadAdmins(); }
    catch (e: any) { alert(e.message); }
  };

  const applyFilter = (adminId: string) => { setFilter(adminId); loadActivity(adminId); };

  return (
    <>
      <h1>Team &amp; Access</h1>
      <p className="muted" style={{ marginTop: -8 }}>
        Add admins so your team can help run the store. They can manage the shop but
        cannot see or manage other admins — only you (the owner) can.
      </p>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Add a new admin</h3>
        <div className="row">
          <div><label>Name</label><input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Team member name" /></div>
          <div><label>Email</label><input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="name@example.com" /></div>
          <div><label>Temporary password</label><input value={f.password} onChange={(e) => set("password", e.target.value)} placeholder="At least 6 characters" /></div>
        </div>
        {err && <div className="err">{err}</div>}
        {ok && <div className="muted" style={{ color: "#10b981", marginTop: 8 }}>{ok}</div>}
        <button className="btn" style={{ marginTop: 14 }} onClick={create}>Create admin</button>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Admins ({admins.length})</h3>
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Last login</th><th></th></tr></thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.id}>
                <td><b>{a.name || "—"}</b></td>
                <td>{a.email}</td>
                <td>
                  {a.is_super
                    ? <span style={{ fontSize: 11, fontWeight: 600, color: "#F26A21", background: "#fff3eb", padding: "2px 7px", borderRadius: 6 }}>Owner</span>
                    : <span style={{ fontSize: 11, fontWeight: 600, color: "#6366f1", background: "#eef", padding: "2px 7px", borderRadius: 6 }}>Admin</span>}
                </td>
                <td className="muted">{a.last_login ? fmtDateTime(a.last_login) : "Never"}</td>
                <td className="flex">
                  <button className="btn ghost sm" onClick={() => applyFilter(a.id)}>View activity</button>
                  {!a.is_super && <button className="btn danger sm" onClick={() => revoke(a)}>Revoke</button>}
                </td>
              </tr>
            ))}
            {admins.length === 0 && <tr><td colSpan={5} className="muted">No admins yet.</td></tr>}
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
