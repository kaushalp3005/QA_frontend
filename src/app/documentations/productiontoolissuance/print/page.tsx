"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import { docsApi } from "@/lib/api/documentations";
import SignatureCell from "@/components/ui/SignatureCell";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";

/** Print header block — varies per plant (document no., issue/revision dates). */
const HEADERS: Record<string, { issueDate: string; issueNo: string; revisionDate: string; revisionNo: string; documentNo: string }> = {
  A185: {
    issueDate: "02/01/2024",
    issueNo: "02",
    revisionDate: "02/02/2026",
    revisionNo: "01",
    documentNo: "CFPLB.C4.F.25",
  },
  W202: {
    issueDate: "08/02/2023",
    issueNo: "03",
    revisionDate: "01/10/2025",
    revisionNo: "02",
    documentNo: "CFPLA.C4.F.22",
  },
};

const TOOLS = ["SIEVES", "SCOOPS", "Scissors/Knife", "SS BOWLS", "SS GLASS", "HAND MAGNET", "Gloves"];
const PARAMETERS = [
  "Quantity Issued",
  "Condition at issuance",
  "Quantity Received",
  "Condition when Received",
  "Cleaning up Starting of production + after each product Change",
];

function fmt(date: string) {
  if (!date) return "";
  const parts = date.split("-");
  if (parts.length !== 3) return date;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

interface ToolBlock {
  date?: string;
  data?: Record<string, Record<string, string>>;
  remark?: string;
  checked_by?: string;
  verified_by?: string;
}

export default function ProductionToolIssuancePrintPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recordId = searchParams.get("id");
  const [record, setRecord] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        if (recordId) {
          const res = await docsApi.get("productiontoolissuance", Number(recordId));
          setRecord(res.data);
        }
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

  const blocks: ToolBlock[] = Array.isArray(record?.tool_matrix) && record!.tool_matrix.length > 0
    ? record!.tool_matrix
    : [{ date: record?.check_date, data: {}, remark: record?.remark, checked_by: record?.checked_by, verified_by: record?.verified_by }];

  while (blocks.length < 2) {
    blocks.push({ date: "", data: {}, remark: "", checked_by: "", verified_by: "" });
  }

  const header = HEADERS[getStoredWarehouse()] ?? HEADERS.W202;

  return (
    <div className="min-h-screen bg-gray-300 print:bg-white">
      <div className="print:hidden sticky top-0 z-20 bg-white shadow-md px-5 py-3 flex items-center justify-between">
        <button
          onClick={() => router.push("/documentations/productiontoolissuance")}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
        >
          <ArrowLeft size={15} /> Back
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
        >
          <Printer size={15} /> Print
        </button>
      </div>

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
              <td rowSpan={2} style={{ ...tdHead, fontWeight: "bold", textAlign: "center" }}>
                Format: Production Tools Issuance and Integrity Check Record
              </td>
              <td style={tdHead}>Issue No:</td>
              <td style={{ ...tdHead, fontWeight: "bold" }}>{header.issueNo}</td>
            </tr>
            <tr>
              <td style={tdHead}>Revision Date:</td>
              <td style={{ ...tdHead, fontWeight: "bold" }}>{header.revisionDate}</td>
            </tr>
            <tr>
              <td style={{ ...tdHead, textAlign: "center" }}>Document No.: {header.documentNo}</td>
              <td style={tdHead}>Revision No.:</td>
              <td style={tdHead}>{header.revisionNo}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: "12px", marginBottom: "6px", fontWeight: "bold", fontSize: "11px" }}>
          Frequency: At the start and end of the day
        </div>

        {blocks.map((block, idx) => (
          <table key={idx} style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px", marginBottom: idx === blocks.length - 1 ? "0" : "0", borderTop: idx > 0 ? "none" : "1px solid #000" }}>
            <thead>
              <tr>
                <th style={{ ...th, width: "80px" }}>Date</th>
                <th style={{ ...th, width: "180px", textAlign: "left", paddingLeft: "6px" }}>Parameters</th>
                {TOOLS.map((t) => (
                  <th key={t} style={th}>{t}</th>
                ))}
                <th style={th}>REMARK</th>
                <th style={th}>Checked by<br />Production person</th>
                <th style={th}>Verified by<br />QC person</th>
              </tr>
            </thead>
            <tbody>
              {PARAMETERS.map((param, pi) => (
                <tr key={param}>
                  {pi === 0 && (
                    <td rowSpan={PARAMETERS.length} style={{ ...td, fontWeight: "bold", verticalAlign: "middle" }}>
                      {block.date ? fmt(block.date) : ""}
                    </td>
                  )}
                  <td style={{ ...td, textAlign: "left", paddingLeft: "6px", fontWeight: "bold" }}>{param}</td>
                  {TOOLS.map((tool) => (
                    <td key={tool} style={td}>{block.data?.[param]?.[tool] || ""}</td>
                  ))}
                  {pi === 0 && (
                    <>
                      <td rowSpan={PARAMETERS.length} style={{ ...td, verticalAlign: "middle" }}>{block.remark || ""}</td>
                      <td rowSpan={PARAMETERS.length} style={{ ...td, verticalAlign: "middle", padding: "2px" }}>
                        <SignatureCell name={block.checked_by} maxHeight={32} maxWidth={80} showName={false} />
                      </td>
                      <td rowSpan={PARAMETERS.length} style={{ ...td, verticalAlign: "middle", padding: "2px" }}>
                        <SignatureCell name={block.verified_by} maxHeight={32} maxWidth={80} showName={false} />
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ))}

        <div style={{ marginTop: "30px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", fontWeight: "bold" }}>
          <span>Prepared By: FST</span>
          <div style={{ border: "2px solid #6b46c1", color: "#6b46c1", padding: "3px 12px", fontSize: "10px", textAlign: "center", lineHeight: 1.2 }}>
            CONTROLLED<br />COPY
          </div>
          <span>Verified By: FSTL</span>
        </div>
      </div>

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
  padding: "5px 4px",
  textAlign: "center",
  fontWeight: "bold",
  fontSize: "10px",
  verticalAlign: "middle",
  background: "#fff",
};

const td: React.CSSProperties = {
  border: "1px solid #000",
  padding: "5px 4px",
  textAlign: "center",
  verticalAlign: "middle",
  fontSize: "10px",
};
