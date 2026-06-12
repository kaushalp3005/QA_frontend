"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import { docsApi } from "@/lib/api/documentations";
import SignatureCell from "@/components/ui/SignatureCell";

interface CheckItem {
  sr: number;
  particular: string;
  checkpoint: string;
  status: string;
  correctiveAction: string;
}

interface AreaSection {
  area: string;
  items: CheckItem[];
  lineStatus: string;
  timeOfInspection: string;
  timeOfVerification: string;
  checkedBy: string;
  verifiedBy: string;
}

function fmt(date: string) {
  if (!date) return "";
  const parts = date.split("-");
  if (parts.length !== 3) return date;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

function PageHeader() {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
      <tbody>
        <tr>
          <td rowSpan={4} style={{ ...tdHead, width: "110px", textAlign: "center" }}>
            <img src="/candor-logo.jpg" alt="Candor" style={{ width: "70px" }} />
          </td>
          <td style={{ ...tdHead, fontWeight: "bold", textAlign: "center" }}>CANDOR FOODS PRIVATE LIMITED</td>
          <td style={tdHead}>Issue Date:</td>
          <td style={tdHead}>01/08/2024</td>
        </tr>
        <tr>
          <td style={{ ...tdHead, fontWeight: "bold", textAlign: "center" }}>
            Format: Pre-production Inspection Checklist
          </td>
          <td style={tdHead}>Issue No:</td>
          <td style={tdHead}>03</td>
        </tr>
        <tr>
          <td rowSpan={2} style={{ ...tdHead, fontWeight: "bold", textAlign: "center" }}>
            Document No: CFPLA.C6.F.07
          </td>
          <td style={tdHead}>Revision Date:</td>
          <td style={tdHead}>13/12/2025</td>
        </tr>
        <tr>
          <td style={tdHead}>Revision No.:</td>
          <td style={tdHead}>02</td>
        </tr>
      </tbody>
    </table>
  );
}

