// FacultyDetailView.tsx — full updated component
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Clock, BookOpen, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTeacherSchedule } from "@/hooks/useTeacherSchedule";

interface FacultyDetailViewProps {
  faculty: any;
  type: "proff" | "principal" | "vice_principal";
  onBack: () => void;
  autoShowSchedule?: boolean;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ✅ Convert "09:00" → "09:00 AM" / "13:00" → "01:00 PM" for display
const formatTime = (t: string) => {
  if (!t) return t;
  if (t.includes("AM") || t.includes("PM")) return t; // already formatted
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour   = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
};

const FacultyDetailView = ({ faculty, type, onBack, autoShowSchedule = false }: FacultyDetailViewProps) => {
  const [showSchedule, setShowSchedule] = useState(autoShowSchedule);
  const isProfessor = type === "proff";

  // ✅ Only fetch when viewing schedule tab and is a professor
  const { schedule, isLoading, error } = useTeacherSchedule(
    showSchedule && isProfessor ? faculty?._id : null
  );

  // ✅ Build timetable grid from real schedule data
  const activeDays  = DAYS.filter((d) => schedule.some((s) => s.day === d));
  const displayDays = activeDays.length > 0 ? activeDays : DAYS.slice(0, 5);

  // Collect unique time slots sorted
  const allTimes = [...new Set(schedule.map((s) => s.startTime))].sort();

  // Lookup map: day||startTime → entry
  const lookup: Record<string, typeof schedule[0]> = {};
  schedule.forEach((s) => { lookup[`${s.day}||${s.startTime}`] = s; });

  const details: [string, string][] = [
    ["First Name",      faculty?.name       ?? "—"],
    ["Last Name",       faculty?.lastName   ?? "—"],
    ["Email",           faculty?.email      ?? "—"],
    ["Phone",           faculty?.phone      ?? "—"],
    ["CNIC",            faculty?.cnic       ?? "—"],
    ["Gender",          faculty?.gender === "M" ? "Male" : faculty?.gender === "F" ? "Female" : "—"],
    ["City",            faculty?.city       ?? "—"],
    ["Address",         faculty?.address    ?? "—"],
    ["Date of Joining", faculty?.doj        ?? "—"],
    ...(isProfessor ? [
      ["HOD",           faculty?.isHod ? "Yes" : "No"]                                               as [string, string],
      ["Department",    faculty?.department?.code ?? faculty?.department ?? "—"]                       as [string, string],
      ["Qualification", faculty?.qualification ?? "—"]                                                as [string, string],
      ["Subjects",      Array.isArray(faculty?.subjects) ? faculty.subjects.join(", ") : (faculty?.subjects ?? "—")] as [string, string],
    ] : []),
  ];

  // ── SCHEDULE VIEW ──────────────────────────────────────────
  if (showSchedule && isProfessor) {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          {!autoShowSchedule && (
            <Button variant="ghost" size="sm" onClick={() => setShowSchedule(false)} className="gap-1.5 w-fit">
              <ArrowLeft className="h-4 w-4" /> Back to Details
            </Button>
          )}
          <h2 className="font-display text-lg sm:text-xl font-bold text-foreground">
            {faculty?.name} {faculty?.lastName}'s Timetable
          </h2>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 rounded-xl border border-border bg-card animate-pulse" />
            ))}
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-8 text-center">
            <AlertCircle className="h-10 w-10 text-destructive mb-3" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && schedule.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-8 sm:p-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-display text-lg font-semibold text-foreground mb-2">No Schedule Available</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              This professor has no schedule assigned yet.
            </p>
          </motion.div>
        )}

        {/* ✅ Real timetable grid */}
        {!isLoading && !error && schedule.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-secondary/50">
                    <th className="border-b border-r border-border px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" /> Time
                      </div>
                    </th>
                    {displayDays.map((day) => (
                      <th key={day} className="border-b border-r border-border last:border-r-0 px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <span className="hidden sm:inline">{day}</span>
                        <span className="sm:hidden">{day.slice(0, 3)}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allTimes.map((slot, si) => (
                    <tr key={slot} className={si % 2 === 0 ? "bg-card" : "bg-secondary/20"}>
                      <td className="border-b border-r border-border px-3 py-3 text-xs sm:text-sm font-medium text-foreground whitespace-nowrap">
                        {formatTime(slot)}
                      </td>
                      {displayDays.map((day) => {
                        const entry = lookup[`${day}||${slot}`];
                        return (
                          <td key={day} className="border-b border-r border-border last:border-r-0 px-1.5 py-1.5 text-center align-middle">
                            {entry ? (
                              <div className="rounded-lg bg-primary/10 border border-primary/20 px-2 py-2 space-y-0.5 hover:bg-primary/15 transition-colors">
                                <div className="flex items-center justify-center gap-1">
                                  <BookOpen className="h-3 w-3 text-primary shrink-0" />
                                  <span className="text-xs sm:text-sm font-semibold text-primary truncate">{entry.subject}</span>
                                </div>
                                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{entry.className}</p>
                                <p className="text-[10px] text-muted-foreground/70">
                                  {formatTime(entry.startTime)} – {formatTime(entry.endTime)}
                                </p>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground/40">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary footer */}
            <div className="flex flex-wrap items-center gap-4 px-4 py-3 border-t border-border bg-secondary/30 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-primary/10 border border-primary/20" />
                Lecture
              </span>
              <span>Total: <strong className="text-foreground">{schedule.length}</strong> lectures / week</span>
              <span>Days: <strong className="text-foreground">{activeDays.length}</strong></span>
              <span>Classes: <strong className="text-foreground">
                {[...new Set(schedule.map((s) => s.className))].length}
              </strong></span>
            </div>
          </motion.div>
        )}

        {/* ✅ List view below the grid for full detail */}
        {!isLoading && !error && schedule.length > 0 && (
          <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-secondary/30">
              <p className="text-sm font-semibold text-foreground">Schedule Detail</p>
            </div>
            <div className="divide-y divide-border">
              {schedule.map((s, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-secondary/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <BookOpen className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{s.subject}</p>
                      <p className="text-xs text-muted-foreground">{s.className} · {s.department}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-foreground">{s.day}</p>
                    <p className="text-xs text-muted-foreground">{formatTime(s.startTime)} – {formatTime(s.endTime)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  // ── DETAILS VIEW ───────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 w-fit">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <h2 className="font-display text-lg sm:text-xl font-bold text-foreground">
            {type === "proff" ? "Professor" : type === "principal" ? "Principal" : "Vice Principal"} Details
          </h2>
        </div>
        {isProfessor && (
          <Button size="sm" variant="outline" onClick={() => setShowSchedule(true)} className="gap-1.5 w-fit">
            <Calendar className="h-4 w-4" /> View Schedule
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        {/* Profile header */}
        <div className="flex flex-col sm:flex-row items-center gap-4 px-4 sm:px-6 py-5 border-b border-border bg-secondary/30">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground shrink-0">
            {faculty?.name?.[0]}{faculty?.lastName?.[0]}
          </div>
          <div className="text-center sm:text-left">
            <h3 className="font-display text-lg font-bold text-foreground">
              {faculty?.name} {faculty?.lastName}
            </h3>
            <p className="text-sm text-muted-foreground">
              {type === "proff" ? "Professor" : type === "principal" ? "Principal" : "Vice Principal"}
              {isProfessor && faculty?.department?.code ? ` — ${faculty.department.code}` : ""}
            </p>
            {isProfessor && (
              <span className={`mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                faculty?.isHod ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}>
                {faculty?.isHod ? "Head of Department" : "Faculty Member"}
              </span>
            )}
          </div>
        </div>

        {/* Details grid */}
        <div className="p-4 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {details.map(([label, value]) => (
              <div key={label} className="flex justify-between sm:flex-col gap-1 border-b border-border pb-3 last:border-0 sm:border-0 sm:pb-0">
                <span className="text-xs font-medium text-muted-foreground">{label}</span>
                <span className="text-sm font-medium text-foreground text-right sm:text-left">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default FacultyDetailView;