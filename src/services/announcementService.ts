import { API } from "./otherService";

export interface AnnouncementItem {
  _id: string;
  teacherId: { _id: string; name?: string };
  classNames: string[];
  title: string;
  description: string;
  creatorRole: string;
  createdBy: {
    _id: string;
    name?: string;
    role?: string;
  };
  readBy: Array<{ _id: string; name?: string; specialId?: string }>;
  isRead?: boolean;
  createdAt: string;
}

class AnnouncementService {
  private static authHeaders() {
    const token = localStorage.getItem("auth_token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  static async getAnnouncements() {
    const res = await fetch(`${API}/announcements`, {
      method: "GET",
      headers: this.authHeaders(),
      credentials: "include",
    });
    return res.json();
  }

  static async createAnnouncement(data: {
    teacherId?: string;
    className: string[];
    title: string;
    description: string;
  }) {
    const res = await fetch(`${API}/announcements/add-announcement`, {
      method: "POST",
      headers: this.authHeaders(),
      credentials: "include",
      body: JSON.stringify(data),
    });
    return res.json();
  }

  static async deleteAnnouncement(id: string) {
    const res = await fetch(`${API}/announcements/${id}`, {
      method: "DELETE",
      headers: this.authHeaders(),
      credentials: "include",
    });
    return res.json();
  }
}

export default AnnouncementService;