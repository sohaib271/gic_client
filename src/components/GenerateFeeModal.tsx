import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, DollarSign, Calendar, FileText, Loader2, BookOpen, Building2, Check, Plus, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";
import FeeService from "@/services/feeService";

interface Student {
  _id: string;
  specialId?: string;
  name?: string;
  lastName?: string;
}

interface ClassOption {
  _id: string;
  className: string;
}

interface CustomField {
  label: string;
  value: string;
}

interface GenerateFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  className: string;
  classId?: string;
  category: "intermediate" | "bs" | "adp";
  semester?: string;
  /** Intermediate only: list of classes to pick from */
  classes?: ClassOption[];
  /** When provided, modal runs in single-student mode with auto-filled fields */
  singleStudentMode?: boolean;
  onGenerate?: (data: {
    studentIds: string[];
    month: string;
    dueDate: string;
    amount: number;
    description: string;
    category: "intermediate" | "bs" | "adp";
    semester?: string;
    classId?: string;
    year: number;
    customFields?: CustomField[];
  }) => Promise<void>;
  onSuccess?: () => void;
}

const MONTHS = [
  { value: "january", label: "January" },
  { value: "february", label: "February" },
  { value: "march", label: "March" },
  { value: "april", label: "April" },
  { value: "may", label: "May" },
  { value: "june", label: "June" },
  { value: "july", label: "July" },
  { value: "august", label: "August" },
  { value: "september", label: "September" },
  { value: "october", label: "October" },
  { value: "november", label: "November" },
  { value: "december", label: "December" },
];

const currentMonth = new Date().toLocaleString("en-US", { month: "long" }).toLowerCase();
const currentDate = new Date().toISOString().split("T")[0];

