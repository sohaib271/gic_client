// hooks/useTeacherAttendanceHistory.ts
import { useState, useEffect } from "react";
import { store } from "@/store/store";
import { API } from "@/services/otherService";

export interface AttendanceRecord {
  _id: string;
  type: "check-in" | "check-out";
  currentDate: string;
  gps?: { latitude: number; longitude: number };
  teacherId: { name: string; lastName: string } | string;
}

export const useTeacherAttendanceHistory = (teacherId: string | null) => {
  const [records,   setRecords]   = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!teacherId) { setRecords([]); return; }
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = store.getState().user.token;
        const res   = await fetch(`${API}/teacher/attendance/${teacherId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!cancelled) setRecords(data?.attendanceRecords ?? []);
      } catch {
        if (!cancelled) setError("Failed to load attendance history");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [teacherId]);

  return { records, isLoading, error };
};