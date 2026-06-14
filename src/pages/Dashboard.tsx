import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, BookOpen, CalendarCheck, TrendingUp, GraduationCap,
  ChevronLeft, ChevronRight, X, Search,
  Clock, Check, Ban, FileText, Download, Filter, QrCode, RefreshCw,
} from "lucide-react";
import { useUsers } from "@/hooks/useUsers";
import { useClasses } from "@/hooks/useClasses";
import { useQuery } from "@tanstack/react-query";
import UserService from "@/services/userService";
import ClassService from "@/services/classService";
import { toast } from "sonner";
import TeacherAttendanceService from "@/services/teacherAttendanceService";

const STUDENTS_PER_PAGE = 10;

// ── Attendance report service helper ────────────────────────
const fetchClassAttendance = async (classId: string, date: string) => {
  const res = await fetch(
    `${(await import("@/services/otherService")).API}/attendance/class/${classId}?date=${date}`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${(await import("@/store/store")).store.getState().user.token}`,
      },
    }
  );
  return res.json();
};

type DashboardPanel = "students" | "attendance" | "facultyQR" | null;

const Dashboard = () => {
  const { data: allUsers } = useUsers("");
  const { data: classes }  = useClasses("");

  const [activePanel, setActivePanel] = useState<DashboardPanel>(null);

  // ── Students panel state
  const [studentFilter,  setStudentFilter]  = useState<"all" | "intermediate" | "bs" | "adp">("all");
  const [studentSearch,  setStudentSearch]  = useState("");
  const [currentPage,    setCurrentPage]    = useState(1);
  const [showStruckOff,  setShowStruckOff]  = useState(false);
  const [struckOffDetail, setStruckOffDetail] = useState<any | null>(null);

  // ── Attendance panel state
  const [attendanceScope,   setAttendanceScope]   = useState<"all" | "intermediate" | "bs_adp">("all");
  const [selectedClassId,   setSelectedClassId]   = useState<string>("");
  const [reportDate,        setReportDate]         = useState(() => new Date().toISOString().split("T")[0]);
  const [reportData,        setReportData]         = useState<any | null>(null);
  const [generatingReport,  setGeneratingReport]   = useState(false);

  // ── Faculty QR panel state
  const [qrDataUrl,      setQrDataUrl]      = useState<string | null>(null);
  const [qrLoading,      setQrLoading]      = useState(false);
  const [qrError,        setQrError]        = useState<string | null>(null);
  const [qrCountdown,    setQrCountdown]    = useState(60);

  // ── Derived counts
  const usersList = useMemo(() => Array.isArray(allUsers) ? allUsers : [], [allUsers]);
  const classesList = useMemo(() => Array.isArray(classes) ? classes : [], [classes]);
  const students    = useMemo(() => usersList.filter((u: any) => u.role === "student"), [usersList]);
  const professors  = useMemo(() => usersList.filter((u: any) => u.role === "proff"), [usersList]);
  const totalClasses = classesList.length;

  // ── Struck off query
  const { data: struckOffData } = useQuery({
    queryKey: ["struckOff"],
    queryFn:  () => UserService.getStruckOffStudents(),
    enabled:  showStruckOff,
    retry:    false,
  });
  const struckOffList = struckOffData?.struckOffStudents ?? [];

  // ── Filtered students for panel
  const filteredStudents = useMemo(() => {
    let list = students;
    if (studentFilter !== "all") list = list.filter((s: any) => s.category === studentFilter);
    if (studentSearch.trim()) {
      const q = studentSearch.toLowerCase();
      list = list.filter((s: any) =>
        s?.name?.toLowerCase().includes(q) ||
        s?.lastName?.toLowerCase().includes(q) ||
        s?.specialId?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [students, studentFilter, studentSearch]);

  const totalPages    = Math.ceil(filteredStudents.length / STUDENTS_PER_PAGE);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * STUDENTS_PER_PAGE,
    currentPage * STUDENTS_PER_PAGE
  );

  // ── Classes filtered for attendance scope
  const filteredClasses = useMemo(() => {
    if (attendanceScope === "all") return classesList;
    if (attendanceScope === "intermediate") return classesList.filter((c: any) => c.category === "intermediate");
    return classesList.filter((c: any) => c.category === "bs" || c.category === "adp");
  }, [classesList, attendanceScope]);

  const stats = [
    { label: "Total Students", value: String(students.length),   icon: Users,        panel: "students"   as DashboardPanel },
    { label: "Total Classes",  value: String(totalClasses),       icon: BookOpen,     panel: null },
    { label: "Attendance",     value: "View Report",              icon: CalendarCheck, panel: "attendance" as DashboardPanel },
    { label: "Faculty",        value: String(professors.length),  icon: GraduationCap, panel: null },
    { label: "Faculty QR",     value: "View QR Code",             icon: QrCode,        panel: "facultyQR"  as DashboardPanel },
  ];

  // ── Generate attendance report
  const handleGenerateReport = async () => {
    if (!selectedClassId) { toast.error("Please select a class"); return; }
    if (!reportDate)       { toast.error("Please select a date");  return; }
    setGeneratingReport(true);
    try {
      const res = await fetchClassAttendance(selectedClassId, reportDate);
      if (res?.statusCode >= 400 || res?.error) {
        toast.error(res?.message ?? "Failed to generate report");
        return;
      }
      setReportData(res);
    } catch {
      toast.error("Network error");
    } finally {
      setGeneratingReport(false);
    }
  };

  // ── Download report as CSV
  const handleDownloadCSV = () => {
    if (!reportData?.records?.length) return;
    const headers = "Student ID,Name,Status,Date\n";
    const rows = reportData.records.map((r: any) => {
      const name = typeof r.studentId === "object"
        ? `${r.studentId.name} ${r.studentId.lastName ?? ""}`
        : r.studentId;
      const sid = typeof r.studentId === "object" ? r.studentId.specialId : "—";
      return `${sid},${name},${r.attendenceStatus},${reportDate}`;
    }).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `attendance-${selectedClassId}-${reportDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Faculty QR: fetch shared QR (no teacherId needed)
  const fetchFacultyQR = async () => {
    setQrLoading(true);
    setQrError(null);
    setQrDataUrl(null);
    setQrCountdown(60);
    try {
      const res = await TeacherAttendanceService.getSharedQR();
      if (!res.success) { setQrError(res?.message ?? "Failed to generate QR"); return; }
      setQrDataUrl(res.qrDataUrl);
    } catch (err: any) {
      setQrError(err?.message ?? "Network error");
    } finally {
      setQrLoading(false);
    }
  };

  // ── Auto-fetch when panel opens
  useEffect(() => {
    if (activePanel === "facultyQR") fetchFacultyQR();
    else { setQrDataUrl(null); setQrError(null); setQrCountdown(60); }
  }, [activePanel]);

  // ── Countdown auto-refresh
  useEffect(() => {
    if (!qrDataUrl) return;
    const interval = setInterval(() => {
      setQrCountdown((c) => {
        if (c <= 1) { fetchFacultyQR(); return 60; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [qrDataUrl]);

  const qrMins = String(Math.floor(qrCountdown / 60)).padStart(2, "0");
  const qrSecs = String(qrCountdown % 60).padStart(2, "0");

  return (
    <div className="space-y-6">
      {/* ── Stats Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => stat.panel && setActivePanel(activePanel === stat.panel ? null : stat.panel)}
            className={`group rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:shadow-elevated ${
              stat.panel ? "cursor-pointer hover:-translate-y-0.5" : ""
            } ${activePanel === stat.panel && stat.panel ? "ring-2 ring-primary/40" : ""}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="mt-1 font-display text-2xl font-bold text-foreground">{stat.value}</p>
              </div>
              <div className={`rounded-lg p-2.5 transition-colors ${
                activePanel === stat.panel && stat.panel
                  ? "bg-primary/20"
                  : "bg-primary/10 group-hover:bg-primary/20"
              }`}>
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
            </div>
            {stat.panel && (
              <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary">
                <TrendingUp className="h-3 w-3" />
                Click to {activePanel === stat.panel ? "close" : "view details"}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* ══════════ STUDENTS PANEL ══════════ */}
      <AnimatePresence>
        {activePanel === "students" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl border border-border bg-card shadow-card overflow-hidden"
          >
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border">
              <h2 className="font-display text-lg font-bold text-foreground">
                {showStruckOff ? "Struck Off Students" : "All Students"}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowStruckOff(!showStruckOff); setStruckOffDetail(null); }}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    showStruckOff
                      ? "bg-destructive/10 border-destructive/30 text-destructive"
                      : "border-border text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  <Ban className="h-3.5 w-3.5" />
                  {showStruckOff ? "Back to All" : `Struck Off (${struckOffList.length})`}
                </button>
                <button
                  onClick={() => setActivePanel(null)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* ── Struck Off Detail View ── */}
            {struckOffDetail && (
              <div className="px-5 py-4 border-b border-border bg-secondary/20">
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => setStruckOffDetail(null)}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Back to struck off list
                  </button>
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  History — {struckOffDetail.studentId?.name} {struckOffDetail.studentId?.lastName}
                </h3>
                <div className="space-y-2">
                  {(struckOffDetail.history ?? []).map((h: any, i: number) => (
                    <div key={i} className={`rounded-lg border px-4 py-3 text-xs ${
                      h.status === "struck_off"
                        ? "bg-destructive/5 border-destructive/20"
                        : "bg-green-50 border-green-200"
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-semibold capitalize ${
                          h.status === "struck_off" ? "text-destructive" : "text-green-700"
                        }`}>
                          {h.status === "struck_off" ? "Struck Off" : "Reinstated"}
                        </span>
                        <span className="text-muted-foreground">
                          {h.start ? new Date(h.start).toLocaleDateString("en-GB") : "—"}
                          {h.end ? ` → ${new Date(h.end).toLocaleDateString("en-GB")}` : ""}
                        </span>
                      </div>
                      <p className="text-muted-foreground">Reason: {h.reason}</p>
                      {h.actionBy && (
                        <p className="text-muted-foreground mt-0.5">
                          By: {typeof h.actionBy === "object"
                            ? `${h.actionBy.name ?? ""} (${h.actionBy.role ?? ""})`
                            : h.actionBy}
                        </p>
                      )}
                    </div>
                  ))}
                  {(!struckOffDetail.history || struckOffDetail.history.length === 0) && (
                    <p className="text-sm text-muted-foreground">No history found.</p>
                  )}
                </div>
              </div>
            )}

            {/* ── Struck Off List ── */}
            {showStruckOff && !struckOffDetail && (
              <div className="divide-y divide-border">
                {struckOffList.length === 0 && (
                  <p className="p-8 text-center text-sm text-muted-foreground">No struck off students.</p>
                )}
                {struckOffList.map((s: any, i: number) => (
                  <div key={i}
                    onClick={() => setStruckOffDetail(s)}
                    className="flex items-center justify-between px-5 py-3 hover:bg-secondary/30 cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {s.studentId?.name} {s.studentId?.lastName}
                        <span className="ml-2 text-xs text-muted-foreground">{s.studentId?.specialId}</span>
                      </p>
                      <p className="text-xs text-destructive mt-0.5">
                        Struck off: {s.currentStatus?.start
                          ? new Date(s.currentStatus.start).toLocaleDateString("en-GB")
                          : "—"}
                        {" · "}Reason: {s.currentStatus?.reason}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                ))}
              </div>
            )}

            {/* ── All Students View ── */}
            {!showStruckOff && !struckOffDetail && (
              <>
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-border bg-secondary/20">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={studentSearch}
                      onChange={(e) => { setStudentSearch(e.target.value); setCurrentPage(1); }}
                      placeholder="Search by name or ID..."
                      className="rounded-lg border border-input bg-background pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring w-56"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                    {(["all","intermediate","bs","adp"] as const).map((f) => (
                      <button key={f} onClick={() => { setStudentFilter(f); setCurrentPage(1); }}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors capitalize ${
                          studentFilter === f
                            ? "bg-primary text-primary-foreground"
                            : "bg-background border border-border text-muted-foreground hover:bg-secondary"
                        }`}
                      >
                        {f === "all" ? "All" : f.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <span className="ml-auto text-xs text-muted-foreground">{filteredStudents.length} students</span>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/40">
                        {["#","ID","Name","Category","Class","Session"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedStudents.map((s: any, i: number) => (
                        <tr key={s._id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                          <td className="px-4 py-3 text-muted-foreground">{(currentPage - 1) * STUDENTS_PER_PAGE + i + 1}</td>
                          <td className="px-4 py-3 font-medium text-foreground">{s.specialId}</td>
                          <td className="px-4 py-3 text-foreground">{s.name} {s.lastName}</td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary uppercase">
                              {s.category ?? "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{s.class ?? "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{s.session ?? "—"}</td>
                        </tr>
                      ))}
                      {paginatedStudents.length === 0 && (
                        <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">No students found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-5 py-3 border-t border-border">
                    <span className="text-xs text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-secondary disabled:opacity-40 transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                        const page = Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + idx;
                        return (
                          <button key={page} onClick={() => setCurrentPage(page)}
                            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                              currentPage === page
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-border text-muted-foreground hover:bg-secondary"
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-secondary disabled:opacity-40 transition-colors"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════ ATTENDANCE PANEL ══════════ */}
      <AnimatePresence>
        {activePanel === "attendance" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl border border-border bg-card shadow-card overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-display text-lg font-bold text-foreground">Attendance Report</h2>
              <button onClick={() => { setActivePanel(null); setReportData(null); }}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Controls */}
            <div className="px-5 py-4 border-b border-border bg-secondary/20 space-y-4">
              {/* Scope filter */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Show classes:</span>
                {(["all","intermediate","bs_adp"] as const).map((s) => (
                  <button key={s} onClick={() => { setAttendanceScope(s); setSelectedClassId(""); setReportData(null); }}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                      attendanceScope === s
                        ? "bg-primary text-primary-foreground"
                        : "bg-background border border-border text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {s === "all" ? "All" : s === "intermediate" ? "Intermediate" : "BS / ADP"}
                  </button>
                ))}
              </div>

              {/* Class + Date selectors */}
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Class</label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => { setSelectedClassId(e.target.value); setReportData(null); }}
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-w-[200px]"
                  >
                    <option value="">Select a class</option>
                    {filteredClasses.map((c: any) => (
                      <option key={c._id} value={c._id}>{c.className}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Date</label>
                  <input type="date" value={reportDate}
                    onChange={(e) => { setReportDate(e.target.value); setReportData(null); }}
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <button
                  onClick={handleGenerateReport}
                  disabled={generatingReport || !selectedClassId}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {generatingReport ? (
                    <><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> Generating...</>
                  ) : (
                    <><FileText className="h-4 w-4" /> Generate Report</>
                  )}
                </button>
                {reportData?.records?.length > 0 && (
                  <button onClick={handleDownloadCSV}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors">
                    <Download className="h-4 w-4" /> Download CSV
                  </button>
                )}
              </div>
            </div>

            {/* Report Results */}
            {reportData && (
              <div>
                {/* Summary */}
                <div className="flex flex-wrap gap-4 px-5 py-3 border-b border-border bg-secondary/10">
                  <span className="text-sm text-muted-foreground">
                    Total: <strong className="text-foreground">{reportData.total ?? 0}</strong>
                  </span>
                  <span className="text-sm text-green-700">
                    Present: <strong>{reportData.records?.filter((r: any) => r.attendenceStatus === "P").length ?? 0}</strong>
                  </span>
                  <span className="text-sm text-destructive">
                    Absent: <strong>{reportData.records?.filter((r: any) => r.attendenceStatus === "A").length ?? 0}</strong>
                  </span>
                  <span className="text-sm text-yellow-700">
                    Leave: <strong>{reportData.records?.filter((r: any) => r.attendenceStatus === "L").length ?? 0}</strong>
                  </span>
                </div>

                {/* Table */}
                {reportData.records?.length === 0 ? (
                  <p className="p-8 text-center text-sm text-muted-foreground">No attendance records for this date.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-secondary/40">
                          {["#","Student ID","Name","Status","Marked By"].map((h) => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.records.map((r: any, i: number) => {
                          const student = typeof r.studentId === "object" ? r.studentId : null;
                          const teacher = typeof r.teacherId === "object" ? r.teacherId : null;
                          return (
                            <tr key={r._id ?? i} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                              <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                              <td className="px-4 py-3 font-medium text-foreground">{student?.specialId ?? "—"}</td>
                              <td className="px-4 py-3 text-foreground">{student?.name} {student?.lastName ?? ""}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                                  r.attendenceStatus === "P"
                                    ? "bg-green-100 text-green-700 border-green-300"
                                    : r.attendenceStatus === "A"
                                      ? "bg-destructive/10 text-destructive border-destructive/30"
                                      : "bg-yellow-100 text-yellow-700 border-yellow-300"
                                }`}>
                                  {r.attendenceStatus === "P" ? <><Check className="h-3 w-3" /> Present</>
                                   : r.attendenceStatus === "A" ? <><X className="h-3 w-3" /> Absent</>
                                   : <><Clock className="h-3 w-3" /> Leave</>}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {teacher ? `${teacher.name} ${teacher.lastName ?? ""}` : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {!reportData && !generatingReport && (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <CalendarCheck className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Select a class and date, then click Generate Report.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════ FACULTY QR PANEL ══════════ */}
      <AnimatePresence>
        {activePanel === "facultyQR" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl border border-border bg-card shadow-card overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg font-bold text-foreground">Faculty QR Code</h2>
              </div>
              <button
                onClick={() => setActivePanel(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col items-center gap-4 p-8">
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                All professors scan this single QR code to mark their attendance. Each professor's record is saved against their own account via their login session.
              </p>

              {qrLoading && (
                <div className="h-52 w-52 rounded-xl border border-border bg-secondary/30 flex items-center justify-center animate-pulse">
                  <p className="text-xs text-muted-foreground">Generating...</p>
                </div>
              )}

              {qrError && !qrLoading && (
                <div className="h-52 w-52 rounded-xl border border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center gap-2">
                  <p className="text-xs text-destructive text-center px-4">{qrError}</p>
                  <button onClick={fetchFacultyQR} className="text-xs text-primary underline">Retry</button>
                </div>
              )}

              {qrDataUrl && !qrLoading && (
                <>
                  <div className="rounded-xl border-2 border-primary/20 p-3 bg-white">
                    <img src={qrDataUrl} alt="Faculty QR Code" className="h-48 w-48" />
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className={`font-mono font-semibold ${qrCountdown <= 60 ? "text-destructive" : "text-foreground"}`}>
                      {qrMins}:{qrSecs}
                    </span>
                    <span className="text-xs text-muted-foreground">until refresh</span>
                  </div>

                  <button
                    onClick={fetchFacultyQR}
                    disabled={qrLoading}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Regenerate QR
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Quick Overview ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center gap-3 mb-4">
          <GraduationCap className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-bold text-foreground">Quick Overview</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-secondary p-4">
            <p className="text-sm text-muted-foreground">Intermediate</p>
            <p className="mt-1 font-display text-lg font-bold text-foreground">
              {students.filter((s: any) => s.category === "intermediate").length}
            </p>
            <p className="text-xs text-muted-foreground">Students</p>
          </div>
          <div className="rounded-lg bg-secondary p-4">
            <p className="text-sm text-muted-foreground">BS Students</p>
            <p className="mt-1 font-display text-lg font-bold text-foreground">
              {students.filter((s: any) => s.category === "bs").length}
            </p>
            <p className="text-xs text-muted-foreground">Students</p>
          </div>
          <div className="rounded-lg bg-secondary p-4">
            <p className="text-sm text-muted-foreground">ADP Students</p>
            <p className="mt-1 font-display text-lg font-bold text-foreground">
              {students.filter((s: any) => s.category === "adp").length}
            </p>
            <p className="text-xs text-muted-foreground">Students</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
