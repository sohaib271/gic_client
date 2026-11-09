import { API } from "./otherService";
import type { SubjectMark } from "@/lib/grading";
import { blankSubject, totalsOf, round2 } from "@/lib/grading";

/**
 * Result / score API.
 *
 * The NestJS `result` module is not written yet, so every call here falls back
 * to an in-memory demo store while DEMO_MODE is on. Flip it to false once the
 * backend routes exist — no component changes needed, they already go through
 * this service.
 */
const DEMO_MODE = true;

export interface ResultRecord {
  _id: string;
  classId: string;
  studentId: string;
  examType: string;
  session: string;
  status: "draft" | "published";
  subjects: SubjectMark[];
  updatedAt?: string;
}

export interface ClassResultRow {
  studentId: string;
  specialId: string;
  name: string;
  lastName?: string;
  obtained: number;
  maximum: number;
  percentage: number;
  grade: string;
  gpa: number;
  isPass: boolean;
  status: "draft" | "published" | "not-entered";
  subjectCount: number;
}

export interface ClassResultSheet {
  classId: string;
  summary: {
    students: number;
    entered: number;
    published: number;
    passed: number;
    failed: number;
    averagePercentage: number;
    highestPercentage: number;
    lowestPercentage: number;
    passPercentage: number;
  };
  rows: ClassResultRow[];
}

export interface SaveResultPayload {
  classId: string;
  studentId: string;
  examType: string;
  session: string;
  subjects: SubjectMark[];
}

export interface PublishResultPayload {
  classId: string;
  examType: string;
  session: string;
}

const authHeaders = () => ({ "Content-Type": "application/json" });

const post = async (path: string, body?: unknown) => {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: authHeaders(),
    credentials: "include",
    body: JSON.stringify(body ?? {}),
  });
  return res.json();
};

const get = async (path: string) => {
  const res = await fetch(`${API}${path}`, {
    method: "GET",
    headers: authHeaders(),
    credentials: "include",
  });
  return res.json();
};

const patch = async (path: string, body: unknown) => {
  const res = await fetch(`${API}${path}`, {
    method: "PATCH",
    headers: authHeaders(),
    credentials: "include",
    body: JSON.stringify(body),
  });
  return res.json();
};

/* ─────────────────────────── demo store ─────────────────────────── */
/** Survives navigation within a session, so edits are not lost on back/forward. */
const demoStore = new Map<string, ResultRecord>();
const DEMO_LATENCY_MS = 220;

const keyOf = (classId: string, studentId: string, examType: string) =>
  `${classId}::${studentId}::${examType}`;

const demoDelay = <T,>(value: T): Promise<T> =>
  new Promise((resolve) =>
    setTimeout(() => resolve(value), DEMO_LATENCY_MS),
  );

/**
 * Fills the first few students with plausible marks so the sheet and the form
 * both have something to render. The rest stay empty on purpose — that is the
 * "not entered yet" state the table has to handle.
 */
const seedDemoRecords = (
  classId: string,
  students: any[],
  examType: string,
  session: string,
) => {
  const SEEDED = 4;
  students.slice(0, SEEDED).forEach((student, index) => {
    const id = resolveId(student);
    if (!id || demoStore.has(keyOf(classId, id, examType))) return;

    const names = ["English", "Computer Science", "Mathematics", "Physics"];
    const subjects: SubjectMark[] = names.map((name, i) => {
      const maxTheoretical = 20;
      const maxPractical = 10;
      // Vary the numbers so the sheet shows a spread of grades.
      const theoretical = Math.max(
        0,
        Math.min(maxTheoretical, 15 - index * 2 + i),
      );
      const practical = Math.max(
        0,
        Math.min(maxPractical, 8 - index + (i % 2)),
      );
      return {
        subjectId: null,
        name,
        theoretical,
        maxTheoretical,
        practical,
        maxPractical,
      };
    });

    demoStore.set(keyOf(classId, id, examType), {
      _id: `demo_${classId}_${id}_${examType}`,
      classId,
      studentId: id,
      examType,
      session,
      status: index === 0 ? "published" : "draft",
      subjects,
      updatedAt: new Date().toISOString(),
    });
  });
};

/** Class students arrive either as ObjectIds or populated objects. */
const resolveId = (student: any): string => {
  const raw = student?._id ?? student?.userId ?? student;
  return raw?._id ? String(raw._id) : raw ? String(raw) : "";
};

const studentName = (student: any) =>
  [student?.name, student?.lastName].filter(Boolean).join(" ") || "Unnamed";

