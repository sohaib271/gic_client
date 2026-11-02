import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarClock, Settings2, Megaphone, ClipboardList, Users, ChevronRight, Shield } from "lucide-react";

const Settings = () => {
  const navigate = useNavigate();

  const notificationCards = [
    {
      label: "Leave Management",
      icon: CalendarClock,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      onClick: () => navigate("/admin/leave-management"),
      sub: "Manage leave types like Sick, Holiday, Casual etc",
    },
    {
      label: "App Settings",
      icon: Settings2,
      iconBg: "bg-indigo-50",
      iconColor: "text-indigo-600",
      onClick: () => navigate("/admin/app-settings"),
      sub: "Push notifications, remarks and other app preferences",
    },
    {
      label: "Send Alert",
      icon: Megaphone,
      iconBg: "bg-rose-50",
      iconColor: "text-rose-600",
      onClick: () => navigate("/admin/send-alert"),
      sub: "Broadcast a message to all app users",
    },
    {
      label: "Survey",
      icon: ClipboardList,
      iconBg: "bg-teal-50",
      iconColor: "text-teal-600",
      onClick: () => navigate("/admin/survey"),
      sub: "Create and manage surveys",
    },
    {
      label: "Today Active Users",
      icon: Users,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      onClick: () => navigate("/admin/active-users"),
      sub: "See who logged in today with last login time",
    },
    {
      label: "Security & Account",
      icon: Shield,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
      onClick: () => navigate("/admin/security"),
      sub: "Change password, update profile, email OTP",
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
        Manage your preferences
      </motion.p>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {notificationCards.map((card, i) => (
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
    </div>
  );
};

export default Settings;