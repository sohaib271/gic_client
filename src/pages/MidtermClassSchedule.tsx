import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarClock,
  Plus,
  Trash2,
  Save,
  Users,
  School,
  Clock,
  FileText,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useClasses } from "@/hooks/useClasses";
import { WEEKDAYS } from "@/lib/academic";

interface PaperRow {
  id: number;
  paper: string;
  day: string;
  date: string;
  start: string;
  end: string;
}

let rowSeq = 0;
const newRow = (): PaperRow => ({
  id: (rowSeq += 1),
  paper: "",
  day: "Monday",
  date: "",
  start: "09:00",
  end: "11:00",
});

const durationOf = (start: string, end: string) => {
  if (!start || !end) return "";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm);
  if (!Number.isFinite(mins) || mins <= 0) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
};

const inputCls =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";
const labelCls = "mb-1 block text-xs font-medium text-muted-foreground";

const MidtermClassSchedule = () => {
  const navigate = useNavigate();
  const { classId } = useParams();
  const user = useSelector((state: any) => state?.user.user);
  const [rows, setRows] = useState<PaperRow[]>([newRow()]);
  const [saving, setSaving] = useState(false);

  const deptId: string = user?.department?._id ?? user?.department ?? "";
  const { data: classes, isLoading } = useClasses("", deptId);

  const classData = useMemo(
    () => (classes || []).find((c: any) => c._id === classId),
    [classes, classId],
  );

  // Subjects already taught in this class, offered as quick pick options.
  const knownSubjects = useMemo(() => {
    const list = (classData?.assignes || [])
      .map((a: any) => a?.subject)
      .filter((s: any) => typeof s === "string" && s.trim());
    return Array.from(new Set<string>(list));
  }, [classData]);

  const summary = useMemo(() => {
    const filled = rows.filter((r) => r.paper.trim());
    const days = Array.from(new Set(filled.map((r) => r.day))).length;
    const dates = filled.map((r) => r.date).filter(Boolean).sort();
    return {
      papers: filled.length,
      days,
      from: dates[0] ?? "",
      to: dates[dates.length - 1] ?? "",
    };
  }, [rows]);

  const patch = (id: number, key: keyof PaperRow, value: string) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)));

  const addRow = () => setRows((prev) => [...prev, newRow()]);

  const removeRow = (id: number) =>
    setRows((prev) => (prev.length === 1 ? [newRow()] : prev.filter((r) => r.id !== id)));

  // UI only for now — the schedule will be connected to the API later.
  const save = () => {
    const missing = rows.some((r) => r.paper.trim() && !r.date);
    if (missing) return toast.error("Add a date for every paper");
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("Schedule saved", { description: "This section will be connected soon." });
    }, 700);
  };

  if (!isLoading && !classData) {
    return (
      <div>
        <button
          onClick={() => navigate("/professor/settings/midterm-tests")}
          className="mb-4 flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Classes
        </button>
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <School className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Class not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => navigate("/professor/settings/midterm-tests")}
        className="mb-4 flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Classes
      </button>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-wrap items-end justify-between gap-3"
      >
        <div>
          <h1 className="mb-1 flex items-center gap-2 font-display text-xl font-bold text-foreground sm:text-2xl">
            <CalendarClock className="h-5 w-5 text-primary" /> Midterm Test Schedule
          </h1>
          <p className="text-sm text-muted-foreground">
            {classData?.className ?? "Loading..."} · {classData?.session ?? "—"} ·{" "}
            {(classData?.classStudents || []).length} students
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Schedule
        </button>
      </motion.div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {[
          { label: "Papers", value: String(summary.papers), icon: FileText },
          { label: "Days Covered", value: String(summary.days), icon: CalendarClock },
          { label: "Starts From", value: summary.from || "—", icon: Clock },
          { label: "Ends On", value: summary.to || "—", icon: Clock },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <s.icon className="h-4 w-4 text-primary" />
            </div>
            <p className="text-lg font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Paper rows */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-xl border border-border bg-card shadow-card"
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <FileText className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Papers &amp; Timings</h2>
          <span className="ml-auto text-xs text-muted-foreground">
            {rows.length} {rows.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        <div className="space-y-3 p-4">
          {rows.map((row, i) => {
            const dur = durationOf(row.start, row.end);
            return (
              <div
                key={row.id}
                className="rounded-lg border border-border bg-secondary/20 p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Paper {i + 1}
                  </span>
                  <button
                    onClick={() => removeRow(row.id)}
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remove paper ${i + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                  <div className="md:col-span-4">
                    <label className={labelCls}>Paper / Subject</label>
                    <input
                      list="midterm-subjects"
                      value={row.paper}
                      onChange={(e) => patch(row.id, "paper", e.target.value)}
                      placeholder="e.g. English"
                      className={inputCls}
                    />
                    <datalist id="midterm-subjects">
                      {knownSubjects.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelCls}>Day</label>
                    <select
                      value={row.day}
                      onChange={(e) => patch(row.id, "day", e.target.value)}
                      className={inputCls}
                    >
                      {WEEKDAYS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelCls}>Date</label>
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) => patch(row.id, "date", e.target.value)}
                      className={inputCls}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelCls}>Start</label>
                    <input
                      type="time"
                      value={row.start}
                      onChange={(e) => patch(row.id, "start", e.target.value)}
                      className={inputCls}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelCls}>End</label>
                    <input
                      type="time"
                      value={row.end}
                      onChange={(e) => patch(row.id, "end", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>

                {dur && (
                  <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> Duration: {dur}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-t border-border px-4 py-3">
          <button
            onClick={addRow}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-primary shadow-sm transition-colors hover:bg-secondary"
          >
            <Plus className="h-4 w-4" /> Add Another Paper
          </button>
        </div>
      </motion.div>

      <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Users className="h-3.5 w-3.5" />
        Students of this class will be notified once the schedule is published.
      </p>
    </div>
  );
};

export default MidtermClassSchedule;
