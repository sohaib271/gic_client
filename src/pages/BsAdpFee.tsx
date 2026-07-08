import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronLeft, BookOpen, Building2, Search, Plus, Eye, DollarSign, Loader2, X, Check, Receipt } from "lucide-react";
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

const BsAdpFee = () => {
  const user = useSelector((state: any) => state?.user?.user);
  const { data: departments } = useDepartments();
  const { data: classes, refetch, isLoading: classesLoading } = useClasses("bs");
  const { data: allUsers } = useUsers("");

  const { bsStudents } = useMemo(() => {
    if (!allUsers) return { bsStudents: [] };
    return {
      bsStudents: allUsers.filter(
        (u: any) => u.role === "student" && (u.category === "bs" || u.category === "adp"),
      ),
    };
  }, [allUsers]);

  // Group classes by department - SAME LOGIC AS BsAdpClasses.tsx
  const classesByDept = useMemo(() => {
    if (!classes) return [];
    const map = new Map<string, { dept: any; classes: any[] }>();
    classes.forEach((cls: any) => {
      const dept = cls.departmentId;
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

  // Generate Fee Modal - global (for bulk, keeping for potential use)
  const [showGenerateFee, setShowGenerateFee] = useState(false);
  const [generatingFee, setGeneratingFee] = useState(false);

  // Single Student Generate Fee Modal
  const [openGenerateForStudentId, setOpenGenerateForStudentId] = useState<string | null>(null);

  // Paid status for each student (studentId -> boolean) - based on CURRENT semester
  const [paidStatus, setPaidStatus] = useState<Record<string, boolean>>({});
  
  // Current semester fee records for each student (for quick lookup)
  const [currentSemesterFees, setCurrentSemesterFees] = useState<Record<string, any>>({});

  // Semester selection for each student
  const [studentSemesters, setStudentSemesters] = useState<Record<string, string>>({});

  // Class-level semester filter for fee records
  const [selectedSemester, setSelectedSemester] = useState<string>("");

  // Program selection for each student
  const [studentPrograms, setStudentPrograms] = useState<Record<string, string>>({});

  // Fee records for the selected class
  const [feeRecords, setFeeRecords] = useState<any[]>([]);
  const [feeLoading, setFeeLoading] = useState(false);

  // Fee Modal State - per-student tracking using student ID
  const [openFeeModalStudentId, setOpenFeeModalStudentId] = useState<string | null>(null);

  // Students for the selected class - MUST be before useMemo that references it
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  // Get students for selected class - normalize to handle both string IDs and objects
  const resolveId = (s: any): string => s?._id ?? s;

  // Get the currently open student object from classStudents
  const selectedStudentForFee = useMemo(() => {
    if (!openFeeModalStudentId) return null;
    return classStudents.find((s: any) => resolveId(s) === openFeeModalStudentId) ?? null;
  }, [openFeeModalStudentId, classStudents]);

  // Fee records per student (keyed by studentId) - NOT shared globally
  const [studentFeeRecordsMap, setStudentFeeRecordsMap] = useState<Record<string, any[]>>({});
  const [loadingStudentFees, setLoadingStudentFees] = useState(false);
  const [updatingFee, setUpdatingFee] = useState<string | null>(null);

  // Current student's records from the map
  const studentFeeRecords = openFeeModalStudentId ? (studentFeeRecordsMap[openFeeModalStudentId] ?? []) : [];

  // Open fee modal and fetch student's fee records
  const openFeeModal = async (student: any) => {
    const studentId = resolveId(student);
    console.log("🔍 [openFeeModal] Starting for student ID:", studentId);
    
    // First, ensure the student is in classStudents array BEFORE setting modal state
    // This is critical - the modal depends on selectedStudentForFee which looks up from classStudents
    const existingStudent = classStudents.find((s: any) => resolveId(s) === studentId);
    console.log("🔍 [openFeeModal] Student in classStudents?", !!existingStudent);
    
    if (!existingStudent) {
      console.log("📝 [openFeeModal] Adding student to classStudents:", student);
      // Add student to classStudents FIRST (synchronously update state)
      setClassStudents((prev) => {
        if (!prev.find((s: any) => resolveId(s) === studentId)) {
          return [...prev, student];
        }
        return prev;
      });
    }
    
    // NOW set the modal state - student should be in classStudents already
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
      console.log("Class Students API Response:", result);
      // Backend returns { classStudents: [...] }
      if (result?.classStudents && result.classStudents.length > 0) {
        setClassStudents(result.classStudents);
      } else if (Array.isArray(result)) {
        setClassStudents(result);
      } else if (selectedClassData?.classStudents?.length > 0) {
        // Fallback: use classStudents from selectedClassData
        console.log("Using fallback from selectedClassData");
        setClassStudents(selectedClassData.classStudents);
      } else {
        console.error("No students found:", result);
        setClassStudents([]);
      }
    } catch (err: any) {
      console.error("Failed to fetch class students:", err);
      console.error("Error response:", err?.response?.data);
      // Fallback on error
      if (selectedClassData?.classStudents?.length > 0) {
        setClassStudents(selectedClassData.classStudents);
      } else {
        toast.error(err?.response?.data?.message || "Failed to load students");
        setClassStudents([]);
      }
    } finally {
      setStudentsLoading(false);
    }
  };

  const filteredClassStudents = useMemo(() => {
    if (!studentSearch.trim()) return classStudents;
    return classStudents.filter((s: any) =>
      s?.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s?.specialId?.toLowerCase().includes(studentSearch.toLowerCase())
    );
  }, [classStudents, studentSearch]);

  // Fetch fee records when entering class detail view
  const fetchFeeRecords = async (classId: string, category: "bs" | "adp", semester?: string) => {
    setFeeLoading(true);
    try {
      const result = await FeeService.getFeeRecords({ classId, category, semester });
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
    if (!students || students.length === 0) {
      console.log("⚠️ [fetchCurrentSemesterFees] No students to fetch for");
      return;
    }
    
    console.log("🔍 [fetchCurrentSemesterFees] Fetching for students:", students.length);
    
    const newSemesterFees: Record<string, any> = {};
    const newPaidStatus: Record<string, boolean> = {};
    
    // Fetch fee for each student's current semester
    await Promise.all(students.map(async (student) => {
      const studentId = resolveId(student);
      const studentSemester = student?.class || "I";
      
      console.log(`📡 [fetchCurrentSemesterFees] Fetching fee for ${student?.name} (${studentId}), Semester: ${studentSemester}`);
      
      try {
        // Get ALL fee records for this student (no year filter first)
        const result = await FeeService.getFeeRecords({
          studentId,
          semester: studentSemester,
        });
        
        console.log(`📦 [fetchCurrentSemesterFees] Result for ${student?.name}:`, result);
        
        const records = result?.records || result || [];
        
        // Find the record for current semester (if exists)
        const currentSemesterRecord = records.find((r: any) => 
          r.semester === studentSemester
        );
        
        if (currentSemesterRecord) {
          console.log(`✅ [fetchCurrentSemesterFees] Found fee record for ${student?.name}:`, currentSemesterRecord.status);
          newSemesterFees[studentId] = currentSemesterRecord;
          newPaidStatus[studentId] = currentSemesterRecord.status === "paid";
        } else {
          console.log(`❌ [fetchCurrentSemesterFees] No fee record for ${student?.name} (Semester ${studentSemester})`);
          // No fee record for current semester - mark as pending
          newSemesterFees[studentId] = null;
          newPaidStatus[studentId] = false;
        }
      } catch (err) {
        console.error(`❌ [fetchCurrentSemesterFees] Failed to fetch fee for student ${studentId}:`, err);
        newSemesterFees[studentId] = null;
        newPaidStatus[studentId] = false;
      }
    }));
    
    console.log("📊 [fetchCurrentSemesterFees] Final paidStatus:", newPaidStatus);
    setCurrentSemesterFees(newSemesterFees);
    setPaidStatus(newPaidStatus);
  };

  // Update paid status for current semester fee
  const updatePaidStatus = async (studentId: string, newStatus: boolean, studentSemester: string) => {
    console.log(`🔄 [updatePaidStatus] Student: ${studentId}, New Status: ${newStatus}, Semester: ${studentSemester}`);
    console.log(`📋 [updatePaidStatus] currentSemesterFees[${studentId}]:`, currentSemesterFees[studentId]);
    
    try {
      const currentRecord = currentSemesterFees[studentId];
      
      if (currentRecord) {
        console.log(`✅ [updatePaidStatus] Updating fee record:`, currentRecord._id);
        // Fee record exists - update it
        if (newStatus) {
          await FeeService.approveFee(currentRecord._id);
        } else {
          await FeeService.unapproveFee(currentRecord._id);
        }
        // Update local state
        setCurrentSemesterFees((prev) => ({
          ...prev,
          [studentId]: { ...prev[studentId], status: newStatus ? "paid" : "pending" }
        }));
      } else {
        console.log(`❌ [updatePaidStatus] No fee record found!`);
        // No fee record exists for current semester - show toast
        toast.error(`No fee record found for ${studentSemester}. Generate fee first!`);
        // Revert the toggle
        setPaidStatus((prev) => ({ ...prev, [studentId]: false }));
        return;
      }
      
      // Also update the global paidStatus
      setPaidStatus((prev) => ({ ...prev, [studentId]: newStatus }));
      toast.success(newStatus ? "Fee marked as Paid" : "Fee marked as Pending");
    } catch (err) {
      console.error("Failed to update fee status:", err);
      toast.error("Failed to update fee status");
      // Revert the toggle
      setPaidStatus((prev) => ({ ...prev, [studentId]: !newStatus }));
    }
  };

  const handleGenerateFee = async (data: any) => {
    setGeneratingFee(true);
    try {
      // Refetch current semester fees for all students after generating
      await fetchCurrentSemesterFees(classStudents);
    } finally {
      setGeneratingFee(false);
    }
  };

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

  // Separate effect: fetch fee records once students are loaded
  useEffect(() => {
    if (view === "classDetail" && selectedClassData?._id && classStudents.length > 0) {
      const category = studentPrograms[resolveId(classStudents[0])] || "bs";
      fetchFeeRecords(selectedClassData._id, category, selectedSemester || undefined);
    }
  }, [view, selectedClassData?._id, classStudents.length, selectedSemester]);

  // Refetch fee records when semester filter changes
  useEffect(() => {
    if (view === "classDetail" && selectedClassData?._id) {
      const category = studentPrograms[resolveId(classStudents[0])] || "bs";
      fetchFeeRecords(selectedClassData._id, category, selectedSemester || undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSemester]);

  // Fetch CURRENT SEMESTER fee status for all students when they load
  useEffect(() => {
    if (view === "classDetail" && classStudents.length > 0) {
      fetchCurrentSemesterFees(classStudents);
    }
  }, [view, classStudents.length]);

  // Refetch current semester fees when switching to class detail
  useEffect(() => {
    if (view === "classDetail") {
      fetchCurrentSemesterFees(classStudents);
    }
  }, [view]);

  // ── CLASS DETAIL VIEW (Fee per student)
  if (view === "classDetail" && selectedClassData) {
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
          {selectedClassData.session}
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
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                {["S.No", "Student ID", "Name", "Program", "Semester", "Generate Fee", "Paid", "Status", "Action"].map((h) => (
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
                    <span className={`rounded-md px-2 py-1 text-xs font-semibold uppercase ${
                      s?.category === "bs" 
                        ? "bg-blue-100 text-blue-800" 
                        : "bg-purple-100 text-purple-800"
                    }`}>
                      {s?.category || "BS"}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-muted-foreground">
                        {s?.class ? `Semester ${s.class}` : "Semester 1"}
                      </span>
                      {currentSemesterFees[resolveId(s)] === null && (
                        <span className="text-xs text-red-500">No fee generated</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => {
                        setOpenGenerateForStudentId(resolveId(s));
                      }}
                      className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 hover:bg-blue-200 transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      Generate
                    </button>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={async () => {
                        const studentId = resolveId(s);
                        const isPaid = !!paidStatus[studentId];
                        const newStatus = !isPaid;
                        const studentSemester = s?.class || "I";
                        await updatePaidStatus(studentId, newStatus, studentSemester);
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        !!paidStatus[resolveId(s)] ? "bg-green-500" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                          !!paidStatus[resolveId(s)] ? "translate-x-6" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        paidStatus[resolveId(s)]
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {paidStatus[resolveId(s)] ? "Paid" : "Pending"}
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
                  <td colSpan={9} className="p-8 text-center text-sm text-muted-foreground">
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
          category={(classStudents[0]?.category as "bs" | "adp") || "bs"}
          semester={classStudents[0]?.class || "I"}
          onGenerate={handleGenerateFee}
          onSuccess={() => {
            fetchCurrentSemesterFees(classStudents);
          }}
        />

        {/* Single Student Generate Fee Modal - Auto-fills semester from student's class */}
        {openGenerateForStudentId && (() => {
          const student = classStudents.find((s: any) => resolveId(s) === openGenerateForStudentId);
          const studentSemester = student?.class || "I";
          return (
            <GenerateFeeModal
              isOpen={true}
              onClose={() => setOpenGenerateForStudentId(null)}
              students={[student].filter(Boolean)}
              className={`${student?.name || "Student"} - ${student?.specialId || ""}`}
              classId={selectedClassData?._id}
              category={(student?.category as "bs" | "adp") || "bs"}
              semester={studentSemester}
              singleStudentMode={true}
              onGenerate={handleGenerateFee}
              onSuccess={() => {
                fetchCurrentSemesterFees(classStudents);
                setOpenGenerateForStudentId(null);
              }}
            />
          );
        })()}

        {/* FEE DETAIL MODAL */}
        {openFeeModalStudentId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpenFeeModalStudentId(null)}>
            <div className="flex flex-col w-full max-w-2xl rounded-2xl border border-border bg-card shadow-modal max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
                <div>
                  <h2 className="font-display text-base font-bold text-foreground">Fee Records</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {classStudents.find((s: any) => resolveId(s) === openFeeModalStudentId)?.name} · {classStudents.find((s: any) => resolveId(s) === openFeeModalStudentId)?.specialId}
                  </p>
                </div>
                <button onClick={() => setOpenFeeModalStudentId(null)} className="rounded-lg p-1 hover:bg-secondary">
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 px-6 py-4">
                {loadingStudentFees ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : studentFeeRecords.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Receipt className="h-10 w-10 mx-auto mb-3" />
                    <p>No fee records found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {studentFeeRecords.map((r: any) => (
                      <div key={r._id} className="rounded-lg border border-border bg-secondary/20 p-4">
                        <div className="flex justify-between mb-2">
                          <span className="font-medium capitalize">{r.month} {r.year}</span>
                          <span className="font-bold">PKR {r.amount?.toLocaleString()}</span>
                        </div>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                          r.status === 'paid' ? 'bg-green-100 text-green-800' :
                          r.status === 'waived' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>{r.status}</span>
                        {r.status !== 'paid' && (
                          <button onClick={() => updateFeeStatus(r._id, 'paid')} className="ml-2 text-xs text-green-600 hover:underline">Mark Paid</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t">
                <button onClick={() => setOpenFeeModalStudentId(null)} className="w-full py-2 border rounded-lg">Close</button>
              </div>
            </div>
          </div>
        )}
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
        BS / ADP Fee
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
                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 cursor-pointer hover:bg-secondary transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                    <BookOpen className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{cls.className}</p>
                    <p className="text-xs text-muted-foreground">{cls.session}</p>
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                    <Building2 className="h-5 w-5 text-accent-foreground" />
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
                            className="flex items-center justify-between gap-2 rounded-lg bg-secondary/50 px-4 py-3 hover:bg-secondary transition-colors"
                          >
                            <div
                              onClick={() => {
                                setSelectedClassData(cls);
                                setView("classDetail");
                              }}
                              className="flex items-center gap-3 cursor-pointer flex-1"
                            >
                              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/10 shrink-0">
                                <BookOpen className="h-4 w-4 text-accent-foreground" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  {cls.className}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {cls.session}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                              <div className="text-right hidden sm:block">
                                <p className="text-xs text-muted-foreground">
                                  {cls.classStudents?.length ?? 0} students
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  setSelectedClassData(cls);
                                  setView("classDetail");
                                }}
                                className="text-xs font-medium text-primary hover:underline cursor-pointer"
                              >
                                View Fee →
                              </button>
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

      {/* FEE DETAIL MODAL */}
      {openFeeModalStudentId && (() => {
        const currentStudent = classStudents.find((s: any) => resolveId(s) === openFeeModalStudentId);
        const studentSem = currentStudent?.class || "I";
        const modalSemester = studentSemesters[openFeeModalStudentId] || studentSem;
        
        // Filter records by selected semester
        const filteredRecords = studentFeeRecords.filter((r: any) => r.semester === modalSemester);
        
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpenFeeModalStudentId(null)}>
          <div className="flex flex-col w-full max-w-2xl rounded-2xl border border-border bg-card shadow-modal max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
              <div>
                <h2 className="font-display text-base font-bold text-foreground">Fee Records</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {currentStudent?.name} · {currentStudent?.specialId}
                </p>
              </div>
              <button onClick={() => setOpenFeeModalStudentId(null)} className="rounded-lg p-1 hover:bg-secondary">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            
            {/* Semester Filter in Modal */}
            <div className="px-6 py-3 border-b border-border bg-secondary/20">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium">Semester:</label>
                <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                  {studentSem}
                </span>
                <span className="text-xs text-muted-foreground">({filteredRecords.length} records)</span>
              </div>
            </div>
            
            <div className="overflow-y-auto flex-1 px-6 py-4">
              {loadingStudentFees ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : filteredRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-10 w-10 mx-auto mb-3" />
                  <p>No fee records found for Semester {modalSemester}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRecords.map((r: any) => (
                    <div key={r._id} className="rounded-lg border border-border bg-secondary/20 p-4">
                      <div className="flex justify-between mb-2">
                        <div>
                          <span className="font-medium capitalize">{r.month} {r.year}</span>
                          <span className="ml-2 text-xs bg-secondary px-2 py-0.5 rounded">Sem {r.semester}</span>
                        </div>
                        <span className="font-bold">PKR {r.amount?.toLocaleString()}</span>
                      </div>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                        r.status === 'paid' ? 'bg-green-100 text-green-800' :
                        r.status === 'waived' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>{r.status}</span>
                      {r.status !== 'paid' && (
                        <button onClick={() => updateFeeStatus(r._id, 'paid')} className="ml-2 text-xs text-green-600 hover:underline">Mark Paid</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t">
              <button onClick={() => setOpenFeeModalStudentId(null)} className="w-full py-2 border rounded-lg">Close</button>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
};

export default BsAdpFee;
