const KEY = "admin_token";
const UKEY = "admin_user";

export const getToken = () => localStorage.getItem(KEY);
export const getUser = () => {
  const raw = localStorage.getItem(UKEY);
  return raw ? JSON.parse(raw) : null;
};
export const setAuth = (token: string, user: any) => {
  localStorage.setItem(KEY, token);
  localStorage.setItem(UKEY, JSON.stringify(user));
};
export const logout = () => {
  localStorage.removeItem(KEY);
  localStorage.removeItem(UKEY);
};
export const isAdmin = () => getUser()?.role === "admin";
// Owner/super admin. Older stored sessions have no is_super field -> treat as super
// (matches the backend, which treats the original owner credential as super).
export const isSuper = () => {
  const u = getUser();
  return !!u && u.role === "admin" && u.is_super !== false;
};

// Section access. null => unrestricted (owner / legacy admin); otherwise the
// explicit list of section keys this admin may open.
export const getPermissions = (): string[] | null => {
  const u = getUser();
  if (!u) return [];
  if (isSuper()) return null;
  return u.permissions ?? null;
};
export const hasSection = (key: string): boolean => {
  const p = getPermissions();
  return p === null ? true : p.includes(key);
};
