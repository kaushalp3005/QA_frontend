"use client";
import { useState } from "react";

// ===================== F.29 — First Aid Box Record =====================
interface FirstAidRow { id: number; boxNo: string; itemName: string; issueDate: string; expiryDate: string; qtyIssued: string; responsiblePerson: string; }
const eFA = (id: number): FirstAidRow => ({ id, boxNo: "", itemName: "", issueDate: "", expiryDate: "", qtyIssued: "", responsiblePerson: "" });

interface FirstAidBoxProps {
  initialData?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => Promise<void>;
  isEdit?: boolean;
}

export function FirstAidBoxRecord({ initialData, onSubmit, isEdit }: FirstAidBoxProps = {}) {
  const [rows, setRows] = useState<FirstAidRow[]>(() => {
    if (initialData?.rows && Array.isArray(initialData.rows)) {
      return initialData.rows.map((r: any, i: number) => ({
        id: i + 1,
        boxNo: r.box_no || "",
        itemName: r.item_name || "",
        issueDate: r.issue_date || "",
        expiryDate: r.expiry_date || "",
        qtyIssued: r.quantity_issued?.toString() || "",
        responsiblePerson: r.responsible_person || "",
      }));
    }
    return Array.from({ length: 10 }, (_, i) => eFA(i + 1));
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const add = () => setRows((p) => [...p, eFA(p.length + 1)]);
  const rm = (id: number) => { if (rows.length > 1) setRows((p) => p.filter((r) => r.id !== id)); };
  const up = (id: number, f: keyof FirstAidRow, v: string) => setRows((p) => p.map((r) => (r.id === id ? { ...r, [f]: v } : r)));

  const handleSubmit = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: typeof window !== "undefined" ? localStorage.getItem("currentWarehouse") || "A185" : "A185",
      rows: rows.filter((r) => r.boxNo || r.itemName).map((r) => ({
        box_no: r.boxNo,
        item_name: r.itemName,
        issue_date: r.issueDate,
        expiry_date: r.expiryDate,
        quantity_issued: r.qtyIssued ? Number(r.qtyIssued) : null,
        responsible_person: r.responsiblePerson,
      })),
    };
    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        const { docsApi } = await import("@/lib/api/documentations");
        await docsApi.create("first-aid-box", payload);
        setSuccess(true);
      }
    } catch (e: any) {
      alert(e.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="border border-gray-300 mb-4 rounded">
        <div className="bg-gray-50 p-3">
          <h1 className="font-bold text-lg">CANDOR FOODS PRIVATE LIMITED</h1>
          <p className="text-sm font-semibold">First Aid Box Record</p>
          <p className="text-xs text-gray-600">Doc No: CFPLA.C7.F.29 | Issue No: 02 | Rev Date: 01/10/2025</p>
        </div>
      </div>
      <div className="overflow-x-auto border border-gray-300 rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>{["SR.NO", "Box No", "Item Name", "Issue Date", "Expiry Date", "Quantity Issued", "Responsible Person", ""].map((h) => <th key={h} className="border border-gray-300 px-2 py-2">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="hover:bg-blue-50">
                <td className="border border-gray-300 px-2 py-1 text-center">{i + 1}</td>
                <td className="border border-gray-300 px-1 py-1"><input type="text" value={r.boxNo} onChange={(e) => up(r.id, "boxNo", e.target.value)} className="w-full border rounded px-1 py-0.5" /></td>
                <td className="border border-gray-300 px-1 py-1"><input type="text" value={r.itemName} onChange={(e) => up(r.id, "itemName", e.target.value)} className="w-full border rounded px-1 py-0.5 min-w-[150px]" /></td>
                <td className="border border-gray-300 px-1 py-1"><input type="date" value={r.issueDate} onChange={(e) => up(r.id, "issueDate", e.target.value)} className="w-full border rounded px-1 py-0.5" /></td>
                <td className="border border-gray-300 px-1 py-1"><input type="date" value={r.expiryDate} onChange={(e) => up(r.id, "expiryDate", e.target.value)} className={`w-full border rounded px-1 py-0.5 ${r.expiryDate && new Date(r.expiryDate) < new Date() ? "bg-red-100" : ""}`} /></td>
                <td className="border border-gray-300 px-1 py-1"><input type="number" value={r.qtyIssued} onChange={(e) => up(r.id, "qtyIssued", e.target.value)} className="w-20 border rounded px-1 py-0.5" /></td>
                <td className="border border-gray-300 px-1 py-1"><input type="text" value={r.responsiblePerson} onChange={(e) => up(r.id, "responsiblePerson", e.target.value)} className="w-full border rounded px-1 py-0.5" /></td>
                <td className="border border-gray-300 px-1 py-1 text-center"><button onClick={() => rm(r.id)} className="text-red-500 text-xs">✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={add} className="mt-2 bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700">+ Add Row</button>
      <div className="mt-2 text-xs text-gray-500">Prepared by: FST | Approved By: FSTL</div>
      <button onClick={handleSubmit} disabled={submitting} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
        {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
      </button>
      {success && <p className="text-green-600 text-sm mt-2">Record saved successfully!</p>}
    </div>
  );
}

// ===================== F.30 — Traceability Report =====================
interface IngRow { id: number; ingredient: string; lotNo: string; supplier: string; poNo: string; receivedQty: string; issuedQty: string; dateOfIssuance: string; }
interface PackRow { id: number; material: string; lotNo: string; supplier: string; poNo: string; issuanceDate: string; qualityApprovalDate: string; inwardQty: string; usedQty: string; }
const TRACE_DOCS = ["Sales order contract", "Job Card Issuance", "Raw Material Purchase Order", "Raw material invoice (GRN)", "Incoming Vehicle Inspection record", "Fumigation Record (if applicable)", "RM quality Inspection Report", "RM Issuance Record", "Pre-production Inspection Checklist", "Daily Cleaning", "Equipment Cleaning Record", "CCP Monitoring Record", "Product weight & sealing check", "In-process quality check", "X-ray / Metal detection record", "Finished Good COA", "Dispatch Record"];

interface TraceabilityReportProps {
  initialData?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => Promise<void>;
  isEdit?: boolean;
}

export function TraceabilityReport({ initialData, onSubmit, isEdit }: TraceabilityReportProps = {}) {
  const [date, setDate] = useState(initialData?.report_date || ""); const [startTime, setStartTime] = useState(initialData?.start_time || ""); const [productName, setProductName] = useState(initialData?.product_name || "");
  const [batchNumber, setBatchNumber] = useState(initialData?.batch_number || ""); const [workOrderNo, setWorkOrderNo] = useState(initialData?.work_order_no || ""); const [packingDate, setPackingDate] = useState(initialData?.packing_date || "");
  const [expiryDate, setExpiryDate] = useState(initialData?.expiry_date || ""); const [sizePacking, setSizePacking] = useState(initialData?.size_packing || ""); const [qtyProduced, setQtyProduced] = useState(initialData?.qty_produced?.toString() || "");
  const [ingredients, setIngredients] = useState<IngRow[]>(() => {
    if (initialData?.ingredients && Array.isArray(initialData.ingredients)) {
      return initialData.ingredients.map((r: any, i: number) => ({ id: i + 1, ingredient: r.ingredient || "", lotNo: r.lot_no || "", supplier: r.supplier || "", poNo: r.po_no || "", receivedQty: r.received_qty || "", issuedQty: r.issued_qty || "", dateOfIssuance: r.date_of_issuance || "" }));
    }
    return [{ id: 1, ingredient: "", lotNo: "", supplier: "", poNo: "", receivedQty: "", issuedQty: "", dateOfIssuance: "" }];
  });
  const [packMaterials, setPackMaterials] = useState<PackRow[]>(() => {
    if (initialData?.pack_materials && Array.isArray(initialData.pack_materials)) {
      return initialData.pack_materials.map((r: any, i: number) => ({ id: i + 1, material: r.material || "", lotNo: r.lot_no || "", supplier: r.supplier || "", poNo: r.po_no || "", issuanceDate: r.issuance_date || "", qualityApprovalDate: r.quality_approval_date || "", inwardQty: r.inward_qty || "", usedQty: r.used_qty || "" }));
    }
    return [{ id: 1, material: "", lotNo: "", supplier: "", poNo: "", issuanceDate: "", qualityApprovalDate: "", inwardQty: "", usedQty: "" }];
  });
  const [docChecks, setDocChecks] = useState<Record<string, "Yes" | "No" | "">>(() => initialData?.doc_checks || {});
  const [rmQty, setRmQty] = useState(initialData?.rm_qty?.toString() || ""); const [fgProduced, setFgProduced] = useState(initialData?.fg_produced?.toString() || ""); const [rejectionQty, setRejectionQty] = useState(initialData?.rejection_qty?.toString() || ""); const [stockBalance, setStockBalance] = useState(initialData?.stock_balance?.toString() || "");
  const [conclusion, setConclusion] = useState(initialData?.conclusion || ""); const [preparedBy, setPreparedBy] = useState(initialData?.prepared_by || ""); const [reviewedBy, setReviewedBy] = useState(initialData?.reviewed_by || "");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const addIng = () => setIngredients((p) => [...p, { id: p.length + 1, ingredient: "", lotNo: "", supplier: "", poNo: "", receivedQty: "", issuedQty: "", dateOfIssuance: "" }]);
  const addPack = () => setPackMaterials((p) => [...p, { id: p.length + 1, material: "", lotNo: "", supplier: "", poNo: "", issuanceDate: "", qualityApprovalDate: "", inwardQty: "", usedQty: "" }]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: typeof window !== "undefined" ? localStorage.getItem("currentWarehouse") || "A185" : "A185",
      report_date: date, start_time: startTime, product_name: productName, batch_number: batchNumber,
      work_order_no: workOrderNo, packing_date: packingDate, expiry_date: expiryDate, size_packing: sizePacking,
      qty_produced: qtyProduced ? Number(qtyProduced) : null,
      ingredients: ingredients.filter((r) => r.ingredient).map((r) => ({ ingredient: r.ingredient, lot_no: r.lotNo, supplier: r.supplier, po_no: r.poNo, received_qty: r.receivedQty, issued_qty: r.issuedQty, date_of_issuance: r.dateOfIssuance })),
      pack_materials: packMaterials.filter((r) => r.material).map((r) => ({ material: r.material, lot_no: r.lotNo, supplier: r.supplier, po_no: r.poNo, issuance_date: r.issuanceDate, quality_approval_date: r.qualityApprovalDate, inward_qty: r.inwardQty, used_qty: r.usedQty })),
      doc_checks: docChecks,
      rm_qty: rmQty ? Number(rmQty) : null, fg_produced: fgProduced ? Number(fgProduced) : null,
      rejection_qty: rejectionQty ? Number(rejectionQty) : null, stock_balance: stockBalance ? Number(stockBalance) : null,
      conclusion, prepared_by: preparedBy, reviewed_by: reviewedBy,
    };
    try {
      if (onSubmit) { await onSubmit(payload); }
      else { const { docsApi } = await import("@/lib/api/documentations"); await docsApi.create("traceability", payload); setSuccess(true); }
    } catch (e: any) { alert(e.message || "Submit failed"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="border border-gray-300 mb-4 rounded">
        <div className="bg-gray-50 p-3">
          <h1 className="font-bold text-lg">CANDOR FOODS PRIVATE LIMITED</h1>
          <p className="text-sm font-semibold">Traceability Report</p>
          <p className="text-xs text-gray-600">Doc No: CFPLA.C3.F.30</p>
        </div>
      </div>
      <div className="border border-gray-300 rounded mb-4">
        {[{ l: "Date", v: date, s: setDate, t: "date" }, { l: "Start Time", v: startTime, s: setStartTime, t: "time" }, { l: "Product Name", v: productName, s: setProductName }, { l: "Batch Number (Coding Format)", v: batchNumber, s: setBatchNumber }, { l: "Work Order Number", v: workOrderNo, s: setWorkOrderNo }, { l: "Date of Packing", v: packingDate, s: setPackingDate, t: "date" }, { l: "Expiry Date", v: expiryDate, s: setExpiryDate, t: "date" }, { l: "Size/Packing", v: sizePacking, s: setSizePacking }, { l: "Quantity Produced (kg)", v: qtyProduced, s: setQtyProduced, t: "number" }].map((f) => (
          <div key={f.l} className="flex border-b border-gray-200 last:border-b-0">
            <label className="w-1/3 px-3 py-2 text-sm font-medium bg-gray-50 border-r border-gray-200">{f.l}</label>
            <div className="w-2/3 px-2 py-1"><input type={f.t || "text"} value={f.v} onChange={(e) => f.s(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" /></div>
          </div>
        ))}
      </div>

      <h3 className="font-semibold text-sm mb-2">Ingredients</h3>
      <div className="overflow-x-auto border border-gray-300 rounded mb-2">
        <table className="w-full text-xs">
          <thead className="bg-gray-100"><tr>{["Ingredients", "Lot No", "Supplier", "PO No.", "Received Qty", "Issued Qty", "Date of Issuance"].map((h) => <th key={h} className="border border-gray-300 px-2 py-1">{h}</th>)}</tr></thead>
          <tbody>
            {ingredients.map((r) => (
              <tr key={r.id} className="hover:bg-blue-50">
                {(["ingredient", "lotNo", "supplier", "poNo", "receivedQty", "issuedQty", "dateOfIssuance"] as (keyof IngRow)[]).map((f) => (
                  <td key={f} className="border border-gray-300 px-1 py-1"><input type={f === "dateOfIssuance" ? "date" : "text"} value={r[f] as string} onChange={(e) => setIngredients((p) => p.map((x) => (x.id === r.id ? { ...x, [f]: e.target.value } : x)))} className="w-full border rounded px-1 py-0.5" /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={addIng} className="mb-4 bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700">+ Add Ingredient</button>

      <h3 className="font-semibold text-sm mb-2">Packing Materials</h3>
      <div className="overflow-x-auto border border-gray-300 rounded mb-2">
        <table className="w-full text-xs">
          <thead className="bg-gray-100"><tr>{["Material", "Lot No", "Supplier", "PO No.", "Issuance Date", "Quality Approval Date", "Inward Qty", "Used Qty"].map((h) => <th key={h} className="border border-gray-300 px-2 py-1">{h}</th>)}</tr></thead>
          <tbody>
            {packMaterials.map((r) => (
              <tr key={r.id} className="hover:bg-blue-50">
                {(["material", "lotNo", "supplier", "poNo", "issuanceDate", "qualityApprovalDate", "inwardQty", "usedQty"] as (keyof PackRow)[]).map((f) => (
                  <td key={f} className="border border-gray-300 px-1 py-1"><input type={f.includes("Date") ? "date" : "text"} value={r[f] as string} onChange={(e) => setPackMaterials((p) => p.map((x) => (x.id === r.id ? { ...x, [f]: e.target.value } : x)))} className="w-full border rounded px-1 py-0.5" /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={addPack} className="mb-4 bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700">+ Add Material</button>

      <h3 className="font-semibold text-sm mb-2">Mass Balance</h3>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[{ l: "RM Quantity", v: rmQty, s: setRmQty }, { l: "Total FG Produced", v: fgProduced, s: setFgProduced }, { l: "Rejection Qty", v: rejectionQty, s: setRejectionQty }, { l: "Stock Balance", v: stockBalance, s: setStockBalance }].map((f) => (
          <div key={f.l}><label className="text-xs font-medium">{f.l}</label><input type="number" value={f.v} onChange={(e) => f.s(e.target.value)} className="border rounded px-2 py-1 w-full text-sm" /></div>
        ))}
      </div>

      <h3 className="font-semibold text-sm mb-2">Documents Review Checklist</h3>
      <div className="border border-gray-300 rounded mb-4">
        {TRACE_DOCS.map((doc, i) => (
          <div key={i} className="flex items-center border-b border-gray-200 last:border-b-0 px-3 py-1.5">
            <span className="w-8 text-xs text-gray-500">{i + 1}.</span>
            <span className="flex-1 text-sm">{doc}</span>
            <div className="flex gap-2">
              {(["Yes", "No"] as const).map((v) => (
                <label key={v} className={`px-2 py-0.5 rounded border text-xs cursor-pointer ${docChecks[doc] === v ? (v === "Yes" ? "bg-green-100 border-green-400" : "bg-red-100 border-red-400") : "border-gray-300"}`}>
                  <input type="radio" name={`doc-${i}`} className="sr-only" checked={docChecks[doc] === v} onChange={() => setDocChecks((p) => ({ ...p, [doc]: v }))} />{v}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div><label className="text-sm font-medium">Overall Conclusion</label><textarea value={conclusion} onChange={(e) => setConclusion(e.target.value)} rows={2} className="border rounded px-3 py-2 w-full" /></div>
        <div><label className="text-sm font-medium">Prepared By</label><input type="text" value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} className="border rounded px-3 py-2 w-full" /></div>
        <div><label className="text-sm font-medium">Reviewed By</label><input type="text" value={reviewedBy} onChange={(e) => setReviewedBy(e.target.value)} className="border rounded px-3 py-2 w-full" /></div>
      </div>
      <button onClick={handleSubmit} disabled={submitting} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
        {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
      </button>
      {success && <p className="text-green-600 text-sm mt-2">Record saved successfully!</p>}
    </div>
  );
}

// ===================== F.32 — Lux Monitoring Record =====================
interface LuxRow { id: number; location: string; tableNo: string; r1: string; r2: string; r3: string; r4: string; r5: string; correctiveAction: string; }
const eLux = (id: number, loc: string): LuxRow => ({ id, location: loc, tableNo: "", r1: "", r2: "", r3: "", r4: "", r5: "", correctiveAction: "" });
const LUX_LOCATIONS = ["Lower Basement", "", "", "", "", "", "", "", "", "First Floor Mezzanine", "", "", "", "", "", ""];

interface LuxMonitoringRecordProps {
  initialData?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => Promise<void>;
  isEdit?: boolean;
}

export function LuxMonitoringRecord({ initialData, onSubmit, isEdit }: LuxMonitoringRecordProps = {}) {
  const [date, setDate] = useState(initialData?.check_date || ""); const [checkedBy, setCheckedBy] = useState(initialData?.checked_by || ""); const [verifiedBy, setVerifiedBy] = useState(initialData?.verified_by || "");
  const [rows, setRows] = useState<LuxRow[]>(() => {
    if (initialData?.rows && Array.isArray(initialData.rows)) {
      return initialData.rows.map((r: any, i: number) => ({ id: i + 1, location: r.location || "", tableNo: r.table_no || "", r1: r.r1 || "", r2: r.r2 || "", r3: r.r3 || "", r4: r.r4 || "", r5: r.r5 || "", correctiveAction: r.corrective_action || "" }));
    }
    return LUX_LOCATIONS.map((l, i) => eLux(i + 1, l));
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const add = () => setRows((p) => [...p, eLux(p.length + 1, "")]);
  const rm = (id: number) => { if (rows.length > 1) setRows((p) => p.filter((r) => r.id !== id)); };
  const up = (id: number, f: keyof LuxRow, v: string) => setRows((p) => p.map((r) => (r.id === id ? { ...r, [f]: v } : r)));

  const handleSubmit = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: typeof window !== "undefined" ? localStorage.getItem("currentWarehouse") || "A185" : "A185",
      check_date: date, checked_by: checkedBy, verified_by: verifiedBy,
      rows: rows.filter((r) => r.location || r.tableNo).map((r) => ({ location: r.location, table_no: r.tableNo, r1: r.r1, r2: r.r2, r3: r.r3, r4: r.r4, r5: r.r5, corrective_action: r.correctiveAction })),
    };
    try {
      if (onSubmit) { await onSubmit(payload); }
      else { const { docsApi } = await import("@/lib/api/documentations"); await docsApi.create("lux-monitoring", payload); setSuccess(true); }
    } catch (e: any) { alert(e.message || "Submit failed"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="border border-gray-300 mb-4 rounded">
        <div className="bg-gray-50 p-3">
          <h1 className="font-bold text-lg">CANDOR FOODS PRIVATE LIMITED</h1>
          <p className="text-sm font-semibold">Lux Monitoring Record</p>
          <p className="text-xs text-gray-600">Doc No: CFPLA.C4.F.32</p>
        </div>
      </div>
      <div className="mb-4"><label className="block text-sm font-medium mb-1">Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border rounded px-3 py-2 w-64" /></div>
      <div className="overflow-x-auto border border-gray-300 rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-100"><tr>{["Location", "Table No.", "R1", "R2", "R3", "R4", "R5", "Corrective Action", ""].map((h) => <th key={h} className="border border-gray-300 px-2 py-2">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-blue-50">
                {(["location", "tableNo", "r1", "r2", "r3", "r4", "r5", "correctiveAction"] as (keyof LuxRow)[]).map((f) => (
                  <td key={f} className="border border-gray-300 px-1 py-1"><input type={["r1", "r2", "r3", "r4", "r5"].includes(f) ? "number" : "text"} value={r[f] as string} onChange={(e) => up(r.id, f, e.target.value)} className="w-full border rounded px-1 py-0.5" /></td>
                ))}
                <td className="border border-gray-300 px-1 py-1 text-center"><button onClick={() => rm(r.id)} className="text-red-500 text-xs">✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={add} className="mt-2 bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700">+ Add Row</button>
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div><label className="text-sm font-medium">Checked By</label><input type="text" value={checkedBy} onChange={(e) => setCheckedBy(e.target.value)} className="border rounded px-3 py-2 w-full" /></div>
        <div><label className="text-sm font-medium">Verified By</label><input type="text" value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} className="border rounded px-3 py-2 w-full" /></div>
      </div>
      <div className="mt-2 text-xs text-gray-500">Prepared by: FST | Approved by: FSTL</div>
      <button onClick={handleSubmit} disabled={submitting} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
        {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
      </button>
      {success && <p className="text-green-600 text-sm mt-2">Record saved successfully!</p>}
    </div>
  );
}

// ===================== F.34 — Pre Weighing Check Record =====================
interface PreWeighRow { id: number; rawMaterial: string; qty: string; noOfBags: string; batchLotNo: string; remark: string; }
const ePW = (id: number): PreWeighRow => ({ id, rawMaterial: "", qty: "", noOfBags: "", batchLotNo: "", remark: "" });

interface PreWeighingCheckRecordProps {
  initialData?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => Promise<void>;
  isEdit?: boolean;
}

export function PreWeighingCheckRecord({ initialData, onSubmit, isEdit }: PreWeighingCheckRecordProps = {}) {
  const [date, setDate] = useState(initialData?.check_date || ""); const [customer, setCustomer] = useState(initialData?.customer || ""); const [product, setProduct] = useState(initialData?.product || "");
  const [rmAnalysisDate, setRmAnalysisDate] = useState(initialData?.rm_analysis_date || ""); const [rmAnalysisDoneBy, setRmAnalysisDoneBy] = useState(initialData?.rm_analysis_done_by || "");
  const [checkedBy, setCheckedBy] = useState(initialData?.checked_by || ""); const [verifiedBy, setVerifiedBy] = useState(initialData?.verified_by || "");
  const [rows, setRows] = useState<PreWeighRow[]>(() => {
    if (initialData?.rows && Array.isArray(initialData.rows)) {
      return initialData.rows.map((r: any, i: number) => ({ id: i + 1, rawMaterial: r.raw_material || "", qty: r.qty?.toString() || "", noOfBags: r.no_of_bags?.toString() || "", batchLotNo: r.batch_lot_no || "", remark: r.remark || "" }));
    }
    return Array.from({ length: 10 }, (_, i) => ePW(i + 1));
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const add = () => setRows((p) => [...p, ePW(p.length + 1)]);
  const rm = (id: number) => { if (rows.length > 1) setRows((p) => p.filter((r) => r.id !== id)); };
  const up = (id: number, f: keyof PreWeighRow, v: string) => setRows((p) => p.map((r) => (r.id === id ? { ...r, [f]: v } : r)));

  const handleSubmit = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: typeof window !== "undefined" ? localStorage.getItem("currentWarehouse") || "A185" : "A185",
      check_date: date, customer, product, rm_analysis_date: rmAnalysisDate, rm_analysis_done_by: rmAnalysisDoneBy,
      checked_by: checkedBy, verified_by: verifiedBy,
      rows: rows.filter((r) => r.rawMaterial).map((r) => ({ raw_material: r.rawMaterial, qty: r.qty ? Number(r.qty) : null, no_of_bags: r.noOfBags ? Number(r.noOfBags) : null, batch_lot_no: r.batchLotNo, remark: r.remark })),
    };
    try {
      if (onSubmit) { await onSubmit(payload); }
      else { const { docsApi } = await import("@/lib/api/documentations"); await docsApi.create("pre-weighing", payload); setSuccess(true); }
    } catch (e: any) { alert(e.message || "Submit failed"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="border border-gray-300 mb-4 rounded">
        <div className="bg-gray-50 p-3">
          <h1 className="font-bold text-lg">Candor Foods Private Limited</h1>
          <p className="text-sm font-semibold">Pre Weighing Check Record</p>
          <p className="text-xs text-gray-600">Doc No: CFPLA.C6.F.34 | Issue Date: 13/05/2025</p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <div><label className="block text-sm font-medium mb-1">Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border rounded px-3 py-2 w-full" /></div>
        <div><label className="block text-sm font-medium mb-1">Customer</label><input type="text" value={customer} onChange={(e) => setCustomer(e.target.value)} className="border rounded px-3 py-2 w-full" /></div>
        <div><label className="block text-sm font-medium mb-1">Product</label><input type="text" value={product} onChange={(e) => setProduct(e.target.value)} className="border rounded px-3 py-2 w-full" /></div>
        <div><label className="block text-sm font-medium mb-1">RM Analysis Date</label><input type="date" value={rmAnalysisDate} onChange={(e) => setRmAnalysisDate(e.target.value)} className="border rounded px-3 py-2 w-full" /></div>
        <div><label className="block text-sm font-medium mb-1">RM Analysis Done By</label><input type="text" value={rmAnalysisDoneBy} onChange={(e) => setRmAnalysisDoneBy(e.target.value)} className="border rounded px-3 py-2 w-full" /></div>
      </div>
      <div className="overflow-x-auto border border-gray-300 rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-100"><tr>{["Sr. No.", "Raw Material", "Qty", "No. of Bags", "Batch Number/Lot No./Challan No./Invoice No.", "Remark", ""].map((h) => <th key={h} className="border border-gray-300 px-2 py-2">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="hover:bg-blue-50">
                <td className="border border-gray-300 px-2 py-1 text-center">{i + 1}</td>
                {(["rawMaterial", "qty", "noOfBags", "batchLotNo", "remark"] as (keyof PreWeighRow)[]).map((f) => (
                  <td key={f} className="border border-gray-300 px-1 py-1"><input type={f === "qty" || f === "noOfBags" ? "number" : "text"} value={r[f] as string} onChange={(e) => up(r.id, f, e.target.value)} className="w-full border rounded px-1 py-0.5" /></td>
                ))}
                <td className="border border-gray-300 px-1 py-1 text-center"><button onClick={() => rm(r.id)} className="text-red-500 text-xs">✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={add} className="mt-2 bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700">+ Add Row</button>
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div><label className="text-sm font-medium">Checked By (Team Leader)</label><input type="text" value={checkedBy} onChange={(e) => setCheckedBy(e.target.value)} className="border rounded px-3 py-2 w-full" /></div>
        <div><label className="text-sm font-medium">Verified By (Floor Manager)</label><input type="text" value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} className="border rounded px-3 py-2 w-full" /></div>
      </div>
      <button onClick={handleSubmit} disabled={submitting} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
        {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
      </button>
      {success && <p className="text-green-600 text-sm mt-2">Record saved successfully!</p>}
    </div>
  );
}

// ===================== F.37 — Daily Fly Catcher Check =====================
interface FlyRow { id: number; location: string; flyCatcherNo: string; date: string; gluePadStatus: "Cleaned" | "Uncleaned" | ""; fliesWeight: string; integrityTubelights: string; doneBy: string; observation: string; correctiveAction: string; verifiedBy: string; }
const eFC = (id: number): FlyRow => ({ id, location: "", flyCatcherNo: "", date: "", gluePadStatus: "", fliesWeight: "", integrityTubelights: "", doneBy: "", observation: "", correctiveAction: "", verifiedBy: "" });

interface DailyFlyCatcherCheckProps {
  initialData?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => Promise<void>;
  isEdit?: boolean;
}

export function DailyFlyCatcherCheck({ initialData, onSubmit, isEdit }: DailyFlyCatcherCheckProps = {}) {
  const [rows, setRows] = useState<FlyRow[]>(() => {
    if (initialData?.rows && Array.isArray(initialData.rows)) {
      return initialData.rows.map((r: any, i: number) => ({ id: i + 1, location: r.location || "", flyCatcherNo: r.fly_catcher_no || "", date: r.date || "", gluePadStatus: r.glue_pad_status || "", fliesWeight: r.flies_weight?.toString() || "", integrityTubelights: r.integrity_tubelights || "", doneBy: r.done_by || "", observation: r.observation || "", correctiveAction: r.corrective_action || "", verifiedBy: r.verified_by || "" }));
    }
    return Array.from({ length: 8 }, (_, i) => eFC(i + 1));
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const add = () => setRows((p) => [...p, eFC(p.length + 1)]);
  const rm = (id: number) => { if (rows.length > 1) setRows((p) => p.filter((r) => r.id !== id)); };
  const up = (id: number, f: keyof FlyRow, v: string) => setRows((p) => p.map((r) => (r.id === id ? { ...r, [f]: v } : r)));

  const handleSubmit = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: typeof window !== "undefined" ? localStorage.getItem("currentWarehouse") || "A185" : "A185",
      rows: rows.filter((r) => r.location || r.flyCatcherNo).map((r) => ({ location: r.location, fly_catcher_no: r.flyCatcherNo, date: r.date, glue_pad_status: r.gluePadStatus, flies_weight: r.fliesWeight ? Number(r.fliesWeight) : null, integrity_tubelights: r.integrityTubelights, done_by: r.doneBy, observation: r.observation, corrective_action: r.correctiveAction, verified_by: r.verifiedBy })),
    };
    try {
      if (onSubmit) { await onSubmit(payload); }
      else { const { docsApi } = await import("@/lib/api/documentations"); await docsApi.create("fly-catcher", payload); setSuccess(true); }
    } catch (e: any) { alert(e.message || "Submit failed"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="p-4 max-w-full mx-auto">
      <div className="border border-gray-300 mb-4 rounded">
        <div className="bg-gray-50 p-3">
          <h1 className="font-bold text-lg">CANDOR FOODS PRIVATE LIMITED</h1>
          <p className="text-sm font-semibold">Daily Checks for Fly Catcher (EFC) - Inhouse</p>
          <p className="text-xs text-gray-600">Doc No: CFPLA.C7.F.37</p>
        </div>
      </div>
      <div className="overflow-x-auto border border-gray-300 rounded">
        <table className="w-full text-xs">
          <thead className="bg-gray-100"><tr>{["Location", "Fly Catcher No.", "Date", "Glue Pad Status", "Flies Qty (gms)", "Integrity of Tubelights", "Done By", "Observation", "Corrective Action", "Verified By", ""].map((h) => <th key={h} className="border border-gray-300 px-2 py-2">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-blue-50">
                <td className="border border-gray-300 px-1 py-1"><input type="text" value={r.location} onChange={(e) => up(r.id, "location", e.target.value)} className="w-full border rounded px-1 py-0.5" /></td>
                <td className="border border-gray-300 px-1 py-1"><input type="text" value={r.flyCatcherNo} onChange={(e) => up(r.id, "flyCatcherNo", e.target.value)} className="w-16 border rounded px-1 py-0.5" /></td>
                <td className="border border-gray-300 px-1 py-1"><input type="date" value={r.date} onChange={(e) => up(r.id, "date", e.target.value)} className="w-full border rounded px-1 py-0.5" /></td>
                <td className="border border-gray-300 px-1 py-1">
                  <select value={r.gluePadStatus} onChange={(e) => up(r.id, "gluePadStatus", e.target.value)} className={`w-full border rounded px-1 py-0.5 ${r.gluePadStatus === "Cleaned" ? "bg-green-100" : r.gluePadStatus === "Uncleaned" ? "bg-red-100" : ""}`}>
                    <option value="">-</option><option value="Cleaned">Cleaned</option><option value="Uncleaned">Uncleaned</option>
                  </select>
                </td>
                <td className="border border-gray-300 px-1 py-1"><input type="number" value={r.fliesWeight} onChange={(e) => up(r.id, "fliesWeight", e.target.value)} className="w-16 border rounded px-1 py-0.5" step="0.1" /></td>
                <td className="border border-gray-300 px-1 py-1"><input type="text" value={r.integrityTubelights} onChange={(e) => up(r.id, "integrityTubelights", e.target.value)} className="w-full border rounded px-1 py-0.5" /></td>
                <td className="border border-gray-300 px-1 py-1"><input type="text" value={r.doneBy} onChange={(e) => up(r.id, "doneBy", e.target.value)} className="w-full border rounded px-1 py-0.5" /></td>
                <td className="border border-gray-300 px-1 py-1"><input type="text" value={r.observation} onChange={(e) => up(r.id, "observation", e.target.value)} className="w-full border rounded px-1 py-0.5" /></td>
                <td className="border border-gray-300 px-1 py-1"><input type="text" value={r.correctiveAction} onChange={(e) => up(r.id, "correctiveAction", e.target.value)} className="w-full border rounded px-1 py-0.5" /></td>
                <td className="border border-gray-300 px-1 py-1"><input type="text" value={r.verifiedBy} onChange={(e) => up(r.id, "verifiedBy", e.target.value)} className="w-full border rounded px-1 py-0.5" /></td>
                <td className="border border-gray-300 px-1 py-1 text-center"><button onClick={() => rm(r.id)} className="text-red-500 text-xs">✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={add} className="mt-2 bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700">+ Add Row</button>
      <div className="mt-2 text-xs text-gray-500">Prepared by: FST | Approved by: FSTL</div>
      <button onClick={handleSubmit} disabled={submitting} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
        {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
      </button>
      {success && <p className="text-green-600 text-sm mt-2">Record saved successfully!</p>}
    </div>
  );
}

// ===================== F.43 — CCP Roasting Bar Line =====================
interface BarRoastRow { id: number; date: string; skuName: string; qtyUnitsKg: string; setTemp: string; inTime: string; qcTime: string; qcTemp: string; outTime: string; operatorSign: string; qcSign: string; }
const eBR = (id: number): BarRoastRow => ({ id, date: "", skuName: "", qtyUnitsKg: "", setTemp: "", inTime: "", qcTime: "", qcTemp: "", outTime: "", operatorSign: "", qcSign: "" });

interface CCPRoastingBarLineProps {
  initialData?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => Promise<void>;
  isEdit?: boolean;
}

export function CCPRoastingBarLine({ initialData, onSubmit, isEdit }: CCPRoastingBarLineProps = {}) {
  const [rows, setRows] = useState<BarRoastRow[]>(() => {
    if (initialData?.rows && Array.isArray(initialData.rows)) {
      return initialData.rows.map((r: any, i: number) => ({ id: i + 1, date: r.date || "", skuName: r.sku_name || "", qtyUnitsKg: r.qty_units_kg || "", setTemp: r.set_temp || "", inTime: r.in_time || "", qcTime: r.qc_time || "", qcTemp: r.qc_temp || "", outTime: r.out_time || "", operatorSign: r.operator_sign || "", qcSign: r.qc_sign || "" }));
    }
    return Array.from({ length: 5 }, (_, i) => eBR(i + 1));
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const add = () => setRows((p) => [...p, eBR(p.length + 1)]);
  const rm = (id: number) => { if (rows.length > 1) setRows((p) => p.filter((r) => r.id !== id)); };
  const up = (id: number, f: keyof BarRoastRow, v: string) => setRows((p) => p.map((r) => (r.id === id ? { ...r, [f]: v } : r)));

  const handleSubmit = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: typeof window !== "undefined" ? localStorage.getItem("currentWarehouse") || "A185" : "A185",
      rows: rows.filter((r) => r.skuName || r.date).map((r) => ({ date: r.date, sku_name: r.skuName, qty_units_kg: r.qtyUnitsKg, set_temp: r.setTemp, in_time: r.inTime, qc_time: r.qcTime, qc_temp: r.qcTemp, out_time: r.outTime, operator_sign: r.operatorSign, qc_sign: r.qcSign })),
    };
    try {
      if (onSubmit) { await onSubmit(payload); }
      else { const { docsApi } = await import("@/lib/api/documentations"); await docsApi.create("ccp-roasting-bar", payload); setSuccess(true); }
    } catch (e: any) { alert(e.message || "Submit failed"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="p-4 max-w-full mx-auto">
      <div className="border border-gray-300 mb-4 rounded">
        <div className="bg-gray-50 p-3">
          <h1 className="font-bold text-lg">CANDOR FOODS PRIVATE LIMITED</h1>
          <p className="text-sm font-semibold">Monitoring and Verification of CCP - Roasting Temperature & Time (Bar Line)</p>
          <p className="text-xs text-gray-600">Doc No: CFPLA.C2.F.43</p>
        </div>
      </div>
      <div className="overflow-x-auto border border-gray-300 rounded">
        <table className="w-full text-xs">
          <thead className="bg-gray-100"><tr>{["Sr.", "Date", "SKU Name", "Qty (Units/Kg)", "Set Temp", "In Time", "QC Time", "QC Temp", "Out Time", "Operator Sign", "QC Sign", ""].map((h) => <th key={h} className="border border-gray-300 px-2 py-2">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="hover:bg-blue-50">
                <td className="border border-gray-300 px-1 py-1 text-center">{i + 1}</td>
                {(["date", "skuName", "qtyUnitsKg", "setTemp", "inTime", "qcTime", "qcTemp", "outTime", "operatorSign", "qcSign"] as (keyof BarRoastRow)[]).map((f) => (
                  <td key={f} className="border border-gray-300 px-1 py-1"><input type={f === "date" ? "date" : (f as string).includes("Time") ? "time" : "text"} value={r[f] as string} onChange={(e) => up(r.id, f, e.target.value)} className="w-full border rounded px-1 py-0.5" /></td>
                ))}
                <td className="border border-gray-300 px-1 py-1 text-center"><button onClick={() => rm(r.id)} className="text-red-500 text-xs">✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={add} className="mt-2 bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700">+ Add Row</button>
      <div className="mt-2 text-xs text-gray-500">Prepared by: FST | Approved by: FSTL</div>
      <button onClick={handleSubmit} disabled={submitting} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
        {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
      </button>
      {success && <p className="text-green-600 text-sm mt-2">Record saved successfully!</p>}
    </div>
  );
}

// ===================== F.45 — Incoming Vehicle Inspection Record =====================
const VEHICLE_PARAMS = ["Driver's license (Yes/No)", "Security Lock", "Type of carrier (Full covered / Open roof)", "Mode of covering products (in case of open roof)", "Integrity of cover/container", "Overall hygiene in the interior & exterior", "Any sharp edges/points in the interior", "Any pest detected", "Any Grease/Oil Detected", "Any other material than food", "Any off odor (Yes/No)", "Vehicle Temperature (Cold/Ambient)"];

interface IncomingVehicleInspectionProps {
  initialData?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => Promise<void>;
  isEdit?: boolean;
}

export function IncomingVehicleInspection({ initialData, onSubmit, isEdit }: IncomingVehicleInspectionProps = {}) {
  const [info, setInfo] = useState<Record<string, string>>(() => initialData?.info || {});
  const [params, setParams] = useState<Record<string, string>>(() => initialData?.params || {});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const upI = (k: string, v: string) => setInfo((p) => ({ ...p, [k]: v }));
  const upP = (k: string, v: string) => setParams((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: typeof window !== "undefined" ? localStorage.getItem("currentWarehouse") || "A185" : "A185",
      info, params,
      inspection_date: info["Date of Vehicle Inward"] || null,
      vendor_name: info["Vendor Name"] || null,
      vehicle_number: info["Vehicle Number"] || null,
    };
    try {
      if (onSubmit) { await onSubmit(payload); }
      else { const { docsApi } = await import("@/lib/api/documentations"); await docsApi.create("vehicle-inspection", payload); setSuccess(true); }
    } catch (e: any) { alert(e.message || "Submit failed"); }
    finally { setSubmitting(false); }
  };

  const INFO_FIELDS = [{ l: "Date of Vehicle Inward", t: "date" }, { l: "Vendor Name" }, { l: "Commodity Name" }, { l: "Transporter's Name" }, { l: "Transporter FSSAI License Number" }, { l: "Vehicle Number" }, { l: "Location (received from)" }, { l: "Driver's Name and Number" }, { l: "Unloading Time", t: "time" }];

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="border border-gray-300 mb-4 rounded">
        <div className="bg-gray-50 p-3">
          <h1 className="font-bold text-lg">CANDOR FOODS PRIVATE LIMITED</h1>
          <p className="text-sm font-semibold">Incoming Vehicle Inspection Record</p>
          <p className="text-xs text-gray-600">Doc No: CFPLA.C3.F.45 | Issue No: 04 | Rev Date: 05/10/2023 | Rev No: 03</p>
        </div>
      </div>

      <h3 className="font-semibold text-sm mb-2">Vehicle Information</h3>
      <div className="border border-gray-300 rounded mb-4">
        {INFO_FIELDS.map((f) => (
          <div key={f.l} className="flex border-b border-gray-200 last:border-b-0">
            <label className="w-1/2 px-3 py-2 text-sm font-medium bg-gray-50 border-r border-gray-200">{f.l}</label>
            <div className="w-1/2 px-2 py-1"><input type={f.t || "text"} value={info[f.l] || ""} onChange={(e) => upI(f.l, e.target.value)} className="w-full border rounded px-2 py-1 text-sm" /></div>
          </div>
        ))}
      </div>

      <h3 className="font-semibold text-sm mb-2">Parameters Evaluated</h3>
      <div className="border border-gray-300 rounded mb-4">
        {VEHICLE_PARAMS.map((p) => (
          <div key={p} className="flex border-b border-gray-200 last:border-b-0">
            <label className="w-1/2 px-3 py-2 text-sm font-medium bg-gray-50 border-r border-gray-200">{p}</label>
            <div className="w-1/2 px-2 py-1"><input type="text" value={params[p] || ""} onChange={(e) => upP(p, e.target.value)} className="w-full border rounded px-2 py-1 text-sm" placeholder="Observation" /></div>
          </div>
        ))}
      </div>

      <div className="mt-2 text-xs text-gray-500">Prepared by: FST | Approved by: FSTL</div>
      <button onClick={handleSubmit} disabled={submitting} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
        {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
      </button>
      {success && <p className="text-green-600 text-sm mt-2">Record saved successfully!</p>}
    </div>
  );
}

export default FirstAidBoxRecord;
