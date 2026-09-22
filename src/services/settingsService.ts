import { API } from "./otherService";

class SettingsService {
  private static headers() {
    return { "Content-Type": "application/json" };
  }

  static async getSetting(key: string) {
    const res = await fetch(`${API}/settings/${key}`, {
      method: "GET",
      headers: this.headers(),
      credentials: "include",
    });
    return res.json();
  }

  static async setSetting(key: string, value: boolean) {
    const res = await fetch(`${API}/settings/${key}`, {
      method: "PATCH",
      headers: this.headers(),
      credentials: "include",
      body: JSON.stringify({ value }),
    });
    return res.json();
  }
}

export default SettingsService;