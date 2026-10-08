import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Plus,
  Save,
  Trash2,
  GraduationCap,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { ResultService } from "@/services/resultService";
import type { SubjectMark } from "@/lib/grading";
import {
  EXAM_TYPES,
  GRADE_TONE_CLASS,
  blankSubject,
  gradeFor,
  subjectMaximum,
  subjectTotal,
  totalsOf,
} from "@/lib/grading";

interface StudentResultFormProps {
  classData: any;
  student: any;
  departmentId?: string;
  onBack: () => void;
  onSaved: () => void;
}

const resolveId = (student: any): string => {
  const raw = student?._id ?? student?.userId ?? student;
  return raw?._id ? String(raw._id) : raw ? String(raw) : "";
};

const cellInput =
  "w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

const StudentResultForm = ({
  classData,
  student,
  departmentId,
  onBack,
  onSaved,
}: StudentResultFormProps) => {
  const studentId = resolveId(student);
  const session = classData?.session ?? "";

  const [examType, setExamType] = useState<string>(EXAM_TYPES[0].value);
  const [subjects, setSubjects] = useState<SubjectMark[]>([]);
  const [available, setAvailable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"draft" | "published" | "not-entered">(
    "not-entered",
  );

  /* Load the subjects available to this class and any marks already saved. */
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [subjectList, saved] = await Promise.all([
          ResultService.getSubjects(departmentId),
          ResultService.getOne(classData?._id, studentId, examType),
        ]);
        if (cancelled) return;

        setAvailable(subjectList || []);
        if (saved) {
          setSubjects(saved.subjects || []);
          setStatus(saved.status);
        } else {
          // Start with one empty row so the form is usable immediately.
          setSubjects([blankSubject()]);
          setStatus("not-entered");
        }
      } catch {
        if (!cancelled) toast.error("Could not load the result form");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [classData?._id, studentId, examType, departmentId]);

  const totals = useMemo(() => totalsOf(subjects), [subjects]);

  const updateRow = useCallback((index: number, patch: Partial<SubjectMark>) => {
    setSubjects((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }, []);

  const addRow = (preset?: any) => {
    setSubjects((current) => [...current, blankSubject(preset)]);
  };

  const removeRow = (index: number) => {
    setSubjects((current) =>
      current.length === 1 ? [blankSubject()] : current.filter((_, i) => i !== index),
    );
  };

  /* Subjects not already on the form, so the picker cannot offer duplicates. */
  const unusedSubjects = useMemo(() => {
    const used = new Set(subjects.map((s) => s.subjectId).filter(Boolean));
    return available.filter((s) => !used.has(String(s._id)));
  }, [available, subjects]);

  const handleSave = async () => {
    const filled = subjects.filter((s) => s.name.trim() !== "");
    if (filled.length === 0) {
      toast.error("Add at least one subject before saving");
      return;
    }

    setSaving(true);
    try {
      await ResultService.save({
        classId: classData?._id,
        studentId,
        examType,
        session,
        subjects: filled,
      });
      setStatus("draft");
      toast.success(`Result saved for ${student?.name ?? "student"}`);
      onSaved();
    } catch {
      toast.error("Failed to save the result");
    } finally {
      setSaving(false);
    }
  };

  const rowGrade = (row: SubjectMark) => {
    const max = subjectMaximum(row);
    if (max <= 0) return null;
    return gradeFor((subjectTotal(row) / max) * 100);
  };

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ChevronLeft className="h-4 w-4" /> Back to Results
      </button>

      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 0, y: 0 }}
        className="mb-1 font-display text-xl font-bold text-foreground sm:text-2xl"
      >
        {student?.name} {student?.lastName}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
        className="mb-6 text-sm text-muted-foreground"
      >
        {classData?.className} · {session}
        {student?.specialId ? ` · ${student.specialId}` : ""}
      </motion.p>

      {/* Exam type — switching it loads that exam's saved marks. */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Exam
          <select
            value={examType}
            onChange={(e) => setExamType(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {EXAM_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        {status === "published" && (
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
            Published — visible to the student
          </span>
        )}
        {status === "draft" && (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
            Draft — not visible to the student yet
          </span>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-2 text-sm text-muted-foreground">Loading result...</p>
        </div>
      ) : (
        <>
          {/* Subject + marks table */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="overflow-x-auto rounded-xl border border-border bg-card shadow-card"
          >
            <table className="w-full min-w-[880px]">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  {["Subject", "Theory", "Out of", "Practical", "Out of", "Total", "Grade", ""].map(
                    (h, i) => (
                      <th
                        key={`${h}-${i}`}
                        className="p-3 text-left text-sm font-medium text-muted-foreground"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {subjects.map((row, index) => {
                  const rowG = rowGrade(row);
                  return (
                    <tr
                      key={index}
                      className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors"
                    >
                      <td className="p-2">
                        <input
                          value={row.name}
                          onChange={(e) => updateRow(index, { name: e.target.value })}
                          placeholder="Subject name"
                          list="result-subject-options"
                          className={cellInput}
                        />
                      </td>
                      <td className="w-20 p-2">
                        <input
                          type="number"
                          min={0}
                          max={row.maxTheoretical}
                          value={row.theoretical}
                          onChange={(e) =>
                            updateRow(index, { theoretical: Number(e.target.value) || 0 })
                          }
                          className={`${cellInput} text-center`}
                        />
                      </td>
                      <td className="w-16 p-2">
                        <input
                          type="number"
                          min={0}
                          value={row.maxTheoretical}
                          onChange={(e) =>
                            updateRow(index, {
                              maxTheoretical: Number(e.target.value) || 0,
                            })
                          }
                          className={`${cellInput} text-center text-muted-foreground`}
                        />
                      </td>
                      <td className="w-20 p-2">
                        <input
                          type="number"
                          min={0}
                          max={row.maxPractical}
                          value={row.practical}
                          onChange={(e) =>
                            updateRow(index, { practical: Number(e.target.value) || 0 })
                          }
                          className={`${cellInput} text-center`}
                        />
                      </td>
                      <td className="w-16 p-2">
                        <input
                          type="number"
                          min={0}
                          value={row.maxPractical}
                          onChange={(e) =>
                            updateRow(index, {
                              maxPractical: Number(e.target.value) || 0,
                            })
                          }
                          className={`${cellInput} text-center text-muted-foreground`}
                        />
                      </td>
                      <td className="p-3 text-center text-sm font-medium">
                        {subjectTotal(row)}
                        <span className="text-muted-foreground">
                          /{subjectMaximum(row)}
                        </span>
                      </td>
                      <td className="p-3">
                        {rowG ? (
                          <span
                            className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                              GRADE_TONE_CLASS[rowG.tone]
                            }`}
                          >
                            {rowG.letter}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-2">
                        <button
                          onClick={() => removeRow(index)}
                          aria-label={`Remove ${row.name || "subject"}`}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Add subject */}
            <div className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-3">
              <button
                onClick={() => addRow()}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add subject
              </button>

              {unusedSubjects.length > 0 && (
                <select
                  value=""
                  onChange={(e) => {
                    const picked = unusedSubjects.find(
                      (s) => String(s._id) === e.target.value,
                    );
                    if (picked) addRow(picked);
                  }}
                  className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label="Pick from department subjects"
                >
                  <option value="">Pick a subject...</option>
                  {unusedSubjects.map((s) => (
                    <option key={s._id} value={String(s._id)}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </motion.div>

          {/* Hidden datalist powers the "Subject name" autocomplete. */}
          <datalist id="result-subject-options">
            {available.map((s) => (
              <option key={s._id} value={s.name} />
            ))}
          </datalist>

          {/* Running totals */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5"
          >
            <div className="rounded-xl border border-border bg-card p-3 shadow-card">
              <p className="text-xs text-muted-foreground">Obtained</p>
              <p className="font-display text-lg font-bold">
                {totals.obtained}
                <span className="text-sm font-normal text-muted-foreground">
                  /{totals.maximum}
                </span>
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 shadow-card">
              <p className="text-xs text-muted-foreground">Percentage</p>
              <p className="font-display text-lg font-bold">
                {totals.percentage}%
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 shadow-card">
              <p className="text-xs text-muted-foreground">GPA</p>
              <p className="font-display text-lg font-bold">{totals.gpa}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 shadow-card">
              <p className="text-xs text-muted-foreground">Grade</p>
              <p
                className={`mt-1 inline-block rounded-md px-2 py-0.5 text-sm font-medium ${
                  GRADE_TONE_CLASS[totals.grade.tone]
                }`}
              >
                {totals.subjectCount > 0 ? totals.grade.letter : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 shadow-card">
              <p className="text-xs text-muted-foreground">Result</p>
              {totals.subjectCount === 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">—</p>
              ) : totals.grade.isPass ? (
                <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> Pass
                </span>
              ) : (
                <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-red-600">
                  <AlertTriangle className="h-4 w-4" /> Fail
                </span>
              )}
            </div>
          </motion.div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <GraduationCap className="h-4 w-4" />
              {totals.subjectCount} subject{totals.subjectCount === 1 ? "" : "s"} entered
            </p>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save result"}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default StudentResultForm;