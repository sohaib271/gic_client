import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { School, ChevronLeft, Users, BookOpen, Clock, UserCircle, CalendarDays } from "lucide-react";
import { useSelector } from "react-redux";
import AttendanceMarker from "@/components/AttendanceMarker";
import { useMyClasses } from "@/hooks/useMyClasses";
import { useUsers } from "@/hooks/useUsers";
import ManagedClassDetail from "@/components/ManagedClassDetail";

type View = "list" | "classDetail" | "attendance";

const ProfessorClasses = () => {
  const user = useSelector((state: any) => state?.user.user);
  const { data: classes = [], isLoading: loading, refetch } = useMyClasses();
  const { data: users = [] } = useUsers("");
  const [view, setView] = useState<View>("list");
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const departmentId = user?.department?._id ?? user?.department;

  const { departmentTeachers, departmentStudents } = useMemo(() => {
    const sameDepartment = (member: any) =>
      (member?.department?._id ?? member?.department) === departmentId;
    return {
      departmentTeachers: users.filter(
        (member: any) => member.role === "proff" && sameDepartment(member),
      ),
      departmentStudents: users.filter(
        (member: any) => member.role === "student" && sameDepartment(member),
      ),
    };
  }, [departmentId, users]);

  const getMyAssignment = (cls: any) => {
    return (cls.assignes || []).find((a: any) => {
      const tid = typeof a.teacherId === "object" ? a.teacherId?._id : a.teacherId;
      return tid === user?._id;
    });
  };

  // ── Attendance view
  if (view === "attendance" && selectedClass) {
    return (
      <AttendanceMarker
        classData={selectedClass}
        teacherId={user?._id}
        onBack={() => setView("classDetail")}
      />
    );
  }

  if (view === "classDetail" && selectedClass && user?.isHod) {
    return (
      <ManagedClassDetail
        classData={selectedClass}
        professors={departmentTeachers}
        students={departmentStudents}
        onBack={() => setView("list")}
        onChange={setSelectedClass}
        onRefetch={() => void refetch()}
        onMarkAttendance={() => setView("attendance")}
      />
    );
  }

  // ── Class detail view (read-only)
  if (view === "classDetail" && selectedClass) {
    const assignedTeachers = selectedClass.assignes || [];
    const classStudents = selectedClass.classStudents || [];

    return (
      <div>
        <button
          onClick={() => setView("list")}
          className="mb-4 flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ChevronLeft className="h-4 w-4" /> Back to My Classes
        </button>

        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-xl font-bold text-foreground sm:text-2xl"
            >
              {selectedClass?.className}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05 }}
              className="mt-1 text-sm text-muted-foreground"
            >
              {selectedClass?.departmentId?.name ?? ""} · {selectedClass?.session}
            </motion.p>
          </div>
          <button
            onClick={() => setView("attendance")}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <CalendarDays className="h-4 w-4" /> Mark Attendance
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-1 rounded-lg border border-border bg-secondary/30 p-1 w-fit">
          {["teachers", "students"].map((tab) => (
            <button
              key={tab}
              className="rounded-md px-4 py-1.5 text-sm font-medium capitalize text-muted-foreground cursor-default"
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Teachers section */}
        <div className="space-y-4 mb-6">
          <h3 className="text-sm font-semibold text-foreground">
            Assigned Teachers ({assignedTeachers.length})
          </h3>
          {assignedTeachers.length === 0 && (
            <p className="text-sm text-muted-foreground">No teachers assigned.</p>
          )}
          {assignedTeachers.map((t: any, i: number) => {
            const tname = typeof t.teacherId === "object"
              ? `${t.teacherId.name ?? ""} ${t.teacherId.lastName ?? ""}`.trim()
              : "Teacher";
            const byDay: Record<string, any[]> = {};
            (t.schedule || []).forEach((s: any) => {
              if (!byDay[s.day]) byDay[s.day] = [];
              byDay[s.day].push(s);
            });

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-xl border border-border bg-card shadow-card overflow-hidden"
              >
                <div className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                    <UserCircle className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{tname}</p>
                    <p className="text-xs text-muted-foreground">{t.subject}</p>
                  </div>
                </div>
                {Object.keys(byDay).length > 0 && (
                  <div className="border-t border-border px-4 pb-3 pt-2 space-y-1.5">
                    {Object.entries(byDay).map(([day, entries]) => (
                      <div key={day} className="flex flex-wrap items-center gap-2">
                        <span className="w-8 shrink-0 text-xs font-medium text-muted-foreground">
                          {day.slice(0, 3)}
                        </span>
                        {entries.map((e: any, idx: number) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground"
                          >
                            <Clock className="h-3 w-3" />
                            {e.startTime}–{e.endTime}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Students section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            Enrolled Students ({classStudents.length})
          </h3>
          {classStudents.length === 0 && (
            <p className="text-sm text-muted-foreground">No students enrolled.</p>
          )}
          {classStudents.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    {["#", "Student ID", "Name"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-display font-semibold text-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map((s: any, i: number) => (
                    <tr
                      key={s?._id || i}
                      className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{s?.specialId ?? "—"}</td>
                      <td className="px-4 py-3 text-foreground">{s?.name} {s?.lastName ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── List view
  return (
    <div>
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-2 font-display text-xl font-bold text-foreground sm:text-2xl"
      >
        My Classes
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-6 text-sm text-muted-foreground"
      >
        Classes you are assigned to teach
      </motion.p>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl border border-border bg-card animate-pulse" />
          ))}
        </div>
      )}

      {!loading && classes.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12 text-center">
          <School className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">No Classes Assigned</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            You are not currently assigned to any classes. Contact the administrator for class assignments.
          </p>
        </div>
      )}

      {!loading && classes.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {classes.map((cls, i) => {
            const myAssignment = getMyAssignment(cls);
            const studentCount = (cls.classStudents || []).length;
            return (
              <motion.div
                key={cls._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => {
                  setSelectedClass(cls);
                  setView("classDetail");
                }}
                className="group cursor-pointer rounded-xl border border-border bg-card p-4 shadow-card hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <School className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display text-sm font-bold text-foreground">
                        {cls.className}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {cls.departmentId?.name ?? cls.category}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {myAssignment?.subject && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      <BookOpen className="h-3 w-3" /> {myAssignment.subject}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" /> {studentCount} students
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {(myAssignment?.schedule || []).length} slots/week
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProfessorClasses;
