"use client";
import { useState } from "react";

interface RoastingEntry {
  id: number;
  srNo: string;
  date: string;
  productName: string;
  customer: string;
  setTemperature: string;
  quantity: string;
  roastingStage: string;
  duration: string;
  inTime: string;
  outTime: string;
  operatorSign: string;
  correctiveAction: string;
  qcVerification: string;
  monitoringPoints: {
    startObsTime: string;
    startObsTemp: string;
    middleObsTime: string;
    middleObsTemp: string;
    endObsTime: string;
    endObsTemp: string;
  };
}

const emptyEntry = (): RoastingEntry => ({
  id: Date.now() + Math.random(),
  srNo: "",
  date: "",
  productName: "",
  customer: "",
  setTemperature: "",
  quantity: "",
  roastingStage: "",
  duration: "",
  inTime: "",
  outTime: "",
  operatorSign: "",
  correctiveAction: "",
  qcVerification: "",
  monitoringPoints: {
    startObsTime: "",
    startObsTemp: "",
    middleObsTime: "",
    middleObsTemp: "",
    endObsTime: "",
    endObsTemp: "",
  },
});

export default function CCPRoastingMonitoring() {
  const [entries, setEntries] = useState<RoastingEntry[]>([emptyEntry(), emptyEntry(), emptyEntry()]);

  const addRow = () => setEntries((e) => [...e, emptyEntry()]);
  const removeRow = (id: number) => setEntries((e) => e.filter((r) => r.id !== id));

  const updateEntry = (id: number, field: keyof RoastingEntry, value: string) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

  const updateMonitoring = (id: number, field: keyof RoastingEntry["monitoringPoints"], value: string) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, monitoringPoints: { ...e.monitoringPoints, [field]: value } } : e
      )
    );
  };

  const inp = (className = "") =>
    `w-full px-1 py-0.5 border-0 border-b border-gray-200 focus:border-red-400 outline-none text-xs bg-transparent ${className}`;

  return (
    <div className="min-h-screen bg-gray-50 font-mono p-4">
      <div className="max-w-[1600px] mx-auto bg-white shadow-lg rounded-sm border border-gray-200">
        {/* Header */}
        <div className="border-b border-gray-300">
          <div className="flex flex-col sm:grid sm:grid-cols-3 sm:divide-x divide-gray-300">
            <div className="flex items-center gap-3 p-3">
              <div className="w-9 h-9 bg-red-700 rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold">CF</span>
              </div>
              <div>
                <div className="font-bold text-gray-800 text-xs">Candor Foods</div>
                <div className="text-xs text-gray-500">Private Limited</div>
              </div>
            </div>
            <div className="p-3 text-center">
              <div className="font-bold text-gray-800 text-xs">CANDOR FOODS PRIVATE LIMITED</div>
              <div className="text-xs text-gray-600 mt-0.5">FORMAT: Monitoring and Verification of CCP</div>
              <div className="text-xs text-gray-600">Roasting Temperature &amp; Time</div>
              <div className="text-xs text-gray-500 mt-0.5">Document No.: CFPLA.C2.F.42</div>
            </div>
            <div className="p-3 text-xs text-gray-600 space-y-0.5">
              <div className="flex justify-between"><span>Issue Date:</span><span className="font-medium">01/11/2017</span></div>
              <div className="flex justify-between"><span>Issue No:</span><span className="font-medium">04</span></div>
              <div className="flex justify-between"><span>Revision Date:</span><span className="font-medium">01/10/2025</span></div>
              <div className="flex justify-between"><span>Revision No.:</span><span className="font-medium">03</span></div>
            </div>
          </div>
        </div>

        <div className="p-3">
          {/* Info Banner */}
          <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
            <strong>CCP Monitoring:</strong> Temperature &amp; time must be recorded at Start, Middle, and End of each roasting stage. Flag any deviation immediately.
          </div>

          <p className="text-xs text-gray-400 mb-1 italic sm:hidden">← Swipe to view all columns</p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs border border-gray-400">
              <thead>
                <tr className="bg-gray-100">
                  <th rowSpan={2} className="border border-gray-400 p-1.5 text-center w-8">Sr.</th>
                  <th rowSpan={2} className="border border-gray-400 p-1.5 text-center w-20">Date</th>
                  <th colSpan={4} className="border border-gray-400 p-1.5 text-center bg-blue-50">Product Info</th>
                  <th colSpan={2} className="border border-gray-400 p-1.5 text-center bg-purple-50">Roasting</th>
                  <th rowSpan={2} className="border border-gray-400 p-1.5 text-center w-16">In Time</th>
                  <th colSpan={6} className="border border-gray-400 p-1.5 text-center bg-orange-50">Monitoring (Obs. Time / Obs. Temp)</th>
                  <th rowSpan={2} className="border border-gray-400 p-1.5 text-center w-16">Out Time</th>
                  <th rowSpan={2} className="border border-gray-400 p-1.5 text-center w-20">Operator Sign</th>
                  <th rowSpan={2} className="border border-gray-400 p-1.5 text-center w-28">Corrective Action</th>
                  <th rowSpan={2} className="border border-gray-400 p-1.5 text-center w-20">QC Verification</th>
                  <th rowSpan={2} className="border border-gray-400 p-1.5 text-center w-6 text-red-400">✕</th>
                </tr>
                <tr className="bg-gray-100 text-xs">
                  {["Product Name", "Customer", "Set Temp (°C)", "Qty"].map((h) => (
                    <th key={h} className="border border-gray-400 p-1.5 text-center bg-blue-50 w-24">{h}</th>
                  ))}
                  {["Stage", "Duration"].map((h) => (
                    <th key={h} className="border border-gray-400 p-1.5 text-center bg-purple-50 w-20">{h}</th>
                  ))}
                  {["Start Time", "Start °C", "Mid Time", "Mid °C", "End Time", "End °C"].map((h) => (
                    <th key={h} className="border border-gray-400 p-1.5 text-center bg-orange-50 w-16">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, idx) => (
                  <tr key={entry.id} className="hover:bg-gray-50 align-middle">
                    <td className="border border-gray-300 p-1 text-center text-gray-400">{idx + 1}</td>
                    <td className="border border-gray-300 p-1">
                      <input type="date" value={entry.date} onChange={(e) => updateEntry(entry.id, "date", e.target.value)} className={inp()} />
                    </td>
                    <td className="border border-gray-300 p-1 bg-blue-50/20">
                      <input type="text" value={entry.productName} onChange={(e) => updateEntry(entry.id, "productName", e.target.value)} placeholder="Product" className={inp()} />
                    </td>
                    <td className="border border-gray-300 p-1 bg-blue-50/20">
                      <input type="text" value={entry.customer} onChange={(e) => updateEntry(entry.id, "customer", e.target.value)} placeholder="Customer" className={inp()} />
                    </td>
                    <td className="border border-gray-300 p-1 bg-blue-50/20">
                      <input type="text" value={entry.setTemperature} onChange={(e) => updateEntry(entry.id, "setTemperature", e.target.value)} placeholder="°C" className={inp("text-center")} />
                    </td>
                    <td className="border border-gray-300 p-1 bg-blue-50/20">
                      <input type="text" value={entry.quantity} onChange={(e) => updateEntry(entry.id, "quantity", e.target.value)} placeholder="Qty" className={inp("text-center")} />
                    </td>
                    <td className="border border-gray-300 p-1 bg-purple-50/20">
                      <input type="text" value={entry.roastingStage} onChange={(e) => updateEntry(entry.id, "roastingStage", e.target.value)} placeholder="Stage" className={inp()} />
                    </td>
                    <td className="border border-gray-300 p-1 bg-purple-50/20">
                      <input type="text" value={entry.duration} onChange={(e) => updateEntry(entry.id, "duration", e.target.value)} placeholder="min" className={inp("text-center")} />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input type="time" value={entry.inTime} onChange={(e) => updateEntry(entry.id, "inTime", e.target.value)} className={inp()} />
                    </td>
                    <td className="border border-gray-300 p-1 bg-orange-50/30">
                      <input type="time" value={entry.monitoringPoints.startObsTime} onChange={(e) => updateMonitoring(entry.id, "startObsTime", e.target.value)} className={inp()} />
                    </td>
                    <td className="border border-gray-300 p-1 bg-orange-50/30">
                      <input type="text" value={entry.monitoringPoints.startObsTemp} onChange={(e) => updateMonitoring(entry.id, "startObsTemp", e.target.value)} placeholder="°C" className={inp("text-center")} />
                    </td>
                    <td className="border border-gray-300 p-1 bg-orange-50/30">
                      <input type="time" value={entry.monitoringPoints.middleObsTime} onChange={(e) => updateMonitoring(entry.id, "middleObsTime", e.target.value)} className={inp()} />
                    </td>
                    <td className="border border-gray-300 p-1 bg-orange-50/30">
                      <input type="text" value={entry.monitoringPoints.middleObsTemp} onChange={(e) => updateMonitoring(entry.id, "middleObsTemp", e.target.value)} placeholder="°C" className={inp("text-center")} />
                    </td>
                    <td className="border border-gray-300 p-1 bg-orange-50/30">
                      <input type="time" value={entry.monitoringPoints.endObsTime} onChange={(e) => updateMonitoring(entry.id, "endObsTime", e.target.value)} className={inp()} />
                    </td>
                    <td className="border border-gray-300 p-1 bg-orange-50/30">
                      <input type="text" value={entry.monitoringPoints.endObsTemp} onChange={(e) => updateMonitoring(entry.id, "endObsTemp", e.target.value)} placeholder="°C" className={inp("text-center")} />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input type="time" value={entry.outTime} onChange={(e) => updateEntry(entry.id, "outTime", e.target.value)} className={inp()} />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input type="text" value={entry.operatorSign} onChange={(e) => updateEntry(entry.id, "operatorSign", e.target.value)} className={inp()} />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input type="text" value={entry.correctiveAction} onChange={(e) => updateEntry(entry.id, "correctiveAction", e.target.value)} placeholder="If deviation…" className={inp()} />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input type="text" value={entry.qcVerification} onChange={(e) => updateEntry(entry.id, "qcVerification", e.target.value)} className={inp()} />
                    </td>
                    <td className="border border-gray-300 p-1 text-center">
                      <button onClick={() => removeRow(entry.id)} className="text-red-400 hover:text-red-600 font-bold">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button onClick={addRow}
            className="mt-3 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-700 text-white text-sm rounded hover:bg-red-800 transition-colors w-full sm:w-auto">
            <span className="text-base leading-none">+</span> Add Row
          </button>

          <div className="flex justify-between mt-6 pt-4 border-t border-gray-200 text-xs text-gray-600">
            <span>Prepared By: <strong>FST</strong></span>
            <span>Approved By: <strong>FSTL</strong></span>
          </div>

          <button className="mt-4 bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 w-full sm:w-auto text-base">Submit</button>
        </div>
      </div>
    </div>
  );
}
