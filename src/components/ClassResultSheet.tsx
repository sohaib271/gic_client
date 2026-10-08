import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Search,
  Send,
  Users,
  Award,
  BarChart3,
  CheckCircle2,
  XCircle,
  PencilLine,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { ResultService } from "@/services/resultService";
import type { ClassResultSheet } from "@/services/resultService";
import { EXAM_TYPES, GRADE_TONE_CLASS, gradeFor } from "@/lib/grading";
import StudentResultForm from "@/components/StudentResultForm";
import PaginationControls from "@/components/PaginationControls";
import { usePagination } from "@/hooks/usePagination";

interface ClassResultSheetProps {
  classData: any;
  departmentId?: string;
  onBack: () => void;
}

const StatCard = ({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: any;
  tone?: "emerald" | "red" | "amber";
}) => {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-600"
      : tone === "red"
        ? "text-red-600"
        : tone === "amber"
          ? "text-amber-600"
          : "text-primary";

  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-card">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${toneClass}`} />
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="mt-1 font-display text-lg font-bold text-foreground">{value}</p>
    </div>
  );
};

const ClassResultSheet = ({
  classData,
  departmentId,
  onBack,
}: ClassResultSheetProps) => {
  const session = classData?.session ?? "";

  const [examType, setExamType] = useState<string>(EXAM_TYPES[0].value);
  const [sheet, setSheet] = useState<ClassResultSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<any>(null);

  const students: any[] = useMemo(
    () => classData?.classStudents ?? [],
    [classData],
  );

  const load = useCallback(async () => {
    if (!classData?._id) return;
    setLoading(true);
    try {
      const data = await ResultService.getClassSheet(
        classData._id,
        examType,
        session,
        students,
      );
      setSheet(data);
    } catch {
      toast.error("Could not load the result sheet");
    } finally {
      setLoading(false);
    }
  }, [classData?._id, examType, session, students]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const rows = sheet?.rows ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.name, r.lastName, r.specialId]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q)),
    );
  }, [sheet, search]);

  const { page, setPage, pageItems, pageSize, total } = usePagination(
    filteredRows,
    10,
  );

  const handlePublish = async () => {
    if (!sheet || sheet.summary.entered === 0) {
      toast.error("Enter at least one result before publishing");
      return;
    }

    const pending = sheet.summary.entered - sheet.summary.published;
    if (pending === 0) {
      toast.info("Everything is already published");
      return;
    }

    if (!window.confirm(`Publish ${pending} result(s) to students?`)) return;

    setPublishing(true);
    try {
      const res = await ResultService.publish({
        classId: classData._id,
        examType,
        session,
      });
      toast.success(`Published ${res.published} result(s)`);
      await load();
    } catch {
      toast.error("Failed to publish results");
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async (row: any) => {
    try {
      await ResultService.unpublish(classData._id, row.studentId, examType);
      toast.success("Moved back to draft");
      await load();
    } catch {
      toast.error("Failed to revert the result");
    }
  };

  /* Per-student form takes over the whole page while it is open. */
  if (editing) {
    return (
      <StudentResultForm
        classData={classData}
        student={editing}
        departmentId={departmentId}
        onBack={() => setEditing(null)}
        onSaved={() => void load()}
      />
    );
  }

  const summary = sheet?.summary;

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ChevronLeft className="h-4 w-4" /> Back to Classes
      </button>

      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 0, y: 0 }}
        className="mb-1 font-display text-xl font-bold text-foreground sm:text-2xl"
      >
        {classData?.className}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
        className="mb-6 text-sm text-muted-foreground"
      >
        Results · {session}
      </motion.p>

      {/* Exam selector + publish */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
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

          <button
            onClick={handlePublish}
            disabled={publishing}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {publishing ? "Publishing..." : "Publish all"}
          </button>
        </div>

        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student..."
            className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
      >
        <StatCard label="Students" value={summary?.students ?? 0} icon={Users} />
        <StatCard label="Entered" value={summary?.entered ?? 0} icon={PencilLine} tone="amber" />
        <StatCard label="Published" value={summary?.published ?? 0} icon={Send} tone="emerald" />
        <StatCard label="Pass Rate" value={`${summary?.passPercentage ?? 0}%`} icon={CheckCircle2} />
        <StatCard label="Failed" value={summary?.failed ?? 0} icon={XCircle} tone="red" />
        <StatCard label="Average" value={`${summary?.averagePercentage ?? 0}%`} icon={BarChart3} />
      </motion.div>

      {/* Results table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="overflow-hidden rounded-xl border border-border bg-card shadow-card"
      >
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="mt-2 text-sm text-muted-foreground">Loading results...</p>
          </div>
        ) : pageItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-center">
            <Award className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {search ? "No student matches that search." : "This class has no students yet."}
            </p>
          </div>
        ) : (
          <>
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  {["S.No", "Student ID", "Name", "Subjects", "Obtained", "Percentage", "Grade", "Status", "Action"].map(
                    (h) => (
                      <th
                        key={h}
                        className="p-3 text-left text-sm font-medium text-muted-foreground"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {pageItems.map((row, i) => {
                  const grade =
                    row.status === "not-entered" ? null : gradeFor(row.percentage);
                  return (
                    <motion.tr
                      key={row.studentId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors"
                    >
                      <td className="p-3 text-sm text-muted-foreground">
                        {String((page - 1) * pageSize + i + 1).padStart(2, "0")}
                      </td>
                      <td className="p-3 text-sm font-medium">{row.specialId}</td>
                      <td className="p-3 text-sm">
                        {row.name} {row.lastName}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {row.subjectCount > 0 ? row.subjectCount : "—"}
                      </td>
                      <td className="p-3 text-sm">
                        {row.maximum > 0 ? (
                          <>
                            {row.obtained}
                            <span className="text-muted-foreground">/{row.maximum}</span>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-3 text-sm">
                        {row.maximum > 0 ? `${row.percentage}%` : "—"}
                      </td>
                      <td className="p-3">
                        {grade ? (
                          <span
                            className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                              GRADE_TONE_CLASS[grade.tone]
                            }`}
                          >
                            {grade.letter}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            row.status === "published"
                              ? "bg-emerald-100 text-emerald-800"
                              : row.status === "draft"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {row.status === "not-entered"
                            ? "Not entered"
                            : row.status === "published"
                              ? "Published"
                              : "Draft"}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setEditing(
                                students.find(
                                  (s: any) =>
                                    String(s?._id ?? s?.userId ?? s) === row.studentId,
                                ) ?? row,
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                          >
                            <PencilLine className="h-3 w-3" />
                            {row.status === "not-entered" ? "Enter" : "Edit"}
                          </button>

                          {row.status === "published" && (
                            <button
                              onClick={() => handleUnpublish(row)}
                              title="Move back to draft"
                              className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary transition-colors"
                            >
                              <RefreshCw className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>

            <PaginationControls
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
            />
          </>
        )}
      </motion.div>
    </div>
  );
};

export default ClassResultSheet;