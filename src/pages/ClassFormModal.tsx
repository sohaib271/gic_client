// components/ClassFormModal.tsx
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Check, X, UserCircle, Search } from "lucide-react";
import { AssignedTeacher } from "@/hooks/useClassForm";
import { WEEKDAYS as DAYS } from "@/lib/academic";


interface ClassFormModalProps {
  show: boolean;
  title: string;
  generatedClassName: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: () => void;
  // form fields (rendered by parent since they differ)
  formFields: React.ReactNode;
  // shared state
  classSubjects: string[];
  setClassSubjects: (fn: (prev: string[]) => string[]) => void;
  assignedTeachers: AssignedTeacher[];
  professors: any[];
  pendingTeacher: { teacherId: string; subject: string; days: string[]; startTime: string; endTime: string } | null;
  setPendingTeacher: (pt: any) => void;
  expandedTeacher: string | null;
  setExpandedTeacher: (id: string | null) => void;
  teacherDropdownOpen: boolean;
  setTeacherDropdownOpen: (v: boolean) => void;
  openTeacherConfig: (id: string) => void;
  confirmTeacher: () => void;
  removeTeacher: (id: string) => void;
  selectedStudents: string[];
  setSelectedStudents: (fn: (prev: string[]) => string[]) => void;
  studentSearch: string;
  setStudentSearch: (v: string) => void;
  filteredStudents: any[];
}

