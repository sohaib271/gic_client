import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Building2, School, BookOpen, Users, ChevronDown, ChevronLeft, Search, Check, UserCircle, Clock } from "lucide-react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { useClasses } from "@/hooks/useClasses";
import { useUsers } from "@/hooks/useUsers";
import { useDepartments } from "@/hooks/useDepartments";
import { useClassForm } from "@/hooks/useClassForm";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ALL_SEMESTERS = [
  { label: "1st", value: "I" }, { label: "2nd", value: "II" }, { label: "3rd", value: "III" },
  { label: "4th", value: "IV" }, { label: "5th", value: "V" }, { label: "6th", value: "VI" },
  { label: "7th", value: "VII" }, { label: "8th", value: "VIII" },
];

const HodClasses = () => {
  const user = useSelector((state: any) => state?.user.user);
  const { data: departments } = useDepartments();
 
  const { data: users } = useUsers("");

  const deptId: string = user?.department?._id ?? user?.department ?? "";
   const { data: classes, refetch, isLoading } = useClasses("",deptId);
  const deptCategory: string =
    user?.department?.category ??
    (departments || []).find((d: any) => d?._id === deptId)?.category ??
    "intermediate";

  const isIntermediate = deptCategory === "intermediate";
  const programType = isIntermediate ? "intermediate" : "bs_adp";

  const { profUsers, deptStudents } = useMemo(() => {
    if (!users) return { profUsers: [], deptStudents: [] };
    const sameDept = (u: any) => (u?.department?._id ?? u?.department) === deptId;
    return {
      profUsers: users.filter((u: any) => u.role === "proff" && sameDept(u)),
      deptStudents: users.filter((u: any) => u.role === "student" && sameDept(u)),
    };
  }, [users, deptId]);

  const deptClasses = useMemo(
    () =>
      (classes || []).filter(
        (c: any) => (c?.departmentId?._id ?? c?.departmentId) === deptId,
      ),
    [classes, deptId],
  );
  console.log(deptClasses)

  const [showForm, setShowForm] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any>(null);

  const getDeptCode = (id: string) => {
    const dept = (departments || []).find((d: any) => d._id === id) as any;
    return dept?.code ?? user?.department?.code ?? "DEP";
  };

  const cf = useClassForm({
    category: programType,
    getDeptCode,
    programPrefix: isIntermediate ? undefined : "BS",
  });

  // Lock department to HOD's
  const openForm = () => {
    cf.setForm((f: any) => ({ ...f, departmentId: deptId }));
    setShowForm(true);
  };

  const closeForm = () => cf.resetForm(() => setShowForm(false));

  const filteredStudents = deptStudents.filter(
    (s: any) =>
      s?.name?.toLowerCase().includes(cf.studentSearch.toLowerCase()) ||
      s?.specialId?.toLowerCase().includes(cf.studentSearch.toLowerCase()),
  );

  if (!user?.isHod) {
    return <div className="p-6 text-sm text-muted-foreground">Access denied.</div>;
  }

  // Class detail (read-only)
  if (selectedClass) {
    const assignedTeachers = selectedClass.assignes || [];
    const classStudents = selectedClass.classStudents || [];
    return (
      <div>
        <button onClick={() => setSelectedClass(null)}
          className="mb-4 flex items-center gap-1 text-sm text-primary hover:underline">
          <ChevronLeft className="h-4 w-4" /> Back to Classes
        </button>
        <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">
          {selectedClass.className}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground mb-6">
          {selectedClass?.departmentId?.name ?? user?.department?.name} · {selectedClass?.session}
        </p>

        <h3 className="text-sm font-semibold text-foreground mb-3">
          Assigned Teachers ({assignedTeachers.length})
        </h3>
        <div className="space-y-2 mb-6">
          {assignedTeachers.map((t: any, i: number) => {
            const tname = typeof t.teacherId === "object"
              ? `${t.teacherId.name ?? ""} ${t.teacherId.lastName ?? ""}`.trim()
              : "Teacher";
            return (
              <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserCircle className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{tname}</p>
                    <p className="text-xs text-muted-foreground">{t.subject}</p>
                  </div>
                </div>
                {t.schedule?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {t.schedule.map((s: any, idx: number) => (
                      <span key={idx} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs">
                        <Clock className="h-3 w-3" /> {s.day.slice(0, 3)} {s.startTime}–{s.endTime}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {assignedTeachers.length === 0 && (
            <p className="text-sm text-muted-foreground">No teachers assigned.</p>
          )}
        </div>

        <h3 className="text-sm font-semibold text-foreground mb-3">
          Enrolled Students ({classStudents.length})
        </h3>
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                {["#", "Student ID", "Name"].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {classStudents.map((s: any, i: number) => (
                <tr key={s?._id ?? i} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-2 font-medium">{s?.specialId ?? "—"}</td>
                  <td className="px-4 py-2">{s?.name} {s?.lastName ?? ""}</td>
                </tr>
              ))}
              {classStudents.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">No students enrolled.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" /> Department Classes
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {user?.department?.code ?? user?.department?.name ?? "Your department"} · {isIntermediate ? "Intermediate" : "BS / ADP"}
          </p>
        </div>
        <button onClick={openForm}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> Add Class
        </button>
      </motion.div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-card border border-border animate-pulse" />)}
        </div>
      )}

      {!isLoading && deptClasses.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <School className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No classes yet. Click "Add Class" to create one.</p>
        </div>
      )}

      {!isLoading && deptClasses.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {deptClasses.map((cls: any, i: number) => (
            <motion.button key={cls._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }} onClick={() => setSelectedClass(cls)}
              className="text-left rounded-xl border border-border bg-card p-4 shadow-card hover:shadow-lg transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <School className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-sm font-bold truncate">{cls.className}</h3>
                  <p className="text-xs text-muted-foreground">{cls.session} · {cls.category}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" /> {(cls.classStudents || []).length} students
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                  <BookOpen className="h-3 w-3" /> {(cls.assignes || []).length} teachers
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {/* ── Create Class Modal ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={closeForm} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="flex flex-col w-full max-w-lg rounded-2xl border border-border bg-card shadow-modal max-h-[90vh]">
              <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-border">
                <div>
                  <h2 className="font-display text-lg font-bold">
                    Add {isIntermediate ? "Intermediate" : "BS / ADP"} Class
                  </h2>
                  {cf.generatedClassName && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Name: <span className="font-mono text-primary">{cf.generatedClassName}</span>
                    </p>
                  )}
                </div>
                <button onClick={closeForm} className="rounded-lg p-1 hover:bg-secondary">
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
                {/* Locked department */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Department (locked)</label>
                  <input value={user?.department?.code ?? user?.department?.name ?? ""} disabled
                    className="w-full rounded-lg border border-input bg-secondary/40 px-3 py-2 text-sm text-foreground" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Session</label>
                    <input value={cf.form.session} onChange={cf.set("session")} placeholder="2024-2028"
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Section</label>
                    <input value={cf.form.section} onChange={cf.set("section")} placeholder="CS1" maxLength={3}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                </div>

                {isIntermediate ? (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Part</label>
                    <select value={cf.form.class} onChange={cf.set("class")}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="I">Part I (1st Year)</option>
                      <option value="II">Part II (2nd Year)</option>
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Program</label>
                      <select value={cf.form.program} onChange={cf.set("program")}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                        <option value="bs">BS</option>
                        <option value="adp">ADP</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Semester</label>
                      <select value={cf.form.semester} onChange={cf.set("semester")}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                        {(cf.form.program === "adp" ? ALL_SEMESTERS.slice(0, 4) : ALL_SEMESTERS).map((s) => (
                          <option key={s.value} value={s.value}>{s.label} Semester</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Assign Teachers */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Assign Teachers {cf.assignedTeachers.length > 0 && <span className="text-primary">({cf.assignedTeachers.length} assigned)</span>}
                  </label>
                  {cf.assignedTeachers.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {cf.assignedTeachers.map((t) => {
                        const prof = profUsers.find((p: any) => p._id === t.teacherId);
                        return (
                          <span key={t.teacherId} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                            {prof?.name ?? "Teacher"} · {t.subject}
                            <button onClick={() => cf.removeTeacher(t.teacherId)}><X className="h-3 w-3" /></button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <button onClick={() => cf.setTeacherDropdownOpen(!cf.teacherDropdownOpen)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-left text-muted-foreground hover:bg-secondary/50">
                    + Select a teacher
                  </button>
                  <AnimatePresence>
                    {cf.teacherDropdownOpen && (
                      <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                        className="mt-1 rounded-lg border border-border bg-card shadow-elevated max-h-72 overflow-y-auto">
                        {profUsers.length === 0 && (
                          <p className="p-4 text-center text-sm text-muted-foreground">No professors in your department</p>
                        )}
                        {profUsers.map((p: any) => {
                          const already = cf.assignedTeachers.some((t) => t.teacherId === p._id);
                          const isExpanded = cf.expandedTeacher === p._id;
                          const isPending = cf.pendingTeacher?.teacherId === p._id;
                          return (
                            <div key={p._id} className="border-b border-border last:border-0">
                              <button onClick={() => {
                                if (already) { cf.removeTeacher(p._id); return; }
                                if (isExpanded) { cf.setExpandedTeacher(null); cf.setPendingTeacher(null); return; }
                                cf.openTeacherConfig(p._id);
                              }} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-secondary/50">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <UserCircle className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{p.name} {p.lastName}</p>
                                </div>
                                {already
                                  ? <span className="text-xs text-primary flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Assigned</span>
                                  : <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                }
                              </button>
                              <AnimatePresence>
                                {isExpanded && isPending && !already && (
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden bg-secondary/20 px-4 py-3 space-y-2">
                                    <div>
                                      <label className="mb-1 block text-xs text-muted-foreground">Subject</label>
                                      {p.subjects?.length > 0 ? (
                                        <select value={cf.pendingTeacher?.subject}
                                          onChange={(e) => cf.setPendingTeacher((pt: any) => pt ? { ...pt, subject: e.target.value } : pt)}
                                          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm">
                                          <option value="">Select subject</option>
                                          {p.subjects.map((s: string) => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                      ) : (
                                        <input value={cf.pendingTeacher?.subject}
                                          onChange={(e) => cf.setPendingTeacher((pt: any) => pt ? { ...pt, subject: e.target.value } : pt)}
                                          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
                                      )}
                                    </div>
                                    <div>
                                      <label className="mb-1 block text-xs text-muted-foreground">Days</label>
                                      <div className="flex flex-wrap gap-1.5">
                                        {DAYS.map((d) => {
                                          const sel = cf.pendingTeacher?.days.includes(d) ?? false;
                                          return (
                                            <button key={d} type="button"
                                              onClick={() => cf.setPendingTeacher((pt: any) => pt
                                                ? { ...pt, days: sel ? pt.days.filter((x: string) => x !== d) : [...pt.days, d] }
                                                : pt)}
                                              className={`rounded-full px-2.5 py-1 text-xs border ${sel ? "bg-primary text-primary-foreground border-primary" : "bg-background border-input"}`}>
                                              {d.slice(0, 3)}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <input type="time" value={cf.pendingTeacher?.startTime}
                                        onChange={(e) => cf.setPendingTeacher((pt: any) => pt ? { ...pt, startTime: e.target.value } : pt)}
                                        className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
                                      <input type="time" value={cf.pendingTeacher?.endTime}
                                        onChange={(e) => cf.setPendingTeacher((pt: any) => pt ? { ...pt, endTime: e.target.value } : pt)}
                                        className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
                                    </div>
                                    <button onClick={cf.confirmTeacher}
                                      className="w-full rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                                      Confirm Assignment
                                    </button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Students */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Add Students {cf.selectedStudents.length > 0 && <span className="text-primary">({cf.selectedStudents.length})</span>}
                  </label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input value={cf.studentSearch} onChange={(e) => cf.setStudentSearch(e.target.value)}
                      placeholder="Search students..."
                      className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm" />
                  </div>
                  <div className="max-h-44 overflow-y-auto rounded-lg border border-border">
                    {filteredStudents.length === 0 && (
                      <p className="p-3 text-center text-sm text-muted-foreground">No students</p>
                    )}
                    {filteredStudents.map((s: any) => (
                      <button key={s._id}
                        onClick={() => cf.setSelectedStudents((prev) =>
                          prev.includes(s._id) ? prev.filter((id) => id !== s._id) : [...prev, s._id])}
                        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-secondary/50 border-b border-border last:border-0">
                        <div>
                          <p className="text-sm">{s.name} {s.lastName}</p>
                          <p className="text-xs text-muted-foreground">{s.specialId}</p>
                        </div>
                        {cf.selectedStudents.includes(s._id) && <Check className="h-4 w-4 text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 px-6 py-4 border-t border-border">
                <button onClick={closeForm}
                  className="flex-1 rounded-lg border border-border px-4 py-2 text-sm hover:bg-secondary">
                  Cancel
                </button>
                <button onClick={() => cf.handleSubmit(async () => { await refetch(); closeForm(); toast.success("Class created"); })}
                  disabled={cf.saving}
                  className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {cf.saving ? "Saving..." : "Add Class"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HodClasses;