function PageFooter() {
  return (
    <div style={{ marginTop: "auto", paddingTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", fontWeight: "bold" }}>
      <span>Prepared By: FST</span>
      <div style={{ border: "2px solid #6b46c1", color: "#6b46c1", padding: "3px 12px", fontSize: "10px", textAlign: "center", lineHeight: 1.2 }}>
        CONTROLLED<br />COPY
      </div>
      <span>Approved By: FSTL/Production</span>
    </div>
  );
}

export default function PreProductionInspectionPrintPage() {
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
          const res = await docsApi.get("preproductioninspection", Number(recordId));
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

  const sections: AreaSection[] = Array.isArray(record?.sections) ? record!.sections : [];
  const firstSection = sections[0];
  const restSections = sections.slice(1);

  return (
    <div className="min-h-screen bg-gray-300 print:bg-white">
      <div className="print:hidden sticky top-0 z-20 bg-white shadow-md px-5 py-3 flex items-center justify-between">
        <button
          onClick={() => router.push("/documentations/preproductioninspection")}
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

      {/* Page 1 — Main checklist */}
      {firstSection && (
        <div
          className="bg-white mx-auto my-6 print:my-0 print:shadow-none print-page"
          style={{
            width: "210mm",
            minHeight: "297mm",
            maxWidth: "100%",
            fontFamily: "'Calibri', 'Arial', sans-serif",
            color: "#000",
            boxShadow: "0 2px 20px rgba(0,0,0,.15)",
            padding: "10mm",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <PageHeader />
          <div style={{ marginTop: "10px", marginBottom: "6px", display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "bold" }}>
            <span>Date - <span style={{ fontWeight: "normal" }}>{record?.inspection_date ? fmt(record.inspection_date) : ""}</span></span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
            <thead>
              <tr>
                <th style={{ ...th, width: "40px" }}>Sr. No.</th>
                <th style={{ ...th, width: "130px" }}>Particular/<br />Equipment&apos;s Name</th>
                <th style={th}>Checkpoint</th>
                <th style={{ ...th, width: "70px" }}>Status<br />(OK/NOT OK)</th>
                <th style={{ ...th, width: "120px" }}>Corrective Action Taken</th>
              </tr>
            </thead>
            <tbody>
              {firstSection.items.map((item) => (
                <tr key={item.sr}>
                  <td style={td}>{item.sr}</td>
                  <td style={{ ...td, textAlign: "left", paddingLeft: "4px", fontWeight: "500" }}>{item.particular}</td>
                  <td style={{ ...td, textAlign: "left", paddingLeft: "6px", lineHeight: 1.35 }}>{item.checkpoint}</td>
                  <td style={td}>{item.status}</td>
                  <td style={{ ...td, textAlign: "left", paddingLeft: "4px" }}>{item.correctiveAction}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Line status & signatories below the first section */}
          <div style={{ marginTop: "10px", display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: "bold" }}>
            <span>Line Status - <span style={{ fontWeight: "normal" }}>{firstSection.lineStatus || ""}</span></span>
            <span>Time of Inspection : <span style={{ fontWeight: "normal" }}>{firstSection.timeOfInspection || ""}</span></span>
            <span>Time of Verification : <span style={{ fontWeight: "normal" }}>{firstSection.timeOfVerification || ""}</span></span>
          </div>
          <div style={{ marginTop: "12px", display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
            <div style={{ textAlign: "center" }}>
              <SignatureCell name={firstSection.checkedBy} maxHeight={36} maxWidth={120} showName={true} />
              <div style={{ marginTop: "4px", fontWeight: "bold" }}>Checked by</div>
              <div style={{ fontSize: "10px" }}>Production Incharge</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <SignatureCell name={firstSection.verifiedBy} maxHeight={36} maxWidth={120} showName={true} />
              <div style={{ marginTop: "4px", fontWeight: "bold" }}>Verified by</div>
              <div style={{ fontSize: "10px" }}>Quality</div>
            </div>
          </div>

          <PageFooter />
        </div>
      )}

      {/* Pages 2+ — each remaining area on its own page */}
      {restSections.map((section, idx) => (
        <div
          key={idx}
          className="bg-white mx-auto my-6 print:my-0 print:shadow-none print-page"
          style={{
            width: "210mm",
            minHeight: "297mm",
            maxWidth: "100%",
            fontFamily: "'Calibri', 'Arial', sans-serif",
            color: "#000",
            boxShadow: "0 2px 20px rgba(0,0,0,.15)",
            padding: "10mm",
            display: "flex",
            flexDirection: "column",
            pageBreakBefore: "always",
          }}
        >
          <PageHeader />
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px", marginTop: "10px" }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: "left", paddingLeft: "6px" }} colSpan={5}>Area: {section.area}</th>
              </tr>
              <tr>
                <th style={{ ...th, width: "40px" }}>Sr.</th>
                <th style={{ ...th, width: "130px" }}>Particular</th>
                <th style={th}>Checkpoint</th>
                <th style={{ ...th, width: "70px" }}>Status</th>
                <th style={{ ...th, width: "120px" }}>Corrective Action Taken</th>
              </tr>
            </thead>
            <tbody>
              {section.items.map((item) => (
                <tr key={item.sr}>
                  <td style={td}>{item.sr}</td>
                  <td style={{ ...td, textAlign: "left", paddingLeft: "4px", fontWeight: "500" }}>{item.particular}</td>
                  <td style={{ ...td, textAlign: "left", paddingLeft: "6px", lineHeight: 1.35 }}>{item.checkpoint}</td>
                  <td style={td}>{item.status}</td>
                  <td style={{ ...td, textAlign: "left", paddingLeft: "4px" }}>{item.correctiveAction}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: "16px", display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: "bold" }}>
            <span>Line Status - <span style={{ fontWeight: "normal" }}>{section.lineStatus || ""}</span></span>
            <span>Time of Inspection : <span style={{ fontWeight: "normal" }}>{section.timeOfInspection || ""}</span></span>
            <span>Time of Verification : <span style={{ fontWeight: "normal" }}>{section.timeOfVerification || ""}</span></span>
          </div>
          <div style={{ marginTop: "18px", display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
            <div style={{ textAlign: "center" }}>
              <SignatureCell name={section.checkedBy} maxHeight={36} maxWidth={120} showName={true} />
              <div style={{ marginTop: "4px", fontWeight: "bold" }}>Checked by</div>
              <div style={{ fontSize: "10px" }}>Production Incharge</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <SignatureCell name={section.verifiedBy} maxHeight={36} maxWidth={120} showName={true} />
              <div style={{ marginTop: "4px", fontWeight: "bold" }}>Verified by</div>
              <div style={{ fontSize: "10px" }}>Quality</div>
            </div>
          </div>

          <PageFooter />
        </div>
      ))}

      <style>{`
        @media print {
          html, body { background: white !important; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          @page { size: A4 portrait; margin: 6mm; }
          .print-page { page-break-after: always; box-shadow: none !important; margin: 0 !important; width: 100% !important; max-width: 100% !important; min-height: auto !important; }
          .print-page:last-child { page-break-after: auto; }
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
  padding: "4px 4px",
  textAlign: "center",
  fontWeight: "bold",
  fontSize: "10px",
  verticalAlign: "middle",
  background: "#fff",
};

const td: React.CSSProperties = {
  border: "1px solid #000",
  padding: "3px 4px",
  textAlign: "center",
  verticalAlign: "middle",
  fontSize: "10px",
};
