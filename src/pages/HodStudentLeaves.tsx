import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  Check,
  Inbox,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import TableSkeleton from "@/components/TableSkeleton";
import type { LeaveApplication, LeaveStatus } from "@/services/leaveApplicationService";
import {
  LEAVE_FILTERS,
  applicationsError,
  applicationStatus,
  classOf,
  daysBetween,
  formatDate,
  leaveTypeLabel,
  normalizeApplications,
  studentName,
  studentRollNo,
  useDecideLeave,
  useLeaveApplications,
  useLeaveTypes,
  type LeaveFilter,
} from "@/hooks/useLeaveApplications";

const statusStyle: Record<LeaveStatus | "unknown", { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-amber-50 text-amber-700" },
  approved: { label: "Approved", cls: "bg-emerald-50 text-emerald-700" },
  rejected: { label: "Rejected", cls: "bg-red-50 text-red-700" },
  // A student can withdraw a pending request, so the HOD sees it too.
  cancelled: { label: "Cancelled", cls: "bg-slate-100 text-slate-600" },
  unknown: { label: "Unknown", cls: "bg-secondary text-muted-foreground" },
};

const HodStudentLeaves = () => {
  const navigate = useNavigate();
  const { data: res, isLoading, isFetching, isError } = useLeaveApplications();
  const { data: leaveTypes } = useLeaveTypes();
  const decide = useDecideLeave();

  const [filter, setFilter] = useState<LeaveFilter>("pending");
  const [query, setQuery] = useState("");
  const [rejectTarget, setRejectTarget] = useState<LeaveApplication | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // A thrown fetch (server down, non-JSON error page) also means "no list".
  const loadError =
    applicationsError(res) ||
    (isError ? "The server could not be reached. Please try again." : "");
  const all = useMemo(() => (loadError ? [] : normalizeApplications(res)), [res, loadError]);

  const typesById = useMemo(() => {
    const list = Array.isArray(leaveTypes)
      ? leaveTypes
      : Array.isArray((leaveTypes as any)?.data)
        ? (leaveTypes as any).data
        : [];
    const map: Record<string, string> = {};
    list.forEach((t: any) => {
      if (t?._id && t?.name) map[t._id] = t.name;
    });
    return map;
  }, [leaveTypes]);

  const counts = useMemo(() => {
    // `all` is a live view of the whole inbox, so the tab counters always
    // match what the table can show rather than the active filter or search.
    const base: Record<LeaveFilter, number> = {
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
      all: all.length,
    };
    all.forEach((a) => {
      const status = applicationStatus(a);
      if (status !== "unknown") base[status] += 1;
    });
    return base;
  }, [all]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all
      .filter((a) => filter === "all" || applicationStatus(a) === filter)
      .filter((a) => {
        if (!q) return true;
        return (
          studentName(a).toLowerCase().includes(q) ||
          studentRollNo(a).toLowerCase().includes(q) ||
          classOf(a).toLowerCase().includes(q) ||
          leaveTypeLabel(a, typesById).toLowerCase().includes(q)
        );
      })
      .sort((a, b) =>
        String(b?.appliedAt ?? "").localeCompare(String(a?.appliedAt ?? "")),
      );
  }, [all, filter, query, typesById]);

  const act = async (
    application: LeaveApplication,
    decision: "approve" | "reject",
    reason?: string,
  ) => {
    try {
      await decide.mutateAsync({ id: application._id, decision, reason });

      toast.success(
        decision === "approve" ? "Leave approved" : "Leave rejected",
        {
          description: `${studentName(application)} · ${
            formatDate(application.fromDate) === "—"
              ? "leave"
              : formatDate(application.fromDate)
          }`,
        },
      );
    } catch (error: any) {
      // The service throws a LeaveApiError carrying the backend's own message.
      toast.error(error?.message || `Could not ${decision} the leave`);
    }
  };

  const openReject = (application: LeaveApplication) => {
    setRejectTarget(application);
    setRejectReason("");
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    await act(rejectTarget, "reject", rejectReason.trim());
    setRejectTarget(null);
    setRejectReason("");
  };

  const busyId = decide.isPending ? decide.variables?.id : null;

  return (
    <div>
      <button
        onClick={() => navigate("/professor/settings")}
        className="mb-4 flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Settings
      </button>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-2 flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">
            Student Leaves
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Approve or reject the leave applications of your department&apos;s students.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isFetching && !isLoading && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Refreshing
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/professor/settings/leave-types")}
          >
            <CalendarClock className="mr-2 h-4 w-4" />
            Leave Types
          </Button>
        </div>
      </motion.div>

      {loadError && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Leave applications could not be loaded</p>
            <p className="mt-0.5 text-xs">{loadError}</p>
            <p className="mt-1.5 text-xs text-amber-700">
              You can only review the applications of your own department. If this
              persists, sign out and back in to refresh your session.
            </p>
          </div>
        </div>
      )}

      {!loadError && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {([
              { key: "pending" as LeaveFilter, label: "Pending", cls: "text-amber-600" },
              { key: "approved" as LeaveFilter, label: "Approved", cls: "text-emerald-600" },
              { key: "rejected" as LeaveFilter, label: "Rejected", cls: "text-red-600" },
            ]).map((card) => (
              <button
                key={card.key}
                onClick={() => setFilter(card.key)}
                className={`rounded-xl border bg-white p-4 text-left shadow-sm transition-all ${
                  filter === card.key
                    ? "border-primary/50 ring-1 ring-primary/30"
                    : "border-gray-200 hover:border-primary/30"
                }`}
              >
                <p className={`text-lg font-bold ${card.cls}`}>{counts[card.key]}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </button>
            ))}
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {LEAVE_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    filter === f.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  }`}
                >
                  {f.label} ({counts[f.key]})
                </button>
              ))}
            </div>

            <div className="flex h-10 items-center gap-2 rounded-lg border border-input bg-background px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search student, roll no, class..."
                className="h-auto border-0 p-0 text-sm focus-visible:ring-0"
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-card">
            {isLoading ? (
              <div className="p-4">
                <TableSkeleton rows={5} cols={6} />
              </div>
            ) : visible.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-12 text-center">
                <Inbox className="h-9 w-9 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {all.length === 0
                    ? "No leave applications yet."
                    : `No ${filter} applications match your search.`}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-border">
                      {[
                        "Student",
                        "Roll No",
                        "Class",
                        "Leave Type",
                        "From",
                        "To",
                        "Days",
                        "Reason",
                        "Applied",
                        "Status",
                        "Action",
                      ].map((h) => (
                        <th
                          key={h}
                          className="table-header p-3 text-left text-xs font-medium text-muted-foreground"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((a) => {
                      const status = applicationStatus(a);
                      const style = statusStyle[status];
                      const days = daysBetween(a);
                      const pending = status === "pending";

                      return (
                        <tr
                          key={a._id}
                          className="border-b border-border last:border-0 transition-colors hover:bg-secondary/40"
                        >
                          <td className="p-3 text-sm font-medium text-foreground">
                            {studentName(a)}
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">
                            {studentRollNo(a)}
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">
                            {classOf(a)}
                          </td>
                          <td className="p-3 text-sm text-foreground">
                            {leaveTypeLabel(a, typesById)}
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">
                            {formatDate(a.fromDate)}
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">
                            {formatDate(a.toDate)}
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">{days || "—"}</td>
                          <td className="max-w-[220px] p-3 text-xs text-muted-foreground">
                            <span className="line-clamp-2" title={a.reason}>
                              {a.reason || "—"}
                            </span>
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">
                            {formatDate(a.appliedAt)}
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${style.cls}`}
                            >
                              {style.label}
                            </span>
                            {status === "rejected" && a.rejectionReason && (
                              <p
                                className="mt-1 max-w-[160px] truncate text-[11px] text-muted-foreground"
                                title={a.rejectionReason}
                              >
                                {a.rejectionReason}
                              </p>
                            )}
                          </td>
                          <td className="p-3">
                            {pending ? (
                              <div className="flex items-center gap-1.5">
                                <Button
                                  size="sm"
                                  className="h-8 gap-1 text-xs"
                                  disabled={busyId === a._id}
                                  onClick={() => act(a, "approve")}
                                >
                                  {busyId === a._id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5" />
                                  )}
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 gap-1 border-red-200 text-xs text-red-600 hover:bg-red-50"
                                  disabled={busyId === a._id}
                                  onClick={() => openReject(a)}
                                >
                                  <X className="h-3.5 w-3.5" />
                                  Reject
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {formatDate(a.decidedAt)}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <AnimatePresence>
        {rejectTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setRejectTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-card p-6 shadow-modal"
            >
              <div className="mb-1 flex items-center gap-2">
                <div className="rounded-lg bg-red-50 p-2">
                  <X className="h-4 w-4 text-red-600" />
                </div>
                <h3 className="font-display text-base font-bold text-foreground">
                  Reject this leave?
                </h3>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {studentName(rejectTarget)} · {leaveTypeLabel(rejectTarget, typesById)} ·{" "}
                {formatDate(rejectTarget.fromDate)}
              </p>

              <label className="mb-1 mt-4 block text-xs font-medium text-muted-foreground">
                Reason (optional)
              </label>
              <Textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Medical certificate not attached"
              />

              <div className="mt-5 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setRejectTarget(null)}
                  disabled={decide.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmReject}
                  disabled={decide.isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {decide.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                  Reject leave
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HodStudentLeaves;
