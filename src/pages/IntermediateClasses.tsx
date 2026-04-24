import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronLeft,
  Clock,
  BookOpen,
  Plus,
  Search,
  Check,
  X,
  UserCircle,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { useDepartments } from "@/hooks/useDepartments";
import { useUsers } from "@/hooks/useUsers";
import ClassService from "@/services/classService";
import { useClasses } from "@/hooks/useClasses";
import ClassDetailView from "@/components/ClassDetailView";

const classDates = [
  { date: "2025-03-10", day: "Monday" },
  { date: "2025-03-11", day: "Tuesday" },
  { date: "2025-03-12", day: "Wednesday" },
  { date: "2025-03-13", day: "Thursday" },
  { date: "2025-03-14", day: "Friday" },
];

const lecturesByDate: Record<
  string,
  {
    id: string;
    subject: string;
    time: string;
    duration: string;
    teacher: string;
    presentPercent: number;
  }[]
> = {
  "2025-03-10": [
    {
      id: "l1",
      subject: "Physics",
      time: "09:00 AM",
      duration: "40 mins",
      teacher: "Rajesh Sharma",
      presentPercent: 85,
    },
    {
      id: "l2",
      subject: "Mathematics",
      time: "10:00 AM",
      duration: "40 mins",
      teacher: "Amit Patel",
      presentPercent: 92,
    },
    {
      id: "l3",
      subject: "English",
      time: "11:00 AM",
      duration: "40 mins",
      teacher: "Priya Nair",
      presentPercent: 78,
    },
  ],
  "2025-03-11": [
    {
      id: "l4",
      subject: "Chemistry",
      time: "09:00 AM",
      duration: "40 mins",
      teacher: "Vikram Singh",
      presentPercent: 88,
    },
    {
      id: "l5",
      subject: "Computer Science",
      time: "10:00 AM",
      duration: "40 mins",
      teacher: "Sunita Verma",
      presentPercent: 95,
    },
  ],
  "2025-03-12": [
    {
      id: "l6",
      subject: "Physics",
      time: "09:00 AM",
      duration: "40 mins",
      teacher: "Rajesh Sharma",
      presentPercent: 80,
    },
    {
      id: "l7",
      subject: "Mathematics",
      time: "10:30 AM",
      duration: "40 mins",
      teacher: "Amit Patel",
      presentPercent: 90,
    },
  ],
  "2025-03-13": [
    {
      id: "l8",
      subject: "English",
      time: "09:00 AM",
      duration: "40 mins",
      teacher: "Priya Nair",
      presentPercent: 82,
    },
  ],
  "2025-03-14": [
    {
      id: "l9",
      subject: "Chemistry",
      time: "09:00 AM",
      duration: "40 mins",
      teacher: "Vikram Singh",
      presentPercent: 91,
    },
    {
      id: "l10",
      subject: "Physics",
      time: "11:00 AM",
      duration: "40 mins",
      teacher: "Rajesh Sharma",
      presentPercent: 87,
    },
  ],
};

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

type View = "list" | "classDetail" | "dates" | "lectures" | "lectureDetail";

interface AssignedTeacher {
  teacherId: string;
  subject: string;
  schedule: { day: string; startTime: string; endTime: string }[];
}

