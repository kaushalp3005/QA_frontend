"use client";

import { useEffect, useState } from "react";
import { getStoredWarehouse, type WarehouseCode } from "@/components/ui/WarehouseSelector";

/**
 * Controlled-header values for the training formats, per plant.
 *
 * A-185 files these records under its own CFPLB series with its own issue and
 * revision history; W-202 keeps the CFPLA series. Same layout, different
 * document — an A-185 sheet printed with a CFPLA number is the wrong document
 * to an auditor.
 *
 * This table exists because the print pages already knew the A-185 values while
 * the on-screen forms hardcoded the CFPLA ones, so a form and its own print
 * page disagreed. One source now feeds both.
 */
export interface TrainingDoc {
  no: string;
  title: string;
  issueDate: string;
  issueNo: string;
  /** Blank where the plant's sheet is still on its first issue. */
  revisionDate: string;
  revisionNo: string;
}

export const TRAINING_DOCS = {
  attendanceSheet: {
    W202: {
      no: "CFPLA.C7.F.03",
      title: "TRAINING ATTENDENCE SHEET & RECORD FOR EVALUATION /EFFECTIVENESS OF TRAINING",
      issueDate: "01/11/2017",
      issueNo: "03",
      revisionDate: "27/09/2025",
      revisionNo: "02",
    },
    A185: {
      no: "CFPLB.C7.F.07",
      title: "FORMAT: TRAINING ATTENDENCE SHEET & RECORD FOR EVALUATION /EFFECTIVENESS OF TRAINING",
      issueDate: "04/08/2021",
      issueNo: "03",
      revisionDate: "02/02/2026",
      revisionNo: "02",
    },
  },
  trainingCard: {
    W202: {
      no: "CFPLA.C7.F.03k",
      title: "Training Card",
      issueDate: "01/11/2017",
      issueNo: "03",
      revisionDate: "01/11/2025",
      revisionNo: "02",
    },
    A185: {
      no: "CFPLB.C7.F.07 c",
      title: "Training Card",
      issueDate: "02/02/2026",
      issueNo: "01",
      // A-185's card is still on its first issue — no revision yet, and these
      // cells print blank exactly as on the paper format.
      revisionDate: "",
      revisionNo: "",
    },
  },
} as const;

export type TrainingFormKey = keyof typeof TRAINING_DOCS;

/** The header block for one training format at one plant. Anything that is not
 *  A185 falls to W202, matching how the print pages already decide. */
export function trainingDocFor(form: TrainingFormKey, warehouse?: string): TrainingDoc {
  return TRAINING_DOCS[form][warehouse === "A185" ? "A185" : "W202"];
}

/**
 * The one-line meta string the form headers show, e.g.
 * "Issue 03 · Rev 02 · 27/09/2025".
 *
 * A plant still on its first issue has no revision, so the Rev segment is
 * dropped rather than printed empty as "Rev  · ".
 */
export function trainingDocMeta(doc: TrainingDoc): string {
  const parts = [`Issue ${doc.issueNo}`];
  if (doc.revisionNo) parts.push(`Rev ${doc.revisionNo}`);
  const date = doc.revisionDate || doc.issueDate;
  if (date) parts.push(date);
  return parts.join(" · ");
}

/**
 * The active plant, kept in step with the header selector.
 *
 * Reading `getStoredWarehouse()` once is not enough: switching plant fires
 * `warehouseChanged` without remounting the form, which is exactly how a form
 * ends up showing one plant's document number while the selector reads the
 * other. Starts at W202 on the server and syncs on mount, so the markup the
 * server renders matches the client's first paint.
 */
export function useWarehouse(): WarehouseCode {
  const [warehouse, setWarehouse] = useState<WarehouseCode>("W202");

  useEffect(() => {
    setWarehouse(getStoredWarehouse());
    const handler = (e: Event) => {
      const next = (e as CustomEvent).detail?.warehouse;
      if (next === "A185" || next === "W202") setWarehouse(next);
    };
    window.addEventListener("warehouseChanged", handler);
    return () => window.removeEventListener("warehouseChanged", handler);
  }, []);

  return warehouse;
}
