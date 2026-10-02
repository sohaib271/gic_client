export type StudentProgram = "intermediate" | "bs" | "adp";

/**
 * Resolves which program a student belongs to.
 *
 * Many older student records were created without their own `category` field
 * (e.g. seeded data, bulk upload, older HOD/registration flows), so filtering
 * purely on `student.category === "bs"` silently drops them. The student's
 * department always carries a category, so we fall back to that.
 *
 * Note: when the student has no `category` of their own, BS/ADP department
 * students are assumed to be "bs" — only an explicit `category: "adp"` on the
 * student record puts them in the ADP tab.
 */
export const getStudentProgram = (student: any): StudentProgram | null => {
  const own = student?.category;
  if (own === "intermediate" || own === "bs" || own === "adp") return own;

  const deptCategory = student?.department?.category;
  if (deptCategory === "intermediate") return "intermediate";
  if (deptCategory === "bs_adp" || deptCategory === "bs" || deptCategory === "adp") return "bs";

  return null;
};

export const isIntermediateStudent = (student: any) => getStudentProgram(student) === "intermediate";

export const isBsStudent = (student: any) => getStudentProgram(student) === "bs";

export const isAdpStudent = (student: any) => getStudentProgram(student) === "adp";

export const isBsAdpStudent = (student: any) => {
  const program = getStudentProgram(student);
  return program === "bs" || program === "adp";
};
