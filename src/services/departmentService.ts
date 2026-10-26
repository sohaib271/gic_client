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

  static async getDepartmentOverAllData(id: string){
    const res=await fetch(`${API}/departments/department_over_all_data/${id}`,{method:"GET",headers:{"Content-Type":"application/json"},credentials:"include",});
    const result=await res.json();
    return result;
  }

  /**
   * HOD department dashboard.
   * The department is resolved on the backend from the logged-in HOD token —
   * no department id is sent from the client.
   */
  static async getHodDashboard(params?: { from?: string; to?: string; year?: number }){
    const qs = new URLSearchParams();
    if (params?.from) qs.set("from", params.from);
    if (params?.to) qs.set("to", params.to);
    if (params?.year) qs.set("year", String(params.year));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";

    const res = await fetch(`${API}/departments/dashboard${suffix}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    return res.json();
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