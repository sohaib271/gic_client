import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ClipboardList, Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const Survey = () => {
  const navigate = useNavigate();

  return (
    <div>
      <button
        onClick={() => navigate("/admin/settings")}
        className="mb-4 flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Settings
      </button>

      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-2 font-display text-xl font-bold text-foreground sm:text-2xl"
      >
        Survey
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-8 text-sm text-muted-foreground"
      >
        Create and manage surveys
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50">
              <ClipboardList className="h-6 w-6 text-teal-600" />
            </div>
            <h2 className="text-base font-semibold text-foreground">
              Surveys are coming soon
            </h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Survey management is under construction. This page will let you
              design questionnaires and publish them to app users.
            </p>
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
              <Construction className="h-3.5 w-3.5" />
              Under construction
            </span>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Survey;