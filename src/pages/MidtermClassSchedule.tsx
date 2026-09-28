import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { useQueryClient } from "@tanstack/react-query";
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
import {
  apiErrorMessage,
  isApiError,
  newMidtermRow,
  toMidtermRow,
  useClearMidtermSchedule,
  useMidtermSchedule,
  useSaveMidtermSchedule,
} from "@/hooks/useMidtermSchedule";
import { WEEKDAYS } from "@/lib/academic";

interface PaperRow {
  key: number;
  paper: string;
  day: string;
  date: string;
  start: string;
  end: string;
}

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
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<PaperRow[]>([newMidtermRow()]);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const seededFor = useRef<string | null>(null);

  const deptId: string = user?.department?._id ?? user?.department ?? "";
  const { data: classes, isLoading } = useClasses("", deptId);
  const { data: schedule, isLoading: loadingSchedule } = useMidtermSchedule(classId);
  const saveMutation = useSaveMidtermSchedule();
  const clearMutation = useClearMidtermSchedule();
  const saving = saveMutation.isPending;
  const clearing = clearMutation.isPending;

  // Papers currently stored for this class, used to tell a saved sheet apart
  // from a draft that still needs saving.
  const savedPapers = useMemo(
    () =>
      (isApiError(schedule) ? [] : (schedule?.papers ?? []))
        .map((p) => `${p.paper}|${p.day}|${p.date}|${p.start}|${p.end}`)
        .join("~"),
    [schedule],
  );

  const hasUnpublishedChanges = useMemo(() => {
    const draft = rows
      .filter((r) => r.paper.trim())
      .map((r) => `${r.paper.trim()}|${r.day}|${r.date}|${r.start}|${r.end}`)
      .join("~");
    return draft !== savedPapers;
  }, [rows, savedPapers]);

  const classData = useMemo(
    () => (classes || []).find((c: any) => c._id === classId),
    [classes, classId],
  );

  // Open the table with whatever was already saved for this class, once per
  // class — a background refetch must not wipe rows the HOD is editing.
  useEffect(() => {
    if (!schedule || seededFor.current === classId) return;
    if (isApiError(schedule)) return;
    seededFor.current = classId ?? null;
    setRows(
      schedule.papers?.length
        ? schedule.papers.map(toMidtermRow)
        : [newMidtermRow()],
    );
  }, [schedule, classId]);

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

  const patch = (key: number, prop: keyof PaperRow, value: string) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [prop]: value } : r)));

  const addRow = () => setRows((prev) => [...prev, newMidtermRow()]);

  const removeRow = (key: number) =>
    setRows((prev) => (prev.length === 1 ? [newMidtermRow()] : prev.filter((r) => r.key !== key)));

  /**
   * Drops the whole published sheet from the database (DELETE).
   * Removing a single paper is a draft edit — that only reaches the database
   * once "Save Schedule" POSTs the shortened list.
   */
  const deleteSchedule = async () => {
    setConfirmingDelete(false);

    try {
      const result: any = await clearMutation.mutateAsync({ classId: classId as string });

      if (isApiError(result)) {
        return toast.error(apiErrorMessage(result, "Could not delete the schedule"));
      }

      setRows([newMidtermRow()]);
      await queryClient.invalidateQueries({ queryKey: ["midterm-schedule", classId] });

      toast.success(
        result.deleted ? "Schedule deleted" : "Nothing to delete",
        {
          description: result.deleted
            ? `${result.className} ka date sheet database se hat gaya.`
            : "Is class ka koi published schedule mojood nahi tha.",
        },
      );
    } catch {
      toast.error("Could not delete the schedule");
    }
  };

  // Saving publishes the schedule: the backend notifies every student of the
  // class with a push (notification_type 20).
  const save = async () => {
    const papers = rows
      .filter((r) => r.paper.trim())
      .map((r) => ({
        paper: r.paper.trim(),
        day: r.day,
        date: r.date,
        start: r.start,
        end: r.end,
      }));

    if (papers.length === 0) return toast.error("Add at least one paper");
    const missing = papers.find((p) => !p.date);
    if (missing) return toast.error(`Add a date for "${missing.paper}"`);

    try {
      const result: any = await saveMutation.mutateAsync({
        classId: classId as string,
        papers,
      });

      if (isApiError(result)) {
        return toast.error(apiErrorMessage(result, "Could not save the schedule"));
      }

      // Adopt the server's copy so the table shows exactly what was stored.
      if (result.papers?.length) setRows(result.papers.map(toMidtermRow));

      // Re-read the stored sheet so the unsaved-changes badge clears.
      await queryClient.invalidateQueries({ queryKey: ["midterm-schedule", classId] });

      toast.success("Schedule saved", {
        description: result.studentsNotified
          ? `${result.studentsNotified} student(s) notified`
          : "No students to notify in this class",
      });
    } catch {
      toast.error("Could not save the schedule");
    }
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
        <div className="flex flex-wrap items-center gap-2">
          {hasUnpublishedChanges && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Unsaved changes
            </span>
          )}
          {savedPapers && (
            <button
              onClick={() => setConfirmingDelete(true)}
              disabled={saving || clearing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-card px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
            >
              {clearing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete Schedule
            </button>
          )}
          <button
            onClick={save}
            disabled={saving || loadingSchedule}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {saving || loadingSchedule ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {loadingSchedule ? "Loading..." : "Save Schedule"}
          </button>
        </div>
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
                key={row.key}
                className="rounded-lg border border-border bg-secondary/20 p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Paper {i + 1}
                  </span>
                  <button
                    onClick={() => removeRow(row.key)}
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
                      onChange={(e) => patch(row.key, "paper", e.target.value)}
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
                      onChange={(e) => patch(row.key, "day", e.target.value)}
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
                      onChange={(e) => patch(row.key, "date", e.target.value)}
                      className={inputCls}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelCls}>Start</label>
                    <input
                      type="time"
                      value={row.start}
                      onChange={(e) => patch(row.key, "start", e.target.value)}
                      className={inputCls}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelCls}>End</label>
                    <input
                      type="time"
                      value={row.end}
                      onChange={(e) => patch(row.key, "end", e.target.value)}
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
        {schedule?.publishedAt
          ? `Last published ${new Date(schedule.publishedAt).toLocaleString()}. Saving again sends a fresh notification to the students.`
          : "Saving publishes the schedule and notifies every student of this class."}
      </p>

      <p className="mt-1.5 text-xs text-muted-foreground">
        The bin icon only removes a row from this draft — press{" "}
        <span className="font-medium text-foreground">Save Schedule</span> to write the
        change to the database. <span className="font-medium text-foreground">Delete Schedule</span>{" "}
        removes the whole published sheet at once.
      </p>

      {confirmingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <h3 className="mb-1 font-display text-base font-bold text-foreground">
              Delete this schedule?
            </h3>
            <p className="text-sm text-muted-foreground">
              The published midterm date sheet for{" "}
              <span className="font-medium text-foreground">
                {classData?.className ?? "this class"}
              </span>{" "}
              will be removed from the database. Students keep the last notification they
              already received, but the sheet will be gone for anyone who opens it again.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmingDelete(false)}
                className="rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={deleteSchedule}
                className="rounded-lg bg-destructive px-3.5 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
              >
                Delete schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MidtermClassSchedule;
