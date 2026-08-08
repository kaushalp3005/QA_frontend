"use client";
import { useState } from "react";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";
import {
  AddRowButton,
  CardField,
  CriteriaLegend,
  DocHeader,
  Field,
  OptionChip,
  Pill,
  RemoveRowButton,
  RowCard,
  Section,
  SubmitBar,
  Td,
  Th,
  cellInput,
  scoreTone,
  statusTone,
} from "@/components/training/FormShell";

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
  // DB column is `training_type` (singular) — an array of strings. An "Other"
  // entry is stored as "Other: <detail>" so the specifics survive without a
  // dedicated column; unpack that back into the checkbox + detail text below.
  const [trainingTypes, setTrainingTypes] = useState<string[]>(() => {
    const raw: string[] = Array.isArray(initialData?.training_type) ? initialData.training_type : [];
    return raw.map((t) => (t.startsWith("Other") ? "Other" : t));
  });
  const [otherTrainingTypeDetail, setOtherTrainingTypeDetail] = useState<string>(() => {
    const raw: string[] = Array.isArray(initialData?.training_type) ? initialData.training_type : [];
    const otherEntry = raw.find((t) => t.startsWith("Other:"));
    return otherEntry ? otherEntry.slice("Other:".length).trim() : "";
  });
  const [startTime, setStartTime] = useState(initialData?.time_start || "");
  const [endTime, setEndTime] = useState(initialData?.time_end || "");
  const [conductedBy, setConductedBy] = useState(initialData?.conducted_by || "");
  const [trainerQualification, setTrainerQualification] = useState(initialData?.trainer_qualification || "");
  const [venue, setVenue] = useState(initialData?.venue || "");
  const [keyPoints, setKeyPoints] = useState(initialData?.key_points_covered || "");
  const [department, setDepartment] = useState(initialData?.department || "");
  const [language, setLanguage] = useState<string[]>(initialData?.training_language || []);
  const [effectivenessDays, setEffectivenessDays] = useState<"15" | "30" | "">(
    initialData?.effectiveness_after_days != null ? (String(initialData.effectiveness_after_days) as "15" | "30") : ""
  );
  const [trainerSign, setTrainerSign] = useState(initialData?.trainer_signature || "");
  const [fstlSign, setFstlSign] = useState(initialData?.fstl_signature || "");
  const [effectivenessEvaluatedBy, setEffectivenessEvaluatedBy] = useState(initialData?.effectiveness_evaluated_by || "");
  const [effectivenessDate, setEffectivenessDate] = useState(initialData?.dated || "");
  const [correctiveActions, setCorrectiveActions] = useState<string[]>(initialData?.corrective_actions || []);
  const [rows, setRows] = useState<AttendeeRow[]>(() => {
    if (initialData?.attendees && Array.isArray(initialData.attendees)) {
      return initialData.attendees.map((r: any, i: number) => ({
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
  // Row ids whose designation is missing, plus the message shown above the submit bar.
  const [rowErrors, setRowErrors] = useState<number[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const addRow = () => setRows((prev) => [...prev, emptyRow(prev.length + 1)]);
  const removeRow = (id: number) => { if (rows.length > 1) setRows((prev) => prev.filter((r) => r.id !== id)); };

  const updateRow = (id: number, field: keyof AttendeeRow, value: any) => {
    setRows((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      if (field === "designation" && String(value).trim()) {
        setRowErrors((errs) => errs.filter((errId) => errId !== id));
      }
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
    // Designation is how the Employee Training Card tells two same-named people
    // apart when it resolves an attendee, so every named attendee needs one.
    const missing = rows
      .map((r, i) => ({ r, position: i + 1 }))
      .filter(({ r }) => r.name.trim() && !r.designation.trim());
    if (missing.length) {
      setRowErrors(missing.map(({ r }) => r.id));
      setFormError(
        `Designation is required for attendee ${missing.map((m) => m.position).join(", ")}.`
      );
      return;
    }
    setRowErrors([]);
    setFormError(null);
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: getStoredWarehouse(),
      training_date: trainingDate,
      training_type: trainingTypes.map((t) =>
        t === "Other" && otherTrainingTypeDetail.trim() ? `Other: ${otherTrainingTypeDetail.trim()}` : t
      ),
      time_start: startTime,
      time_end: endTime,
      conducted_by: conductedBy,
      trainer_qualification: trainerQualification,
      venue,
      key_points_covered: keyPoints,
      department,
      training_language: language,
      effectiveness_after_days: effectivenessDays ? Number(effectivenessDays) : null,
      trainer_signature: trainerSign,
      fstl_signature: fstlSign,
      effectiveness_evaluated_by: effectivenessEvaluatedBy,
      dated: effectivenessDate,
      corrective_actions: correctiveActions,
      attendees: rows.filter((r) => r.name).map((r) => ({
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

  const filledAttendees = rows.filter((r) => r.name.trim()).length;

  return (
    <div className="space-y-4 sm:space-y-5 pb-2">
      <DocHeader
        title="Training Attendance Sheet & Record for Evaluation / Effectiveness of Training"
        docNo="CFPLA.C7.F.03"
        meta="Issue 03 · Rev 02 · 27/09/2025"
      />

      {/* Training details */}
      <Section title="Training Details">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Field label="Training Date">
            <input type="date" value={trainingDate} onChange={(e) => setTrainingDate(e.target.value)} className="input-base" />
          </Field>
          <Field label="Time: Start">
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input-base" />
          </Field>
          <Field label="Time: End">
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="input-base" />
          </Field>
          <Field label="Training Conducted by">
            <input type="text" value={conductedBy} onChange={(e) => setConductedBy(e.target.value)} className="input-base" placeholder="Trainer name" />
          </Field>
          <Field label="Trainer Qualification / Competencies">
            <input type="text" value={trainerQualification} onChange={(e) => setTrainerQualification(e.target.value)} className="input-base" placeholder="Qualification" />
          </Field>
          <Field label="Venue">
            <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)} className="input-base" placeholder="Venue" />
          </Field>
          <Field label="Department">
            <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} className="input-base" placeholder="Department" />
          </Field>
        </div>

        <div className="mt-4 border-t border-cream-200 pt-4">
          <label className="label-base">Training Type</label>
          <div className="flex flex-wrap gap-2">
            {TRAINING_TYPES.map((type) => (
              <OptionChip
                key={type}
                label={type}
                checked={trainingTypes.includes(type)}
                onToggle={() => setTrainingTypes((prev) => toggleArrayItem(prev, type))}
              />
            ))}
          </div>
          {trainingTypes.includes("Other") && (
            <input
              type="text"
              value={otherTrainingTypeDetail}
              onChange={(e) => setOtherTrainingTypeDetail(e.target.value)}
              placeholder="Specify other training type…"
              className="input-base mt-2.5"
              autoFocus
            />
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 border-t border-cream-200 pt-4 sm:grid-cols-2">
          <div>
            <label className="label-base">Training Language</label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => (
                <OptionChip
                  key={lang}
                  label={lang}
                  checked={language.includes(lang)}
                  onToggle={() => setLanguage((prev) => toggleArrayItem(prev, lang))}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="label-base">Effectiveness will be conducted after</label>
            <div className="flex flex-wrap gap-2">
              {["15", "30"].map((d) => (
                <OptionChip
                  key={d}
                  type="radio"
                  label={`${d} days`}
                  checked={effectivenessDays === d}
                  onToggle={() => setEffectivenessDays(d as "15" | "30")}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-cream-200 pt-4">
          <label className="label-base">Key Points / Topics Covered</label>
          <textarea
            value={keyPoints}
            onChange={(e) => setKeyPoints(e.target.value)}
            rows={3}
            className="input-base resize-y"
            placeholder="Enter key training topics covered…"
          />
        </div>
      </Section>

      {/* Attendees */}
      <Section
        title="Attendees, Evaluation & Effectiveness"
        hint={`${filledAttendees} of ${rows.length} rows filled · scores auto-calculate the average and status`}
        bodyClassName="p-0"
      >
        {/* Desktop: full record grid */}
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1180px] text-xs">
            <thead className="bg-cream-100/70">
              <tr>
                <Th className="w-10" rowSpan={2}>Sr.</Th>
                <Th className="min-w-[150px] text-left" rowSpan={2}>Name</Th>
                <Th className="min-w-[120px] text-left" rowSpan={2}>Designation *</Th>
                <Th className="min-w-[110px] text-left" rowSpan={2}>Signature</Th>
                <Th className="border-l border-cream-300 text-center" colSpan={3}>Evaluation</Th>
                <Th className="border-l border-cream-300 text-center" colSpan={3}>Effectiveness</Th>
                <Th className="min-w-[80px] border-l border-cream-300" rowSpan={2}>Avg %</Th>
                <Th className="min-w-[100px]" rowSpan={2}>Status</Th>
                <Th className="w-10" rowSpan={2} />
              </tr>
              <tr>
                <Th className="border-l border-cream-300 text-[10px] min-w-[110px]">Method</Th>
                <Th className="text-[10px] min-w-[70px]">Score</Th>
                <Th className="text-[10px] min-w-[90px]">Result</Th>
                <Th className="border-l border-cream-300 text-[10px] min-w-[110px]">Method</Th>
                <Th className="text-[10px] min-w-[70px]">Score</Th>
                <Th className="text-[10px] min-w-[110px]">Result</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.id} className="transition-colors hover:bg-cream-100/60">
                  <Td className="text-center text-[11px] font-semibold text-ink-400">{idx + 1}</Td>
                  <Td>
                    <input type="text" value={row.name} onChange={(e) => updateRow(row.id, "name", e.target.value)} className={cellInput} placeholder="Name" />
                  </Td>
                  <Td>
                    <input
                      type="text"
                      value={row.designation}
                      onChange={(e) => updateRow(row.id, "designation", e.target.value)}
                      className={`${cellInput} ${rowErrors.includes(row.id) ? "ring-2 ring-danger-400" : ""}`}
                      placeholder="Designation"
                    />
                  </Td>
                  <Td>
                    <input type="text" value={row.signature} onChange={(e) => updateRow(row.id, "signature", e.target.value)} className={cellInput} placeholder="Sign" />
                  </Td>
                  <Td className="border-l border-cream-200">
                    <select value={row.evaluationMethod[0] || ""} onChange={(e) => updateRow(row.id, "evaluationMethod", e.target.value ? [e.target.value] : [])} className={cellInput}>
                      <option value="">Select</option>
                      {EVAL_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </Td>
                  <Td>
                    <input type="number" value={row.evaluationScoring} onChange={(e) => updateRow(row.id, "evaluationScoring", e.target.value)} className={cellInput} placeholder="%" min="0" max="100" />
                  </Td>
                  <Td>
                    <select value={row.evaluationResult} onChange={(e) => updateRow(row.id, "evaluationResult", e.target.value)} className={cellInput}>
                      <option value="">—</option>
                      <option value="Pass">Pass</option>
                      <option value="Fail">Fail</option>
                    </select>
                  </Td>
                  <Td className="border-l border-cream-200">
                    <select value={row.effectivenessMethod[0] || ""} onChange={(e) => updateRow(row.id, "effectivenessMethod", e.target.value ? [e.target.value] : [])} className={cellInput}>
                      <option value="">Select</option>
                      {EVAL_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </Td>
                  <Td>
                    <input type="number" value={row.effectivenessScoring} onChange={(e) => updateRow(row.id, "effectivenessScoring", e.target.value)} className={cellInput} placeholder="%" min="0" max="100" />
                  </Td>
                  <Td>
                    <select value={row.effectivenessResult} onChange={(e) => updateRow(row.id, "effectivenessResult", e.target.value)} className={cellInput}>
                      <option value="">—</option>
                      <option value="Effective">Effective</option>
                      <option value="Non-Effective">Non-Effective</option>
                    </select>
                  </Td>
                  <Td className="border-l border-cream-200 text-center">
                    {row.averageScoring ? (
                      <Pill tone={scoreTone(row.averageScoring)}>{row.averageScoring}%</Pill>
                    ) : (
                      <span className="text-ink-300">—</span>
                    )}
                  </Td>
                  <Td className="text-center">
                    {row.trainingStatus ? (
                      <Pill tone={statusTone(row.trainingStatus)}>{row.trainingStatus}</Pill>
                    ) : (
                      <span className="text-ink-300">—</span>
                    )}
                  </Td>
                  <Td className="text-center">
                    <RemoveRowButton onClick={() => removeRow(row.id)} label={`Remove attendee ${idx + 1}`} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile / tablet: one card per attendee */}
        <div className="space-y-3 p-4 lg:hidden">
          {rows.map((row, idx) => (
            <RowCard
              key={row.id}
              index={idx + 1}
              label="Attendee"
              onRemove={() => removeRow(row.id)}
              badge={row.trainingStatus ? <Pill tone={statusTone(row.trainingStatus)}>{row.trainingStatus}</Pill> : undefined}
            >
              <CardField label="Name">
                <input type="text" value={row.name} onChange={(e) => updateRow(row.id, "name", e.target.value)} className="input-base" placeholder="Attendee name" />
              </CardField>
              <div className="grid grid-cols-2 gap-3">
                <CardField label="Designation">
                  <input
                    type="text"
                    value={row.designation}
                    onChange={(e) => updateRow(row.id, "designation", e.target.value)}
                    className={`input-base ${rowErrors.includes(row.id) ? "ring-2 ring-danger-400" : ""}`}
                    placeholder="Role"
                  />
                </CardField>
                <CardField label="Signature">
                  <input type="text" value={row.signature} onChange={(e) => updateRow(row.id, "signature", e.target.value)} className="input-base" placeholder="Sign" />
                </CardField>
              </div>

              <div className="rounded-xl border border-cream-300 bg-cream-100/50 p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-brand-500">Evaluation</p>
                <div className="grid grid-cols-2 gap-3">
                  <CardField label="Method">
                    <select value={row.evaluationMethod[0] || ""} onChange={(e) => updateRow(row.id, "evaluationMethod", e.target.value ? [e.target.value] : [])} className="input-base">
                      <option value="">Select</option>
                      {EVAL_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </CardField>
                  <CardField label="Score (%)">
                    <input type="number" inputMode="numeric" value={row.evaluationScoring} onChange={(e) => updateRow(row.id, "evaluationScoring", e.target.value)} className="input-base" placeholder="%" min="0" max="100" />
                  </CardField>
                </div>
                <CardField label="Result" className="mt-3">
                  <select value={row.evaluationResult} onChange={(e) => updateRow(row.id, "evaluationResult", e.target.value)} className="input-base">
                    <option value="">—</option>
                    <option value="Pass">Pass</option>
                    <option value="Fail">Fail</option>
                  </select>
                </CardField>
              </div>

              <div className="rounded-xl border border-cream-300 bg-cream-100/50 p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-brand-500">Effectiveness</p>
                <div className="grid grid-cols-2 gap-3">
                  <CardField label="Method">
                    <select value={row.effectivenessMethod[0] || ""} onChange={(e) => updateRow(row.id, "effectivenessMethod", e.target.value ? [e.target.value] : [])} className="input-base">
                      <option value="">Select</option>
                      {EVAL_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </CardField>
                  <CardField label="Score (%)">
                    <input type="number" inputMode="numeric" value={row.effectivenessScoring} onChange={(e) => updateRow(row.id, "effectivenessScoring", e.target.value)} className="input-base" placeholder="%" min="0" max="100" />
                  </CardField>
                </div>
                <CardField label="Result" className="mt-3">
                  <select value={row.effectivenessResult} onChange={(e) => updateRow(row.id, "effectivenessResult", e.target.value)} className="input-base">
                    <option value="">—</option>
                    <option value="Effective">Effective</option>
                    <option value="Non-Effective">Non-Effective</option>
                  </select>
                </CardField>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-cream-100 px-3 py-2">
                <span className="text-[10px] font-bold uppercase tracking-wide text-ink-400">Average score</span>
                {row.averageScoring ? (
                  <Pill tone={scoreTone(row.averageScoring)}>{row.averageScoring}%</Pill>
                ) : (
                  <span className="text-xs text-ink-300">Not calculated</span>
                )}
              </div>
            </RowCard>
          ))}
        </div>

        <div className="border-t border-cream-200 px-4 py-3 sm:px-5">
          <AddRowButton label="Add Attendee" onClick={addRow} />
        </div>
      </Section>

      <CriteriaLegend />

      {/* Corrective actions + signatures */}
      <Section title="Corrective Actions & Sign-off">
        <label className="label-base">Corrective Actions Taken</label>
        <div className="flex flex-wrap gap-2">
          {["Refresher", "Re-training", "Closer Supervision"].map((action) => (
            <OptionChip
              key={action}
              tone="warning"
              label={action}
              checked={correctiveActions.includes(action)}
              onToggle={() => setCorrectiveActions((prev) => toggleArrayItem(prev, action))}
            />
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-cream-200 pt-4 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Trainer">
            <input type="text" value={trainerSign} onChange={(e) => setTrainerSign(e.target.value)} className="input-base" />
          </Field>
          <Field label="FSTL">
            <input type="text" value={fstlSign} onChange={(e) => setFstlSign(e.target.value)} className="input-base" />
          </Field>
          <Field label="Effectiveness Evaluated by">
            <input type="text" value={effectivenessEvaluatedBy} onChange={(e) => setEffectivenessEvaluatedBy(e.target.value)} className="input-base" />
          </Field>
          <Field label="Dated">
            <input type="date" value={effectivenessDate} onChange={(e) => setEffectivenessDate(e.target.value)} className="input-base" />
          </Field>
        </div>

        <p className="mt-4 rounded-xl bg-cream-100/60 px-3 py-2.5 text-[11px] italic leading-relaxed text-ink-400">
          Acknowledgement by TRAINEE that he/she has received, understood, and will comply with the
          instructions given in training.
        </p>
      </Section>

      {formError && (
        <p className="rounded-xl border border-danger-200 bg-danger-50 px-3 py-2.5 text-xs font-semibold text-danger-700">
          {formError}
        </p>
      )}

      <SubmitBar submitting={submitting} isEdit={isEdit} success={success} onSubmit={handleSubmit} />
    </div>
  );
}
