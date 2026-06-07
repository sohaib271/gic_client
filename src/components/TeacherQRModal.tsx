// components/TeacherQRModal.tsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RefreshCw, Clock } from "lucide-react";
import TeacherAttendanceService from "@/services/teacherAttendanceService";

interface Props {
  teacher: any;
  onClose: () => void;
}

const TeacherQRModal = ({ teacher, onClose }: Props) => {
  const [qrDataUrl,  setQrDataUrl]  = useState<string | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [countdown,  setCountdown]  = useState(300); // 5 min in seconds
  const teacherId = teacher?._id ?? teacher?.id;

  const fetchQR = async () => {
    setLoading(true);
    setError(null);
    setCountdown(300);
    try {
      if (!teacherId) {
        setError("Professor ID is missing");
        return;
      }
      const res = await TeacherAttendanceService.getTeacherQR(teacherId);
      if (!res.success) { setError(res?.message ?? "Failed to generate QR"); return; }
      setQrDataUrl(res.qrDataUrl);
    } catch (err: any) {
      setError(err?.message ?? "Network error generating QR");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQR(); }, [teacherId]);

  // ── Countdown timer
  useEffect(() => {
    if (!qrDataUrl) return;
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { fetchQR(); return 300; } // auto-refresh when expired
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [qrDataUrl]);

  const mins = String(Math.floor(countdown / 60)).padStart(2, "0");
  const secs = String(countdown % 60).padStart(2, "0");

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-modal p-6">

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-base font-bold text-foreground">Attendance QR</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {teacher.name} {teacher.lastName}
              </p>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* QR Display */}
          <div className="flex flex-col items-center gap-4">
            {loading && (
              <div className="h-52 w-52 rounded-xl border border-border bg-secondary/30 flex items-center justify-center animate-pulse">
                <p className="text-xs text-muted-foreground">Generating...</p>
              </div>
            )}

            {error && !loading && (
              <div className="h-52 w-52 rounded-xl border border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center gap-2">
                <p className="text-xs text-destructive text-center px-4">{error}</p>
                <button onClick={fetchQR} className="text-xs text-primary underline">Retry</button>
              </div>
            )}

            {qrDataUrl && !loading && (
              <>
                <div className="rounded-xl border-2 border-primary/20 p-3 bg-white">
                  <img src={qrDataUrl} alt="Teacher QR Code" className="h-48 w-48" />
                </div>

                {/* Countdown */}
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className={`font-mono font-semibold ${countdown <= 60 ? "text-destructive" : "text-foreground"}`}>
                    {mins}:{secs}
                  </span>
                  <span className="text-xs text-muted-foreground">until refresh</span>
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  Professor scans this QR to mark attendance
                </p>
              </>
            )}

            {/* Manual refresh */}
            <button onClick={fetchQR} disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-50">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Regenerate QR
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TeacherQRModal;
