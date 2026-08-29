import { API_URL } from "./config";
import { getToken, logout } from "./auth";

/** Force-logout on expired session: clear stored credentials, alert the admin,
 *  and redirect to the login page so they can sign back in immediately. */
function handleSessionExpired() {
  logout();
  // Use alert() rather than a toast — admin must acknowledge before proceeding.
  alert("Your session has expired. Please log in again.");
  window.location.href = "/login";
}

async function req<T = any>(path: string, method = "GET", body?: any): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    handleSessionExpired();
    throw new Error("Session expired");
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.detail ? JSON.stringify(data.detail) : `Error ${res.status}`);
  return data as T;
}

/** Authenticated binary download (Excel/PDF/...) — `window.open`/`<a href>`
 * can't attach the Bearer token, so this fetches the blob ourselves and
 * saves it via a throwaway object URL + anchor click. Prefers the filename
 * the server suggests (e.g. it bakes the exported date range in); `fallbackName`
 * is only used if the server didn't send one. */
async function download(path: string, fallbackName: string): Promise<void> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401) {
    handleSessionExpired();
    throw new Error("Session expired");
  }
  if (!res.ok) {
    const text = await res.text();
    let detail = `Error ${res.status}`;
    try { detail = JSON.parse(text)?.detail ? JSON.stringify(JSON.parse(text).detail) : detail; } catch { /* not JSON */ }
    throw new Error(detail);
  }
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] || fallbackName;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const api = {
  get: <T = any>(p: string) => req<T>(p),
  post: <T = any>(p: string, b?: any) => req<T>(p, "POST", b),
  put: <T = any>(p: string, b?: any) => req<T>(p, "PUT", b),
  patch: <T = any>(p: string, b?: any) => req<T>(p, "PATCH", b),
  del: <T = any>(p: string) => req<T>(p, "DELETE"),
  download,
};

export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/upload/image`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: form,
  });
  if (res.status === 401) {
    handleSessionExpired();
    throw new Error("Session expired");
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail || "Upload failed");
  return data.url as string;
}

export interface UploadedVideo {
  url: string;
  poster: string | null;
  duration?: number;
  bytes?: number;
}

/** Clips go through Cloudinary's video pipeline and come back with a poster. */
export async function uploadVideo(file: File): Promise<UploadedVideo> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/upload/video`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: form,
  });
  if (res.status === 401) {
    handleSessionExpired();
    throw new Error("Session expired");
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail || "Upload failed");
  return data as UploadedVideo;
}
