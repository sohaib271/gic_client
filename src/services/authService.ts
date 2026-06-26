import { API } from "./otherService";

class AuthService{
  static async adminLogin(data){
    const res=await fetch(`${API}/auth/admin/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data),credentials:"include"});

    return await res.json();
  }
  static async logout(id:string){
    const res=await fetch(`${API}/auth/logout/${id}`,{method:"GET",headers:{"Content-Type":"application/json"},credentials:"include"});

    return await res.json();
  }

  static async login(data){
    const res=await fetch(`${API}/auth/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data),credentials:"include"});

    return await res.json();
  }
}

export default AuthService;
