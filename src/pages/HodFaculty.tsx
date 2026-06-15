import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Eye, Briefcase } from "lucide-react";
import { useSelector } from "react-redux";
import TableSkeleton from "@/components/TableSkeleton";
import { Button } from "@/components/ui/button";
import { useUsers } from "@/hooks/useUsers";
import FacultyDetailView from "@/components/FacultyDetailView";

const HodFaculty = () => {
  const user = useSelector((state: any) => state?.user.user);
  const { data: users, isLoading } = useUsers("proff");
  const [detail, setDetail] = useState<any | null>(null);

  const deptId = user?.department?._id ?? user?.department;

  const deptProfessors = useMemo(
    () =>
      (users || []).filter((u: any) => {
        const uDept = u?.department?._id ?? u?.department;
        return uDept === deptId && u?._id !== user?._id;
      }),
    [users, deptId, user?._id],
  );

  if (!user?.isHod) {
    return <div className="p-6 text-sm text-muted-foreground">Access denied.</div>;
  }

  if (isLoading) return <TableSkeleton rows={5} cols={5} />;

  if (detail) {
    return <FacultyDetailView faculty={detail} type="proff" onBack={() => setDetail(null)} />;
  }

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" /> Department Faculty
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Professors in {user?.department?.code ?? user?.department?.name ?? "your department"}
          </p>
        </div>
        <span className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs sm:text-sm font-semibold text-primary">
          Total: {deptProfessors.length}
        </span>
      </motion.div>

      <div className="rounded-xl border border-border bg-card shadow-card overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-border">
              {["S.No", "First Name", "Last Name", "Date of Joining", "Subjects", "Action"].map((h) => (
                <th key={h} className="p-3 sm:p-4 text-left text-xs sm:text-sm font-medium text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {deptProfessors.map((m: any, i: number) => (
              <motion.tr key={m?._id ?? i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="border-b border-border last:border-0 hover:bg-secondary/40 transition-colors">
                <td className="p-3 sm:p-4 text-xs sm:text-sm">{String(i + 1).padStart(2, "0")}</td>
                <td className="p-3 sm:p-4 text-xs sm:text-sm font-medium">{m?.name}</td>
                <td className="p-3 sm:p-4 text-xs sm:text-sm">{m?.lastName}</td>
                <td className="p-3 sm:p-4 text-xs sm:text-sm text-muted-foreground">{m?.doj}</td>
                <td className="p-3 sm:p-4 text-xs sm:text-sm text-muted-foreground truncate max-w-[200px]">
                  {Array.isArray(m?.subjects) ? m.subjects.join(", ") : m?.subjects ?? "—"}
                </td>
                <td className="p-3 sm:p-4">
                  <Button variant="ghost" size="sm" onClick={() => setDetail(m)}
                    className="gap-1.5 text-primary hover:text-primary text-xs sm:text-sm">
                    <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> View
                  </Button>
                </td>
              </motion.tr>
            ))}
            {deptProfessors.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">
                  No professors in your department.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HodFaculty;