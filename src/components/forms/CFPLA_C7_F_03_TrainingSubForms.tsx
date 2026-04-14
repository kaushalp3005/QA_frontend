"use client";
import { useState } from "react";

const EVAL_METHODS = ["Written", "Oral", "Observation", "Practical"];

// ===================== F.03 WORKERS VERSION =====================
interface WorkerRow {
  id: number; name: string;
  evaluationMethod: string; evaluationScoring: string; evaluationResult: "Pass" | "Fail" | "";
  effectivenessMethod: string; effectivenessScoring: string; effectivenessResult: "Effective" | "Non-Effective" | "";
  averageScoring: string; trainingStatus: "Effective" | "Refresher" | "Retraining" | "";
}

const emptyWorkerRow = (id: number): WorkerRow => ({
  id, name: "", evaluationMethod: "", evaluationScoring: "", evaluationResult: "",
  effectivenessMethod: "", effectivenessScoring: "", effectivenessResult: "", averageScoring: "", trainingStatus: "",
});

interface TrainingFormProps {
  initialData?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => Promise<void>;
  isEdit?: boolean;
}

export function TrainingAttendanceWorkers({ initialData, onSubmit, isEdit }: TrainingFormProps = {}) {
  const [rows, setRows] = useState<WorkerRow[]>(() => {
    if (initialData?.rows && Array.isArray(initialData.rows)) {
      return initialData.rows.map((r: any, i: number) => ({
        id: i + 1,
        name: r.name || "",
        evaluationMethod: r.evaluation_method || "",
        evaluationScoring: r.evaluation_scoring?.toString() || "",
        evaluationResult: r.evaluation_result || "",
        effectivenessMethod: r.effectiveness_method || "",
        effectivenessScoring: r.effectiveness_scoring?.toString() || "",
        effectivenessResult: r.effectiveness_result || "",
        averageScoring: r.average_scoring?.toString() || "",
        trainingStatus: r.training_status || "",
      }));
    }
    return Array.from({ length: 15 }, (_, i) => emptyWorkerRow(i + 1));
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const addRow = () => setRows((prev) => [...prev, emptyWorkerRow(prev.length + 1)]);
  const removeRow = (id: number) => { if (rows.length > 1) setRows((prev) => prev.filter((r) => r.id !== id)); };

  const updateRow = (id: number, field: keyof WorkerRow, value: any) => {
    setRows((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      const evalScore = parseFloat(updated.evaluationScoring) || 0;
      const effScore = parseFloat(updated.effectivenessScoring) || 0;
      if (evalScore > 0 && effScore > 0) {
        const avg = (evalScore + effScore) / 2;
        updated.averageScoring = avg.toFixed(1);
        updated.trainingStatus = avg >= 80 ? "Effective" : avg >= 60 ? "Refresher" : "Retraining";
      }
      if (evalScore > 0) updated.evaluationResult = evalScore >= 60 ? "Pass" : "Fail";
      if (effScore > 0) updated.effectivenessResult = effScore >= 60 ? "Effective" : "Non-Effective";
      return updated;
    }));
  };

  const handleSubmitWorkers = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: typeof window !== "undefined" ? localStorage.getItem("currentWarehouse") || "A185" : "A185",
      rows: rows.filter((r) => r.name).map((r) => ({
        name: r.name,
        evaluation_method: r.evaluationMethod,
        evaluation_scoring: r.evaluationScoring ? Number(r.evaluationScoring) : null,
        evaluation_result: r.evaluationResult,
        effectiveness_method: r.effectivenessMethod,
        effectiveness_scoring: r.effectivenessScoring ? Number(r.effectivenessScoring) : null,
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
        await docsApi.create("training-attendance-workers", payload);
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
      <div className="border border-gray-300 mb-4 rounded">
        <div className="bg-gray-50 p-3 border-b border-gray-300">
          <h1 className="font-bold text-lg">CANDOR FOODS PRIVATE LIMITED</h1>
          <p className="text-sm font-semibold">TRAINING ATTENDANCE SHEET & RECORD FOR EVALUATION / EFFECTIVENESS OF TRAINING (WORKERS)</p>
          <p className="text-xs text-gray-600">Document No: CFPLA.C7.F.03 | Issue No: 03 | Rev Date: 01/11/2025 | Rev No: 02</p>
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-300 rounded mb-4">
        <table className="w-full text-xs">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 px-1 py-2 w-10">SR. NO</th>
              <th className="border border-gray-300 px-1 py-2 min-w-[150px]">Name</th>
              <th className="border border-gray-300 px-1 py-2">Evaluation Method</th>
              <th className="border border-gray-300 px-1 py-2">Evaluation Scoring (Dated)</th>
              <th className="border border-gray-300 px-1 py-2">Results Pass/Fail</th>
              <th className="border border-gray-300 px-1 py-2">Effectiveness Method</th>
              <th className="border border-gray-300 px-1 py-2">Effectiveness Scoring (Dated)</th>
              <th className="border border-gray-300 px-1 py-2">Results Effective/Non-Effective</th>
              <th className="border border-gray-300 px-1 py-2">Average Scoring (%)</th>
              <th className="border border-gray-300 px-1 py-2">Training Status</th>
              <th className="border border-gray-300 px-1 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.id} className="hover:bg-blue-50">
                <td className="border border-gray-300 px-1 py-1 text-center">{idx + 1}</td>
                <td className="border border-gray-300 px-1 py-1"><input type="text" value={row.name} onChange={(e) => updateRow(row.id, "name", e.target.value)} className="w-full border rounded px-1 py-0.5" placeholder="Worker name" /></td>
                <td className="border border-gray-300 px-1 py-1">
                  <select value={row.evaluationMethod} onChange={(e) => updateRow(row.id, "evaluationMethod", e.target.value)} className="w-full border rounded px-0.5 py-0.5">
                    <option value="">Select</option>
                    {EVAL_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </td>
                <td className="border border-gray-300 px-1 py-1"><input type="number" value={row.evaluationScoring} onChange={(e) => updateRow(row.id, "evaluationScoring", e.target.value)} className="w-full border rounded px-1 py-0.5" placeholder="%" min="0" max="100" /></td>
                <td className={`border border-gray-300 px-1 py-1 text-center font-semibold ${row.evaluationResult === "Pass" ? "bg-green-100 text-green-800" : row.evaluationResult === "Fail" ? "bg-red-100 text-red-800" : ""}`}>{row.evaluationResult}</td>
                <td className="border border-gray-300 px-1 py-1">
                  <select value={row.effectivenessMethod} onChange={(e) => updateRow(row.id, "effectivenessMethod", e.target.value)} className="w-full border rounded px-0.5 py-0.5">
                    <option value="">Select</option>
                    {EVAL_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </td>
                <td className="border border-gray-300 px-1 py-1"><input type="number" value={row.effectivenessScoring} onChange={(e) => updateRow(row.id, "effectivenessScoring", e.target.value)} className="w-full border rounded px-1 py-0.5" placeholder="%" min="0" max="100" /></td>
                <td className={`border border-gray-300 px-1 py-1 text-center font-semibold ${row.effectivenessResult === "Effective" ? "bg-green-100 text-green-800" : row.effectivenessResult === "Non-Effective" ? "bg-red-100 text-red-800" : ""}`}>{row.effectivenessResult}</td>
                <td className={`border border-gray-300 px-1 py-1 text-center font-bold ${parseFloat(row.averageScoring) >= 80 ? "bg-green-100" : parseFloat(row.averageScoring) >= 60 ? "bg-yellow-100" : row.averageScoring ? "bg-red-100" : ""}`}>{row.averageScoring ? `${row.averageScoring}%` : ""}</td>
                <td className={`border border-gray-300 px-1 py-1 text-center text-[10px] font-semibold ${row.trainingStatus === "Effective" ? "text-green-800" : row.trainingStatus === "Refresher" ? "text-yellow-800" : row.trainingStatus === "Retraining" ? "text-red-800" : ""}`}>{row.trainingStatus}</td>
                <td className="border border-gray-300 px-1 py-1 text-center"><button onClick={() => removeRow(row.id)} className="text-red-500 text-xs">✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={addRow} className="bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700">+ Add Worker</button>
      <div className="mt-2 text-xs text-gray-500">Prepared by: HR | Approved by: FSTL</div>
      <button onClick={handleSubmitWorkers} disabled={submitting} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
        {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
      </button>
      {success && <p className="text-green-600 text-sm mt-2">Record saved successfully!</p>}
    </div>
  );
}

// ===================== F.03i - REFERENCE SHEET =====================
interface RefRow { id: number; content: string; }

export function TrainingReferenceSheet({ initialData, onSubmit, isEdit }: TrainingFormProps = {}) {
  const [referenceMaterial, setReferenceMaterial] = useState(initialData?.reference_material || "");
  const [rows, setRows] = useState<RefRow[]>(() => {
    if (initialData?.rows && Array.isArray(initialData.rows)) {
      return initialData.rows.map((r: any, i: number) => ({ id: i + 1, content: r.content || "" }));
    }
    return Array.from({ length: 10 }, (_, i) => ({ id: i + 1, content: "" }));
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const addRow = () => setRows((prev) => [...prev, { id: prev.length + 1, content: "" }]);
  const removeRow = (id: number) => { if (rows.length > 1) setRows((prev) => prev.filter((r) => r.id !== id)); };

  const handleSubmitRef = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: typeof window !== "undefined" ? localStorage.getItem("currentWarehouse") || "A185" : "A185",
      reference_material: referenceMaterial,
      rows: rows.filter((r) => r.content).map((r) => ({ content: r.content })),
    };
    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        const { docsApi } = await import("@/lib/api/documentations");
        await docsApi.create("training-reference-sheet", payload);
        setSuccess(true);
      }
    } catch (e: any) {
      alert(e.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="border border-gray-300 mb-4 rounded">
        <div className="bg-gray-50 p-3 border-b border-gray-300">
          <h1 className="font-bold text-lg">CANDOR FOODS PRIVATE LIMITED</h1>
          <p className="text-sm font-semibold">REFERENCE MATERIAL & RECORD FOR EVALUATION / EFFECTIVENESS OF TRAINING</p>
          <p className="text-xs text-gray-600">Document No: CFPLA.C7.F.03i | Issue No: 03 | Rev Date: 01/11/2025 | Rev No: 02</p>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Reference Material</label>
        <textarea value={referenceMaterial} onChange={(e) => setReferenceMaterial(e.target.value)} rows={5} className="border border-gray-300 rounded px-3 py-2 w-full" placeholder="Enter reference material details..." />
      </div>

      <div className="border border-gray-300 rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 px-2 py-2 w-16">SR NO.</th>
              <th className="border border-gray-300 px-2 py-2">EVALUATION & EFFECTIVES BASED ON</th>
              <th className="border border-gray-300 px-2 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.id} className="hover:bg-blue-50">
                <td className="border border-gray-300 px-2 py-1 text-center">{idx + 1}</td>
                <td className="border border-gray-300 px-1 py-1">
                  <input type="text" value={row.content} onChange={(e) => setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, content: e.target.value } : r))} className="w-full border rounded px-2 py-1" placeholder="Enter evaluation criteria..." />
                </td>
                <td className="border border-gray-300 px-1 py-1 text-center"><button onClick={() => removeRow(row.id)} className="text-red-500 text-xs">✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={addRow} className="mt-2 bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700">+ Add Row</button>
      <div className="mt-2 text-xs text-gray-500">Prepared by: HR | Approved by: FSTL</div>
      <button onClick={handleSubmitRef} disabled={submitting} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
        {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
      </button>
      {success && <p className="text-green-600 text-sm mt-2">Record saved successfully!</p>}
    </div>
  );
}

// ===================== F.03j - FEEDBACK RECORD =====================
const FEEDBACK_PARAMS = [
  "Did you get more or less out of today's sessions than you expected?",
  "Training Content",
  "Was the training interesting & Stimulating",
  "Instructor's Skills",
  "Over all Discipline",
  "Participation / Interactive Session",
];

export function TrainingFeedbackRecord({ initialData, onSubmit, isEdit }: TrainingFormProps = {}) {
  const [participantName, setParticipantName] = useState(initialData?.participant_name || "");
  const [date, setDate] = useState(initialData?.feedback_date || "");
  const [trainingProgram, setTrainingProgram] = useState(initialData?.training_program || "");
  const [modeOfTraining, setModeOfTraining] = useState<"Internal" | "External" | "Others" | "">(initialData?.mode_of_training || "");
  const [ratings, setRatings] = useState<Record<number, { rating: number; comments: string }>>(() => {
    if (initialData?.ratings && Array.isArray(initialData.ratings)) {
      return Object.fromEntries(initialData.ratings.map((r: any, i: number) => [i, { rating: r.rating || 0, comments: r.comments || "" }]));
    }
    return Object.fromEntries(FEEDBACK_PARAMS.map((_, i) => [i, { rating: 0, comments: "" }]));
  });
  const [improvements, setImprovements] = useState(initialData?.improvements || "");
  const [majorLearning, setMajorLearning] = useState(initialData?.major_learning || "");
  const [signature, setSignature] = useState(initialData?.signature || "");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmitFeedback = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: typeof window !== "undefined" ? localStorage.getItem("currentWarehouse") || "A185" : "A185",
      participant_name: participantName,
      feedback_date: date,
      training_program: trainingProgram,
      mode_of_training: modeOfTraining,
      ratings: FEEDBACK_PARAMS.map((_, i) => ({ rating: ratings[i]?.rating || 0, comments: ratings[i]?.comments || "" })),
      improvements,
      major_learning: majorLearning,
      signature,
    };
    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        const { docsApi } = await import("@/lib/api/documentations");
        await docsApi.create("training-feedback", payload);
        setSuccess(true);
      }
    } catch (e: any) {
      alert(e.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="border border-gray-300 mb-4 rounded">
        <div className="bg-gray-50 p-3 border-b border-gray-300">
          <h1 className="font-bold text-lg">CANDOR FOODS PRIVATE LIMITED</h1>
          <p className="text-sm font-semibold">TRAINEE & TRAINER FEEDBACK RECORD</p>
          <p className="text-xs text-gray-600">Document No: CFPLA.C7.F.03j | Issue No: 03 | Rev Date: 01/11/2025 | Rev No: 02</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div><label className="block text-sm font-medium mb-1">Participant&apos;s Name</label><input type="text" value={participantName} onChange={(e) => setParticipantName(e.target.value)} className="border rounded px-3 py-2 w-full" /></div>
        <div><label className="block text-sm font-medium mb-1">Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border rounded px-3 py-2 w-full" /></div>
        <div><label className="block text-sm font-medium mb-1">Training Program</label><input type="text" value={trainingProgram} onChange={(e) => setTrainingProgram(e.target.value)} className="border rounded px-3 py-2 w-full" /></div>
        <div>
          <label className="block text-sm font-medium mb-1">Mode of Training</label>
          <div className="flex gap-3 mt-1">
            {(["Internal", "External", "Others"] as const).map((mode) => (
              <label key={mode} className={`px-3 py-1.5 rounded border text-sm cursor-pointer ${modeOfTraining === mode ? "bg-blue-100 border-blue-400" : "border-gray-300"}`}>
                <input type="radio" name="mode" checked={modeOfTraining === mode} onChange={() => setModeOfTraining(mode)} className="sr-only" />
                {mode}
              </label>
            ))}
          </div>
        </div>
      </div>

      <p className="text-sm font-medium mb-2">Please rate on the following parameters:</p>
      <p className="text-xs text-gray-500 mb-3">Excellent (5) &nbsp; V Good (4) &nbsp; Good (3) &nbsp; Average (2) &nbsp; Poor (1)</p>

      <div className="border border-gray-300 rounded overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 px-2 py-2 w-10">Sr.</th>
              <th className="border border-gray-300 px-2 py-2">Parameters</th>
              <th className="border border-gray-300 px-2 py-2 w-40">Rating</th>
              <th className="border border-gray-300 px-2 py-2">Comments</th>
            </tr>
          </thead>
          <tbody>
            {FEEDBACK_PARAMS.map((param, idx) => (
              <tr key={idx} className="hover:bg-blue-50">
                <td className="border border-gray-300 px-2 py-2 text-center">{idx + 1}</td>
                <td className="border border-gray-300 px-2 py-2 text-sm">{param}</td>
                <td className="border border-gray-300 px-2 py-2">
                  <div className="flex gap-1 justify-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRatings((prev) => ({ ...prev, [idx]: { ...prev[idx], rating: star } }))}
                        className={`w-8 h-8 rounded-full border text-sm font-bold transition-colors ${
                          ratings[idx]?.rating >= star
                            ? "bg-yellow-400 border-yellow-500 text-white"
                            : "border-gray-300 text-gray-400 hover:border-yellow-300"
                        }`}
                      >
                        {star}
                      </button>
                    ))}
                  </div>
                </td>
                <td className="border border-gray-300 px-1 py-1">
                  <input type="text" value={ratings[idx]?.comments || ""} onChange={(e) => setRatings((prev) => ({ ...prev, [idx]: { ...prev[idx], comments: e.target.value } }))} className="w-full border rounded px-2 py-1 text-sm" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 mb-4">
        <div><label className="block text-sm font-medium mb-1">In what specific ways, could the training be improved?</label><textarea value={improvements} onChange={(e) => setImprovements(e.target.value)} rows={3} className="border rounded px-3 py-2 w-full" /></div>
        <div><label className="block text-sm font-medium mb-1">Please list the major learning from the training.</label><textarea value={majorLearning} onChange={(e) => setMajorLearning(e.target.value)} rows={3} className="border rounded px-3 py-2 w-full" /></div>
        <div><label className="block text-sm font-medium mb-1">Signature</label><input type="text" value={signature} onChange={(e) => setSignature(e.target.value)} className="border rounded px-3 py-2 w-64" /></div>
      </div>
      <div className="mt-2 text-xs text-gray-500">Prepared by: HR | Approved by: FSTL</div>
      <button onClick={handleSubmitFeedback} disabled={submitting} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
        {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
      </button>
      {success && <p className="text-green-600 text-sm mt-2">Record saved successfully!</p>}
    </div>
  );
}

// ===================== F.03k - EMPLOYEE TRAINING CARD =====================
interface TrainingCardRow {
  id: number; date: string; totalHours: string; topicsCovered: string; trainer: string; acknowledgement: string;
}
const emptyCardRow = (id: number): TrainingCardRow => ({ id, date: "", totalHours: "", topicsCovered: "", trainer: "", acknowledgement: "" });

export function EmployeeTrainingCard({ initialData, onSubmit, isEdit }: TrainingFormProps = {}) {
  const [employeeName, setEmployeeName] = useState(initialData?.employee_name || "");
  const [designation, setDesignation] = useState(initialData?.designation || "");
  const [trainingNeeds, setTrainingNeeds] = useState(initialData?.training_needs || "");
  const [rows, setRows] = useState<TrainingCardRow[]>(() => {
    if (initialData?.rows && Array.isArray(initialData.rows)) {
      return initialData.rows.map((r: any, i: number) => ({
        id: i + 1,
        date: r.date || "",
        totalHours: r.total_hours?.toString() || "",
        topicsCovered: r.topics_covered || "",
        trainer: r.trainer || "",
        acknowledgement: r.acknowledgement || "",
      }));
    }
    return Array.from({ length: 12 }, (_, i) => emptyCardRow(i + 1));
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const addRow = () => setRows((prev) => [...prev, emptyCardRow(prev.length + 1)]);
  const removeRow = (id: number) => { if (rows.length > 1) setRows((prev) => prev.filter((r) => r.id !== id)); };
  const updateRow = (id: number, field: keyof TrainingCardRow, value: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const handleSubmitCard = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: typeof window !== "undefined" ? localStorage.getItem("currentWarehouse") || "A185" : "A185",
      employee_name: employeeName,
      designation,
      training_needs: trainingNeeds,
      rows: rows.filter((r) => r.date || r.topicsCovered).map((r) => ({
        date: r.date,
        total_hours: r.totalHours ? Number(r.totalHours) : null,
        topics_covered: r.topicsCovered,
        trainer: r.trainer,
        acknowledgement: r.acknowledgement,
      })),
    };
    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        const { docsApi } = await import("@/lib/api/documentations");
        await docsApi.create("training-card", payload);
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
        <div className="bg-gray-50 p-3 border-b border-gray-300">
          <h1 className="font-bold text-lg">CANDOR FOODS PRIVATE LIMITED</h1>
          <p className="text-sm font-semibold">Training Card</p>
          <p className="text-xs text-gray-600">Document No: CFPLA.C7.F.03k | Issue No: 03 | Rev Date: 01/11/2025 | Rev No: 02</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div><label className="block text-sm font-medium mb-1">Employee Name</label><input type="text" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} className="border rounded px-3 py-2 w-full" /></div>
        <div><label className="block text-sm font-medium mb-1">Designation</label><input type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} className="border rounded px-3 py-2 w-full" /></div>
        <div><label className="block text-sm font-medium mb-1">Training Needs Identified</label><input type="text" value={trainingNeeds} onChange={(e) => setTrainingNeeds(e.target.value)} className="border rounded px-3 py-2 w-full" /></div>
      </div>

      <div className="overflow-x-auto border border-gray-300 rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 px-2 py-2 w-10">Sr.no</th>
              <th className="border border-gray-300 px-2 py-2 w-32">DATE</th>
              <th className="border border-gray-300 px-2 py-2 w-20">Total Training Hours</th>
              <th className="border border-gray-300 px-2 py-2">Brief of Training Topics Covered (with references of applicable GMP, SOP, SSOP, etc.)</th>
              <th className="border border-gray-300 px-2 py-2 w-28">Trainer</th>
              <th className="border border-gray-300 px-2 py-2 w-28">Acknowledgment by TRAINEE</th>
              <th className="border border-gray-300 px-2 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.id} className="hover:bg-blue-50">
                <td className="border border-gray-300 px-2 py-1 text-center">{idx + 1}</td>
                <td className="border border-gray-300 px-1 py-1"><input type="date" value={row.date} onChange={(e) => updateRow(row.id, "date", e.target.value)} className="w-full border rounded px-1 py-0.5 text-sm" /></td>
                <td className="border border-gray-300 px-1 py-1"><input type="number" value={row.totalHours} onChange={(e) => updateRow(row.id, "totalHours", e.target.value)} className="w-full border rounded px-1 py-0.5 text-sm" placeholder="hrs" /></td>
                <td className="border border-gray-300 px-1 py-1"><input type="text" value={row.topicsCovered} onChange={(e) => updateRow(row.id, "topicsCovered", e.target.value)} className="w-full border rounded px-1 py-0.5 text-sm" placeholder="Training topics..." /></td>
                <td className="border border-gray-300 px-1 py-1"><input type="text" value={row.trainer} onChange={(e) => updateRow(row.id, "trainer", e.target.value)} className="w-full border rounded px-1 py-0.5 text-sm" /></td>
                <td className="border border-gray-300 px-1 py-1"><input type="text" value={row.acknowledgement} onChange={(e) => updateRow(row.id, "acknowledgement", e.target.value)} className="w-full border rounded px-1 py-0.5 text-sm" /></td>
                <td className="border border-gray-300 px-1 py-1 text-center"><button onClick={() => removeRow(row.id)} className="text-red-500 text-xs">✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={addRow} className="mt-2 bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700">+ Add Row</button>
      <div className="mt-2 text-xs text-gray-500">Prepared by: HR | Approved by: FSTL</div>
      <button onClick={handleSubmitCard} disabled={submitting} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
        {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
      </button>
      {success && <p className="text-green-600 text-sm mt-2">Record saved successfully!</p>}
    </div>
  );
}

export default TrainingAttendanceWorkers;
