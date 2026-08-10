"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";
import { trainingApi, type AttendanceLookupResult } from "@/lib/api/training";
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
  DocHeader,
  DraftBanner,
  Field,
  Pill,
  RemoveRowButton,
  RowCard,
  Section,
  SubmitBar,
  Td,
  Th,
  cellInput,
  statusTone,
} from "@/components/training/FormShell";

interface TrainingFormProps {
  initialData?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => Promise<void>;
  isEdit?: boolean;
}

// ===================== F.03k - EMPLOYEE TRAINING CARD =====================
interface TrainingCardRow {
  id: number; date: string; totalHours: string; topicsCovered: string; trainer: string; acknowledgement: string;
  /** doc_training_attendance.id this row was pulled from (null when typed by hand). */
  sourceAttendanceId: number | null;
}
const emptyCardRow = (id: number): TrainingCardRow => ({ id, date: "", totalHours: "", topicsCovered: "", trainer: "", acknowledgement: "", sourceAttendanceId: null });

export function EmployeeTrainingCard({ initialData, onSubmit, isEdit }: TrainingFormProps = {}) {
  // Partial save applies to a blank create form only.
  const draftEnabled = !initialData && !isEdit;
  const [draft] = useState(() => (draftEnabled ? readDraft(DRAFT_KEYS.card) : null));
  const seed = initialData ?? draft ?? undefined;
  const [employeeName, setEmployeeName] = useState(seed?.employee_name || "");
  const [designation, setDesignation] = useState(seed?.designation || "");
  const [trainingNeeds, setTrainingNeeds] = useState(seed?.training_needs_identified || "");
  const [rows, setRows] = useState<TrainingCardRow[]>(() => {
    if (seed?.rows && Array.isArray(seed.rows)) {
      // Rows seeded before this form existed use different key names for three
      // fields (`topics`, `acknowledgment`, `total_training_hours`). Read both
      // spellings: parsing an old row as blank and then saving would wipe a real
      // training record.
      return seed.rows.map((r: any, i: number) => ({
        id: i + 1,
        date: r.date || "",
        totalHours: (r.total_hours ?? r.total_training_hours)?.toString() || "",
        topicsCovered: r.topics_covered || r.topics || "",
        trainer: r.trainer || "",
        acknowledgement: r.acknowledgement || r.acknowledgment || "",
        sourceAttendanceId: r.source_attendance_id ?? null,
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

  // ── Pull sessions from Training Attendance Sheets ──────────────────────
  const [lookup, setLookup] = useState<AttendanceLookupResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);

  // Banner for the row auto-imported from ?add_attendance=<sheet id>.
  const [importNotice, setImportNotice] = useState<
    { tone: "info" | "success" | "error"; text: string } | null
  >(null);
  // Set when submit is blocked by a missing required field.
  const [formError, setFormError] = useState<string | null>(null);

  /**
   * `?add_attendance=<sheet id>` — the attendance sheet's "Training Card"
   * button deep-links with it. Fetch that one session and splice it in as a
   * staged row; the user still has to submit for it to be saved.
   *
   * Read from window.location rather than useSearchParams: the edit route
   * (DocEditWrapper) has no Suspense boundary, and useSearchParams without one
   * makes Next.js bail out of prerendering the whole route.
   */
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("add_attendance");
    const sheetId = Number(raw);
    if (!raw || !Number.isFinite(sheetId) || sheetId <= 0) return;

    const name: string = (seed?.employee_name || "").trim();
    if (!name) {
      setImportNotice({
        tone: "error",
        text: "Couldn't add the session — this card has no employee name yet. Use Find sessions below.",
      });
      return;
    }

    // What the card already holds at mount is the whole truth here: this runs
    // once, before the user can have imported anything by hand.
    const already = (Array.isArray(seed?.rows) ? seed.rows : []).some(
      (r: any) => r?.source_attendance_id === sheetId
    );
    if (already) {
      setImportNotice({
        tone: "info",
        text: `This session (F.03 #${sheetId}) is already on the card — nothing was added.`,
      });
      return;
    }

    let cancelled = false;
    setImportNotice({ tone: "info", text: `Loading session from attendance sheet F.03 #${sheetId}…` });

    trainingApi
      .attendanceRow(sheetId, name)
      .then((res) => {
        if (cancelled) return;
        const s = res.row;
        setRows((prev) => {
          // Guard again in the updater: React may invoke this effect twice in
          // development StrictMode.
          if (prev.some((r) => r.sourceAttendanceId === sheetId)) return prev;
          const incoming = {
            date: s.date || "",
            totalHours: s.total_hours != null ? String(s.total_hours) : "",
            topicsCovered: s.topics_covered || "",
            trainer: s.trainer || "",
            acknowledgement: s.acknowledgement || "",
            sourceAttendanceId: sheetId,
          };
          // Fill a blank line first so the card doesn't grow past its printed length.
          const next = [...prev];
          const blank = next.findIndex(
            (r) => !r.date && !r.topicsCovered && !r.trainer && !r.acknowledgement && !r.totalHours
          );
          if (blank >= 0) next[blank] = { ...next[blank], ...incoming };
          else next.push({ id: next.reduce((max, r) => Math.max(max, r.id), 0) + 1, ...incoming });
          return next;
        });
        setImportNotice({
          tone: "success",
          text: `Row added from attendance sheet F.03 #${sheetId} — review and submit to save.`,
        });
      })
      .catch((e: any) => {
        if (cancelled) return;
        setImportNotice({
          tone: "error",
          text: `Couldn't load session F.03 #${sheetId} (${e.message}) — use Find sessions below to add it by hand.`,
        });
      });

    return () => {
      cancelled = true;
    };
    // Mount-only: the query string cannot change without a remount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Attendance ids already sitting in the card — never import one twice. */
  const importedIds = rows
    .map((r) => r.sourceAttendanceId)
    .filter((v): v is number => typeof v === "number");

  const runLookup = async () => {
    const name = employeeName.trim();
    if (!name) return;
    setLooking(true);
    setLookupError(null);
    setLookup(null);
    setPicked([]);
    try {
      const res = await trainingApi.lookupAttendance(name);
      setLookup(res);
      // Pre-tick everything not already in the card.
      setPicked(res.sessions.map((s) => s.attendance_id).filter((id) => !importedIds.includes(id)));
    } catch (e: any) {
      setLookupError(e.message || "Lookup failed");
    } finally {
      setLooking(false);
    }
  };

  const importPicked = () => {
    if (!lookup) return;
    const chosen = lookup.sessions.filter(
      (s) => picked.includes(s.attendance_id) && !importedIds.includes(s.attendance_id)
    );
    if (!chosen.length) return;
    setRows((prev) => {
      // Fill blank rows first so the card doesn't grow past its 12 printed lines.
      const next = [...prev];
      let nextId = next.reduce((max, r) => Math.max(max, r.id), 0);
      chosen.forEach((s) => {
        const row: Omit<TrainingCardRow, "id"> = {
          date: s.date || "",
          totalHours: s.total_hours != null ? String(s.total_hours) : "",
          topicsCovered: s.topics_covered || "",
          trainer: s.trainer || "",
          acknowledgement: s.acknowledgement || "",
          sourceAttendanceId: s.attendance_id,
        };
        const blank = next.findIndex(
          (r) => !r.date && !r.topicsCovered && !r.trainer && !r.acknowledgement && !r.totalHours
        );
        if (blank >= 0) next[blank] = { ...next[blank], ...row };
        else next.push({ id: ++nextId, ...row });
      });
      return next;
    });
    // Keep the panel open but mark what just landed as already-imported.
    setPicked([]);
  };

  /** The record as it stands — shared by submit and the partial save. */
  const buildPayload = (): Record<string, any> => ({
    warehouse: getStoredWarehouse(),
    employee_name: employeeName,
    designation,
    training_needs_identified: trainingNeeds,
    rows: rows.filter((r) => r.date || r.topicsCovered).map((r) => ({
      date: r.date,
      total_hours: r.totalHours ? Number(r.totalHours) : null,
      topics_covered: r.topicsCovered,
      trainer: r.trainer,
      acknowledgement: r.acknowledgement,
      // Backend mirrors these into doc_training_card_sources (real FKs).
      source_attendance_id: r.sourceAttendanceId,
    })),
  });

  const draftState = useDraftAutosave(
    DRAFT_KEYS.card,
    buildPayload(),
    draftEnabled,
    draft?._savedAt ?? null
  );

  const handleSubmitCard = async () => {
    // Designation is what tells two same-named employees apart when the
    // attendance sheet resolves an attendee to this card, so it is required.
    const missingName = !employeeName.trim();
    const missingDesignation = !designation.trim();
    if (missingName || missingDesignation) {
      setFormError(
        missingName && missingDesignation
          ? "Employee name and designation are both required."
          : missingName
          ? "Employee name is required."
          : "Designation is required — it identifies this card when an attendance sheet looks it up."
      );
      return;
    }
    setFormError(null);
    setSubmitting(true);
    setSuccess(false);
    const payload = buildPayload();
    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        const { docsApi } = await import("@/lib/api/documentations");
        await docsApi.create("training-card", payload);
        setSuccess(true);
      }
      draftState.forget();
    } catch (e: any) {
      alert(e.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  const filled = rows.filter((r) => r.date || r.topicsCovered).length;

  return (
    <div className="mx-auto max-w-6xl space-y-4 sm:space-y-5 pb-2">
      <DocHeader
        title="Employee Training Card"
        docNo="CFPLA.C7.F.03k"
        meta="Issue 03 · Rev 02 · 01/11/2025"
      />

      {draft && (
        <DraftBanner
          savedAt={draftTime(draft._savedAt)}
          onDiscard={() => {
            clearDraft(DRAFT_KEYS.card);
            window.location.reload();
          }}
        />
      )}

      {importNotice && (
        <p
          className={`rounded-xl border px-3 py-2.5 text-xs font-semibold ${
            importNotice.tone === "error"
              ? "border-danger-200 bg-danger-50 text-danger-700"
              : importNotice.tone === "success"
              ? "border-success-200 bg-success-50 text-success-700"
              : "border-brand-200 bg-brand-50 text-ink-600"
          }`}
        >
          {importNotice.text}
        </p>
      )}

      <Section title="Employee Details">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Field label="Employee Name *">
            <input
              type="text"
              value={employeeName}
              onChange={(e) => { setEmployeeName(e.target.value); setFormError(null); }}
              className={`input-base ${formError && !employeeName.trim() ? "ring-2 ring-danger-400" : ""}`}
              placeholder="Full name"
            />
          </Field>
          <Field label="Designation *">
            <input
              type="text"
              value={designation}
              onChange={(e) => { setDesignation(e.target.value); setFormError(null); }}
              className={`input-base ${formError && !designation.trim() ? "ring-2 ring-danger-400" : ""}`}
              placeholder="Designation"
            />
          </Field>
          <Field label="Training Needs Identified">
            <input type="text" value={trainingNeeds} onChange={(e) => setTrainingNeeds(e.target.value)} className="input-base" placeholder="Identified needs" />
          </Field>
        </div>
      </Section>

      {/* Pull this employee's sessions out of the Training Attendance Sheets */}
      <Section
        title="Pull from Training Attendance Sheet"
        hint="Finds sessions where this employee is listed as an attendee (CFPLA.C7.F.03)"
        action={
          <button
            type="button"
            onClick={runLookup}
            disabled={!employeeName.trim() || looking}
            className="btn-outline w-full text-xs sm:w-auto"
          >
            {looking ? "Searching…" : "Find sessions"}
          </button>
        }
      >
        {!employeeName.trim() && (
          <p className="text-xs text-ink-400">Enter the employee name above, then search.</p>
        )}

        {lookupError && (
          <p className="rounded-xl border border-danger-200 bg-danger-50 px-3 py-2.5 text-xs text-danger-700">
            {lookupError}
          </p>
        )}

        {lookup && lookup.sessions.length === 0 && (
          <p className="rounded-xl border border-cream-300 bg-cream-100/60 px-3 py-2.5 text-xs text-ink-500">
            No attendance sheet lists <span className="font-semibold">{lookup.employee_name}</span>{" "}
            in this plant. Check the spelling used on the sheet.
          </p>
        )}

        {lookup && lookup.sessions.length > 0 && (
          <div className="space-y-3">
            {lookup.match_type === "partial" && (
              <p className="rounded-xl border border-warning-200 bg-warning-50 px-3 py-2.5 text-xs text-warning-800">
                No exact name match — these sheets contain a similar name. Check each one before
                importing.
              </p>
            )}

            <div className="space-y-2">
              {lookup.sessions.map((s) => {
                const already = importedIds.includes(s.attendance_id);
                const checked = picked.includes(s.attendance_id);
                return (
                  <label
                    key={s.attendance_id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                      already
                        ? "border-cream-300 bg-cream-100/60 opacity-70"
                        : checked
                        ? "border-brand-300 bg-brand-50"
                        : "border-cream-300 bg-cream-50 hover:border-brand-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 shrink-0 accent-brand-500"
                      checked={checked}
                      disabled={already}
                      onChange={() =>
                        setPicked((prev) =>
                          prev.includes(s.attendance_id)
                            ? prev.filter((id) => id !== s.attendance_id)
                            : [...prev, s.attendance_id]
                        )
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-bold text-ink-600">
                          {s.date || "No date"}
                        </span>
                        <span className="font-mono text-[10px] text-ink-400">
                          {s.doc_no} #{s.attendance_id}
                        </span>
                        {s.total_hours != null && <Pill>{s.total_hours} h</Pill>}
                        {s.training_status && (
                          <Pill tone={statusTone(s.training_status)}>{s.training_status}</Pill>
                        )}
                        {already && <Pill>Already added</Pill>}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-ink-500">
                        {s.topics_covered || "No topics recorded"}
                      </p>
                      <p className="mt-1 text-[11px] text-ink-400">
                        Trainer: {s.trainer || "—"}
                        {s.attendee_name && <> · Listed as: {s.attendee_name}</>}
                        {s.venue && <> · {s.venue}</>}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] text-ink-400">
                {picked.length} selected · imported rows stay editable and keep a link to the sheet
              </p>
              <button
                type="button"
                onClick={importPicked}
                disabled={picked.length === 0}
                className="btn-primary w-full text-xs sm:w-auto"
              >
                Add {picked.length || ""} to training history
              </button>
            </div>
          </div>
        )}
      </Section>

      <Section
        title="Training History"
        hint={`${filled} of ${rows.length} entries filled`}
        bodyClassName="p-0"
      >
        {/* Desktop table */}
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-cream-100/70">
              <tr>
                <Th className="w-10">Sr.</Th>
                <Th className="w-36">Date</Th>
                <Th className="w-24">Hours</Th>
                <Th className="text-left">Training topics covered (GMP / SOP / SSOP references)</Th>
                <Th className="w-36">Trainer</Th>
                <Th className="w-40">Acknowledgment</Th>
                <Th className="w-24">Source</Th>
                <Th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.id} className="transition-colors hover:bg-cream-100/60">
                  <Td className="text-center text-[11px] font-semibold text-ink-400">{idx + 1}</Td>
                  <Td>
                    <input type="date" value={row.date} onChange={(e) => updateRow(row.id, "date", e.target.value)} className={cellInput} />
                  </Td>
                  <Td>
                    <input type="number" value={row.totalHours} onChange={(e) => updateRow(row.id, "totalHours", e.target.value)} className={cellInput} placeholder="hrs" />
                  </Td>
                  <Td>
                    <input type="text" value={row.topicsCovered} onChange={(e) => updateRow(row.id, "topicsCovered", e.target.value)} className={cellInput} placeholder="Training topics…" />
                  </Td>
                  <Td>
                    <input type="text" value={row.trainer} onChange={(e) => updateRow(row.id, "trainer", e.target.value)} className={cellInput} placeholder="Trainer" />
                  </Td>
                  <Td>
                    <input type="text" value={row.acknowledgement} onChange={(e) => updateRow(row.id, "acknowledgement", e.target.value)} className={cellInput} placeholder="Trainee sign" />
                  </Td>
                  <Td className="text-center">
                    {row.sourceAttendanceId ? (
                      <Link
                        href={`/training/attendance-sheet/${row.sourceAttendanceId}`}
                        title="Open the attendance sheet this row came from"
                        className="font-mono text-[10px] font-semibold text-brand-500 hover:underline"
                      >
                        F.03 #{row.sourceAttendanceId}
                      </Link>
                    ) : (
                      <span className="text-[10px] text-ink-300">Manual</span>
                    )}
                  </Td>
                  <Td className="text-center">
                    <RemoveRowButton onClick={() => removeRow(row.id)} label={`Remove entry ${idx + 1}`} />
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
              label="Session"
              onRemove={() => removeRow(row.id)}
              badge={
                row.sourceAttendanceId ? (
                  <Link
                    href={`/training/attendance-sheet/${row.sourceAttendanceId}`}
                    className="rounded-lg border border-brand-200 bg-brand-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-brand-600"
                  >
                    F.03 #{row.sourceAttendanceId}
                  </Link>
                ) : undefined
              }
            >
              <div className="grid grid-cols-2 gap-3">
                <CardField label="Date">
                  <input type="date" value={row.date} onChange={(e) => updateRow(row.id, "date", e.target.value)} className="input-base" />
                </CardField>
                <CardField label="Total hours">
                  <input type="number" inputMode="decimal" value={row.totalHours} onChange={(e) => updateRow(row.id, "totalHours", e.target.value)} className="input-base" placeholder="hrs" />
                </CardField>
              </div>
              <CardField label="Topics covered">
                <textarea
                  value={row.topicsCovered}
                  onChange={(e) => updateRow(row.id, "topicsCovered", e.target.value)}
                  rows={2}
                  className="input-base resize-y"
                  placeholder="GMP / SOP / SSOP references…"
                />
              </CardField>
              <div className="grid grid-cols-2 gap-3">
                <CardField label="Trainer">
                  <input type="text" value={row.trainer} onChange={(e) => updateRow(row.id, "trainer", e.target.value)} className="input-base" placeholder="Trainer" />
                </CardField>
                <CardField label="Acknowledgment">
                  <input type="text" value={row.acknowledgement} onChange={(e) => updateRow(row.id, "acknowledgement", e.target.value)} className="input-base" placeholder="Trainee sign" />
                </CardField>
              </div>
            </RowCard>
          ))}
        </div>

        <div className="border-t border-cream-200 px-4 py-3 sm:px-5">
          <AddRowButton label="Add Row" onClick={addRow} />
        </div>
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
        onSubmit={handleSubmitCard}
        draft={draftEnabled ? draftState : undefined}
      />
    </div>
  );
}
