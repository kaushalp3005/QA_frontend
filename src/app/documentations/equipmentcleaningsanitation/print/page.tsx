"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import { docsApi } from "@/lib/api/documentations";
import SignatureCell from "@/components/ui/SignatureCell";

type BAStatus = "✓" | "✕" | "";

export default function EquipmentCleaningPrintPage() {
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
          const res = await docsApi.get("equipmentcleaningsanitation", Number(recordId));
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

  const gridObj = record?.grid || {};
  const cells: Record<string, Record<number | string, { B: BAStatus; A: BAStatus }>> = gridObj.cells || {};
  const rowSigs: Record<string, { checkedBy?: string; verifiedBy?: string }> = gridObj.rowSigs || {};
  const equipmentList = Object.keys(cells);
  const selectedDates: number[] = Array.isArray(gridObj.selectedDates) ? gridObj.selectedDates : Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-gray-300 print:bg-white">
      <div className="print:hidden sticky top-0 z-20 bg-white shadow-md px-5 py-3 flex items-center justify-between">
        <button
          onClick={() => router.push("/documentations/equipmentcleaningsanitation")}
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
              <td rowSpan={4} style={{ ...tdHead, width: "120px", textAlign: "center" }}>
                <img src="/candor-logo.jpg" alt="Candor" style={{ width: "75px" }} />
              </td>
              <td style={{ ...tdHead, fontWeight: "bold", textAlign: "center" }}>CANDOR FOODS PRIVATE LIMITED</td>
              <td style={tdHead}>Issue Date:</td>
              <td style={tdHead}>01/11/2017</td>
            </tr>
            <tr>
              <td rowSpan={2} style={{ ...tdHead, fontWeight: "bold", textAlign: "center" }}>
                Format : Equipment Cleaning &amp; Sanitation Record
              </td>
              <td style={tdHead}>Issue No:</td>
              <td style={tdHead}>04</td>
            </tr>
            <tr>
              <td style={tdHead}>Revision Date:</td>
              <td style={tdHead}>01/10/2025</td>
            </tr>
            <tr>
              <td style={{ ...tdHead, fontWeight: "bold", textAlign: "center" }}>Document No: CFPLA.C4.F.19</td>
              <td style={tdHead}>Revision No.:</td>
              <td style={tdHead}>03</td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: "8px", marginBottom: "4px", fontSize: "11px", fontWeight: "bold" }}>
          Month: <span style={{ fontWeight: "normal" }}>{record?.month || ""}</span>
          <span style={{ marginLeft: "30px" }}>Area: <span style={{ fontWeight: "normal" }}>{record?.area || ""}</span></span>
          <span style={{ marginLeft: "30px", fontStyle: "italic", fontWeight: "normal", fontSize: "10px" }}>
            Dry cleaning with: compressed air; cleaning with: water + liquid soap + sanitation with: 70% IPA
          </span>
        </div>

        {/* Grid */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9px" }}>
          <thead>
            <tr>
              <th style={{ ...th, width: "30px" }} rowSpan={2}>Sr. No</th>
              <th style={{ ...th, width: "140px", textAlign: "left", paddingLeft: "4px" }} rowSpan={2}>Date</th>
              {selectedDates.map((d) => (
                <th key={`day-${d}`} style={{ ...th }} colSpan={2}>{d}</th>
              ))}
              <th style={{ ...th, width: "70px" }} rowSpan={2}>Checked By</th>
              <th style={{ ...th, width: "70px" }} rowSpan={2}>Verified By</th>
            </tr>
            <tr>
              {selectedDates.map((d) => (
                <Fragment key={`ba-${d}`}>
                  <th style={{ ...th, width: "16px" }}>B</th>
                  <th style={{ ...th, width: "16px" }}>A</th>
                </Fragment>
              ))}
            </tr>
            <tr>
              <th style={{ ...th, textAlign: "left", paddingLeft: "4px" }} colSpan={2 + selectedDates.length * 2 + 2}>
                Frequency: Before &amp; After Production
              </th>
            </tr>
          </thead>
          <tbody>
            {equipmentList.map((eq, idx) => (
              <tr key={eq}>
                <td style={td}>{idx + 1}</td>
                <td style={{ ...td, textAlign: "left", paddingLeft: "4px", fontWeight: "bold" }}>{eq}</td>
                {selectedDates.map((d) => {
                  const cell = cells[eq]?.[d] || cells[eq]?.[String(d)] || { B: "", A: "" };
                  return (
                    <Fragment key={`${eq}-${d}`}>
                      <td style={td}>{cell.B || ""}</td>
                      <td style={td}>{cell.A || ""}</td>
                    </Fragment>
                  );
                })}
                <td style={{ ...td, padding: "1px" }}>
                  <SignatureCell name={rowSigs[eq]?.checkedBy} maxHeight={20} maxWidth={65} showName={false} />
                </td>
                <td style={{ ...td, padding: "1px" }}>
                  <SignatureCell name={rowSigs[eq]?.verifiedBy} maxHeight={20} maxWidth={65} showName={false} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Observations / Corrective Actions */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px", marginTop: "12px" }}>
          <tbody>
            <tr>
              <td style={{ ...td, width: "140px", textAlign: "left", paddingLeft: "6px", fontWeight: "bold", height: "55px" }}>Observations</td>
              <td style={{ ...td, textAlign: "left", paddingLeft: "8px", verticalAlign: "top", whiteSpace: "pre-wrap" }}>{record?.observations || ""}</td>
            </tr>
            <tr>
              <td style={{ ...td, textAlign: "left", paddingLeft: "6px", fontWeight: "bold", height: "55px" }}>Corrective Actions</td>
              <td style={{ ...td, textAlign: "left", paddingLeft: "8px", verticalAlign: "top", whiteSpace: "pre-wrap" }}>{record?.corrective_action || ""}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", fontWeight: "bold" }}>
          <span>Prepared By: FST</span>
          <div style={{ border: "2px solid #6b46c1", color: "#6b46c1", padding: "3px 12px", fontSize: "10px", textAlign: "center", lineHeight: 1.2 }}>
            CONTROLLED<br />COPY
          </div>
          <span>Approved By: FSTL</span>
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
  padding: "2px 2px",
  textAlign: "center",
  fontWeight: "bold",
  fontSize: "9px",
  verticalAlign: "middle",
};

const td: React.CSSProperties = {
  border: "1px solid #000",
  padding: "3px 2px",
  textAlign: "center",
  verticalAlign: "middle",
  fontSize: "9px",
  height: "18px",
};
