import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Pencil, Trash2, ArrowRight } from "lucide-react";
import { subjects as mockScores } from "@/data/mockData";
import type { Subject } from "@/data/mockData";
import TableSkeleton from "@/components/TableSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const PREVIEW_COUNT = 5;

const IntermediateScore = () => {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [scoresList] = useState<Subject[]>(mockScores);

  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);

  const filtered = scoresList.filter((s) => s.subject.toLowerCase().includes(search.toLowerCase()));
  const displayed = showAll ? filtered : filtered.slice(0, PREVIEW_COUNT);

  if (loading) return <TableSkeleton rows={5} cols={5} />;

  return (
    <div>
      <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 font-display text-xl font-bold text-foreground sm:text-2xl">Intermediate Score</motion.h1>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-4 flex flex-wrap items-center gap-3">
        <span className="font-display text-sm font-semibold text-foreground">Total: {filtered.length}</span>
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Subject..." className="pl-9" />
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
        <table className="w-full min-w-[500px]">
          <thead><tr className="border-b border-border">
            {["S.No", "Subject", "Total Marks", "Passing Marks", "Actions"].map((h) => <th key={h} className="table-header p-4 text-left">{h}</th>)}
          </tr></thead>
          <tbody>
            {displayed.map((s, i) => (
              <motion.tr key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                <td className="p-4 text-sm">{String(s.sno).padStart(2, "0")}</td>
                <td className="p-4 text-sm font-medium">{s.subject}</td>
                <td className="p-4 text-sm">{s.totalMarks}</td>
                <td className="p-4 text-sm">{s.passingMarks}</td>
                <td className="p-4"><div className="flex gap-2">
                  <button className="rounded-md p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"><Pencil className="h-4 w-4" /></button>
                  <button className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
                </div></td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      {filtered.length > PREVIEW_COUNT && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={() => setShowAll(!showAll)}>{showAll ? "Show Less" : `View All (${filtered.length})`} <ArrowRight className="ml-1 h-4 w-4" /></Button>
        </div>
      )}
    </div>
  );
};

export default IntermediateScore;
