"use client";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { uploadReviewImage, deleteReviewImage, validateReviewImage } from "@/lib/api/traceabilityDocs";

/*
 * Documents Review Checklist — shared by the Traceability Report
 * (CFPLA.C3.F.30) and the Mock Recall (CFPLA.C3.F.31).
 *
 * Both formats review the same document set for the same batch, so the answers
 * and the supporting photos live here rather than being duplicated in each
 * form. The create page owns one answer set across its two tabs; each record
 * still files its own copy into its own `documents_review` jsonb column.
 */

/** The document set, in the order printed on both formats. */
export const TRACE_DOCS = [
  "Sales order contract",
  "Job Card Issuance",
  "Raw Material Purchase Order",
  "Raw material invoice (GRN)",
  "Incoming Vehicle Inspection record",
  "Fumigation Record (if applicable)",
  "RM quality Inspection Report",
  "RM Issuance Record",
  "Pre-production Inspection Checklist",
  "Daily Cleaning",
  "Equipment Cleaning Record",
  "CCP Monitoring Record",
  "Product weight & sealing check",
  "In-process quality check",
  "X-ray / Metal detection record",
  "Finished Good COA",
  "Dispatch Record",
];

/** One document's review: the Yes/No answer plus any supporting photos. */
export interface DocReviewEntry {
  status: "Yes" | "No" | "";
  images: string[];
}

/** Answers keyed by document name. */
export type DocReview = Record<string, DocReviewEntry>;

const EMPTY: DocReviewEntry = { status: "", images: [] };

/**
 * Rebuild the answer map from the stored `documents_review` jsonb.
 *
 * Accepts every shape the column has held: the current
 * [{document, status, images}], the [{document, status}] that predates photos,
 * the older [{document, checked}], and the plain {document: status} map.
 */
export function readDocReview(src: any): DocReview {
  const out: DocReview = {};
  const put = (doc: string, status: any, images: any) => {
    out[doc] = {
      status: status === "Yes" || status === "No" ? status : "",
      images: Array.isArray(images) ? images.filter((u) => typeof u === "string" && u) : [],
    };
  };

  if (Array.isArray(src)) {
    for (const r of src) {
      if (!r || typeof r !== "object" || !r.document) continue;
      // `image_url` is not a shape this app ever wrote, but a single-URL key is
      // the obvious thing to hand-patch a row with, so it is read too.
      const images = Array.isArray(r.images) ? r.images : r.image_url ? [r.image_url] : [];
      put(r.document, r.status ?? (r.checked ? "Yes" : ""), images);
    }
  } else if (src && typeof src === "object") {
    for (const [k, v] of Object.entries(src)) {
      if (v === "Yes" || v === "No") put(k, v, []);
    }
  }
  return out;
}

/**
 * Serialize for the `documents_review` column.
 *
 * A document is filed when it has an answer OR a photo — answering nothing but
 * attaching evidence is a real state, and dropping it would lose the upload.
 * `images` is omitted when empty so untouched records keep the exact shape they
 * have always had.
 */
export function buildDocReviewPayload(value: DocReview): Array<Record<string, any>> {
  return TRACE_DOCS.filter((doc) => value[doc]?.status || value[doc]?.images?.length).map((doc) => {
    const entry = value[doc];
    return {
      document: doc,
      status: entry.status,
      ...(entry.images.length ? { images: entry.images } : {}),
    };
  });
}

interface Props {
  value: DocReview;
  onChange: React.Dispatch<React.SetStateAction<DocReview>>;
  /** Only shapes the S3 object name, so the flat folder stays browsable. */
  batchNumber?: string;
}

