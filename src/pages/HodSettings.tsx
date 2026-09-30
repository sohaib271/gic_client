import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
<<<<<<< HEAD
import { TrendingUp, Shield, Wallet, CalendarCheck, CalendarClock, ClipboardList, Award, ChevronRight, SlidersHorizontal } from "lucide-react";
=======
import { TrendingUp, Shield, Wallet, CalendarCheck, CalendarClock, ClipboardList, Award, ChevronRight } from "lucide-react";
>>>>>>> ad5e647cf8509b3eba146be9fd0befb166f21371
import { useSelector } from "react-redux";

const HodSettings = () => {
  const navigate = useNavigate();
  const user = useSelector((state: any) => state?.user.user);

  const notificationCards = [
    {
      label: "Student Progress",
      icon: TrendingUp,
      iconBg: "bg-orange-50",
      iconColor: "text-orange-600",
      onClick: () => navigate("/professor/settings/student-progress"),
      sub: `Attendance and academic overview of students${user?.department?.code ? ` in ${user.department.code}` : " in your department"}`,
    },
    {
      label: "Department Fees",
      icon: Wallet,
      iconBg: "bg-teal-50",
      iconColor: "text-teal-600",
      onClick: () => navigate("/professor/settings/department-fee"),
      sub: `Fee overview of every student${user?.department?.code ? ` in ${user.department.code}` : " in your department"}`,
    },
    {
      label: "Today's Student Attendance",
      icon: CalendarCheck,
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
      onClick: () => navigate("/professor/settings/today-attendance"),
      sub: "Today's attendance status of students.",
    },
    {
      label: "Midterm Tests",
      icon: ClipboardList,
      iconBg: "bg-sky-50",
      iconColor: "text-sky-600",
      onClick: () => navigate("/professor/settings/midterm-tests"),
      sub: "Midterm test schedules and results of students.",
    },
    {
      label: "Midterm Results",
      icon: Award,
      iconBg: "bg-rose-50",
      iconColor: "text-rose-600",
      onClick: () => navigate("/professor/settings/midterm-results"),
      sub: "Midterm test results and marks of students.",
    },
    {
      label: "Student Leaves",
      icon: CalendarClock,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      onClick: () => navigate("/professor/settings/student-leaves"),
      sub: `Approve or reject the leave applications${user?.department?.code ? ` of students in ${user.department.code}` : " of your students"}.`,
    },
    {
<<<<<<< HEAD
      label: "App Setting",
      icon: SlidersHorizontal,
      iconBg: "bg-slate-50",
      iconColor: "text-slate-600",
      onClick: () => navigate("/professor/settings/app-setting"),
      sub: "Allow or block students from applying for leave.",
    },
    {
=======
>>>>>>> ad5e647cf8509b3eba146be9fd0befb166f21371
      label: "Security & Account",
      icon: Shield,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
      onClick: () => navigate("/professor/settings/security"),
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
        Controls for the HOD account
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

export default HodSettings;