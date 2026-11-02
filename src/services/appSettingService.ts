import { API } from "./otherService";

/** Must match APP_SETTING_DEFAULTS in the backend settings service. */
export const APP_SETTING_KEYS = {
  applyLeave: "is_apply_leave_enable",
  chat: "is_chat_enabled",
  push: "is_push_noti_enable",
} as const;

export type AppSettingKey =
  (typeof APP_SETTING_KEYS)[keyof typeof APP_SETTING_KEYS];

class AppSettingService {
  private static headers() {
    return { "Content-Type": "application/json" };
  }

  /**
   * Reads every known app-wide toggle in one request, e.g.
   * `{ is_apply_leave_enable: true, is_chat_enabled: false }`.
   */
  static async getAppSettings() {
    const res = await fetch(`${API}/app-setting`, {
      method: "GET",
      headers: this.headers(),
      credentials: "include",
    });
    return res.json();
  }

  static async setAppSetting(key: AppSettingKey, value: boolean) {
    const res = await fetch(`${API}/settings/${key}`, {
      method: "PATCH",
      headers: this.headers(),
      credentials: "include",
      body: JSON.stringify({ value }),
    });
    return res.json();
  }
}

export default AppSettingService;
