import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Users, GraduationCap, School, FileText, TrendingUp, ArrowRight, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUsers } from "@/hooks/useUsers";
import { useClasses } from "@/hooks/useClasses";
import { useQuery } from "@tanstack/react-query";
import DepartmentService from "@/services/departmentService";
import { getStudentProgram } from "@/lib/studentProgram";

const PrincipalDashboard = () => {
  const navigate = useNavigate();
  
  // Fetch all users with role "proff" (professors/teachers/HODs)
  const { data: faculty = [], isLoading: facultyLoading } = useUsers("proff");
  
  // Fetch all students
  const { data: students = [], isLoading: studentsLoading } = useUsers("student");
  
  // Fetch classes
  const { data: classes = [], isLoading: classesLoading } = useClasses("");
  
  // Fetch departments for stats
  const { data: deptStats } = useQuery({
    queryKey: ["principal-dept-stats"],
    queryFn: async () => {
      const res = await DepartmentService.getAllDepartments();
      return res?.data ?? res ?? [];
    },
    retry: false,
    staleTime: 60_000,
  });

  const isLoading = facultyLoading || studentsLoading || classesLoading;

  // Calculate counts
  const totalFaculty = faculty.length;
  const hodCount = faculty.filter((f: any) => f.isHod).length;
  const teacherCount = faculty.filter((f: any) => !f.isHod).length;
  
  const interStudents = students.filter((s: any) => getStudentProgram(s) === "intermediate").length;
  const bsadpStudents = students.filter((s: any) => {
    const p = getStudentProgram(s);
    return p === "bs" || p === "adp";
  }).length;
  const totalStudents = students.length;
  const totalClasses = classes.length;
  const totalDepartments = deptStats?.length ?? 0;

  const cards = [
    {
      title: "Faculty & Teachers",
      description: `${totalFaculty} total (${hodCount} HODs, ${teacherCount} Teachers)`,
      count: totalFaculty,
      icon: GraduationCap,
      path: "/principal/faculty",
      color: "from-primary/20 to-primary/5",
      iconBg: "bg-primary/10 text-primary",
      subItems: [
        { label: "HODs", count: hodCount, icon: Building2 },
        { label: "Teachers", count: teacherCount, icon: Users },
      ],
    },
    {
      title: "Students",
      description: `${totalStudents} total (${interStudents} Intermediate, ${bsadpStudents} BS/ADP)`,
      count: totalStudents,
      icon: Users,
      path: "/principal/students",
      color: "from-emerald/20 to-emerald/5",
      iconBg: "bg-emerald/10 text-emerald-foreground",
    },
    {
      title: "Classes",
      description: `${totalClasses} active classes across departments`,
      count: totalClasses,
      icon: School,
      path: "/principal/classes",
      color: "from-blue/20 to-blue/5",
      iconBg: "bg-blue/10 text-blue-foreground",
    },
    {
      title: "Departments",
      description: `${totalDepartments} academic departments`,
      count: totalDepartments,
      icon: Building2,
      path: "/principal/departments",
      color: "from-amber/20 to-amber/5",
      iconBg: "bg-amber/10 text-amber-foreground",
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-xl font-bold text-foreground"
        >
          Principal Dashboard
        </motion.h1>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
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
    <div className="space-y-6 sm:space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">
            Principal Dashboard
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Overview of school faculty, students, and academics
          </p>
        </div>
      </motion.div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08 }}
            onClick={() => navigate(card.path)}
            className={`group cursor-pointer rounded-2xl border border-border bg-gradient-to-br ${card.color} p-6 shadow-card transition-all hover:shadow-lg hover:-translate-y-1`}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.iconBg}`}>
                <card.icon className="h-6 w-6" />
              </div>
              <span className="rounded-full bg-card px-3 py-1 text-sm font-semibold text-foreground shadow-sm">
                {card.count}
              </span>
            </div>
            <h2 className="mb-1 font-display text-lg font-bold text-foreground">{card.title}</h2>
            <p className="mb-4 text-sm text-muted-foreground">{card.description}</p>
            {card.subItems && (
              <div className="mb-3 flex gap-4 text-xs text-muted-foreground">
                {card.subItems.map((sub) => (
                  <div key={sub.label} className="flex items-center gap-1">
                    <sub.icon className="h-3 w-3" />
                    <span>{sub.label}: {sub.count}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
              View Details <ArrowRight className="h-4 w-4" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Faculty</p>
              <p className="font-display text-xl font-bold text-foreground">{totalFaculty}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald/10 text-emerald">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Students</p>
              <p className="font-display text-xl font-bold text-foreground">{totalStudents}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue/10 text-blue">
              <School className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Classes</p>
              <p className="font-display text-xl font-bold text-foreground">{totalClasses}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber/10 text-amber">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Departments</p>
              <p className="font-display text-xl font-bold text-foreground">{totalDepartments}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PrincipalDashboard;