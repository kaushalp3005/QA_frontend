"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import { docsApi } from "@/lib/api/documentations";
import SignatureCell from "@/components/ui/SignatureCell";

const FORM_TYPE = "weighingscalecalibration";
const MIN_ROWS = 12;

const READINGS = ["reading1", "reading2", "reading3", "reading4", "reading5"] as const;

// Canonical floor order for the per-floor pages (matches the create form).
const FLOOR_ORDER = [
  "Lower Basement", "Upper Basement", "First Floor", "First Floor Mezz", "Second Floor", "Terrace",
];
const floorRank = (loc: string) => {
  const i = FLOOR_ORDER.indexOf(loc);
  return i === -1 ? FLOOR_ORDER.length : i;
};

function fmtDate(d?: string) {
  if (!d) return "";
  const parts = String(d).split("-");
  if (parts.length !== 3) return d;
  const [y, m, day] = parts;
  return `${day}/${m}/${y}`;
}

const show = (v: any) => (v === null || v === undefined || v === "" ? "" : String(v));

/** One printed page = one floor (location group): header + grid + sign-offs + footer. */
function FloorSheet({ record, floorLabel, rows }: { record: Record<string, any>; floorLabel: string; rows: any[] }) {
  const blankRows = Math.max(0, MIN_ROWS - rows.length);
  return (
    <div
      className="bg-white mx-auto my-6 print:my-0 print:shadow-none print:w-full"
      style={{
        width: "297mm",
        maxWidth: "100%",
        fontFamily: "'Calibri', 'Arial', sans-serif",
        color: "#000",
        boxShadow: "0 2px 20px rgba(0,0,0,.15)",
        padding: "8mm",
      }}
    >
      {/* Header (repeats on every floor page) */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
        <tbody>
          <tr>
            <td rowSpan={4} style={{ ...tdHead, width: "120px", textAlign: "center" }}>
              <img src="/candor-logo.jpg" alt="Candor" style={{ width: "75px" }} />
            </td>
            <td style={{ ...tdHead, fontWeight: "bold", textAlign: "center" }}>CANDOR FOODS PRIVATE LIMITED</td>
            <td style={tdHead}>Issue Date:</td>
            <td style={tdHead}>01/08/2020</td>
          </tr>
          <tr>
            <td rowSpan={2} style={{ ...tdHead, fontWeight: "bold", textAlign: "center" }}>
              FORMAT: In-house Weighing scale calibration Record
            </td>
            <td style={tdHead}>Issue No:</td>
            <td style={tdHead}>04</td>
          </tr>
          <tr>
            <td style={tdHead}>Revision Date:</td>
            <td style={tdHead}>01/10/2025</td>
          </tr>
          <tr>
            <td style={{ ...tdHead, fontWeight: "bold", textAlign: "center" }}>Document No : CFPLA.C6.F.41</td>
            <td style={tdHead}>Revision No.:</td>
            <td style={tdHead}>03</td>
          </tr>
        </tbody>
      </table>

      {/* Date of inspection + Floor + Frequency */}
      <div style={{ marginTop: "8px", marginBottom: "4px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", fontWeight: "bold" }}>
        <span>
          Date of inspection: <span style={{ fontWeight: "normal" }}>{fmtDate(record?.inspection_date)}</span>
          <span style={{ marginLeft: "24px" }}>Floor / Location: <span style={{ fontWeight: "normal" }}>{floorLabel}</span></span>
        </span>
        <span>Frequency: Daily (Before starting the production)</span>
      </div>

      {/* Calibration grid */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
        <thead>
          <tr>
            <th style={{ ...th, width: "30px" }}>Sr No</th>
            <th style={{ ...th, width: "90px" }}>Identification No.</th>
            <th style={{ ...th, width: "60px" }}>Capacity in Kg</th>
            <th style={{ ...th, width: "90px" }}>Location</th>
            <th style={{ ...th, width: "70px" }}>Standard Weight Used</th>
            <th style={th}>Reading 1</th>
            <th style={th}>Reading 2</th>
            <th style={th}>Reading 3</th>
            <th style={th}>Reading 4</th>
            <th style={th}>Reading 5</th>
            <th style={{ ...th, width: "90px" }}>Deviation, if any/Remark</th>
            <th style={{ ...th, width: "110px" }}>Corrective action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td style={td}>{i + 1}</td>
              <td style={{ ...td, fontWeight: "bold" }}>{show(r.identification_no)}</td>
              <td style={td}>{show(r.capacity_kg)}</td>
              <td style={{ ...td, textAlign: "left", paddingLeft: "4px" }}>{show(r.location)}</td>
              <td style={td}>{show(r.standard_weight_used)}</td>
              {READINGS.map((rf) => (
                <td key={rf} style={td}>{show(r[rf])}</td>
              ))}
              <td style={td}>{show(r.deviation)}</td>
              <td style={{ ...td, textAlign: "left", paddingLeft: "4px" }}>{show(r.corrective_action)}</td>
            </tr>
          ))}
          {Array.from({ length: blankRows }).map((_, i) => (
            <tr key={`b-${i}`}>
              {Array.from({ length: 12 }).map((__, j) => (
                <td key={j} style={{ ...td, height: "22px" }}>&nbsp;</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Sign-offs (repeat on every floor page) */}
      <div style={{ marginTop: "18px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: "11px", fontWeight: "bold" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "6px" }}>
          <span>Calibrated By:</span>
          <SignatureCell name={record?.calibrated_by} maxHeight={32} maxWidth={120} />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "6px" }}>
          <span>Verified By:</span>
          <SignatureCell name={record?.verified_by} maxHeight={32} maxWidth={120} />
        </div>
      </div>

      {/* Footer (repeats on every floor page) */}
      <div style={{ marginTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", fontWeight: "bold" }}>
        <span>Prepared By: FST</span>
        <div style={{ border: "2px solid #6b46c1", color: "#6b46c1", padding: "3px 12px", fontSize: "10px", textAlign: "center", lineHeight: 1.2 }}>
          CONTROLLED<br />COPY
        </div>
        <span>Approved By: FSTL</span>
      </div>
    </div>
  );
}

export default function WeighingScalePrintPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recordId = searchParams.get("id");
  const [record, setRecord] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!recordId) { setLoading(false); return; }
      try {
        setLoading(true);
        const res = await docsApi.get(FORM_TYPE, Number(recordId));
        setRecord(res.data);
      } catch (e) {
        console.error("Failed to load record:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [recordId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-gray-600" size={36} />
          <p className="text-gray-600 text-sm">Loading record…</p>
        </div>
      </div>
    );
  }

  // Group the record's rows by Location (= floor) — one printed page per floor.
  const rows: any[] = Array.isArray(record?.rows) ? record!.rows : [];
  const groupMap = new Map<string, any[]>();
  for (const r of rows) {
    const key = (r.location || "").trim() || "—";
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(r);
  }
  const groups = Array.from(groupMap.entries()).sort(
    (a, b) => floorRank(a[0]) - floorRank(b[0]) || a[0].localeCompare(b[0])
  );

  return (
    <div className="min-h-screen bg-gray-300 print:bg-white">
      <div className="print:hidden sticky top-0 z-20 bg-white shadow-md px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/documentations/weighingscalecalibration")}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            <ArrowLeft size={15} /> Back
          </button>
          <span className="text-sm text-gray-500">
            {record
              ? `${fmtDate(record.inspection_date) || "—"} · ${groups.length} floor${groups.length !== 1 ? "s" : ""}`
              : "No record"}
          </span>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-md"
        >
          <Printer size={15} /> Print
        </button>
      </div>

      {!record || groups.length === 0 ? (
        <div className="text-center text-gray-500 py-20">No record found to print.</div>
      ) : (
        groups.map(([floorLabel, floorRows], idx) => (
          <div key={floorLabel} style={idx < groups.length - 1 ? { pageBreakAfter: "always" } : undefined}>
            <FloorSheet record={record} floorLabel={floorLabel} rows={floorRows} />
          </div>
        ))
      )}

      <style>{`
        @media print {
          html, body { background: white !important; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          @page { size: A4 landscape; margin: 6mm; }
          .print\\:w-full { width: 100% !important; max-width: 100% !important; margin: 0 !important; }
        }
      `}</style>
    </div>
  );
}

const tdHead: React.CSSProperties = {
  border: "1px solid #000",
  padding: "4px 6px",
  verticalAlign: "middle",
  fontSize: "11px",
};

const th: React.CSSProperties = {
  border: "1px solid #000",
  padding: "4px 3px",
  textAlign: "center",
  fontWeight: "bold",
  fontSize: "9px",
  verticalAlign: "middle",
  background: "#fff",
};

const td: React.CSSProperties = {
  border: "1px solid #000",
  padding: "3px 3px",
  textAlign: "center",
  verticalAlign: "middle",
  fontSize: "9px",
  height: "20px",
};
