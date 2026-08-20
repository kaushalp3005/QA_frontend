import { Session, User, ApiResponse, IPQCRecord, DropdownData, Factory, Floor, SKUResult } from "@/types";
import { clearIPQCSession } from "../auth";
import { getFreshAccessToken, refreshTokens, getAuthToken, getRefreshToken } from "./auth";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

// ── Auth ─────────────────────────────────────────────────────────────────────
// Tokens are handled by lib/api/auth.ts and NOWHERE else.
//
// This module used to keep its own refresh, which POSTed to /auth/refresh with
// no body and the ACCESS token in an Authorization header. The endpoint takes
// {"refresh_token": "..."} as its body, so that call could only ever answer 422
// — every 401 fell straight through to the logout branch below. With a 15-minute
// access token and IPQC forms that take longer than that to fill, Save reliably
// logged the user out and lost the entry. (It landed them on the dashboard, not
// the login screen, because clearIPQCSession() leaves the complaint-module
// tokens intact and AuthGuard bounces an authenticated user off /login.)
//
// Two rules now keep that from coming back:
//
//   1. Renew BEFORE sending, not after failing. getFreshAccessToken() refreshes
//      when the token is expired or within its 30s skew, so a form that took an
//      hour to fill still saves with a live token and never sees a 401.
//
//   2. ONE refresh implementation. Refresh tokens rotate, and the server treats
//      a re-presented one as theft and revokes the whole chain. Two modules with
//      separate single-flight guards can present the same token concurrently and
//      log the user out for real — so this defers to refreshTokens(), whose
//      guard is the only one.
let _redirecting = false;

async function request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...options.headers };

  const token = await getFreshAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    // Pre-send renewal should have prevented this, so a 401 here means the
    // token died in flight or was revoked. One refresh, one replay.
    const refreshed = await refreshTokens();

    if (refreshed) {
      const fresh = getAuthToken();
      if (fresh) headers["Authorization"] = `Bearer ${fresh}`;
      const retry = await fetch(`${BASE}${path}`, { ...options, headers });
      if (retry.ok) return retry.json();
      // We hold a token the server just issued, so this is NOT an expired
      // session. Surface it as an error and leave the user's work on screen
      // rather than logging them out and losing it.
      const err = await retry.json().catch(() => ({ detail: retry.statusText }));
      throw new Error(err.detail?.message || err.detail || err.message || `Request failed: ${retry.status}`);
    }

    // refreshTokens() clears the stored tokens only when the SERVER rejects the
    // refresh. Still holding one means the request never got there — a network
    // blip is not a logout.
    if (getRefreshToken()) {
      throw new Error("Could not reach the server — check your connection and try again");
    }

    clearIPQCSession();
    if (typeof window !== "undefined" && !_redirecting) {
      _redirecting = true;
      alert("Session expired — please log in again");
      window.location.href = "/login";
    }
    throw new Error("Session expired — please log in again");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ── IPQC ─────────────────────────────────

export const ipqc = {
  create: (data: any): Promise<{ ipqc_no: string }> =>
    request("/qc/ipqc", { method: "POST", body: JSON.stringify(data) }),

  list: (params: Record<string, any> = {}): Promise<{ records: IPQCRecord[]; total: number; total_pages: number }> => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== null && v !== "")
          .map(([k, v]) => [k, String(v)])
      )
    ).toString();
    return request(`/qc/ipqc${qs ? `?${qs}` : ""}`);
  },

  get: (ipqcNo: string, warehouse?: string): Promise<IPQCRecord> => {
    const qs = warehouse ? `?warehouse=${warehouse}` : "";
    return request(`/qc/ipqc/${ipqcNo}${qs}`);
  },

  update: (ipqcNo: string, data: any, warehouse?: string): Promise<IPQCRecord> => {
    const qs = warehouse ? `?warehouse=${warehouse}` : "";
    return request(`/qc/ipqc/${ipqcNo}${qs}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  delete: (ipqcNo: string, warehouse?: string): Promise<void> => {
    const qs = warehouse ? `?warehouse=${warehouse}` : "";
    return request(`/qc/ipqc/${ipqcNo}${qs}`, { method: "DELETE" });
  },

  approve: (ipqcNo: string, warehouse?: string): Promise<IPQCRecord> => {
    const qs = warehouse ? `?warehouse=${warehouse}` : "";
    return request(`/qc/ipqc/${ipqcNo}/approve${qs}`, { method: "POST" });
  },
};

// ── Dropdown ─────────────────────────────

export const dropdown = {
  getFactoriesFloors: (): Promise<DropdownData> => request("/qc/dropdown/factories-floors"),
};

// ── Factory CRUD ─────────────────────────

export const factories = {
  create: (data: any): Promise<Factory> =>
    request("/qc/factories", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: any): Promise<Factory> =>
    request(`/qc/factories/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number): Promise<void> => request(`/qc/factories/${id}`, { method: "DELETE" }),
};

// ── Floor CRUD ───────────────────────────

export const floors = {
  create: (data: any): Promise<Floor> =>
    request("/qc/floors", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: any): Promise<Floor> =>
    request(`/qc/floors/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number): Promise<void> => request(`/qc/floors/${id}`, { method: "DELETE" }),
};

// ── SKU Search ──────────────────────────

export const sku = {
  search: (search: string): Promise<SKUResult[]> => {
    const qs = new URLSearchParams({ search }).toString();
    return request(`/qc/ipqc/sku-search?${qs}`);
  },
  searchAll: async (search?: string): Promise<{ items: string[] }> => {
    const params: Record<string, string> = { limit: "500" };
    if (search && search.trim()) params.search = search.trim();
    const qs = new URLSearchParams(params).toString();
    // all_sku lives in the "main" backend (NEXT_PUBLIC_API_BASE_URL), not the IPQC backend (BASE_URL2).
    const MAIN_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
    const url = `${MAIN_BASE}/sku/all-particulars?${qs}`;
    console.log("[all-sku] fetching:", url);
    try {
      const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
      console.log("[all-sku] response status:", res.status);
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("[all-sku] request failed:", res.status, txt);
        throw new Error(`all-sku request failed: ${res.status}`);
      }
      const data = await res.json();
      console.log("[all-sku] items received:", Array.isArray(data?.items) ? data.items.length : 0);
      return data;
    } catch (e) {
      console.error("[all-sku] fetch error:", e);
      throw e;
    }
  },
};

// ── Users ───────────────────────────────

export const users = {
  login: (username: string, password: string): Promise<User> =>
    request("/qc/ipqc/users/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  register: (data: any): Promise<User> =>
    request("/qc/ipqc/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  list: (): Promise<User[]> => request("/qc/ipqc/users"),

  resetPassword: (username: string, newPassword: string): Promise<void> =>
    request("/qc/ipqc/users/reset-password", {
      method: "POST",
      body: JSON.stringify({ username, new_password: newPassword }),
    }),
};
