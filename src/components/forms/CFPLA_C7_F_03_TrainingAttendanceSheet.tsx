"use client";
import { useState } from "react";

const TRAINING_TYPES = ["Induction", "Refresher", "Food Safety", "Job Specific", "Retraining", "GMP", "GHP", "Other"];
const LANGUAGES = ["English", "Hindi", "Marathi"];
const EVAL_METHODS = ["Written", "Oral", "Observation", "Practical"];

interface AttendeeRow {
  id: number;
  name: string;
  designation: string;
  signature: string;
  evaluationMethod: string[];
  evaluationScoring: string;
  evaluationDate: string;
  evaluationResult: "Pass" | "Fail" | "";
  effectivenessMethod: string[];
  effectivenessScoring: string;
  effectivenessDate: string;
  effectivenessResult: "Effective" | "Non-Effective" | "";
  averageScoring: string;
  trainingStatus: "Effective" | "Refresher" | "Retraining" | "";
}

const emptyRow = (id: number): AttendeeRow => ({
  id, name: "", designation: "", signature: "",
  evaluationMethod: [], evaluationScoring: "", evaluationDate: "", evaluationResult: "",
  effectivenessMethod: [], effectivenessScoring: "", effectivenessDate: "", effectivenessResult: "",
  averageScoring: "", trainingStatus: "",
});

interface TrainingAttendanceSheetProps {
  initialData?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => Promise<void>;
  isEdit?: boolean;
}

