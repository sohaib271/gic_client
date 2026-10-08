/**
 * Result grading rules shared by the marks form and the class result sheet.
 *
 * Kept in one place so the letter grade shown on a student's row can never
 * disagree with the one shown inside their form: both read from here.
 */

export interface SubjectMark {
  /** Set when the row came from GET /subjects; null for a manually typed subject. */
  subjectId?: string | null;
  name: string;
  /** Obtained / maximum marks for the theory paper. */
  theoretical: number;
  maxTheoretical: number;
  /** Practical is optional — many subjects have no separate practical. */
  practical: number;
  maxPractical: number;
}

export const EXAM_TYPES = [
  { label: "Midterm", value: "midterm" },
  { label: "Sessional", value: "sessional" },
  { label: "Final", value: "final" },
  { label: "Assignment", value: "assignment" },
] as const;

export const DEFAULT_MAX_THEORETICAL = 20;
export const DEFAULT_MAX_PRACTICAL = 10;

/** Grade bands, highest threshold first. `min` is inclusive. */
export const GRADE_SCALE = [
  { letter: "A", min: 85, points: 4.0, tone: "emerald" },
  { letter: "B", min: 70, points: 3.0, tone: "sky" },
  { letter: "C", min: 60, points: 2.0, tone: "amber" },
  { letter: "D", min: 50, points: 1.0, tone: "orange" },
  { letter: "F", min: 0, points: 0.0, tone: "red" },
] as const;

export type GradeTone = (typeof GRADE_SCALE)[number]["tone"];

export interface Grade {
  letter: string;
  points: number;
  tone: GradeTone;
  isPass: boolean;
}

export const PASS_PERCENTAGE = 50;

export const gradeFor = (percentage: number): Grade => {
  const safe = Number.isFinite(percentage) ? percentage : 0;
  const band =
    GRADE_SCALE.find((g) => safe >= g.min) ?? GRADE_SCALE[GRADE_SCALE.length - 1];

  return {
    letter: band.letter,
    points: band.points,
    tone: band.tone,
    isPass: safe >= PASS_PERCENTAGE,
  };
};

/** Tailwind classes per tone, so a grade badge looks the same everywhere. */
export const GRADE_TONE_CLASS: Record<GradeTone, string> = {
  emerald: "bg-emerald-100 text-emerald-800",
  sky: "bg-sky-100 text-sky-800",
  amber: "bg-amber-100 text-amber-800",
  orange: "bg-orange-100 text-orange-800",
  red: "bg-red-100 text-red-800",
};

export const STATUS_TONE_CLASS: Record<string, string> = {
  draft: "bg-amber-100 text-amber-800",
  published: "bg-emerald-100 text-emerald-800",
};

export const subjectTotal = (s: SubjectMark) => s.theoretical + s.practical;
export const subjectMaximum = (s: SubjectMark) =>
  s.maxTheoretical + s.maxPractical;

export interface ResultTotals {
  obtained: number;
  maximum: number;
  percentage: number;
  grade: Grade;
  /** Mean of per-subject grade points — the GPA shown to the student. */
  gpa: number;
  entered: number;
  subjectCount: number;
}

/**
 * Rolls a subject list up into the numbers shown at the bottom of the form and
 * in the class result table.
 *
 * `entered` counts rows that actually have marks typed in, so an empty form
 * reports 0% rather than dividing by zero and rendering "NaN" in the UI.
 */
export const totalsOf = (subjects: SubjectMark[]): ResultTotals => {
  const withMarks = subjects.filter((s) => s.name.trim() !== "");
  const scored = withMarks.filter(
    (s) => subjectTotal(s) > 0 || subjectMaximum(s) > 0,
  );

  const obtained = scored.reduce((sum, s) => sum + subjectTotal(s), 0);
  const maximum = scored.reduce((sum, s) => sum + subjectMaximum(s), 0);
  const percentage = maximum > 0 ? (obtained / maximum) * 100 : 0;

  // GPA averages only the subjects that were actually scored — an unscored
  // row must not drag the average down to zero.
  const gpa =
    scored.length > 0
      ? scored.reduce((sum, s) => {
          const pct =
            subjectMaximum(s) > 0
              ? (subjectTotal(s) / subjectMaximum(s)) * 100
              : 0;
          return sum + gradeFor(pct).points;
        }, 0) / scored.length
      : 0;

  return {
    obtained,
    maximum,
    percentage: Math.round(percentage * 100) / 100,
    grade: gradeFor(percentage),
    gpa: Math.round(gpa * 100) / 100,
    entered: scored.length,
    subjectCount: withMarks.length,
  };
};

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** A blank row for the "Add subject" button. */
export const blankSubject = (
  subject?: { _id?: string; name?: string } | null,
): SubjectMark => ({
  subjectId: subject?._id ?? null,
  name: subject?.name ?? "",
  theoretical: 0,
  maxTheoretical: DEFAULT_MAX_THEORETICAL,
  practical: 0,
  maxPractical: DEFAULT_MAX_PRACTICAL,
});