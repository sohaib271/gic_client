import { store } from "@/store/store";
import { API } from "./otherService";

/** One row of the midterm schedule table. */
export interface MidtermPaper {
  paper: string;
  day: string;
  date: string;
  start: string;
  end: string;
}

export interface MidtermSchedule {
  classId: string;
  className: string;
  session: string;
  exists: boolean;
  papers: MidtermPaper[];
  summary: { papers: number; days: number; from: string; to: string };
  publishedAt: string | null;
  updatedAt: string | null;
  studentsCount?: number;
}

class MidtermService {
  private static authHeaders() {
    return {
      "Content-Type": "application/json",
    };
  }

  /**
   * HODs are scoped by department, and the backend's role guard reads the
   * `department` query param, so it has to ride along on every call.
   */
  private static departmentQuery() {
    const user = store.getState().user.user as any;
    const departmentId = user?.department?._id ?? user?.department;
    return user?.isHod && departmentId
      ? `?department=${encodeURIComponent(departmentId)}`
      : "";
  }

  static async getSchedule(classId: string): Promise<MidtermSchedule> {
    const res = await fetch(
      `${API}/midterm/schedule/${classId}${this.departmentQuery()}`,
      {
        method: "GET",
        headers: this.authHeaders(),
        credentials: "include",
      },
    );
    return res.json();
  }

  static async saveSchedule(
    classId: string,
    papers: MidtermPaper[],
    notify = true,
  ): Promise<MidtermSchedule & { studentsNotified: number }> {
    const res = await fetch(
      `${API}/midterm/schedule/${classId}${this.departmentQuery()}`,
      {
        method: "POST",
        headers: this.authHeaders(),
        credentials: "include",
        body: JSON.stringify({ papers, notify }),
      },
    );
    return res.json();
  }

  static async clearSchedule(classId: string) {
    const res = await fetch(
      `${API}/midterm/schedule/${classId}${this.departmentQuery()}`,
      {
        method: "DELETE",
        headers: this.authHeaders(),
        credentials: "include",
      },
    );
    return res.json();
  }
}

export default MidtermService;
