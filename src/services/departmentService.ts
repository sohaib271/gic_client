import {API} from "./otherService";


class DepartmentService{
 
  static async getAllDepartments(){
    const res=await fetch(`${API}/departments`,{method:"GET",headers:{"Content-Type":"application/json"},credentials:"include",});

    const result=await res.json();

    return result;
  }
}
export default DepartmentService