import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  UserCircle,
  GraduationCap,
  CalendarDays,
  Plus,
  X,
  Check,
  Search,
  Clock,
  Pencil,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { WEEKDAYS as DAYS } from "@/lib/academic";
import ClassService from "@/services/classService";

type Tab = "teachers" | "students";

interface ScheduleEntry {
  day: string;
  startTime: string;
  endTime: string;
}

// One time-slot inside a day row
interface EditSlot {
  startTime: string;
  endTime: string;
}

// One day row in the schedule editor — can hold multiple slots
interface EditDayRow {
  day: string;
  active: boolean;
  slots: EditSlot[];
}

interface AssignedTeacher {
  teacherId:
    | {
        _id: string;
        name: string;
        lastName?: string;
        department?: { code: string };
      }
    | string;
  subject: string;
  schedule: ScheduleEntry[];
}

interface Props {
  classData: any;
  professors: any[];
  students: any[];
  onBack: () => void;
  onViewSchedule?: () => void;
  onRemoveTeacher: (teacherId: string) => void;
  onRemoveStudent: (studentId: string) => void;
  onAddTeachers: (teachers: AssignedTeacher[]) => void;
  onAddStudents: (studentIds: string[]) => void;
  onUpdateTeacherSchedule: (
    teacherId: string,
    schedule: ScheduleEntry[],
  ) => void;
}

// ── pure helpers ─────────────────────────────────────────────────────────────
const resolveTeacherId = (t: AssignedTeacher): string =>
  typeof t.teacherId === "object" ? t.teacherId._id : t.teacherId;

const resolveTeacherName = (t: AssignedTeacher): string => {
  if (typeof t.teacherId === "object")
    return `${t.teacherId.name ?? ""} ${t.teacherId.lastName ?? ""}`.trim();
  return "Teacher";
};

const resolveStudentId = (s: any): string => s?._id ?? s;

/** EditDayRow[] → flat ScheduleEntry[] for the API */
const flattenRows = (rows: EditDayRow[]): ScheduleEntry[] =>
  rows
    .filter((r) => r.active)
    .flatMap((r) =>
      r.slots.map((slot) => ({
        day: r.day,
        startTime: slot.startTime,
        endTime: slot.endTime,
      })),
    );

/** Existing ScheduleEntry[] → EditDayRow[] for the editor */
const buildRows = (schedule: ScheduleEntry[]): EditDayRow[] =>
  DAYS.map((day) => {
    const entries = schedule.filter((s) => s.day === day);
    return {
      day,
      active: entries.length > 0,
      slots:
        entries.length > 0
          ? entries.map((e) => ({ startTime: e.startTime, endTime: e.endTime }))
          : [{ startTime: "", endTime: "" }],
    };
  });

/** Fresh rows for a brand-new teacher assignment */
const emptyRows = (): EditDayRow[] =>
  DAYS.map((day) => ({
    day,
    active: false,
    slots: [{ startTime: "", endTime: "" }],
  }));

// ─────────────────────────────────────────────────────────────────────────────

