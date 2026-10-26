import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Users, GraduationCap, Search, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUsers } from "@/hooks/useUsers";
import { getStudentProgram } from "@/lib/studentProgram";

const PrincipalStudents = () => {
  const navigate = useNavigate();
  const { data: students = [], isLoading } = useUsers("student");
  const [search, setSearch] = useState("");

  const interStudents = students.filter((s: any) => getStudentProgram(s) === "intermediate");
  const bsadpStudents = students.filter((s: any) => {
    const p = getStudentProgram(s);
    return p === "bs" || p === "adp";
  });

  const filteredStudents = useMemo(() => {
    if (!search) return students;
    const s = search.toLowerCase();
    return students.filter(
      (u: any) =>
        u?.name?.toLowerCase().includes(s) ||
        u?.lastName?.toLowerCase().includes(s) ||
        u?.email?.toLowerCase().includes(s) ||
        u?.specialId?.toLowerCase().includes(s)
    );
  }, [students, search]);

  const cards = [
    {
      title: "Intermediate Students",
      description: `Manage ${interStudents.length} students in 1st & 2nd Year`,
      count: interStudents.length,
      icon: Users,
      path: "/principal/students/intermediate",
      color: "from-primary/20 to-primary/5",
      iconBg: "bg-primary/10 text-primary",
    },
    {
      title: "BS / ADP Students",
      description: `Manage ${bsadpStudents.length} students in degree programs`,
      count: bsadpStudents.length,
      icon: GraduationCap,
      path: "/principal/students/bs-adp",
      color: "from-accent/20 to-accent/5",
      iconBg: "bg-accent/10 text-accent-foreground",
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <motion.h1 className="font-display text-xl font-bold text-foreground">Students</motion.h1>
        <div className="grid gap-6 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <motion.div key={i} className="rounded-2xl border border-border bg-card p-6 animate-pulse">
              <div className="h-4 w-3/4 bg-muted rounded mb-4" />
              <div className="h-8 w-1/2 bg-muted rounded" />
            </motion.div>
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
          <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">Students</h1>
          <p className="text-sm text-muted-foreground">
            View and manage all students ({students.length} total)
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-md border border-input bg-background"
          />
        </div>
      </motion.div>

      <div className="grid gap-6 sm:grid-cols-2">
        {cards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.1 }}
            onClick={() => card.path && navigate(card.path)}
            className={`group cursor-pointer rounded-2xl border border-border bg-gradient-to-br ${card.color} p-6 shadow-card transition-all hover:shadow-lg hover:-translate-y-1`}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.iconBg}`}>
                <card.icon className="h-6 w-6" />
              </div>
              <span className="rounded-full bg-card px-3 py-1 text-sm font-semibold text-foreground shadow-sm">
                {card.count} Students
              </span>
            </div>
            <h2 className="mb-1 font-display text-lg font-bold text-foreground">{card.title}</h2>
            <p className="mb-4 text-sm text-muted-foreground">{card.description}</p>
            <div className="flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
              View Students <ArrowRight className="h-4 w-4" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default PrincipalStudents;
