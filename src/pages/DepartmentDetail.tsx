import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  Users,
  GraduationCap,
  School,
  Mail,
  Phone,
  ShieldCheck,
  UserCheck,
  Search,
  Layers,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import DepartmentService from "@/services/departmentService";
import { useUsers } from "@/hooks/useUsers";
import { useClasses } from "@/hooks/useClasses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserAvatar from "@/components/UserAvatar";

/** Human readable label for the department category. */
const categoryLabel = (category?: string | null) => {
  if (category === "intermediate") return "Intermediate";
  if (category === "bs_adp" || category === "bs" || category === "adp") return "BS / ADP";
  return "General";
};

/**
 * A department reference can come back as a plain id string or as a populated
 * object ({ _id, code, name }), so both shapes are accepted here.
 */
const belongsToDept = (value: any, dept: any) => {
  if (!value || !dept) return false;
  if (typeof value === "object") {
    if (value._id && dept._id && value._id === dept._id) return true;
    if (value.code && dept.code && value.code === dept.code) return true;
    return false;
  }
  return Boolean(dept._id) && value === dept._id;
};

const DepartmentDetail = () => {  const navigate = useNavigate();
  const { departmentId } = useParams<{ departmentId: string }>();
  const [search, setSearch] = useState("");

  // Same query key as PrincipalDepartments so the list cache is shared.
  const { data: departments = [], isLoading: deptLoading } = useQuery({
    queryKey: ["principal-departments"],
    queryFn: async () => {
      const res = await DepartmentService.getAllDepartments();
      return res?.data ?? res ?? [];
    },
    retry: false,
    staleTime: 60_000,
  });

  const { data: teachers = [], isLoading: teachersLoading } = useUsers("proff");
  const { data: students = [] } = useUsers("student");
  const { data: classes = [], isLoading: classesLoading } = useClasses("");

  const dept = useMemo(
    () =>
      departments.find(
        (d: any) => d?._id === departmentId || d?.code === departmentId
      ) as any,
    [departments, departmentId]
  );

  const deptTeachers = useMemo(
    () => teachers.filter((t: any) => belongsToDept(t?.department, dept)),
    [teachers, dept]
  );

  const hods = useMemo(
    () => deptTeachers.filter((t: any) => t?.isHod),
    [deptTeachers]
  );

  const deptClasses = useMemo(
    () =>
      classes.filter(
        (c: any) =>
          belongsToDept(c?.departmentId, dept) || belongsToDept(c?.department, dept)
      ),
    [classes, dept]
  );

  const deptStudents = useMemo(
    () => students.filter((s: any) => belongsToDept(s?.department, dept)),
    [students, dept]
  );

  const filteredTeachers = useMemo(() => {
    if (!search) return deptTeachers;
    const s = search.toLowerCase();
    return deptTeachers.filter(
      (t: any) =>
        t?.name?.toLowerCase().includes(s) ||
        t?.lastName?.toLowerCase().includes(s) ||
        t?.email?.toLowerCase().includes(s) ||
        t?.specialId?.toLowerCase().includes(s)
    );
  }, [deptTeachers, search]);

  const loading = deptLoading || teachersLoading || classesLoading;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-56 animate-pulse rounded-lg bg-muted" />
        <div className="h-44 animate-pulse rounded-2xl border border-border bg-card" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-2xl border border-border bg-card" />
      </div>
    );
  }

  if (!dept) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Building2 className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="mb-1 font-display text-lg font-semibold text-foreground">
          Department not found
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          This department may have been removed or renamed.
        </p>
        <Button onClick={() => navigate("/principal/departments")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Departments
        </Button>
      </div>
    );
  }

  const stats = [
    {
      label: "Teachers",
      value: deptTeachers.length,
      icon: Users,
      iconBg: "bg-primary/10 text-primary",
    },
    {
      label: "HODs",
      value: hods.length,
      icon: GraduationCap,
      iconBg: "bg-amber/10 text-amber",
    },
    {
      label: "Classes",
      value: deptClasses.length,
      icon: School,
      iconBg: "bg-blue/10 text-blue",
    },
    {
      label: "Students",
      value: deptStudents.length,
      icon: UserCheck,
      iconBg: "bg-emerald/10 text-emerald",
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Back */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/principal/departments")}
        >
          <ArrowLeft className="h-4 w-4" /> Back to Departments
        </Button>
        <span className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
          {dept.code || "—"}
        </span>
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-wrap items-center gap-2"
      >
        <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">
          {dept.name}
        </h1>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
          <Layers className="h-3.5 w-3.5" />
          {categoryLabel(dept.category)}
        </span>
        <p className="w-full text-sm text-muted-foreground">
          Department code <span className="font-medium text-foreground">{dept.code || "—"}</span> ·{" "}
          {deptTeachers.length} faculty members · {deptClasses.length} classes
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.06 }}
            className="rounded-xl border border-border bg-card p-4 shadow-card"
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.iconBg}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </p>
                <p className="font-display text-xl font-bold text-foreground">{s.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* HOD */}
      {hods.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="rounded-2xl border border-border bg-card p-5 shadow-card"
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-foreground">
                Head of Department
              </h2>
              <p className="text-xs text-muted-foreground">Currently assigned HODs</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {hods.map((hod: any) => (
              <div
                key={hod._id}
                className="flex items-center gap-3 rounded-xl border border-border bg-secondary/40 p-3"
              >
                <UserAvatar
                  image={hod?.image}
                  name={hod?.name}
                  lastName={hod?.lastName}
                  className="h-11 w-11"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {`${hod?.name || ""} ${hod?.lastName || ""}`.trim() || "—"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {hod?.email || hod?.specialId || "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Tabs defaultValue="faculty">
          <TabsList className="flex-wrap">
            <TabsTrigger value="faculty">Faculty ({deptTeachers.length})</TabsTrigger>
            <TabsTrigger value="classes">Classes ({deptClasses.length})</TabsTrigger>
          </TabsList>

          {/* Faculty */}
          <TabsContent value="faculty" className="mt-4">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search faculty..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[720px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      {["S.No", "Name", "Email", "Phone", "Role", "Status"].map((h) => (
                        <th
                          key={h}
                          className="p-3 sm:p-4 text-left text-xs sm:text-sm font-medium text-muted-foreground"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeachers.map((t: any, i: number) => (
                      <tr
                        key={t?._id || i}
                        className="border-b border-border last:border-0 hover:bg-secondary/50"
                      >
                        <td className="p-3 sm:p-4 text-xs sm:text-sm">{i + 1}</td>
                        <td className="p-3 sm:p-4">
                          <div className="flex items-center gap-3">
                            <UserAvatar
                              image={t?.image}
                              name={t?.name}
                              lastName={t?.lastName}
                              className="h-9 w-9"
                            />
                            <div className="min-w-0">
                              <div className="truncate font-medium text-foreground">
                                {`${t?.name || ""} ${t?.lastName || ""}`.trim() || "—"}
                              </div>
                              <div className="truncate text-xs text-muted-foreground">
                                {t?.specialId || "—"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 sm:p-4 text-xs sm:text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 shrink-0" />
                            {t?.email || "—"}
                          </span>
                        </td>
                        <td className="p-3 sm:p-4 text-xs sm:text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            {t?.phone || "—"}
                          </span>
                        </td>
                        <td className="p-3 sm:p-4 text-xs sm:text-sm">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              t?.isHod
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {t?.isHod ? "HOD" : "Teacher"}
                          </span>
                        </td>
                        <td className="p-3 sm:p-4 text-xs sm:text-sm">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                              t?.isActive
                                ? "bg-emerald/10 text-emerald"
                                : "bg-destructive/10 text-destructive"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                t?.isActive ? "bg-emerald" : "bg-destructive"
                              }`}
                            />
                            {t?.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredTeachers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">
                          {search
                            ? "No faculty members match your search."
                            : "No faculty members in this department."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Classes */}
          <TabsContent value="classes" className="mt-4">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      {["S.No", "Class Name", "Session", "Shift", "Students", "Teacher", "Subjects"].map(
                        (h) => (
                          <th
                            key={h}
                            className="p-3 sm:p-4 text-left text-xs sm:text-sm font-medium text-muted-foreground"
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {deptClasses.map((c: any, i: number) => (
                      <tr
                        key={c?._id || i}
                        className="border-b border-border last:border-0 hover:bg-secondary/50"
                      >
                        <td className="p-3 sm:p-4 text-xs sm:text-sm">{i + 1}</td>
                        <td className="p-3 sm:p-4 font-medium text-foreground">
                          {c?.className || c?.class || "—"}
                        </td>
                        <td className="p-3 sm:p-4 text-xs sm:text-sm text-muted-foreground">
                          {c?.session || "—"}
                        </td>
                        <td className="p-3 sm:p-4 text-xs sm:text-sm text-muted-foreground">
                          {c?.shift || "—"}
                        </td>
                        <td className="p-3 sm:p-4 text-xs sm:text-sm">{c?.students || 0}</td>
                        <td className="p-3 sm:p-4 text-xs sm:text-sm text-muted-foreground">
                          {c?.teacher?.name
                            ? `${c.teacher.name} ${c.teacher.lastName || ""}`.trim()
                            : "Unassigned"}
                        </td>
                        <td className="p-3 sm:p-4 text-xs sm:text-sm text-muted-foreground">
                          {c?.subjects?.length || 0}
                        </td>
                      </tr>
                    ))}
                    {deptClasses.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">
                          No classes in this department.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default DepartmentDetail;
