import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Receipt,
  X,
  User,
  Check,
  Clock,
  DollarSign,
  Calendar,
  BookOpen,
  Tag,
  Hash,
  ChevronDown,
  Wallet,
  FileText,
} from "lucide-react";
import ClassService from "@/services/classService";

interface ClassOption {
  _id: string;
  className: string;
}

interface FeeRecordsViewModalProps {
  open: boolean;
  onClose: () => void;
  studentName?: string;
  studentSpecialId?: string;
  records: any[];
  loading?: boolean;
  onMarkPaid?: (recordId: string) => void;
  showSemester?: boolean;
  classes?: ClassOption[];
}

type StatusTab = "all" | "pending" | "paid";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
  }).format(amount);

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const displayValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") {
    if ("_id" in (value as object)) return String((value as { _id: string })._id);
    return JSON.stringify(value);
  }
  return String(value);
};

const resolveClassId = (classId: unknown): string | null => {
  if (!classId) return null;
  if (typeof classId === "string") return classId;
  if (typeof classId === "object" && classId !== null) {
    const obj = classId as { _id?: string; className?: string };
    if (obj._id) return obj._id;
  }
  return null;
};

const StatusBadge = ({ status }: { status?: string }) => {
  const normalized = status || "pending";
  if (normalized === "paid") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
        <Check className="h-3 w-3" /> Paid
      </span>
    );
  }
  if (normalized === "waived") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
        <DollarSign className="h-3 w-3" /> Waived
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
      <Clock className="h-3 w-3" /> Pending
    </span>
  );
};

