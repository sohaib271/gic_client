import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronLeft, BookOpen, Building2, Search, Receipt, Plus, Eye, DollarSign, Loader2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { useDepartments } from "@/hooks/useDepartments";
import { useUsers } from "@/hooks/useUsers";
import { useClasses } from "@/hooks/useClasses";
import PaginationControls from "@/components/PaginationControls";
import TableSkeleton from "@/components/TableSkeleton";
import GenerateFeeModal from "@/components/GenerateFeeModal";
import { useSelector } from "react-redux";
import FeeService from "@/services/feeService";
import ClassService from "@/services/classService";

type View = "list" | "classDetail";

const IntermediateFee = () => {
  const user = useSelector((state: any) => state?.user?.user);
  const { data: departments } = useDepartments();
  const { data: classes, refetch, isLoading: classesLoading } = useClasses("intermediate");
  const { data: allUsers } = useUsers("");

  const { interStudents } = useMemo(() => {
    if (!allUsers) return { interStudents: [] };
    return {
      interStudents: allUsers.filter(
        (u: any) => u.role === "student" && u.category === "intermediate",
      ),
    };
  }, [allUsers]);

  // Group classes by department - SAME LOGIC AS IntermediateClasses.tsx
  const classesByDept = useMemo(() => {
    if (!classes) return [];
    const map = new Map<string, { dept: any; classes: any[] }>();
    classes.forEach((cls: any) => {
      const dept = cls.departmentId;
      // Only skip if departmentId is completely missing
      if (!dept?._id) return;
      if (!map.has(dept._id)) map.set(dept._id, { dept, classes: [] });
      map.get(dept._id)!.classes.push(cls);
    });
    return Array.from(map.values());
  }, [classes]);

  // Navigation state
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [view, setView] = useState<View>("list");
  const [selectedClassData, setSelectedClassData] = useState<any>(null);
  const [classPages, setClassPages] = useState<Record<string, number>>({});
  const classPageSize = 6;

  // Student search for fee view
  const [studentSearch, setStudentSearch] = useState("");

  // Generate Fee Modal
  const [showGenerateFee, setShowGenerateFee] = useState(false);
  const [generatingFee, setGeneratingFee] = useState(false);

  // Single Student Generate Fee Modal
  const [openGenerateForStudentId, setOpenGenerateForStudentId] = useState<string | null>(null);

  // Paid status for each student (studentId -> boolean)
  const [paidStatus, setPaidStatus] = useState<Record<string, boolean>>({});
  // Current semester fee records for each student (for quick lookup)
  const [currentSemesterFees, setCurrentSemesterFees] = useState<Record<string, any>>({});

  // Semester selection for each student
  const [studentSemesters, setStudentSemesters] = useState<Record<string, string>>({});

  // Class-level semester filter for fee records
  const [selectedSemester, setSelectedSemester] = useState<string>("");

  // Class selection for each student
  const [studentClasses, setStudentClasses] = useState<Record<string, string>>({});

  // Fee records for the selected class
  const [feeRecords, setFeeRecords] = useState<any[]>([]);
  const [feeLoading, setFeeLoading] = useState(false);

  // Fee Modal State - per-student tracking using student ID
  const [openFeeModalStudentId, setOpenFeeModalStudentId] = useState<string | null>(null);
  // Store the student object for modal display (avoids classStudents timing issues)
  const [openFeeModalStudentObj, setOpenFeeModalStudentObj] = useState<any>(null);

  // Students for the selected class - MUST be before useMemo that references it
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  // Get students from selected class - fetch full student details
  const resolveStudentId = (s: any): string => s?._id ?? s;

  // Get the currently open student object from classStudents
  const selectedStudentForFee = useMemo(() => {
    if (!openFeeModalStudentId) return null;
    return classStudents.find((s: any) => resolveStudentId(s) === openFeeModalStudentId) ?? null;
  }, [openFeeModalStudentId, classStudents]);

  // Fee records per student (keyed by studentId) - NOT shared globally
  const [studentFeeRecordsMap, setStudentFeeRecordsMap] = useState<Record<string, any[]>>({});
  const [loadingStudentFees, setLoadingStudentFees] = useState(false);
  const [updatingFee, setUpdatingFee] = useState<string | null>(null);

  // Current student's records from the map
  const studentFeeRecords = openFeeModalStudentId ? (studentFeeRecordsMap[openFeeModalStudentId] ?? []) : [];

  // Open fee modal and fetch student's fee records
  const openFeeModal = async (student: any) => {
    const studentId = resolveStudentId(student);
    console.log("🔍 [openFeeModal] Starting for student ID:", studentId);
    
    // Store student object directly for modal display (avoids classStudents timing issues)
    setOpenFeeModalStudentObj(student);
    
    // Ensure student is in classStudents for other references
    const existingStudent = classStudents.find((s: any) => resolveStudentId(s) === studentId);
    console.log("🔍 [openFeeModal] Student in classStudents?", !!existingStudent);
    
    if (!existingStudent) {
      console.log("📝 [openFeeModal] Adding student to classStudents:", student);
      setClassStudents((prev) => {
        if (!prev.find((s: any) => resolveStudentId(s) === studentId)) {
          return [...prev, student];
        }
        return prev;
      });
    }
    
    // NOW set the modal state
    console.log("🔵 [openFeeModal] Setting openFeeModalStudentId to:", studentId);
    setOpenFeeModalStudentId(studentId);
    
    // Start loading
    setLoadingStudentFees(true);
    
    // Use setTimeout to ensure state is updated before fetching
    setTimeout(async () => {
      console.log("🔵 [openFeeModal] Fetching fee records...");
      try {
        // Use same endpoint as mobile: /fee/student/:studentId/summary
        const result = await FeeService.getStudentFeeSummary(studentId);
        console.log("📦 [openFeeModal] API result:", result);
        
        // Transform to records array format for the modal
        const pending = result?.pending || [];
        const paid = result?.paid || [];
        const waived = result?.waived || [];
        const allRecords = [...pending, ...paid, ...waived];
        
        console.log("✅ [openFeeModal] Total records for student:", allRecords.length);
        
        // Store in per-student map
        setStudentFeeRecordsMap((prev) => ({ ...prev, [studentId]: allRecords }));
      } catch (err) {
        console.error("❌ [openFeeModal] Failed to fetch student fee records:", err);
        toast.error("Failed to load fee records");
      } finally {
        setLoadingStudentFees(false);
      }
    }, 100);
  };

  // Update fee status - use approve/unapprove APIs
  const updateFeeStatus = async (recordId: string, status: string) => {
    if (!openFeeModalStudentId) return;
    setUpdatingFee(recordId);
    try {
      let res;
      if (status === "paid") {
        // Call approve API when marking as paid
        res = await FeeService.approveFee(recordId);
      } else if (status === "pending") {
        // Call unapprove API when marking as pending
        res = await FeeService.unapproveFee(recordId);
      } else {
        // For waived status, use the regular update
        res = await FeeService.updateFeeStatus(recordId, { status: status as "paid" | "pending" | "waived" });
      }
      
      if (res.statusCode >= 400 || res.error) {
        toast.error(res.message || "Failed to update fee");
        return;
      }
      
      // Update the per-student records map with the new status
      setStudentFeeRecordsMap((prev) => ({
        ...prev,
        [openFeeModalStudentId]: (prev[openFeeModalStudentId] ?? []).map((r) =>
          r._id === recordId ? { ...r, status } : r
        )
      }));
      toast.success(status === "paid" ? "Fee approved and marked as paid" : "Fee marked as pending");
    } catch {
      toast.error("Network error");
    } finally {
      setUpdatingFee(null);
    }
  };

  // Fetch students when entering class detail view
  const fetchClassStudents = async (classId: string) => {
    setStudentsLoading(true);
    try {
      const result = await ClassService.getClassStudents(classId);
      console.log("Class Students API Response:", JSON.stringify(result, null, 2));
      // Backend returns { classStudents: [...] } or just [students]
      if (result?.classStudents && Array.isArray(result.classStudents) && result.classStudents.length > 0) {
        console.log("✅ Setting students from classStudents array:", result.classStudents.length);
        setClassStudents(result.classStudents);
      } else if (Array.isArray(result) && result.length > 0) {
        console.log("✅ Setting students from direct array:", result.length);
        setClassStudents(result);
      } else if (selectedClassData?.classStudents?.length > 0) {
        console.log("⚠️ API empty, using fallback from selectedClassData:", selectedClassData.classStudents.length);
        setClassStudents(selectedClassData.classStudents);
      } else {
        console.warn("⚠️ No students found anywhere:", { apiResult: result, selectedClassDataStudents: selectedClassData?.classStudents });
        setClassStudents([]);
      }
    } catch (err: any) {
      console.error("❌ Failed to fetch class students:", err);
      console.error("Error response:", err?.response?.data);
      if (selectedClassData?.classStudents?.length > 0) {
        console.log("⚠️ Error caught, using fallback:", selectedClassData.classStudents.length);
        setClassStudents(selectedClassData.classStudents);
      } else {
        toast.error(err?.response?.data?.message || "Failed to load students");
        setClassStudents([]);
      }
    } finally {
      setStudentsLoading(false);
    }
  };

  // Fetch fee records when entering class detail view
  const fetchFeeRecords = async (classId: string, semester?: string) => {
    setFeeLoading(true);
    try {
      const result = await FeeService.getFeeRecords({ classId, category: "intermediate", semester });
      if (result?.records) {
        setFeeRecords(result.records);
      } else if (Array.isArray(result)) {
        setFeeRecords(result);
      }
    } catch (err) {
      console.error("Failed to fetch fee records:", err);
    } finally {
      setFeeLoading(false);
    }
  };

  // Fetch CURRENT SEMESTER fee for all students in class
  const fetchCurrentSemesterFees = async (students: any[]) => {
    if (!students || students.length === 0) return;
    
    console.log("🔍 [Intermediate] Fetching current semester fees for students:", students.length);
    
    const newSemesterFees: Record<string, any> = {};
    const newPaidStatus: Record<string, boolean> = {};
    
    await Promise.all(students.map(async (student) => {
      const studentId = resolveStudentId(student);
      const studentClass = student?.class || "I"; // Intermediate uses class field for 1st/2nd year
      
      try {
        // Get fee records for this student
        const result = await FeeService.getFeeRecords({
          studentId,
          classId: selectedClassData?._id,
          category: "intermediate",
        });
        
        const records = result?.records || result || [];
        
        // Find the record for current class - be flexible with matching
        // Priority: match by classId first, then fall back to any matching record
        let currentRecord = records.find((r: any) => 
          r.classId === selectedClassData?._id || 
          r.class === selectedClassData?.class ||
          r.class === studentClass
        );
        
        // If no specific match, just use the first record for this student
        if (!currentRecord && records.length > 0) {
          console.log(`⚠️ [fetchCurrentSemesterFees] No exact match, using first record for ${student?.name}`);
          currentRecord = records[0];
        }
        
        if (currentRecord) {
          console.log(`✅ Found fee record for ${student?.name}:`, currentRecord.status);
          newSemesterFees[studentId] = currentRecord;
          newPaidStatus[studentId] = currentRecord.status === "paid";
        } else {
          console.log(`❌ No fee record for ${student?.name} in class ${selectedClassData?._id}`);
          newSemesterFees[studentId] = null;
          newPaidStatus[studentId] = false;
        }
      } catch (err) {
        console.error(`❌ Failed for ${studentId}:`, err);
        newSemesterFees[studentId] = null;
        newPaidStatus[studentId] = false;
      }
    }));
    
    console.log("📊 Final paidStatus:", newPaidStatus);
    setCurrentSemesterFees(newSemesterFees);
    setPaidStatus(newPaidStatus);
  };

  // Update paid status using approve/unapprove APIs
  const updatePaidStatus = async (studentId: string, newStatus: boolean, studentClass?: string) => {
    console.log(`🔄 [updatePaidStatus] Student: ${studentId}, New Status: ${newStatus}`);
    
    try {
      const currentRecord = currentSemesterFees[studentId];
      
      if (currentRecord) {
        console.log(`✅ Updating fee record:`, currentRecord._id);
        if (newStatus) {
          await FeeService.approveFee(currentRecord._id);
        } else {
          await FeeService.unapproveFee(currentRecord._id);
        }
        setCurrentSemesterFees((prev) => ({
          ...prev,
          [studentId]: { ...prev[studentId], status: newStatus ? "paid" : "pending" }
        }));
      } else {
        console.log(`❌ No fee record found!`);
        toast.error(`No fee record found. Generate fee first!`);
        setPaidStatus((prev) => ({ ...prev, [studentId]: false }));
        return;
      }
      
      setPaidStatus((prev) => ({ ...prev, [studentId]: newStatus }));
      toast.success(newStatus ? "Fee marked as Paid" : "Fee marked as Pending");
    } catch (err) {
      console.error("Failed to update fee status:", err);
      toast.error("Failed to update fee status");
      setPaidStatus((prev) => ({ ...prev, [studentId]: !newStatus }));
    }
  };

  const handleGenerateFee = async (data: any) => {
    setGeneratingFee(true);
    try {
      // Refetch current semester fees for all students
      await fetchCurrentSemesterFees(classStudents);
    } finally {
      setGeneratingFee(false);
    }
  };
  
  const filteredClassStudents = useMemo(() => {
    if (!studentSearch.trim()) return classStudents;
    return classStudents.filter((s: any) => {
      const resolvedId = resolveStudentId(s);
      const student = interStudents.find((st: any) => st._id === resolvedId);
      const searchLower = studentSearch.toLowerCase();
      return (
        s?.name?.toLowerCase().includes(searchLower) ||
        s?.specialId?.toLowerCase().includes(searchLower) ||
        (student?.name?.toLowerCase().includes(searchLower)) ||
        (student?.specialId?.toLowerCase().includes(searchLower))
      );
    });
  }, [classStudents, interStudents, studentSearch]);

  const goBack = () => {
    setView("list");
    setSelectedClassData(null);
    setStudentSearch("");
    setFeeRecords([]);
    setClassStudents([]);
    setCurrentSemesterFees({});
    setPaidStatus({});
  };

  // Fetch students and fee records when class is selected
  useEffect(() => {
    if (view === "classDetail" && selectedClassData?._id) {
      fetchClassStudents(selectedClassData._id);
    }
  }, [view, selectedClassData?._id]);

  // Fetch current semester fees once students are loaded
  useEffect(() => {
    if (view === "classDetail" && classStudents.length > 0) {
      fetchCurrentSemesterFees(classStudents);
    }
  }, [view, classStudents.length]);

  // ── CLASS DETAIL VIEW (Fee per student)
  if (view === "classDetail" && selectedClassData) {
    console.log("🔍 Rendering classDetail view:", {
      selectedClassData,
      classStudentsCount: classStudents.length,
      feeRecordsCount: feeRecords.length,
      loading: studentsLoading || feeLoading,
    });
    return (
      <div>
        <button
          onClick={goBack}
          className="mb-4 flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Classes
        </button>
        
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-1 font-display text-xl font-bold text-foreground sm:text-2xl"
        >
          {selectedClassData.className}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="mb-4 text-sm text-muted-foreground"
        >
          {selectedClassData.class === "I" ? "1st Year" : "2nd Year"} · {selectedClassData.session}
        </motion.p>

        {/* Search */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="Search student by name or ID..."
              className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Students Table */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="overflow-x-auto rounded-xl border border-border bg-card shadow-card"
        >
          {studentsLoading || feeLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading students...</p>
            </div>
          ) : (
          <table className="w-full min-w-[850px]">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                {["S.No", "Student ID", "Name", "Class", "Generate Fee", "Paid", "Status", "Action"].map((h) => (
                  <th
                    key={h}
                    className="p-4 text-left text-sm font-medium text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredClassStudents?.map((s: any, i: number) => (
                <motion.tr
                  key={s._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors"
                >
                  <td className="p-4 text-sm text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </td>
                  <td className="p-4 text-sm font-medium">{s?.specialId}</td>
                  <td className="p-4 text-sm">{s?.name} {s?.lastName}</td>
                  <td className="p-4">
                    <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                      {s?.class === "I" ? "1st Year" : s?.class === "II" ? "2nd Year" : s?.class || "—"}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => {
                        setOpenGenerateForStudentId(resolveStudentId(s));
                      }}
                      className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 hover:bg-blue-200 transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      Generate
                    </button>
                  </td>
                  <td className="p-4">
                    {(() => {
                      const studentId = resolveStudentId(s);
                      const isPaid = !!paidStatus[studentId];
                      const hasFee = currentSemesterFees[studentId] !== null && currentSemesterFees[studentId] !== undefined;
                      return (
                        <>
                          {!hasFee && (
                            <span className="mb-1 block text-xs text-red-500">No fee</span>
                          )}
                          <button
                            onClick={async () => {
                              const newStatus = !isPaid;
                              const studentClass = s?.class || "I";
                              await updatePaidStatus(studentId, newStatus, studentClass);
                            }}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              isPaid ? "bg-green-500" : "bg-gray-300"
                            }`}
                          >
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                                isPaid ? "translate-x-6" : "translate-x-0.5"
                              }`}
                            />
                          </button>
                        </>
                      );
                    })()}
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        paidStatus[resolveStudentId(s)]
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {paidStatus[resolveStudentId(s)] ? "Paid" : "Pending"}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => openFeeModal(s)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-secondary transition-colors"
                    >
                      <Eye className="h-3 w-3" />
                      View
                    </button>
                  </td>
                </motion.tr>
              ))}
              {filteredClassStudents?.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-sm text-muted-foreground">
                    {studentSearch ? "No students match your search" : "No students in this class"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          )}
        </motion.div>

        {/* Generate Fee Modal */}
        <GenerateFeeModal
          isOpen={showGenerateFee}
          onClose={() => setShowGenerateFee(false)}
          students={classStudents}
          className={selectedClassData?.className || ""}
          classId={selectedClassData?._id}
          category="intermediate"
          semester={studentSemesters[resolveStudentId(classStudents[0])] || "1"}
          classes={classes ?? []}
          onGenerate={handleGenerateFee}
          onSuccess={() => {
            if (selectedClassData?._id) {
              fetchFeeRecords(selectedClassData._id);
            }
          }}
        />

        {/* Single Student Generate Fee Modal - Passes student's own classId */}
        {openGenerateForStudentId && (() => {
          const student = classStudents.find((s: any) => resolveStudentId(s) === openGenerateForStudentId);
          return (
            <GenerateFeeModal
              isOpen={true}
              onClose={() => setOpenGenerateForStudentId(null)}
              students={[student].filter(Boolean)}
              className={`${student?.name || "Student"} - ${student?.specialId || ""}`}
              classId={student?.classId || selectedClassData?._id}
              category="intermediate"
              semester={student?.class || "I"}
              classes={classes ?? []}
              singleStudentMode={true}
              onGenerate={handleGenerateFee}
              onSuccess={() => {
                if (selectedClassData?._id) {
                  fetchFeeRecords(selectedClassData._id);
                }
                setOpenGenerateForStudentId(null);
              }}
            />
          );
        })()}
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* FEE DETAIL MODAL - Inside classDetail return, outside the div */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {openFeeModalStudentId && (() => {
        const currentStudent = openFeeModalStudentObj;
        const modalSemester = studentSemesters[openFeeModalStudentId] || "all";
        
        // Filter records by selected semester
        const filteredRecords = modalSemester === "all" 
          ? studentFeeRecords 
          : studentFeeRecords.filter((r: any) => r.semester === modalSemester);
        
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => { setOpenFeeModalStudentId(null); setOpenFeeModalStudentObj(null); }}>
            <div className="flex flex-col w-full max-w-2xl rounded-2xl border border-border bg-card shadow-modal max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
                <div>
                  <h2 className="font-display text-base font-bold text-foreground">Fee Records</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {currentStudent?.name} {currentStudent?.lastName ?? ""} · {currentStudent?.specialId}
                  </p>
                </div>
                <button
                  onClick={() => { setOpenFeeModalStudentId(null); setOpenFeeModalStudentObj(null); }}
                  className="rounded-lg p-1 hover:bg-secondary transition-colors"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              {/* Semester Filter in Modal */}
              <div className="px-6 py-3 border-b border-border bg-secondary/20">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium">Filter by Semester:</label>
                  <select
                    value={modalSemester}
                    onChange={(e) => setStudentSemesters((prev) => ({ ...prev, [openFeeModalStudentId]: e.target.value }))}
                    className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                  >
                    <option value="all">All Semesters</option>
                    <option value="1">Semester 1</option>
                    <option value="2">Semester 2</option>
                    <option value="3">Semester 3</option>
                    <option value="4">Semester 4</option>
                  </select>
                  <span className="text-xs text-muted-foreground">({filteredRecords.length} records)</span>
                </div>
              </div>

              <div className="overflow-y-auto flex-1 px-6 py-4">
                {/* Loading State */}
                {loadingStudentFees && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading fee records...</span>
                  </div>
                )}

                {/* No Records */}
                {!loadingStudentFees && filteredRecords.length === 0 && (
                  <div className="rounded-lg border border-border bg-secondary/30 p-6 text-center">
                    <Receipt className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No fee records found for {modalSemester === "all" ? "any semester" : `Semester ${modalSemester}`}</p>
                  </div>
                )}

                {/* Fee Records List */}
                {!loadingStudentFees && filteredRecords.length > 0 && (
                  <div className="space-y-3">
                    {studentFeeRecords.map((record: any) => (
                      <div key={record._id} className="rounded-lg border border-border bg-secondary/20 p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-foreground capitalize">
                                {record.month} {record.year}
                              </span>
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                                record.status === "paid"
                                  ? "bg-green-100 text-green-800"
                                  : record.status === "waived"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}>
                                {record.status === "paid" ? "Paid" : record.status === "waived" ? "Waived" : "Pending"}
                              </span>
                            </div>
                            {record.description && (
                              <p className="text-xs text-muted-foreground mt-1">{record.description}</p>
                            )}
                          </div>
                          <span className="text-lg font-bold text-foreground">
                            PKR {record.amount?.toLocaleString()}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Due Date:</span>
                            <span>{record.dueDate ? new Date(record.dueDate).toLocaleDateString("en-GB") : "—"}</span>
                          </div>
                          {record.paidDate && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Paid Date:</span>
                              <span className="text-green-700">{new Date(record.paidDate).toLocaleDateString("en-GB")}</span>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2 border-t border-border">
                          {record.status !== "paid" && (
                            <button
                              onClick={() => updateFeeStatus(record._id, "paid")}
                              disabled={updatingFee === record._id}
                              className="flex-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                            >
                              {updatingFee === record._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                              Mark Paid
                            </button>
                          )}
                          {record.status !== "waived" && (
                            <button
                              onClick={() => updateFeeStatus(record._id, "waived")}
                              disabled={updatingFee === record._id}
                              className="flex-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                            >
                              {updatingFee === record._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <DollarSign className="h-3 w-3" />}
                              Mark Waived
                            </button>
                          )}
                          {record.status !== "pending" && (
                            <button
                              onClick={() => updateFeeStatus(record._id, "pending")}
                              disabled={updatingFee === record._id}
                              className="flex-1 rounded-lg bg-yellow-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-yellow-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                            >
                              {updatingFee === record._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <DollarSign className="h-3 w-3" />}
                              Mark Pending
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-border shrink-0">
                <button
                  onClick={() => { setOpenFeeModalStudentId(null); setOpenFeeModalStudentObj(null); }}
                  className="w-full py-2 border rounded-lg text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    );
  }

  // ── MAIN LIST VIEW
  return (
    <div>
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-1 font-display text-xl font-bold text-foreground sm:text-2xl"
      >
        Intermediate Fee
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-6 text-sm text-muted-foreground"
      >
        {classesByDept?.length}{" "}
        {classesByDept?.length === 1 ? "Department" : "Departments"} ·{" "}
        {classes?.length ?? 0} Total Classes
      </motion.p>

      {/* Classes grouped by department */}
      <div className="space-y-3">
        {classesLoading && (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Loading classes...
          </div>
        )}

        {!classesLoading && classesByDept?.length === 0 && classes?.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No classes found. Create classes first to manage their fees.
          </div>
        )}

        {/* If no department grouping but classes exist, show them directly */}
        {!classesLoading && classesByDept?.length === 0 && classes && classes.length > 0 && (
          <div className="space-y-2">
            {classes.map((cls: any, i: number) => (
              <motion.div
                key={cls._id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                onClick={() => {
                  setSelectedClassData(cls);
                  setView("classDetail");
                }}
                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 cursor-pointer hover:bg-secondary transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{cls.className}</p>
                    <p className="text-xs text-muted-foreground">
                      {cls.class === "I" ? "1st Year" : "2nd Year"} · {cls.session}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium text-primary">View Fee →</span>
              </motion.div>
            ))}
          </div>
        )}

        {classesByDept?.map(({ dept, classes: deptClasses }, i) => {
          const page = classPages[dept._id] ?? 1;
          const pageClasses = deptClasses.slice((page - 1) * classPageSize, page * classPageSize);
          return (
            <motion.div
              key={dept._id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="rounded-xl border border-border bg-card shadow-card overflow-hidden"
            >
              {/* Department header */}
              <button
                onClick={() =>
                  setExpandedDept(expandedDept === dept._id ? null : dept._id)
                }
                className="flex w-full items-center justify-between p-4 text-left hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-bold text-foreground">
                      {dept.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {dept?.code} · {deptClasses?.length}{" "}
                      {deptClasses?.length === 1 ? "class" : "classes"}
                    </p>
                  </div>
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-muted-foreground transition-transform ${expandedDept === dept._id ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {expandedDept === dept._id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-border px-4 py-3 space-y-2">
                      {pageClasses.length === 0 ? (
                        <div className="text-center py-4 text-sm text-muted-foreground">
                          No classes in this department yet
                        </div>
                      ) : (
                        pageClasses.map((cls: any) => (
                          <div
                            key={cls._id}
                            onClick={() => {
                              setSelectedClassData(cls);
                              setView("classDetail");
                            }}
                            className="flex items-center justify-between gap-2 rounded-lg bg-secondary/50 px-4 py-3 cursor-pointer hover:bg-secondary transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 shrink-0">
                                <BookOpen className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  {cls.className}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {cls.class === "I" ? "1st Year" : "2nd Year"} · {cls.session}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                              <div className="text-right hidden sm:block">
                                <p className="text-xs text-muted-foreground">
                                  {cls.classStudents?.length ?? 0} students
                                </p>
                              </div>
                              <span className="text-xs font-medium text-primary">
                                View Fee →
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <PaginationControls
                      page={page}
                      pageSize={classPageSize}
                      total={deptClasses.length}
                      onPageChange={(nextPage) =>
                        setClassPages((current) => ({ ...current, [dept._id]: nextPage }))
                      }
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    );
  }

  // ── MAIN LIST VIEW
  return (
    <div>
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-1 font-display text-xl font-bold text-foreground sm:text-2xl"
      >
        Intermediate Fee
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-6 text-sm text-muted-foreground"
      >
        {classesByDept?.length}{" "}
        {classesByDept?.length === 1 ? "Department" : "Departments"} ·{" "}
        {classes?.length ?? 0} Total Classes
      </motion.p>

      {/* Classes grouped by department */}
      <div className="space-y-3">
        {classesLoading && (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Loading classes...
          </div>
        )}

        {!classesLoading && classesByDept?.length === 0 && classes?.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No classes found. Create classes first to manage their fees.
          </div>
        )}

        {/* If no department grouping but classes exist, show them directly */}
        {!classesLoading && classesByDept?.length === 0 && classes && classes.length > 0 && (
          <div className="space-y-2">
            {classes.map((cls: any, i: number) => (
              <motion.div
                key={cls._id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                onClick={() => {
                  setSelectedClassData(cls);
                  setView("classDetail");
                }}
                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 cursor-pointer hover:bg-secondary transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{cls.className}</p>
                    <p className="text-xs text-muted-foreground">
                      {cls.class === "I" ? "1st Year" : "2nd Year"} · {cls.session}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium text-primary">View Fee →</span>
              </motion.div>
            ))}
          </div>
        )}

        {classesByDept?.map(({ dept, classes: deptClasses }, i) => {
          const page = classPages[dept._id] ?? 1;
          const pageClasses = deptClasses.slice((page - 1) * classPageSize, page * classPageSize);
          return (
            <motion.div
              key={dept._id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="rounded-xl border border-border bg-card shadow-card overflow-hidden"
            >
              {/* Department header */}
              <button
                onClick={() =>
                  setExpandedDept(expandedDept === dept._id ? null : dept._id)
                }
                className="flex w-full items-center justify-between p-4 text-left hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-bold text-foreground">
                      {dept.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {dept?.code} · {deptClasses?.length}{" "}
                      {deptClasses?.length === 1 ? "class" : "classes"}
                    </p>
                  </div>
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-muted-foreground transition-transform ${expandedDept === dept._id ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {expandedDept === dept._id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-border px-4 py-3 space-y-2">
                      {pageClasses.length === 0 ? (
                        <div className="text-center py-4 text-sm text-muted-foreground">
                          No classes in this department yet
                        </div>
                      ) : (
                        pageClasses.map((cls: any) => (
                          <div
                            key={cls._id}
                            onClick={() => {
                              setSelectedClassData(cls);
                              setView("classDetail");
                            }}
                            className="flex items-center justify-between gap-2 rounded-lg bg-secondary/50 px-4 py-3 cursor-pointer hover:bg-secondary transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 shrink-0">
                                <BookOpen className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  {cls.className}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {cls.class === "I" ? "1st Year" : "2nd Year"} · {cls.session}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                              <div className="text-right hidden sm:block">
                                <p className="text-xs text-muted-foreground">
                                  {cls.classStudents?.length ?? 0} students
                                </p>
                              </div>
                              <span className="text-xs font-medium text-primary">
                                View Fee →
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <PaginationControls
                      page={page}
                      pageSize={classPageSize}
                      total={deptClasses.length}
                      onPageChange={(nextPage) =>
                        setClassPages((current) => ({ ...current, [dept._id]: nextPage }))
                      }
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default IntermediateFee;
