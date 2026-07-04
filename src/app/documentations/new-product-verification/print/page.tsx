"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import { docsApi } from "@/lib/api/documentations";
import SignatureCell from "@/components/ui/SignatureCell";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";

// ── Header metadata (CFPLA.C5.F.13). Issue/Revision values are not yet provided,
//    so they print as "Yet to fill" until the real values are supplied.
const TBD = "Yet to fill";
const HEADERS: Record<string, { issueDate: string; issueNo: string; revDate: string; revNo: string; documentNo: string }> = {
  A185: { issueDate: TBD, issueNo: TBD, revDate: TBD, revNo: TBD, documentNo: "CFPLB.C5.F.13" },
  W202: { issueDate: TBD, issueNo: TBD, revDate: TBD, revNo: TBD, documentNo: "CFPLA.C5.F.13" },
};

function fmt(date: string) {
  if (!date) return "";
  const parts = String(date).slice(0, 10).split("-");
  if (parts.length !== 3) return date;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

const val = (v: any) => (v == null || v === "" ? "" : String(v));

interface IngredientRow {
  ingredient?: string; variety?: string; vendor?: string; percentage?: string; specification?: string;
  protein?: string; fiber?: string; sugar?: string; energy?: string;
}
interface SensoryRow {
  panel_name?: string; taste?: string; odor?: string; appearance?: string; mouthfeel?: string; decision?: string; signature?: string;
}

const TRIAL_FIELDS: { key: string; label: string; date?: boolean }[] = [
  { key: "verify_date", label: "Date", date: true },
  { key: "product_name", label: "Product Name" },
  { key: "customer_name", label: "Customer Name" },
  { key: "trial_no", label: "Trial No" },
  { key: "persons_present", label: "Persons Present for Trial" },
  { key: "preroasting_temp", label: "Time & Temp for Preroasting (if applicable)" },
  { key: "batch_number", label: "Batch Number" },
  { key: "baking_temp", label: "Time & Temp for Baking/Roasting (if applicable)" },
  { key: "ingredient_changes", label: "Ingredients Changed/Replaced (if any)" },
  { key: "flow_chart", label: "Flow Chart/Line Used for Pilot Run" },
  { key: "equipment_added", label: "Equipment Added (if any)" },
];

const OPTIONAL_ING_COLS: { key: keyof IngredientRow; label: string }[] = [
  { key: "protein", label: "Protein" },
  { key: "fiber", label: "Fiber" },
  { key: "sugar", label: "Sugar" },
  { key: "energy", label: "Energy (kcal)" },
];

const CHEM_FIELDS: { key: string; label: string }[] = [
  { key: "moisture", label: "Moisture %" },
  { key: "fat", label: "Fat %" },
  { key: "acid_value", label: "Acid Value" },
  { key: "peroxide_value", label: "Peroxide Value" },
  { key: "salt", label: "Salt %" },
  { key: "ph", label: "pH" },
];

const PILOT_FIELDS: { key: string; label: string }[] = [
  { key: "lab_trial_name", label: "Lab Scale Trial Done By" },
  { key: "pilot_qty", label: "Quantity for Pilot Run (kg)" },
  { key: "pilot_batch", label: "Batch Number" },
  { key: "pilot_success", label: "Pilot Scale Production Done Successfully?" },
  { key: "pilot_persons", label: "Persons Present for Pilot Run" },
  { key: "packaging_material", label: "Packaging Material Used" },
  { key: "claims", label: "Any Claims for the Product" },
  { key: "regulatory", label: "Any Regulatory Details" },
  { key: "shelf_life", label: "Shelf Life of the Product" },
  { key: "storage_condition", label: "Storage Condition" },
  { key: "haccp_impact", label: "Chances of Hampering Process/HACCP?" },
  { key: "cross_contamination", label: "Cross Contamination Risk?" },
];

function KeyValueTable({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", marginTop: "4px" }}>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label}>
            <td style={{ ...tdInfo, width: "42%", fontWeight: "bold", background: "#fafafa" }}>{r.label}</td>
            <td style={tdInfo}>{r.value || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TrialBlock({ trial, index, multi }: { trial: any; index: number; multi: boolean }) {
  const ingredients: IngredientRow[] = Array.isArray(trial?.ingredients_used) ? trial.ingredients_used : [];
  const sensory: SensoryRow[] = Array.isArray(trial?.sensory_rows) ? trial.sensory_rows : [];
  // Show an optional ingredient column only when at least one row uses it.
  const activeOptional = OPTIONAL_ING_COLS.filter((c) => ingredients.some((r) => val(r[c.key])));

  return (
    <div style={{ marginTop: "14px" }}>
      <SectionTitle>{multi ? `Trial ${index + 1} — Trial Information` : "Trial Information"}</SectionTitle>
      <KeyValueTable rows={TRIAL_FIELDS.map((f) => ({ label: f.label, value: f.date ? fmt(trial?.[f.key]) : val(trial?.[f.key]) }))} />

      {ingredients.length > 0 && (
        <>
          <SubTitle>Ingredients List</SubTitle>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
            <thead>
              <tr>
                <th style={th}>Ingredient</th>
                <th style={th}>Variety</th>
                <th style={th}>Vendor</th>
                <th style={th}>Percentage (%)</th>
                <th style={th}>Specification / Preparation</th>
                {activeOptional.map((c) => (<th key={c.key} style={th}>{c.label}</th>))}
              </tr>
            </thead>
            <tbody>
              {ingredients.map((r, i) => (
                <tr key={i}>
                  <td style={td}>{val(r.ingredient)}</td>
                  <td style={td}>{val(r.variety)}</td>
                  <td style={td}>{val(r.vendor)}</td>
                  <td style={td}>{val(r.percentage)}</td>
                  <td style={{ ...td, textAlign: "left" }}>{val(r.specification)}</td>
                  {activeOptional.map((c) => (<td key={c.key} style={td}>{val(r[c.key])}</td>))}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {sensory.length > 0 && (
        <>
          <SubTitle>Sensory Analysis</SubTitle>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
            <thead>
              <tr>
                {["Panel", "Taste", "Odor", "Appearance", "Mouthfeel", "Decision", "Signature"].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sensory.map((r, i) => (
                <tr key={i}>
                  <td style={{ ...td, textAlign: "left" }}>{val(r.panel_name)}</td>
                  <td style={td}>{val(r.taste)}</td>
                  <td style={td}>{val(r.odor)}</td>
                  <td style={td}>{val(r.appearance)}</td>
                  <td style={td}>{val(r.mouthfeel)}</td>
                  <td style={td}>{val(r.decision)}</td>
                  <td style={{ ...td, padding: "1px 2px" }}>
                    <SignatureCell name={val(r.signature)} maxHeight={22} maxWidth={70} showName={false} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <SubTitle>Chemical Analysis</SubTitle>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
        <thead>
          <tr>{CHEM_FIELDS.map((c) => (<th key={c.key} style={th}>{c.label}</th>))}</tr>
        </thead>
        <tbody>
          <tr>{CHEM_FIELDS.map((c) => (<td key={c.key} style={td}>{val(trial?.[c.key])}</td>))}</tr>
        </tbody>
      </table>
    </div>
  );
}

function RecordSheet({ record }: { record: Record<string, any> }) {
  const header = HEADERS[getStoredWarehouse()] ?? HEADERS.W202;
  const trials: any[] = Array.isArray(record?.trials) && record.trials.length ? record.trials : [record];
  const pilots: any[] = Array.isArray(record?.pilots) && record.pilots.length ? record.pilots : [record];
  const multiTrial = trials.length > 1;
  const multiPilot = pilots.length > 1;

  return (
    <div
      className="bg-white mx-auto my-6 print:my-0 print:shadow-none print:w-full"
      style={{ width: "210mm", maxWidth: "100%", fontFamily: "'Calibri', 'Arial', sans-serif", color: "#000", boxShadow: "0 2px 20px rgba(0,0,0,.15)", padding: "10mm" }}
    >
      {/* Header */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
        <tbody>
          <tr>
            <td rowSpan={4} style={{ ...tdHead, width: "100px", textAlign: "center" }}>
              <img src="/candor-logo.jpg" alt="Candor" style={{ width: "75px" }} />
            </td>
            <td style={{ ...tdHead, fontWeight: "bold", textAlign: "center" }}>CANDOR FOODS PRIVATE LIMITED</td>
            <td style={tdHead}>Issue Date:</td>
            <td style={tdHead}>{header.issueDate}</td>
          </tr>
          <tr>
            <td rowSpan={2} style={{ ...tdHead, fontWeight: "bold", textAlign: "center" }}>Format: New Product Verification Record</td>
            <td style={tdHead}>Issue No:</td>
            <td style={tdHead}>{header.issueNo}</td>
          </tr>
          <tr>
            <td style={tdHead}>Revision Date:</td>
            <td style={tdHead}>{header.revDate}</td>
          </tr>
          <tr>
            <td style={{ ...tdHead, fontWeight: "bold", textAlign: "center" }}>Document No: {header.documentNo}</td>
            <td style={tdHead}>Revision No.:</td>
            <td style={tdHead}>{header.revNo}</td>
          </tr>
        </tbody>
      </table>

      {/* Trials */}
      {trials.map((trial, i) => (
        <TrialBlock key={i} trial={trial} index={i} multi={multiTrial} />
      ))}

      {/* Pilot Run Details */}
      {pilots.map((pilot, i) => (
        <div key={i} style={{ marginTop: "14px" }}>
          <SectionTitle>{multiPilot ? `Pilot ${i + 1} — Pilot Run Details` : "Pilot Run Details"}</SectionTitle>
          <KeyValueTable rows={PILOT_FIELDS.map((f) => ({ label: f.label, value: val(pilot?.[f.key]) }))} />
        </div>
      ))}

      {/* Approvals */}
      <SectionTitle>Approvals</SectionTitle>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", marginTop: "4px" }}>
        <tbody>
          <tr>
            {[
              { l: "Pilot Run Supervisor", k: "supervisor_name" },
              { l: "Production Manager", k: "production_manager_name" },
              { l: "Approved by (FSTL)", k: "approved_by_name" },
              { l: "Customer Representative", k: "customer_rep_name" },
            ].map((c) => (
              <td key={c.k} style={{ ...tdInfo, width: "25%", textAlign: "center", verticalAlign: "top" }}>
                <div style={{ minHeight: "34px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <SignatureCell name={val(record?.[c.k])} maxHeight={30} maxWidth={120} />
                </div>
                <div style={{ fontSize: "10px", fontWeight: "bold", marginTop: "2px", borderTop: "1px solid #000", paddingTop: "2px" }}>{c.l}</div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* Footer */}
      <div style={{ marginTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", fontWeight: "bold" }}>
        <span>Prepared By: FST</span>
        <div style={{ border: "2px solid #6b46c1", color: "#6b46c1", padding: "3px 12px", fontSize: "10px", textAlign: "center", lineHeight: 1.2 }}>
          CONTROLLED<br />COPY
        </div>
        <span>Approved By: FSTL</span>
      </div>
    </div>
  );
}

export default function NewProductVerificationPrintPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [records, setRecords] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const idsParam = searchParams.get("ids");
        const idParam = searchParams.get("id");
        let ids: number[] = [];
        if (idsParam) ids = idsParam.split(",").map((s) => parseInt(s.trim())).filter((n) => !isNaN(n));
        else if (idParam) { const n = parseInt(idParam); if (!isNaN(n)) ids = [n]; }
        if (ids.length > 0) {
          const results = await Promise.all(ids.map((id) => docsApi.get("new-product-verification", id)));
          setRecords(results.map((r) => r.data).filter(Boolean));
        }
      } catch (e) {
        console.error("Failed to load record:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-gray-600" size={36} />
          <p className="text-gray-600 text-sm">Loading record{records.length !== 1 ? "s" : ""}…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-300 print:bg-white">
      {/* Toolbar */}
      <div className="print:hidden sticky top-0 z-20 bg-white shadow-md px-5 py-3 flex items-center justify-between">
        <button
          onClick={() => router.push("/documentations/new-product-verification")}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
        >
          <ArrowLeft size={15} /> Back
        </button>
        <div className="flex items-center gap-3">
          {records.length > 1 && (<span className="text-sm text-gray-500 font-medium">{records.length} records</span>)}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
          >
            <Printer size={15} /> Print
          </button>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-20 text-gray-500">Record not found.</div>
      ) : (
        records.map((record, idx) => (
          <div key={record.id ?? idx} style={idx < records.length - 1 ? { pageBreakAfter: "always" } : undefined}>
            <RecordSheet record={record} />
          </div>
        ))
      )}

      <style>{`
        @media print {
          html, body { background: white !important; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          @page { size: A4 portrait; margin: 6mm; }
          .print\\:w-full { width: 100% !important; max-width: 100% !important; margin: 0 !important; }
        }
      `}</style>
    </div>
  );
}

const tdHead: React.CSSProperties = { border: "1px solid #000", padding: "4px 6px", verticalAlign: "middle", fontSize: "11px" };
const tdInfo: React.CSSProperties = { border: "1px solid #000", padding: "5px 6px", verticalAlign: "middle", fontSize: "11px" };
const th: React.CSSProperties = { border: "1px solid #000", padding: "4px 4px", textAlign: "center", fontWeight: "bold", fontSize: "10px", verticalAlign: "middle", background: "#f0f0f0" };
const td: React.CSSProperties = { border: "1px solid #000", padding: "3px 4px", textAlign: "center", verticalAlign: "middle", fontSize: "10px" };

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginTop: "12px", marginBottom: "2px", fontSize: "12px", fontWeight: "bold", background: "#e8e8e8", padding: "4px 8px", border: "1px solid #000" }}>
      {children}
    </div>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginTop: "8px", marginBottom: "2px", fontSize: "11px", fontWeight: "bold", color: "#333" }}>{children}</div>
  );
}