const InfoRow = ({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ElementType;
  label: string;
  value: unknown;
  mono?: boolean;
}) => (
  <div className="flex items-start gap-3 rounded-lg bg-background/60 px-3 py-2.5">
    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-sm text-foreground ${mono ? "font-mono text-xs break-all" : "capitalize"}`}>
        {displayValue(value)}
      </p>
    </div>
  </div>
);

function FeeRecordCard({
  record,
  index,
  onMarkPaid,
  showSemester = true,
  getClassName,
}: {
  record: any;
  index: number;
  onMarkPaid?: (recordId: string) => void;
  showSemester?: boolean;
  getClassName: (record: any) => string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
    >
      <div className="flex items-start justify-between gap-4 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Receipt className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-sm font-semibold capitalize text-foreground">
                {record.month} {record.year}
              </h3>
              <StatusBadge status={record.status} />
              {showSemester && record.semester && (
                <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  Sem {record.semester}
                </span>
              )}
            </div>
            {record.description ? (
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{record.description}</p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">No description</p>
            )}
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Due {formatDate(record.dueDate)}
              </span>
              {record.paidDate && (
                <span className="inline-flex items-center gap-1 text-green-700">
                  <Check className="h-3 w-3" />
                  Paid {formatDate(record.paidDate)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="font-display text-lg font-bold text-foreground">
            {formatCurrency(Number(record.amount || 0))}
          </p>
          {record.status !== "paid" && onMarkPaid && (
            <button
              onClick={() => onMarkPaid(record._id)}
              className="mt-2 inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700"
            >
              <Check className="h-3 w-3" />
              Mark Paid
            </button>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between border-t border-border bg-secondary/30 px-4 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/50"
      >
        <span className="inline-flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          {expanded ? "Hide full details" : "View full details"}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="grid gap-2 p-4 sm:grid-cols-2">
              <InfoRow icon={BookOpen} label="Category" value={record.category} />
              {showSemester && (
                <InfoRow icon={BookOpen} label="Semester" value={record.semester} />
              )}
              <InfoRow icon={FileText} label="Description" value={record.description} />
              <InfoRow icon={Calendar} label="Due Date" value={formatDate(record.dueDate)} />
              <InfoRow icon={Check} label="Paid Date" value={formatDate(record.paidDate)} />
              <InfoRow icon={Calendar} label="Month" value={record.month} />
              <InfoRow icon={Calendar} label="Year" value={record.year} />
              <InfoRow icon={BookOpen} label="Class" value={getClassName(record)} />
              <InfoRow icon={Hash} label="Record ID" value={record._id} mono />
              <InfoRow icon={Clock} label="Created At" value={formatDateTime(record.createdAt)} />
            </div>

            {Array.isArray(record.customFields) && record.customFields.length > 0 && (
              <div className="border-t border-border bg-secondary/20 px-4 py-3">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Tag className="h-3.5 w-3.5" />
                  Custom Fields
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {record.customFields.map((field: any, fieldIndex: number) => (
                    <InfoRow
                      key={`${record._id}-field-${fieldIndex}`}
                      icon={Tag}
                      label={field.label || `Field ${fieldIndex + 1}`}
                      value={field.value}
                    />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FeeRecordsViewModal({
  open,
  onClose,
  studentName,
  studentSpecialId,
  records,
  loading = false,
  onMarkPaid,
  showSemester = true,
  classes,
}: FeeRecordsViewModalProps) {
  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const [fetchedClassNames, setFetchedClassNames] = useState<Record<string, string>>({});
  const attemptedClassIdsRef = useRef<Set<string>>(new Set());

  const classNameById = useMemo(() => {
    const map: Record<string, string> = {};
    (classes ?? []).forEach((cls) => {
      if (cls._id && cls.className) map[cls._id] = cls.className;
    });
    Object.entries(fetchedClassNames).forEach(([id, name]) => {
      map[id] = name;
    });
    return map;
  }, [classes, fetchedClassNames]);

  const recordClassIdsKey = useMemo(
    () =>
      [
        ...new Set(
          records
            .map((record) => resolveClassId(record.classId))
            .filter((id): id is string => Boolean(id)),
        ),
      ]
        .sort()
        .join(","),
    [records],
  );

  useEffect(() => {
    if (!open) {
      attemptedClassIdsRef.current = new Set();
      setFetchedClassNames((prev) =>
        Object.keys(prev).length === 0 ? prev : {},
      );
      return;
    }

    const knownIds = new Set((classes ?? []).map((cls) => cls._id));
    const ids = recordClassIdsKey ? recordClassIdsKey.split(",") : [];
    const missingIds = ids.filter(
      (id) => !knownIds.has(id) && !attemptedClassIdsRef.current.has(id),
    );

    if (missingIds.length === 0) return;

    missingIds.forEach((id) => attemptedClassIdsRef.current.add(id));

    let cancelled = false;

    Promise.all(
      missingIds.map(async (id) => {
        try {
          const info = await ClassService.getClassInfo(id);
          const name = info?.className || info?.class?.className;
          return name ? ([id, name] as const) : null;
        } catch {
          return null;
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      setFetchedClassNames((prev) => {
        let changed = false;
        const next = { ...prev };
        results.forEach((entry) => {
          if (entry && next[entry[0]] !== entry[1]) {
            next[entry[0]] = entry[1];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [open, recordClassIdsKey, classes]);

  const getClassName = (record: any) => {
    if (record.classId?.className) return record.classId.className;
    const id = resolveClassId(record.classId);
    if (!id) return "—";
    return classNameById[id] || id;
  };

  const stats = useMemo(() => {
    const totalAmount = records.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const paid = records.filter((r) => r.status === "paid");
    const pending = records.filter((r) => r.status === "pending");
    const paidAmount = paid.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const pendingAmount = pending.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    return { totalAmount, paidAmount, pendingAmount, paid, pending };
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (activeTab === "all") return records;
    return records.filter((r) => r.status === activeTab);
  }, [records, activeTab]);

  const tabs: { key: StatusTab; label: string; count: number }[] = [
    { key: "all", label: "All", count: records.length },
    { key: "pending", label: "Pending", count: stats.pending.length },
    { key: "paid", label: "Paid", count: stats.paid.length },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 12 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-modal"
          >
            {/* Header */}
            <div className="relative shrink-0 overflow-hidden border-b border-border px-6 py-5">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
              <div className="relative flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/20">
                    <Wallet className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-foreground">Fee Records</h2>
                    <p className="mt-0.5 flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      {studentName || "Student"} · {studentSpecialId || "—"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex h-64 flex-col items-center justify-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading fee records...</p>
                </div>
              ) : records.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
                    <Receipt className="h-8 w-8" />
                  </div>
                  <p className="text-sm font-medium">No fee records found</p>
                  <p className="text-xs">Generate a fee for this student to see records here.</p>
                </div>
              ) : (
                <>
                  {/* Summary */}
                  <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 to-primary/10 p-4">
                      <p className="text-xs font-medium text-muted-foreground">Total Amount</p>
                      <p className="mt-1 text-xl font-bold text-foreground">
                        {formatCurrency(stats.totalAmount)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-green-100 p-4">
                      <p className="text-xs font-medium text-green-700">Paid</p>
                      <p className="mt-1 text-xl font-bold text-green-700">
                        {formatCurrency(stats.paidAmount)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 p-4">
                      <p className="text-xs font-medium text-amber-700">Pending</p>
                      <p className="mt-1 text-xl font-bold text-amber-700">
                        {formatCurrency(stats.pendingAmount)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-gradient-to-br from-secondary/50 to-secondary/30 p-4">
                      <p className="text-xs font-medium text-muted-foreground">Records</p>
                      <p className="mt-1 text-xl font-bold text-foreground">{records.length}</p>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="mb-5 flex flex-wrap gap-2">
                    {tabs.map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                          activeTab === tab.key
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                        }`}
                      >
                        {tab.label}
                        <span
                          className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                            activeTab === tab.key ? "bg-primary-foreground/20" : "bg-background/80"
                          }`}
                        >
                          {tab.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Records */}
                  <div className="space-y-3">
                    {filteredRecords.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                        No {activeTab !== "all" ? activeTab : ""} records in this view
                      </div>
                    ) : (
                      filteredRecords.map((record, index) => (
                        <FeeRecordCard
                          key={record._id}
                          record={record}
                          index={index}
                          onMarkPaid={onMarkPaid}
                          showSemester={showSemester}
                          getClassName={getClassName}
                        />
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-border bg-secondary/20 px-6 py-4">
              <button
                onClick={onClose}
                className="w-full rounded-xl border border-border bg-card py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
