// AttendanceMarker.tsx — full rewrite
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Save, Check, AlertCircle, History, X, Pencil } from "lucide-react";
import { toast } from "sonner";
import ClassService from "@/services/classService";
import PaginationControls from "@/components/PaginationControls";
import { usePagination } from "@/hooks/usePagination";

type AttendanceStatus = "P" | "A" | "L";

interface Props {
  classData: any;
  teacherId: string;
  onBack: () => void;
}

const statusConfig: Record<AttendanceStatus, { label: string; color: string; bg: string; activeBg: string }> = {
  P: { label: "Present", color: "text-green-700",    bg: "bg-green-50 border-green-200",       activeBg: "bg-green-100 border-green-400 ring-green-400" },
  A: { label: "Absent",  color: "text-red-700",      bg: "bg-red-50 border-red-200",            activeBg: "bg-red-100 border-red-400 ring-red-400" },
  L: { label: "Leave",   color: "text-yellow-700",   bg: "bg-yellow-50 border-yellow-200",      activeBg: "bg-yellow-100 border-yellow-400 ring-yellow-400" },
};

const AttendanceMarker = ({ classData, teacherId, onBack }: Props) => {
  const students: any[] = classData?.classStudents || [];

  const [activeTab,  setActiveTab]  = useState<"mark" | "history">("mark");
  const [date,       setDate]       = useState(() => new Date().toISOString().split("T")[0]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>(() => {
    const init: Record<string, AttendanceStatus> = {};
    students.forEach((s) => { init[s?._id || s] = "P"; });
    return init;
  });

  const [saving,           setSaving]           = useState(false);
  const [saved,            setSaved]            = useState(false);
  const [existingRecords,  setExistingRecords]  = useState<any[]>([]);
  const [loadingExisting,  setLoadingExisting]  = useState(false);
  const [hasExisting,      setHasExisting]      = useState(false);

  // ── Update modal state
  const [updateModal,   setUpdateModal]   = useState<{ record: any; student: any } | null>(null);
  const [updateStatus,  setUpdateStatus]  = useState<AttendanceStatus>("P");
  const [updating,      setUpdating]      = useState(false);

  // ── History state
  const [history,        setHistory]        = useState<any>({});
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedDate,   setExpandedDate]   = useState<string | null>(null);

  const studentPagination = usePagination(students, 12);

  const historyGroups = useMemo(() => {
    return Object.entries(history)
      .flatMap(([cid, classHistory]: any) =>
        Object.entries(classHistory?.dates ?? {}).map(([dateKey, records]: any) => ({
          cid,
          className: classHistory?.className ?? classData?.className ?? "Class",
          dateKey,
          records: Array.isArray(records) ? records : [],
          totalSessions: Object.keys(classHistory?.dates ?? {}).length,
        })),
      )
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [history, classData?.className]);

  const historyPagination = usePagination(historyGroups, 5);

  // ── Load existing attendance when date changes
  useEffect(() => {
    if (!date || !classData?._id) return;
    let cancelled = false;

    const load = async () => {
      setLoadingExisting(true);
      try {
        const res = await ClassService.getClassAttendanceByTeacher(classData._id, teacherId, date);
        if (!cancelled && res?.records) {
          setExistingRecords(res.records);
          setHasExisting(res.records.length > 0);

          // ✅ Pre-fill attendance state from existing records
          if (res.records.length > 0) {
            const prefilled: Record<string, AttendanceStatus> = {};
            res.records.forEach((r: any) => {
              const sid = typeof r.studentId === "object" ? r.studentId._id : r.studentId;
              prefilled[sid] = r.attendenceStatus as AttendanceStatus;
            });
            setAttendance(prefilled);
          } else {
            // Reset to all Present for new date
            const init: Record<string, AttendanceStatus> = {};
            students.forEach((s) => { init[s?._id || s] = "P"; });
            setAttendance(init);
          }
          setSaved(false);
        }
      } catch { /* silently fail */ }
      finally { if (!cancelled) setLoadingExisting(false); }
    };

    load();
    return () => { cancelled = true; };
  }, [date, classData?._id]);

  // ── Load history when tab switches
  useEffect(() => {
    if (activeTab !== "history") return;
    let cancelled = false;

    const load = async () => {
      setHistoryLoading(true);
      try {
        const res = await ClassService.getMyAttendanceHistory(teacherId, classData._id);
        if (!cancelled) setHistory(res?.history ?? {});
      } catch { /* silently */ }
      finally { if (!cancelled) setHistoryLoading(false); }
    };

    load();
    return () => { cancelled = true; };
  }, [activeTab]);

  const setAllStatus = (status: AttendanceStatus) => {
    const updated: Record<string, AttendanceStatus> = {};
    students.forEach((s) => { updated[s?._id || s] = status; });
    setAttendance(updated);
    setSaved(false);
  };

  const stats = useMemo(() => {
    const values = Object.values(attendance);
    return {
      present: values.filter((v) => v === "P").length,
      absent:  values.filter((v) => v === "A").length,
      leave:   values.filter((v) => v === "L").length,
    };
  }, [attendance]);

  // ── Save (bulk mark)
  const handleSave = async () => {
    if (!date) { toast.error("Please select a date"); return; }
    if (hasExisting) {
      toast.error("Attendance already marked for this date. Use the update button per student.");
      return;
    }
    setSaving(true);
    try {
      const records = Object.entries(attendance).map(([studentId, attendenceStatus]) => ({
        studentId, attendenceStatus,
      }));
      const res = await ClassService.markBulkAttendance({
        classId:   classData._id,
        teacherId,
        date,
        records,
      });
      if (res?.statusCode >= 400 || res?.error) {
        toast.error(res?.message ?? "Failed to save attendance");
        return;
      }
      toast.success("Attendance saved successfully");
      setSaved(true);
      setHasExisting(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Network error";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Update single student
  const handleUpdate = async () => {
    if (!updateModal) return;
    setUpdating(true);
    try {
      const res = await ClassService.updateStudentAttendance(
        updateModal.record._id,
        {
          classId:          classData._id,
          teacherId,
          studentId:        typeof updateModal.record.studentId === "object"
                              ? updateModal.record.studentId._id
                              : updateModal.record.studentId,
          attendenceStatus: updateStatus,
        }
      );
      if (res?.statusCode >= 400 || res?.error) {
        toast.error(res?.message ?? "Update failed");
        return;
      }
      toast.success("Attendance updated");

      // ✅ Update local state to reflect change
      setExistingRecords((prev) =>
        prev.map((r) => r._id === updateModal.record._id ? { ...r, attendenceStatus: updateStatus } : r)
      );
      const sid = typeof updateModal.record.studentId === "object"
        ? updateModal.record.studentId._id : updateModal.record.studentId;
      setAttendance((prev) => ({ ...prev, [sid]: updateStatus }));
      setUpdateModal(null);
    } catch {
      toast.error("Network error");
    } finally {
      setUpdating(false);
    }
  };

  // ── Find existing record for a student on current date
  const getExistingRecord = (studentId: string) =>
    existingRecords.find((r: any) => {
      const sid = typeof r.studentId === "object" ? r.studentId._id : r.studentId;
      return sid === studentId;
    });

  return (
    <div>
      <button onClick={onBack} className="mb-4 flex items-center gap-1 text-sm text-primary hover:underline">
        <ChevronLeft className="h-4 w-4" /> Back to Class
      </button>

      <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="mb-1 font-display text-xl font-bold text-foreground sm:text-2xl">
        Attendance — {classData?.className}
      </motion.h1>

      {/* ── Tabs */}
      <div className="mt-4 mb-6 flex gap-1 rounded-lg border border-border bg-secondary/30 p-1 w-fit">
        {(["mark", "history"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}>
            {tab === "mark" ? "Mark Attendance" : "History"}
          </button>
        ))}
      </div>

      {/* ══════════ MARK TAB ══════════ */}
      {activeTab === "mark" && (
        <>
          {/* Date + quick actions */}
          <div className="mb-6 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-foreground">Date:</label>
              <input type="date" value={date}
                onChange={(e) => { setDate(e.target.value); setSaved(false); }}
                className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>

            {/* ✅ Show existing badge */}
            {loadingExisting && (
              <span className="text-xs text-muted-foreground animate-pulse">Checking...</span>
            )}
            {!loadingExisting && hasExisting && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Check className="h-3 w-3" /> Already marked — update per student below
              </span>
            )}
            {!loadingExisting && !hasExisting && (
              <div className="flex items-center gap-1.5 flex-wrap sm:ml-auto">
                <span className="text-xs text-muted-foreground mr-1">Mark all:</span>
                {(["P", "A", "L"] as AttendanceStatus[]).map((s) => (
                  <button key={s} onClick={() => setAllStatus(s)}
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${statusConfig[s].bg} ${statusConfig[s].color}`}>
                    {statusConfig[s].label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="mb-4 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">Present: {stats.present}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">Absent: {stats.absent}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">Leave: {stats.leave}</span>
            <span className="text-xs text-muted-foreground self-center">Total: {students.length}</span>
          </div>

          {students.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12 text-center">
              <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No students enrolled in this class.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    {["#", "Student ID", "Name", "Status", hasExisting ? "Update" : ""].filter(Boolean).map((h) => (
                      <th key={h} className={`px-4 py-3 font-display font-semibold text-foreground ${h === "Status" || h === "Update" ? "text-center" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {studentPagination.pageItems.map((s: any, i: number) => {
                    const sid            = s?._id || s;
                    const status         = attendance[sid] || "P";
                    const existingRecord = getExistingRecord(sid);
                    const rowNumber      = (studentPagination.page - 1) * studentPagination.pageSize + i + 1;

                    return (
                      <motion.tr key={sid} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground">{rowNumber}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{s?.specialId ?? "—"}</td>
                        <td className="px-4 py-3 text-foreground">{s?.name} {s?.lastName ?? ""}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            {(["P", "A", "L"] as AttendanceStatus[]).map((st) => (
                              <button key={st} disabled={hasExisting}
                                onClick={() => {
                                  if (hasExisting) return;
                                  setAttendance((prev) => ({ ...prev, [sid]: st }));
                                  setSaved(false);
                                }}
                                className={`rounded-md border px-2.5 py-1 text-xs font-bold transition-all disabled:cursor-not-allowed ${
                                  status === st
                                    ? `${statusConfig[st].activeBg} ${statusConfig[st].color} ring-2 ring-offset-1`
                                    : hasExisting
                                      ? "border-border bg-secondary/30 text-muted-foreground/50"
                                      : "border-border bg-background text-muted-foreground hover:bg-secondary"
                                }`}>
                                {st}
                              </button>
                            ))}
                          </div>
                        </td>

                        {/* ✅ Update button — only when attendance already exists */}
                        {hasExisting && (
                          <td className="px-4 py-3 text-center">
                            {existingRecord ? (
                              <button
                                onClick={() => {
                                  setUpdateModal({ record: existingRecord, student: s });
                                  setUpdateStatus(existingRecord.attendenceStatus as AttendanceStatus);
                                }}
                                className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                                <Pencil className="h-3 w-3" /> Edit
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground/40">—</span>
                            )}
                          </td>
                        )}
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
              <PaginationControls
                page={studentPagination.page}
                pageSize={studentPagination.pageSize}
                total={studentPagination.total}
                onPageChange={studentPagination.setPage}
              />
            </div>
          )}

          {/* Save button */}
          {students.length > 0 && !hasExisting && (
            <div className="mt-6 flex justify-end">
              <button onClick={handleSave} disabled={saving || saved}
                className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                  saved
                    ? "bg-green-100 text-green-700 border border-green-300"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}>
                {saved ? <><Check className="h-4 w-4" /> Saved</> : saving ? "Saving..." : <><Save className="h-4 w-4" /> Save Attendance</>}
              </button>
            </div>
          )}
        </>
      )}

      {/* ══════════ HISTORY TAB ══════════ */}
      {activeTab === "history" && (
        <div className="space-y-3">
          {historyLoading && (
            <div className="space-y-3">
              {[1,2,3].map((i) => <div key={i} className="h-14 rounded-xl border border-border bg-card animate-pulse" />)}
            </div>
          )}

          {!historyLoading && historyGroups.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12 text-center">
              <History className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No attendance history yet.</p>
            </div>
          )}

          {!historyLoading && historyGroups.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-card">
              <div className="divide-y divide-border">
                {historyPagination.pageItems
                  .map(({ cid, className, dateKey, records, totalSessions }: any) => {
                    const present    = records.filter((r: any) => r.attendenceStatus === "P").length;
                    const absent     = records.filter((r: any) => r.attendenceStatus === "A").length;
                    const leave      = records.filter((r: any) => r.attendenceStatus === "L").length;
                    const isExpanded = expandedDate === `${cid}-${dateKey}`;

                    return (
                      <div key={`${cid}-${dateKey}`}>
                        <button
                          type="button"
                          onClick={() => setExpandedDate(isExpanded ? null : `${cid}-${dateKey}`)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/20 transition-colors text-left">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{className}</p>
                            <p className="text-sm font-medium text-foreground">{dateKey}</p>
                            <p className="text-xs text-muted-foreground">{records.length} students · {totalSessions} sessions recorded</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">P:{present}</span>
                            <span className="text-xs text-red-700 bg-red-100 px-2 py-0.5 rounded-full">A:{absent}</span>
                            {leave > 0 && <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">L:{leave}</span>}
                          </div>
                        </button>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="border-t border-border">
                                {records.map((r: any, ri: number) => {
                                  const sname = typeof r.studentId === "object"
                                    ? `${r.studentId.name} ${r.studentId.lastName ?? ""}`.trim()
                                    : r.studentId;
                                  const sid = typeof r.studentId === "object" ? r.studentId.specialId : "—";
                                  return (
                                    <div key={ri} className="flex items-center justify-between px-4 py-2 border-b border-border last:border-0 hover:bg-secondary/10">
                                      <div>
                                        <p className="text-xs font-medium text-foreground">{sname}</p>
                                        <p className="text-xs text-muted-foreground">{sid}</p>
                                      </div>
                                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                                        r.attendenceStatus === "P" ? "bg-green-100 text-green-700 border-green-300"
                                        : r.attendenceStatus === "A" ? "bg-red-100 text-red-700 border-red-300"
                                        : "bg-yellow-100 text-yellow-700 border-yellow-300"
                                      }`}>
                                        {r.attendenceStatus === "P" ? "Present" : r.attendenceStatus === "A" ? "Absent" : "Leave"}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                          </AnimatePresence>
                      </div>
                    );
                  })}
              </div>
              <PaginationControls
                page={historyPagination.page}
                pageSize={historyPagination.pageSize}
                total={historyPagination.total}
                onPageChange={(page) => {
                  setExpandedDate(null);
                  historyPagination.setPage(page);
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* ══════════ UPDATE MODAL ══════════ */}
      <AnimatePresence>
        {updateModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setUpdateModal(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-modal p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">Update Attendance</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {updateModal.student?.name} {updateModal.student?.lastName}
                  </p>
                </div>
                <button onClick={() => setUpdateModal(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex gap-3 mb-6">
                {(["P", "A", "L"] as AttendanceStatus[]).map((st) => (
                  <button key={st} onClick={() => setUpdateStatus(st)}
                    className={`flex-1 rounded-lg border py-2.5 text-sm font-bold transition-all ${
                      updateStatus === st
                        ? `${statusConfig[st].activeBg} ${statusConfig[st].color} ring-2 ring-offset-1`
                        : `${statusConfig[st].bg} ${statusConfig[st].color}`
                    }`}>
                    {statusConfig[st].label}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setUpdateModal(null)}
                  className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors">
                  Cancel
                </button>
                <button onClick={handleUpdate} disabled={updating}
                  className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {updating ? "Saving..." : "Update"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AttendanceMarker;
