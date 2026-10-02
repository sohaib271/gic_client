import { API } from "./otherService";

/**
 * The backend's `LeaveStatusEnum`. `cancelled` is included because a student
 * can withdraw a pending request, and the HOD list renders it as a
 * non-actionable row.
 */
export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

/** What the HOD table actually renders. */
export interface LeaveApplication {
  _id: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  dayPart?: string;
  totalDays?: number;
  reason?: string;
  contactNumber?: string;
  appliedAt?: string;
  decidedAt?: string;
  decidedBy?: string;
  rejectionReason?: string;
  leaveTypeId?: string;
  leaveTypeName?: string;
  leaveType?: { _id?: string; name?: string } | null;
  /** Snapshot taken on the leave row itself, so it survives a deleted user. */
  studentName?: string;
  studentSpecialId?: string;
  studentId?:
    | {
        _id?: string;
        specialId?: string;
        rollNo?: string;
        name?: string;
        lastName?: string;
        className?: string;
        image?: string;
      }
    | null;
  className?: string;
  departmentName?: string;
}

/** Summary counts the backend computes for the caller's scope. */
export interface LeaveScopeSummary {
  scope: string;
  canReview: boolean;
  departmentName?: string;
  summary: Record<LeaveStatus | "total", number>;
}

/** Error carrying the backend's own message, so the page can show it. */
export class LeaveApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "LeaveApiError";
  }
}

const asRecord = (value: unknown): Record<string, any> =>
  value && typeof value === "object" ? (value as Record<string, any>) : {};

/** Pulls the server's message out of a NestJS error payload. */
const messageOf = (payload: unknown, fallback: string): string => {
  const body = asRecord(payload);
  const raw = body.message ?? body.error ?? body.msg;
  if (typeof raw === "string" && raw.trim()) return raw;
  if (Array.isArray(raw) && raw.length) return String(raw[0]);
  return fallback;
};

class LeaveApplicationService {
  private static headers() {
    return { "Content-Type": "application/json" };
  }

  /**
   * Fails loudly on a non-2xx response instead of resolving with the error
   * body, so react-query surfaces `isError` rather than an empty table.
   */
  private static async request(path: string, init?: RequestInit) {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: this.headers(),
      // The portal authenticates with the `access_token` cookie.
      credentials: "include",
    });

    const text = await res.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }

    if (!res.ok) {
      throw new LeaveApiError(
        messageOf(body, `Request failed with status ${res.status}`),
        res.status,
      );
    }
    return body;
  }

  /**
   * The department scope is read from the JWT on the server, so no `department`
   * query param is sent — a HOD cannot widen their own view from the client.
   * `limit=100` keeps the whole (small) department inbox in one round trip,
   * which is what lets the four tabs and the counters work client-side.
   */
  static async getApplications(): Promise<LeaveScopeSummary & { applications: LeaveApplication[] }> {
    const body = asRecord(
      await this.request("/leave/my_leaves?limit=100&page=1"),
    );

    const rows = Array.isArray(body.leaves) ? body.leaves : [];
    const department = asRecord(body.department);

    return {
      scope: body.scope ?? "own",
      canReview: body.canReview === true,
      departmentName: department.name ?? department.code ?? undefined,
      summary: asRecord(body.summary),
      applications: rows.map((row: unknown) => this.toApplication(row)),
    };
  }

  static async approve(id: string) {
    return this.review(id, "approved");
  }

  static async reject(id: string, note = "") {
    return this.review(id, "rejected", note);
  }

  /**
   * Both decisions are the same endpoint; the backend rejects a second
   * decision on an already-reviewed request with a 409.
   */
  private static async review(id: string, status: "approved" | "rejected", note?: string) {
    const body = asRecord(
      await this.request(`/leave/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, ...(note?.trim() ? { note: note.trim() } : {}) }),
      }),
    );
    return {
      ...body,
      application: body.leave ? this.toApplication(body.leave) : undefined,
    };
  }

  /**
   * Maps one backend row onto the shape the HOD table expects. The backend
   * names things for its own consistency (`createdAt`, `reviewedAt`,
   * `decisionNote`), so translate once here instead of in every column.
   */
  private static toApplication(row: unknown): LeaveApplication {
    const source = asRecord(row);
    const studentRef = asRecord(source.studentId);
    const leaveTypeRef = asRecord(source.leaveType);
    const departmentRef = asRecord(source.department);

    return {
      _id: String(source._id ?? ""),
      status: source.status,
      fromDate: source.fromDate,
      toDate: source.toDate,
      dayPart: source.dayPart,
      totalDays: typeof source.totalDays === "number" ? source.totalDays : undefined,
      reason: source.reason,
      contactNumber: source.contactNumber ?? undefined,
      // `createdAt` is when the student pressed submit.
      appliedAt: source.createdAt,
      // `reviewedAt` is when the HOD decided; null while still pending.
      decidedAt: source.reviewedAt ?? undefined,
      decidedBy: source.reviewedByName ?? undefined,
      rejectionReason: source.decisionNote ?? undefined,
      leaveTypeId: leaveTypeRef._id ?? (typeof source.leaveType === "string" ? source.leaveType : undefined),
      leaveTypeName: source.leaveTypeName ?? leaveTypeRef.name ?? undefined,
      leaveType: leaveTypeRef._id ? { _id: leaveTypeRef._id, name: leaveTypeRef.name } : null,
      studentName: source.studentName,
      studentSpecialId: source.studentSpecialId,
      studentId: studentRef._id
        ? {
            _id: studentRef._id,
            specialId: studentRef.specialId,
            rollNo: studentRef.rollNo,
            name: studentRef.name,
            lastName: studentRef.lastName,
            className: studentRef.class,
          }
        : null,
      className: studentRef.class,
      departmentName: departmentRef.name ?? departmentRef.code ?? undefined,
    };
  }
}

export default LeaveApplicationService;