export default function ClassDetailView({
  classData,
  professors,
  students,
  onBack,
  onViewSchedule,
  onRemoveTeacher,
  onRemoveStudent,
  onAddTeachers,
  onAddStudents,
  onUpdateTeacherSchedule,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("teachers");
  // ── Add-teacher modal ────────────────────────────────────────────────────
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [pendingTeacherId, setPendingTeacherId] = useState<string | null>(null);
  const [pendingSubject, setPendingSubject] = useState("");
  const [pendingRows, setPendingRows] = useState<EditDayRow[]>(emptyRows());
  const [teacherSearch, setTeacherSearch] = useState("");
  const [addingTeacher, setAddingTeacher] = useState(false);

  // ── Edit-schedule inline panel ───────────────────────────────────────────
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [editRows, setEditRows] = useState<EditDayRow[]>([]);
  const [savingSchedule, setSavingSchedule] = useState(false);

  // ── Add-student modal ────────────────────────────────────────────────────
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedNewStudents, setSelectedNewStudents] = useState<string[]>([]);
  const [addingStudents, setAddingStudents] = useState(false);

  // ── Loading flags ────────────────────────────────────────────────────────
  const [removingTeacherId, setRemovingTeacherId] = useState<string | null>(
    null,
  );
  const [removingStudentId, setRemovingStudentId] = useState<string | null>(
    null,
  );

  // ── Derived ──────────────────────────────────────────────────────────────
  const assignedTeachers: AssignedTeacher[] = classData?.assignes ?? [];
  const classStudents: any[] = classData?.classStudents ?? [];

  const assignedTeacherIds = useMemo(
    () => new Set(assignedTeachers.map(resolveTeacherId)),
    [assignedTeachers],
  );

  const enrolledStudentIds = useMemo(
    () => new Set(classStudents.map(resolveStudentId)),
    [classStudents],
  );

  const filteredProfessors = useMemo(
    () =>
      professors.filter(
        (p) =>
          !assignedTeacherIds.has(p._id) &&
          (`${p.name} ${p.lastName ?? ""}`
            .toLowerCase()
            .includes(teacherSearch.toLowerCase()) ||
            p.department?.code
              ?.toLowerCase()
              .includes(teacherSearch.toLowerCase())),
      ),
    [professors, assignedTeacherIds, teacherSearch],
  );
  const filteredStudents = useMemo(
    () =>
      students.filter(
        (s) =>
          !enrolledStudentIds.has(resolveStudentId(s)) &&
          (`${s.name} ${s.lastName ?? ""}`
            .toLowerCase()
            .includes(studentSearch.toLowerCase()) ||
            s.specialId?.toLowerCase().includes(studentSearch.toLowerCase())),
      ),
    [students, enrolledStudentIds, studentSearch],
  );

  // ════════════════════════════════════════════════════════════════════════════
  //  SHARED SCHEDULE-ROW MUTATORS
  //  These are plain functions that accept the current rows + setter so they
  //  can be shared between the "add teacher" and "edit schedule" editors.
  // ════════════════════════════════════════════════════════════════════════════

  const toggleDay = (
    rows: EditDayRow[],
    set: (r: EditDayRow[]) => void,
    day: string,
  ) =>
    set(
      rows.map((r) =>
        r.day !== day
          ? r
          : {
              ...r,
              active: !r.active,
              // keep at least one empty slot when activating
              slots: r.slots.length
                ? r.slots
                : [{ startTime: "", endTime: "" }],
            },
      ),
    );

  const addSlot = (
    rows: EditDayRow[],
    set: (r: EditDayRow[]) => void,
    day: string,
  ) =>
    set(
      rows.map((r) =>
        r.day !== day
          ? r
          : { ...r, slots: [...r.slots, { startTime: "", endTime: "" }] },
      ),
    );

  const removeSlot = (
    rows: EditDayRow[],
    set: (r: EditDayRow[]) => void,
    day: string,
    idx: number,
  ) =>
    set(
      rows.map((r) => {
        if (r.day !== day) return r;
        const updated = r.slots.filter((_, i) => i !== idx);
        // last slot removed → deactivate the day
        if (!updated.length)
          return {
            ...r,
            active: false,
            slots: [{ startTime: "", endTime: "" }],
          };
        return { ...r, slots: updated };
      }),
    );

  const updateSlot = (
    rows: EditDayRow[],
    set: (r: EditDayRow[]) => void,
    day: string,
    idx: number,
    field: "startTime" | "endTime",
    val: string,
  ) =>
    set(
      rows.map((r) =>
        r.day !== day
          ? r
          : {
              ...r,
              slots: r.slots.map((s, i) =>
                i === idx ? { ...s, [field]: val } : s,
              ),
            },
      ),
    );

  const validateRows = (rows: EditDayRow[]): boolean => {
    const active = rows.filter((r) => r.active);
    if (!active.length) {
      toast.error("Select at least one day");
      return false;
    }
    for (const row of active) {
      for (const slot of row.slots) {
        if (!slot.startTime || !slot.endTime) {
          toast.error(`Fill start & end time for every slot on ${row.day}`);
          return false;
        }
        if (slot.startTime >= slot.endTime) {
          toast.error(`End time must be after start time on ${row.day}`);
          return false;
        }
      }
    }
    return true;
  };

  // ════════════════════════════════════════════════════════════════════════════
  //  HANDLERS
  // ════════════════════════════════════════════════════════════════════════════

  const handleRemoveTeacher = async (teacherId: string) => {
    setRemovingTeacherId(teacherId);
    try {
      const res = await ClassService.removeTeacherFromClass(
        classData._id,
        teacherId,
      );
      if (res?.statusCode >= 400 || res?.error) {
        toast.error(res?.message ?? "Failed to remove teacher");
        return;
      }
      onRemoveTeacher(teacherId);
      toast.success("Teacher removed from class");
    } catch {
      toast.error("Network error, please try again");
    } finally {
      setRemovingTeacherId(null);
    }
  };

  const openAddTeacher = (profId: string) => {
    setPendingTeacherId(profId);
    setPendingSubject("");
    setPendingRows(emptyRows());
  };

  const confirmAddTeacher = async () => {
    if (!pendingTeacherId) return;
    if (!pendingSubject.trim()) {
      toast.error("Select a subject");
      return;
    }
    if (!validateRows(pendingRows)) return;

    const schedule = flattenRows(pendingRows);
    setAddingTeacher(true);
    try {
      const res = await ClassService.addTeacherToClass(classData._id, {
        teacherId: pendingTeacherId,
        subject: pendingSubject,
        schedule,
      });
      if (res?.statusCode >= 400 || res?.error) {
        toast.error(res?.message ?? "Failed to add teacher");
        return;
      }
      const prof = professors.find((p) => p._id === pendingTeacherId);
      onAddTeachers([
        {
          teacherId: prof ?? pendingTeacherId,
          subject: pendingSubject,
          schedule,
        },
      ]);
      toast.success("Teacher assigned successfully");
      setPendingTeacherId(null);
      setShowAddTeacher(false);
      setTeacherSearch("");
    } catch {
      toast.error("Network error, please try again");
    } finally {
      setAddingTeacher(false);
    }
  };

  const openEditSchedule = (t: AssignedTeacher) => {
    setEditingTeacherId(resolveTeacherId(t));
    setEditRows(buildRows(t.schedule ?? []));
  };

  const saveSchedule = async () => {
    if (!editingTeacherId || !validateRows(editRows)) return;
    const schedule = flattenRows(editRows);
    setSavingSchedule(true);
    try {
      const res = await ClassService.updateTeacherSchedule(
        classData._id,
        editingTeacherId,
        schedule,
      );
      if (res?.statusCode >= 400 || res?.error) {
        toast.error(res?.message ?? "Failed to update schedule");
        return;
      }
      onUpdateTeacherSchedule(editingTeacherId, schedule);
      toast.success("Schedule updated");
      setEditingTeacherId(null);
    } catch {
      toast.error("Network error, please try again");
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    setRemovingStudentId(studentId);
    try {
      const res = await ClassService.removeStudentFromClass(
        classData._id,
        studentId,
      );
      if (res?.statusCode >= 400 || res?.error) {
        toast.error(res?.message ?? "Failed to remove student");
        return;
      }
      onRemoveStudent(studentId);
      toast.success("Student removed from class");
    } catch {
      toast.error("Network error, please try again");
    } finally {
      setRemovingStudentId(null);
    }
  };

  const confirmAddStudents = async () => {
    if (!selectedNewStudents.length) {
      toast.error("Select at least one student");
      return;
    }
    setAddingStudents(true);
    try {
      const results = await Promise.allSettled(
        selectedNewStudents.map((id) =>
          ClassService.addStudentToClass(classData._id, id),
        ),
      );
      const succeeded = selectedNewStudents.filter(
        (_, i) => results[i].status === "fulfilled",
      );
      const failed = results.length - succeeded.length;
      onAddStudents(succeeded);
      if (failed) toast.error(`${failed} student(s) could not be added`);
      if (succeeded.length)
        toast.success(`${succeeded.length} student(s) added`);
      setSelectedNewStudents([]);
      setShowAddStudent(false);
      setStudentSearch("");
    } catch {
      toast.error("Network error, please try again");
    } finally {
      setAddingStudents(false);
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  //  REUSABLE SCHEDULE EDITOR
  // ════════════════════════════════════════════════════════════════════════════

  const ScheduleEditor = ({
    rows,
    setRows,
  }: {
    rows: EditDayRow[];
    setRows: (r: EditDayRow[]) => void;
  }) => (
    <div className="space-y-2">
      {/* Day toggle pills */}
      <div className="flex flex-wrap gap-1.5">
        {DAYS.map((day) => {
          const row = rows.find((r) => r.day === day)!;
          return (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(rows, setRows, day)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                row.active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-input hover:bg-secondary"
              }`}
            >
              {day.slice(0, 3)}
            </button>
          );
        })}
      </div>

      {/* Active day rows */}
      {rows
        .filter((r) => r.active)
        .map((row) => (
          <div
            key={row.day}
            className="rounded-lg border border-border bg-background/60 px-3 pt-2.5 pb-3 space-y-2"
          >
            {/* Day header + "Add slot" */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                {row.day}
              </span>
              <button
                type="button"
                onClick={() => addSlot(rows, setRows, row.day)}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Plus className="h-3 w-3" /> Add slot
              </button>
            </div>

            {/* Slot rows */}
            {row.slots.map((slot, idx) => (
              <div key={idx} className="flex items-end gap-2">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <div>
                    {idx === 0 && (
                      <label className="mb-0.5 block text-xs text-muted-foreground">
                        Start
                      </label>
                    )}
                    <input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) =>
                        updateSlot(
                          rows,
                          setRows,
                          row.day,
                          idx,
                          "startTime",
                          e.target.value,
                        )
                      }
                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    {idx === 0 && (
                      <label className="mb-0.5 block text-xs text-muted-foreground">
                        End
                      </label>
                    )}
                    <input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) =>
                        updateSlot(
                          rows,
                          setRows,
                          row.day,
                          idx,
                          "endTime",
                          e.target.value,
                        )
                      }
                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
                {/* Remove slot — only show when there are 2+ slots */}
                {row.slots.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSlot(rows, setRows, row.day, idx)}
                    className="mb-0.5 shrink-0 rounded-md p-1 text-destructive hover:bg-destructive/10 transition-colors"
                    title="Remove this slot"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ))}
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div>
      {/* ── Back + header ──────────────────────────────────────────────── */}
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ChevronLeft className="h-4 w-4" /> Back to Classes
      </button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-xl font-bold text-foreground sm:text-2xl"
          >
            {classData?.className}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="mt-1 text-sm text-muted-foreground"
          >
            {classData?.class === "I" ? "1st Year" : "2nd Year"} ·{" "}
            {classData?.session} · {classData?.departmentId?.name ?? ""}
          </motion.p>
        </div>
        {onViewSchedule && (
          <button
            onClick={onViewSchedule}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
          >
            <CalendarDays className="h-4 w-4 text-primary" /> Mark Attendance
          </button>
        )}
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <div className="mb-4 flex gap-1 rounded-lg border border-border bg-secondary/30 p-1 w-fit">
        {(["teachers", "students"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? "bg-card shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TEACHERS TAB                                                     */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "teachers" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {assignedTeachers.length} teacher
              {assignedTeachers.length !== 1 ? "s" : ""} assigned
            </p>
            <button
              onClick={() => {
                setShowAddTeacher(true);
                setPendingTeacherId(null);
              }}
              className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add Teacher
            </button>
          </div>

          {!assignedTeachers.length && (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              No teachers assigned yet.
            </div>
          )}

          {assignedTeachers.map((t, i) => {
            const tid = resolveTeacherId(t);
            const tname = resolveTeacherName(t);
            const isEditing = editingTeacherId === tid;

            // Group schedule by day for the read-only pills
            const byDay = DAYS.reduce<Record<string, ScheduleEntry[]>>(
              (acc, day) => {
                const entries = (t.schedule ?? []).filter((s) => s.day === day);
                if (entries.length) acc[day] = entries;
                return acc;
              },
              {},
            );

            return (
              <motion.div
                key={tid + i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-xl border border-border bg-card shadow-card overflow-hidden"
              >
                {/* Teacher row */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                      <UserCircle className="h-6 w-6 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {tname}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t.subject}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                      onClick={() =>
                        isEditing
                          ? setEditingTeacherId(null)
                          : openEditSchedule(t)
                      }
                      className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-secondary transition-colors"
                    >
                      <Pencil className="h-3 w-3" />
                      {isEditing ? "Cancel" : "Schedule"}
                    </button>
                    <button
                      onClick={() => handleRemoveTeacher(tid)}
                      disabled={removingTeacherId === tid}
                      className="flex items-center gap-1 rounded-lg border border-destructive/30 px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" />
                      {removingTeacherId === tid ? "Removing…" : "Remove"}
                    </button>
                  </div>
                </div>

                {/* Read-only schedule — grouped by day, multiple pills per day */}
                {!isEditing && Object.keys(byDay).length > 0 && (
                  <div className="border-t border-border px-4 pb-3 pt-2 space-y-1.5">
                    {Object.entries(byDay).map(([day, entries]) => (
                      <div
                        key={day}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <span className="w-8 shrink-0 text-xs font-medium text-muted-foreground">
                          {day.slice(0, 3)}
                        </span>
                        {entries.map((e, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground"
                          >
                            <Clock className="h-3 w-3" />
                            {e.startTime}–{e.endTime}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {/* Inline schedule editor */}
                <AnimatePresence>
                  {isEditing && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-border bg-secondary/20 px-4 py-4 space-y-3"
                    >
                      <p className="text-xs font-medium text-muted-foreground">
                        Toggle days · use <strong>Add slot</strong> for a second
                        lecture on the same day
                      </p>
                      <ScheduleEditor rows={editRows} setRows={setEditRows} />
                      <button
                        onClick={saveSchedule}
                        disabled={savingSchedule}
                        className="w-full rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {savingSchedule ? "Saving…" : "Save Schedule"}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* STUDENTS TAB                                                     */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "students" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {classStudents.length} student
              {classStudents.length !== 1 ? "s" : ""} enrolled
            </p>
            <button
              onClick={() => {
                setShowAddStudent(true);
                setSelectedNewStudents([]);
                setStudentSearch("");
              }}
              className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add Students
            </button>
          </div>

          {!classStudents.length && (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              No students enrolled yet.
            </div>
          )}

          {classStudents.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    {["#", "Student ID", "Name", "Action"].map((h) => (
                      <th
                        key={h}
                        className={`px-4 py-3 font-display font-semibold text-foreground ${
                          h === "Action" ? "text-right" : "text-left"
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map((s: any, i: number) => {
                    const sid = resolveStudentId(s);
                    return (
                      <motion.tr
                        key={sid}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-muted-foreground">
                          {i + 1}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {s?.specialId ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {s?.name} {s?.lastName ?? ""}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleRemoveStudent(sid)}
                            disabled={removingStudentId === sid}
                            className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 px-2.5 py-1 text-xs text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="h-3 w-3" />
                            {removingStudentId === sid ? "Removing…" : "Remove"}
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ADD TEACHER MODAL                                                */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showAddTeacher && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => {
              setShowAddTeacher(false);
              setPendingTeacherId(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="flex flex-col w-full max-w-md rounded-2xl border border-border bg-card shadow-modal max-h-[85vh]"
            >
              <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
                <h2 className="font-display text-base font-bold text-foreground">
                  Assign Teacher — {classData?.className}
                </h2>
                <button
                  onClick={() => {
                    setShowAddTeacher(false);
                    setPendingTeacherId(null);
                  }}
                  className="rounded-lg p-1 hover:bg-secondary transition-colors"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={teacherSearch}
                    onChange={(e) => setTeacherSearch(e.target.value)}
                    placeholder="Search professors…"
                    className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
                  {!filteredProfessors.length && (
                    <p className="p-4 text-center text-sm text-muted-foreground">
                      No available professors
                    </p>
                  )}
                  {filteredProfessors.map((p) => {
                    const isSelected = pendingTeacherId === p._id;
                    return (
                      <div key={p._id}>
                        <button
                          onClick={() =>
                            isSelected
                              ? setPendingTeacherId(null)
                              : openAddTeacher(p._id)
                          }
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-secondary/50 transition-colors"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
                            <UserCircle className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {p.name} {p.lastName ?? ""}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {p.department?.code ?? "—"}
                            </p>
                          </div>
                          <ChevronDown
                            className={`h-4 w-4 text-muted-foreground transition-transform ${
                              isSelected ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden bg-secondary/20 px-4 py-3 space-y-3"
                            >
                              {/* Subject */}
                              <div>
                                <label className="mb-1 block text-xs text-muted-foreground">
                                  Subject
                                </label>
                                {p.subjects?.length ? (
                                  <select
                                    value={pendingSubject}
                                    onChange={(e) =>
                                      setPendingSubject(e.target.value)
                                    }
                                    className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                  >
                                    <option value="">Select subject</option>
                                    {p.subjects.map((s: string) => (
                                      <option key={s} value={s}>
                                        {s}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    value={pendingSubject}
                                    onChange={(e) =>
                                      setPendingSubject(e.target.value)
                                    }
                                    placeholder="e.g. Physics"
                                    className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                  />
                                )}
                              </div>

                              {/* Schedule */}
                              <div>
                                <label className="mb-1.5 block text-xs text-muted-foreground">
                                  Schedule — use <strong>Add slot</strong> for
                                  multiple lectures per day
                                </label>
                                <ScheduleEditor
                                  rows={pendingRows}
                                  setRows={setPendingRows}
                                />
                              </div>

                              <button
                                onClick={confirmAddTeacher}
                                disabled={addingTeacher}
                                className="w-full rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                              >
                                {addingTeacher
                                  ? "Assigning…"
                                  : "Confirm Assignment"}
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ADD STUDENTS MODAL                                               */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showAddStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => {
              setShowAddStudent(false);
              setSelectedNewStudents([]);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="flex flex-col w-full max-w-md rounded-2xl border border-border bg-card shadow-modal max-h-[85vh]"
            >
              <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
                <div>
                  <h2 className="font-display text-base font-bold text-foreground">
                    Add Students
                  </h2>
                  {selectedNewStudents.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selectedNewStudents.length} selected
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowAddStudent(false);
                    setSelectedNewStudents([]);
                  }}
                  className="rounded-lg p-1 hover:bg-secondary transition-colors"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search by name or ID…"
                    className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="rounded-lg border border-border divide-y divide-border overflow-hidden max-h-72 overflow-y-auto">
                  {!filteredStudents.length && (
                    <p className="p-4 text-center text-sm text-muted-foreground">
                      No students available
                    </p>
                  )}
                  {filteredStudents.map((s: any) => {
                    const sid = resolveStudentId(s);
                    const checked = selectedNewStudents.includes(sid);
                    return (
                      <button
                        key={sid}
                        onClick={() =>
                          setSelectedNewStudents((prev) =>
                            checked
                              ? prev.filter((id) => id !== sid)
                              : [...prev, sid],
                          )
                        }
                        className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-secondary/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
                            <GraduationCap className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {s.name} {s.lastName ?? ""}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {s.specialId}
                            </p>
                          </div>
                        </div>
                        {checked && (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 px-6 py-4 border-t border-border shrink-0">
                <button
                  onClick={() => {
                    setShowAddStudent(false);
                    setSelectedNewStudents([]);
                  }}
                  className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAddStudents}
                  disabled={addingStudents || !selectedNewStudents.length}
                  className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {addingStudents
                    ? "Adding…"
                    : `Add ${selectedNewStudents.length || ""} Student${
                        selectedNewStudents.length !== 1 ? "s" : ""
                      }`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
