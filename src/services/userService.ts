import { store } from "@/store/store";
import { API} from "./otherService";


class UserService{

   static getToken() {
    return store.getState().user.token;
  }
  private static authHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.getToken()}`,
    };
  }

  static async getCurrentUser(){
    const res=await fetch(`${API}/users/me`,{method:"GET",headers:this.authHeaders()});

    const result=await res.json();
    return result;
  }
  static async addProf(data){
    const res=await fetch(`${API}/users/professor`,{method:"POST",headers:this.authHeaders(),body:JSON.stringify(data)});
    const result=await res.json();
    return result;
  }
  static async getUsers(role:string){
    const res=await fetch(`${API}/users?role=${role}`,{method:"GET",headers:this.authHeaders()});
    const result=await res.json();
    return result;
  }

  // userService.ts — add these
static async getStruckOffStudents() {
  const res = await fetch(`${API}/class/struck-off-students`, {
    method: "GET",
    headers: this.authHeaders(),
  });
  return res.json();
}

static async getStudentAttendance(classId: string, studentId: string) {
  const res = await fetch(`${API}/attendance/student/${classId}/${studentId}`, {
    method: "GET",
    headers: this.authHeaders(),
  });
  return res.json();
}
  // userService.ts — add this method
static async bulkUploadStudents(formData: FormData) {
  const res = await fetch(`${API}/users/students/bulk-upload`, {
    method: "POST",
    headers: {
      // ✅ Do NOT set Content-Type — browser sets it automatically with boundary for FormData
      Authorization: `Bearer ${this.getToken()}`,
    },
    body: formData,
  });
  return res.json();
}

  static async addStudent(data){
    const res=await fetch(`${API}/users/student`,{method:"POST",headers:this.authHeaders(),body:JSON.stringify(data)});

    const result=await res.json();
    return result;
  }

static async getTeacherSchedule (teacherId: string){
  const res = await fetch(`${API}/users/get-schedule/${teacherId}`,{method:"GET",headers:this.authHeaders()});
  return res.json();
}
}

export default UserService