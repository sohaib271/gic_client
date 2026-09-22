import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp, Shield, ArrowRight } from "lucide-react";
import { useSelector } from "react-redux";

const HodSettings = () => {
  const navigate = useNavigate();
  const user = useSelector((state: any) => state?.user.user);

  return (
    <div>
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-1 font-display text-xl font-bold text-foreground sm:text-2xl"
      >
        Settings
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
        className="mb-8 text-sm text-muted-foreground"
      >
        Controls for the HOD account
      </motion.p>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => navigate("/professor/settings/student-progress")}
          className="group cursor-pointer rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
        >
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50">
            <TrendingUp className="h-6 w-6 text-orange-600" />
          </div>
          <h2 className="font-display text-lg font-bold text-foreground">
            Student Progress
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Attendance and academic overview of students
            {user?.department?.code
              ? ` in ${user.department.code}`
              : " in your department"}
          </p>
          <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">
            Manage <ArrowRight className="h-4 w-4 transition-all group-hover:translate-x-1" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          onClick={() => navigate("/professor/settings/security")}
          className="group cursor-pointer rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
        >
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50">
            <Shield className="h-6 w-6 text-violet-600" />
          </div>
          <h2 className="font-display text-lg font-bold text-foreground">
            Security & Account
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Change password, update profile, email OTP
          </p>
          <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">
            Manage <ArrowRight className="h-4 w-4 transition-all group-hover:translate-x-1" />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default HodSettings;