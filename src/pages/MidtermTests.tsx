import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ClipboardList } from "lucide-react";

const MidtermTests = () => {
  const navigate = useNavigate();

  return (
    <div>
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-2 font-display text-xl font-bold text-foreground sm:text-2xl"
      >
        Midterm Tests
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-8 text-sm text-muted-foreground"
      >
        Midterm test schedules and results of students.
      </motion.p>

      <div className="flex items-center gap-3 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-2 rounded-lg bg-sky-50">
          <ClipboardList className="h-4 w-4 text-sky-600" />
        </div>
        <p className="text-sm text-gray-600">
          This section is not wired up yet. It will be connected soon.
        </p>
      </div>

      <button
        onClick={() => navigate("/professor/settings")}
        className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Settings
      </button>
    </div>
  );
};

export default MidtermTests;
