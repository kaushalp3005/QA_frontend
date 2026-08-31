"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

/** Either the timestamp stored, or why nothing was. */
type WriteResult =
  | { savedAt: number; error: null }
  | { savedAt: null; error: string };

/**
 * Store `json` (already serialised form data) under `key`.
 *
 * Drafting is a convenience, so a failure must never interrupt filling in the
 * form — but it must not be silent either. Swallowing the exception here is
 * what made a refused write look like a dead "Save draft" button: nothing was
 * stored, and nothing said so. The reason comes back to the caller and the
 * original error goes to the console.
 */
function writeJson(key: string, json: string): WriteResult {
  const savedAt = Date.now();
  try {
    window.localStorage.setItem(key, JSON.stringify({ savedAt, data: JSON.parse(json) }));
    return { savedAt, error: null };
  } catch (e) {
    const quota =
      e instanceof Error && /quota|exceeded|full/i.test(`${e.name} ${e.message}`);
    console.warn(`[draft] could not store "${key}" — the draft was NOT saved:`, e);
    return {
      savedAt: null,
      error: quota
        ? "Out of space for drafts on this device — clear some browser storage and try again."
        : "This browser is blocking storage, so the draft can't be kept on this device.",
    };
  }
}

/** Save `data` as the draft for `key` right now. */
export function writeDraft(key: string, data: unknown): number | null {
  return writeJson(key, JSON.stringify(data)).savedAt;
}

/** What a form needs to show and drive its own partial save. */
export interface DraftState {
  /** When the draft was last written, or null when there is nothing stored. */
  savedAt: number | null;
  /** Whether the form holds anything worth saving. */
  dirty: boolean;
  /** Why the last write failed, or null while drafts are storing fine. */
  error: string | null;
  /** Write the draft immediately — the "Save draft" button. */
  saveNow: () => void;
  /** Drop the draft and report as unsaved — after the record is actually filed. */
  forget: () => void;
}

/**
 * Mirror `data` into localStorage whenever it changes, and hand back the state
 * a form needs to show the user that it did.
 *
 * The very first render is treated as the baseline and never written, so an
 * untouched form leaves no draft behind. Returning to that baseline (the user
 * cleared everything, or restored a draft and undid their edits) removes the
 * draft instead of storing an empty one.
 *
 * `restoredAt` is the timestamp of a draft this form was seeded from, so a
 * restored draft reports as already saved rather than as nothing.
 */
export function useDraftAutosave(
  key: string,
  data: unknown,
  enabled: boolean,
  restoredAt?: number | null
): DraftState {
  const json = JSON.stringify(data);
  const baseline = useRef<string | null>(null);
  // The button fires outside render, so it needs the current data by ref.
  const latest = useRef(json);
  latest.current = json;

  const [savedAt, setSavedAt] = useState<number | null>(restoredAt ?? null);
  const [dirty, setDirty] = useState<boolean>(Boolean(restoredAt));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (baseline.current === null) {
      baseline.current = json;
      return;
    }
    if (json === baseline.current) {
      // Back at the state this form started from. On a pristine form that means
      // there is nothing worth keeping. But when the form was SEEDED from a
      // draft, "back at baseline" means it now matches that draft exactly —
      // deleting it there threw away the very work that had just been restored,
      // and left the bar reading "Nothing saved yet" over a form full of typing.
      if (restoredAt) {
        setSavedAt(restoredAt);
        setDirty(true);
        setError(null);
        return;
      }
      clearDraft(key);
      setSavedAt(null);
      setDirty(false);
      setError(null);
      return;
    }
    setDirty(true);
    const res = writeJson(key, json);
    // A failed write leaves the previous timestamp alone — that older draft is
    // still on disk, it is just stale now. The error says so.
    if (res.savedAt) {
      setSavedAt(res.savedAt);
      setError(null);
    } else {
      setError(res.error);
    }
  }, [key, json, enabled, restoredAt]);

  const saveNow = useCallback(() => {
    if (!enabled) return;
    const res = writeJson(key, latest.current);
    setDirty(true);
    if (res.savedAt) {
      setSavedAt(res.savedAt);
      setError(null);
    } else {
      setError(res.error);
    }
  }, [key, enabled]);

  const forget = useCallback(() => {
    clearDraft(key);
    setSavedAt(null);
    setDirty(false);
    setError(null);
    // The filed record is the new baseline: without this, the next keystroke
    // would compare against the pre-submit state and re-save what was just filed.
    baseline.current = latest.current;
  }, [key]);

  return { savedAt, dirty, error, saveNow, forget };
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