export default function DocumentsReviewChecklist({ value, onChange, batchNumber }: Props) {
  // Uploads in flight and the last failure, both keyed by document name so one
  // slow or failed row never blocks the others.
  const [uploading, setUploading] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const patch = (doc: string, fn: (entry: DocReviewEntry) => DocReviewEntry) =>
    onChange((prev) => ({ ...prev, [doc]: fn(prev[doc] ?? EMPTY) }));

  const setStatus = (doc: string, v: "Yes" | "No") =>
    patch(doc, (e) => ({ ...e, status: e.status === v ? "" : v }));

  const handleFiles = async (doc: string, files: FileList | null) => {
    if (!files?.length) return;
    const picked = Array.from(files);
    setErrors((p) => ({ ...p, [doc]: "" }));

    for (const file of picked) {
      const invalid = validateReviewImage(file);
      if (invalid) {
        setErrors((p) => ({ ...p, [doc]: invalid }));
        continue;
      }
      setUploading((p) => ({ ...p, [doc]: (p[doc] || 0) + 1 }));
      try {
        const url = await uploadReviewImage(file, { batch: batchNumber, document: doc });
        patch(doc, (e) => ({ ...e, images: [...e.images, url] }));
      } catch (err: any) {
        setErrors((p) => ({ ...p, [doc]: err?.message || "Upload failed" }));
      } finally {
        setUploading((p) => ({ ...p, [doc]: Math.max(0, (p[doc] || 1) - 1) }));
      }
    }
  };

  const removeImage = (doc: string, url: string) => {
    // Drop it from the form first: an orphaned S3 object is less harmful than a
    // thumbnail the user cannot get rid of, so the delete is best-effort.
    patch(doc, (e) => ({ ...e, images: e.images.filter((u) => u !== url) }));
    void deleteReviewImage(url);
  };

  return (
    <section className="surface-card overflow-hidden">
      <header className="px-4 sm:px-5 py-3 border-b border-cream-300 bg-cream-100/60">
        <h2 className="text-sm font-bold text-ink-600">Documents Review Checklist</h2>
        <p className="text-[11px] text-ink-400 mt-0.5">
          Attach a photo of each document as supporting evidence — JPEG, PNG or WebP, up to 10MB each.
        </p>
      </header>
      <div className="divide-y divide-cream-300">
        {TRACE_DOCS.map((doc, i) => {
          const entry = value[doc] ?? EMPTY;
          const busy = (uploading[doc] || 0) > 0;
          return (
            <div key={i} className="px-4 sm:px-5 py-2 hover:bg-cream-100/60">
              <div className="flex items-center gap-3">
                <span className="w-6 text-xs text-ink-400 font-medium">{i + 1}.</span>
                <span className="flex-1 text-sm text-ink-500">{doc}</span>

                {/* Plain buttons, not a label wrapping an `sr-only` radio: the hidden
                    radio is absolutely positioned against the app's `fixed inset-0`
                    shell, so focusing it made the browser scroll <main> far past the
                    content and the page went blank. */}
                <div className="flex gap-1.5 shrink-0" role="radiogroup" aria-label={doc}>
                  {(["Yes", "No"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={entry.status === v}
                      onClick={() => setStatus(doc, v)}
                      className={`px-2.5 py-1 !min-h-0 rounded-md border text-[11px] font-semibold cursor-pointer transition-colors ${
                        entry.status === v
                          ? v === "Yes"
                            ? "bg-success-50 border-success-200 text-success-700"
                            : "bg-danger-50 border-danger-200 text-danger-600"
                          : "border-cream-300 text-ink-400 hover:bg-cream-100"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>

                {/* File input kept out of the layout and clicked through the ref,
                    so nothing focusable is positioned against the fixed shell. */}
                <input
                  ref={(el) => {
                    inputs.current[doc] = el;
                  }}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    void handleFiles(doc, e.target.files);
                    // Reset so picking the same file again still fires onChange.
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => inputs.current[doc]?.click()}
                  disabled={busy}
                  title={`Attach a photo of ${doc}`}
                  aria-label={`Attach a photo of ${doc}`}
                  className="shrink-0 inline-flex items-center gap-1 px-2 py-1 !min-h-0 rounded-md border border-cream-300 text-[11px] font-semibold text-ink-400 hover:bg-cream-100 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{busy ? "Uploading" : "Photo"}</span>
                  {entry.images.length > 0 && (
                    <span className="text-brand-500">({entry.images.length})</span>
                  )}
                </button>
              </div>

              {entry.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 ml-9">
                  {entry.images.map((url) => (
                    <div key={url} className="relative group">
                      <a href={url} target="_blank" rel="noopener noreferrer" title="Open full size">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={doc}
                          className="w-16 h-16 object-cover rounded-md border border-cream-300"
                        />
                      </a>
                      <button
                        type="button"
                        onClick={() => removeImage(doc, url)}
                        aria-label={`Remove photo from ${doc}`}
                        className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center w-5 h-5 !min-h-0 rounded-full bg-white border border-cream-300 text-ink-400 hover:text-danger-600 hover:bg-danger-50 shadow-soft"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {errors[doc] && <p className="text-[11px] text-danger-600 mt-1 ml-9">{errors[doc]}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
