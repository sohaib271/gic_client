import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import LeaveApplicationService, {
  type LeaveApplication,
} from "@/services/leaveApplicationService";
import LeaveTypeService from "@/services/leaveTypeService";
// Generic NestJS payload helpers already exported by the midterm hooks.
import { apiErrorMessage, isApiError } from "@/hooks/useMidtermSchedule";

export const LEAVE_QUERY_KEY = "leave-applications";

/** The four status buckets the backend itself reports on. */
export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";
export type LeaveFilter = "all" | LeaveStatus;

/** The tabs above the table. */
export const LEAVE_FILTERS: { key: LeaveFilter; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

export const useLeaveApplications = () =>
  useQuery({
    queryKey: [LEAVE_QUERY_KEY],
    queryFn: () => LeaveApplicationService.getApplications(),
    retry: false,
  });

/** Leave type names, used to label applications that only carry an id. */
export const useLeaveTypes = () =>
  useQuery({
    queryKey: ["leave-types"],
    queryFn: () => LeaveTypeService.getLeaveTypes(),
    retry: false,
    staleTime: 300_000,
  });

export const useDecideLeave = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: {
      id: string;
      decision: "approve" | "reject";
      reason?: string;
    }) =>
      vars.decision === "approve"
        ? LeaveApplicationService.approve(vars.id)
        : LeaveApplicationService.reject(vars.id, vars.reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LEAVE_QUERY_KEY] });
    },
  });
};

/**
 * The service already unwraps the payload, so this only has to reach into the
 * `applications` array. It stays tolerant of a bare list so the page keeps
 * working if the response is ever served without the envelope.
 */
export const normalizeApplications = (res: any): LeaveApplication[] => {
  const list = Array.isArray(res)
    ? res
    : Array.isArray(res?.applications)
      ? res.applications
      : Array.isArray(res?.leaves)
        ? res.leaves
        : Array.isArray(res?.data)
          ? res.data
          : [];

  return list.filter((a: any) => a && (a._id || a.id));
};

/** True when the response is a NestJS error payload instead of a list. */
export const applicationsError = (res: any) =>
  isApiError(res) ? apiErrorMessage(res, "Could not load leave applications") : "";

export const applicationStatus = (app: LeaveApplication): LeaveStatus | "unknown" => {
  const raw = String(app?.status ?? "").trim().toLowerCase();
  if (raw === "approved" || raw === "approve" || raw === "accepted") return "approved";
  if (raw === "rejected" || raw === "reject" || raw === "declined") return "rejected";
  if (raw === "cancelled" || raw === "canceled") return "cancelled";
  if (raw === "pending") return "pending";
  return "unknown";
};

const student = (app: LeaveApplication): any =>
  app?.studentId && typeof app.studentId === "object" ? app.studentId : null;

export const studentName = (app: LeaveApplication): string => {
  const s = student(app);
  if (s) return `${s.name ?? ""} ${s.lastName ?? ""}`.trim() || "—";
  // The backend snapshots the name on the leave row, so a student record that
  // was later edited or removed still renders something readable.
  return app?.studentName || "—";
};

export const studentRollNo = (app: LeaveApplication): string => {
  const s = student(app);
  return s?.specialId ?? s?.rollNo ?? app?.studentSpecialId ?? "—";
};

/**
 * Photo + name parts for the student avatar. `studentId` is null once the
 * student record is deleted, in which case we fall back to the name snapshot
 * stored on the leave row so the row still renders initials instead of a gap.
 */
export const studentIdentity = (
  app: LeaveApplication,
): { image: string; name: string; lastName: string } => {
  const s = student(app);
  if (s) {
    return { image: s?.image ?? "", name: s?.name ?? "", lastName: s?.lastName ?? "" };
  }
  const parts = String(app?.studentName ?? "").trim().split(/\s+/);
  return { image: "", name: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
};

export const classOf = (app: LeaveApplication): string => {
  const s = student(app);
  return s?.className ?? app?.className ?? "—";
};

/** Prefer the name embedded in the row, then the id resolved from leave types. */
export const leaveTypeLabel = (
  app: LeaveApplication,
  typesById: Record<string, string>,
): string => {
  if (app?.leaveTypeName) return app.leaveTypeName;
  if (app?.leaveType && typeof app.leaveType === "object" && app.leaveType.name) {
    return app.leaveType.name;
  }
  if (app?.leaveTypeId && typesById[app.leaveTypeId]) return typesById[app.leaveTypeId];
  return "—";
};

export const formatDate = (value?: string): string => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/**
 * The backend pre-computes the duration on apply (and halves it for a half-day
 * request), so trust `totalDays` and only fall back to counting the range.
 */
export const daysBetween = (app: LeaveApplication): string => {
  if (typeof app?.totalDays === "number") return String(app.totalDays);
  if (!app?.fromDate || !app?.toDate) return "";
  const start = new Date(app.fromDate);
  const end = new Date(app.toDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return days > 0 ? String(days) : "";
};
