import { store } from "@/store/store";
import { API } from "./otherService";

class TeacherAttendanceService {

   static getToken() {
      return store.getState().user.token;
    }
    private static authHeaders() {
      return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.getToken()}`,
      };
    }
  // userService.ts — the mark attendance method calls /teacher/mark-attendance
static async markTeacherAttendanceByQR(data: {
  type: "check-in" | "check-out";
  gps: { latitude: number; longitude: number };
}) {
  const res = await fetch(`${API}/teacher/mark-attendance`, {
    method: "POST",
    headers: this.authHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
}

// services/teacherAttendanceService.ts — add
static async getTodayStatus() {
  const res = await fetch(`${API}/teacher/today-status`, {
    method: "GET",
    headers: this.authHeaders(),
  });
  return res.json();
}

static async getSharedQR() {
  const res = await fetch(`${API}/teacher/qr`, {
    method:  "GET",
    headers: this.authHeaders(),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result?.message ?? "Failed to generate QR");
  return result;
}

static async getTeacherQR(teacherId: string) {
  const res = await fetch(`${API}/teacher/qr/${teacherId}`, {
    method: "GET",
    headers: this.authHeaders(),
  });

  
  const result = await res.json();
  if (!res.ok) {
    throw new Error(result?.message ?? "Failed to generate QR");
  }
  return result;
}
}

export default TeacherAttendanceService;
