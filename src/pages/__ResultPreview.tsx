import ClassResultSheet from "@/components/ClassResultSheet";

/** TEMPORARY preview entry — renders the result sheet with mock class data. */

const MOCK_CLASS = {
  _id: "preview-class-1",
  className: "BS Computer Science (Morning)",
  session: "2025-26",
  class: "III",
  departmentId: { _id: "d1", name: "Computer Science", code: "CS" },
  classStudents: Array.from({ length: 12 }).map((_, i) => ({
    _id: `stu-${i + 1}`,
    specialId: `25-CS-${String(i + 1).padStart(3, "0")}`,
    name: [
      "Ali", "Bilal", "Ahmed", "Fatima", "Usman", "Zainab",
      "Hassan", "Maryam", "Omar", "Ayesha", "Hamza", "Sana",
    ][i],
    lastName: ["Khan", "Raza", "Shah", "Iqbal", "Butt", "Chaudhry"][i % 6],
  })),
};

const __ResultPreview = () => (
  <div className="p-3 sm:p-4 md:p-6 lg:p-8">
    <ClassResultSheet
      classData={MOCK_CLASS}
      departmentId="d1"
      
      onBack={() => window.history.back()}
    />
  </div>
);

export default __ResultPreview;