export const ClassFormModal = ({
  show, title, generatedClassName, saving,
  onClose, onSubmit, formFields,
  classSubjects, setClassSubjects,
  assignedTeachers, professors,
  pendingTeacher, setPendingTeacher,
  expandedTeacher, setExpandedTeacher,
  teacherDropdownOpen, setTeacherDropdownOpen,
  openTeacherConfig, confirmTeacher, removeTeacher,
  selectedStudents, setSelectedStudents,
  studentSearch, setStudentSearch,
  filteredStudents,
}: ClassFormModalProps) => (
  <AnimatePresence>
    {show && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        onClick={onClose}>
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()}
          className="flex flex-col w-full max-w-lg rounded-2xl border border-border bg-card shadow-modal max-h-[90vh]">

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border shrink-0">
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
              {generatedClassName && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Name: <span className="font-mono font-medium text-primary">{generatedClassName}</span>
                </p>
              )}
            </div>
            <button onClick={onClose} className="rounded-lg p-1 hover:bg-secondary transition-colors">
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">

            {/* ── Parent-injected fields (dept, session, part/program/semester) ── */}
            {formFields}

            {/* ── Subjects ── */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Subjects <span className="text-muted-foreground/60">(auto-added from assigned teachers)</span>
              </label>
              <div className="min-h-[40px] flex flex-wrap gap-2 rounded-lg border border-input bg-background px-3 py-2">
                {classSubjects.length === 0 && (
                  <span className="text-xs text-muted-foreground">Subjects will appear as you assign teachers</span>
                )}
                {classSubjects.map((sub) => (
                  <span key={sub} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {sub}
                    <button onClick={() => setClassSubjects((p) => p.filter((s) => s !== sub))} className="ml-0.5 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input id="extra-subject-input" placeholder="Add extra subject manually..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val && !classSubjects.includes(val)) setClassSubjects((p) => [...p, val]);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }}
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                <button onClick={() => {
                  const input = document.getElementById("extra-subject-input") as HTMLInputElement;
                  const val = input?.value.trim();
                  if (val && !classSubjects.includes(val)) { setClassSubjects((p) => [...p, val]); input.value = ""; }
                }} className="rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-secondary transition-colors">
                  Add
                </button>
              </div>
            </div>

            {/* ── Assign Teachers ── */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Assign Teachers
                {assignedTeachers.length > 0 && <span className="ml-1 text-primary">({assignedTeachers.length} assigned)</span>}
              </label>

              {assignedTeachers.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {assignedTeachers.map((t) => {
                    const prof = professors.find((p: any) => p._id === t.teacherId) as any;
                    return (
                      <span key={t.teacherId} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        {prof?.name ?? "Teacher"} · {t.subject} · {t.schedule.map((s) => `${s.day} ${s.startTime}–${s.endTime}`).join(", ")}
                        <button onClick={() => removeTeacher(t.teacherId)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                      </span>
                    );
                  })}
                </div>
              )}

              <button onClick={() => setTeacherDropdownOpen(!teacherDropdownOpen)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-left text-muted-foreground hover:bg-secondary/50 transition-colors">
                + Select a teacher to assign
              </button>

              <AnimatePresence>
                {teacherDropdownOpen && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="mt-1 rounded-lg border border-border bg-card shadow-elevated max-h-72 overflow-y-auto">
                    {professors.length === 0 && (
                      <p className="p-4 text-center text-sm text-muted-foreground">No professors loaded</p>
                    )}
                    {professors.map((p: any) => {
                      const alreadyAssigned = assignedTeachers.some((t) => t.teacherId === p._id);
                      const isExpanded      = expandedTeacher === p._id;
                      const isPending       = pendingTeacher?.teacherId === p._id;
                      return (
                        <div key={p._id} className="border-b border-border last:border-0">
                          <button
                            onClick={() => {
                              if (alreadyAssigned) { removeTeacher(p._id); return; }
                              if (isExpanded) { setExpandedTeacher(null); setPendingTeacher(null); return; }
                              openTeacherConfig(p._id);
                              setTeacherDropdownOpen(true);
                            }}
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-secondary/50 transition-colors">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <UserCircle className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{p.name} {p.lastName}</p>
                              <p className="text-xs text-muted-foreground">{p.department?.code ?? "—"}</p>
                            </div>
                            {alreadyAssigned
                              ? <span className="text-xs text-primary flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Assigned</span>
                              : <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            }
                          </button>

                          <AnimatePresence>
                            {isExpanded && isPending && !alreadyAssigned && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-secondary/20 px-4 py-3 space-y-2">
                                <div>
                                  <label className="mb-1 block text-xs text-muted-foreground">Subject</label>
                                  {p.subjects?.length > 0 ? (
                                    <select value={pendingTeacher?.subject}
                                      onChange={(e) => setPendingTeacher((pt: any) => pt ? { ...pt, subject: e.target.value } : pt)}
                                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                                      <option value="">Select subject</option>
                                      {p.subjects.map((s: string) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                  ) : (
                                    <input value={pendingTeacher?.subject}
                                      onChange={(e) => setPendingTeacher((pt: any) => pt ? { ...pt, subject: e.target.value } : pt)}
                                      placeholder="e.g. Physics"
                                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                  )}
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs text-muted-foreground">
                                    Days (same time for all)
                                    {pendingTeacher?.days.length ? <span className="ml-1 text-primary">({pendingTeacher.days.length} selected)</span> : null}
                                  </label>
                                  <div className="flex flex-wrap gap-2">
                                    {DAYS.map((d) => {
                                      const isSelected = pendingTeacher?.days.includes(d) ?? false;
                                      return (
                                        <button key={d} type="button"
                                          onClick={() => setPendingTeacher((pt: any) => pt
                                            ? { ...pt, days: isSelected ? pt.days.filter((day: string) => day !== d) : [...pt.days, d] }
                                            : pt
                                          )}
                                          className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-input hover:bg-secondary"}`}>
                                          {d.slice(0, 3)}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="mb-1 block text-xs text-muted-foreground">Start time</label>
                                    <input type="time" value={pendingTeacher?.startTime}
                                      onChange={(e) => setPendingTeacher((pt: any) => pt ? { ...pt, startTime: e.target.value } : pt)}
                                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs text-muted-foreground">End time</label>
                                    <input type="time" value={pendingTeacher?.endTime}
                                      onChange={(e) => setPendingTeacher((pt: any) => pt ? { ...pt, endTime: e.target.value } : pt)}
                                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                  </div>
                                </div>
                                <button onClick={confirmTeacher}
                                  className="w-full rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
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

            {/* ── Students ── */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Add Students
                {selectedStudents.length > 0 && <span className="ml-1 text-primary">({selectedStudents.length} selected)</span>}
              </label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search by name or ID..."
                  className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="max-h-44 overflow-y-auto rounded-lg border border-border">
                {filteredStudents.length === 0 && (
                  <p className="p-4 text-center text-sm text-muted-foreground">No students found</p>
                )}
                {filteredStudents.map((s: any) => (
                  <button key={s._id}
                    onClick={() => setSelectedStudents((prev) =>
                      prev.includes(s._id) ? prev.filter((id) => id !== s._id) : [...prev, s._id]
                    )}
                    className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-secondary/50 transition-colors border-b border-border last:border-0">
                    <div>
                      <p className="text-sm text-foreground">{s.name} {s.lastName}</p>
                      <p className="text-xs text-muted-foreground">{s.specialId}</p>
                    </div>
                    {selectedStudents.includes(s._id) && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Section (always last) ── */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Section <span className="text-muted-foreground/60">(2 letters + 1 number, e.g. CS1)</span>
              </label>
              <input
                value={pendingTeacher === null ? "" : undefined} // controlled by parent via formFields
                id="section-input"
                placeholder="CS1" maxLength={3}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-4 border-t border-border shrink-0">
            <button onClick={onClose}
              className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors">
              Cancel
            </button>
            <button onClick={onSubmit} disabled={saving}
              className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
              {saving ? "Saving..." : "Add Class"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
