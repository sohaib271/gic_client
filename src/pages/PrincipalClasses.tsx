import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { School, Search, Building2, Users, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useClasses } from "@/hooks/useClasses";
import { useUsers } from "@/hooks/useUsers";

const PrincipalClasses = () => {
  const navigate = useNavigate();
  const { data: classes = [], isLoading: classesLoading } = useClasses("");
  const { data: teachers = [] } = useUsers("proff");
  const [search, setSearch] = useState("");

  const filteredClasses = useMemo(() => {
    if (!search) return classes;
    const s = search.toLowerCase();
    return classes.filter(
      (c: any) =>
        c?.className?.toLowerCase().includes(s) ||
        c?.class?.toLowerCase().includes(s) ||
        c?.category?.toLowerCase().includes(s) ||
        c?.session?.toLowerCase().includes(s)
    );
  }, [classes, search]);

  if (classesLoading) {
    return (
      <div className="space-y-6">
        <motion.h1 className="font-display text-xl font-bold text-foreground">Classes</motion.h1>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-xl border border-border" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">Classes</h1>
          <p className="text-sm text-muted-foreground">
            View all classes ({classes.length} total)
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search classes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-md border border-input bg-background"
          />
        </div>
      </motion.div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {["S.No", "Class Name", "Category", "Session", "Shift", "Students", "Teacher", "Subjects"].map((h) => (
                  <th key={h} className="p-3 sm:p-4 text-left text-xs sm:text-sm font-medium text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredClasses.map((c: any, i: number) => (
                <tr key={c?._id || i} className="border-b border-border last:border-0 hover:bg-secondary/50">
                  <td className="p-3 sm:p-4 text-xs sm:text-sm">{i + 1}</td>
                  <td className="p-3 sm:p-4 font-medium">{c?.className || c?.class || "—"}</td>
                  <td className="p-3 sm:p-4 text-sm text-muted-foreground">{c?.category || "—"}</td>
                  <td className="p-3 sm:p-4 text-sm text-muted-foreground">{c?.session || "—"}</td>
                  <td className="p-3 sm:p-4 text-sm text-muted-foreground">{c?.shift || "—"}</td>
                  <td className="p-3 sm:p-4 text-sm">{c?.students || 0}</td>
                  <td className="p-3 sm:p-4 text-sm text-muted-foreground">
                    {c?.teacher?.name ? `${c.teacher.name} ${c.teacher.lastName}` : "Unassigned"}
                  </td>
                  <td className="p-3 sm:p-4 text-sm text-muted-foreground">{c?.subjects?.length || 0}</td>
                </tr>
              ))}
              {filteredClasses.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-sm text-muted-foreground">
                    No classes found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PrincipalClasses;
