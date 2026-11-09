import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Bell, CalendarClock, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import AppSettingService, { APP_SETTING_KEYS, AppSettingKey } from "@/services/appSettingService";

/**
 * App-wide toggles for the HOD. The leave types catalogue is deliberately not
 * here — it lives on the Leave Management page, which the Student Leaves page
 * links to separately.
 */
const HodAppSetting = () => {
  const navigate = useNavigate();

  const [leaveApplyEnabled, setLeaveApplyEnabled] = useState(true);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const result = await AppSettingService.getAppSettings();
        if (result?.statusCode !== undefined && result?.statusCode >= 400) {
          toast.error(result?.message || "Failed to load app settings");
        } else if (active) {
          setLeaveApplyEnabled(result?.[APP_SETTING_KEYS.applyLeave] ?? true);
          setChatEnabled(result?.[APP_SETTING_KEYS.chat] ?? true);
          setPushEnabled(result?.[APP_SETTING_KEYS.push] ?? true);
        }
      } catch {
        toast.error("Could not reach the server");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  /**
   * Applies immediately, then persists. If the server rejects the write the
   * switch snaps back so the UI never shows a state the backend refused.
   */
  const toggle = async (
    key: AppSettingKey,
    next: boolean,
    previous: boolean,
    setValue: (value: boolean) => void,
    enabledLabel: string,
    disabledLabel: string,
  ) => {
    setValue(next);
    try {
      const result = await AppSettingService.setAppSetting(key, next);
      if (result?.statusCode !== undefined && result?.statusCode >= 400) {
        setValue(previous);
        toast.error(result?.message || "Could not update setting");
      } else {
        toast.success(next ? enabledLabel : disabledLabel);
      }
    } catch {
      setValue(previous);
      toast.error("Could not reach the server");
    }
  };

  const rows = [
    {
      key: APP_SETTING_KEYS.applyLeave,
      icon: CalendarClock,
      title: "Allow students to apply for leave",
      enabled: leaveApplyEnabled,
      onToggle: (next: boolean) =>
        toggle(
          APP_SETTING_KEYS.applyLeave,
          next,
          leaveApplyEnabled,
          setLeaveApplyEnabled,
          "Leave applications enabled",
          "Leave applications disabled",
        ),
      onText: "Students can submit leave applications",
      offText: "Leave applications are disabled for students",
    },
    {
      key: APP_SETTING_KEYS.chat,
      icon: MessageSquare,
      title: "Enable chat",
      enabled: chatEnabled,
      onToggle: (next: boolean) =>
        toggle(
          APP_SETTING_KEYS.chat,
          next,
          chatEnabled,
          setChatEnabled,
          "Chat enabled",
          "Chat disabled",
        ),
      onText: "Students and staff can use chat",
      offText: "Chat is disabled for everyone",
    },
    {
      key: APP_SETTING_KEYS.push,
      icon: Bell,
      title: "Enable push notifications",
      enabled: pushEnabled,
      onToggle: (next: boolean) =>
        toggle(
          APP_SETTING_KEYS.push,
          next,
          pushEnabled,
          setPushEnabled,
          "Push notifications enabled",
          "Push notifications disabled",
        ),
      onText: "Devices receive notifications as they happen",
      offText: "Push notifications are disabled for all devices",
    },
  ];

  return (
    <div>
      <button
        onClick={() => navigate("/professor/settings")}
        className="mb-4 flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Settings
      </button>

      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-2 font-display text-xl font-bold text-foreground sm:text-2xl"
      >
        App Setting
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-8 text-sm text-muted-foreground"
      >
        App-wide options that apply to everyone.
      </motion.p>

      <div className="space-y-4">
        {rows.map((row, i) => (
          <motion.div
            key={row.key}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${
                  row.enabled ? "bg-emerald-50" : "bg-gray-100"
                }`}
              >
                <row.icon
                  className={`h-5 w-5 ${
                    row.enabled ? "text-emerald-600" : "text-gray-400"
                  }`}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {row.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {loading ? "Loading setting..." : row.enabled ? row.onText : row.offText}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {loading && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
              <Switch
                checked={row.enabled}
                onCheckedChange={row.onToggle}
                disabled={loading}
                className="shrink-0"
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default HodAppSetting;
