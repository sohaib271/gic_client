import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Users, Search, FileDown, X, CalendarCheck } from "lucide-react";
import { useSelector } from "react-redux";
import TableSkeleton from "@/components/TableSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUsers } from "@/hooks/useUsers";
import UserService from "@/services/userService";
import { toast } from "sonner";

const HodStudents = () => {
  const user = useSelector((state: any) => state?.user.user);
  const { data: users, isLoading } = useUsers("student");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<any | null>(null);
  const [attendanceFor, setAttendanceFor] = useState<any | null>(null);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  const deptId = user?.department?._id ?? user?.department;

  const deptStudents = useMemo(
    () =>
      (users || []).filter((u: any) => {
        const uDept = u?.department?._id ?? u?.department;
        return uDept === deptId;
      }),
    [users, deptId],
  );

  const filtered = deptStudents.filter(
    (s: any) =>
      s?.name?.toLowerCase().includes(search.toLowerCase()) ||
      s?.specialId?.toLowerCase().includes(search.toLowerCase()) ||
      s?.lastName?.toLowerCase().includes(search.toLowerCase()),
  );

  const openAttendance = async (student: any) => {
    setAttendanceFor(student);
    setAttendanceData([]);
    setLoadingAttendance(true);
    try {
      const classes = student?.classes ?? [];
      const classIds: string[] = classes
        .map((c: any) => (typeof c === "object" ? c._id : c))
        .filter(Boolean);
      if (classIds.length === 0) {
        setLoadingAttendance(false);
        return;
      }
      const results = await Promise.allSettled(
        classIds.map((cid) => UserService.getStudentAttendance(cid, student._id)),
      );
      const all = results.flatMap((r) =>
        r.status === "fulfilled" && Array.isArray(r.value) ? r.value : [],
      );
      setAttendanceData(all);
    } catch {
      toast.error("Failed to load attendance");
    } finally {
      setLoadingAttendance(false);
    }
  };

  const generateReport = () => {
    if (filtered.length === 0) {
      toast.error("No students to export");
      return;
    }
    const header = ["S.No", "Student ID", "First Name", "Last Name", "Class", "Session", "DOJ"];
    const rows = filtered.map((s: any, i: number) => [
      i + 1,
      s?.specialId ?? "",
      s?.name ?? "",
      s?.lastName ?? "",
      s?.class ?? "",
      s?.session ?? "",
      s?.doj ?? "",
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `department-students-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded");
  };

  if (!user?.isHod) {
    return <div className="p-6 text-sm text-muted-foreground">Access denied.</div>;
  }

  if (isLoading) return <TableSkeleton rows={6} cols={7} />;

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Department Students
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Students in {user?.department?.code ?? user?.department?.name ?? "your department"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs sm:text-sm font-semibold text-primary">
            Total: {filtered.length}
          </span>
          <Button size="sm" variant="outline" onClick={generateReport} className="gap-1.5">
            <FileDown className="h-4 w-4" /> Generate Report
          </Button>
        </div>
      </motion.div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or ID..." className="pl-9" />
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-border">
              {["S.No", "Student ID", "Name", "Last Name", "Class", "Session", "Actions"].map((h) => (
                <th key={h} className="p-3 sm:p-4 text-left text-xs sm:text-sm font-medium text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s: any, i: number) => (
              <motion.tr key={s?._id ?? i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="border-b border-border last:border-0 hover:bg-secondary/40 transition-colors">
                <td className="p-3 sm:p-4 text-xs sm:text-sm">{String(i + 1).padStart(2, "0")}</td>
                <td className="p-3 sm:p-4 text-xs sm:text-sm font-medium">{s?.specialId}</td>
                <td className="p-3 sm:p-4 text-xs sm:text-sm">{s?.name}</td>
                <td className="p-3 sm:p-4 text-xs sm:text-sm text-muted-foreground">{s?.lastName}</td>
                <td className="p-3 sm:p-4 text-xs sm:text-sm">{s?.class}</td>
                <td className="p-3 sm:p-4 text-xs sm:text-sm text-muted-foreground">{s?.session}</td>
                <td className="p-3 sm:p-4">
                  <div className="flex gap-1">
                    <button onClick={() => setDetail(s)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button onClick={() => openAttendance(s)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                      title="Attendance report">
                      <CalendarCheck className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">
                  No students found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail modal */}
      <AnimatePresence>
        {detail && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setDetail(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-card p-6 shadow-modal max-h-[90vh] overflow-y-auto">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-foreground">Student Details</h2>
                <button onClick={() => setDetail(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-2 text-sm">
                {([
                  ["Student ID", detail?.specialId],
                  ["First Name", detail?.name],
                  ["Last Name", detail?.lastName],
                  ["Email", detail?.email],
                  ["Phone", detail?.phone],
                  ["CNIC", detail?.cnic],
                  ["Gender", detail?.gender === "M" ? "Male" : detail?.gender === "F" ? "Female" : "—"],
                  ["City", detail?.city],
                  ["Address", detail?.address],
                  ["Class", detail?.class],
                  ["Session", detail?.session],
                  ["Date of Joining", detail?.doj],
                ] as [string, any][]).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 border-b border-border pb-1.5 last:border-0">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-medium text-foreground text-right">{v ?? "—"}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attendance modal */}
      <AnimatePresence>
        {attendanceFor && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setAttendanceFor(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl rounded-2xl bg-card shadow-modal max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground">Attendance Report</h2>
                  <p className="text-xs text-muted-foreground">
                    {attendanceFor?.name} {attendanceFor?.lastName} · {attendanceFor?.specialId}
                  </p>
                </div>
                <button onClick={() => setAttendanceFor(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {loadingAttendance && (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-10 rounded-lg bg-secondary/40 animate-pulse" />
                    ))}
                  </div>
                )}
                {!loadingAttendance && attendanceData.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-6">No attendance records found.</p>
                )}
                {!loadingAttendance && attendanceData.length > 0 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      {(["P", "A", "L"] as const).map((s) => {
                        const count = attendanceData.filter((r: any) => r?.attendenceStatus === s).length;
                        return (
                          <div key={s} className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
                            <p className="text-2xl font-bold text-foreground">{count}</p>
                            <p className="text-xs text-muted-foreground">
                              {s === "P" ? "Present" : s === "A" ? "Absent" : "Late"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-sm">
                        <thead className="bg-secondary/50">
                          <tr>
                            {["Date", "Status", "Class", "Teacher"].map((h) => (
                              <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceData.map((r: any, i: number) => (
                            <tr key={r?._id ?? i} className="border-t border-border">
                              <td className="px-3 py-2 text-xs">{r?.date?.slice(0, 10) ?? "—"}</td>
                              <td className="px-3 py-2 text-xs">
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                  r?.attendenceStatus === "P" ? "bg-green-100 text-green-700"
                                  : r?.attendenceStatus === "A" ? "bg-destructive/10 text-destructive"
                                  : "bg-yellow-100 text-yellow-700"
                                }`}>
                                  {r?.attendenceStatus}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-xs text-muted-foreground">
                                {r?.classId?.className ?? r?.classId ?? "—"}
                              </td>
                              <td className="px-3 py-2 text-xs text-muted-foreground">
                                {r?.teacherId?.name ?? "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HodStudents;