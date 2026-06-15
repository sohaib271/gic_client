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

  private static departmentQuery() {
    const user = store.getState().user.user as any;
    const departmentId = user?.department?._id ?? user?.department;
    return user?.isHod && departmentId
      ? `?department=${encodeURIComponent(departmentId)}`
      : "";
  }

  static async createClass(data: any) {
    const res = await fetch(`${API}/class/create${this.departmentQuery()}`, {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  }

  static async getClasses(category?: string,department?:string) {
    let query = "";
    if(category) query=`?category=${category}`;
    if(department) query=`?department=${department}`;
    if(category && department) query=`?category=${category}&department=${department}`;
    const res = await fetch(`${API}/class/all${query}`, {
      method: "GET",
      headers: this.authHeaders(),
    });
    return res.json();
  }

  static async getMyClasses() {
    const res = await fetch(`${API}/class/my-classes`, {
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
    const res = await fetch(`${API}/class/get-class-students/${classId}${this.departmentQuery()}`, {
      method: "GET",
      headers: this.authHeaders(),
    });
    return res.json();
  }

  static async getAssignedTeachers(classId: string) {
    const res = await fetch(`${API}/class/get-assigned-teachers/${classId}${this.departmentQuery()}`, {
      method: "GET",
      headers: this.authHeaders(),
    });
    return res.json();
  }

  static async updateClass(classId: string, data: { class?: string; session?: string }) {
    const res = await fetch(`${API}/class/update-class/${classId}${this.departmentQuery()}`, {
      method: "PATCH",
      headers: this.authHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  }

  static async addTeacherToClass(
    classId: string,
    payload: {
      teacherId: string;
      subject: string;
      schedule: { day: string; startTime: string; endTime: string }[];
    }
  ) {
    const res = await fetch(`${API}/class/assign-teacher-to-class/${classId}${this.departmentQuery()}`, {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  static async removeTeacherFromClass(classId: string, teacherId: string) {
    const res = await fetch(
      `${API}/class/remove-teacher-from-class/${classId}/${teacherId}${this.departmentQuery()}`,
      {
        method: "PATCH",
        headers: this.authHeaders(),
      }
    );
    return res.json();
  }

  static async updateAssignedTeacher(
    classId: string,
    teacherId: string,
    data: { subject?: string; schedule?: { day: string; startTime: string; endTime: string }[] }
  ) {
    const res = await fetch(`${API}/class/${classId}/assignes/${teacherId}${this.departmentQuery()}`, {
      method: "PATCH",
      headers: this.authHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  }
  static async updateTeacherSchedule(
    classId: string,
    teacherId: string,
    schedule: { day: string; startTime: string; endTime: string }[]
  ) {
    const res = await fetch(
      `${API}/class/${classId}/assignes/${teacherId}/schedule${this.departmentQuery()}`,
      {
        method: "PATCH",
        headers: this.authHeaders(),
        body: JSON.stringify({ schedule }),
      }
    );
    return res.json();
  }

  static async addTeacherSchedule(
    classId: string,
    teacherId: string,
    schedule: { day: string; startTime: string; endTime: string }[]
  ) {
    const res = await fetch(
      `${API}/class/${classId}/assignes/${teacherId}/schedule${this.departmentQuery()}`,
      {
        method: "POST",
        headers: this.authHeaders(),
        body: JSON.stringify({ schedule }),
      }
    );
    return res.json();
  }

  static async addStudentToClass(classId: string, studentId: string) {
    const res = await fetch(
      `${API}/class/add-student-in-class/${classId}/${studentId}${this.departmentQuery()}`,
      {
        method: "POST",
        headers: this.authHeaders(),
      }
    );
    return res.json();
  }

  static async removeStudentFromClass(classId: string, studentId: string) {
    const res = await fetch(
      `${API}/class/remove-student-from-class/${classId}/${studentId}${this.departmentQuery()}`,
      {
        method: "PATCH",
        headers: this.authHeaders(),
      }
    );
    return res.json();
  }

static async markBulkAttendance(data: {
  classId: string;
  teacherId: string;
  date: string;
  lectureNumber?: number;
  records: { studentId: string; attendenceStatus: string }[];
}) {
  const res = await fetch(`${API}/attendance/mark-bulk`, {
    method: "POST",
    headers: this.authHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
}

static async updateStudentAttendance(attendanceId: string, data: {
  classId: string;
  teacherId: string;
  studentId: string;
  attendenceStatus: string;
}) {
  const res = await fetch(`${API}/attendance/update/${attendanceId}`, {
    method: "PATCH",
    headers: this.authHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
}

static async getClassAttendanceByTeacher(classId: string, teacherId: string, date: string) {
  const res = await fetch(
    `${API}/attendance/class/${classId}/by-teacher?teacherId=${teacherId}&date=${date}`,
    { method: "GET", headers: this.authHeaders() }
  );
  return res.json();
}

static async getMyAttendanceHistory(teacherId: string, classId?: string) {
  const query = classId ? `?teacherId=${teacherId}&classId=${classId}` : `?teacherId=${teacherId}`;
  const res = await fetch(`${API}/attendance/my-history${query}`, {
    method: "GET",
    headers: this.authHeaders(),
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

  // classService.ts — add these
static async getAttendanceByDate(classId: string, date: string) {
  const res = await fetch(`${API}/attendance/class/${classId}?date=${date}`, {
    method: "GET",
    headers: this.authHeaders(),
  });
  return res.json();
}
}

export default ClassService;
