import { store } from "@/store/store";
import { API } from "./otherService";

class ClassService {
  static getToken() {
    return store.getState().user.token;
  }

  private static authHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.getToken()}`,
    };
  }

  // ─── Classes ────────────────────────────────────────────────

  static async createClass(data: any) {
    const res = await fetch(`${API}/class/create`, {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  }

  static async getClasses(category?: string) {
    const query = category ? `?category=${category}` : "";
    const res = await fetch(`${API}/class/all${query}`, {
      method: "GET",
      headers: this.authHeaders(),
    });
    return res.json();
  }

  static async getClassInfo(classId: string) {
    const res = await fetch(`${API}/class/get-class-info/${classId}`, {
      method: "GET",
      headers: this.authHeaders(),
    });
    return res.json();
  }

  static async getClassStudents(classId: string) {
    const res = await fetch(`${API}/class/get-class-students/${classId}`, {
      method: "GET",
      headers: this.authHeaders(),
    });
    return res.json();
  }

  static async getAssignedTeachers(classId: string) {
    const res = await fetch(`${API}/class/get-assigned-teachers/${classId}`, {
      method: "GET",
      headers: this.authHeaders(),
    });
    return res.json();
  }

  static async updateClass(classId: string, data: { class?: string; session?: string }) {
    const res = await fetch(`${API}/class/update-class/${classId}`, {
      method: "PATCH",
      headers: this.authHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  }

  // ─── Teachers ───────────────────────────────────────────────

  /**
   * Assign a teacher to a class with subject + schedule.
   * POST /class/assign-teacher-to-class/:classId
   */
  static async addTeacherToClass(
    classId: string,
    payload: {
      teacherId: string;
      subject: string;
      schedule: { day: string; startTime: string; endTime: string }[];
    }
  ) {
    const res = await fetch(`${API}/class/assign-teacher-to-class/${classId}`, {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  /**
   * Remove a teacher from a class.
   * PATCH /class/remove-teacher-from-class/:classId/:teacherId
   */
  static async removeTeacherFromClass(classId: string, teacherId: string) {
    const res = await fetch(
      `${API}/class/remove-teacher-from-class/${classId}/${teacherId}`,
      {
        method: "PATCH",
        headers: this.authHeaders(),
      }
    );
    return res.json();
  }

  /**
   * Update a teacher's subject or full schedule (replaces existing schedule).
   * PATCH /class/:id/assignes/:teacherId
   */
  static async updateAssignedTeacher(
    classId: string,
    teacherId: string,
    data: { subject?: string; schedule?: { day: string; startTime: string; endTime: string }[] }
  ) {
    const res = await fetch(`${API}/class/${classId}/assignes/${teacherId}`, {
      method: "PATCH",
      headers: this.authHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  }

  // ─── Teacher Schedule ────────────────────────────────────────

  /**
   * Replace a teacher's entire schedule.
   * PATCH /class/:id/assignes/:teacherId/schedule
   */
  static async updateTeacherSchedule(
    classId: string,
    teacherId: string,
    schedule: { day: string; startTime: string; endTime: string }[]
  ) {
    const res = await fetch(
      `${API}/class/${classId}/assignes/${teacherId}/schedule`,
      {
        method: "PATCH",
        headers: this.authHeaders(),
        body: JSON.stringify({ schedule }),
      }
    );
    return res.json();
  }

  /**
   * Append new schedule entries to a teacher (no duplicates allowed by backend).
   * POST /class/:id/assignes/:teacherId/schedule
   */
  static async addTeacherSchedule(
    classId: string,
    teacherId: string,
    schedule: { day: string; startTime: string; endTime: string }[]
  ) {
    const res = await fetch(
      `${API}/class/${classId}/assignes/${teacherId}/schedule`,
      {
        method: "POST",
        headers: this.authHeaders(),
        body: JSON.stringify({ schedule }),
      }
    );
    return res.json();
  }

  // ─── Students ───────────────────────────────────────────────

  /**
   * Add a single student to a class.
   * POST /class/add-student-in-class/:classId/:studentId
   */
  static async addStudentToClass(classId: string, studentId: string) {
    const res = await fetch(
      `${API}/class/add-student-in-class/${classId}/${studentId}`,
      {
        method: "POST",
        headers: this.authHeaders(),
      }
    );
    return res.json();
  }

  /**
   * Remove a student from a class.
   * PATCH /class/remove-student-from-class/:classId/:studentId
   */
  static async removeStudentFromClass(classId: string, studentId: string) {
    const res = await fetch(
      `${API}/class/remove-student-from-class/${classId}/${studentId}`,
      {
        method: "PATCH",
        headers: this.authHeaders(),
      }
    );
    return res.json();
  }

  // ─── Attendance ─────────────────────────────────────────────

  static async markAttendance(
    classId: string,
    data: {
      date: string;
      teacherId: string;
      attendance: { studentId: string; status: string }[];
    }
  ) {
    const res = await fetch(`${API}/class/${classId}/attendance`, {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  }

  static async getAttendance(classId: string, date: string) {
    const res = await fetch(`${API}/class/${classId}/attendance?date=${date}`, {
      method: "GET",
      headers: this.authHeaders(),
    });
    return res.json();
  }
}

export default ClassService;