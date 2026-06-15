import { Database } from "lucide-react";
import { motion } from "framer-motion";

interface DataSourceEmptyStateProps {
  title: string;
  description: string;
}

const DataSourceEmptyState = ({
  title,
  description,
}: DataSourceEmptyStateProps) => (
  <div>
    <motion.h1
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 font-display text-xl font-bold text-foreground sm:text-2xl"
    >
      {title}
    </motion.h1>
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-border bg-card p-8 text-center shadow-card"
    >
      <Database className="mb-4 h-10 w-10 text-muted-foreground" />
      <h2 className="font-display text-lg font-semibold text-foreground">
        No data available
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {description}
      </p>
    </motion.div>
  </div>
);

export default DataSourceEmptyState;
