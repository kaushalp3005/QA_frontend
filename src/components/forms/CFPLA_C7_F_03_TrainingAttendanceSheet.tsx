"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
  SCORE_EFFECTIVE_PCT,
  SCORE_MAX,
  SCORE_PASS,
  SCORE_REFRESHER_PCT,
  Section,
  SubmitBar,
  Td,
  Th,
  cellInput,
  percentTone,
  toPercent,
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
  evaluationResult: "Pass" | "Fail" | "";
  effectivenessMethod: string[];
  effectivenessScoring: string;
  effectivenessResult: "Effective" | "Non-Effective" | "";
  averageScoring: string;
  trainingStatus: "Effective" | "Refresher" | "Retraining" | "";
}

const emptyRow = (id: number): AttendeeRow => ({
  id, name: "", designation: "", signature: "",
  evaluationMethod: [], evaluationScoring: "", evaluationResult: "",
  effectivenessMethod: [], effectivenessScoring: "", effectivenessResult: "",
  averageScoring: "", trainingStatus: "",
});

/**
 * `date` (yyyy-mm-dd) moved on by `days`, in the same format. Built from local
 * date parts rather than toISOString(), which would shift the day back for
 * timezones ahead of UTC. "" when either input is missing.
 */
const addDays = (date: string, days: number | string | null | ""): string => {
  if (!date || !days) return "";
  const shifted = new Date(`${date}T00:00:00`);
  if (Number.isNaN(shifted.getTime())) return "";
  shifted.setDate(shifted.getDate() + Number(days));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}-${pad(shifted.getDate())}`;
};

/** yyyy-mm-dd → dd/mm/yyyy, for the read-only date hints. */
const fmtDate = (d: string) => (d ? d.split("-").reverse().join("/") : "");

/** The stored pair of /5 scores as an average percentage, or null if incomplete. */
const avgPercentOf = (evaluation: any, effectiveness: any): string | null => {
  const a = parseFloat(String(evaluation ?? ""));
  const b = parseFloat(String(effectiveness ?? ""));
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return null;
  return toPercent((a + b) / 2);
};

interface TrainingAttendanceSheetProps {
  initialData?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => Promise<void>;
  isEdit?: boolean;
}

export default function TrainingAttendanceSheet({ initialData, onSubmit, isEdit }: TrainingAttendanceSheetProps = {}) {
  const router = useRouter();
  // Partial save applies to a blank create form only — never shadow a record
  // being edited or duplicated with a stale draft of something else.
  const draftEnabled = !initialData && !isEdit;
  const [draft] = useState(() => (draftEnabled ? readDraft(DRAFT_KEYS.attendance) : null));
  /** Where fields hydrate from: the real record if there is one, else the draft. */
  const seed = initialData ?? draft ?? undefined;

  const [trainingDate, setTrainingDate] = useState(seed?.training_date || "");
  // DB column is `training_type` (singular) — an array of strings. An "Other"
  // entry is stored as "Other: <detail>" so the specifics survive without a
  // dedicated column; unpack that back into the checkbox + detail text below.
  const [trainingTypes, setTrainingTypes] = useState<string[]>(() => {
    const raw: string[] = Array.isArray(seed?.training_type) ? seed!.training_type : [];
    return raw.map((t) => (t.startsWith("Other") ? "Other" : t));
  });
  const [otherTrainingTypeDetail, setOtherTrainingTypeDetail] = useState<string>(() => {
    const raw: string[] = Array.isArray(seed?.training_type) ? seed!.training_type : [];
    const otherEntry = raw.find((t) => t.startsWith("Other:"));
    return otherEntry ? otherEntry.slice("Other:".length).trim() : "";
  });
  const [startTime, setStartTime] = useState(seed?.time_start || "");
  const [endTime, setEndTime] = useState(seed?.time_end || "");
  const [conductedBy, setConductedBy] = useState(seed?.conducted_by || "");
  const [trainerQualification, setTrainerQualification] = useState(seed?.trainer_qualification || "");
  const [venue, setVenue] = useState(seed?.venue || "");
  const [keyPoints, setKeyPoints] = useState(seed?.key_points_covered || "");
  const [department, setDepartment] = useState(seed?.department || "");
  const [language, setLanguage] = useState<string[]>(seed?.training_language || []);
  const [effectivenessDays, setEffectivenessDays] = useState<"15" | "30" | "">(
    seed?.effectiveness_after_days != null ? (String(seed.effectiveness_after_days) as "15" | "30") : ""
  );
  const [trainerSign, setTrainerSign] = useState(seed?.trainer_signature || "");
  const [fstlSign, setFstlSign] = useState(seed?.fstl_signature || "");
  const [effectivenessEvaluatedBy, setEffectivenessEvaluatedBy] = useState(seed?.effectiveness_evaluated_by || "");
  const [effectivenessDate, setEffectivenessDate] = useState(seed?.dated || "");
  const [correctiveActions, setCorrectiveActions] = useState<string[]>(seed?.corrective_actions || []);
  const [rows, setRows] = useState<AttendeeRow[]>(() => {
    if (seed?.attendees && Array.isArray(seed.attendees)) {
      return seed.attendees.map((r: any, i: number) => ({
        id: i + 1,
        name: r.name || "",
        designation: r.designation || "",
        signature: r.signature || "",
        evaluationMethod: r.evaluation_method || [],
        evaluationScoring: r.evaluation_scoring?.toString() || "",
        evaluationResult: r.evaluation_result || "",
        effectivenessMethod: r.effectiveness_method || [],
        effectivenessScoring: r.effectiveness_scoring?.toString() || "",
        effectivenessResult: r.effectiveness_result || "",
        // Recompute from the two scores rather than trusting what was stored:
        // rows saved before the average moved to a percentage hold a /5 value,
        // which would otherwise read back as e.g. "4.5%".
        averageScoring: avgPercentOf(r.evaluation_scoring, r.effectiveness_scoring)
          ?? (r.average_scoring?.toString() || ""),
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
      // Scores are entered out of 5; each result passes strictly above 3. The
      // average is carried as a percentage of 5 (so 4.5/5 → 90%), matching the
      // paper format's "Average Scoring (%)" column and its % criteria bands.
      const evalScore = parseFloat(updated.evaluationScoring) || 0;
      const effScore = parseFloat(updated.effectivenessScoring) || 0;
      if (evalScore > 0 && effScore > 0) {
        const avgPct = parseFloat(toPercent((evalScore + effScore) / 2));
        updated.averageScoring = toPercent((evalScore + effScore) / 2);
        updated.trainingStatus =
          avgPct >= SCORE_EFFECTIVE_PCT ? "Effective" : avgPct >= SCORE_REFRESHER_PCT ? "Refresher" : "Retraining";
      }
      // Each result follows its own score. Previously the evaluation result
      // stopped updating as soon as an effectiveness score was entered, and the
      // effectiveness result was never set at all.
      if (evalScore > 0) updated.evaluationResult = evalScore > SCORE_PASS ? "Pass" : "Fail";
      if (effScore > 0) updated.effectivenessResult = effScore > SCORE_PASS ? "Effective" : "Non-Effective";
      return updated;
    }));
  };

  const toggleArrayItem = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];

  /**
   * The record as this form currently stands. Used both for submit and for the
   * partial save, so a restored draft always reads back exactly as it was left.
   */
  // The two "Dated:" columns on the paper format are not typed per attendee:
  // evaluation happens on the training day, and the effectiveness check falls
  // 15 or 30 days later — whichever was ticked above.
  const effectivenessScoringDate = addDays(trainingDate, effectivenessDays);

  const buildPayload = (): Record<string, any> => ({
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
      evaluation_date: trainingDate,
      evaluation_result: r.evaluationResult,
      effectiveness_method: r.effectivenessMethod,
      effectiveness_scoring: r.effectivenessScoring ? Number(r.effectivenessScoring) : null,
      effectiveness_date: effectivenessScoringDate,
      effectiveness_result: r.effectivenessResult,
      average_scoring: r.averageScoring ? Number(r.averageScoring) : null,
      training_status: r.trainingStatus,
    })),
  });

  // Partial save: mirror the in-progress form to localStorage as it is typed.
  const draftState = useDraftAutosave(
    DRAFT_KEYS.attendance,
    buildPayload(),
    draftEnabled,
    draft?._savedAt ?? null
  );

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
    const payload = buildPayload();
    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        const { docsApi } = await import("@/lib/api/documentations");
        await docsApi.create("training-attendance", payload);
        setSuccess(true);
        // Filed — send the user back to the list of attendance sheets.
        router.push("/training/attendance-sheet");
      }
      // Filed — the partial save has done its job.
      draftState.forget();
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

      {draft && (
        <DraftBanner
          savedAt={draftTime(draft._savedAt)}
          onDiscard={() => {
            clearDraft(DRAFT_KEYS.attendance);
            window.location.reload();
          }}
        />
      )}

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
            {/* Both "Dated:" columns are derived, so show what will be filed. */}
            <p className="mt-2 text-[11px] text-ink-400">
              {trainingDate
                ? <>Evaluation dated <b>{fmtDate(trainingDate)}</b>{effectivenessScoringDate
                    ? <>, effectiveness dated <b>{fmtDate(effectivenessScoringDate)}</b>.</>
                    : <>. Pick 15 or 30 days to date the effectiveness scoring.</>}</>
                : "Set the training date above — it dates the evaluation scoring for every attendee."}
            </p>
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
                <Th className="text-[10px] min-w-[70px]">Score /5</Th>
                <Th className="text-[10px] min-w-[90px]">Result</Th>
                <Th className="border-l border-cream-300 text-[10px] min-w-[110px]">Method</Th>
                <Th className="text-[10px] min-w-[70px]">Score /5</Th>
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
                    <input type="number" value={row.evaluationScoring} onChange={(e) => updateRow(row.id, "evaluationScoring", e.target.value)} className={cellInput} placeholder={`0–${SCORE_MAX}`} min="0" max={SCORE_MAX} step="0.5" />
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
                    <input type="number" value={row.effectivenessScoring} onChange={(e) => updateRow(row.id, "effectivenessScoring", e.target.value)} className={cellInput} placeholder={`0–${SCORE_MAX}`} min="0" max={SCORE_MAX} step="0.5" />
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
                      <Pill tone={percentTone(row.averageScoring)}>{row.averageScoring}%</Pill>
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
                  <CardField label="Score (out of 5)">
                    <input type="number" inputMode="decimal" value={row.evaluationScoring} onChange={(e) => updateRow(row.id, "evaluationScoring", e.target.value)} className="input-base" placeholder={`0–${SCORE_MAX}`} min="0" max={SCORE_MAX} step="0.5" />
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
                  <CardField label="Score (out of 5)">
                    <input type="number" inputMode="decimal" value={row.effectivenessScoring} onChange={(e) => updateRow(row.id, "effectivenessScoring", e.target.value)} className="input-base" placeholder={`0–${SCORE_MAX}`} min="0" max={SCORE_MAX} step="0.5" />
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
                  <Pill tone={percentTone(row.averageScoring)}>{row.averageScoring}%</Pill>
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

      <SubmitBar
        submitting={submitting}
        isEdit={isEdit}
        success={success}
        onSubmit={handleSubmit}
        draft={draftEnabled ? draftState : undefined}
      />
    </div>
  );
}
