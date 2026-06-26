import { API} from "./otherService";


class UserService{
  private static authHeaders() {
    return {
      "Content-Type": "application/json",
    };
  }

  static async getCurrentUser(){
    const res=await fetch(`${API}/users/me`,{method:"GET",headers:this.authHeaders(),credentials:"include",});

    const result=await res.json();
    return result?.user ?? result;
  }
  static async addProf(data){
    const res=await fetch(`${API}/users/professor`,{method:"POST",headers:this.authHeaders(),credentials:"include",body:JSON.stringify(data)});
    const result=await res.json();
    return result;
  }
  static async getUsers(role:string){
    const res=await fetch(`${API}/users?role=${role}`,{method:"GET",headers:this.authHeaders(),credentials:"include",});
    const result=await res.json();
    return result;
  }

  // userService.ts — add these
static async getStruckOffStudents(page = 1, limit = 25) {
  const res = await fetch(`${API}/class/struck-off-students?page=${page}&limit=${limit}`, {
    method: "GET",
    headers: this.authHeaders(),
    credentials:"include",
  });
  return res.json();
}

static async getStudentAttendance(classId: string, studentId: string) {
  const res = await fetch(`${API}/attendance/student/${classId}/${studentId}`, {
    method: "GET",
    headers: this.authHeaders(),
    credentials:"include",
  });
  return res.json();
}
  // userService.ts — add this method
static async bulkUploadStudents(formData: FormData) {
  const res = await fetch(`${API}/users/students/bulk-upload`, {
    method: "POST",
   credentials:"include",
    body: formData,
  });
  return res.json();
}

  static async addStudent(data){
    const res=await fetch(`${API}/users/student`,{method:"POST",headers:this.authHeaders(),credentials:"include",body:JSON.stringify(data)});

    const result=await res.json();
    return result;
  }

  static async updateUser(id:string,data){
    const res=await fetch(`${API}/users/${id}`,{method:"PUT",headers:this.authHeaders(),credentials:"include",body:JSON.stringify(data)});
    const result=await res.json();
    return result;
  }

  static async deleteUser(id:string){
    const res=await fetch(`${API}/users/${id}`,{method:"DELETE",headers:this.authHeaders(),credentials:"include",});
    const result=await res.json();
    return result;
  }

static async getTeacherSchedule (teacherId: string){
  const res = await fetch(`${API}/users/get-schedule/${teacherId}`,{method:"GET",headers:this.authHeaders(),credentials:"include",});
  return res.json();
}
}

export default UserService
