import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Save, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import ClassService from "@/services/classService";

type AttendanceStatus = "P" | "A" | "L";

interface Props {
  classData: any;
  teacherId: string;
  onBack: () => void;
}

const statusConfig: Record<AttendanceStatus, { label: string; color: string; bg: string }> = {
  P: { label: "Present", color: "text-green-700", bg: "bg-green-100 border-green-300 hover:bg-green-200" },
  A: { label: "Absent", color: "text-destructive", bg: "bg-destructive/10 border-destructive/30 hover:bg-destructive/20" },
  L: { label: "Leave", color: "text-yellow-700", bg: "bg-yellow-100 border-yellow-300 hover:bg-yellow-200" },
};

const AttendanceMarker = ({ classData, teacherId, onBack }: Props) => {
  const students: any[] = classData?.classStudents || [];
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>(() => {
    const initial: Record<string, AttendanceStatus> = {};
    students.forEach((s) => {
      const sid = s?._id || s;
      initial[sid] = "P"; // default present
    });
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const _toggleStatus = (_studentId: string) => {
  };

  const setAllStatus = (status: AttendanceStatus) => {
    const updated: Record<string, AttendanceStatus> = {};
    students.forEach((s) => {
      const sid = s?._id || s;
      updated[sid] = status;
    });
    setAttendance(updated);
    setSaved(false);
  };

  const stats = useMemo(() => {
    const values = Object.values(attendance);
    return {
      present: values.filter((v) => v === "P").length,
      absent: values.filter((v) => v === "A").length,
      leave: values.filter((v) => v === "L").length,
    };
  }, [attendance]);

  const handleSave = async () => {
    if (!date) {
      toast.error("Please select a date");
      return;
    }
    setSaving(true);
    try {
      const attendanceData = Object.entries(attendance).map(([studentId, status]) => ({
        studentId,
        status,
      }));

      const res = await ClassService.markAttendance(classData._id, {
        date,
        teacherId,
        attendance: attendanceData,
      });

      if (res?.statusCode >= 400 || res?.error) {
        toast.error(res?.message ?? "Failed to save attendance");
        return;
      }
      toast.success("Attendance saved successfully");
      setSaved(true);
    } catch {
      toast.error("Network error, please try again");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ChevronLeft className="h-4 w-4" /> Back to Class
      </button>

      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-1 font-display text-xl font-bold text-foreground sm:text-2xl"
      >
        Mark Attendance — {classData?.className}
      </motion.h1>

      {/* Date picker + quick actions */}
      <div className="mt-4 mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-foreground">Date:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => { setDate(e.target.value); setSaved(false); }}
            className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs text-muted-foreground mr-1">Mark all:</span>
          {(["P", "A", "L"] as AttendanceStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setAllStatus(s)}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${statusConfig[s].bg} ${statusConfig[s].color}`}
            >
              {statusConfig[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4 flex flex-wrap gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
          Present: {stats.present}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
          Absent: {stats.absent}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
          Leave: {stats.leave}
        </span>
        <span className="text-xs text-muted-foreground self-center">
          Total: {students.length}
        </span>
      </div>

      {/* Students list */}
      {students.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No students enrolled in this class.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                {["#", "Student ID", "Name", "Status"].map((h) => (
                  <th
                    key={h}
                    className={`px-4 py-3 font-display font-semibold text-foreground ${
                      h === "Status" ? "text-center" : "text-left"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((s: any, i: number) => {
                const sid = s?._id || s;
                const status = attendance[sid] || "P";
                const _config = statusConfig[status];

                return (
                  <motion.tr
                    key={sid}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors"
                  >
                    <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{s?.specialId ?? "—"}</td>
                    <td className="px-4 py-3 text-foreground">{s?.name} {s?.lastName ?? ""}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {(["P", "A", "L"] as AttendanceStatus[]).map((st) => (
                          <button
                            key={st}
                            onClick={() => {
                              setAttendance((prev) => ({ ...prev, [sid]: st }));
                              setSaved(false);
                            }}
                            className={`rounded-md border px-2.5 py-1 text-xs font-bold transition-all ${
                              status === st
                                ? `${statusConfig[st].bg} ${statusConfig[st].color} ring-2 ring-offset-1 ring-current`
                                : "border-border bg-background text-muted-foreground hover:bg-secondary"
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Save button */}
      {students.length > 0 && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
              saved
                ? "bg-green-100 text-green-700 border border-green-300"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {saved ? (
              <><Check className="h-4 w-4" /> Saved</>
            ) : saving ? (
              "Saving..."
            ) : (
              <><Save className="h-4 w-4" /> Save Attendance</>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default AttendanceMarker;
