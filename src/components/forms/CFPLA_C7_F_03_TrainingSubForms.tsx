"use client";
import { useState } from "react";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";
import {
  DRAFT_KEYS,
  clearDraft,
  draftTime,
  readDraft,
  useDraftAutosave,
} from "@/components/training/useFormDraft";
import {
  AddRowButton,
  CardField,
  CriteriaLegend,
  DocHeader,
  DraftBanner,
  Field,
  OptionChip,
  Pill,
  RemoveRowButton,
  RowCard,
  SCORE_EFFECTIVE,
  SCORE_MAX,
  SCORE_PASS,
  SCORE_REFRESHER,
  Section,
  SubmitBar,
  Td,
  Th,
  cellInput,
  resultTone,
  scoreTone,
  statusTone,
} from "@/components/training/FormShell";

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
  // Partial save applies to a blank create form only.
  const draftEnabled = !initialData && !isEdit;
  const [draft] = useState(() => (draftEnabled ? readDraft(DRAFT_KEYS.workers) : null));
  const seed = initialData ?? draft ?? undefined;
  const [rows, setRows] = useState<WorkerRow[]>(() => {
    // DB column is `workers`, not `rows`.
    if (seed?.workers && Array.isArray(seed.workers)) {
      return seed.workers.map((r: any, i: number) => ({
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
      // Scores are out of 5: each result passes strictly above 3, and the
      // average of the two drives the status band.
      const evalScore = parseFloat(updated.evaluationScoring) || 0;
      const effScore = parseFloat(updated.effectivenessScoring) || 0;
      if (evalScore > 0 && effScore > 0) {
        const avg = (evalScore + effScore) / 2;
        updated.averageScoring = avg.toFixed(1);
        updated.trainingStatus =
          avg >= SCORE_EFFECTIVE ? "Effective" : avg >= SCORE_REFRESHER ? "Refresher" : "Retraining";
      }
      if (evalScore > 0) updated.evaluationResult = evalScore > SCORE_PASS ? "Pass" : "Fail";
      if (effScore > 0) updated.effectivenessResult = effScore > SCORE_PASS ? "Effective" : "Non-Effective";
      return updated;
    }));
  };

  /** The record as it stands — shared by submit and the partial save. */
  const buildPayload = (): Record<string, any> => ({
      warehouse: getStoredWarehouse(),
      workers: rows.filter((r) => r.name).map((r) => ({
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
  });

  useDraftAutosave(DRAFT_KEYS.workers, buildPayload(), draftEnabled);

  const handleSubmitWorkers = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload = buildPayload();
    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        const { docsApi } = await import("@/lib/api/documentations");
        await docsApi.create("training-attendance-workers", payload);
        setSuccess(true);
      }
      clearDraft(DRAFT_KEYS.workers);
    } catch (e: any) {
      alert(e.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  const filled = rows.filter((r) => r.name.trim()).length;

  return (
    <div className="space-y-4 sm:space-y-5 pb-2">
      <DocHeader
        title="Training Attendance & Record for Evaluation / Effectiveness of Training (Workers)"
        docNo="CFPLA.C7.F.03"
        meta="Issue 03 · Rev 02 · 01/11/2025"
      />

      {draft && (
        <DraftBanner
          savedAt={draftTime(draft._savedAt)}
          onDiscard={() => {
            clearDraft(DRAFT_KEYS.workers);
            window.location.reload();
          }}
        />
      )}

      <Section
        title="Workers"
        hint={`${filled} of ${rows.length} rows filled · results and status calculate from the scores`}
        bodyClassName="p-0"
      >
        {/* Desktop table */}
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1080px] text-xs">
            <thead className="bg-cream-100/70">
              <tr>
                <Th className="w-10">Sr.</Th>
                <Th className="min-w-[170px] text-left">Name</Th>
                <Th className="min-w-[120px]">Eval. Method</Th>
                <Th className="min-w-[80px]">Eval. Score /5</Th>
                <Th className="min-w-[90px]">Result</Th>
                <Th className="min-w-[120px] border-l border-cream-300">Effect. Method</Th>
                <Th className="min-w-[80px]">Effect. Score /5</Th>
                <Th className="min-w-[120px]">Result</Th>
                <Th className="min-w-[80px] border-l border-cream-300">Avg /5</Th>
                <Th className="min-w-[100px]">Status</Th>
                <Th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.id} className="transition-colors hover:bg-cream-100/60">
                  <Td className="text-center text-[11px] font-semibold text-ink-400">{idx + 1}</Td>
                  <Td>
                    <input type="text" value={row.name} onChange={(e) => updateRow(row.id, "name", e.target.value)} className={cellInput} placeholder="Worker name" />
                  </Td>
                  <Td>
                    <select value={row.evaluationMethod} onChange={(e) => updateRow(row.id, "evaluationMethod", e.target.value)} className={cellInput}>
                      <option value="">Select</option>
                      {EVAL_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </Td>
                  <Td>
                    <input type="number" value={row.evaluationScoring} onChange={(e) => updateRow(row.id, "evaluationScoring", e.target.value)} className={cellInput} placeholder={`0–${SCORE_MAX}`} min="0" max={SCORE_MAX} step="0.5" />
                  </Td>
                  <Td className="text-center">
                    {row.evaluationResult ? <Pill tone={resultTone(row.evaluationResult)}>{row.evaluationResult}</Pill> : <span className="text-ink-300">—</span>}
                  </Td>
                  <Td className="border-l border-cream-200">
                    <select value={row.effectivenessMethod} onChange={(e) => updateRow(row.id, "effectivenessMethod", e.target.value)} className={cellInput}>
                      <option value="">Select</option>
                      {EVAL_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </Td>
                  <Td>
                    <input type="number" value={row.effectivenessScoring} onChange={(e) => updateRow(row.id, "effectivenessScoring", e.target.value)} className={cellInput} placeholder={`0–${SCORE_MAX}`} min="0" max={SCORE_MAX} step="0.5" />
                  </Td>
                  <Td className="text-center">
                    {row.effectivenessResult ? <Pill tone={resultTone(row.effectivenessResult)}>{row.effectivenessResult}</Pill> : <span className="text-ink-300">—</span>}
                  </Td>
                  <Td className="border-l border-cream-200 text-center">
                    {row.averageScoring ? <Pill tone={scoreTone(row.averageScoring)}>{row.averageScoring} / {SCORE_MAX}</Pill> : <span className="text-ink-300">—</span>}
                  </Td>
                  <Td className="text-center">
                    {row.trainingStatus ? <Pill tone={statusTone(row.trainingStatus)}>{row.trainingStatus}</Pill> : <span className="text-ink-300">—</span>}
                  </Td>
                  <Td className="text-center">
                    <RemoveRowButton onClick={() => removeRow(row.id)} label={`Remove worker ${idx + 1}`} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="space-y-3 p-4 lg:hidden">
          {rows.map((row, idx) => (
            <RowCard
              key={row.id}
              index={idx + 1}
              label="Worker"
              onRemove={() => removeRow(row.id)}
              badge={row.trainingStatus ? <Pill tone={statusTone(row.trainingStatus)}>{row.trainingStatus}</Pill> : undefined}
            >
              <CardField label="Name">
                <input type="text" value={row.name} onChange={(e) => updateRow(row.id, "name", e.target.value)} className="input-base" placeholder="Worker name" />
              </CardField>

              <div className="rounded-xl border border-cream-300 bg-cream-100/50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-brand-500">Evaluation</p>
                  {row.evaluationResult && <Pill tone={resultTone(row.evaluationResult)}>{row.evaluationResult}</Pill>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <CardField label="Method">
                    <select value={row.evaluationMethod} onChange={(e) => updateRow(row.id, "evaluationMethod", e.target.value)} className="input-base">
                      <option value="">Select</option>
                      {EVAL_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </CardField>
                  <CardField label="Score (out of 5)">
                    <input type="number" inputMode="decimal" value={row.evaluationScoring} onChange={(e) => updateRow(row.id, "evaluationScoring", e.target.value)} className="input-base" placeholder={`0–${SCORE_MAX}`} min="0" max={SCORE_MAX} step="0.5" />
                  </CardField>
                </div>
              </div>

              <div className="rounded-xl border border-cream-300 bg-cream-100/50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-brand-500">Effectiveness</p>
                  {row.effectivenessResult && <Pill tone={resultTone(row.effectivenessResult)}>{row.effectivenessResult}</Pill>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <CardField label="Method">
                    <select value={row.effectivenessMethod} onChange={(e) => updateRow(row.id, "effectivenessMethod", e.target.value)} className="input-base">
                      <option value="">Select</option>
                      {EVAL_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </CardField>
                  <CardField label="Score (out of 5)">
                    <input type="number" inputMode="decimal" value={row.effectivenessScoring} onChange={(e) => updateRow(row.id, "effectivenessScoring", e.target.value)} className="input-base" placeholder={`0–${SCORE_MAX}`} min="0" max={SCORE_MAX} step="0.5" />
                  </CardField>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-cream-100 px-3 py-2">
                <span className="text-[10px] font-bold uppercase tracking-wide text-ink-400">Average score</span>
                {row.averageScoring ? (
                  <Pill tone={scoreTone(row.averageScoring)}>{row.averageScoring} / {SCORE_MAX}</Pill>
                ) : (
                  <span className="text-xs text-ink-300">Not calculated</span>
                )}
              </div>
            </RowCard>
          ))}
        </div>

        <div className="border-t border-cream-200 px-4 py-3 sm:px-5">
          <AddRowButton label="Add Worker" onClick={addRow} />
        </div>
      </Section>

      <CriteriaLegend />

      <SubmitBar submitting={submitting} isEdit={isEdit} success={success} onSubmit={handleSubmitWorkers} />
    </div>
  );
}

// ===================== F.03i - REFERENCE SHEET =====================
interface RefRow { id: number; content: string; }

export function TrainingReferenceSheet({ initialData, onSubmit, isEdit }: TrainingFormProps = {}) {
  // Partial save applies to a blank create form only.
  const draftEnabled = !initialData && !isEdit;
  const [draft] = useState(() => (draftEnabled ? readDraft(DRAFT_KEYS.reference) : null));
  const seed = initialData ?? draft ?? undefined;
  const [referenceMaterial, setReferenceMaterial] = useState(seed?.reference_material || "");
  const [rows, setRows] = useState<RefRow[]>(() => {
    if (seed?.rows && Array.isArray(seed.rows)) {
      return seed.rows.map((r: any, i: number) => ({ id: i + 1, content: r.content || "" }));
    }
    return Array.from({ length: 10 }, (_, i) => ({ id: i + 1, content: "" }));
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const addRow = () => setRows((prev) => [...prev, { id: prev.length + 1, content: "" }]);
  const removeRow = (id: number) => { if (rows.length > 1) setRows((prev) => prev.filter((r) => r.id !== id)); };

  /** The record as it stands — shared by submit and the partial save. */
  const buildPayload = (): Record<string, any> => ({
    warehouse: getStoredWarehouse(),
    reference_material: referenceMaterial,
    rows: rows.filter((r) => r.content).map((r) => ({ content: r.content })),
  });

  useDraftAutosave(DRAFT_KEYS.reference, buildPayload(), draftEnabled);

  const handleSubmitRef = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload = buildPayload();
    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        const { docsApi } = await import("@/lib/api/documentations");
        await docsApi.create("training-reference-sheet", payload);
        setSuccess(true);
      }
      clearDraft(DRAFT_KEYS.reference);
    } catch (e: any) {
      alert(e.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 sm:space-y-5 pb-2">
      <DocHeader
        title="Reference Material & Record for Evaluation / Effectiveness of Training"
        docNo="CFPLA.C7.F.03i"
        meta="Issue 03 · Rev 02 · 01/11/2025"
      />

      {draft && (
        <DraftBanner
          savedAt={draftTime(draft._savedAt)}
          onDiscard={() => {
            clearDraft(DRAFT_KEYS.reference);
            window.location.reload();
          }}
        />
      )}

      <Section title="Reference Material">
        <textarea
          value={referenceMaterial}
          onChange={(e) => setReferenceMaterial(e.target.value)}
          rows={5}
          className="input-base resize-y"
          placeholder="Enter reference material details…"
        />
      </Section>

      <Section title="Evaluation & Effectiveness Based On" bodyClassName="p-0">
        {/* Desktop table */}
        <div className="hidden sm:block">
          <table className="w-full text-sm">
            <thead className="bg-cream-100/70">
              <tr>
                <Th className="w-16">Sr.</Th>
                <Th className="text-left">Evaluation &amp; effectiveness based on</Th>
                <Th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.id} className="transition-colors hover:bg-cream-100/60">
                  <Td className="text-center text-[11px] font-semibold text-ink-400">{idx + 1}</Td>
                  <Td>
                    <input
                      type="text"
                      value={row.content}
                      onChange={(e) => setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, content: e.target.value } : r)))}
                      className={cellInput}
                      placeholder="Enter evaluation criteria…"
                    />
                  </Td>
                  <Td className="text-center">
                    <RemoveRowButton onClick={() => removeRow(row.id)} label={`Remove row ${idx + 1}`} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile list — number chip + full-width input */}
        <div className="space-y-2.5 p-4 sm:hidden">
          {rows.map((row, idx) => (
            <div key={row.id} className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cream-200 text-[11px] font-bold text-ink-500">
                {idx + 1}
              </span>
              <input
                type="text"
                value={row.content}
                onChange={(e) => setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, content: e.target.value } : r)))}
                className="input-base"
                placeholder="Evaluation criteria…"
              />
              <RemoveRowButton onClick={() => removeRow(row.id)} label={`Remove row ${idx + 1}`} />
            </div>
          ))}
        </div>

        <div className="border-t border-cream-200 px-4 py-3 sm:px-5">
          <AddRowButton label="Add Row" onClick={addRow} />
        </div>
      </Section>

      <SubmitBar submitting={submitting} isEdit={isEdit} success={success} onSubmit={handleSubmitRef} />
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

/** 1–5 rating buttons, sized for a thumb on mobile. */
function RatingScale({ value, onSelect }: { value: number; onSelect: (star: number) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = value >= star;
        return (
          <button
            key={star}
            type="button"
            aria-label={`Rate ${star} of 5`}
            aria-pressed={active}
            onClick={() => onSelect(star)}
            className={`h-9 w-9 shrink-0 rounded-full border text-sm font-bold transition-all ${
              active
                ? "border-warning-500 bg-warning-400 text-white shadow-soft"
                : "border-cream-300 bg-cream-50 text-ink-300 hover:border-warning-300 hover:text-warning-600"
            }`}
          >
            {star}
          </button>
        );
      })}
    </div>
  );
}

