// ProfessorDashboard.tsx
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import { Check, Clock, GraduationCap, History, QrCode } from "lucide-react";
import FacultyDetailView from "@/components/FacultyDetailView";
import { useMemo, useState } from "react";
import QRScanner from "@/components/QRScanner";
import { useTeacherAttendanceHistory } from "@/hooks/useTeacherAttendance";
import PaginationControls from "@/components/PaginationControls";
import { usePagination } from "@/hooks/usePagination";

const ProfessorDashboard = () => {
  const user = useSelector((state: any) => state?.user.user);
  const [showScanner, setShowScanner] = useState(false);
  const { records: attendanceRecords, isLoading: attendanceLoading } =
    useTeacherAttendanceHistory(user?._id ?? null);
  const attendanceDays = useMemo(() => {
    const grouped: Record<string, typeof attendanceRecords> = {};
    attendanceRecords.forEach((record) => {
      if (!record?.currentDate) return;
      const dateKey = new Date(record.currentDate).toISOString().split("T")[0];
      grouped[dateKey] = grouped[dateKey] ?? [];
      grouped[dateKey].push(record);
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, dayRecords]) => ({ date, dayRecords }));
  }, [attendanceRecords]);
  const attendancePagination = usePagination(attendanceDays, 8);

  // ✅ Guard — user not yet in store (e.g. first load before persist kicks in)
  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // ✅ Guard — user exists but is not a professor
  if (user.role !== "proff") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Access denied.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:p-6"
    >
      
        
        <button onClick={() => setShowScanner(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow transition-colors">
          <QrCode className="h-4 w-4" />
          Scan QR
        </button>
    
      <FacultyDetailView
        faculty={user}
        type="proff"
        onBack={() => {}}
        autoShowSchedule
      />

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="flex items-center gap-2 border-b border-border bg-secondary/20 px-5 py-4">
          <History className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-bold text-foreground">My Attendance History</h2>
        </div>

        {attendanceLoading && (
          <div className="space-y-2 p-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg border border-border bg-card" />
            ))}
          </div>
        )}

        {!attendanceLoading && attendanceDays.length === 0 && (
          <div className="flex flex-col items-center justify-center p-10 text-center">
            <History className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No attendance records found.</p>
          </div>
        )}

        {!attendanceLoading && attendanceDays.length > 0 && (
            <div>
              <div className="divide-y divide-border">
              {attendancePagination.pageItems
                .map(({ date, dayRecords }) => {
                  const checkIn = dayRecords.find((record) => record.type === "check-in");
                  const checkOut = dayRecords.find((record) => record.type === "check-out");
                  return (
                    <div key={date} className="px-5 py-3 transition-colors hover:bg-secondary/20">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-medium text-foreground">
                          {new Date(date).toLocaleDateString("en-GB", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                        <div className="flex flex-wrap items-center gap-3">
                          {checkIn ? (
                            <span className="flex items-center gap-1 rounded-full border border-green-200 bg-green-100 px-2.5 py-0.5 text-xs text-green-700">
                              <Check className="h-3 w-3" />
                              In {new Date(checkIn.currentDate).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          ) : (
                            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground/50">
                              No check-in
                            </span>
                          )}
                          {checkOut ? (
                            <span className="flex items-center gap-1 rounded-full border border-blue-200 bg-blue-100 px-2.5 py-0.5 text-xs text-blue-700">
                              <Clock className="h-3 w-3" />
                              Out {new Date(checkOut.currentDate).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          ) : (
                            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground/50">
                              No check-out
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <PaginationControls
                page={attendancePagination.page}
                pageSize={attendancePagination.pageSize}
                total={attendancePagination.total}
                onPageChange={attendancePagination.setPage}
              />
            </div>
        )}
      </div>
       {showScanner && <QRScanner onClose={() => setShowScanner(false)} />}
    </motion.div>
  );
};

export default ProfessorDashboard;
