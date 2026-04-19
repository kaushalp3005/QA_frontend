import axios from "axios";
import { getAuthToken } from "./auth";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

function authHeaders() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface QcUser {
  id: number;
  email: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface Permission {
  module_code: string;
  can_access: boolean;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export async function listQcUsers(): Promise<QcUser[]> {
  const res = await axios.get(`${API_BASE_URL}/settings/qc-users`, {
    headers: authHeaders(),
  });
  return res.data;
}

export async function createQcUser(email: string, password: string): Promise<QcUser> {
  const res = await axios.post(
    `${API_BASE_URL}/settings/qc-users`,
    { email, password },
    { headers: authHeaders() }
  );
  return res.data;
}

export async function resetQcUserPassword(
  userId: number,
  newPassword: string
): Promise<void> {
  await axios.put(
    `${API_BASE_URL}/settings/qc-users/${userId}/password`,
    { new_password: newPassword },
    { headers: authHeaders() }
  );
}

export async function deleteQcUser(userId: number): Promise<void> {
  await axios.delete(`${API_BASE_URL}/settings/qc-users/${userId}`, {
    headers: authHeaders(),
  });
}

export async function getUserPermissions(userId: number): Promise<Permission[]> {
  const res = await axios.get(
    `${API_BASE_URL}/settings/qc-users/${userId}/permissions`,
    { headers: authHeaders() }
  );
  return res.data;
}

export async function setUserPermissions(
  userId: number,
  permissions: Permission[]
): Promise<void> {
  await axios.put(
    `${API_BASE_URL}/settings/qc-users/${userId}/permissions`,
    { permissions },
    { headers: authHeaders() }
  );
}

export interface MyPermissions {
  is_super_admin: boolean;
  permissions: Record<string, { can_view: boolean; can_access: boolean }>;
}

export async function getMyPermissions(): Promise<MyPermissions> {
  const res = await axios.get(`${API_BASE_URL}/settings/my-permissions`, {
    headers: authHeaders(),
  });
  return res.data;
}