export default function GenerateFeeModal({
  isOpen,
  onClose,
  students,
  className,
  classId,
  category,
  semester,
  onGenerate,
  onSuccess,
  classes,
  singleStudentMode = false,
}: GenerateFeeModalProps) {
  // In single-student mode, pre-select the only student
  // Otherwise, auto-select all students (since UI selection is removed)
  const isSingleStudent = singleStudentMode && students.length === 1;
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(
    isSingleStudent ? new Set(students.map((s) => s._id)) : new Set(students.map((s) => s._id))
  );
  const [selectAll, setSelectAll] = useState(false);
  const [month, setMonth] = useState(
    MONTHS.find((m) => m.value === currentMonth)?.value || "january"
  );
  const [dueDate, setDueDate] = useState(currentDate);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentYear = new Date().getFullYear();

  // Semester selection — for BS/ADP (auto-filled from student's class)
  const [selectedSemester, setSelectedSemester] = useState<string>(semester || "I");

  // Class selection — for Intermediate
  // In single-student mode, use student's classId if available, otherwise fall back to classId prop
  const getDefaultClassId = () => {
    if (isSingleStudent && students[0]?.classId) {
      return students[0].classId;
    }
    return classId || "";
  };

  const [selectedClassId, setSelectedClassId] = useState<string>(getDefaultClassId());

  // Custom fields state
  const [customFields, setCustomFields] = useState<CustomField[]>([
    { label: "", value: "" }
  ]);

  // Saved custom field labels (from localStorage)
  const [savedCustomLabels, setSavedCustomLabels] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<number | null>(null);

  // Load saved custom labels from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("fee_custom_labels");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSavedCustomLabels(parsed);
        }
      } catch (e) {
        console.error("Failed to parse saved custom labels:", e);
      }
    }
  }, []);

  // Save custom labels to localStorage
  const saveCustomLabel = (label: string) => {
    if (!label.trim()) return;
    const trimmed = label.trim();
    if (!savedCustomLabels.includes(trimmed)) {
      const updated = [trimmed, ...savedCustomLabels].slice(0, 10); // Keep last 10
      setSavedCustomLabels(updated);
      localStorage.setItem("fee_custom_labels", JSON.stringify(updated));
    }
  };

  // Calculate total: main amount + all custom field values
  const calculateTotal = () => {
    const mainAmount = parseFloat(amount) || 0;
    const customTotal = customFields.reduce((sum, field) => {
      const fieldValue = parseFloat(field.value) || 0;
      return sum + fieldValue;
    }, 0);
    return mainAmount + customTotal;
  };

  const totalAmount = calculateTotal();

  const isIntermediate = category === "intermediate";

  const SEMESTERS = [
    { value: "I", label: "Semester I" },
    { value: "II", label: "Semester II" },
    { value: "III", label: "Semester III" },
    { value: "IV", label: "Semester IV" },
    { value: "V", label: "Semester V" },
    { value: "VI", label: "Semester VI" },
    { value: "VII", label: "Semester VII" },
    { value: "VIII", label: "Semester VIII" },
  ];

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(students.map((s) => s._id)));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectStudent = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
    setSelectAll(newSelected.size === students.length);
  };

  const handleSubmit = async () => {
    // Check if either main amount or custom fields have values
    const hasMainAmount = amount && parseFloat(amount) > 0;
    const hasCustomAmounts = customFields.some(f => f.label.trim() !== "" && parseFloat(f.value) > 0);
    
    if (!hasMainAmount && !hasCustomAmounts) {
      toast.error("Please enter an amount (main amount or custom fields)");
      return;
    }
    if (!dueDate) {
      toast.error("Please select a due date");
      return;
    }
    if (selectedStudents.size === 0) {
      toast.error("Please select at least one student");
      return;
    }
    if (isIntermediate && !selectedClassId) {
      toast.error("Please select a class");
      return;
    }

    const payloadClassId = isIntermediate ? selectedClassId : classId;
    const payloadSemester = isIntermediate ? undefined : selectedSemester;

    // Filter out empty custom fields
    const filteredCustomFields = customFields.filter(f => f.label.trim() !== "");

    // Calculate total: main amount + all custom field values
    const finalTotalAmount = calculateTotal();

    setIsSubmitting(true);
    try {
      // Call the API directly with TOTAL amount (main + custom fields)
      const result = await FeeService.generateFee({
        studentIds: Array.from(selectedStudents),
        classId: payloadClassId || "",
        month,
        year: currentYear,
        dueDate,
        amount: finalTotalAmount, // Use total instead of just main amount
        description,
        category,
        semester: payloadSemester,
        customFields: filteredCustomFields.length > 0 ? filteredCustomFields : undefined,
      });

      if (result.message || result._id) {
        toast.success(`Fee generated for ${selectedStudents.size} student(s)`);
        
        // Save custom field labels to localStorage
        filteredCustomFields.forEach(field => {
          saveCustomLabel(field.label);
        });
      } else {
        toast.error(result.message || "Failed to generate fee");
        return;
      }

      // Also call the custom onGenerate if provided
      if (onGenerate) {
        await onGenerate({
          studentIds: Array.from(selectedStudents),
          month,
          dueDate,
          amount: finalTotalAmount, // Use total instead of just main amount
          description,
          category,
          semester: payloadSemester,
          classId: payloadClassId,
          year: currentYear,
          customFields: filteredCustomFields.length > 0 ? filteredCustomFields : undefined,
        });
      }

      // Reset form
      setSelectedStudents(new Set());
      setSelectAll(false);
      setAmount("");
      setDescription("");
      setCustomFields([{ label: "", value: "" }]);
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to generate fee");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-card shadow-modal"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="font-display text-base font-bold text-foreground">
                  Generate Fee
                </h2>
                <p className="text-xs text-muted-foreground">{className}</p>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1 hover:bg-secondary transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 [&>div:last-child]:overflow-visible">
              {/* Month & Due Date Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Month
                  </label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              {/* Semester/Class & Amount Row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Semester for BS/ADP — Class for Intermediate */}
                {isIntermediate ? (
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      Class
                    </label>
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Select Class</option>
                      {classes?.map((cls) => (
                        <option key={cls._id} value={cls._id}>
                          {cls.className}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      Semester
                    </label>
                    <select
                      value={selectedSemester}
                      onChange={(e) => setSelectedSemester(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {SEMESTERS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {/* Amount */}
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    Amount (PKR)
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    min="0"
                    step="100"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

                {/* Description */}
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Description (Optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Monthly tuition fee for January 2026"
                    rows={2}
                    className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

              {/* Custom Fields */}
              <div className="overflow-visible">
                <div className="mb-2 flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    Custom Fields (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={() => setCustomFields([...customFields, { label: "", value: "" }])}
                    className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <Plus className="h-3 w-3" />
                    Add Field
                  </button>
                </div>
                <div className="space-y-2 overflow-visible">
                  {customFields.map((field, index) => (
                    <div key={index} className="relative flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => {
                            const newFields = [...customFields];
                            newFields[index].label = e.target.value;
                            setCustomFields(newFields);
                            setShowSuggestions(e.target.value ? index : null);
                          }}
                          onFocus={() => {
                            if (field.label) setShowSuggestions(index);
                          }}
                          onBlur={() => {
                            // Delay to allow clicking on suggestion
                            setTimeout(() => setShowSuggestions(null), 200);
                          }}
                          placeholder="Field name (e.g. Transport Fee)"
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        {/* Saved indicator */}
                        {savedCustomLabels.includes(field.label.trim()) && field.label && (
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-primary">★</span>
                        )}
                        {/* Suggestions dropdown */}
                        {showSuggestions === index && savedCustomLabels.length > 0 && (
                          <div className="absolute left-0 top-full z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
                            {savedCustomLabels
                              .filter(label => label.toLowerCase().includes(field.label.toLowerCase()))
                              .map((label, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    const newFields = [...customFields];
                                    newFields[index].label = label;
                                    setCustomFields(newFields);
                                    setShowSuggestions(null);
                                  }}
                                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-secondary"
                                >
                                  <span>{label}</span>
                                  <span className="text-xs text-muted-foreground">★ saved</span>
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                      <input
                        type="text"
                        value={field.value}
                        onChange={(e) => {
                          const newFields = [...customFields];
                          newFields[index].value = e.target.value;
                          setCustomFields(newFields);
                        }}
                        placeholder="Value"
                        className="w-32 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      {customFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setCustomFields(customFields.filter((_, i) => i !== index))}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Add custom fields like "Transport Fee", "Exam Fee", etc.
                </p>
              </div>

              {/* Total Amount Display */}
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Total Amount</span>
                  <span className="text-lg font-bold text-primary">
                    PKR {totalAmount.toLocaleString()}
                  </span>
                </div>
                {customFields.some(f => f.label.trim() !== "" && parseFloat(f.value) > 0) && (
                  <div className="mt-2 space-y-1 border-t border-primary/20 pt-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Main Amount:</span>
                      <span>PKR {(parseFloat(amount) || 0).toLocaleString()}</span>
                    </div>
                    {customFields
                      .filter(f => f.label.trim() !== "" && parseFloat(f.value) > 0)
                      .map((field, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-muted-foreground">
                          <span>{field.label}:</span>
                          <span>PKR {parseFloat(field.value).toLocaleString()}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-border px-6 py-4">
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || (!amount && !customFields.some(f => f.label.trim() !== ""))}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </span>
                ) : (
                  `Generate Fee`
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
