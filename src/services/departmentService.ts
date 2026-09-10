import {API} from "./otherService";

interface Department {
  _id?: string;
  name: string;
  code?: string;
  category?: "intermediate" | "bs_adp" | null;
}

class DepartmentService{
 
  static async getAllDepartments(){
    const res=await fetch(`${API}/departments`,{method:"GET",headers:{"Content-Type":"application/json"},credentials:"include",});

    const result=await res.json();

    return result;
  }

  static async createDepartment(data: Omit<Department, '_id'>){
    const res=await fetch(`${API}/departments/create`,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      credentials:"include",
      body:JSON.stringify(data)
    });

    const result=await res.json();

    return result;
  }
}
export default DepartmentService