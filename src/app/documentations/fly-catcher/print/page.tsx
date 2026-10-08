"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import { docsApi } from "@/lib/api/documentations";
import SignatureCell from "@/components/ui/SignatureCell";

const FORM_TYPE = "fly-catcher";
// The paper sheet has nine ruled rows; a short round is padded out to match.
const MIN_ROWS = 9;

// W202's sheet, "37) CFPLA.C7.F.37 Daily Checks for fly catcher (EFC)- Inhouse".
// The header block on that sheet reads Document No CFPLA.C7.F.36 and is
// reproduced as printed. Only W202 has a print layout — see printWarehouses in
// config/doc-forms.ts.
const HEADER = {
  format: "Daily Checks for fly catcher (EFC)- Inhouse",
  documentNo: "CFPLA.C7.F.36",
  issueDate: "21/02/2025",
  issueNo: "01",
  revDate: "",
  revNo: "",
};

function fmtDate(d?: string) {
  if (!d) return "";
  const parts = String(d).split("-");
  if (parts.length !== 3) return d;
  const [y, m, day] = parts;
  return `${day}/${m}/${y}`;
}

const show = (v: any) => (v === null || v === undefined || v === "" ? "" : String(v));

const COLUMNS: { label: React.ReactNode; width?: string }[] = [
  { label: "Locations", width: "15%" },
  { label: <>Flycatcher<br />No.</>, width: "7%" },
  { label: "Date", width: "8%" },
  { label: <>Glue Pad<br />Cleaned/ Uncleaned</>, width: "11%" },
  { label: <>Flies Qty<br />weight<br />(gms)</>, width: "7%" },
  { label: <>Integrity of<br />tubelights</>, width: "8%" },
  { label: <>Done<br />by</>, width: "9%" },
  { label: "Observation", width: "13%" },
  { label: <>Corrective<br />Taken if any</>, width: "12%" },
  { label: <>Verified<br />By</>, width: "10%" },
];

function FlyCatcherPrint() {
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

  const rows: any[] = Array.isArray(record?.rows) ? record!.rows : [];
  const blankRows = Math.max(0, MIN_ROWS - rows.length);
  const firstDate = rows.find((r) => r.date)?.date;

  return (
    <div className="min-h-screen bg-gray-300 print:bg-white">
      <div className="print:hidden sticky top-0 z-20 bg-white shadow-md px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/documentations/fly-catcher")}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            <ArrowLeft size={15} /> Back
          </button>
          <span className="text-sm text-gray-500">
            {record ? `${fmtDate(firstDate) || "—"} · ${rows.length} catcher${rows.length !== 1 ? "s" : ""}` : "No record"}
          </span>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-md"
        >
          <Printer size={15} /> Print
        </button>
      </div>

      {!record ? (
        <div className="text-center text-gray-500 py-20">No record found to print.</div>
      ) : (
        <div
          className="bg-white mx-auto my-6 print:my-0 print:shadow-none print:w-full"
          style={{
            width: "297mm",
            maxWidth: "100%",
            fontFamily: "'Calibri', 'Arial', sans-serif",
            color: "#000",
            boxShadow: "0 2px 20px rgba(0,0,0,.15)",
            padding: "10mm",
          }}
        >
          {/* Header */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <tbody>
              <tr>
                <td rowSpan={4} style={{ ...tdHead, width: "150px", textAlign: "center" }}>
                  <img src="/candor-logo.jpg" alt="Candor" style={{ width: "90px" }} />
                </td>
                <td style={{ ...tdHead, fontWeight: "bold", textAlign: "center", fontSize: "14px" }}>CANDOR FOODS PRIVATE LIMITED</td>
                <td style={{ ...tdHead, width: "140px" }}>Issue Date:</td>
                <td style={{ ...tdHead, width: "130px" }}>{HEADER.issueDate}</td>
              </tr>
              <tr>
                <td rowSpan={2} style={{ ...tdHead, fontWeight: "bold", textAlign: "center" }}>
                  Format: {HEADER.format}
                </td>
                <td style={tdHead}>Issue No:</td>
                <td style={tdHead}>{HEADER.issueNo}</td>
              </tr>
              <tr>
                <td style={tdHead}>Revision Date:</td>
                <td style={tdHead}>{HEADER.revDate}</td>
              </tr>
              <tr>
                <td style={{ ...tdHead, fontWeight: "bold", textAlign: "center" }}>Document No: {HEADER.documentNo}</td>
                <td style={tdHead}>Revision No.:</td>
                <td style={tdHead}>{HEADER.revNo}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: "14px", marginBottom: "8px", marginLeft: "12px", fontSize: "12px", fontWeight: "bold" }}>
            Frequency: Weekly
          </div>

          {/* Checks grid */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px", tableLayout: "fixed" }}>
            <thead>
              <tr>
                {COLUMNS.map((c, i) => (
                  <th key={i} style={{ ...th, width: c.width }}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ ...td, textAlign: "left", paddingLeft: "4px" }}>{show(r.location)}</td>
                  <td style={td}>{show(r.fly_catcher_no)}</td>
                  <td style={td}>{fmtDate(r.date)}</td>
                  <td style={td}>{show(r.glue_pad_status)}</td>
                  <td style={td}>{show(r.flies_weight)}</td>
                  <td style={td}>{show(r.integrity_tubelights)}</td>
                  <td style={td}><SignatureCell name={r.done_by} warehouse="W202" maxHeight={22} maxWidth={80} /></td>
                  <td style={{ ...td, textAlign: "left", paddingLeft: "4px" }}>{show(r.observation)}</td>
                  <td style={{ ...td, textAlign: "left", paddingLeft: "4px" }}>{show(r.corrective_action)}</td>
                  <td style={td}><SignatureCell name={r.verified_by} warehouse="W202" maxHeight={22} maxWidth={80} /></td>
                </tr>
              ))}
              {Array.from({ length: blankRows }).map((_, i) => (
                <tr key={`b-${i}`}>
                  {COLUMNS.map((__, j) => (
                    <td key={j} style={{ ...td, height: "30px" }}>&nbsp;</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div style={{ marginTop: "40px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", padding: "0 30px" }}>
            <span>Prepared By:FST</span>
            <div style={{ border: "2px solid #4c1d95", color: "#4c1d95", padding: "3px 10px", fontSize: "11px", textAlign: "center", lineHeight: 1.2, fontWeight: "bold" }}>
              CONTROLLED<br />COPY
            </div>
            <span>Approved By:FSTL</span>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          html, body { background: white !important; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          @page { size: A4 landscape; margin: 8mm; }
          .print\\:w-full { width: 100% !important; max-width: 100% !important; margin: 0 !important; }
          tr { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}

export default function FlyCatcherPrintPage() {
  // useSearchParams needs a Suspense boundary to keep the page prerenderable.
  return (
    <Suspense fallback={null}>
      <FlyCatcherPrint />
    </Suspense>
  );
}

const tdHead: React.CSSProperties = {
  border: "1px solid #000",
  padding: "4px 8px",
  verticalAlign: "middle",
  fontSize: "12px",
};

const th: React.CSSProperties = {
  border: "1px solid #000",
  padding: "6px 3px",
  textAlign: "center",
  fontWeight: "bold",
  fontSize: "11px",
  verticalAlign: "top",
  background: "#fff",
};

const td: React.CSSProperties = {
  border: "1px solid #000",
  padding: "3px 3px",
  textAlign: "center",
  verticalAlign: "middle",
  fontSize: "10px",
  height: "26px",
  wordBreak: "break-word",
};