const buildDemoSheet = (
  classId: string,
  students: any[],
  examType: string,
  session: string,
): ClassResultSheet => {
  seedDemoRecords(classId, students, examType, session);

  const rows: ClassResultRow[] = students.map((student) => {
    const id = resolveId(student);
    const record = demoStore.get(keyOf(classId, id, examType));
    const totals = totalsOf(record?.subjects ?? []);

    return {
      studentId: id,
      specialId: student?.specialId ?? "—",
      name: student?.name ?? "",
      lastName: student?.lastName,
      obtained: totals.obtained,
      maximum: totals.maximum,
      percentage: totals.percentage,
      grade: record ? totals.grade.letter : "—",
      gpa: totals.gpa,
      isPass: record ? totals.grade.isPass : true,
      status: record?.status ?? "not-entered",
      subjectCount: totals.subjectCount,
    };
  });

  const scored = rows.filter((r) => r.status !== "not-entered");
  const percentages = scored.map((r) => r.percentage);
  const passed = scored.filter((r) => r.isPass).length;

  return {
    classId,
    summary: {
      students: rows.length,
      entered: scored.length,
      published: rows.filter((r) => r.status === "published").length,
      passed,
      failed: scored.length - passed,
      averagePercentage:
        percentages.length > 0
          ? round2(
              percentages.reduce((s, p) => s + p, 0) / percentages.length,
            )
          : 0,
      highestPercentage: percentages.length ? Math.max(...percentages) : 0,
      lowestPercentage: percentages.length ? Math.min(...percentages) : 0,
      passPercentage:
        scored.length > 0 ? round2((passed / scored.length) * 100) : 0,
    },
    rows,
  };
};

/* ─────────────────────────── public API ─────────────────────────── */

export const ResultService = {
  /** Whole class on one call — backs the result sheet table. */
  async getClassSheet(
    classId: string,
    examType: string,
    session: string,
    students: any[],
  ): Promise<ClassResultSheet> {
    if (!DEMO_MODE) {
      return get(
        `/result/class/${classId}?examType=${examType}&session=${encodeURIComponent(session)}`,
      );
    }
    return demoDelay(buildDemoSheet(classId, students, examType, session));
  },

  /** One student's saved result, or null when nothing has been entered yet. */
  async getOne(
    classId: string,
    studentId: string,
    examType: string,
  ): Promise<ResultRecord | null> {
    if (!DEMO_MODE) {
      return get(`/result/student/${studentId}?classId=${classId}&examType=${examType}`);
    }
    return demoDelay(demoStore.get(keyOf(classId, studentId, examType)) ?? null);
  },

  /** All subjects of a class, for the "add subject" picker. */
  async getSubjects(department?: string): Promise<any[]> {
    if (!DEMO_MODE) {
      return get(`/subjects${department ? `?department=${department}` : ""}`);
    }
    return demoDelay([
      { _id: "s1", name: "English" },
      { _id: "s2", name: "Computer Science" },
      { _id: "s3", name: "Mathematics" },
      { _id: "s4", name: "Physics" },
      { _id: "s5", name: "Islamiyat" },
      { _id: "s6", name: "Pakistan Studies" },
    ]);
  },

  async save(payload: SaveResultPayload): Promise<ResultRecord> {
    if (!DEMO_MODE) return post("/result/marks", payload);

    const record: ResultRecord = {
      _id: `demo_${payload.studentId}_${payload.examType}`,
      classId: payload.classId,
      studentId: payload.studentId,
      examType: payload.examType,
      session: payload.session,
      // Re-saving a published result must not silently un-publish it.
      status:
        demoStore.get(keyOf(payload.classId, payload.studentId, payload.examType))
          ?.status ?? "draft",
      subjects: payload.subjects,
      updatedAt: new Date().toISOString(),
    };
    demoStore.set(
      keyOf(payload.classId, payload.studentId, payload.examType),
      record,
    );
    return demoDelay(record);
  },

  /** Publishes every entered result of the class in one go. */
  async publish(payload: PublishResultPayload): Promise<{ published: number }> {
    if (!DEMO_MODE) return post(`/result/publish/${payload.classId}`, payload);

    let published = 0;
    demoStore.forEach((record, key) => {
      const [classId, , examType] = key.split("::");
      const matches =
        classId === payload.classId &&
        examType === payload.examType &&
        record.session === payload.session;
      if (!matches) return;
      record.status = "published";
      published += 1;
    });
    return demoDelay({ published });
  },

  /** Pulls a student back to draft so a published result can be corrected. */
  async unpublish(classId: string, studentId: string, examType: string) {
    if (!DEMO_MODE) return patch(`/result/unpublish/${classId}/${studentId}`, { examType });

    const record = demoStore.get(keyOf(classId, studentId, examType));
    if (record) record.status = "draft";
    return demoDelay({ status: "draft" });
  },

  blankSubject,
};