"use client";
import { useState } from "react";

// ===================== F.04 — Water Analysis Record =====================
interface WaterRow { id: number; date: string; samplingLocation: string; waterType: "Drinking" | "Processing" | ""; appearance: "Ok" | "Not ok" | ""; turbidity: "Ok" | "Not ok" | ""; sensory: "Ok" | "Not ok" | ""; tds: string; ph: string; remark: string; checkedBy: string; verifiedBy: string; }
const emptyWaterRow = (id: number): WaterRow => ({ id, date: "", samplingLocation: "", waterType: "", appearance: "", turbidity: "", sensory: "", tds: "", ph: "", remark: "", checkedBy: "", verifiedBy: "" });

interface WaterAnalysisProps {
  initialData?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => Promise<void>;
  isEdit?: boolean;
}

export function WaterAnalysisRecord({ initialData, onSubmit, isEdit }: WaterAnalysisProps = {}) {
  const [rows, setRows] = useState<WaterRow[]>(() => {
    if (initialData?.rows && Array.isArray(initialData.rows)) {
      return initialData.rows.map((r: any, i: number) => ({
        id: i + 1,
        date: r.date || "",
        samplingLocation: r.sampling_location || "",
        waterType: r.water_type || "",
        appearance: r.appearance || "",
        turbidity: r.turbidity || "",
        sensory: r.sensory || "",
        tds: r.tds?.toString() || "",
        ph: r.ph?.toString() || "",
        remark: r.remark || "",
        checkedBy: r.checked_by || "",
        verifiedBy: r.verified_by || "",
      }));
    }
    return Array.from({ length: 5 }, (_, i) => emptyWaterRow(i + 1));
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const addRow = () => setRows((p) => [...p, emptyWaterRow(p.length + 1)]);
  const removeRow = (id: number) => { if (rows.length > 1) setRows((p) => p.filter((r) => r.id !== id)); };
  const update = (id: number, field: keyof WaterRow, value: string) => setRows((p) => p.map((r) => r.id === id ? { ...r, [field]: value } : r));
  const OkSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full border rounded-md px-1.5 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/30 ${
        value === "Ok"
          ? "bg-success-50 text-success-700 border-success-200"
          : value === "Not ok"
          ? "bg-danger-50 text-danger-600 border-danger-200"
          : "bg-cream-50 border-cream-300 text-ink-500"
      }`}
    >
      <option value="">—</option>
      <option value="Ok">Ok</option>
      <option value="Not ok">Not ok</option>
    </select>
  );

  const handleSubmit = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: typeof window !== "undefined" ? localStorage.getItem("currentWarehouse") || "A185" : "A185",
      rows: rows.filter((r) => r.date || r.samplingLocation).map((r) => ({
        date: r.date,
        sampling_location: r.samplingLocation,
        water_type: r.waterType,
        appearance: r.appearance,
        turbidity: r.turbidity,
        sensory: r.sensory,
        tds: r.tds ? Number(r.tds) : null,
        ph: r.ph ? Number(r.ph) : null,
        remark: r.remark,
        checked_by: r.checkedBy,
        verified_by: r.verifiedBy,
      })),
    };
    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        const { docsApi } = await import("@/lib/api/documentations");
        await docsApi.create("water-analysis", payload);
        setSuccess(true);
      }
    } catch (e: any) {
      alert(e.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="surface-card overflow-hidden">
        <header className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-cream-300 bg-cream-100/60">
          <h2 className="text-sm font-bold text-ink-600">Water Samples</h2>
          <button onClick={addRow} className="btn-primary !py-1.5 !px-3 text-xs">+ Add Row</button>
        </header>
        <p className="text-[11px] text-ink-400 italic px-4 pt-3 sm:hidden">← Swipe to view all columns</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-cream-100/70 border-b border-cream-300">
              <tr>
                {["Date", "Sampling Location", "Type", "Appearance", "Turbidity", "Sensory", "TDS (ppm)", "pH", "Remark", "Checked By", "Verified By", ""].map((h) => (
                  <th key={h} className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-cream-100/60">
                  <td className="px-1 py-1"><input type="date" value={row.date} onChange={(e) => update(row.id, "date", e.target.value)} className="input-base !py-1 !px-2 text-xs" /></td>
                  <td className="px-1 py-1"><input type="text" value={row.samplingLocation} onChange={(e) => update(row.id, "samplingLocation", e.target.value)} className="input-base !py-1 !px-2 text-xs" /></td>
                  <td className="px-1 py-1">
                    <select value={row.waterType} onChange={(e) => update(row.id, "waterType", e.target.value)} className="input-base !py-1 !px-2 text-xs">
                      <option value="">Select</option><option value="Drinking">Drinking</option><option value="Processing">Processing</option>
                    </select>
                  </td>
                  <td className="px-1 py-1"><OkSelect value={row.appearance} onChange={(v) => update(row.id, "appearance", v)} /></td>
                  <td className="px-1 py-1"><OkSelect value={row.turbidity} onChange={(v) => update(row.id, "turbidity", v)} /></td>
                  <td className="px-1 py-1"><OkSelect value={row.sensory} onChange={(v) => update(row.id, "sensory", v)} /></td>
                  <td className="px-1 py-1"><input type="number" value={row.tds} onChange={(e) => update(row.id, "tds", e.target.value)} className="input-base !py-1 !px-2 text-xs w-20 text-center" /></td>
                  <td className="px-1 py-1"><input type="number" value={row.ph} onChange={(e) => update(row.id, "ph", e.target.value)} className="input-base !py-1 !px-2 text-xs w-16 text-center" step="0.1" /></td>
                  <td className="px-1 py-1"><input type="text" value={row.remark} onChange={(e) => update(row.id, "remark", e.target.value)} className="input-base !py-1 !px-2 text-xs" /></td>
                  <td className="px-1 py-1"><input type="text" value={row.checkedBy} onChange={(e) => update(row.id, "checkedBy", e.target.value)} className="input-base !py-1 !px-2 text-xs" /></td>
                  <td className="px-1 py-1"><input type="text" value={row.verifiedBy} onChange={(e) => update(row.id, "verifiedBy", e.target.value)} className="input-base !py-1 !px-2 text-xs" /></td>
                  <td className="px-1 py-1 text-center">
                    <button onClick={() => removeRow(row.id)} className="inline-flex items-center justify-center w-6 h-6 rounded-md text-ink-400 hover:text-danger-600 hover:bg-danger-50">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="surface-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-ink-400">
          Prepared by: <span className="font-semibold text-ink-500">FST</span>
          <span className="mx-2 text-cream-300">|</span>
          Approved by: <span className="font-semibold text-ink-500">FSTL</span>
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

// ===================== F.05 — Food Safety Incident Report Register =====================
interface IncidentRow { id: number; dateOfIncident: string; natureOfIncident: string; causeOfIncident: string; personAttending: string; preventiveMeasures: string; personFillingForm: string; status: string; }
const emptyIncidentRow = (id: number): IncidentRow => ({ id, dateOfIncident: "", natureOfIncident: "", causeOfIncident: "", personAttending: "", preventiveMeasures: "", personFillingForm: "", status: "" });

interface IncidentReportProps {
  initialData?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => Promise<void>;
  isEdit?: boolean;
}

export function FoodSafetyIncidentReport({ initialData, onSubmit, isEdit }: IncidentReportProps = {}) {
  const [rows, setRows] = useState<IncidentRow[]>(() => {
    if (initialData?.rows && Array.isArray(initialData.rows)) {
      return initialData.rows.map((r: any, i: number) => ({
        id: i + 1,
        dateOfIncident: r.date_of_incident || "",
        natureOfIncident: r.nature_of_incident || "",
        causeOfIncident: r.cause_of_incident || "",
        personAttending: r.person_attending || "",
        preventiveMeasures: r.preventive_measures || "",
        personFillingForm: r.person_filling_form || "",
        status: r.status || "",
      }));
    }
    return Array.from({ length: 5 }, (_, i) => emptyIncidentRow(i + 1));
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const addRow = () => setRows((p) => [...p, emptyIncidentRow(p.length + 1)]);
  const removeRow = (id: number) => { if (rows.length > 1) setRows((p) => p.filter((r) => r.id !== id)); };
  const update = (id: number, field: keyof IncidentRow, value: string) => setRows((p) => p.map((r) => r.id === id ? { ...r, [field]: value } : r));

  const handleSubmit = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: typeof window !== "undefined" ? localStorage.getItem("currentWarehouse") || "A185" : "A185",
      rows: rows.filter((r) => r.dateOfIncident || r.natureOfIncident).map((r) => ({
        date_of_incident: r.dateOfIncident,
        nature_of_incident: r.natureOfIncident,
        cause_of_incident: r.causeOfIncident,
        person_attending: r.personAttending,
        preventive_measures: r.preventiveMeasures,
        person_filling_form: r.personFillingForm,
        status: r.status,
      })),
    };
    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        const { docsApi } = await import("@/lib/api/documentations");
        await docsApi.create("incident-report", payload);
        setSuccess(true);
      }
    } catch (e: any) {
      alert(e.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="surface-card overflow-hidden">
        <header className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-cream-300 bg-cream-100/60">
          <h2 className="text-sm font-bold text-ink-600">Incident Register</h2>
          <button onClick={addRow} className="btn-primary !py-1.5 !px-3 text-xs">+ Add Row</button>
        </header>
        <p className="text-[11px] text-ink-400 italic px-4 pt-3 sm:hidden">← Swipe to view all columns</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-cream-100/70 border-b border-cream-300">
              <tr>
                {["Sr.", "Date", "Nature", "Cause", "Attending", "Preventive Measures", "Person Filling", "Status", ""].map((h) => (
                  <th key={h} className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {rows.map((row, idx) => (
                <tr key={row.id} className="hover:bg-cream-100/60 align-top">
                  <td className="px-2 py-2 text-center text-ink-400 font-medium">{idx + 1}</td>
                  <td className="px-1 py-1"><input type="date" value={row.dateOfIncident} onChange={(e) => update(row.id, "dateOfIncident", e.target.value)} className="input-base !py-1 !px-2 text-xs" /></td>
                  <td className="px-1 py-1"><textarea value={row.natureOfIncident} onChange={(e) => update(row.id, "natureOfIncident", e.target.value)} className="input-base !py-1 !px-2 text-xs min-w-[150px]" rows={2} /></td>
                  <td className="px-1 py-1"><textarea value={row.causeOfIncident} onChange={(e) => update(row.id, "causeOfIncident", e.target.value)} className="input-base !py-1 !px-2 text-xs min-w-[150px]" rows={2} /></td>
                  <td className="px-1 py-1"><input type="text" value={row.personAttending} onChange={(e) => update(row.id, "personAttending", e.target.value)} className="input-base !py-1 !px-2 text-xs" /></td>
                  <td className="px-1 py-1"><textarea value={row.preventiveMeasures} onChange={(e) => update(row.id, "preventiveMeasures", e.target.value)} className="input-base !py-1 !px-2 text-xs min-w-[150px]" rows={2} /></td>
                  <td className="px-1 py-1"><input type="text" value={row.personFillingForm} onChange={(e) => update(row.id, "personFillingForm", e.target.value)} className="input-base !py-1 !px-2 text-xs" /></td>
                  <td className="px-1 py-1">
                    <select
                      value={row.status}
                      onChange={(e) => update(row.id, "status", e.target.value)}
                      className={`w-full border rounded-md px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/30 ${
                        row.status === "Closed"
                          ? "bg-success-50 text-success-700 border-success-200"
                          : row.status === "Open"
                          ? "bg-warning-50 text-warning-700 border-warning-200"
                          : row.status === "In Progress"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-cream-50 border-cream-300 text-ink-500"
                      }`}
                    >
                      <option value="">Select</option><option value="Open">Open</option><option value="In Progress">In Progress</option><option value="Closed">Closed</option>
                    </select>
                  </td>
                  <td className="px-1 py-1 text-center">
                    <button onClick={() => removeRow(row.id)} className="inline-flex items-center justify-center w-6 h-6 rounded-md text-ink-400 hover:text-danger-600 hover:bg-danger-50">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="surface-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-ink-400">
          Prepared By: <span className="font-semibold text-ink-500">FST</span>
          <span className="mx-2 text-cream-300">|</span>
          Approved By: <span className="font-semibold text-ink-500">FSTL</span>
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

// ===================== F.09 — Food Safety Meeting Minutes =====================
interface AttendeeRow { id: number; name: string; designation: string; signature: string; }
interface TopicRow { id: number; topic: string; type: string; discussion: string; responsible: string; }

interface FoodSafetyMeetingProps {
  initialData?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => Promise<void>;
  isEdit?: boolean;
}

export function FoodSafetyMeeting({ initialData, onSubmit, isEdit }: FoodSafetyMeetingProps = {}) {
  const [date, setDate] = useState(initialData?.meeting_date || "");
  const [timeFrom, setTimeFrom] = useState(initialData?.time_from || "");
  const [timeTo, setTimeTo] = useState(initialData?.time_to || "");
  const [venue, setVenue] = useState(initialData?.venue || "");
  const [nextMeetingDate, setNextMeetingDate] = useState(initialData?.next_meeting_date || "");
  const [adjournedAt, setAdjournedAt] = useState(initialData?.adjourned_at || "");
  const [attendees, setAttendees] = useState<AttendeeRow[]>(() => {
    if (initialData?.attendees && Array.isArray(initialData.attendees)) {
      return initialData.attendees.map((a: any, i: number) => ({ id: i + 1, name: a.name || "", designation: a.designation || "", signature: a.signature || "" }));
    }
    return Array.from({ length: 9 }, (_, i) => ({ id: i + 1, name: "", designation: "", signature: "" }));
  });
  const [topics, setTopics] = useState<TopicRow[]>(() => {
    if (initialData?.topics && Array.isArray(initialData.topics)) {
      return initialData.topics.map((t: any, i: number) => ({ id: i + 1, topic: t.topic || "", type: t.type || "", discussion: t.discussion || "", responsible: t.responsible || "" }));
    }
    return [
      { id: 1, topic: "Food Safety, Planning of Food Safety, New Products Awareness", type: "Discussion", discussion: "", responsible: "FSTL/Production" },
      { id: 2, topic: "Legal and Statutory Requirements, Trainings", type: "Discussion", discussion: "", responsible: "All/HR" },
      { id: 3, topic: "Quality Issues, Change in Quality and Process Parameters", type: "Discussion", discussion: "", responsible: "QA In-Charge" },
      { id: 4, topic: "Other Issues in Operation, Facility & Working Environment, Infrastructure/Manpower Requirements", type: "Discussion", discussion: "", responsible: "QA & Factory Manager" },
      { id: 5, topic: "Any Other Activities", type: "", discussion: "", responsible: "" },
    ];
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const addAttendee = () => setAttendees((p) => [...p, { id: p.length + 1, name: "", designation: "", signature: "" }]);
  const addTopic = () => setTopics((p) => [...p, { id: p.length + 1, topic: "", type: "Discussion", discussion: "", responsible: "" }]);
  const removeAttendee = (id: number) => { if (attendees.length > 1) setAttendees((p) => p.filter((r) => r.id !== id)); };
  const removeTopic = (id: number) => { if (topics.length > 1) setTopics((p) => p.filter((r) => r.id !== id)); };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: typeof window !== "undefined" ? localStorage.getItem("currentWarehouse") || "A185" : "A185",
      meeting_date: date,
      time_from: timeFrom,
      time_to: timeTo,
      venue,
      next_meeting_date: nextMeetingDate,
      adjourned_at: adjournedAt,
      attendees: attendees.filter((a) => a.name).map((a) => ({ name: a.name, designation: a.designation, signature: a.signature })),
      topics: topics.filter((t) => t.topic).map((t) => ({ topic: t.topic, type: t.type, discussion: t.discussion, responsible: t.responsible })),
    };
    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        const { docsApi } = await import("@/lib/api/documentations");
        await docsApi.create("safety-meeting", payload);
        setSuccess(true);
      }
    } catch (e: any) {
      alert(e.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="surface-card p-4 sm:p-5">
        <h2 className="text-sm font-bold text-ink-600 mb-3">Meeting Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="label-base">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="label-base">Time From</label>
            <input type="time" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="label-base">Time To</label>
            <input type="time" value={timeTo} onChange={(e) => setTimeTo(e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="label-base">Venue</label>
            <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)} className="input-base" />
          </div>
        </div>
      </section>

      <section className="surface-card overflow-hidden">
        <header className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-cream-300 bg-cream-100/60">
          <h2 className="text-sm font-bold text-ink-600">Attendees</h2>
          <button onClick={addAttendee} className="btn-primary !py-1.5 !px-3 text-xs">+ Add Attendee</button>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream-100/70 border-b border-cream-300">
              <tr>
                <th className="px-2 py-2 w-12 text-center text-[11px] font-semibold uppercase text-ink-400">Sr.</th>
                <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase text-ink-400">Name</th>
                <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase text-ink-400">Designation</th>
                <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase text-ink-400">Signature</th>
                <th className="px-2 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {attendees.map((a, idx) => (
                <tr key={a.id} className="hover:bg-cream-100/60">
                  <td className="px-2 py-1.5 text-center text-ink-400 font-medium">{idx + 1}</td>
                  <td className="px-1 py-1.5"><input type="text" value={a.name} onChange={(e) => setAttendees((p) => p.map((r) => r.id === a.id ? { ...r, name: e.target.value } : r))} className="input-base !py-1.5 !px-2 text-sm" /></td>
                  <td className="px-1 py-1.5"><input type="text" value={a.designation} onChange={(e) => setAttendees((p) => p.map((r) => r.id === a.id ? { ...r, designation: e.target.value } : r))} className="input-base !py-1.5 !px-2 text-sm" /></td>
                  <td className="px-1 py-1.5"><input type="text" value={a.signature} onChange={(e) => setAttendees((p) => p.map((r) => r.id === a.id ? { ...r, signature: e.target.value } : r))} className="input-base !py-1.5 !px-2 text-sm" /></td>
                  <td className="px-1 py-1.5 text-center"><button onClick={() => removeAttendee(a.id)} className="inline-flex items-center justify-center w-6 h-6 rounded-md text-ink-400 hover:text-danger-600 hover:bg-danger-50">✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="surface-card overflow-hidden">
        <header className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-cream-300 bg-cream-100/60">
          <h2 className="text-sm font-bold text-ink-600">Discussion Topics</h2>
          <button onClick={addTopic} className="btn-primary !py-1.5 !px-3 text-xs">+ Add Topic</button>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream-100/70 border-b border-cream-300">
              <tr>
                <th className="px-2 py-2 w-10 text-center text-[11px] font-semibold uppercase text-ink-400">Sr.</th>
                <th className="px-2 py-2 min-w-[200px] text-left text-[11px] font-semibold uppercase text-ink-400">Topic</th>
                <th className="px-2 py-2 w-28 text-left text-[11px] font-semibold uppercase text-ink-400">Type</th>
                <th className="px-2 py-2 min-w-[300px] text-left text-[11px] font-semibold uppercase text-ink-400">Discussion</th>
                <th className="px-2 py-2 w-32 text-left text-[11px] font-semibold uppercase text-ink-400">Responsible</th>
                <th className="px-2 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {topics.map((t, idx) => (
                <tr key={t.id} className="hover:bg-cream-100/60 align-top">
                  <td className="px-2 py-1.5 text-center text-ink-400 font-medium">{idx + 1}</td>
                  <td className="px-1 py-1.5"><textarea value={t.topic} onChange={(e) => setTopics((p) => p.map((r) => r.id === t.id ? { ...r, topic: e.target.value } : r))} className="input-base !py-1.5 !px-2 text-sm" rows={3} /></td>
                  <td className="px-1 py-1.5"><input type="text" value={t.type} onChange={(e) => setTopics((p) => p.map((r) => r.id === t.id ? { ...r, type: e.target.value } : r))} className="input-base !py-1.5 !px-2 text-sm" /></td>
                  <td className="px-1 py-1.5"><textarea value={t.discussion} onChange={(e) => setTopics((p) => p.map((r) => r.id === t.id ? { ...r, discussion: e.target.value } : r))} className="input-base !py-1.5 !px-2 text-sm" rows={4} placeholder="Enter discussion points..." /></td>
                  <td className="px-1 py-1.5"><input type="text" value={t.responsible} onChange={(e) => setTopics((p) => p.map((r) => r.id === t.id ? { ...r, responsible: e.target.value } : r))} className="input-base !py-1.5 !px-2 text-sm" /></td>
                  <td className="px-1 py-1.5 text-center"><button onClick={() => removeTopic(t.id)} className="inline-flex items-center justify-center w-6 h-6 rounded-md text-ink-400 hover:text-danger-600 hover:bg-danger-50">✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="surface-card p-4 sm:p-5">
        <h2 className="text-sm font-bold text-ink-600 mb-3">Closure</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label-base">Date of Next Meeting</label>
            <input type="date" value={nextMeetingDate} onChange={(e) => setNextMeetingDate(e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="label-base">Meeting Adjourned At</label>
            <input type="time" value={adjournedAt} onChange={(e) => setAdjournedAt(e.target.value)} className="input-base" />
          </div>
        </div>
      </section>

      <div className="surface-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-ink-400">
          Prepared By: <span className="font-semibold text-ink-500">FST</span>
          <span className="mx-2 text-cream-300">|</span>
          Approved By: <span className="font-semibold text-ink-500">FSTL</span>
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

export default WaterAnalysisRecord;
