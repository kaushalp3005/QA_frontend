"use client";
import { useState } from "react";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";
// The checklist is the same document set the Traceability Report reviews,
// photos included, so both formats render the one component.
import DocumentsReviewChecklist, {
  buildDocReviewPayload,
  readDocReview,
  type DocReview,
} from "@/components/forms/DocumentsReviewChecklist";

/*
 * CFPLA.C3.F.31 — Mock Recall Format (Issue 03 · Rev 02 · 01/10/2025).
 * Field-for-field with the controlled paper format: recall header, severity
 * classification, notified bodies, quantity reconciliation, effectiveness,
 * material integration and the closing sample / efficiency summary.
 */

const SEVERITY_CLASSES = [
  { value: "Class I", note: "A health hazard situation in which there is a reasonable probability that ingesting the food will cause health problems or death." },
  { value: "Class II", note: "A potential health hazard situation in which there is a remote probability of adverse health consequences from eating the food." },
  { value: "Class III", note: "A situation in which eating the food will not cause adverse health consequences." },
];

/** The two bodies the paper format lists as pre-printed rows. */
const DEFAULT_NOTIFICATIONS = [
  { id: 1, body: "Certification Body: DNV", contact: "CertSupport.India@dnv.com" },
  { id: 2, body: "FSSAI", contact: "helpdesk-foscos@fssai.gov.in" },
];

const DEFAULT_REASON = "Mock Recall to test the internal traceability.";

interface NotificationRow { id: number; body: string; contact: string }
interface MemberRow { id: number; name: string; sign: string }
interface MaterialRow { id: number; rawMaterial: string; lotNo: string; productionDate: string; consignee: string; quantity: string }

const emptyMember = (id: number): MemberRow => ({ id, name: "", sign: "" });
const emptyMaterial = (id: number): MaterialRow => ({ id, rawMaterial: "", lotNo: "", productionDate: "", consignee: "", quantity: "" });

const num = (v: string) => (v.trim() === "" ? null : Number(v));

interface MockRecallProps {
  initialData?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => Promise<void>;
  isEdit?: boolean;
  /**
   * Shared Documents Review Checklist — the same documents the Traceability
   * Report reviews, so the create page owns one answer set for both tabs.
   * Left out, the form keeps its own copy.
   */
  docChecks?: DocReview;
  onDocChecksChange?: React.Dispatch<React.SetStateAction<DocReview>>;
}

