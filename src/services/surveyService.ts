import { API } from "./otherService";

export interface SurveyQuestion {
  question: string;
  type: "text" | "single" | "multiple";
  options: string[];
  required: boolean;
}

export interface SurveyItem {
  _id: string;
  title: string;
  description: string;
  questions: SurveyQuestion[];
  classNames: string[];
  category?: string | null;
  status?: string;
  creatorRole?: string;
  createdBy?: any;
  createdAt?: string;
  responseCount?: number;
}

class SurveyService {
  private static headers() {
    return { "Content-Type": "application/json" };
  }

  private static async req<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
      headers: this.headers(),
      credentials: "include",
      ...init,
    });
    return res.json() as Promise<T>;
  }

  static list() {
    return this.req<{ count: number; surveys: SurveyItem[] }>(`${API}/surveys`);
  }

  static create(data: Partial<SurveyItem>) {
    return this.req(`${API}/surveys`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  static update(id: string, data: Partial<SurveyItem>) {
    return this.req(`${API}/surveys/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  static setStatus(id: string, status: "active" | "inactive") {
    return this.req(`${API}/surveys/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  }

  static remove(id: string) {
    return this.req(`${API}/surveys/${id}`, { method: "DELETE" });
  }

  static detail(id: string) {
    return this.req<{
      survey: SurveyItem;
      targetStudents: number;
      responseCount: number;
      stats: any[];
      responses: any[];
    }>(`${API}/surveys/${id}`);
  }

  static responses(id: string, page = 1, limit = 20) {
    return this.req(
      `${API}/surveys/${id}/responses?page=${page}&limit=${limit}`,
    );
  }

  static available() {
    return this.req<{ count: number; surveys: any[] }>(
      `${API}/surveys/available`,
    );
  }

  static submit(id: string, answers: any[]) {
    return this.req(`${API}/surveys/${id}/submit`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    });
  }
}

export default SurveyService;