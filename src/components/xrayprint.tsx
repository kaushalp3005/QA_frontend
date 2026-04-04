"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { XRayRecord } from "@/lib/api/xray";
import { getXRayRecords } from "@/lib/api/xray";

// blank rows to pad out the table to look like the physical form
const BLANK_ROW_COUNT = 8;

function fmt(date: string) {
  if (!date) return "";
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

export default function XRayPrintPage() {
  const router = useRouter();
  const [records, setRecords] = useState<XRayRecord[]>([]);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const data = await getXRayRecords();
        setRecords(data);
      } catch (error) {
        console.error('Error fetching X-Ray records:', error);
        alert('Failed to load records. Please try again.');
      }
    };
    fetchRecords();
  }, []);

  const clearAll = () => {
    if (confirm("Clear all saved records? This cannot be undone.")) {
      alert('Please contact your administrator to clear records from the database.');
    }
  };

  const blankRows = Math.max(0, BLANK_ROW_COUNT - records.length);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #d8d5d0;
          font-family: 'Noto Sans', Arial, sans-serif;
        }

        /* ── Screen-only controls ── */
        .screen-bar {
          background: #1a1a2e;
          color: #e0e0e8;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 24px;
          font-size: 0.8rem;
          gap: 12px;
          position: sticky; top: 0; z-index: 100;
        }
        .screen-bar-left { display: flex; align-items: center; gap: 12px; }
        .screen-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 16px; border-radius: 4px;
          font-size: 0.78rem; font-weight: 600;
          cursor: pointer; border: none; transition: all 0.15s;
          font-family: inherit;
        }
        .btn-back { background: rgba(255,255,255,0.08); color: #ccc; }
        .btn-back:hover { background: rgba(255,255,255,0.15); color: #fff; }
        .btn-clear { background: rgba(239,68,68,0.15); color: #f87171; }
        .btn-clear:hover { background: rgba(239,68,68,0.25); }
        .btn-print {
          background: #4a7cff; color: #fff;
          box-shadow: 0 2px 8px rgba(74,124,255,0.3);
        }
        .btn-print:hover { background: #3a6be8; }
        .record-count {
          font-size: 0.72rem; color: #888;
        }
        .record-count span { color: #4a7cff; font-weight: 700; }

        /* ── Paper sheet ── */
        .paper-wrap {
          padding: 24px;
          display: flex; justify-content: center;
        }

        .paper {
          background: #ffffff;
          width: 100%;
          max-width: 1100px;
          border: 1px solid #aaa;
          box-shadow: 0 4px 32px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.1);
          font-size: 9.5pt;
        }

        /* ── TOP HEADER ── */
        .doc-header {
          display: grid;
          grid-template-columns: 130px 1fr 190px;
          border-bottom: 2px solid #222;
        }

        .logo-cell {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 10px 8px;
          border-right: 1.5px solid #222;
          gap: 4px;
        }
        .logo-box {
          width: 32px; height: 32px;
          background: #1a3a6b; border-radius: 5px;
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 1rem; font-weight: 800;
          margin-bottom: 3px;
        }
        .logo-text { font-size: 10pt; font-weight: 700; color: #1a3a6b; text-align: center; line-height: 1.2; }

        .title-cell {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 10px 12px; text-align: center; gap: 3px;
          border-right: 1.5px solid #222;
        }
        .company-name {
          font-size: 11pt; font-weight: 700; color: #000; letter-spacing: 0.02em;
        }
        .format-name {
          font-size: 8.5pt; font-weight: 600; color: #222;
        }
        .doc-no { font-size: 7.5pt; color: #555; }

        .meta-grid { display: flex; flex-direction: column; }
        .meta-row {
          display: grid; grid-template-columns: 1fr 1fr;
          border-bottom: 1px solid #ccc;
          flex: 1;
        }
        .meta-row:last-child { border-bottom: none; }
        .meta-k { padding: 3px 7px; font-size: 7pt; font-weight: 700; color: #333; border-right: 1px solid #ccc; }
        .meta-v { padding: 3px 7px; font-size: 7pt; color: #000; }

        /* ── Frequency bar ── */
        .freq-bar {
          padding: 4px 10px;
          font-size: 7.5pt; font-weight: 700; color: #333;
          border-bottom: 1px solid #888;
          background: #f5f5f0;
        }

        /* ── Info row ── */
        .info-row {
          display: flex; align-items: stretch;
          border-bottom: 2px solid #222;
          font-size: 8pt;
        }
        .info-cell {
          display: flex; align-items: center; gap: 4px;
          padding: 4px 10px;
          border-right: 1px solid #999;
        }
        .info-cell:last-child { border-right: none; }
        .info-k { font-weight: 700; color: #333; }
        .info-v { color: #000; }
        .ccp-badge {
          background: #1a3a6b; color: #fff;
          font-size: 7.5pt; font-weight: 800;
          padding: 2px 8px; border-radius: 2px;
          letter-spacing: 0.05em;
        }

        /* ── Data table ── */
        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8pt;
        }
        .data-table th, .data-table td {
          border: 1px solid #aaa;
          padding: 0;
          vertical-align: middle;
        }
        .th1 {
          background: #1a3a6b; color: #fff;
          font-size: 7pt; font-weight: 700;
          text-align: center; padding: 5px 4px;
          letter-spacing: 0.03em;
        }
        .th2 {
          background: #2d5086; color: #d8e0f0;
          font-size: 6.5pt; font-weight: 600;
          text-align: center; padding: 4px 4px;
        }
        .th3 {
          background: #3d6199; color: #e0e8f5;
          font-size: 6pt; font-weight: 500;
          text-align: center; padding: 3px 4px;
        }

        .td-content {
          padding: 5px 6px;
          min-height: 24px;
          color: #000;
          line-height: 1.3;
        }
        .td-center { text-align: center; }
        .td-date { white-space: nowrap; font-size: 8pt; }
        .td-time { white-space: nowrap; font-size: 8pt; }

        .check-cell {
          text-align: center;
          padding: 4px;
        }
        .check-sq {
          display: inline-flex; align-items: center; justify-content: center;
          width: 16px; height: 16px;
          border: 1.5px solid #555;
          font-size: 9pt; font-weight: 700;
          color: #000;
        }

        .data-row td { background: #fff; }
        .data-row:nth-child(even) td { background: #fafaf8; }

        /* ── Doc footer ── */
        .doc-footer {
          display: flex; align-items: center; justify-content: space-between;
          padding: 6px 16px;
          border-top: 2px solid #222;
          font-size: 8pt; font-weight: 700; color: #333;
        }
        .controlled-box {
          border: 1.5px solid #222;
          padding: 3px 12px;
          font-size: 7pt; font-weight: 800;
          text-align: center; letter-spacing: 0.06em;
          line-height: 1.4;
        }

        /* ── Print ── */
        @media print {
          .screen-bar { display: none !important; }
          body { background: #fff; }
          .paper-wrap { padding: 0; }
          .paper {
            box-shadow: none;
            border: none;
            max-width: none;
            width: 100%;
            font-size: 8.5pt;
          }
          @page {
            size: A3 landscape;
            margin: 1.2cm;
          }
        }
      `}</style>

      {/* Screen-only top bar */}
      <div className="screen-bar">
        <div className="screen-bar-left">
          <button className="screen-btn btn-back" onClick={() => router.push("/xray")}>
            ← Back to Form
          </button>
          <div className="record-count">
            <span>{records.length}</span> record{records.length !== 1 ? "s" : ""} saved
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="screen-btn btn-clear" onClick={clearAll}>
            🗑 Clear All
          </button>
          <button className="screen-btn btn-print" onClick={() => window.print()}>
            🖨 Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Paper */}
      <div className="paper-wrap">
        <div className="paper">

          {/* Header */}
          <div className="doc-header">
            <div className="logo-cell">
              <div className="logo-box">C</div>
              <div className="logo-text">Candor<br />Foods</div>
            </div>
            <div className="title-cell">
              <div className="company-name">CANDOR FOODS PRIVATE LIMITED</div>
              <div className="format-name">Format: CCP Calibration, Monitoring and Verification Check Record (X-Ray Detection)</div>
              <div className="doc-no">Document No: CFPLA.C2.F.20</div>
            </div>
            <div className="meta-grid">
              {[["Issue Date","03/10/2023"],["Issue No","02"],["Revision Date","01/11/2025"],["Revision No.","01"]].map(([k,v])=>(
                <div className="meta-row" key={k}>
                  <div className="meta-k">{k}</div>
                  <div className="meta-v">{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div className="freq-bar">
            Frequency: Every hourly &nbsp;|&nbsp; Frequency: At the End Before Final Packing
          </div>

          {/* Info row */}
          <div className="info-row">
            <div className="info-cell" style={{ flex: 1 }}>
              <span className="info-k">MACHINE DETAILS:</span>
              <span className="info-v">X-RAY</span>
            </div>
            <div className="info-cell" style={{ flex: 1 }}>
              <span className="info-k">ID:</span>
              <span className="info-v">61154479393</span>
            </div>
            <div className="info-cell" style={{ flex: 2 }}>
              <span className="info-k">LOCATION:</span>
              <span className="info-v">SECOND FLOOR FG AREA</span>
            </div>
            <div className="info-cell">
              <span className="ccp-badge">CCP: CCP-2</span>
            </div>
          </div>

          {/* Table */}
          <table className="data-table">
            <thead>
              <tr>
                <th className="th1" rowSpan={3} style={{ width: "72px" }}>DATE</th>
                <th className="th1" rowSpan={3} style={{ width: "56px" }}>TIME</th>
                <th className="th1" rowSpan={3} style={{ width: "140px" }}>PRODUCT NAME</th>
                <th className="th1" rowSpan={3} style={{ width: "80px" }}>BATCH NO</th>
                <th className="th1" colSpan={3}>SENSITIVITIES</th>
                <th className="th1" colSpan={2}>IF X-RAY IS NOT WORKING,<br />CORRECTIVE ACTION TAKEN ON</th>
                <th className="th1" rowSpan={3} style={{ width: "100px" }}>CALIBRATED /<br />MONITORED BY</th>
                <th className="th1" rowSpan={3} style={{ width: "85px" }}>VERIFIED BY</th>
                <th className="th1" rowSpan={3} style={{ width: "90px" }}>REMARKS</th>
              </tr>
              <tr>
                <th className="th2" style={{ width: "48px" }}>SS 316</th>
                <th className="th2" style={{ width: "55px" }}>Ceramic</th>
                <th className="th2" style={{ width: "68px" }}>Soda Lime<br />Glass</th>
                <th className="th2" style={{ width: "100px" }}>ON X-RAY</th>
                <th className="th2" style={{ width: "100px" }}>ON PRODUCT<br />PASSED</th>
              </tr>
              <tr>
                <th className="th3">✓</th>
                <th className="th3">✓</th>
                <th className="th3">✓</th>
                <th className="th3">Action</th>
                <th className="th3">Action</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="data-row">
                  <td><div className="td-content td-date">{fmt(r.date)}</div></td>
                  <td><div className="td-content td-time">{r.time}</div></td>
                  <td><div className="td-content">{r.product_name}</div></td>
                  <td><div className="td-content">{r.batch_no}</div></td>
                  <td className="check-cell">
                    <div className="check-sq">{r.ss316 ? "✓" : ""}</div>
                  </td>
                  <td className="check-cell">
                    <div className="check-sq">{r.ceramic ? "✓" : ""}</div>
                  </td>
                  <td className="check-cell">
                    <div className="check-sq">{r.soda_lime_glass ? "✓" : ""}</div>
                  </td>
                  <td><div className="td-content">{r.action_on_xray}</div></td>
                  <td><div className="td-content">{r.action_on_product_passed}</div></td>
                  <td><div className="td-content">{r.calibrated_monitored_by}</div></td>
                  <td><div className="td-content">{r.verified_by}</div></td>
                  <td><div className="td-content">{r.remarks}</div></td>
                </tr>
              ))}

              {/* Blank padding rows */}
              {Array.from({ length: blankRows }).map((_, i) => (
                <tr key={`blank-${i}`} className="data-row">
                  {Array.from({ length: 12 }).map((_, j) => (
                    <td key={j}><div className="td-content">&nbsp;</div></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div className="doc-footer">
            <span>Prepared By: FST</span>
            <div className="controlled-box">CONTROLLED<br />COPY</div>
            <span>Approved By: FSTL</span>
          </div>

        </div>
      </div>
    </>
  );
}
