import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  TrendingUp,
  Search,
  GraduationCap,
  CalendarClock,
  Mail,
  Phone,
  Building2,
  BookOpen,
  Clock3,
  UserCheck2,
  UserX2,
  MailWarning,
  Loader2,
  Sparkles,
  ShieldCheck,
  FileDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import ClassService from "@/services/classService";
import UserService from "@/services/userService";
import { toast } from "sonner";

interface ProgressData {
  profile?: Record<string, any>;
  attendance?: {
    total: number;
    present: number;
    absent: number;
    leave: number;
    percentage: number;
  };
}

const categoryLabel = (c?: string) => {
  switch (c) {
    case "intermediate":
      return "Intermediate";
    case "bs":
      return "BS";
    case "adp":
      return "ADP";
    default:
      return c ?? "—";
  }
};

const statusMeta = (p: Record<string, any>) => {
  if (p.struckOff)
    return { label: "Struck Off", cls: "bg-destructive/10 text-destructive" };
  if (p.isActive === false)
    return { label: "Disabled", cls: "bg-amber-50 text-amber-600" };
  return { label: "Active", cls: "bg-emerald-50 text-emerald-600" };
};

const Donut = ({ value, color }: { value: number; color: string }) => {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(value, 100));

  return (
    <div className="relative h-36 w-36">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          strokeWidth="12"
          className="stroke-secondary/70"
        />
        <motion.circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          className="[stroke-dasharray:339.29]"
          stroke={color}
          initial={{ strokeDashoffset: 339.29 }}
          animate={{
            strokeDashoffset: 339.29 * (1 - clamped / 100),
            transition: { duration: 1, ease: "easeOut" },
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-bold text-foreground">
          {clamped}%
        </span>
        <span className="text-[11px] text-muted-foreground">attendance</span>
      </div>
    </div>
  );
};

const highlight = (pct: number) =>
  pct >= 75 ? "text-emerald-500" : pct >= 50 ? "text-amber-500" : "text-destructive";

const ringColor = (pct: number) =>
  pct >= 75 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";

const StudentProgress = ({ deptId, backPath = "/admin/settings" }: { deptId?: string | null; backPath?: string }) => {
  const navigate = useNavigate();

  const [students, setStudents] = useState<Array<Record<string, any>>>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<Record<string, any> | null>(null);
  const [focused, setFocused] = useState(false);

  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    UserService.getUsers("student")
      .then((res) => {
        const list = Array.isArray(res) ? res : Array.isArray(res?.users) ? res.users : [];
        const scoped = deptId
          ? list.filter((s: any) => {
              const d = s.department ? (s.department._id ?? s.department) : null;
              return d === deptId;
            })
          : list;
        setStudents(scoped);
      })
      .catch(() => toast.error("Could not load students"))
      .finally(() => setStudentsLoading(false));
  }, [deptId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students.slice(0, 8);
    return students
      .filter(
        (s) =>
          `${s.name ?? ""} ${s.lastName ?? ""}`.toLowerCase().includes(q) ||
          (s.specialId ?? "").toLowerCase().includes(q) ||
          (s.category ?? "").toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [students, search]);

  const loadProgress = async (student: Record<string, any>) => {
    setPicked(student);
    setFocused(false);
    setSearch("");
    setLoading(true);
    try {
      const result = await ClassService.getStudentProgress(student._id);
      if (result?.profile && result?.attendance) {
        setProgress(result);
      } else {
        toast.error(result?.message || "No progress data found");
        setProgress(null);
      }
    } catch {
      toast.error("Could not reach the server");
      setProgress(null);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const scope = deptId
        ? students
        : (students.filter((s) => s.department && (s.department._id ?? s.department)));
      const results = await Promise.allSettled(
        scope.map((s) => ClassService.getStudentProgress(s._id)),
      );

      const rows: any[][] = [
        ["S.No", "Special ID", "Name", "Program", "Class", "Session", "Present", "Absent", "Leave", "Total", "Attendance %"],
      ];

      results.forEach((res, i) => {
        const s = scope[i];
        const label = `${s.name ?? ""} ${s.lastName ?? ""}`.trim();
        if (res.status !== "fulfilled" || !res.value?.profile || !res.value?.attendance) {
          rows.push([
            i + 1,
            s.specialId ?? "—",
            label,
            categoryLabel(s.category),
            s.class ?? "—",
            s.session ?? "—",
            0,
            0,
            0,
            0,
            0,
          ]);
          return;
        }
        const a = res.value.attendance;
        rows.push([
          i + 1,
          res.value.profile?.specialId ?? s.specialId ?? "—",
          `${res.value.profile?.name ?? ""} ${res.value.profile?.lastName ?? ""}`.trim() || label,
          categoryLabel(res.value.profile?.category),
          res.value.profile?.class ?? "—",
          res.value.profile?.session ?? "—",
          a.present ?? 0,
          a.absent ?? 0,
          a.leave ?? 0,
          a.total ?? 0,
          `${a.percentage ?? 0}`,
        ]);
      });

      const csv = rows
        .map((row) => row.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
        .join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `student-progress-report-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report downloaded");
    } catch {
      toast.error("Could not generate report");
    } finally {
      setGenerating(false);
    }
  };

  const p = progress?.profile;
  const a = progress?.attendance;
  const status = p ? statusMeta(p) : null;
  const pct = a?.percentage ?? 0;

  return (
    <div>
      <button
        onClick={() => navigate(backPath)}
        className="mb-4 flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Settings
      </button>

      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-1 font-display text-xl font-bold text-foreground sm:text-2xl"
          >
            Student Progress
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="text-sm text-muted-foreground"
          >
            Attendance and academic overview of any student
          </motion.p>
        </div>
        {deptId ? (
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Building2 className="h-3.5 w-3.5" /> Your department only
          </div>
        ) : (
          loadedCount(a)
        )}
        <button
          onClick={generateReport}
          disabled={generating}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-primary shadow-sm transition-colors hover:bg-secondary disabled:opacity-60"
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4" />
          )}
          Generate Report
        </button>
      </div>

      {/* Search */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setFocused(true)}
                placeholder="Search student by name, Special ID or program…"
                className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {(focused || search.trim()) && (
              <div className="mt-3 max-h-64 space-y-1.5 overflow-y-auto rounded-lg">
                {studentsLoading ? (
                  <p className="px-2 py-2 text-xs text-muted-foreground">
                    Loading students…
                  </p>
                ) : filtered.length === 0 ? (
                  <p className="px-2 py-2 text-xs text-muted-foreground">
                    No students match your search.
                  </p>
                ) : (
                  filtered.map((s) => (
                    <button
                      key={s._id}
                      onClick={() => loadProgress(s)}
                      className="group flex w-full items-center gap-3 rounded-lg border border-transparent px-2 py-2 text-left transition-all hover:border-primary/40 hover:bg-primary/5"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20 text-xs font-bold uppercase text-primary ring-2 ring-primary/10">
                        {(s.name ?? "?").charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
                          {s.name} {s.lastName ?? ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {s.specialId ?? "—"} · {categoryLabel(s.category)}
                          {s.class ? ` · ${s.class}` : ""}
                        </p>
                      </div>
                      <TrendingUp className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading student progress…
        </div>
      )}

      {!loading && picked && p && status && a && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 space-y-6"
        >
          {/* Hero profile */}
          <Card className="overflow-hidden">
            <div className="relative h-24 bg-gradient-to-r from-primary via-primary/80 to-accent">
              <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_50%,white_1px,transparent_1px)] [background-size:18px_18px]" />
            </div>
            <CardContent className="relative px-6 pb-6">
              <div className="flex flex-wrap items-end gap-4">
                <div className="-mt-12 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-2xl font-bold uppercase text-primary-foreground ring-4 ring-card shadow-lg">
                  {(p.name ?? "?").charAt(0)}
                  {(p.lastName ?? "").charAt(0)}
                </div>
                <div className="min-w-0 flex-1 pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-xl font-bold text-foreground">
                      {p.name} {p.lastName ?? ""}
                    </h2>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.cls}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-primary/60" /> {p.specialId ?? "—"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" /> {p.email ?? "—"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" /> {p.phone ?? "—"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 pb-1">
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-foreground">
                    {p.gender === "F" ? "Female" : "Male"}
                  </span>
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-foreground">
                    {p.shift ?? "Morning"} shift
                  </span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { icon: Building2, label: "Department", value: (p.department as any)?.code ?? "—" },
                  { icon: GraduationCap, label: "Program", value: categoryLabel(p.category) },
                  { icon: CalendarClock, label: "Class / Session", value: `${p.class ?? "—"} · ${p.session ?? "—"}` },
                  { icon: BookOpen, label: "Subjects", value: `${Array.isArray(p.subjects) ? p.subjects.length : 0}` },
                ].map((s) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl bg-secondary/40 p-3 transition-colors hover:bg-secondary/70"
                  >
                    <s.icon className="mb-2 h-4 w-4 text-primary/70" />
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {s.label}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
                      {s.value}
                    </p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-5">
            {/* Attendance */}
            <Card className="lg:col-span-3">
              <CardContent className="p-6">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 ring-1 ring-emerald-100">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-semibold text-foreground">
                      Attendance Progress
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {a.total} classes recorded so far
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-10">
                  <Donut value={pct} color={ringColor(pct)} />

                  <div className="w-full max-w-[260px] space-y-3">
                    <StatRow
                      icon={UserCheck2}
                      label="Present"
                      value={a.present}
                      total={a.total}
                      dot="bg-emerald-500"
                      valueCls="text-emerald-600"
                    />
                    <StatRow
                      icon={Clock3}
                      label="Leave"
                      value={a.leave}
                      total={a.total}
                      dot="bg-amber-500"
                      valueCls="text-amber-600"
                    />
                    <StatRow
                      icon={UserX2}
                      label="Absent"
                      value={a.absent}
                      total={a.total}
                      dot="bg-destructive"
                      valueCls="text-destructive"
                    />
                  </div>
                </div>

                {a.total > 0 && (
                  <div
                    className={`mt-6 rounded-xl border px-4 py-3 text-xs ${
                      pct >= 75
                        ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                        : "border-amber-100 bg-amber-50 text-amber-700"
                    }`}
                  >
                    <span className="flex items-start gap-2">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {pct >= 75
                        ? `Excellent standing — attendance is at ${pct}%, above the required 75% minimum.`
                        : `Attendance is at ${pct}%, below the required 75% — student is at risk. Consider a follow-up.`}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Academic */}
            <Card className="lg:col-span-2">
              <CardContent className="p-6">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 ring-1 ring-sky-100">
                    <BookOpen className="h-5 w-5 text-sky-600" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-semibold text-foreground">
                      Academic Overview
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Marks on record
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <MarkTile
                    label="Matric Marks"
                    value={p.matricMarks ?? "—"}
                    color="bg-gradient-to-br from-sky-500 to-sky-600"
                  />
                  <MarkTile
                    label="Inter Marks"
                    value={p.interMarks ?? "—"}
                    color="bg-gradient-to-br from-violet-500 to-violet-600"
                  />
                </div>

                <div className="mt-4 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Subjects enrolled
                    </span>
                    <span className="font-display text-2xl font-bold text-primary">
                      {Array.isArray(p.subjects) ? p.subjects.length : 0}
                    </span>
                  </div>
                  {Array.isArray(p.subjects) && p.subjects.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {p.subjects.slice(0, 6).map((s: string) => (
                        <span
                          key={s}
                          className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-medium text-foreground"
                        >
                          {s}
                        </span>
                      ))}
                      {p.subjects.length > 6 && (
                        <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] text-muted-foreground">
                          +{p.subjects.length - 6}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <p className="mt-4 text-[11px] text-muted-foreground">
                  Joined{" "}
                  {p.createdAt
                    ? new Date(p.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </p>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}

      {!loading && picked && !p && (
        <p className="mt-6 text-sm text-muted-foreground">
          No progress data available for this student yet.
        </p>
      )}
    </div>
  );
};

const StatRow = ({
  icon: Icon,
  label,
  value,
  total,
  dot,
  valueCls,
}: {
  icon: any;
  label: string;
  value: number;
  total: number;
  dot: string;
  valueCls: string;
}) => {
  const share = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="inline-flex items-center gap-2 text-muted-foreground">
          <Icon className="h-3.5 w-3.5" /> {label}
        </span>
        <span className={`font-semibold ${valueCls}`}>
          {value}
          <span className="ml-1 text-xs text-muted-foreground">
            · {share}%
          </span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/70">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${share}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className={`h-full rounded-full ${dot}`}
        />
      </div>
    </div>
  );
};

const MarkTile = ({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) => (
  <div className="rounded-xl border border-border p-4">
    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
      {label}
    </p>
    <p className={`mt-1 font-display text-3xl font-bold ${color} ${color.includes("to-") ? "bg-clip-text text-transparent" : ""}`}>
      {value}
    </p>
  </div>
);

const loadedCount = (a?: { total: number }) => (
  <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
    <MailWarning className="h-3.5 w-3.5" />
    Records updated live from attendance.
  </div>
);

export default StudentProgress;