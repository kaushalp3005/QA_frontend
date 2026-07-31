"use client";

// CFPLB.C2.F.62 — Monitoring and verification of CCP - Puffer (A185 only).
// One record per batch. Picking the product fills the controlled set-points from
// PUFFER_PRODUCTS; the readings grid then holds one column per hourly check.

import { useState } from "react";
import { Plus, X, Info } from "lucide-react";
import Time12Picker from "@/components/Time12Picker";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";
import {
  PUFFER_PRODUCTS,
  findPufferProduct,
  FREQUENCY_NOTE,
  FREQUENCY_FOOTNOTE,
} from "@/lib/pufferProducts";
import {
  CHECKED_BY_OPTIONS,
  QC_VERIFIED_BY_OPTIONS,
  PRODUCTION_INCHARGE_OPTIONS,
  filterSignaturesByWarehouse,
  type SignatureOption,
} from "@/lib/signatures";

interface Reading {
  id: number;
  monitoringTime: string;
  temperature: string;
  productContactTime: string;
  drumSpeed: string;
  operatorSign: string;
  checkedBy: string;
  verifiedBy: string;
}

const emptyReading = (id: number): Reading => ({
  id,
  monitoringTime: "",
  temperature: "",
  productContactTime: "",
  drumSpeed: "",
  operatorSign: "",
  checkedBy: "",
  verifiedBy: "",
});

/** Compact signatory dropdown for a grid cell, filtered to the active plant. */
function CellSignSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SignatureOption[];
}) {
  const visible = filterSignaturesByWarehouse(options, getStoredWarehouse()).filter(
    (o) => o.name !== "Other",
  );
  return (
    <select
      value={visible.some((o) => o.name === value) || value === "" ? value : "__other"}
      onChange={(e) => onChange(e.target.value === "__other" ? value : e.target.value)}
      className="w-full text-[11px] px-1 py-1 border border-cream-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
      title={value || "Select"}
    >
      <option value="">—</option>
      {visible.map((o) => (
        <option key={o.name} value={o.name}>
          {o.name}
        </option>
      ))}
      {value && !visible.some((o) => o.name === value) && (
        <option value="__other">{value}</option>
      )}
    </select>
  );
}

interface Props {
  initialData?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => Promise<void>;
  isEdit?: boolean;
}

