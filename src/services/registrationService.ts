import { API } from "./otherService";

/** Public endpoints — no credentials, the token in the URL is the authority. */
class RegistrationService {
  private static authHeaders() {
    return { "Content-Type": "application/json" };
  }

  /** What the form needs to render itself: department, category, whether inter marks apply. */
  static async getLinkInfo(token: string) {
    const res = await fetch(`${API}/registration/link/${token}`, {
      method: "GET",
      headers: this.authHeaders(),
    });
    return res.json();
  }

  static async apply(payload: {
    registrationToken: string;
    name: string;
    lastName: string;
    email: string;
    password: string;
    cnic: string;
    phone: string;
    address: string;
    city: string;
    matricMarks: number;
    interMarks?: number;
    doj: string;
    whatsappNumber?: string;
    subjects?: string;
    gender: string;
    shift?: string;
  }) {
    const res = await fetch(`${API}/registration/apply`, {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  // ── HOD / admin only ──

  static async createLink(payload: {
    department: string;
    category?: string;
    class?: string;
    session?: string;
    maxUses?: number;
    expiresInDays?: number;
  }) {
    const res = await fetch(`${API}/registration/links`, {
      method: "POST",
      headers: this.authHeaders(),
      credentials: "include",
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  static async listLinks(department?: string) {
    const qs = department ? `?department=${department}` : "";
    const res = await fetch(`${API}/registration/links${qs}`, {
      method: "GET",
      headers: this.authHeaders(),
      credentials: "include",
    });
    return res.json();
  }

  static async revokeLink(id: string) {
    const res = await fetch(`${API}/registration/links/${id}/revoke`, {
      method: "PATCH",
      headers: this.authHeaders(),
      credentials: "include",
      body: JSON.stringify({}),
    });
    return res.json();
  }

  static async listPending(params?: { department?: string; page?: number; limit?: number }) {
    const qs = new URLSearchParams();
    if (params?.department) qs.set("department", params.department);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    const res = await fetch(`${API}/registration/pending${suffix}`, {
      method: "GET",
      headers: this.authHeaders(),
      credentials: "include",
    });
    return res.json();
  }

  static async review(id: string, payload: { decision: "approved" | "rejected"; reason?: string }) {
    const res = await fetch(`${API}/registration/applications/${id}`, {
      method: "PATCH",
      headers: this.authHeaders(),
      credentials: "include",
      body: JSON.stringify(payload),
    });
    return res.json();
  }
}

export default RegistrationService;
