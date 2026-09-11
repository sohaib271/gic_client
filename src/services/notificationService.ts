import { API } from "./otherService";

export interface NotificationItem {
  _id: string;
  userId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  userName?: string;
  type: "announcement" | "attendance" | "qr" | "class" | "general";
  title: string;
  message: string;
  data: Record<string, any>;
  classNames: string[];
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: NotificationItem[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
}

class NotificationService {
  private static authHeaders() {
    return {
      "Content-Type": "application/json",
    };
  }

  static async getNotifications(page = 1, limit = 20): Promise<NotificationsResponse> {
    const res = await fetch(`${API}/notifications?page=${page}&limit=${limit}`, {
      method: "GET",
      headers: this.authHeaders(),
      credentials: "include",
    });
    return res.json();
  }

  static async markAsRead(id: string) {
    const res = await fetch(`${API}/notifications/read/${id}`, {
      method: "PATCH",
      headers: this.authHeaders(),
      credentials: "include",
    });
    return res.json();
  }

  static async markAllAsRead() {
    const res = await fetch(`${API}/notifications/read-all`, {
      method: "PATCH",
      headers: this.authHeaders(),
      credentials: "include",
    });
    return res.json();
  }

  static async deleteNotification(id: string) {
    const res = await fetch(`${API}/notifications/${id}`, {
      method: "DELETE",
      headers: this.authHeaders(),
      credentials: "include",
    });
    return res.json();
  }
}

export default NotificationService;
