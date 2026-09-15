import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, AlertCircle, Check, Clock, DollarSign, Calendar, BookOpen, User } from "lucide-react";
import { useEffect, useState } from "react";
import FeeService from "@/services/feeService";
import { toast } from "sonner";

interface StudentFeeDetailModalProps {
  student: any;
  open: boolean;
  onClose: () => void;
}

interface FeeRecord {
  _id: string;
  studentId: string;
  month: string;
  year: number;
  amount: number;
  status: "pending" | "paid" | "waived";
  dueDate?: string;
  paidDate?: string;
  description: string;
  category: string;
  semester: string;
  classId: string;
  customFields?: { label: string; value: any }[];
}

interface FeeSummary {
  totalRecords: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  paid: FeeRecord[];
  pending: FeeRecord[];
  waived: FeeRecord[];
}

const StudentFeeDetailModal = ({ student, open, onClose }: StudentFeeDetailModalProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feeData, setFeeData] = useState<FeeSummary | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "paid" | "waived">("all");

  useEffect(() => {
    if (open && student?._id) {
      fetchFeeData();
    }
  }, [open, student?._id]);

  const fetchFeeData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await FeeService.getStudentFeeSummary(student._id);
      console.log("Fee API Response:", res);
      
      if (res?.totalRecords !== undefined || res?.pending || res?.paid || res?.waived) {
        setFeeData(res);
      } else if (res?.error || res?.statusCode >= 400) {
        setError(res?.message || "Failed to load fee data");
        setFeeData(null);
      } else {
        setError("No fee records found for this student");
        setFeeData(null);
      }
    } catch (err: any) {
      console.error("Fee fetch error:", err);
      setError(err?.response?.data?.message || "Network error while fetching fee data");
      setFeeData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-PK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            <Check className="h-3 w-3" /> Paid
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
            <Clock className="h-3 w-3" /> Pending
          </span>
        );
      case "waived":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            <DollarSign className="h-3 w-3" /> Waived
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
            {status}
          </span>
        );
    }
  };

  const getFilteredRecords = () => {
    if (!feeData) return [];
    const records = [...(feeData.pending || []), ...(feeData.paid || []), ...(feeData.waived || [])];
    // If records have nested studentId/classId objects, flatten them for display
    return records.map(r => ({
      ...r,
      // Use nested object fields or fall back to string fields
      studentId: r.studentId?._id || r.studentId,
      classId: r.classId?._id || r.classId,
    }));
  };

  const studentName = `${student?.name ?? ""} ${student?.lastName ?? ""}`.trim();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="flex h-[85vh] w-full max-w-4xl flex-col rounded-2xl bg-card shadow-modal"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">Student Fee Details</h2>
                <p className="mt-0.5 flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  {studentName} • {student?.specialId || student?._id?.slice(-6)}
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex h-64 items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading fee data...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex h-64 flex-col items-center justify-center gap-3">
                  <AlertCircle className="h-12 w-12 text-destructive" />
                  <p className="text-sm text-muted-foreground">{error}</p>
                  <button
                    onClick={fetchFeeData}
                    className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : feeData ? (
                <>
                  {/* Summary Cards */}
                  <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 to-primary/10 p-4">
                      <p className="text-xs font-medium text-muted-foreground">Total Amount</p>
                      <p className="mt-1 text-xl font-bold text-foreground">
                        {formatCurrency(feeData.totalAmount || 0)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-green-100 p-4">
                      <p className="text-xs font-medium text-green-700">Paid</p>
                      <p className="mt-1 text-xl font-bold text-green-700">
                        {formatCurrency(feeData.paidAmount || 0)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100 p-4">
                      <p className="text-xs font-medium text-yellow-700">Pending</p>
                      <p className="mt-1 text-xl font-bold text-yellow-700">
                        {formatCurrency(feeData.pendingAmount || 0)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-gradient-to-br from-secondary/50 to-secondary/30 p-4">
                      <p className="text-xs font-medium text-muted-foreground">Records</p>
                      <p className="mt-1 text-xl font-bold text-foreground">
                        {feeData.totalRecords || 0}
                      </p>
                    </div>
                  </div>

                  {/* Tab Filters */}
                  <div className="mb-4 flex flex-wrap gap-2">
                    {(["all", "pending", "paid", "waived"] as const).map((tab) => {
                      const count =
                        tab === "all"
                          ? feeData.totalRecords
                          : tab === "pending"
                          ? feeData.pending?.length
                          : tab === "paid"
                          ? feeData.paid?.length
                          : feeData.waived?.length;
                      return (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                            activeTab === tab
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                          }`}
                        >
                          {tab.charAt(0).toUpperCase() + tab.slice(1)}
                          {count !== undefined && (
                            <span className="ml-1.5 rounded-full bg-black/10 px-1.5 py-0.5 text-xs">
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Fee Records Table */}
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full min-w-[600px]">
                      <thead>
                        <tr className="border-b border-border bg-secondary/30">
                          <th className="p-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Month/Year
                          </th>
                          <th className="p-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Description
                          </th>
                          <th className="p-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Category
                          </th>
                          <th className="p-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Due Date
                          </th>
                          <th className="p-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Status
                          </th>
                          <th className="p-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {getFilteredRecords().length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">
                              No {activeTab !== "all" ? activeTab : ""} fee records found
                            </td>
                          </tr>
                        ) : (
                          getFilteredRecords().map((record, index) => (
                            <tr
                              key={record._id || index}
                              className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors"
                            >
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">
                                    {record.month} {record.year}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3">
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {record.description || "—"}
                                </p>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-1.5">
                                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm capitalize">{record.category || "—"}</span>
                                  {record.semester && (
                                    <span className="rounded bg-secondary px-1.5 py-0.5 text-xs">
                                      Sem {record.semester}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3">
                                <span className="text-sm">{formatDate(record.dueDate)}</span>
                              </td>
                              <td className="p-3">{getStatusBadge(record.status)}</td>
                              <td className="p-3 text-right">
                                <span className="text-sm font-semibold">
                                  {formatCurrency(record.amount)}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Custom Fields Display */}
                  {getFilteredRecords().some((r) => r.customFields?.length > 0) && (
                    <div className="mt-6">
                      <h3 className="mb-3 font-display text-sm font-semibold text-foreground">
                        Custom Fields Details
                      </h3>
                      <div className="space-y-2">
                        {getFilteredRecords()
                          .filter((r) => r.customFields?.length > 0)
                          .map((record) => (
                            <div
                              key={record._id}
                              className="rounded-lg border border-border bg-secondary/20 p-3"
                            >
                              <p className="mb-2 text-xs font-medium text-muted-foreground">
                                {record.month} {record.year} — Custom Fields
                              </p>
                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {record.customFields?.map((field, idx) => (
                                  <div key={idx} className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{field.label}:</span>
                                    <span className="font-medium">{field.value || "—"}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex h-64 flex-col items-center justify-center gap-3">
                  <AlertCircle className="h-12 w-12 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No fee data available</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StudentFeeDetailModal;
