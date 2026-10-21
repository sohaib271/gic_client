import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Building2, Users, GraduationCap, BookOpen, Search, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import DepartmentService from "@/services/departmentService";
import { useUsers } from "@/hooks/useUsers";
import { Button } from "@/components/ui/button";

const PrincipalDepartments = () => {
  const navigate = useNavigate();
  const { data: departments = [], isLoading: deptLoading } = useQuery({
    queryKey: ["principal-departments"],
    queryFn: async () => {
      const res = await DepartmentService.getAllDepartments();
      return res?.data ?? res ?? [];
    },
    retry: false,
    staleTime: 60_000,
  });
  const { data: teachers = [] } = useUsers("proff");
  const [search, setSearch] = useState("");

  const filteredDepts = useMemo(() => {
    if (!search) return departments;
    const s = search.toLowerCase();
    return departments.filter(
      (d: any) =>
        d?.name?.toLowerCase().includes(s) ||
        d?.code?.toLowerCase().includes(s) ||
        d?.category?.toLowerCase().includes(s)
    );
  }, [departments, search]);

  if (deptLoading) {
    return (
      <div className="space-y-6">
        <motion.h1 className="font-display text-xl font-bold text-foreground">Departments</motion.h1>
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
          <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">Departments</h1>
          <p className="text-sm text-muted-foreground">
            View all academic departments ({departments.length} total)
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search departments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-md border border-input bg-background"
          />
        </div>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredDepts.map((dept: any, i: number) => {
          const deptTeachers = teachers.filter((t: any) => t?.department === dept._id || t?.department?.code === dept.code);
          const hods = deptTeachers.filter((t: any) => t?.isHod);
          return (
            <motion.div
              key={dept._id || i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">{dept.name}</h3>
                  <p className="text-sm text-muted-foreground">{dept.code}</p>
                  <p className="text-xs text-muted-foreground mt-1">{dept.category || "General"}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Building2 className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="font-display text-xl font-bold text-foreground">{deptTeachers.length}</p>
                  <p className="text-xs text-muted-foreground">Teachers</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="font-display text-xl font-bold text-primary">{hods.length}</p>
                  <p className="text-xs text-muted-foreground">HODs</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="font-display text-xl font-bold text-emerald">{dept.subjects?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Subjects</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => {}}>
                  <Eye className="h-3.5 w-3.5 mr-1.5" /> View Details
                </Button>
              </div>
            </motion.div>
          );
        })}
        {filteredDepts.length === 0 && (
          <div className="col-span-full rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
            No departments found.
          </div>
        )}
      </div>
    </div>
  );
};

export default PrincipalDepartments;
