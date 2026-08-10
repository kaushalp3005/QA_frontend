"use client";

import { useEffect, useRef } from "react";

/**
 * Partial save for the long training forms.
 *
 * A half-filled form is mirrored into localStorage as it is typed and restored
 * when the user comes back, so a refresh, a crash, or a wander to another page
 * doesn't cost twenty rows of typing. Nothing is written to the database until
 * the user actually submits — a compliance record should never exist in a
 * half-finished state where somebody could mistake it for a filed one.
 *
 * The draft is stored in the SAME shape the form already hydrates from
 * (`initialData`, i.e. the API payload). That way a form needs no second
 * parsing path: whatever it can load from the server it can load from a draft.
 *
 * Follows the pattern already used by documentations/productweightcheck, with a
 * longer window — these forms take far more than five minutes to fill in.
 */

const TTL_MS = 24 * 60 * 60 * 1000; // 24h

/** localStorage keys, one per form. */
export const DRAFT_KEYS = {
  attendance: "training-attendance-draft",
  workers: "training-workers-draft",
  reference: "training-reference-draft",
  feedback: "training-feedback-draft",
  card: "training-card-draft",
} as const;

export interface DraftEnvelope<T> {
  savedAt: number;
  data: T;
}

/**
 * The stored draft, or null when there is none, it has expired, or it is
 * unreadable. Safe to call from a useState initializer.
 */
export function readDraft<T = Record<string, any>>(
  key: string
): (T & { _savedAt: number }) | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftEnvelope<T>;
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > TTL_MS) {
      window.localStorage.removeItem(key);
      return null;
    }
    return { ...(parsed.data as any), _savedAt: parsed.savedAt };
  } catch {
    // Corrupt or from an older shape — drop it rather than crash the form.
    try {
      window.localStorage.removeItem(key);
    } catch {}
    return null;
  }
}

export function clearDraft(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {}
}

/**
 * Mirror `data` into localStorage whenever it changes.
 *
 * The very first render is treated as the baseline and never written, so an
 * untouched form leaves no draft behind. Returning to that baseline (the user
 * cleared everything, or restored a draft and undid their edits) removes the
 * draft instead of storing an empty one.
 */
export function useDraftAutosave(key: string, data: unknown, enabled: boolean): void {
  const json = JSON.stringify(data);
  const baseline = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (baseline.current === null) {
      baseline.current = json;
      return;
    }
    if (json === baseline.current) {
      clearDraft(key);
      return;
    }
    try {
      window.localStorage.setItem(
        key,
        JSON.stringify({ savedAt: Date.now(), data: JSON.parse(json) })
      );
    } catch {
      // Quota exceeded or storage disabled — drafting is a convenience, so
      // failing to save one must never interrupt filling in the form.
    }
  }, [key, json, enabled]);
}

/** "2:05 pm" — how a restored draft tells the user how old it is. */
export function draftTime(savedAt: number | null | undefined): string {
  if (!savedAt) return "";
  try {
    return new Date(savedAt).toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