export default function MockRecall({
  initialData,
  onSubmit,
  isEdit,
  docChecks: sharedDocChecks,
  onDocChecksChange,
}: MockRecallProps = {}) {
  const d = initialData;

  // ── Recall details ──
  const [recallDate, setRecallDate] = useState(d?.recall_date || "");
  const [coordinator, setCoordinator] = useState(d?.recall_coordinator || "");
  const [reason, setReason] = useState(d?.reason_for_recall ?? DEFAULT_REASON);
  const [initiatedBy, setInitiatedBy] = useState(d?.initiated_by || "");
  const [productName, setProductName] = useState(d?.product_name || "");
  const [productBrand, setProductBrand] = useState(d?.product_brand || "");
  const [productionDate, setProductionDate] = useState(d?.production_date || "");
  const [batchNumber, setBatchNumber] = useState(d?.batch_number || "");
  const [shipmentDate, setShipmentDate] = useState(d?.shipment_date || "");

  // ── Classification ──
  const [severity, setSeverity] = useState<string>(d?.severity_class || "Class III");
  const [cause, setCause] = useState(d?.cause_identification || "");
  const [recallOrWithdraw, setRecallOrWithdraw] = useState<"Yes" | "No">(d?.recall_or_withdraw === "Yes" ? "Yes" : "No");

  // ── Notified bodies ──
  const [notifications, setNotifications] = useState<NotificationRow[]>(() => {
    const src = d?.notifications;
    if (Array.isArray(src) && src.length) {
      return src.map((r: any, i: number) => ({ id: i + 1, body: r.body || "", contact: r.contact || "" }));
    }
    return DEFAULT_NOTIFICATIONS.map((r) => ({ ...r }));
  });

  const [completionHours, setCompletionHours] = useState(d?.completion_hours?.toString() || "");
  const [conclusion, setConclusion] = useState(d?.conclusion || "");

  // ── Team ──
  const [members, setMembers] = useState<MemberRow[]>(() => {
    const src = d?.team_members;
    if (Array.isArray(src) && src.length) {
      return src.map((r: any, i: number) => ({ id: i + 1, name: r.name || "", sign: r.sign || "" }));
    }
    return Array.from({ length: 4 }, (_, i) => emptyMember(i + 1));
  });

  // ── Mock traceability data ──
  const [startTime, setStartTime] = useState(d?.start_time || "");
  const [productionQty, setProductionQty] = useState(d?.production_qty?.toString() || "");
  const [productionUnit, setProductionUnit] = useState(d?.production_unit || "MT");
  const [remainingQty, setRemainingQty] = useState(d?.remaining_stock_qty?.toString() || "");
  const [remainingUnit, setRemainingUnit] = useState(d?.remaining_stock_unit || "MT");
  const [distributedQty, setDistributedQty] = useState(d?.distributed_qty?.toString() || "");
  const [distributedUnit, setDistributedUnit] = useState(d?.distributed_unit || "MT");

  // ── Quantity reconciliation (rows A / B / C of the paper format) ──
  const [qtyProduced, setQtyProduced] = useState(d?.qty_produced_supplied?.toString() || "");
  const [qtyInTransit, setQtyInTransit] = useState(d?.qty_in_transit?.toString() || "");
  const [qtyGodown, setQtyGodown] = useState(d?.qty_held_godown?.toString() || "");
  const [qtyDistributors, setQtyDistributors] = useState(d?.qty_held_distributors?.toString() || "");
  const [correctiveAction, setCorrectiveAction] = useState(d?.corrective_action || "");

  // Row C — what the produced quantity does not account for.
  const accountedFor = [qtyInTransit, qtyGodown, qtyDistributors].reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
  const totalUnaccounted =
    qtyProduced.trim() === "" ? "" : String(Math.round(((parseFloat(qtyProduced) || 0) - accountedFor) * 1000) / 1000);

  // ── Effectiveness ──
  const [customerFeedback, setCustomerFeedback] = useState(d?.customer_feedback || "");
  const [feedbackDate, setFeedbackDate] = useState(d?.customer_feedback_date || "");
  const [effectivenessRemarks, setEffectivenessRemarks] = useState(d?.effectiveness_remarks || "");

  // ── Raw/packing material integration ──
  const [materials, setMaterials] = useState<MaterialRow[]>(() => {
    const src = d?.material_integration;
    if (Array.isArray(src) && src.length) {
      return src.map((r: any, i: number) => ({
        id: i + 1,
        rawMaterial: r.raw_material || "",
        lotNo: r.lot_no || "",
        productionDate: r.production_date || "",
        consignee: r.consignee || "",
        quantity: r.quantity || "",
      }));
    }
    return [emptyMaterial(1)];
  });

  // ── Closing summary ──
  const [sampleQty, setSampleQty] = useState(d?.sample_qty || "");
  const [totalRecallQty, setTotalRecallQty] = useState(d?.total_quantity_recall || "");
  const [balanceStock, setBalanceStock] = useState(d?.balance_stock_qty || "");
  const [efficiencyPct, setEfficiencyPct] = useState(d?.recall_efficiency_pct?.toString() || "");
  const [endTime, setEndTime] = useState(d?.end_time || "");

  // ── Documents review checklist ──
  const [ownDocChecks, setOwnDocChecks] = useState<DocReview>(() => readDocReview(d?.documents_review));
  const docChecks = sharedDocChecks ?? ownDocChecks;
  const setDocChecks = onDocChecksChange ?? setOwnDocChecks;

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const buildPayload = (): Record<string, any> => ({
    warehouse: getStoredWarehouse() || null,
    recall_date: recallDate,
    recall_coordinator: coordinator,
    reason_for_recall: reason,
    initiated_by: initiatedBy,
    product_name: productName,
    product_brand: productBrand,
    production_date: productionDate,
    batch_number: batchNumber,
    shipment_date: shipmentDate,
    severity_class: severity,
    cause_identification: cause,
    recall_or_withdraw: recallOrWithdraw,
    notifications: notifications.filter((r) => r.body || r.contact).map((r) => ({ body: r.body, contact: r.contact })),
    completion_hours: num(completionHours),
    conclusion,
    team_members: members.filter((r) => r.name.trim()).map((r) => ({ name: r.name, sign: r.sign })),
    start_time: startTime,
    production_qty: num(productionQty),
    production_unit: productionUnit,
    remaining_stock_qty: num(remainingQty),
    remaining_stock_unit: remainingUnit,
    distributed_qty: num(distributedQty),
    distributed_unit: distributedUnit,
    qty_produced_supplied: num(qtyProduced),
    qty_in_transit: num(qtyInTransit),
    qty_held_godown: num(qtyGodown),
    qty_held_distributors: num(qtyDistributors),
    total_unaccounted: num(totalUnaccounted),
    corrective_action: correctiveAction,
    customer_feedback: customerFeedback,
    customer_feedback_date: feedbackDate,
    effectiveness_remarks: effectivenessRemarks,
    material_integration: materials.filter((r) => r.rawMaterial || r.lotNo).map((r) => ({
      raw_material: r.rawMaterial,
      lot_no: r.lotNo,
      production_date: r.productionDate,
      consignee: r.consignee,
      quantity: r.quantity,
    })),
    sample_qty: sampleQty,
    total_quantity_recall: totalRecallQty,
    balance_stock_qty: balanceStock,
    recall_efficiency_pct: num(efficiencyPct),
    end_time: endTime,
    documents_review: buildDocReviewPayload(docChecks),
  });

  const handleSubmit = async () => {
    setSubmitting(true);
    setMessage(null);
    try {
      const payload = buildPayload();
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        const { docsApi } = await import("@/lib/api/documentations");
        await docsApi.create("mock-recall", payload);
        setMessage({ kind: "ok", text: "Record submitted." });
      }
    } catch (e) {
      setMessage({ kind: "err", text: e instanceof Error ? e.message : "Save failed." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* ── Recall details ── */}
      <section className="surface-card overflow-hidden">
        <header className="px-4 sm:px-5 py-3 border-b border-cream-300 bg-cream-100/60">
          <h2 className="text-sm font-bold text-ink-600">Recall Details</h2>
        </header>
        <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label-base">Date of Recall</label>
            <input type="date" value={recallDate} onChange={(e) => setRecallDate(e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="label-base">Reason for Recall</label>
            <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="label-base">Recall Coordinator</label>
            <input type="text" value={coordinator} onChange={(e) => setCoordinator(e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="label-base">Traceability / Mock Recall Initiated By</label>
            <input type="text" value={initiatedBy} onChange={(e) => setInitiatedBy(e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="label-base">Product Name</label>
            <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="label-base">Product Brand</label>
            <input type="text" value={productBrand} onChange={(e) => setProductBrand(e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="label-base">Production Date</label>
            <input type="date" value={productionDate} onChange={(e) => setProductionDate(e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="label-base">Batch Number</label>
            <input type="text" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="label-base">Date of Shipment</label>
            <input type="date" value={shipmentDate} onChange={(e) => setShipmentDate(e.target.value)} className="input-base" />
          </div>
        </div>
      </section>

      {/* ── Classification ── */}
      <section className="surface-card overflow-hidden">
        <header className="px-4 sm:px-5 py-3 border-b border-cream-300 bg-cream-100/60">
          <h2 className="text-sm font-bold text-ink-600">Recall Classification</h2>
        </header>
        <div className="p-4 sm:p-5 space-y-4">
          <div>
            <label className="label-base">Severity</label>
            <div className="space-y-2">
              {SEVERITY_CLASSES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  role="radio"
                  aria-checked={severity === c.value}
                  onClick={() => setSeverity(c.value)}
                  className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors ${
                    severity === c.value ? "border-brand-300 bg-brand-50" : "border-cream-300 hover:bg-cream-100"
                  }`}
                >
                  <span className={`text-xs font-bold ${severity === c.value ? "text-brand-600" : "text-ink-500"}`}>{c.value}</span>
                  <p className="mt-0.5 text-[11px] leading-snug text-ink-400">{c.note}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label-base">Cause Identification</label>
            <textarea value={cause} onChange={(e) => setCause(e.target.value)} rows={2} className="input-base resize-y" />
          </div>

          <div>
            <label className="label-base">Whether the product needs to be recalled or withdrawn</label>
            <div className="flex gap-2" role="radiogroup" aria-label="Recalled or withdrawn">
              {(["Yes", "No"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={recallOrWithdraw === v}
                  onClick={() => setRecallOrWithdraw(v)}
                  className={`px-3.5 py-1.5 !min-h-0 rounded-md border text-xs font-semibold transition-colors ${
                    recallOrWithdraw === v
                      ? v === "Yes"
                        ? "bg-success-50 border-success-200 text-success-700"
                        : "bg-danger-50 border-danger-200 text-danger-600"
                      : "border-cream-300 text-ink-400 hover:bg-cream-100"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Notified bodies ── */}
      <section className="surface-card overflow-hidden">
        <header className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-cream-300 bg-cream-100/60">
          <h2 className="text-sm font-bold text-ink-600">Bodies Notified</h2>
          <button
            onClick={() => setNotifications((p) => [...p, { id: p.length + 1, body: "", contact: "" }])}
            className="btn-primary !py-1.5 !px-3 text-xs"
          >
            + Add Row
          </button>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-cream-100/70 border-b border-cream-300">
              <tr>
                {["Sr.", "Body", "Contact", ""].map((h) => (
                  <th key={h} className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {notifications.map((r, i) => (
                <tr key={r.id} className="hover:bg-cream-100/60">
                  <td className="px-2 py-1.5 text-center text-ink-400 font-medium w-10">{i + 1}</td>
                  <td className="px-1 py-1.5">
                    <input type="text" value={r.body} onChange={(e) => setNotifications((p) => p.map((x) => (x.id === r.id ? { ...x, body: e.target.value } : x)))} className="input-base !py-1 !px-2 text-xs" />
                  </td>
                  <td className="px-1 py-1.5">
                    <input type="text" value={r.contact} onChange={(e) => setNotifications((p) => p.map((x) => (x.id === r.id ? { ...x, contact: e.target.value } : x)))} className="input-base !py-1 !px-2 text-xs" />
                  </td>
                  <td className="px-1 py-1.5 text-center w-10">
                    <button onClick={() => setNotifications((p) => (p.length > 1 ? p.filter((x) => x.id !== r.id) : p))} className="inline-flex items-center justify-center w-6 h-6 rounded-md text-ink-400 hover:text-danger-600 hover:bg-danger-50">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Mock traceability data ── */}
      <section className="surface-card overflow-hidden">
        <header className="px-4 sm:px-5 py-3 border-b border-cream-300 bg-cream-100/60">
          <h2 className="text-sm font-bold text-ink-600">Mock Traceability Data</h2>
        </header>
        <div className="p-4 sm:p-5 space-y-3">
          <div className="sm:w-1/2">
            <label className="label-base">Start Time</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input-base" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-cream-100/70 border-b border-cream-300">
                <tr>
                  {["Stages", "Units (i.e. MT)", "Quantity"].map((h) => (
                    <th key={h} className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-300">
                {[
                  { label: "Production Qty.", unit: productionUnit, setUnit: setProductionUnit, qty: productionQty, setQty: setProductionQty },
                  { label: "Remaining stock Qty.", unit: remainingUnit, setUnit: setRemainingUnit, qty: remainingQty, setQty: setRemainingQty },
                  { label: "Distributed Qty.", unit: distributedUnit, setUnit: setDistributedUnit, qty: distributedQty, setQty: setDistributedQty },
                ].map((row) => (
                  <tr key={row.label} className="hover:bg-cream-100/60">
                    <td className="px-2 py-1.5 text-sm font-semibold text-ink-500 w-1/3">{row.label}</td>
                    <td className="px-1 py-1.5 w-1/3">
                      <input type="text" value={row.unit} onChange={(e) => row.setUnit(e.target.value)} className="input-base !py-1 !px-2 text-xs" />
                    </td>
                    <td className="px-1 py-1.5 w-1/3">
                      <input type="number" value={row.qty} onChange={(e) => row.setQty(e.target.value)} className="input-base !py-1 !px-2 text-xs" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Quantity reconciliation ── */}
      <section className="surface-card overflow-hidden">
        <header className="px-4 sm:px-5 py-3 border-b border-cream-300 bg-cream-100/60">
          <h2 className="text-sm font-bold text-ink-600">Corrective Action</h2>
        </header>
        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { l: "QTY produced or supplied", v: qtyProduced, s: setQtyProduced },
              { l: "QTY in transit", v: qtyInTransit, s: setQtyInTransit },
              { l: "QTY held in Godown", v: qtyGodown, s: setQtyGodown },
              { l: "QTY held by distributors or customer", v: qtyDistributors, s: setQtyDistributors },
            ].map((f) => (
              <div key={f.l}>
                <label className="label-base">{f.l}</label>
                <input type="number" value={f.v} onChange={(e) => f.s(e.target.value)} className="input-base" />
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-cream-300 bg-cream-100/60 px-3 py-2.5 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-ink-600">Total unaccounted or consumed</p>
              <p className="text-[11px] text-ink-400">Produced or supplied − (in transit + godown + distributors/customer)</p>
            </div>
            <span className="text-sm font-bold text-ink-600">{totalUnaccounted === "" ? "—" : totalUnaccounted}</span>
          </div>

          <div>
            <label className="label-base">Corrective Action</label>
            <textarea value={correctiveAction} onChange={(e) => setCorrectiveAction(e.target.value)} rows={2} className="input-base resize-y" />
          </div>
        </div>
      </section>

      {/* ── Effectiveness ── */}
      <section className="surface-card overflow-hidden">
        <header className="px-4 sm:px-5 py-3 border-b border-cream-300 bg-cream-100/60">
          <h2 className="text-sm font-bold text-ink-600">Mock Recall Effectiveness</h2>
        </header>
        <div className="p-4 sm:p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-3">
            <div>
              <label className="label-base">Customer Feedback</label>
              <input type="text" value={customerFeedback} onChange={(e) => setCustomerFeedback(e.target.value)} className="input-base" />
            </div>
            <div>
              <label className="label-base">Dated</label>
              <input type="date" value={feedbackDate} onChange={(e) => setFeedbackDate(e.target.value)} className="input-base" />
            </div>
          </div>
          <div>
            <label className="label-base">Cause &amp; corrective action if the mock recall is less than 100%</label>
            <textarea value={effectivenessRemarks} onChange={(e) => setEffectivenessRemarks(e.target.value)} rows={2} className="input-base resize-y" />
          </div>
        </div>
      </section>

      {/* ── Material integration ── */}
      <section className="surface-card overflow-hidden">
        <header className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-cream-300 bg-cream-100/60">
          <h2 className="text-sm font-bold text-ink-600">Raw / Packing Material Integration</h2>
          <button
            onClick={() => setMaterials((p) => [...p, emptyMaterial(p.length + 1)])}
            className="btn-primary !py-1.5 !px-3 text-xs"
          >
            + Add Row
          </button>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-cream-100/70 border-b border-cream-300">
              <tr>
                <th colSpan={2} className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400 border-r border-cream-300">Raw / Packing Material Integration</th>
                <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400 border-r border-cream-300">Production Details</th>
                <th colSpan={2} className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400">Dispatch Details</th>
                <th className="w-10" />
              </tr>
              <tr className="border-t border-cream-300">
                {["Raw Material & Packing Material", "Lot / Batch No.", "Date", "Name & Place of Consignee", "Quantity", ""].map((h, i) => (
                  <th key={i} className="px-2 py-1.5 text-left text-[10px] font-semibold text-ink-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {materials.map((r) => (
                <tr key={r.id} className="hover:bg-cream-100/60">
                  <td className="px-1 py-1.5">
                    <input type="text" value={r.rawMaterial} onChange={(e) => setMaterials((p) => p.map((x) => (x.id === r.id ? { ...x, rawMaterial: e.target.value } : x)))} className="input-base !py-1 !px-2 text-xs min-w-[150px]" />
                  </td>
                  <td className="px-1 py-1.5">
                    <input type="text" value={r.lotNo} onChange={(e) => setMaterials((p) => p.map((x) => (x.id === r.id ? { ...x, lotNo: e.target.value } : x)))} className="input-base !py-1 !px-2 text-xs" />
                  </td>
                  <td className="px-1 py-1.5">
                    <input type="date" value={r.productionDate} onChange={(e) => setMaterials((p) => p.map((x) => (x.id === r.id ? { ...x, productionDate: e.target.value } : x)))} className="input-base !py-1 !px-2 text-xs" />
                  </td>
                  <td className="px-1 py-1.5">
                    <input type="text" value={r.consignee} onChange={(e) => setMaterials((p) => p.map((x) => (x.id === r.id ? { ...x, consignee: e.target.value } : x)))} className="input-base !py-1 !px-2 text-xs min-w-[150px]" />
                  </td>
                  <td className="px-1 py-1.5">
                    <input type="text" value={r.quantity} onChange={(e) => setMaterials((p) => p.map((x) => (x.id === r.id ? { ...x, quantity: e.target.value } : x)))} className="input-base !py-1 !px-2 text-xs" />
                  </td>
                  <td className="px-1 py-1.5 text-center">
                    <button onClick={() => setMaterials((p) => (p.length > 1 ? p.filter((x) => x.id !== r.id) : p))} className="inline-flex items-center justify-center w-6 h-6 rounded-md text-ink-400 hover:text-danger-600 hover:bg-danger-50">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Closing summary ── */}
      <section className="surface-card overflow-hidden">
        <header className="px-4 sm:px-5 py-3 border-b border-cream-300 bg-cream-100/60">
          <h2 className="text-sm font-bold text-ink-600">Recall Summary</h2>
        </header>
        <div className="p-4 sm:p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label-base">Product kept for sample — Qty</label>
              <input type="text" value={sampleQty} onChange={(e) => setSampleQty(e.target.value)} className="input-base" />
            </div>
            <div>
              <label className="label-base">Total quantity recall</label>
              <input type="text" value={totalRecallQty} onChange={(e) => setTotalRecallQty(e.target.value)} className="input-base" />
            </div>
            <div>
              <label className="label-base">Balance stock if any — Qty</label>
              <input type="text" value={balanceStock} onChange={(e) => setBalanceStock(e.target.value)} className="input-base" />
            </div>
            <div>
              <label className="label-base">% of recall efficiency</label>
              <input type="number" value={efficiencyPct} onChange={(e) => setEfficiencyPct(e.target.value)} className="input-base" min="0" max="100" step="0.01" />
            </div>
            <div>
              <label className="label-base">Completion time — Total Hours</label>
              <input type="number" value={completionHours} onChange={(e) => setCompletionHours(e.target.value)} className="input-base" min="0" step="0.5" />
            </div>
            <div>
              <label className="label-base">End Time</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="input-base" />
            </div>
          </div>
          <div>
            <label className="label-base">Conclusion</label>
            <textarea value={conclusion} onChange={(e) => setConclusion(e.target.value)} rows={2} className="input-base resize-y" />
          </div>
          <p className="text-[11px] italic text-ink-400">
            Note: All respective evidence is attached. Details of the product kept as samples shall also be indicated.
          </p>
        </div>
      </section>

      {/* ── Personnel ── */}
      <section className="surface-card overflow-hidden">
        <header className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-cream-300 bg-cream-100/60">
          <h2 className="text-sm font-bold text-ink-600">Personnel Involved in the Mock Recall</h2>
          <button
            onClick={() => setMembers((p) => [...p, emptyMember(p.length + 1)])}
            className="btn-primary !py-1.5 !px-3 text-xs"
          >
            + Add Member
          </button>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-cream-100/70 border-b border-cream-300">
              <tr>
                {["Sr. No.", "Name of the Team Members", "Sign", ""].map((h) => (
                  <th key={h} className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {members.map((r, i) => (
                <tr key={r.id} className="hover:bg-cream-100/60">
                  <td className="px-2 py-1.5 text-center text-ink-400 font-medium w-14">{i + 1}</td>
                  <td className="px-1 py-1.5">
                    <input type="text" value={r.name} onChange={(e) => setMembers((p) => p.map((x) => (x.id === r.id ? { ...x, name: e.target.value } : x)))} className="input-base !py-1 !px-2 text-xs" />
                  </td>
                  <td className="px-1 py-1.5">
                    <input type="text" value={r.sign} onChange={(e) => setMembers((p) => p.map((x) => (x.id === r.id ? { ...x, sign: e.target.value } : x)))} className="input-base !py-1 !px-2 text-xs" />
                  </td>
                  <td className="px-1 py-1.5 text-center w-10">
                    <button onClick={() => setMembers((p) => (p.length > 1 ? p.filter((x) => x.id !== r.id) : p))} className="inline-flex items-center justify-center w-6 h-6 rounded-md text-ink-400 hover:text-danger-600 hover:bg-danger-50">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Documents review checklist ── */}
      <DocumentsReviewChecklist value={docChecks} onChange={setDocChecks} batchNumber={batchNumber} />

      {message && (
        <div className={`surface-card p-3 text-sm font-medium ${message.kind === "ok" ? "border-l-4 border-success-500 text-success-800 bg-success-50" : "border-l-4 border-danger-500 text-danger-700 bg-danger-50"}`}>
          {message.text}
        </div>
      )}

      <div className="surface-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-ink-400">
          Prepared by: <span className="font-semibold text-ink-500">FST</span>
          <span className="mx-2 text-cream-300">|</span>
          Approved by: <span className="font-semibold text-ink-500">FSTL</span>
        </p>
        <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
          {submitting ? "Submitting..." : isEdit ? "Update Record" : "Submit Record"}
        </button>
      </div>
    </div>
  );
}