export function TrainingFeedbackRecord({ initialData, onSubmit, isEdit }: TrainingFormProps = {}) {
  // Partial save applies to a blank create form only.
  const draftEnabled = !initialData && !isEdit;
  const [draft] = useState(() => (draftEnabled ? readDraft(DRAFT_KEYS.feedback) : null));
  const seed = initialData ?? draft ?? undefined;
  const [participantName, setParticipantName] = useState(seed?.participant_name || "");
  const [date, setDate] = useState(seed?.feedback_date || "");
  const [trainingProgram, setTrainingProgram] = useState(seed?.training_program || "");
  // "Others" is stored as "Others: <detail>" directly in mode_of_training (a
  // plain varchar column) so the specifics survive without a dedicated column.
  const initialMode: string = seed?.mode_of_training || "";
  const [modeOfTraining, setModeOfTraining] = useState<"Internal" | "External" | "Others" | "">(
    initialMode.startsWith("Others") ? "Others" : (initialMode as "Internal" | "External" | "")
  );
  const [otherModeDetail, setOtherModeDetail] = useState<string>(
    initialMode.startsWith("Others:") ? initialMode.slice("Others:".length).trim() : ""
  );
  const [ratings, setRatings] = useState<Record<number, { rating: number; comments: string }>>(() => {
    if (seed?.ratings && Array.isArray(seed.ratings)) {
      return Object.fromEntries(seed.ratings.map((r: any, i: number) => [i, { rating: r.rating || 0, comments: r.comments || "" }]));
    }
    return Object.fromEntries(FEEDBACK_PARAMS.map((_, i) => [i, { rating: 0, comments: "" }]));
  });
  const [improvements, setImprovements] = useState(seed?.improvement_suggestions || "");
  const [majorLearning, setMajorLearning] = useState(seed?.major_learnings || "");
  const [signature, setSignature] = useState(seed?.signature || "");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  /** The record as it stands — shared by submit and the partial save. */
  const buildPayload = (): Record<string, any> => ({
    warehouse: getStoredWarehouse(),
    participant_name: participantName,
    feedback_date: date,
    training_program: trainingProgram,
    mode_of_training: modeOfTraining === "Others" && otherModeDetail.trim() ? `Others: ${otherModeDetail.trim()}` : modeOfTraining,
    ratings: FEEDBACK_PARAMS.map((_, i) => ({ rating: ratings[i]?.rating || 0, comments: ratings[i]?.comments || "" })),
    improvement_suggestions: improvements,
    major_learnings: majorLearning,
    signature,
  });

  useDraftAutosave(DRAFT_KEYS.feedback, buildPayload(), draftEnabled);

  const handleSubmitFeedback = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload = buildPayload();
    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        const { docsApi } = await import("@/lib/api/documentations");
        await docsApi.create("training-feedback", payload);
        setSuccess(true);
      }
      clearDraft(DRAFT_KEYS.feedback);
    } catch (e: any) {
      alert(e.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  const rate = (idx: number, star: number) =>
    setRatings((prev) => ({ ...prev, [idx]: { ...prev[idx], rating: star } }));

  return (
    <div className="mx-auto max-w-4xl space-y-4 sm:space-y-5 pb-2">
      <DocHeader
        title="Trainee & Trainer Feedback Record"
        docNo="CFPLA.C7.F.03j"
        meta="Issue 03 · Rev 02 · 01/11/2025"
      />

      {draft && (
        <DraftBanner
          savedAt={draftTime(draft._savedAt)}
          onDiscard={() => {
            clearDraft(DRAFT_KEYS.feedback);
            window.location.reload();
          }}
        />
      )}

      <Section title="Participant Details">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Participant's Name">
            <input type="text" value={participantName} onChange={(e) => setParticipantName(e.target.value)} className="input-base" placeholder="Full name" />
          </Field>
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-base" />
          </Field>
          <Field label="Training Program">
            <input type="text" value={trainingProgram} onChange={(e) => setTrainingProgram(e.target.value)} className="input-base" placeholder="Program name" />
          </Field>
          <div className="min-w-0">
            <label className="label-base">Mode of Training</label>
            <div className="flex flex-wrap gap-2">
              {(["Internal", "External", "Others"] as const).map((mode) => (
                <OptionChip
                  key={mode}
                  type="radio"
                  label={mode}
                  checked={modeOfTraining === mode}
                  onToggle={() => setModeOfTraining(mode)}
                />
              ))}
            </div>
            {modeOfTraining === "Others" && (
              <input
                type="text"
                value={otherModeDetail}
                onChange={(e) => setOtherModeDetail(e.target.value)}
                placeholder="Specify mode of training…"
                className="input-base mt-2.5"
                autoFocus
              />
            )}
          </div>
        </div>
      </Section>

      <Section
        title="Rate the following parameters"
        hint="Excellent (5) · V Good (4) · Good (3) · Average (2) · Poor (1)"
        bodyClassName="p-0"
      >
        {/* Desktop table */}
        <div className="hidden lg:block">
          <table className="w-full text-sm">
            <thead className="bg-cream-100/70">
              <tr>
                <Th className="w-10">Sr.</Th>
                <Th className="text-left">Parameter</Th>
                <Th className="w-[230px]">Rating</Th>
                <Th className="min-w-[200px] text-left">Comments</Th>
              </tr>
            </thead>
            <tbody>
              {FEEDBACK_PARAMS.map((param, idx) => (
                <tr key={idx} className="transition-colors hover:bg-cream-100/60">
                  <Td className="text-center text-[11px] font-semibold text-ink-400">{idx + 1}</Td>
                  <Td className="py-2.5 text-[13px] text-ink-600">{param}</Td>
                  <Td>
                    <div className="flex justify-center">
                      <RatingScale value={ratings[idx]?.rating || 0} onSelect={(star) => rate(idx, star)} />
                    </div>
                  </Td>
                  <Td>
                    <input
                      type="text"
                      value={ratings[idx]?.comments || ""}
                      onChange={(e) => setRatings((prev) => ({ ...prev, [idx]: { ...prev[idx], comments: e.target.value } }))}
                      className={cellInput}
                      placeholder="Optional comment"
                    />
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="space-y-3 p-4 lg:hidden">
          {FEEDBACK_PARAMS.map((param, idx) => (
            <div key={idx} className="rounded-2xl border border-cream-300 bg-cream-50 p-3.5 shadow-soft">
              <div className="flex gap-2">
                <span className="flex h-6 min-w-[24px] items-center justify-center rounded-lg bg-brand-500 px-1.5 text-[11px] font-bold text-white">
                  {idx + 1}
                </span>
                <p className="text-[13px] font-semibold leading-snug text-ink-600">{param}</p>
              </div>
              <div className="mt-3 flex justify-center">
                <RatingScale value={ratings[idx]?.rating || 0} onSelect={(star) => rate(idx, star)} />
              </div>
              <input
                type="text"
                value={ratings[idx]?.comments || ""}
                onChange={(e) => setRatings((prev) => ({ ...prev, [idx]: { ...prev[idx], comments: e.target.value } }))}
                className="input-base mt-3"
                placeholder="Comments (optional)"
              />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Your Feedback">
        <div className="space-y-3">
          <Field label="In what specific ways could the training be improved?">
            <textarea value={improvements} onChange={(e) => setImprovements(e.target.value)} rows={3} className="input-base resize-y" placeholder="Suggestions…" />
          </Field>
          <Field label="Please list the major learnings from the training.">
            <textarea value={majorLearning} onChange={(e) => setMajorLearning(e.target.value)} rows={3} className="input-base resize-y" placeholder="Key takeaways…" />
          </Field>
          <Field label="Signature">
            <input type="text" value={signature} onChange={(e) => setSignature(e.target.value)} className="input-base sm:max-w-xs" placeholder="Participant signature" />
          </Field>
        </div>
      </Section>

      <SubmitBar submitting={submitting} isEdit={isEdit} success={success} onSubmit={handleSubmitFeedback} />
    </div>
  );
}

// Moved to its own file — re-exported so existing imports keep working.
export { EmployeeTrainingCard } from "./EmployeeTrainingCard";

export default TrainingAttendanceWorkers;
