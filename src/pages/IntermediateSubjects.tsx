import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Trash2, X, ArrowRight, Plus } from "lucide-react";
import { subjects as mockSubjects } from "@/data/mockData";
import type { Subject } from "@/data/mockData";
import TableSkeleton from "@/components/TableSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const PREVIEW_COUNT = 5;

const IntermediateSubjects = () => {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [subjectsList, setSubjectsList] = useState<Subject[]>(mockSubjects);

  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);

  const filtered = subjectsList.filter((s) => s.subject.toLowerCase().includes(search.toLowerCase()));
  const displayed = showAll ? filtered : filtered.slice(0, PREVIEW_COUNT);

  const handleDelete = (id: string) => setSubjectsList((prev) => prev.filter((s) => s.id !== id));

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSubjectsList((prev) => [...prev, {
      id: crypto.randomUUID(),
      sno: prev.length + 1,
      subject: form.get("subject") as string,
      totalMarks: Number(form.get("totalMarks")),
      passingMarks: Number(form.get("passingMarks")),
    }]);
    setShowModal(false);
  };

  if (loading) return <TableSkeleton rows={5} cols={5} />;

  return (
    <div>
      <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 font-display text-xl font-bold text-foreground sm:text-2xl">Intermediate Subjects</motion.h1>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-4 flex flex-wrap items-center gap-3">
        <span className="font-display text-sm font-semibold text-foreground">Total: {filtered.length}</span>
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Subject..." className="pl-9" />
        </div>
        <Button onClick={() => setShowModal(true)} className="ml-auto"><Plus className="mr-1 h-4 w-4" /> Add More</Button>
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
                  <button onClick={() => handleDelete(s.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
                </div></td>
              </motion.tr>
            ))}
            {displayed.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">No subjects found</td></tr>}
          </tbody>
        </table>
      </motion.div>

      {filtered.length > PREVIEW_COUNT && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={() => setShowAll(!showAll)}>{showAll ? "Show Less" : `View All (${filtered.length})`} <ArrowRight className="ml-1 h-4 w-4" /></Button>
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card p-6 shadow-modal">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-foreground">Add Subject</h2>
                <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleAdd}>
                <div className="grid gap-4">
                  <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Subject Name</label><Input name="subject" placeholder="Enter subject" required /></div>
                  <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Total Marks</label><Input name="totalMarks" type="number" placeholder="100" required /></div>
                  <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Passing Marks</label><Input name="passingMarks" type="number" placeholder="33" required /></div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                  <Button type="submit">Save Subject</Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default IntermediateSubjects;