export default function CCPPufferForm({ initialData, onSubmit, isEdit }: Props = {}) {
  const [date, setDate] = useState(initialData?.check_date || "");
  const [shift, setShift] = useState(initialData?.shift || "");
  const [productName, setProductName] = useState(initialData?.product_name || "");
  const [customerName, setCustomerName] = useState(initialData?.customer_name || "");
  const [wipLotNo, setWipLotNo] = useState(initialData?.wip_lot_no || "");
  const [batchNo, setBatchNo] = useState(initialData?.batch_no || "");
  const [productionQuantity, setProductionQuantity] = useState(initialData?.production_quantity || "");
  const [startTime, setStartTime] = useState(initialData?.start_time_of_batch || "");
  const [endTime, setEndTime] = useState(initialData?.end_time_of_batch || "");
  const [setTemperature, setSetTemperature] = useState(initialData?.set_temperature || "");
  const [setContactTime, setSetContactTime] = useState(initialData?.set_product_contact_time || "");
  const [setDrumSpeed, setSetDrumSpeed] = useState(initialData?.set_drum_speed || "");
  const [observation, setObservation] = useState(initialData?.observation || "");
  const [correctiveAction, setCorrectiveAction] = useState(initialData?.corrective_action || "");
  const [readings, setReadings] = useState<Reading[]>(() => {
    if (Array.isArray(initialData?.readings) && initialData.readings.length) {
      return initialData.readings.map((r: any, i: number) => ({
        id: i + 1,
        monitoringTime: r.monitoring_time || "",
        temperature: r.temperature ?? "",
        productContactTime: r.product_contact_time || "",
        drumSpeed: r.drum_speed || "",
        operatorSign: r.operator_sign || "",
        checkedBy: r.checked_by || "",
        verifiedBy: r.verified_by || "",
      }));
    }
    return [emptyReading(1)];
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  /**
   * Product drives the CCP set-points, so picking one fills all three. They stay
   * editable — an operator can correct a set-point the master hasn't caught up
   * with — but nobody has to retype the controlled value.
   */
  const handleProductChange = (name: string) => {
    setProductName(name);
    const preset = findPufferProduct(name);
    if (!preset) return;
    setSetTemperature(preset.temperature);
    setSetContactTime(preset.contactTime);
    setSetDrumSpeed(preset.drumSpeed);
    // The first column's set values follow too — the grid records what was run
    // against those set-points, and column 1 is where a batch starts.
    setReadings((prev) =>
      prev.map((r, i) =>
        i === 0
          ? {
              ...r,
              productContactTime: r.productContactTime || preset.contactTime,
              drumSpeed: r.drumSpeed || preset.drumSpeed,
            }
          : r,
      ),
    );
  };

  /**
   * A new column starts as a copy of column 1 — the temperature, contact time,
   * drum speed and signatories rarely change between hourly checks. Monitoring
   * Time is deliberately left blank: it is the one value that must differ, and
   * copying it would print the same time twice.
   */
  const addColumn = () =>
    setReadings((prev) => {
      const first = prev[0];
      const nextId = Math.max(0, ...prev.map((r) => r.id)) + 1;
      if (!first) return [emptyReading(nextId)];
      return [...prev, { ...first, id: nextId, monitoringTime: "" }];
    });

  const removeColumn = (id: number) =>
    setReadings((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));

  const upd = (id: number, f: keyof Reading, v: string) =>
    setReadings((prev) => prev.map((r) => (r.id === id ? { ...r, [f]: v } : r)));

  const handleSubmit = async () => {
    if (!date) {
      alert("Please enter the date.");
      return;
    }
    if (!productName) {
      alert("Please select the product.");
      return;
    }
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: getStoredWarehouse(),
      check_date: date,
      shift,
      product_name: productName,
      customer_name: customerName,
      wip_lot_no: wipLotNo,
      batch_no: batchNo,
      production_quantity: productionQuantity,
      start_time_of_batch: startTime,
      end_time_of_batch: endTime,
      set_temperature: setTemperature,
      set_product_contact_time: setContactTime,
      set_drum_speed: setDrumSpeed,
      observation,
      corrective_action: correctiveAction,
      readings: readings
        .filter((r) => r.monitoringTime || r.temperature || r.productContactTime || r.drumSpeed)
        .map((r) => ({
          monitoring_time: r.monitoringTime,
          temperature: r.temperature,
          product_contact_time: r.productContactTime,
          drum_speed: r.drumSpeed,
          operator_sign: r.operatorSign,
          checked_by: r.checkedBy,
          verified_by: r.verifiedBy,
        })),
    };
    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        const { docsApi } = await import("@/lib/api/documentations");
        await docsApi.create("ccp-puffer", payload);
        setSuccess(true);
      }
    } catch (e: any) {
      alert(e.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  const presetApplied = !!findPufferProduct(productName);

  return (
    <div className="space-y-5">
      {/* Shift + frequency boilerplate, as printed at the top of the format */}
      <section className="surface-card p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="sm:max-w-xs w-full">
            <label className="block text-xs font-semibold text-ink-500 mb-1.5">Shift</label>
            <input
              type="text"
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              placeholder="e.g. A"
              className="input-base"
            />
          </div>
          <div className="flex-1 rounded-lg border border-cream-300 bg-cream-100/60 px-3 py-2">
            <p className="text-xs font-semibold text-ink-500">Frequency: {FREQUENCY_NOTE}</p>
            <p className="text-[11px] text-ink-400 mt-0.5">{FREQUENCY_FOOTNOTE}</p>
          </div>
        </div>
      </section>

      {/* Batch details */}
      <section className="surface-card p-4 sm:p-5">
        <h2 className="text-sm font-bold text-ink-600 mb-4">Batch Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-500 mb-1.5">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-500 mb-1.5">Start Time of Batch</label>
            <Time12Picker value={startTime} onChange={setStartTime} className="input-base" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-500 mb-1.5">
              Product Name <span className="text-danger-600">*</span>
            </label>
            <select
              value={productName}
              onChange={(e) => handleProductChange(e.target.value)}
              className="input-base"
            >
              <option value="">Select product…</option>
              {PUFFER_PRODUCTS.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-500 mb-1.5">Set Temperature for Product</label>
            <input
              type="text"
              value={setTemperature}
              onChange={(e) => setSetTemperature(e.target.value)}
              placeholder="e.g. 150°C ± 2"
              className="input-base"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-500 mb-1.5">Customer Name</label>
            <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-500 mb-1.5">Set Product Contact Time</label>
            <input
              type="text"
              value={setContactTime}
              onChange={(e) => setSetContactTime(e.target.value)}
              placeholder="e.g. 7 Min"
              className="input-base"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-500 mb-1.5">WIP lot No.</label>
            <input type="text" value={wipLotNo} onChange={(e) => setWipLotNo(e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-500 mb-1.5">Set Drum Speed</label>
            <input
              type="text"
              value={setDrumSpeed}
              onChange={(e) => setSetDrumSpeed(e.target.value)}
              placeholder="e.g. 2.8 Hz"
              className="input-base"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-500 mb-1.5">Batch No.</label>
            <input type="text" value={batchNo} onChange={(e) => setBatchNo(e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-500 mb-1.5">End Time of Batch</label>
            <Time12Picker value={endTime} onChange={setEndTime} className="input-base" />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-ink-500 mb-1.5">Production Quantity</label>
            <input
              type="text"
              value={productionQuantity}
              onChange={(e) => setProductionQuantity(e.target.value)}
              className="input-base md:max-w-sm"
            />
          </div>
        </div>

        {presetApplied && (
          <p className="flex items-start gap-1.5 text-[11px] text-ink-400 mt-4 pt-3 border-t border-cream-300">
            <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
            Set-points filled from the controlled parameters for{" "}
            <span className="font-semibold text-ink-500">{productName}</span>. Edit them if the
            process document has changed.
          </p>
        )}
      </section>

      {/* Readings grid — one column per hourly check */}
      <section className="surface-card overflow-hidden">
        <header className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-cream-300 bg-cream-100/60">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-ink-600">Monitoring Parameters</h2>
            <p className="text-[11px] text-ink-400 mt-0.5">
              {readings.length} check{readings.length !== 1 ? "s" : ""} · a new column copies
              column 1, leaving its Monitoring Time blank
            </p>
          </div>
          <button onClick={addColumn} className="btn-primary !py-1.5 !px-3 text-xs shrink-0">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Column
          </button>
        </header>
        <p className="text-[11px] text-ink-400 italic px-4 pt-3 sm:hidden">
          ← Swipe to view all columns
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-cream-100/70 border-b border-cream-300">
              <tr>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400 sticky left-0 bg-cream-100 z-10 min-w-[190px]">
                  Parameter
                </th>
                {readings.map((r, i) => (
                  <th key={r.id} className="px-1 py-2 text-center text-[11px] font-semibold text-ink-400 min-w-[110px]">
                    <div className="flex items-center justify-center gap-1">
                      <span>{i + 1}</span>
                      {readings.length > 1 && (
                        <button
                          onClick={() => removeColumn(r.id)}
                          className="inline-flex items-center justify-center w-5 h-5 rounded text-ink-400 hover:text-danger-600 hover:bg-danger-50"
                          title={`Remove column ${i + 1}`}
                          aria-label={`Remove column ${i + 1}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {(
                [
                  { label: "Monitoring Time (In min)", field: "monitoringTime" },
                  { label: "Temperature in Puffer (In °C)", field: "temperature" },
                  { label: "Product Contact time", field: "productContactTime" },
                  { label: "Drum Speed", field: "drumSpeed" },
                ] as { label: string; field: keyof Reading }[]
              ).map((row) => (
                <tr key={row.field} className="hover:bg-cream-100/60">
                  <td className="px-3 py-1.5 font-semibold text-ink-500 sticky left-0 bg-cream-50 z-10">
                    {row.label}
                  </td>
                  {readings.map((r) => (
                    <td key={r.id} className="px-1 py-1">
                      <input
                        type="text"
                        value={r[row.field] as string}
                        onChange={(e) => upd(r.id, row.field, e.target.value)}
                        className="input-base !py-1 !px-2 text-xs text-center"
                      />
                    </td>
                  ))}
                </tr>
              ))}
              {(
                [
                  { label: "Operator sign", field: "operatorSign", options: PRODUCTION_INCHARGE_OPTIONS },
                  { label: "Checked By (QC Executive)", field: "checkedBy", options: CHECKED_BY_OPTIONS },
                  { label: "Verified By", field: "verifiedBy", options: QC_VERIFIED_BY_OPTIONS },
                ] as { label: string; field: keyof Reading; options: SignatureOption[] }[]
              ).map((row) => (
                <tr key={row.field} className="hover:bg-cream-100/60">
                  <td className="px-3 py-1.5 font-semibold text-ink-500 sticky left-0 bg-cream-50 z-10">
                    {row.label}
                  </td>
                  {readings.map((r) => (
                    <td key={r.id} className="px-1 py-1">
                      <CellSignSelect
                        value={r[row.field] as string}
                        onChange={(v) => upd(r.id, row.field, v)}
                        options={row.options}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Observation / Corrective Action */}
      <section className="surface-card p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-ink-500 mb-1.5">Observation</label>
          <textarea
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            rows={3}
            className="input-base resize-y"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink-500 mb-1.5">Corrective Action</label>
          <textarea
            value={correctiveAction}
            onChange={(e) => setCorrectiveAction(e.target.value)}
            rows={3}
            className="input-base resize-y"
          />
        </div>
      </section>

      <div className="surface-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-ink-400">
          Prepared By: FST · Approved By: FSTL — printed on the record.
        </p>
        <div className="flex items-center gap-3">
          {success && <span className="text-xs font-semibold text-success-600">Saved successfully</span>}
          <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
            {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