const IntermediateClasses = () => {
  const { data: departments }  = useDepartments();
  const { data: classes, refetch, isLoading: classesLoading } = useClasses("intermediate");
  const { data }               = useUsers("");

  const { profUsers, interStudents } = useMemo(() => {
    if (!data) return { profUsers: [], interStudents: [] };
    return {
      profUsers: data.filter((u: any) => u.role === "proff"),
      interStudents: data.filter(
        (u: any) => u.role === "student" && u.category === "intermediate",
      ),
    };
  }, [data]);

  // ✅ Group real classes by part (I = 1st Year, II = 2nd Year)
  const classesByDept = useMemo(() => {
    if (!classes) return [];
    const map = new Map<string, { dept: any; classes: any[] }>();
    classes.forEach((cls: any) => {
      const dept = cls.departmentId;
      if (!dept?._id) return;
      if (!map.has(dept._id)) map.set(dept._id, { dept, classes: [] });
      map.get(dept._id)!.classes.push(cls);
    });
    return Array.from(map.values());
  }, [classes]);

  // ── navigation
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [view, setView] = useState<View>("list");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedClassData, setSelectedClassData] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedLecture, setSelectedLecture] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── form state
  const defaultForm = {
    departmentId: "",
    session: "",
    section: "",
    class: "I" as "I" | "II",
  };
  const [form, setForm] = useState(defaultForm);
  const [classSubjects, setClassSubjects] = useState<string[]>([]);
  const [assignedTeachers, setAssignedTeachers] = useState<AssignedTeacher[]>(
    [],
  );
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [teacherDropdownOpen, setTeacherDropdownOpen] = useState(false);
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);
  const [pendingTeacher, setPendingTeacher] = useState<{
    teacherId: string;
    subject: string;
    days: string[];
    startTime: string;
    endTime: string;
  } | null>(null);

  const set =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const intermediateDepts = (departments || []).filter(
    (d: any) => d?.category === "intermediate",
  );
  const professors = profUsers || [];

  const filteredStudents = interStudents.filter(
    (s: any) =>
      s?.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s?.specialId?.toLowerCase().includes(studentSearch.toLowerCase()),
  );

  const getDeptCode = (id: string) => {
    const dept = (departments || []).find((d: any) => d._id === id) as any;
    return dept?.code ?? "???";
  };

  // ✅ Live-generated class name
  const generatedClassName = useMemo(() => {
    if (!form.departmentId || !form.session || !form.section.trim()) return "";
    const deptCode = getDeptCode(form.departmentId);
    const sessionCode =
      form.session.length >= 7
        ? `${form.session.slice(2, 4)}${form.session.slice(-2)}`
        : form.session;
    return `${deptCode}-${sessionCode}-${form.section.toUpperCase()}-${form.class}`;
  }, [form.departmentId, form.session, form.section, form.class, departments]);

  // ── navigation helpers
  const goBack = () => {
    if (view === "lectureDetail") setView("lectures");
    else if (view === "lectures") setView("dates");
    else if (view === "dates") setView("classDetail");
    else if (view === "classDetail") setView("list");
  };

  const currentLectures = lecturesByDate[selectedDate] || [];
  const currentLecture = currentLectures.find((l) => l.id === selectedLecture);

  const resetForm = () => {
    setForm(defaultForm);
    setClassSubjects([]);
    setAssignedTeachers([]);
    setSelectedStudents([]);
    setStudentSearch("");
    setPendingTeacher(null);
    setExpandedTeacher(null);
    setTeacherDropdownOpen(false);
    setShowAddForm(false);
  };

  const validateForm = (): boolean => {
    if (!form.section.trim()) {
      toast.error("Section is required");
      return false;
    }
    if (!/^[A-Za-z]{2}\d{1}$/.test(form.section.trim())) {
      toast.error("Section must be 2 letters followed by 1 number (e.g. CS1)");
      return false;
    }
    if (!form.departmentId) {
      toast.error("Department is required");
      return false;
    }
    if (!form.session.trim()) {
      toast.error("Session is required");
      return false;
    }
    if (!form.class) {
      toast.error("Part (I or II) is required");
      return false;
    }
    if (assignedTeachers.length === 0) {
      toast.error("At least one teacher must be assigned");
      return false;
    }
    for (const t of assignedTeachers) {
      if (!t.subject) {
        toast.error("Each teacher must have a subject");
        return false;
      }
      if (t.schedule.length === 0) {
        toast.error("Each teacher must have at least one day");
        return false;
      }
      if (t.schedule.some((s) => !s.startTime || !s.endTime)) {
        toast.error("Each teacher must have start and end time");
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSaving(true);

    const payload = {
      className: generatedClassName,
      departmentId: form.departmentId,
      session: form.session.trim(),
      class: form.class,
      section: form.section.toUpperCase(),
      category: "intermediate",
      assignes: assignedTeachers,
      classStudents: selectedStudents,
      subjects: classSubjects,
    };

    try {
      const res = await ClassService.createClass(payload);
      if (res?.error || res?.statusCode >= 400) {
        if (Array.isArray(res?.errors))
          res.errors.forEach((e: string) => toast.error(e));
        else toast.error(res?.message ?? "Something went wrong");
        return;
      }
      toast.success(res?.message ?? "Class created successfully");
      await refetch();
      resetForm();
    } catch (err: any) {
      const d = err?.response?.data;
      if (Array.isArray(d?.errors))
        d.errors.forEach((m: string) => toast.error(m));
      else if (Array.isArray(d?.message))
        d.message.forEach((m: string) => toast.error(m));
      else toast.error(d?.message ?? "Network error, please try again");
    } finally {
      setSaving(false);
    }
  };

  const openTeacherConfig = (teacherId: string) => {
    setPendingTeacher({
      teacherId,
      subject: "",
      days: [],
      startTime: "",
      endTime: "",
    });
    setExpandedTeacher(teacherId);
  };

  const confirmTeacher = () => {
    if (!pendingTeacher) return;
    if (!pendingTeacher.subject) {
      toast.error("Please select a subject");
      return;
    }
    if (pendingTeacher.days.length === 0) {
      toast.error("Please select at least one day");
      return;
    }
    if (!pendingTeacher.startTime || !pendingTeacher.endTime) {
      toast.error("Please set start and end time");
      return;
    }
    const schedule = pendingTeacher.days.map((day) => ({
      day,
      startTime: pendingTeacher.startTime,
      endTime: pendingTeacher.endTime,
    }));
    const assignee: AssignedTeacher = {
      teacherId: pendingTeacher.teacherId,
      subject: pendingTeacher.subject,
      schedule,
    };
    setAssignedTeachers((prev) => {
      const exists = prev.find((t) => t.teacherId === assignee.teacherId);
      if (exists)
        return prev.map((t) =>
          t.teacherId === assignee.teacherId ? assignee : t,
        );
      return [...prev, assignee];
    });
    setClassSubjects((prev) =>
      prev.includes(pendingTeacher.subject)
        ? prev
        : [...prev, pendingTeacher.subject],
    );
    setPendingTeacher(null);
    setExpandedTeacher(null);
  };

  const removeTeacher = (teacherId: string) => {
    const removed = assignedTeachers.find((t) => t.teacherId === teacherId);
    setAssignedTeachers((prev) => {
      const updated = prev.filter((t) => t.teacherId !== teacherId);
      if (removed) {
        const stillUsed = updated.some((t) => t.subject === removed.subject);
        if (!stillUsed)
          setClassSubjects((s) => s.filter((sub) => sub !== removed.subject));
      }
      return updated;
    });
    if (pendingTeacher?.teacherId === teacherId) setPendingTeacher(null);
  };

  // ════════════════════════════════════════════════════════════
  //  VIEWS
  // ════════════════════════════════════════════════════════════

  if (view === "lectureDetail" && currentLecture) {
    return (
      <div>
        <button
          onClick={goBack}
          className="mb-4 flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Lectures
        </button>
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-1 font-display text-xl font-bold text-foreground sm:text-2xl"
        >
          {currentLecture.subject}
        </motion.h1>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="mb-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground"
        >
          <span className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <UserCircle className="h-6 w-6 text-primary" />
            </div>
            {currentLecture.teacher}
          </span>
          <span>Total Students: {interStudents.length}</span>
        </motion.div>
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                {["S.No", "Student ID", "Name", "Status"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left font-display font-semibold text-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {interStudents?.slice(0, 8).map((st: any, i: number) => (
                <motion.tr
                  key={st._id ?? i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors"
                >
                  <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {st?.specialId}
                  </td>
                  <td className="px-4 py-3 text-foreground">{st?.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${i % 3 === 0 ? "bg-destructive/10 text-destructive" : "bg-green-100 text-green-700"}`}
                    >
                      {i % 3 === 0 ? "Absent" : "Present"}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (view === "lectures") {
    const dateObj = classDates.find((d) => d.date === selectedDate);
    return (
      <div>
        <button
          onClick={goBack}
          className="mb-4 flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Dates
        </button>
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-1 font-display text-xl font-bold text-foreground sm:text-2xl"
        >
          Lectures — {dateObj?.day}, {selectedDate}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="mb-6 text-sm text-muted-foreground"
        >
          Class: {selectedClass} · {currentLectures.length} lectures
        </motion.p>
        <div className="space-y-3">
          {currentLectures.map((lec, i) => (
            <motion.div
              key={lec.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => {
                setSelectedLecture(lec.id);
                setView("lectureDetail");
              }}
              className="group cursor-pointer rounded-xl border border-border bg-card p-4 shadow-card hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display text-sm font-bold text-foreground truncate">
                      {lec.subject}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {lec.teacher}
                    </p>
                  </div>
                </div>
                <div className="text-right ml-auto">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {lec.time} · {lec.duration}
                  </div>
                  <div
                    className={`mt-1 text-xs font-semibold ${lec.presentPercent >= 85 ? "text-green-600" : lec.presentPercent >= 70 ? "text-yellow-600" : "text-destructive"}`}
                  >
                    {lec.presentPercent}% Present
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          {currentLectures.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              No lectures recorded for this date.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (view === "classDetail" && selectedClassData) {
    return (
      <ClassDetailView
        classData={selectedClassData}
        professors={professors}
        students={interStudents}
        onBack={() => setView("list")}
        onViewSchedule={() => {
          setSelectedClass(selectedClassData.className);
          setView("dates");
        }}
        onRemoveTeacher={(teacherId) => {
          setSelectedClassData((prev: any) => ({
            ...prev,
            assignes: (prev.assignes || []).filter((a: any) => (a.teacherId?._id || a.teacherId) !== teacherId),
          }));
          toast.success("Teacher removed from class");
        }}
        onRemoveStudent={(studentId) => {
          setSelectedClassData((prev: any) => ({
            ...prev,
            classStudents: (prev.classStudents || []).filter((s: any) => (s?._id || s) !== studentId),
          }));
          toast.success("Student removed from class");
        }}
        onAddTeachers={(teachers) => {
          setSelectedClassData((prev: any) => ({
            ...prev,
            assignes: [...(prev.assignes || []), ...teachers],
          }));
        }}
        onAddStudents={(studentIds) => {
          setSelectedClassData((prev: any) => ({
            ...prev,
            classStudents: [...(prev.classStudents || []), ...studentIds],
          }));
        }}
        onUpdateTeacherSchedule={(teacherId, schedule) => {
          setSelectedClassData((prev: any) => ({
            ...prev,
            assignes: (prev.assignes || []).map((a: any) =>
              (a.teacherId?._id || a.teacherId) === teacherId ? { ...a, schedule } : a
            ),
          }));
        }}
      />
    );
  }

  if (view === "dates") {
    return (
      <div>
        <button
          onClick={goBack}
          className="mb-4 flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Classes
        </button>
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-1 font-display text-xl font-bold text-foreground sm:text-2xl"
        >
          {selectedClass}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="mb-6 text-sm text-muted-foreground"
        >
          Schedule & Attendance
        </motion.p>
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                {["Date", "Day", "Lectures", "Action"].map((h) => (
                  <th
                    key={h}
                    className={`px-4 py-3 font-display font-semibold text-foreground ${h === "Action" ? "text-right" : "text-left"}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {classDates.map((d, i) => (
                <motion.tr
                  key={d.date}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => {
                    setSelectedDate(d.date);
                    setView("lectures");
                  }}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-secondary/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {d.date}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{d.day}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {(lecturesByDate[d.date] || []).length} lectures
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs font-medium text-primary hover:underline">
                      View →
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ══ MAIN LIST VIEW ═══════════════════════════════════════════
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-xl font-bold text-foreground sm:text-2xl"
        >
          Intermediate Classes
        </motion.h1>
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Class
        </motion.button>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-6 text-sm text-muted-foreground"
      >
        {classesByDept?.length}{" "}
        {classesByDept?.length === 1 ? "Department" : "Departments"} ·{" "}
        {classes?.length ?? 0} Total Classes
      </motion.p>

      {/* ── Real classes grouped by part ── */}
      <div className="space-y-3">
        {classesLoading && (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Loading classes...
          </div>
        )}

        {!classesLoading && classesByDept?.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No classes found. Add your first class.
          </div>
        )}

        {classesByDept?.map(({ dept, classes: deptClasses }, i) => (
          <motion.div
            key={dept._id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="rounded-xl border border-border bg-card shadow-card overflow-hidden"
          >
            {/* Department header */}
            <button
              onClick={() =>
                setExpandedDept(expandedDept === dept._id ? null : dept._id)
              }
              className="flex w-full items-center justify-between p-4 text-left hover:bg-secondary/50 transition-colors"
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
                    {dept?.code} · {deptClasses?.length}{" "}
                    {deptClasses?.length === 1 ? "class" : "classes"}
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`h-5 w-5 text-muted-foreground transition-transform ${expandedDept === dept._id ? "rotate-180" : ""}`}
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
                  <div className="border-t border-border px-4 py-3 space-y-2">
                    {deptClasses.map((cls: any) => (
                      <div
                        key={cls._id}
                        onClick={() => {
                          setSelectedClassData(cls);
                          setSelectedClass(cls.className);
                          setView("classDetail");
                        }}
                        className="flex items-center justify-between gap-2 rounded-lg bg-secondary/50 px-4 py-3 cursor-pointer hover:bg-secondary transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 shrink-0">
                            <BookOpen className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {cls.className}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {/* ✅ Show part label for intermediate */}
                              {cls.class === "I"
                                ? "1st Year"
                                : "2nd Year"} · {cls.session}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right hidden sm:block">
                            <p className="text-xs text-muted-foreground">
                              {cls.classStudents?.length ?? 0} students
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {cls.assignes?.length ?? 0} teachers
                            </p>
                          </div>
                          <span className="text-xs font-medium text-primary">
                            View →
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* ══ ADD CLASS MODAL ══════════════════════════════════════ */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={resetForm}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="flex flex-col w-full max-w-lg rounded-2xl border border-border bg-card shadow-modal max-h-[90vh]"
            >
              {/* header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border shrink-0">
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground">
                    Add Intermediate Class
                  </h2>
                  {generatedClassName && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Name:{" "}
                      <span className="font-mono font-medium text-primary">
                        {generatedClassName}
                      </span>
                    </p>
                  )}
                </div>
                <button
                  onClick={resetForm}
                  className="rounded-lg p-1 hover:bg-secondary transition-colors"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              {/* scrollable body */}
              <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
                {/* Department */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Department
                  </label>
                  <select
                    value={form.departmentId}
                    onChange={set("departmentId")}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select department</option>
                    {intermediateDepts?.map((d: any) => (
                      <option key={d?._id} value={d?._id}>
                        {d?.code} — {d?.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Session + Part */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Session
                    </label>
                    <input
                      value={form.session}
                      onChange={set("session")}
                      placeholder="2023-2025"
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Part
                    </label>
                    <select
                      value={form.class}
                      onChange={set("class")}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="I">I — 1st Year</option>
                      <option value="II">II — 2nd Year</option>
                    </select>
                  </div>
                </div>

                {/* Subjects */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Subjects{" "}
                    <span className="text-muted-foreground/60">
                      (auto-added from assigned teachers)
                    </span>
                  </label>
                  <div className="min-h-[40px] flex flex-wrap gap-2 rounded-lg border border-input bg-background px-3 py-2">
                    {classSubjects.length === 0 && (
                      <span className="text-xs text-muted-foreground">
                        Subjects will appear as you assign teachers
                      </span>
                    )}
                    {classSubjects?.map((sub) => (
                      <span
                        key={sub}
                        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                      >
                        {sub}
                        <button
                          onClick={() =>
                            setClassSubjects((prev) =>
                              prev.filter((s) => s !== sub),
                            )
                          }
                          className="ml-0.5 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input
                      id="extra-subject-input"
                      placeholder="Add extra subject manually..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const val = (
                            e.target as HTMLInputElement
                          ).value.trim();
                          if (val && !classSubjects.includes(val))
                            setClassSubjects((p) => [...p, val]);
                          (e.target as HTMLInputElement).value = "";
                        }
                      }}
                      className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById(
                          "extra-subject-input",
                        ) as HTMLInputElement;
                        const val = input?.value.trim();
                        if (val && !classSubjects.includes(val)) {
                          setClassSubjects((p) => [...p, val]);
                          input.value = "";
                        }
                      }}
                      className="rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-secondary transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Assign Teachers */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Assign Teachers
                    {assignedTeachers.length > 0 && (
                      <span className="ml-1 text-primary">
                        ({assignedTeachers.length} assigned)
                      </span>
                    )}
                  </label>

                  {assignedTeachers?.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {assignedTeachers?.map((t) => {
                        const prof = professors?.find(
                          (p: any) => p._id === t.teacherId,
                        ) as any;
                        return (
                          <span
                            key={t.teacherId}
                            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                          >
                            {prof?.name ?? "Teacher"} · {t.subject} ·{" "}
                            {t.schedule
                              .map(
                                (s) => `${s.day} ${s.startTime}–${s.endTime}`,
                              )
                              .join(", ")}
                            <button
                              onClick={() => removeTeacher(t.teacherId)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <button
                    onClick={() => setTeacherDropdownOpen(!teacherDropdownOpen)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-left text-muted-foreground hover:bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                  >
                    + Select a teacher to assign
                  </button>

                  <AnimatePresence>
                    {teacherDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="mt-1 rounded-lg border border-border bg-card shadow-elevated max-h-72 overflow-y-auto"
                      >
                        {professors?.length === 0 && (
                          <p className="p-4 text-center text-sm text-muted-foreground">
                            No professors loaded
                          </p>
                        )}
                        {professors?.map((p: any) => {
                          const alreadyAssigned = assignedTeachers.some(
                            (t) => t.teacherId === p._id,
                          );
                          const isExpanded = expandedTeacher === p._id;
                          const isPending = pendingTeacher?.teacherId === p._id;
                          return (
                            <div
                              key={p._id}
                              className="border-b border-border last:border-0"
                            >
                              <button
                                onClick={() => {
                                  if (alreadyAssigned) {
                                    removeTeacher(p._id);
                                    return;
                                  }
                                  if (isExpanded) {
                                    setExpandedTeacher(null);
                                    setPendingTeacher(null);
                                    return;
                                  }
                                  openTeacherConfig(p._id);
                                  setTeacherDropdownOpen(true);
                                }}
                                className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-secondary/50 transition-colors"
                              >
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                  <UserCircle className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">
                                    {p.name} {p.lastName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {p.department?.code ?? "—"}
                                  </p>
                                </div>
                                {alreadyAssigned ? (
                                  <span className="text-xs text-primary flex items-center gap-1">
                                    <Check className="h-3.5 w-3.5" /> Assigned
                                  </span>
                                ) : (
                                  <ChevronDown
                                    className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                  />
                                )}
                              </button>

                              <AnimatePresence>
                                {isExpanded &&
                                  isPending &&
                                  !alreadyAssigned && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="overflow-hidden bg-secondary/20 px-4 py-3 space-y-2"
                                    >
                                      <div>
                                        <label className="mb-1 block text-xs text-muted-foreground">
                                          Subject
                                        </label>
                                        {p.subjects?.length > 0 ? (
                                          <select
                                            value={pendingTeacher?.subject}
                                            onChange={(e) =>
                                              setPendingTeacher((pt) =>
                                                pt
                                                  ? {
                                                      ...pt,
                                                      subject: e.target.value,
                                                    }
                                                  : pt,
                                              )
                                            }
                                            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                          >
                                            <option value="">
                                              Select subject
                                            </option>
                                            {p.subjects.map((s: string) => (
                                              <option key={s} value={s}>
                                                {s}
                                              </option>
                                            ))}
                                          </select>
                                        ) : (
                                          <input
                                            value={pendingTeacher?.subject}
                                            onChange={(e) =>
                                              setPendingTeacher((pt) =>
                                                pt
                                                  ? {
                                                      ...pt,
                                                      subject: e.target.value,
                                                    }
                                                  : pt,
                                              )
                                            }
                                            placeholder="e.g. Physics"
                                            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                          />
                                        )}
                                      </div>
                                      <div>
                                        <label className="mb-1 block text-xs text-muted-foreground">
                                          Days (same time for all selected)
                                          {pendingTeacher?.days &&
                                            pendingTeacher.days.length > 0 && (
                                              <span className="ml-1 text-primary">
                                                ({pendingTeacher.days.length}{" "}
                                                selected)
                                              </span>
                                            )}
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                          {DAYS.map((d) => {
                                            const isSelected =
                                              pendingTeacher?.days.includes(
                                                d,
                                              ) ?? false;
                                            return (
                                              <button
                                                key={d}
                                                type="button"
                                                onClick={() =>
                                                  setPendingTeacher((pt) =>
                                                    pt
                                                      ? {
                                                          ...pt,
                                                          days: isSelected
                                                            ? pt.days.filter(
                                                                (day) =>
                                                                  day !== d,
                                                              )
                                                            : [...pt.days, d],
                                                        }
                                                      : pt,
                                                  )
                                                }
                                                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-input hover:bg-secondary"}`}
                                              >
                                                {d.slice(0, 3)}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="mb-1 block text-xs text-muted-foreground">
                                            Start time
                                          </label>
                                          <input
                                            type="time"
                                            value={pendingTeacher?.startTime}
                                            onChange={(e) =>
                                              setPendingTeacher((pt) =>
                                                pt
                                                  ? {
                                                      ...pt,
                                                      startTime: e.target.value,
                                                    }
                                                  : pt,
                                              )
                                            }
                                            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                          />
                                        </div>
                                        <div>
                                          <label className="mb-1 block text-xs text-muted-foreground">
                                            End time
                                          </label>
                                          <input
                                            type="time"
                                            value={pendingTeacher?.endTime}
                                            onChange={(e) =>
                                              setPendingTeacher((pt) =>
                                                pt
                                                  ? {
                                                      ...pt,
                                                      endTime: e.target.value,
                                                    }
                                                  : pt,
                                              )
                                            }
                                            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                          />
                                        </div>
                                      </div>
                                      <button
                                        onClick={confirmTeacher}
                                        className="w-full rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                                      >
                                        Confirm Assignment
                                      </button>
                                    </motion.div>
                                  )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Add Students */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Add Students
                    {selectedStudents.length > 0 && (
                      <span className="ml-1 text-primary">
                        ({selectedStudents.length} selected)
                      </span>
                    )}
                  </label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Search by name or ID..."
                      className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="max-h-44 overflow-y-auto rounded-lg border border-border">
                    {filteredStudents.length === 0 && (
                      <p className="p-4 text-center text-sm text-muted-foreground">
                        No students found
                      </p>
                    )}
                    {filteredStudents.map((s: any) => (
                      <button
                        key={s._id}
                        onClick={() =>
                          setSelectedStudents((prev) =>
                            prev.includes(s._id)
                              ? prev.filter((id) => id !== s._id)
                              : [...prev, s._id],
                          )
                        }
                        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-secondary/50 transition-colors border-b border-border last:border-0"
                      >
                        <div>
                          <p className="text-sm text-foreground">
                            {s.name} {s.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {s.specialId}
                          </p>
                        </div>
                        {selectedStudents.includes(s._id) && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section — at the bottom */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Section{" "}
                    <span className="text-muted-foreground/60">
                      (2 letters + 1 number, e.g. CS1)
                    </span>
                  </label>
                  <input
                    value={form.section}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      if (val.length <= 3)
                        setForm((f) => ({ ...f, section: val }));
                    }}
                    placeholder="CS1"
                    maxLength={3}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  {generatedClassName && (
                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2">
                      <span className="text-xs text-muted-foreground shrink-0">
                        Generated class name:
                      </span>
                      <span className="text-xs font-mono font-medium text-primary">
                        {generatedClassName}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* footer */}
              <div className="flex gap-3 px-6 py-4 border-t border-border shrink-0">
                <button
                  onClick={resetForm}
                  className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Add Class"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default IntermediateClasses;
