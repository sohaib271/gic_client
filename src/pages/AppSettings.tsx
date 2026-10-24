import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BellRing, BellOff, MessageCircle, ArrowLeft } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import SettingsService from "@/services/settingsService";
import { toast } from "sonner";

const REMARKS_KEY = "remarks_notifications_enabled";
/** Same key the backend reads in sendPushNotification and the HOD screen uses. */
const PUSH_SETTING_KEY = "is_push_noti_enable";

interface AppSettingsProps {
  /**
   * Where "Back to Settings" should go. The page is reused by the Principal
   * layout, which is mounted under /principal, so the default admin path would
   * send principals into a route their role cannot access.
   */
  backTo?: string;
  /**
   * Read-only mode for roles that may inspect the app-wide toggles but cannot
   * change them. The push-notification switch is a server-side setting that
   * only admins and HODs can write, so it is locked for every other role.
   * The remarks switch is a personal, device-local preference and stays usable.
   */
  readOnly?: boolean;
}

const AppSettings = ({ backTo = "/admin/settings", readOnly = false }: AppSettingsProps) => {
  const navigate = useNavigate();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [remarksEnabled, setRemarksEnabled] = useState(true);
  const [pushLoading, setPushLoading] = useState(true);

  useEffect(() => {
    const storedRemarks = localStorage.getItem(REMARKS_KEY);
    if (storedRemarks !== null) setRemarksEnabled(storedRemarks === "true");

    const loadPushSetting = async () => {
      try {
        const result = await SettingsService.getSetting(PUSH_SETTING_KEY);
        if (result?.statusCode !== undefined && result?.statusCode >= 400) {
          toast.error(result?.message || "Failed to load push notification setting");
        } else {
          setPushEnabled(result?.value ?? true);
        }
      } catch {
        toast.error("Could not reach the server");
      } finally {
        setPushLoading(false);
      }
    };
    loadPushSetting();
  }, []);

  const handleToggle = async (next: boolean) => {
    const previous = pushEnabled;
    setPushEnabled(next);
    try {
      const result = await SettingsService.setSetting(PUSH_SETTING_KEY, next);
      if (result?.statusCode !== undefined && result?.statusCode >= 400) {
        setPushEnabled(previous);
        toast.error(result?.message || "Could not update setting");
      } else {
        toast.success(
          next
            ? "Push notifications turned on"
            : "Push notifications turned off",
        );
      }
    } catch {
      setPushEnabled(previous);
      toast.error("Could not reach the server");
    }
  };

  const handleRemarksToggle = (next: boolean) => {
    setRemarksEnabled(next);
    localStorage.setItem(REMARKS_KEY, String(next));
    toast.success(
      next ? "Remark alerts turned on" : "Remark alerts turned off",
    );
  };

  const cards = [
    {
      label: "Push Notification",
      icon: pushEnabled ? <BellRing className="h-4 w-4 text-blue-600" /> : <BellOff className="h-4 w-4 text-gray-400" />,
      iconBg: pushEnabled ? "bg-blue-50" : "bg-gray-100",
      checked: pushEnabled,
      disabled: pushLoading || readOnly,
      onChecked: handleToggle,
      sub: pushLoading
        ? "Loading setting..."
        : readOnly
          ? "Server-wide setting, managed by the admin and HOD accounts"
          : pushEnabled
            ? "Server will deliver alerts to devices"
            : "Push alerts are disabled on the server",
    },
    {
      label: "Remarks",
      icon: <MessageCircle className="h-4 w-4 text-sky-600" />,
      iconBg: "bg-sky-50",
      checked: remarksEnabled,
      onChecked: handleRemarksToggle,
      sub: remarksEnabled
        ? "Alerts when remarks are added to records"
        : "Remark alerts are muted",
    },
  ];

  return (
    <div>
      <button
        onClick={() => navigate(backTo)}
        className="mb-4 flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Settings
      </button>

      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-2 font-display text-xl font-bold text-foreground sm:text-2xl"
      >
        App Settings
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-8 text-sm text-muted-foreground"
      >
        {readOnly
          ? "Check the app-wide preference status and personal notification preferences"
          : "Configure application-wide preferences"}
      </motion.p>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {card.label}
                  </span>
                  <div className={`p-2 rounded-lg ${card.iconBg}`}>
                    {card.icon}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-gray-600">{card.sub}</p>
                  <Switch
                    checked={card.checked}
                    onCheckedChange={card.onChecked}
                    disabled={card.disabled}
                    className="shrink-0"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AppSettings;