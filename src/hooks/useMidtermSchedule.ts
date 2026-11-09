import { useMutation, useQuery } from "@tanstack/react-query";
import MidtermService, { type MidtermPaper } from "@/services/midtermService";

/** A schedule row plus a stable React key. */
export type MidtermRow = MidtermPaper & { key: number };

let rowSeq = 0;
const nextKey = () => (rowSeq += 1);

/** A blank row, matching the defaults the table shows. */
export const newMidtermRow = (): MidtermRow => ({
  key: nextKey(),
  paper: "",
  day: "Monday",
  date: "",
  start: "09:00",
  end: "11:00",
});

/** Server row -> editable row (tolerates a partial payload). */
export const toMidtermRow = (paper: Partial<MidtermPaper>): MidtermRow => ({
  key: nextKey(),
  paper: paper.paper ?? "",
  day: paper.day ?? "Monday",
  date: paper.date ?? "",
  start: paper.start ?? "09:00",
  end: paper.end ?? "11:00",
});

/** True when a response is a NestJS error payload rather than a schedule. */
export const isApiError = (res: any): boolean =>
  Boolean(res) && typeof res === "object" && typeof res.statusCode === "number";

/** Flatten a NestJS error payload into a single readable sentence. */
export const apiErrorMessage = (res: any, fallback: string): string => {
  const message = res?.message;
  if (Array.isArray(message)) return message.join(", ");
  if (typeof message === "string" && message.trim()) return message;
  return fallback;
};

export const useMidtermSchedule = (classId?: string) => {
  return useQuery({
    queryKey: ["midterm-schedule", classId ?? ""],
    queryFn: () => MidtermService.getSchedule(classId as string),
    enabled: Boolean(classId),
    retry: false,
  });
};

export const useSaveMidtermSchedule = () =>
  useMutation({
    mutationFn: (vars: { classId: string; papers: MidtermPaper[]; notify?: boolean }) =>
      MidtermService.saveSchedule(vars.classId, vars.papers, vars.notify ?? true),
  });

export const useClearMidtermSchedule = () =>
  useMutation({
    mutationFn: (vars: { classId: string }) =>
      MidtermService.clearSchedule(vars.classId),
  });
