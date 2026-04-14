import { Session } from "@/types";

const TOKEN_KEY = "ipqc_token";
const SESSION_KEY = "ipqc_session";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  // Prefer an IPQC-issued token; fall back to the complaint-module token
  // since there is no dedicated IPQC login UI in this project and the
  // remote IPQC backend has historically accepted it.
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem("access_token");
}

// Clear ONLY IPQC-scoped credentials. Leaves complaint-module auth intact.
export function clearIPQCSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
}

// Full logout — wipes every credential this app manages.
export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem("access_token");
  localStorage.removeItem("user");
  localStorage.removeItem("company");
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  // IPQC-specific session first
  const raw = localStorage.getItem(SESSION_KEY);
  if (raw) return JSON.parse(raw) as Session;
  // Fall back to complaint-module auth so IPQC pages don't redirect away
  const token = localStorage.getItem("access_token");
  if (token) {
    const userRaw = localStorage.getItem("user");
    const user = userRaw ? JSON.parse(userRaw) : null;
    return {
      username: user?.email || "user",
      displayName: user?.email || "user",
      isAdmin: false,
      token,
    };
  }
  return null;
}

export function saveSession(session: Session): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.setItem(TOKEN_KEY, session.token);
}
