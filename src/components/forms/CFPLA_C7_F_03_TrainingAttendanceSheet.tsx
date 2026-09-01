"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLine } from "lucide-react";
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

/**
 * Columns that are usually identical for every attendee of one session — one
 * training, one designation level, one evaluation method.
 *
 * These used to copy down on their own the moment a row above was typed, which
 * meant correcting row 1 silently rewrote rows already filled in below it. Each
 * of these columns now carries its own Fill All button instead: spreading a
 * value is something the user asks for, not something that happens to them.
 *
 * Name and Signature are deliberately absent — they are never shared.
 */
const SHARED_FIELDS = [
  "designation",
  "evaluationMethod",
  "evaluationScoring",
  "effectivenessMethod",
  "effectivenessScoring",
] as const;

type SharedField = (typeof SHARED_FIELDS)[number];

/** Clone before storing: the method columns are string[], and sharing one array
 *  across rows would make them a single value wearing several hats. */
const cloned = (value: any) => (Array.isArray(value) ? [...value] : value);

/** Nothing to spread: "" for the text and score columns, [] for the method
 *  columns, which hold string arrays. */
const isBlank = (value: any) => (Array.isArray(value) ? value.length === 0 : !String(value ?? "").trim());

/**
 * Results, average and status all follow from the two /5 scores, so they are
 * recomputed for every row a value lands in — including the rows it copied into.
 *
 * Scores are entered out of 5 and each result passes strictly above 3. The
 * average is carried as a percentage of 5 (so 4.5/5 → 90%), matching the paper
 * format's "Average Scoring (%)" column and its % criteria bands.
 */
const withDerived = (row: AttendeeRow): AttendeeRow => {
  const updated = { ...row };
  const evalScore = parseFloat(updated.evaluationScoring) || 0;
  const effScore = parseFloat(updated.effectivenessScoring) || 0;
  if (evalScore > 0 && effScore > 0) {
    const avgPct = parseFloat(toPercent((evalScore + effScore) / 2));
    updated.averageScoring = toPercent((evalScore + effScore) / 2);
    updated.trainingStatus =
      avgPct >= SCORE_EFFECTIVE_PCT ? "Effective" : avgPct >= SCORE_REFRESHER_PCT ? "Refresher" : "Retraining";
  }
  // Each result follows its own score. Previously the evaluation result stopped
  // updating as soon as an effectiveness score was entered, and the
  // effectiveness result was never set at all.
  if (evalScore > 0) updated.evaluationResult = evalScore > SCORE_PASS ? "Pass" : "Fail";
  if (effScore > 0) updated.effectivenessResult = effScore > SCORE_PASS ? "Effective" : "Non-Effective";
  return updated;
};

/** The stored pair of /5 scores as an average percentage, or null if incomplete. */
const avgPercentOf = (evaluation: any, effectiveness: any): string | null => {
  const a = parseFloat(String(evaluation ?? ""));
  const b = parseFloat(String(effectiveness ?? ""));
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return null;
  return toPercent((a + b) / 2);
};

/**
 * The rows after writing `value` into `field` of row `id`.
 *
 * Only that row changes. Spreading a value across the sheet is the Fill All
 * button's job now — see SHARED_FIELDS.
 *
 * Pure and exported so the row maths can be tested without rendering the form.
 */
export function applyRowEdit(
  rows: AttendeeRow[],
  id: number,
  field: keyof AttendeeRow,
  value: any
): AttendeeRow[] {
  return rows.map((r) => (r.id === id ? withDerived({ ...r, [field]: cloned(value) }) : r));
}

/**
 * Every row given the same value in `field` — what a Fill All button does.
 *
 * The value comes from row `fromId`. The column-header button passes none, and
 * the first row that actually holds a value is used instead, so the button
 * works whether the sheet was started on the first attendee or the third.
 *
 * Rows that already have a value are overwritten: filling the column is the
 * whole point of pressing it, and unlike the old automatic copy-down it only
 * happens when asked. Returns the rows untouched when there is nothing to
 * spread, so an accidental press on an empty column is a no-op.
 *
 * Pure and exported so the fill can be tested without rendering the form.
 */
export function fillColumn(rows: AttendeeRow[], field: SharedField, fromId?: number): AttendeeRow[] {
  const source = fromId != null ? rows.find((r) => r.id === fromId) : rows.find((r) => !isBlank(r[field]));
  if (!source || isBlank(source[field])) return rows;
  return rows.map((r) => withDerived({ ...r, [field]: cloned(source[field]) }));
}

