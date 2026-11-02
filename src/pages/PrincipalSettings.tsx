import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield,
  CalendarClock,
  SlidersHorizontal,
  ChevronRight,
  Settings,
} from "lucide-react";

const PrincipalSettings = () => {
  const navigate = useNavigate();

  /**
   * Every card here must point at an endpoint the principal role can actually
   * reach. The backend only opens the school-wide write actions (send alert,
   * surveys, leave types, app settings) to admin and HOD, so those are not
   * listed here — they would fail with 403.
   */
  const settingCards = [
    {
      label: "Security & Account",
      icon: Shield,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
      onClick: () => navigate("/principal/settings/security"),
      sub: "Change password, update profile, email OTP",
    },
    {
      label: "Leave Types",
      icon: CalendarClock,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      onClick: () => navigate("/principal/settings/leave-types"),
      sub: "View the leave types configured across the school",
    },
    {
      label: "App Preferences",
      icon: SlidersHorizontal,
      iconBg: "bg-indigo-50",
      iconColor: "text-indigo-600",
      onClick: () => navigate("/principal/settings/app-preferences"),
      sub: "Push notification and app-wide preference status",
    },
  ];

  return (
    <div>
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-2 font-display text-xl font-bold text-foreground sm:text-2xl"
      >
        Settings
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-8 text-sm text-muted-foreground"
      >
        Controls for the Principal account
      </motion.p>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {settingCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            onClick={card.onClick}
            className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm transition-all duration-200 cursor-pointer hover:shadow-md hover:border-primary/40"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {card.label}
              </span>
              <div className={`p-2 rounded-lg ${card.iconBg}`}>
                <card.icon className={`h-4 w-4 ${card.iconColor}`} />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-gray-600">{card.sub}</p>
              <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-primary">
                Manage
                <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6 flex items-start gap-3 rounded-xl border border-dashed border-border bg-secondary/40 px-4 py-3"
      >
        <Settings className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          School-wide configuration — broadcasting alerts, surveys, leave types and
          app settings — is managed by the admin and HOD accounts.
        </p>
      </motion.div>
    </div>
  );
};

export default PrincipalSettings;
