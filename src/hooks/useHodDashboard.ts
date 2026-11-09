import { useQuery } from "@tanstack/react-query";
import DepartmentService from "@/services/departmentService";

/** Shape returned by GET /departments/dashboard (HOD scoped). */
export interface HodDashboardData {
  department: {
    _id: string;
    name: string;
    code?: string;
    category?: string | null;
  };
  range: { from: string; to: string };
  summary: {
    totalStudents: number;
    totalTeachers: number;
    totalClasses: number;
    todayPresent: number;
    todayAbsent: number;
    todayLeave: number;
    attendancePercent: number;
    pendingLeaves: number;
    approvedLeaves: number;
    pendingFees: number;
    collectionPercent: number;
  };
  students: {
    total: number;
    active: number;
    struckOff: number;
    onLeave: number;
    appliedLeave: number;
    pendingApproval: number;
    byClass: { class: string; count: number }[];
    byCategory: { category: string; count: number }[];
    bySession: { session: string; count: number }[];
    byGender: Record<string, number>;
  };
  teachers: {
    total: number;
    proff: number;
    staff: number;
    hod: number;
    principal: number;
    active: number;
  };
  classes: {
    _id: string;
    className: string;
    class?: string;
    category?: string;
    session?: string;
    students: number;
    teachers: number;
    subjects: number;
  }[];
  attendance: {
    today: {
      present: number;
      absent: number;
      leave: number;
      total: number;
      percent: number;
    };
    trend: {
      date: string;
      present: number;
      absent: number;
      leave: number;
      percent: number;
    }[];
    byClass: {
      classId: string;
      className: string;
      present: number;
      absent: number;
      leave: number;
      percent: number;
    }[];
    topAbsentStudents: {
      studentId: string;
      name: string;
      specialId: string;
      image: string;
      absentCount: number;
    }[];
  };
  teacherAttendance: {
    today: { checkedIn: number; checkedOut: number; absent: number };
    trend: { date: string; checkedIn: number; checkedOut: number }[];
  };
  fee: {
    year: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    waivedAmount: number;
    totalRecords: number;
    paidCount: number;
    pendingCount: number;
    waivedCount: number;
    collectionPercent: number;
  };
  leave: {
    pending: number;
    approved: number;
    rejected: number;
    cancelled: number;
    total: number;
    avgDays: number;
    byType: { type: string; count: number }[];
    recent: {
      id: string;
      studentId: string | null;
      studentName: string;
      studentImage: string;
      leaveTypeName: string;
      fromDate: string;
      toDate: string;
      totalDays: number;
      status: string;
      createdAt: string;
    }[];
  };
  remarks: {
    total: number;
    recent: {
      id: string;
      authorName: string;
      authorRole: string;
      authorImage: string;
      text: string;
      entityType: string;
      createdAt: string;
    }[];
  };
  midterm: {
    totalClasses: number;
    publishedClasses: number;
    upcomingPapers: number;
  };
}

export const HOD_DASHBOARD_KEY = "hod-dashboard";

/**
 * HOD department dashboard. The department is resolved on the backend from the
 * logged-in token, so only an optional year is sent from the client.
 */
export const useHodDashboard = (year?: number) =>
  useQuery({
    queryKey: [HOD_DASHBOARD_KEY, year ?? "current"],
    queryFn: async (): Promise<HodDashboardData> => {
      const data = await DepartmentService.getHodDashboard({ year });
      if (data && !Array.isArray(data) && Number(data.statusCode) >= 400) {
        throw new Error(data.message || "Could not load the dashboard");
      }
      return data;
    },
    retry: false,
    staleTime: 60_000,
  });
