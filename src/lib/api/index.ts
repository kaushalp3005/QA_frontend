import { Session, User, ApiResponse, IPQCRecord, DropdownData, Factory, Floor, SKUResult } from "@/types";
import { getToken, clearIPQCSession } from "../auth";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

// ── Token refresh helpers ───────────────────
let _refreshPromise: Promise<string | null> | null = null;
let _redirecting = false;

async function tryRefreshToken(): Promise<string | null> {
  const oldToken = getToken();
  if (!oldToken) return null;

  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${oldToken}`,
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const newToken: string = data.access_token;
    if (newToken && typeof window !== "undefined") {
      // Persist the refreshed token so future requests use it
      localStorage.setItem("access_token", newToken);
      const ipqcToken = localStorage.getItem("ipqc_token");
      if (ipqcToken) localStorage.setItem("ipqc_token", newToken);
    }
    return newToken;
  } catch {
    return null;
  }
}

/** Deduplicated refresh — concurrent callers share one in-flight attempt. */
function refreshOnce(): Promise<string | null> {
  if (!_refreshPromise) {
    _refreshPromise = tryRefreshToken().finally(() => {
      _refreshPromise = null;
    });
  }
  return _refreshPromise;
}

async function request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...options.headers };

  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    // Try silent token refresh before giving up
    const newToken = await refreshOnce();
    if (newToken) {
      // Retry the original request with the fresh token
      headers["Authorization"] = `Bearer ${newToken}`;
      const retry = await fetch(`${BASE}${path}`, { ...options, headers });
      if (retry.ok) return retry.json();
      // If retry also fails with 401, fall through to logout
      if (retry.status !== 401) {
        const err = await retry.json().catch(() => ({ detail: retry.statusText }));
        throw new Error(err.detail || `Request failed: ${retry.status}`);
      }
    }

    // Refresh failed or retry still 401 — clear session and redirect once
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
      Object.fromEntries(Object.entries(params).filter(([, v]) => v))
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