/**
 * The rows with one more attendee on the end.
 *
 * The new row inherits the shared columns from the row above, so appending an
 * attendee after those columns were filled does not leave a hole part-way down
 * one. This is not the copy-down that Fill All replaced: a brand-new blank row
 * has nothing of its own to lose, so seeding it overwrites nobody's typing.
 *
 * Ids come from the highest in use, not the row count: `length + 1` repeats an
 * id as soon as a middle row has been removed, and two rows answering to one id
 * means editing either edits both.
 */
export function appendRow(rows: AttendeeRow[]): AttendeeRow[] {
  const seeded = emptyRow(rows.reduce((max, r) => Math.max(max, r.id), 0) + 1);
  const last = rows[rows.length - 1];
  if (last) for (const field of SHARED_FIELDS) (seeded as any)[field] = cloned(last[field]);
  return [...rows, withDerived(seeded)];
}

/**
 * The rows with their name/designation pairs dealt out to new positions.
 *
 * Recreating a sheet runs the same training with the same people again, and the
 * new sheet should not read as a photocopy of the last one, so every attendee
 * lands on a different Sr. No.
 *
 * Only the pair travels. Signature, methods, scores, results, average and
 * status belong to the LINE, not to the person, and stay exactly where they
 * are — moving a name must never drag someone else's marks along with it.
 * Name and designation move together because they are what identify an
 * attendee: the Employee Training Card resolves a person by both, so splitting
 * them would point it at somebody who was never there.
 *
 * Rows with no name sit the shuffle out. They are the trailing blanks of a
 * part-filled sheet, and dealing an empty pair into the middle would leave a
 * hole in the numbering.
 *
 * Sattolo's algorithm, not a plain Fisher–Yates: drawing `j` STRICTLY below `i`
 * yields a single cycle, so every pair is guaranteed to change position. A
 * plain shuffle is free to leave someone exactly where they were — with two
 * attendees it does so half the time, which is the one outcome this exists to
 * avoid. Fewer than two named rows cannot move at all, so they come back
 * untouched.
 */
export function shuffleAttendeePairs(rows: AttendeeRow[]): AttendeeRow[] {
  const filled: number[] = [];
  rows.forEach((r, i) => { if (r.name.trim()) filled.push(i); });
  if (filled.length < 2) return rows;

  const pairs = filled.map((i) => ({ name: rows[i].name, designation: rows[i].designation }));
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * i);
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }

  const next = [...rows];
  filled.forEach((rowIdx, k) => {
    next[rowIdx] = { ...next[rowIdx], name: pairs[k].name, designation: pairs[k].designation };
  });
  return next;
}

/**
 * Copies one shared column into every attendee. Sits under the column heading
 * on the desktop grid and beside the field label on each mobile card.
 */
function FillAllButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`Fill every attendee's ${label} with this value`}
      aria-label={`Fill every attendee's ${label} with this value`}
      className="inline-flex items-center gap-0.5 whitespace-nowrap rounded-md border border-cream-300 bg-cream-50 px-1.5 py-0.5 !min-h-0 text-[9px] font-bold uppercase tracking-wide text-ink-400 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600"
    >
      <ArrowDownToLine className="h-2.5 w-2.5" />
      Fill all
    </button>
  );
}

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
  // Duplicating, not editing: the create page hands a record in without isEdit.
  // Only then are the attendees re-dealt — editing a filed record must show it
  // exactly as it was filed.
  const isDuplicate = Boolean(initialData) && !isEdit;
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
  // The chip above only opens a window — the effectiveness check is dated by
  // hand inside it. There is no column for this date on the parent table (it is
  // written onto every attendee), so an existing record seeds it back off the
  // first attendee carrying one.
  const [effectivenessScoringDate, setEffectivenessScoringDate] = useState<string>(() => {
    const attendees = Array.isArray(seed?.attendees) ? seed!.attendees : [];
    return attendees.find((a: any) => a?.effectiveness_date)?.effectiveness_date || "";
  });
  const [trainerSign, setTrainerSign] = useState(seed?.trainer_signature || "");
  const [fstlSign, setFstlSign] = useState(seed?.fstl_signature || "");
  const [effectivenessEvaluatedBy, setEffectivenessEvaluatedBy] = useState(seed?.effectiveness_evaluated_by || "");
  const [effectivenessDate, setEffectivenessDate] = useState(seed?.dated || "");
  const [correctiveActions, setCorrectiveActions] = useState<string[]>(seed?.corrective_actions || []);
  const [rows, setRows] = useState<AttendeeRow[]>(() => {
    if (seed?.attendees && Array.isArray(seed.attendees)) {
      const seeded = seed.attendees.map((r: any, i: number) => ({
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
      return isDuplicate ? shuffleAttendeePairs(seeded) : seeded;
    }
    return Array.from({ length: 10 }, (_, i) => emptyRow(i + 1));
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  // Row ids whose designation is missing, plus the message shown above the submit bar.
  const [rowErrors, setRowErrors] = useState<number[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const addRow = () => setRows(appendRow);
  const removeRow = (id: number) => { if (rows.length > 1) setRows((prev) => prev.filter((r) => r.id !== id)); };

  const updateRow = (id: number, field: keyof AttendeeRow, value: any) => {
    // The edit reaches this row and no other, so only this row can stop being
    // flagged for a missing designation.
    if (field === "designation" && String(value).trim()) {
      setRowErrors((errs) => errs.filter((errId) => errId !== id));
    }
    setRows((prev) => applyRowEdit(prev, id, field, value));
  };

  /**
   * Copy one shared column into every attendee, from the column header or from
   * a mobile card. `fromId` is the card's row; the header passes none and takes
   * the first row holding a value.
   */
  const fillAll = (field: SharedField, fromId?: number) => {
    const next = fillColumn(rows, field, fromId);
    if (next === rows) return;
    setRows(next);
    // Every row now carries the designation that was spread, so none are missing one.
    if (field === "designation") setRowErrors([]);
  };

  const toggleArrayItem = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];

  /**
   * The record as this form currently stands. Used both for submit and for the
   * partial save, so a restored draft always reads back exactly as it was left.
   */
  // The two "Dated:" columns on the paper format are not typed per attendee:
  // evaluation happens on the training day, and the effectiveness check on the
  // date picked below. That date used to be training day + 15/30 flat, which
  // filed every check on the last day the window allowed even when it had
  // really been done earlier; the chip now caps the window and the date is
  // chosen inside it. yyyy-mm-dd sorts chronologically, so plain string
  // comparison is enough to range-check it.
  const effectivenessMinDate = trainingDate ? addDays(trainingDate, 1) : "";
  const effectivenessMaxDate = addDays(trainingDate, effectivenessDays);
  const effectivenessOutOfWindow = Boolean(
    effectivenessScoringDate && effectivenessMinDate && effectivenessMaxDate &&
    (effectivenessScoringDate < effectivenessMinDate || effectivenessScoringDate > effectivenessMaxDate)
  );
  const effectivenessDateError = effectivenessOutOfWindow
    ? `Effectiveness date must fall between ${fmtDate(effectivenessMinDate)} and ${fmtDate(effectivenessMaxDate)} — within ${effectivenessDays} days of the training.`
    : null;

  /**
   * `forDraft` keeps rows the submit payload drops. Filing a record ignores an
   * attendee with no name, but a draft that did the same was blind to every
   * other column in that row: the payload never changed as they were typed, so
   * nothing autosaved and "Save draft" stayed dead until a name was entered.
   */
  const buildPayload = (forDraft = false): Record<string, any> => ({
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
    attendees: rows.filter((r) => forDraft || r.name).map((r) => ({
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
    buildPayload(true),
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
    // The effectiveness date is typed now, so it can be left blank or dragged
    // outside the window after the fact (changing the training date moves the
    // window under it). Both are caught here — the input's own min/max only
    // guides the picker, it does not stop a keyed-in value.
    if (effectivenessDays && !effectivenessScoringDate) {
      setFormError(`Pick the effectiveness date — it must fall within ${effectivenessDays} days of the training.`);
      return;
    }
    if (effectivenessDateError) {
      setFormError(effectivenessDateError);
      return;
    }
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
                  onToggle={() => {
                    const next = d as "15" | "30";
                    setEffectivenessDays(next);
                    // Narrowing 30 → 15 can strand an already-picked date past
                    // the new cap. Drop it rather than carry a date the window
                    // no longer allows.
                    const cap = addDays(trainingDate, next);
                    if (cap && effectivenessScoringDate > cap) setEffectivenessScoringDate("");
                  }}
                />
              ))}
            </div>
            {effectivenessDays && (
              <div className="mt-3">
                <label className="label-base">Effectiveness Date</label>
                <input
                  type="date"
                  value={effectivenessScoringDate}
                  onChange={(e) => setEffectivenessScoringDate(e.target.value)}
                  min={effectivenessMinDate || undefined}
                  max={effectivenessMaxDate || undefined}
                  disabled={!trainingDate}
                  className={`input-base ${effectivenessDateError ? "border-danger-300" : ""}`}
                />
              </div>
            )}
            {/* Both "Dated:" columns come from up here, so show what will be filed. */}
            <p className={`mt-2 text-[11px] ${effectivenessDateError ? "font-semibold text-danger-700" : "text-ink-400"}`}>
              {!trainingDate && "Set the training date above — it dates the evaluation scoring for every attendee."}
              {trainingDate && !effectivenessDays && (
                <>Evaluation dated <b>{fmtDate(trainingDate)}</b>. Pick 15 or 30 days to open the effectiveness window.</>
              )}
              {trainingDate && effectivenessDays && (effectivenessDateError
                ? effectivenessDateError
                : effectivenessScoringDate
                  ? <>Evaluation dated <b>{fmtDate(trainingDate)}</b>, effectiveness dated <b>{fmtDate(effectivenessScoringDate)}</b>.</>
                  : <>Evaluation dated <b>{fmtDate(trainingDate)}</b>. Pick the effectiveness date — anywhere from <b>{fmtDate(effectivenessMinDate)}</b> to <b>{fmtDate(effectivenessMaxDate)}</b>.</>)}
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
        hint={`${filledAttendees} of ${rows.length} rows filled · scores auto-calculate the average and status · “Fill all” copies a shared column to every attendee`}
        bodyClassName="p-0"
      >
        {/* Desktop: full record grid */}
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1180px] text-xs">
            <thead className="bg-cream-100/70">
              <tr>
                <Th className="w-10" rowSpan={2}>Sr.</Th>
                <Th className="min-w-[150px] text-left" rowSpan={2}>Name</Th>
                <Th className="min-w-[120px] text-left" rowSpan={2}>
                  <span className="flex flex-col items-start gap-1">
                    Designation *
                    <FillAllButton label="designation" onClick={() => fillAll("designation")} />
                  </span>
                </Th>
                <Th className="min-w-[110px] text-left" rowSpan={2}>Signature</Th>
                <Th className="border-l border-cream-300 text-center" colSpan={3}>Evaluation</Th>
                <Th className="border-l border-cream-300 text-center" colSpan={3}>Effectiveness</Th>
                <Th className="min-w-[80px] border-l border-cream-300" rowSpan={2}>Avg %</Th>
                <Th className="min-w-[100px]" rowSpan={2}>Status</Th>
                <Th className="w-10" rowSpan={2} />
              </tr>
              <tr>
                <Th className="border-l border-cream-300 text-[10px] min-w-[110px]">
                  <span className="flex flex-col items-center gap-1">
                    Method
                    <FillAllButton label="evaluation method" onClick={() => fillAll("evaluationMethod")} />
                  </span>
                </Th>
                <Th className="text-[10px] min-w-[86px]">
                  <span className="flex flex-col items-center gap-1">
                    Score /5
                    <FillAllButton label="evaluation score" onClick={() => fillAll("evaluationScoring")} />
                  </span>
                </Th>
                <Th className="text-[10px] min-w-[90px]">Result</Th>
                <Th className="border-l border-cream-300 text-[10px] min-w-[110px]">
                  <span className="flex flex-col items-center gap-1">
                    Method
                    <FillAllButton label="effectiveness method" onClick={() => fillAll("effectivenessMethod")} />
                  </span>
                </Th>
                <Th className="text-[10px] min-w-[86px]">
                  <span className="flex flex-col items-center gap-1">
                    Score /5
                    <FillAllButton label="effectiveness score" onClick={() => fillAll("effectivenessScoring")} />
                  </span>
                </Th>
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
                <CardField
                  label="Designation"
                  action={<FillAllButton label="designation" onClick={() => fillAll("designation", row.id)} />}
                >
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
                  <CardField
                    label="Method"
                    action={<FillAllButton label="evaluation method" onClick={() => fillAll("evaluationMethod", row.id)} />}
                  >
                    <select value={row.evaluationMethod[0] || ""} onChange={(e) => updateRow(row.id, "evaluationMethod", e.target.value ? [e.target.value] : [])} className="input-base">
                      <option value="">Select</option>
                      {EVAL_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </CardField>
                  <CardField
                    label="Score (out of 5)"
                    action={<FillAllButton label="evaluation score" onClick={() => fillAll("evaluationScoring", row.id)} />}
                  >
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
                  <CardField
                    label="Method"
                    action={<FillAllButton label="effectiveness method" onClick={() => fillAll("effectivenessMethod", row.id)} />}
                  >
                    <select value={row.effectivenessMethod[0] || ""} onChange={(e) => updateRow(row.id, "effectivenessMethod", e.target.value ? [e.target.value] : [])} className="input-base">
                      <option value="">Select</option>
                      {EVAL_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </CardField>
                  <CardField
                    label="Score (out of 5)"
                    action={<FillAllButton label="effectiveness score" onClick={() => fillAll("effectivenessScoring", row.id)} />}
                  >
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
