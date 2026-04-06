import { Session, User, ApiResponse, IPQCRecord, DropdownData, Factory, Floor, SKUResult } from "@/types";
import { getToken, clearSession } from "../auth";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL2 || "http://localhost:8000";

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

async function request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...options.headers };

  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearSession();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event('force-logout'));
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

  get: (ipqcNo: string): Promise<IPQCRecord> => request(`/qc/ipqc/${ipqcNo}`),

  update: (ipqcNo: string, data: any): Promise<IPQCRecord> =>
    request(`/qc/ipqc/${ipqcNo}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (ipqcNo: string): Promise<void> =>
    request(`/qc/ipqc/${ipqcNo}`, { method: "DELETE" }),

  approve: (ipqcNo: string): Promise<IPQCRecord> =>
    request(`/qc/ipqc/${ipqcNo}/approve`, { method: "POST" }),
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
