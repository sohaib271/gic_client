import { API } from "./otherService";

class FeeService {
  private static authHeaders() {
    return {
      "Content-Type": "application/json",
    };
  }

  // Generate fee for students
  static async generateFee(data: {
    studentIds: string[];
    classId: string;
    month: string;
    year: number;
    amount: number;
    dueDate: string;
    description?: string;
    category: "intermediate" | "bs" | "adp";
    semester?: string;
    customFields?: { label: string; value: any }[];
  }) {
    const res = await fetch(`${API}/fee/generate`, {
      method: "POST",
      headers: this.authHeaders(),
      credentials: "include",
      body: JSON.stringify(data),
    });
    return res.json();
  }

  // Get fee records with filters
  static async getFeeRecords(params: {
    studentId?: string;
    classId?: string;
    month?: string;
    year?: number;
    status?: string;
    category?: string;
    semester?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const query = new URLSearchParams();
    if (params.studentId) query.set("studentId", params.studentId);
    if (params.classId) query.set("classId", params.classId);
    if (params.month) query.set("month", params.month);
    if (params.year) query.set("year", String(params.year));
    if (params.status) query.set("status", params.status);
    if (params.category) query.set("category", params.category);
    if (params.semester) query.set("semester", params.semester);
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));

    const res = await fetch(`${API}/fee/records?${query.toString()}`, {
      method: "GET",
      headers: this.authHeaders(),
      credentials: "include",
    });
    return res.json();
  }

  // Get fee record by ID
  static async getFeeRecordById(id: string) {
    const res = await fetch(`${API}/fee/records/${id}`, {
      method: "GET",
      headers: this.authHeaders(),
      credentials: "include",
    });
    return res.json();
  }

  // Update fee status (mark as paid/unpaid/waived)
  static async updateFeeStatus(
    id: string,
    data: { status: "pending" | "paid" | "waived"; paidDate?: string }
  ) {
    const res = await fetch(`${API}/fee/records/${id}/status`, {
      method: "PATCH",
      headers: this.authHeaders(),
      credentials: "include",
      body: JSON.stringify(data),
    });
    return res.json();
  }

  // Get student fee summary (same as mobile)
  static async getStudentFeeSummary(studentId: string, semester?: string) {
    const query = new URLSearchParams();
    if (semester) query.set("semester", semester);
    const qs = query.toString() ? `?${query.toString()}` : "";
    const res = await fetch(`${API}/fee/student/${studentId}/summary${qs}`, {
      method: "GET",
      headers: this.authHeaders(),
      credentials: "include",
    });
    const data = await res.json();
    
    // Transform records array to summary format (same as mobile endpoint)
    if (data?.records) {
      const records = data.records;
      return {
        totalRecords: data.pagination?.total || records.length,
        totalAmount: records.reduce((sum: number, r: any) => sum + r.amount, 0),
        paidAmount: records.filter((r: any) => r.status === 'paid').reduce((sum: number, r: any) => sum + r.amount, 0),
        pendingAmount: records.filter((r: any) => r.status === 'pending').reduce((sum: number, r: any) => sum + r.amount, 0),
        pending: records.filter((r: any) => r.status === 'pending'),
        paid: records.filter((r: any) => r.status === 'paid'),
        waived: records.filter((r: any) => r.status === 'waived'),
        category: records[0]?.category,
        semester: records[0]?.semester,
      };
    }
    return data;
  }

  // Delete fee record
  static async deleteFeeRecord(id: string) {
    const res = await fetch(`${API}/fee/records/${id}`, {
      method: "DELETE",
      headers: this.authHeaders(),
      credentials: "include",
    });
    return res.json();
  }

  // Approve fee (mark as paid)
  static async approveFee(id: string) {
    const res = await fetch(`${API}/fee/records/${id}/approve`, {
      method: "PATCH",
      headers: this.authHeaders(),
      credentials: "include",
    });
    return res.json();
  }

  // Unapprove fee (mark as pending/unpaid)
  static async unapproveFee(id: string) {
    const res = await fetch(`${API}/fee/records/${id}/unapprove`, {
      method: "PATCH",
      headers: this.authHeaders(),
      credentials: "include",
    });
    return res.json();
  }
}

export default FeeService;
