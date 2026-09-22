import { API } from "./otherService";

class AuthService{
  static async adminLogin(data){
    const res=await fetch(`${API}/auth/admin/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data),credentials:"include"});

    return await res.json();
  }

  static async changePassword(currentPassword: string, newPassword: string){
    const token = localStorage.getItem("auth_token");
    const res=await fetch(`${API}/auth/change-password`,{method:"POST",headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({currentPassword,newPassword}),credentials:"include"});
    return await res.json();
  }

  static async sendResetOtp(email: string){
    const res=await fetch(`${API}/auth/forgot-password`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email}),credentials:"include"});
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
