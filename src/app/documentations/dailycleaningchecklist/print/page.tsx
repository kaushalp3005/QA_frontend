"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import { docsApi } from "@/lib/api/documentations";
import SignatureCell from "@/components/ui/SignatureCell";
import { normalizeDCC, DCC_DAYS, type NormalizedDCC } from "@/lib/dailyCleaning";

const DAYS = Array.from({ length: DCC_DAYS }, (_, i) => i + 1);

export default function DailyCleaningChecklistPrintPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recordId = searchParams.get("id");
  const [data, setData] = useState<NormalizedDCC | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        if (recordId) {
          const res = await docsApi.get("dailycleaningchecklist", Number(recordId));
          setData(normalizeDCC(res.data));
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

  const floors = data?.floors || [];
  const title = data?.title || "Daily Cleaning checklist";
  const docNo = data?.documentNo || "CFPLA.C4.F.54";

  return (
    <div className="min-h-screen bg-gray-300 print:bg-white">
      <div className="print:hidden sticky top-0 z-20 bg-white shadow-md px-5 py-3 flex items-center justify-between">
        <button
          onClick={() => router.push("/documentations/dailycleaningchecklist")}
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

      {floors.map((floor, fi) => (
        <div
          key={fi}
          className="bg-white mx-auto my-6 print:my-0 print:shadow-none print:w-full print-page"
          style={{
            width: "297mm",
            maxWidth: "100%",
            fontFamily: "'Calibri', 'Arial', sans-serif",
            color: "#000",
            boxShadow: "0 2px 20px rgba(0,0,0,.15)",
            padding: "8mm",
            ...(fi > 0 ? { pageBreakBefore: "always" } : {}),
          }}
        >
          {/* Header */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
            <tbody>
              <tr>
                <td rowSpan={4} style={{ ...tdHead, width: "100px", textAlign: "center" }}>
                  <img src="/candor-logo.jpg" alt="Candor" style={{ width: "75px" }} />
                </td>
                <td colSpan={2} style={{ ...tdHead, fontWeight: "bold" }}>CANDOR FOODS PRIVATE LIMITED</td>
                <td style={tdHead}>Issue Date</td>
                <td style={tdHead}>{data?.issueDate || "01/11/2017"}</td>
              </tr>
              <tr>
                <td style={{ ...tdHead, width: "120px" }}>Document Name:</td>
                <td style={{ ...tdHead, fontWeight: "bold" }}>{title}</td>
                <td style={tdHead}>Issue No</td>
                <td style={tdHead}>{data?.issueNo || "04"}</td>
              </tr>
              <tr>
                <td rowSpan={2} style={{ ...tdHead }}>Document Number:</td>
                <td rowSpan={2} style={{ ...tdHead }}>{docNo}</td>
                <td style={tdHead}>Rev. Date</td>
                <td style={tdHead}>{data?.revDate || "13/12/2025"}</td>
              </tr>
              <tr>
                <td style={tdHead}>Rev. No</td>
                <td style={tdHead}>{data?.revNo || "03"}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: "8px", marginBottom: "4px", fontSize: "12px", fontWeight: "bold" }}>
            Month: <span style={{ fontWeight: "normal" }}>{data?.month || ""}</span>
            <span style={{ marginLeft: "40px" }}>Area: <span style={{ fontWeight: "normal" }}>{floor.area || ""}</span></span>
            {floors.length > 1 && (
              <span style={{ marginLeft: "40px" }}>Floor {fi + 1} of {floors.length}</span>
            )}
          </div>

          {/* Grid */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9px" }}>
            <thead>
              <tr>
                <th style={{ ...th, width: "180px", textAlign: "left", paddingLeft: "6px", background: "#d9d9d9" }}>DATE</th>
                {DAYS.map((d) => (
                  <th key={d} style={{ ...th, background: "#d9d9d9", width: "22px" }}>{d}</th>
                ))}
              </tr>
              <tr>
                <th style={{ ...th, textAlign: "left", paddingLeft: "6px", background: "#d9d9d9" }}>PARAMETERS</th>
                {DAYS.map((d) => (
                  <th key={d} style={{ ...th, background: "#d9d9d9" }}>&nbsp;</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.parameters.map((param) => (
                <tr key={param}>
                  <td style={{ ...td, textAlign: "left", paddingLeft: "6px", fontWeight: "bold" }}>{param}</td>
                  {DAYS.map((d) => (
                    <td key={d} style={td}>{floor.grid[param]?.[d] || ""}</td>
                  ))}
                </tr>
              ))}
              <tr>
                <td style={{ ...td, textAlign: "left", paddingLeft: "6px", fontWeight: "bold" }}>CHECKED BY</td>
                {DAYS.map((d) => (
                  <td key={d} style={{ ...td, padding: "1px" }}>
                    <SignatureCell name={floor.checkedByPerDay[d] || ""} maxHeight={20} maxWidth={28} showName={false} />
                  </td>
                ))}
              </tr>
              <tr>
                <td style={{ ...td, textAlign: "left", paddingLeft: "6px", fontWeight: "bold" }}>VERIFIED BY</td>
                {DAYS.map((d) => (
                  <td key={d} style={{ ...td, padding: "1px" }}>
                    <SignatureCell name={floor.verifiedByPerDay[d] || ""} maxHeight={20} maxWidth={28} showName={false} />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>

          {/* Observations & Corrective Action */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px", marginTop: "16px" }}>
            <tbody>
              <tr>
                <td style={{ ...td, width: "140px", textAlign: "left", paddingLeft: "6px", fontWeight: "bold", background: "#d9d9d9", height: "60px" }}>OBSERVATIONS</td>
                <td style={{ ...td, textAlign: "left", paddingLeft: "8px", verticalAlign: "top", whiteSpace: "pre-wrap" }}>{floor.observations || ""}</td>
              </tr>
              <tr>
                <td style={{ ...td, textAlign: "left", paddingLeft: "6px", fontWeight: "bold", background: "#d9d9d9", height: "60px" }}>CORRECTIVE ACTION</td>
                <td style={{ ...td, textAlign: "left", paddingLeft: "8px", verticalAlign: "top", whiteSpace: "pre-wrap" }}>{floor.correctiveAction || ""}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: "30px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", fontWeight: "bold" }}>
            <span>Prepared By: FST</span>
            <div style={{ border: "2px solid #6b46c1", color: "#6b46c1", padding: "3px 12px", fontSize: "10px", textAlign: "center", lineHeight: 1.2 }}>
              CONTROLLED<br />COPY
            </div>
            <span>Approved By: FSTL</span>
          </div>
        </div>
      ))}

      <style>{`
        @media print {
          html, body { background: white !important; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          @page { size: A4 landscape; margin: 6mm; }
          .print-page { width: 100% !important; max-width: 100% !important; margin: 0 !important; box-shadow: none !important; }
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
  padding: "3px 2px",
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
  height: "20px",
};
