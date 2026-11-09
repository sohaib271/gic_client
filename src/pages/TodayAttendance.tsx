import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  School,
  CalendarCheck,
  Search,
  Check,
  X,
  CalendarX,
  AlertCircle,
  Loader2,
  FileDown,
} from "lucide-react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useClasses } from "@/hooks/useClasses";
import { useDepartments } from "@/hooks/useDepartments";
import ClassService from "@/services/classService";

type AttendanceStatus = "P" | "A" | "L";
type StatusFilter = "all" | AttendanceStatus;

const statusConfig: Record<
  AttendanceStatus,
  { label: string; color: string; bg: string }
> = {
  P: { label: "Present", color: "text-green-700", bg: "bg-green-100 border-green-200" },
  A: { label: "Absent", color: "text-red-700", bg: "bg-red-100 border-red-200" },
  L: { label: "Leave", color: "text-yellow-700", bg: "bg-yellow-100 border-yellow-200" },
};

interface MarkedRow {
  id: string;
  studentId: string;
  name: string;
  className: string;
  status: AttendanceStatus;
}

const TodayClassAttendance = () => {
  const user = useSelector((state: any) => state?.user.user);
  const { data: departments } = useDepartments();

  const deptId: string = user?.department?._id ?? user?.department ?? "";
  const { data: classes, isLoading: classesLoading } = useClasses("", deptId);
  const deptCategory: string =
    user?.department?.category ??
    (departments || []).find((d: any) => d?._id === deptId)?.category ??
    "intermediate";

  const deptClasses = useMemo(
    () =>
      (classes || []).filter(
        (c: any) => (c?.departmentId?._id ?? c?.departmentId) === deptId,
      ),
    [classes, deptId],
  );

  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [rows, setRows] = useState<MarkedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [unmarkedClasses, setUnmarkedClasses] = useState<string[]>([]);

  const [filter, setFilter] = useState<StatusFilter>("all");
  const [classFilter, setClassFilter] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!date || !user?._id) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoaded(false);
      try {
        const results = await Promise.allSettled(
          deptClasses.map((cls: any) => ClassService.getAttendanceByDate(cls._id, date)),
        );

        if (cancelled) return;

        const collected: MarkedRow[] = [];
        const notMarked: string[] = [];

        deptClasses.forEach((cls: any, i: number) => {
          const res = results[i];
          const records =
            res.status === "fulfilled" && Array.isArray(res.value?.records)
              ? res.value.records
              : [];
          if (records.length === 0) {
            notMarked.push(cls.className);
            return;
          }
          records.forEach((r: any) => {
            const studentId = r.studentId?.specialId ?? "—";
            const name = `${r.studentId?.name ?? ""} ${r.studentId?.lastName ?? ""}`.trim() || "—";
            collected.push({
              id: `${cls._id}:${r._id}`,
              studentId,
              name,
              className: cls.className,
              status: r.attendenceStatus as AttendanceStatus,
            });
          });
        });

        setRows(collected);
        setUnmarkedClasses(notMarked);
        setLoaded(true);
      } catch {
        if (!cancelled) {
          setRows([]);
          setUnmarkedClasses(deptClasses.map((c: any) => c.className));
          setLoaded(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [date, deptClasses, user?._id]);

  const stats = useMemo(() => {
    const present = rows.filter((r) => r.status === "P").length;
    const absent = rows.filter((r) => r.status === "A").length;
    const leave = rows.filter((r) => r.status === "L").length;
    return { present, absent, leave };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (classFilter !== "all" && r.className !== classFilter) return false;
      if (filter !== "all" && r.status !== filter) return false;
      if (q.length > 0) {
        const name = r.name.toLowerCase();
        const spid = r.studentId.toLowerCase();
        if (!name.includes(q) && !spid.includes(q)) return false;
      }
      return true;
    });
  }, [rows, classFilter, filter, query]);

  const generateReport = () => {
    if (rows.length === 0) {
      toast.error("No marked attendance to export");
      return;
    }
    const header = ["S.No", "Date", "Student ID", "Name", "Class", "Status"];
    const data = filteredRows.map((r, i) => [
      i + 1,
      date,
      r.studentId,
      r.name,
      r.className,
      statusConfig[r.status].label,
    ]);
    const csv = [header, ...data]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-report-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Attendance report downloaded");
  };

  if (!user?.isHod) {
    return <div className="p-6 text-sm text-muted-foreground">Access denied.</div>;
  }

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-primary" /> Today's Student Attendance
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {user?.department?.code ?? user?.department?.name ?? "Your department"} ·{" "}
            {deptCategory === "intermediate" ? "Intermediate" : "BS / ADP"} · Students with
            attendance marked for the selected date
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={generateReport} className="gap-1.5">
          <FileDown className="h-4 w-4" /> Generate Report
        </Button>
      </motion.div>

      {/* Date */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-foreground">Date:</label>
          <input
            type="date"
            value={date}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {loading && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking all classes...
          </span>
        )}
        {!loading && loaded && rows.length > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Check className="h-3 w-3" /> {rows.length} students marked
          </span>
        )}
      </div>

      {unmarkedClasses.length > 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card p-4">
          <p className="text-xs font-semibold text-foreground mb-1.5">
            Not Marked Yet ({unmarkedClasses.length} class{unmarkedClasses.length > 1 ? "es" : ""})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {unmarkedClasses.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground"
              >
                <CalendarX className="h-3 w-3" /> {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {classesLoading || loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : null}

      {!loading && loaded && rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card p-14 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <CalendarX className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="font-display text-base font-semibold text-foreground">Not Marked Yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            No attendance has been marked in your department on this date.
          </p>
        </div>
      )}

      {!loading && loaded && rows.length > 0 && (
        <>
          {/* Stats */}
          <div className="flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              Present: {stats.present}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
              Absent: {stats.absent}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
              Leave: {stats.leave}
            </span>
            <span className="text-xs text-muted-foreground self-center">
              Total marked: {rows.length}
            </span>
          </div>

          {/* Filters */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="flex gap-1 rounded-lg border border-border bg-secondary/30 p-1 w-fit">
              {(["all", "P", "A", "L"] as StatusFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                    filter === f
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f === "all" ? "All" : statusConfig[f].label}
                </button>
              ))}
            </div>

            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All classes</option>
              {[...new Set(rows.map((r) => r.className))].map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>

            <div className="relative lg:ml-auto flex-1 lg:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name or student ID..."
                className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    {["#", "Student ID", "Name", "Class", "Status"].map((h) => (
                      <th
                        key={h}
                        className={`px-4 py-3 font-display font-semibold text-foreground ${
                          h === "Status" ? "text-center" : "text-left"
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r, i) => (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.01 }}
                      className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors"
                    >
                      <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{r.studentId}</td>
                      <td className="px-4 py-3 text-foreground">{r.name}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs text-foreground">
                          <School className="h-3 w-3 text-muted-foreground" /> {r.className}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${statusConfig[r.status].bg} ${statusConfig[r.status].color}`}
                          >
                            {r.status === "P" && <Check className="h-3 w-3" />}
                            {r.status === "A" && <X className="h-3 w-3" />}
                            {r.status === "L" && <span className="h-2 w-2 rounded-full bg-yellow-500" />}
                            {statusConfig[r.status].label}
                          </span>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                  {filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <AlertCircle className="h-8 w-8 mb-2" />
                          <p className="text-sm">No students match your filter.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TodayClassAttendance;