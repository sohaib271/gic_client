import { API } from "./otherService";

class LeaveTypeService {
  private static headers() {
    return { "Content-Type": "application/json" };
  }

  static async getLeaveTypes() {
    const res = await fetch(`${API}/leave-types`, {
      method: "GET",
      headers: this.headers(),
      credentials: "include",
    });
    return res.json();
  }

  static async addLeaveType(name: string) {
    const res = await fetch(`${API}/leave-types`, {
      method: "POST",
      headers: this.headers(),
      credentials: "include",
      body: JSON.stringify({ name }),
    });
    return res.json();
  }

  static async deleteLeaveType(id: string) {
    const res = await fetch(`${API}/leave-types/${id}`, {
      method: "DELETE",
      headers: this.headers(),
      credentials: "include",
    });
    return res.json();
  }
}

export default LeaveTypeService;