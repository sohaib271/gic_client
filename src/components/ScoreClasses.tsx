import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Building2, GraduationCap, Award } from "lucide-react";
import { useSelector } from "react-redux";
import { useDepartments } from "@/hooks/useDepartments";
import { useClasses } from "@/hooks/useClasses";
import PaginationControls from "@/components/PaginationControls";
import ClassResultSheet from "@/components/ClassResultSheet";

interface ScoreClassesProps {
  /** "intermediate" | "bs_adp" — matches what /class/all expects. */
  category: string;
  /** Heading shown above the class list. */
  heading: string;
}

const CLASS_PAGE_SIZE = 6;

const yearLabel = (value?: string) =>
  value === "I" ? "1st Year" : value === "II" ? "2nd Year" : value || "—";

/**
 * Score entry shell shared by the intermediate and BS/ADP result pages.
 *
 * Both pages need the same two-step flow — pick a class, then work through its
 * students — so the class list lives here once instead of being copy-pasted.
 */
const ScoreClasses = ({ category, heading }: ScoreClassesProps) => {
  const user = useSelector((state: any) => state?.user?.user);

  // An HOD only sees their own department; an admin can see them all.
  const deptId: string = user?.isHod
    ? user?.department?._id ?? user?.department ?? ""
    : "";

  const { data: departments } = useDepartments();
  const { data: classes, isLoading: classesLoading } = useClasses(category, deptId);

  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [deptPages, setDeptPages] = useState<Record<string, number>>({});

  const classesByDept = useMemo(() => {
    if (!classes) return [];
    const map = new Map<string, { dept: any; classes: any[] }>();
    classes.forEach((cls: any) => {
      const deptIdOfClass = cls?.departmentId?._id ?? cls?.departmentId;
      // A class with no department still needs to be reachable, so it is filed
      // under a placeholder bucket instead of being dropped.
      const key = deptIdOfClass ?? "unassigned";
      if (!map.has(key)) {
        map.set(key, { dept: cls?.departmentId ?? { _id: key, name: "Unassigned" }, classes: [] });
      }
      map.get(key)!.classes.push(cls);
    });
    return Array.from(map.values());
  }, [classes]);

  const totalClasses = classes?.length ?? 0;

  const openClass = (cls: any) => setSelectedClass(cls);

  if (selectedClass) {
    return (
      <ClassResultSheet
        classData={selectedClass}
        departmentId={deptId || selectedClass?.departmentId?._id}
        onBack={() => setSelectedClass(null)}
      />
    );
  }

  return (
    <div>
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 0, y: 0 }}
        className="mb-2 font-display text-xl font-bold text-foreground sm:text-2xl"
      >
        {heading}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
        className="mb-6 text-sm text-muted-foreground"
      >
        {classesByDept.length}{" "}
        {classesByDept.length === 1 ? "Department" : "Departments"} · {totalClasses}{" "}
        Total Classes
      </motion.p>

      {classesLoading && (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Loading classes...
        </div>
      )}

      {!classesLoading && totalClasses === 0 && (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No classes found. Create classes first to enter their results.
        </div>
      )}

      <div className="space-y-3">
        {classesByDept.map(({ dept, classes: deptClasses }, i) => {
          const page = deptPages[dept._id] ?? 1;
          const pageClasses = deptClasses.slice(
            (page - 1) * CLASS_PAGE_SIZE,
            page * CLASS_PAGE_SIZE,
          );

          return (
            <motion.div
              key={dept._id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.05 }}
              className="overflow-hidden rounded-xl border border-border bg-card shadow-card"
            >
              <button
                onClick={() =>
                  setExpandedDept(expandedDept === dept._id ? null : dept._id)
                }
                className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-secondary/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-bold text-foreground">
                      {dept.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {dept?.code ? `${dept.code} · ` : ""}
                      {deptClasses.length}{" "}
                      {deptClasses.length === 1 ? "class" : "classes"}
                    </p>
                  </div>
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-muted-foreground transition-transform ${
                    expandedDept === dept._id ? "rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {expandedDept === dept._id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 border-t border-border px-4 py-3">
                      {pageClasses.length === 0 ? (
                        <p className="py-4 text-center text-sm text-muted-foreground">
                          No classes in this department yet
                        </p>
                      ) : (
                        pageClasses.map((cls: any) => (
                          <div
                            key={cls._id}
                            onClick={() => openClass(cls)}
                            className="flex cursor-pointer items-center justify-between gap-2 rounded-lg bg-secondary/50 px-4 py-3 transition-colors hover:bg-secondary"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                                <GraduationCap className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  {cls.className}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {yearLabel(cls.class)} · {cls.session}
                                </p>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-4">
                              <div className="hidden text-right sm:block">
                                <p className="text-xs text-muted-foreground">
                                  {cls.classStudents?.length ?? 0} students
                                </p>
                              </div>
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                                <Award className="h-3.5 w-3.5" />
                                Results →
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <PaginationControls
                      page={page}
                      pageSize={CLASS_PAGE_SIZE}
                      total={deptClasses.length}
                      onPageChange={(next) =>
                        setDeptPages((current) => ({
                          ...current,
                          [dept._id]: next,
                        }))
                      }
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ScoreClasses;