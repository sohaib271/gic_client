import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useSelector } from "react-redux";
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  FileDown,
  Loader2,
  ReceiptIndianRupee,
  Search,
  Users,
  Files,
  Wallet,
  Check,
  Clock,
  Verified,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import FeeService from "@/services/feeService";
import { toast } from "sonner";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
  }).format(amount || 0);

const monthYear = (r: any) =>
  r?.month && r?.year ? `${r.month} ${r.year}` : "—";

const StatusBadge = ({ status }: { status?: string }) => {
  if (status === "paid")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">
        <Check className="h-3 w-3" /> Paid
      </span>
    );
  if (status === "waived")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700">
        <Verified className="h-3 w-3" /> Waived
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
      <Clock className="h-3 w-3" /> Pending
    </span>
  );
};

type Filter = "all" | "paid" | "unpaid";

const HodDepartmentFee = () => {
  const navigate = useNavigate();
  const user = useSelector((state: any) => state?.user.user);
  const deptId = user?.department?._id ?? user?.department ?? null;

  const [department, setDepartment] = useState("");
  const [summary, setSummary] = useState<any | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [generating, setGenerating] = useState(false);

  const load = useCallback(
    async (targetPage: number, replace = true) => {
      if (!deptId) return;
      if (targetPage > 1) setLoadingMore(true);
      else setLoading(true);
      try {
        const result = await FeeService.getDepartmentStudentsFee({
          departmentId: deptId,
          page: targetPage,
          limit: 10,
        });
        if (result?.students) {
          setSummary(result.summary);
          setDepartment(result.department);
          setPagination(result.pagination);
          setPage(targetPage);
          setStudents((prev) =>
            replace ? result.students : [...prev, ...result.students],
          );
        } else {
          toast.error(result?.message || "Failed to load department fees");
        }
      } catch {
        toast.error("Could not reach the server");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [deptId],
  );

  useEffect(() => {
    setExpanded({});
    const t = setTimeout(() => load(1, true), 300);
    return () => clearTimeout(t);
  }, [deptId, load]);

  const generateReport = async () => {
    if (!deptId || generating) return;
    setGenerating(true);
    try {
      const result = await FeeService.getDepartmentStudentsFee({
        departmentId: deptId,
        page: 1,
        limit: 1000,
      });
      const allStudents = result?.students ?? [];
      const rows: any[][] = [
        [
          "Student ID",
          "Student Name",
          "Email",
          "Phone",
          "Class",
          "Fee (Month)",
          "Fee (Year)",
          "Description",
          "Amount",
          "Status",
          "Due Date",
          "Paid Date",
        ],
      ];

      allStudents.forEach((s: any) => {
        const records = s?.feeRecords ?? [];
        const studentRow = [
          s.student?.specialId ?? "",
          `${s.student?.name ?? ""} ${s.student?.lastName ?? ""}`.trim(),
          s.student?.email ?? "",
          s.student?.phone ?? "",
        ];
        if (records.length === 0) {
          rows.push([...studentRow, "", "", "", "", "0", "—", "", ""]);
          return;
        }
        records.forEach((r: any) => {
          rows.push([
            ...studentRow,
            r?.className ?? "",
            r?.month ?? "",
            r?.year ?? "",
            r?.description ?? "",
            Number(r?.amount) || 0,
            r?.status ?? "pending",
            r?.dueDate ? new Date(r.dueDate).toLocaleDateString("en-PK") : "",
            r?.paidDate ? new Date(r.paidDate).toLocaleDateString("en-PK") : "",
          ]);
        });
      });

      const csv = rows
        .map((row) => row.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
        .join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hod-department-fee-report-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report downloaded");
    } catch {
      toast.error("Could not generate report");
    } finally {
      setGenerating(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      const matchesSearch =
        !q ||
        `${s.student?.name ?? ""} ${s.student?.lastName ?? ""}`.toLowerCase().includes(q) ||
        (s.student?.specialId ?? "").toLowerCase().includes(q) ||
        (s.student?.email ?? "").toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (filter === "paid") return s.summary?.pendingCount === 0 && (s.summary?.paidCount ?? 0) > 0;
      if (filter === "unpaid") return (s.summary?.pendingCount ?? 0) > 0;
      return true;
    });
  }, [students, search, filter]);

  const filterCounts = useMemo(
    () => ({
      all: students.length,
      paid: students.filter(
        (s) => s.summary?.pendingCount === 0 && (s.summary?.paidCount ?? 0) > 0,
      ).length,
      unpaid: students.filter((s) => (s.summary?.pendingCount ?? 0) > 0).length,
    }),
    [students],
  );

  if (!deptId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Your account is missing a department. Please contact the admin.
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => navigate("/professor/settings")}
        className="mb-4 flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Settings
      </button>

      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-1 font-display text-xl font-bold text-foreground sm:text-2xl"
          >
            Department Fees
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="text-sm text-muted-foreground"
          >
            Fee overview of every student in your department
          </motion.p>
        </div>
        {department && (
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Building2 className="h-3.5 w-3.5" /> {department}
          </div>
        )}
      </div>

      <div className="-mt-4 mb-6 flex justify-end">
        <button
          onClick={generateReport}
          disabled={generating}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-primary shadow-sm transition-colors hover:bg-secondary disabled:opacity-60"
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4" />
          )}
          Generate Report
        </button>
      </div>

      {/* Summary */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="mb-6 overflow-hidden">
          <div className="relative bg-gradient-to-r from-primary via-primary/90 to-accent p-5 text-primary-foreground">
            <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_50%,white_1px,transparent_1px)] [background-size:18px_18px]" />
            <div className="relative flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display text-base font-semibold">
                  Department Fee Overview
                </p>
                <p className="text-xs text-primary-foreground/80">
                  Live snapshot of the department fee status
                </p>
              </div>
            </div>

            <div className="relative mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[
                {
                  label: "Students",
                  value: summary ? String(summary.totalStudents ?? 0) : "—",
                  icon: Users,
                },
                {
                  label: "Records",
                  value: summary ? String(summary.totalFeeRecords ?? 0) : "—",
                  icon: Files,
                },
                {
                  label: "Total",
                  value: summary ? formatCurrency(summary.totalAmount ?? 0) : "—",
                  icon: ReceiptIndianRupee,
                },
                {
                  label: "Paid",
                  value: summary ? formatCurrency(summary.totalPaid ?? 0) : "—",
                  icon: Check,
                },
                {
                  label: "Pending",
                  value: summary ? formatCurrency(summary.totalPending ?? 0) : "—",
                  icon: Clock,
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl bg-white/10 px-3 py-3 ring-1 ring-white/10 backdrop-blur-sm"
                >
                  <s.icon className="mb-1.5 h-4 w-4 text-primary-foreground/80" />
                  <p className="text-[11px] uppercase tracking-wide text-primary-foreground/70">
                    {s.label}
                  </p>
                  <p className="mt-0.5 truncate font-display text-sm font-bold sm:text-base">
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Search + Filter */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, Special ID or email…"
                  className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {(
                  [
                    { key: "all", label: "All" },
                    { key: "unpaid", label: "Unpaid" },
                    { key: "paid", label: "Paid" },
                  ] as { key: Filter; label: string }[]
                ).map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                      filter === f.key
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {f.label}
                    <span
                      className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                        filter === f.key ? "bg-primary-foreground/20" : "bg-background/80"
                      }`}
                    >
                      {filterCounts[f.key]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Students list */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading department fees…
        </div>
      ) : students.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-muted-foreground">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
              <ReceiptIndianRupee className="h-8 w-8" />
            </div>
            <p className="text-sm font-medium text-foreground">No fee records found</p>
            <p className="text-xs">No students in your department have fee records yet.</p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No students match your search.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((s, i) => {
            const name = `${s.student?.name ?? ""} ${s.student?.lastName ?? ""}`.trim();
            const sub = s.student?.specialId
              ? `${s.student.specialId}${s.student?.rollNo ? ` · Roll ${s.student.rollNo}` : ""}`
              : s.student?.rollNo
                ? `Roll ${s.student.rollNo}`
                : "—";
            const isExpanded = !!expanded[s.student?._id];
            const hasPending = (s.summary?.pendingCount ?? 0) > 0;
            const hasRecords = (s.feeRecords?.length ?? 0) > 0;

            return (
              <motion.div
                key={s.student?._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:border-primary/30"
              >
                <button
                  onClick={() =>
                    hasRecords &&
                    setExpanded((prev) => ({
                      ...prev,
                      [s.student._id]: !prev[s.student._id],
                    }))
                  }
                  className={`flex w-full items-center gap-4 p-4 text-left transition-colors ${
                    hasRecords ? "cursor-pointer hover:bg-secondary/40" : "cursor-default"
                  }`}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-bold uppercase text-primary-foreground ring-2 ring-primary/10">
                    {(name || "?").slice(0, 2)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm font-semibold text-foreground">
                      {name || "—"}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">
                        Paid {s.summary?.paidCount ?? 0}
                      </span>
                      {(s.summary?.pendingCount ?? 0) > 0 && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                          Pending {s.summary?.pendingCount}
                        </span>
                      )}
                      {(s.summary?.waivedCount ?? 0) > 0 && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                          Waived {s.summary?.waivedCount}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p
                      className={`font-display text-sm font-bold ${
                        hasPending ? "text-amber-700" : "text-green-700"
                      }`}
                    >
                      {formatCurrency(s.summary?.totalAmount ?? 0)}
                    </p>
                    {hasPending && (
                      <p className="mt-0.5 text-[11px] font-medium text-amber-700">
                        Due: {formatCurrency(s.summary?.pendingAmount ?? 0)}
                      </p>
                    )}
                    {hasRecords && (
                      <ChevronDown
                        className={`ml-auto mt-1 h-4 w-4 text-muted-foreground transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    )}
                  </div>
                </button>

                {isExpanded && hasRecords && (
                  <div className="border-t border-border bg-secondary/20 px-4 py-3">
                    <div className="space-y-2">
                      {s.feeRecords.map((r: any) => (
                        <div
                          key={r._id}
                          className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
                          style={{
                            borderColor:
                              r.status === "paid"
                                ? "rgba(16,185,129,0.35)"
                                : r.status === "waived"
                                  ? "rgba(59,130,246,0.35)"
                                  : "rgba(245,158,11,0.35)",
                            backgroundColor:
                              r.status === "paid"
                                ? "rgba(16,185,129,0.08)"
                                : r.status === "waived"
                                  ? "rgba(59,130,246,0.08)"
                                  : "rgba(245,158,11,0.08)",
                          }}
                        >
                          <div className="min-w-0">
                            {r.className && (
                              <p className="truncate text-xs font-semibold text-foreground">
                                {r.className}
                              </p>
                            )}
                            <p className="mt-0.5 text-xs font-medium text-foreground/80">
                              {monthYear(r)}
                            </p>
                            {r.description && (
                              <p className="mt-0.5 max-w-[300px] truncate text-[11px] text-muted-foreground">
                                {r.description}
                              </p>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-xs font-bold text-foreground">
                              {formatCurrency(Number(r.amount) || 0)}
                            </p>
                            <div className="mt-1">
                              <StatusBadge status={r.status} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}

          {pagination && pagination.totalPages > page && (
            <button
              onClick={() => load(page + 1, false)}
              disabled={loadingMore}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-medium text-primary transition-colors hover:bg-secondary disabled:opacity-60"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </>
              ) : (
                "Load more students"
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default HodDepartmentFee;