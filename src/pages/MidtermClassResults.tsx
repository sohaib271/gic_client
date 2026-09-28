import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import { ArrowLeft, Award, BarChart3, Users } from "lucide-react";
import { useClasses } from "@/hooks/useClasses";

const MidtermClassResults = () => {
  const navigate = useNavigate();
  const { classId } = useParams();
  const user = useSelector((state: any) => state?.user.user);

  const deptId: string = user?.department?._id ?? user?.department ?? "";
  const { data: classes, isLoading } = useClasses("", deptId);

  const classData = useMemo(
    () => (classes || []).find((c: any) => c._id === classId),
    [classes, classId],
  );

  return (
    <div>
      <button
        onClick={() => navigate("/professor/settings/midterm-results")}
        className="mb-4 flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Classes
      </button>

      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-2 flex items-center gap-2 font-display text-xl font-bold text-foreground sm:text-2xl"
      >
        <Award className="h-5 w-5 text-rose-600" /> Midterm Results
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-6 text-sm text-muted-foreground"
      >
        {classData?.className ?? "Loading..."} · {classData?.session ?? "—"}
      </motion.p>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: "Students", value: String((classData?.classStudents || []).length), icon: Users },
          { label: "Papers", value: "—", icon: Award },
          { label: "Average Marks", value: "—", icon: BarChart3 },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50">
              <s.icon className="h-4 w-4 text-rose-600" />
            </div>
            <p className="text-lg font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="rounded-lg bg-rose-50 p-2">
          <Award className="h-4 w-4 text-rose-600" />
        </div>
        <p className="text-sm text-gray-600">
          {isLoading
            ? "Loading..."
            : "Results for this class are not wired up yet. It will be connected soon."}
        </p>
      </div>
    </div>
  );
};

export default MidtermClassResults;