export default function TrainingAttendanceSheet({ initialData, onSubmit, isEdit }: TrainingAttendanceSheetProps = {}) {
  const [trainingDate, setTrainingDate] = useState(initialData?.training_date || "");
  const [trainingTypes, setTrainingTypes] = useState<string[]>(initialData?.training_types || []);
  const [startTime, setStartTime] = useState(initialData?.start_time || "");
  const [endTime, setEndTime] = useState(initialData?.end_time || "");
  const [conductedBy, setConductedBy] = useState(initialData?.conducted_by || "");
  const [trainerQualification, setTrainerQualification] = useState(initialData?.trainer_qualification || "");
  const [venue, setVenue] = useState(initialData?.venue || "");
  const [keyPoints, setKeyPoints] = useState(initialData?.key_points || "");
  const [department, setDepartment] = useState(initialData?.department || "");
  const [language, setLanguage] = useState<string[]>(initialData?.language || []);
  const [effectivenessDays, setEffectivenessDays] = useState<"15" | "30" | "">(initialData?.effectiveness_days || "");
  const [trainerSign, setTrainerSign] = useState(initialData?.trainer_sign || "");
  const [fstlSign, setFstlSign] = useState(initialData?.fstl_sign || "");
  const [effectivenessEvaluatedBy, setEffectivenessEvaluatedBy] = useState(initialData?.effectiveness_evaluated_by || "");
  const [effectivenessDate, setEffectivenessDate] = useState(initialData?.effectiveness_date || "");
  const [correctiveActions, setCorrectiveActions] = useState<string[]>(initialData?.corrective_actions || []);
  const [rows, setRows] = useState<AttendeeRow[]>(() => {
    if (initialData?.rows && Array.isArray(initialData.rows)) {
      return initialData.rows.map((r: any, i: number) => ({
        id: i + 1,
        name: r.name || "",
        designation: r.designation || "",
        signature: r.signature || "",
        evaluationMethod: r.evaluation_method || [],
        evaluationScoring: r.evaluation_scoring?.toString() || "",
        evaluationDate: r.evaluation_date || "",
        evaluationResult: r.evaluation_result || "",
        effectivenessMethod: r.effectiveness_method || [],
        effectivenessScoring: r.effectiveness_scoring?.toString() || "",
        effectivenessDate: r.effectiveness_date || "",
        effectivenessResult: r.effectiveness_result || "",
        averageScoring: r.average_scoring?.toString() || "",
        trainingStatus: r.training_status || "",
      }));
    }
    return Array.from({ length: 10 }, (_, i) => emptyRow(i + 1));
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const addRow = () => setRows((prev) => [...prev, emptyRow(prev.length + 1)]);
  const removeRow = (id: number) => { if (rows.length > 1) setRows((prev) => prev.filter((r) => r.id !== id)); };

  const updateRow = (id: number, field: keyof AttendeeRow, value: any) => {
    setRows((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      // Auto-calculate average and status
      const evalScore = parseFloat(updated.evaluationScoring) || 0;
      const effScore = parseFloat(updated.effectivenessScoring) || 0;
      if (evalScore > 0 && effScore > 0) {
        const avg = ((evalScore + effScore) / 2);
        updated.averageScoring = avg.toFixed(1);
        updated.trainingStatus = avg >= 80 ? "Effective" : avg >= 60 ? "Refresher" : "Retraining";
      } else if (evalScore > 0) {
        updated.evaluationResult = evalScore >= 60 ? "Pass" : "Fail";
      }
      return updated;
    }));
  };

  const toggleArrayItem = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];

  const handleSubmit = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: typeof window !== "undefined" ? localStorage.getItem("currentWarehouse") || "A185" : "A185",
      training_date: trainingDate,
      training_types: trainingTypes,
      start_time: startTime,
      end_time: endTime,
      conducted_by: conductedBy,
      trainer_qualification: trainerQualification,
      venue,
      key_points: keyPoints,
      department,
      language,
      effectiveness_days: effectivenessDays,
      trainer_sign: trainerSign,
      fstl_sign: fstlSign,
      effectiveness_evaluated_by: effectivenessEvaluatedBy,
      effectiveness_date: effectivenessDate,
      corrective_actions: correctiveActions,
      rows: rows.filter((r) => r.name).map((r) => ({
        name: r.name,
        designation: r.designation,
        signature: r.signature,
        evaluation_method: r.evaluationMethod,
        evaluation_scoring: r.evaluationScoring ? Number(r.evaluationScoring) : null,
        evaluation_date: r.evaluationDate,
        evaluation_result: r.evaluationResult,
        effectiveness_method: r.effectivenessMethod,
        effectiveness_scoring: r.effectivenessScoring ? Number(r.effectivenessScoring) : null,
        effectiveness_date: r.effectivenessDate,
        effectiveness_result: r.effectivenessResult,
        average_scoring: r.averageScoring ? Number(r.averageScoring) : null,
        training_status: r.trainingStatus,
      })),
    };
    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        const { docsApi } = await import("@/lib/api/documentations");
        await docsApi.create("training-attendance", payload);
        setSuccess(true);
      }
    } catch (e: any) {
      alert(e.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 max-w-full mx-auto">
      {/* Header */}
      <div className="border border-gray-300 mb-4 rounded">
        <div className="bg-gray-50 p-3 border-b border-gray-300 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg">CANDOR FOODS PRIVATE LIMITED</h1>
            <p className="text-sm font-semibold">TRAINING ATTENDANCE SHEET & RECORD FOR EVALUATION / EFFECTIVENESS OF TRAINING</p>
          </div>
          <div className="text-xs text-right text-gray-600">
            <p>Document No: CFPLA.C7.F.03</p>
            <p>Issue No: 03 | Rev Date: 27/09/2025 | Rev No: 02</p>
          </div>
        </div>
      </div>

      {/* Training Meta Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Training Date</label>
          <input type="date" value={trainingDate} onChange={(e) => setTrainingDate(e.target.value)} className="border border-gray-300 rounded px-3 py-2 w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Time: Start</label>
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="border border-gray-300 rounded px-3 py-2 w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Time: End</label>
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="border border-gray-300 rounded px-3 py-2 w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Training Conducted by</label>
          <input type="text" value={conductedBy} onChange={(e) => setConductedBy(e.target.value)} className="border border-gray-300 rounded px-3 py-2 w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Trainer Qualification/Competencies</label>
          <input type="text" value={trainerQualification} onChange={(e) => setTrainerQualification(e.target.value)} className="border border-gray-300 rounded px-3 py-2 w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Venue</label>
          <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)} className="border border-gray-300 rounded px-3 py-2 w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Department</label>
          <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} className="border border-gray-300 rounded px-3 py-2 w-full" />
        </div>
      </div>

      {/* Training Type Checkboxes */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Training Type</label>
        <div className="flex flex-wrap gap-3">
          {TRAINING_TYPES.map((type) => (
            <label key={type} className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-sm cursor-pointer transition-colors ${trainingTypes.includes(type) ? "bg-blue-100 border-blue-400 text-blue-800" : "border-gray-300 hover:bg-gray-50"}`}>
              <input type="checkbox" checked={trainingTypes.includes(type)} onChange={() => setTrainingTypes((prev) => toggleArrayItem(prev, type))} className="sr-only" />
              <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${trainingTypes.includes(type) ? "bg-blue-500 border-blue-500 text-white" : "border-gray-400"}`}>{trainingTypes.includes(type) ? "✓" : ""}</span>
              {type}
            </label>
          ))}
        </div>
      </div>

      {/* Language & Effectiveness */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-2">Training Language</label>
          <div className="flex gap-3">
            {LANGUAGES.map((lang) => (
              <label key={lang} className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-sm cursor-pointer ${language.includes(lang) ? "bg-blue-100 border-blue-400" : "border-gray-300"}`}>
                <input type="checkbox" checked={language.includes(lang)} onChange={() => setLanguage((prev) => toggleArrayItem(prev, lang))} className="sr-only" />
                <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${language.includes(lang) ? "bg-blue-500 border-blue-500 text-white" : "border-gray-400"}`}>{language.includes(lang) ? "✓" : ""}</span>
                {lang}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Effectiveness will be conducted after</label>
          <div className="flex gap-3">
            {["15", "30"].map((d) => (
              <label key={d} className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-sm cursor-pointer ${effectivenessDays === d ? "bg-blue-100 border-blue-400" : "border-gray-300"}`}>
                <input type="radio" name="effDays" checked={effectivenessDays === d} onChange={() => setEffectivenessDays(d as "15" | "30")} className="sr-only" />
                <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${effectivenessDays === d ? "bg-blue-500 border-blue-500" : "border-gray-400"}`}>{effectivenessDays === d ? <span className="w-2 h-2 bg-white rounded-full"></span> : ""}</span>
                {d} days
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Key Points */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Key Points/Topic Covered</label>
        <textarea value={keyPoints} onChange={(e) => setKeyPoints(e.target.value)} rows={3} className="border border-gray-300 rounded px-3 py-2 w-full" placeholder="Enter key training topics covered..." />
      </div>

      {/* Attendee Table */}
      <div className="overflow-x-auto border border-gray-300 rounded mb-4">
        <table className="w-full text-xs">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 px-1 py-2 w-10" rowSpan={2}>Sr.</th>
              <th className="border border-gray-300 px-1 py-2 min-w-[130px]" rowSpan={2}>Name</th>
              <th className="border border-gray-300 px-1 py-2 min-w-[100px]" rowSpan={2}>Designation</th>
              <th className="border border-gray-300 px-1 py-2" rowSpan={2}>Signature</th>
              <th className="border border-gray-300 px-1 py-1 text-center" colSpan={3}>Evaluation</th>
              <th className="border border-gray-300 px-1 py-1 text-center" colSpan={3}>Effectiveness</th>
              <th className="border border-gray-300 px-1 py-2 min-w-[70px]" rowSpan={2}>Avg Score (%)</th>
              <th className="border border-gray-300 px-1 py-2 min-w-[90px]" rowSpan={2}>Training Status</th>
              <th className="border border-gray-300 px-1 py-2 w-8" rowSpan={2}></th>
            </tr>
            <tr>
              <th className="border border-gray-300 px-1 py-1 text-[10px]">Method</th>
              <th className="border border-gray-300 px-1 py-1 text-[10px]">Score (Dated)</th>
              <th className="border border-gray-300 px-1 py-1 text-[10px]">Result</th>
              <th className="border border-gray-300 px-1 py-1 text-[10px]">Method</th>
              <th className="border border-gray-300 px-1 py-1 text-[10px]">Score (Dated)</th>
              <th className="border border-gray-300 px-1 py-1 text-[10px]">Result</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.id} className="hover:bg-blue-50">
                <td className="border border-gray-300 px-1 py-1 text-center">{idx + 1}</td>
                <td className="border border-gray-300 px-1 py-1">
                  <input type="text" value={row.name} onChange={(e) => updateRow(row.id, "name", e.target.value)} className="w-full border rounded px-1 py-0.5" placeholder="Name" />
                </td>
                <td className="border border-gray-300 px-1 py-1">
                  <input type="text" value={row.designation} onChange={(e) => updateRow(row.id, "designation", e.target.value)} className="w-full border rounded px-1 py-0.5" placeholder="Designation" />
                </td>
                <td className="border border-gray-300 px-1 py-1">
                  <input type="text" value={row.signature} onChange={(e) => updateRow(row.id, "signature", e.target.value)} className="w-full border rounded px-1 py-0.5" />
                </td>
                {/* Evaluation Method */}
                <td className="border border-gray-300 px-1 py-1">
                  <select value={row.evaluationMethod[0] || ""} onChange={(e) => updateRow(row.id, "evaluationMethod", e.target.value ? [e.target.value] : [])} className="w-full border rounded px-0.5 py-0.5 text-[10px]">
                    <option value="">Select</option>
                    {EVAL_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </td>
                {/* Evaluation Score */}
                <td className="border border-gray-300 px-1 py-1">
                  <input type="number" value={row.evaluationScoring} onChange={(e) => updateRow(row.id, "evaluationScoring", e.target.value)} className="w-full border rounded px-0.5 py-0.5" placeholder="%" min="0" max="100" />
                </td>
                {/* Evaluation Result */}
                <td className="border border-gray-300 px-1 py-1">
                  <select value={row.evaluationResult} onChange={(e) => updateRow(row.id, "evaluationResult", e.target.value)} className={`w-full border rounded px-0.5 py-0.5 text-[10px] ${row.evaluationResult === "Pass" ? "bg-green-100" : row.evaluationResult === "Fail" ? "bg-red-100" : ""}`}>
                    <option value="">-</option>
                    <option value="Pass">Pass</option>
                    <option value="Fail">Fail</option>
                  </select>
                </td>
                {/* Effectiveness Method */}
                <td className="border border-gray-300 px-1 py-1">
                  <select value={row.effectivenessMethod[0] || ""} onChange={(e) => updateRow(row.id, "effectivenessMethod", e.target.value ? [e.target.value] : [])} className="w-full border rounded px-0.5 py-0.5 text-[10px]">
                    <option value="">Select</option>
                    {EVAL_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </td>
                {/* Effectiveness Score */}
                <td className="border border-gray-300 px-1 py-1">
                  <input type="number" value={row.effectivenessScoring} onChange={(e) => updateRow(row.id, "effectivenessScoring", e.target.value)} className="w-full border rounded px-0.5 py-0.5" placeholder="%" min="0" max="100" />
                </td>
                {/* Effectiveness Result */}
                <td className="border border-gray-300 px-1 py-1">
                  <select value={row.effectivenessResult} onChange={(e) => updateRow(row.id, "effectivenessResult", e.target.value)} className={`w-full border rounded px-0.5 py-0.5 text-[10px] ${row.effectivenessResult === "Effective" ? "bg-green-100" : row.effectivenessResult === "Non-Effective" ? "bg-red-100" : ""}`}>
                    <option value="">-</option>
                    <option value="Effective">Effective</option>
                    <option value="Non-Effective">Non-Effective</option>
                  </select>
                </td>
                {/* Average */}
                <td className={`border border-gray-300 px-1 py-1 text-center font-bold ${parseFloat(row.averageScoring) >= 80 ? "bg-green-100 text-green-800" : parseFloat(row.averageScoring) >= 60 ? "bg-yellow-100 text-yellow-800" : row.averageScoring ? "bg-red-100 text-red-800" : ""}`}>
                  {row.averageScoring ? `${row.averageScoring}%` : ""}
                </td>
                {/* Training Status */}
                <td className={`border border-gray-300 px-1 py-1 text-center text-[10px] font-semibold ${row.trainingStatus === "Effective" ? "bg-green-100 text-green-800" : row.trainingStatus === "Refresher" ? "bg-yellow-100 text-yellow-800" : row.trainingStatus === "Retraining" ? "bg-red-100 text-red-800" : ""}`}>
                  {row.trainingStatus}
                </td>
                <td className="border border-gray-300 px-1 py-1 text-center">
                  <button onClick={() => removeRow(row.id)} className="text-red-500 hover:text-red-700">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button onClick={addRow} className="bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700">+ Add Attendee</button>

      {/* Criteria Note */}
      <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200 text-xs">
        <p className="font-semibold mb-1">Evaluation & Effectiveness Criteria:</p>
        <div className="flex gap-4">
          <span className="text-green-700">≥80% : Effective</span>
          <span className="text-yellow-700">60–79% : Partially Effective (Refresher required)</span>
          <span className="text-red-700">&lt;60% : Not Effective (Retraining mandatory)</span>
        </div>
      </div>

      {/* Corrective Actions */}
      <div className="mt-4">
        <label className="block text-sm font-medium mb-2">Corrective Actions Taken</label>
        <div className="flex gap-3">
          {["Refresher", "Re-training", "Closer Supervision"].map((action) => (
            <label key={action} className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-sm cursor-pointer ${correctiveActions.includes(action) ? "bg-orange-100 border-orange-400" : "border-gray-300"}`}>
              <input type="checkbox" checked={correctiveActions.includes(action)} onChange={() => setCorrectiveActions((prev) => toggleArrayItem(prev, action))} className="sr-only" />
              <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${correctiveActions.includes(action) ? "bg-orange-500 border-orange-500 text-white" : "border-gray-400"}`}>{correctiveActions.includes(action) ? "✓" : ""}</span>
              {action}
            </label>
          ))}
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <div><label className="text-sm font-medium">Trainer</label><input type="text" value={trainerSign} onChange={(e) => setTrainerSign(e.target.value)} className="border rounded px-3 py-2 w-full" /></div>
        <div><label className="text-sm font-medium">FSTL</label><input type="text" value={fstlSign} onChange={(e) => setFstlSign(e.target.value)} className="border rounded px-3 py-2 w-full" /></div>
        <div><label className="text-sm font-medium">Effectiveness Evaluated by</label><input type="text" value={effectivenessEvaluatedBy} onChange={(e) => setEffectivenessEvaluatedBy(e.target.value)} className="border rounded px-3 py-2 w-full" /></div>
        <div><label className="text-sm font-medium">Dated</label><input type="date" value={effectivenessDate} onChange={(e) => setEffectivenessDate(e.target.value)} className="border rounded px-3 py-2 w-full" /></div>
      </div>

      <p className="mt-3 text-xs text-gray-500 italic">Acknowledgement by TRAINEE that he/she has received, understood, and will comply with the instructions given in training.</p>
      <div className="mt-2 text-xs text-gray-500">Prepared by: HR | Approved by: FSTL</div>
      <button onClick={handleSubmit} disabled={submitting} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
        {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
      </button>
      {success && <p className="text-green-600 text-sm mt-2">Record saved successfully!</p>}
    </div>
  );
}
