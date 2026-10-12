import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  BookOpen,
  Building2,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  GraduationCap,
  Inbox,
  RefreshCw,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import UserAvatar from "@/components/UserAvatar";
import { useHodDashboard } from "@/hooks/useHodDashboard";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Tokens & helpers                                                   */
/* ------------------------------------------------------------------ */

const COLORS = {
  present: "#10b981",
  absent: "#ef4444",
  leave: "#f59e0b",
  primary: "#f97316",
  blue: "#0ea5e9",
  violet: "#8b5cf6",
  teal: "#14b8a6",
  pink: "#ec4899",
  slate: "#94a3b8",
};

const CATEGORY_COLORS = [
  COLORS.primary,
  COLORS.blue,
  COLORS.violet,
  COLORS.teal,
  COLORS.pink,
  "#22c55e",
  "#a3a3a3",
];

/** Gender keys arrive as M / F / anything else. Keep the mapping explicit. */
const GENDER_COLOR: Record<string, string> = {
  M: COLORS.blue,
  F: COLORS.pink,
};

const GENDER_LABEL: Record<string, string> = {
  M: "Male",
  F: "Female",
};

/**
 * Semantic accents. Colour on this page always carries meaning — it is never
 * decorative — so the palette stays small: neutral by default, one accent when
 * a metric is good / needs attention / is critical.
 */
const ACCENT = {
  neutral: {
    tile: "bg-muted text-muted-foreground",
    text: "text-muted-foreground",
    bar: "bg-muted-foreground",
    soft: "bg-muted text-muted-foreground",
  },
  positive: {
    tile: "bg-emerald-50 text-emerald-700",
    text: "text-emerald-600",
    bar: "bg-emerald-500",
    soft: "bg-emerald-50 text-emerald-700",
  },
  caution: {
    tile: "bg-amber-50 text-amber-700",
    text: "text-amber-600",
    bar: "bg-amber-500",
    soft: "bg-amber-50 text-amber-700",
  },
  critical: {
    tile: "bg-rose-50 text-rose-700",
    text: "text-rose-600",
    bar: "bg-rose-500",
    soft: "bg-rose-50 text-rose-700",
  },
  info: {
    tile: "bg-sky-50 text-sky-700",
    text: "text-sky-600",
    bar: "bg-sky-500",
    soft: "bg-sky-50 text-sky-700",
  },
} as const;

type AccentName = keyof typeof ACCENT;

const numberFormatter = new Intl.NumberFormat("en-US");

const formatNumber = (n?: number) => numberFormatter.format(Number(n) || 0);

/** Full PKR amount — kept in the same "PKR x" form as the compact variant. */
const formatPKR = (n?: number) => `PKR ${numberFormatter.format(Number(n) || 0)}`;

const formatShortPKR = (n?: number) => {
  const v = Number(n) || 0;
  if (v >= 10000000) return `PKR ${(v / 10000000).toFixed(2)} Cr`;
  if (v >= 100000) return `PKR ${(v / 100000).toFixed(2)} Lac`;
  if (v >= 1000) return `PKR ${(v / 1000).toFixed(1)}k`;
  return `PKR ${formatNumber(v)}`;
};

const formatDay = (d?: string) => {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
};

const formatDateRange = (from?: string, to?: string) => {
  if (!from && !to) return "";
  const a = new Date(from || "");
  const b = new Date(to || "");
  const opts: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
  };
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return "";
  return `${a.toLocaleDateString("en-GB", opts)} — ${b.toLocaleDateString("en-GB", opts)}`;
};

const greeting = (date = new Date()) => {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

/** "Last synced" clock — professional dashboards state data freshness. */
const lastSyncedLabel = (ts?: number) => {
  if (!ts) return "";
  const mins = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (mins < 1) return "just now";
  if (mins === 1) return "1 min ago";
  if (mins < 60) return `${mins} mins ago`;
  const hrs = Math.round(mins / 60);
  return hrs === 1 ? "1 hour ago" : `${hrs} hours ago`;
};

const titleCase = (v?: string) =>
  v ? v.charAt(0).toUpperCase() + v.slice(1) : "—";

/** Categories come from the API as `bs` / `adp` / `bs_adp` — render them properly. */
const CATEGORY_LABEL: Record<string, string> = {
  intermediate: "Intermediate",
  bs: "BS",
  bs_adp: "BS / ADP",
  adp: "ADP",
};

const categoryLabel = (v?: string) => (v ? CATEGORY_LABEL[v] || titleCase(v) : "—");

const initialsOf = (name?: string, code?: string) => {
  const src = (name || code || "DP").trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return src.slice(0, 2).toUpperCase();
};

/** Attendance percentage → semantic accent (bar colour + text colour). */
const rateTone = (pct?: number): AccentName => {
  const v = Number(pct) || 0;
  if (v >= 90) return "positive";
  if (v >= 75) return "caution";
  return "critical";
};

const LEAVE_TONE: Record<string, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
  cancelled: "border-slate-200 bg-slate-100 text-slate-600",
};

/* ------------------------------------------------------------------ */
/*  Small building blocks                                              */
/* ------------------------------------------------------------------ */

const SectionHeading = ({ title, hint }: { title: string; hint?: string }) => (
  <div className="flex items-center gap-4">
    <h2 className="whitespace-nowrap font-display text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/70">
      {title}
    </h2>
    <span className="h-px flex-1 bg-border" />
    {hint && (
      <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">{hint}</span>
    )}
  </div>
);

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  hint?: string;
  accent?: AccentName;
  /** Adds a thin top rule in the accent colour — use for metrics that need a call to action. */
  flagged?: boolean;
  progress?: number;
  to?: string;
  delay?: number;
}

const StatCard = ({
  icon: Icon,
  label,
  value,
  hint,
  accent = "neutral",
  flagged = false,
  progress,
  to,
  delay = 0,
}: StatCardProps) => {
  const tone = ACCENT[accent];

  const body = (
    <Card
      className={cn(
        "group relative h-full overflow-hidden rounded-xl border-border/70 bg-card shadow-card transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-elevated",
        flagged && "border-accent/40",
      )}
    >
      {flagged && (
        <span
          className={cn("absolute inset-x-0 top-0 h-0.5", tone.bar)}
          aria-hidden="true"
        />
      )}

      <CardContent className="flex h-full flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {label}
          </p>
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-200",
              tone.tile,
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
        </div>

        <p className="mt-3 font-display text-[26px] font-bold leading-none tracking-tight text-foreground tabular-nums">
          {value}
        </p>

        <div className="mt-auto pt-2.5">
          {typeof progress === "number" && (
            <div className="mb-2.5 h-1 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={cn("h-full rounded-full", ACCENT[rateTone(progress)].bar)}
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          )}
          {hint && <p className="text-xs leading-snug text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25 }}
      className="h-full"
    >
      {to ? (
        <Link
          to={to}
          className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {body}
        </Link>
      ) : (
        body
      )}
    </motion.div>
  );
};

interface PanelProps {
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

const Panel = ({
  title,
  subtitle,
  icon: Icon,
  action,
  children,
  className,
  bodyClassName,
}: PanelProps) => (
  <Card
    className={cn(
      "flex flex-col overflow-hidden rounded-xl border-border/70 bg-card shadow-card",
      className,
    )}
  >
    <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 border-b border-border/70 bg-muted/20 px-5 py-3.5">
      <div className="flex min-w-0 items-center gap-2">
        {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />}
        <CardTitle className="shrink-0 whitespace-nowrap text-[13px] font-semibold tracking-tight text-foreground">
          {title}
        </CardTitle>
        {subtitle && (
          <span className="min-w-0 truncate text-xs text-muted-foreground">— {subtitle}</span>
        )}
      </div>
      {action}
    </CardHeader>
    <CardContent className="flex-1 p-5 pt-5">{children}</CardContent>
  </Card>
);

const YearFilter = ({
  years,
  value,
  onChange,
}: {
  years: number[];
  value: number;
  onChange: (year: number) => void;
}) => (
  <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-card p-1 shadow-sm">
    {years.map((y) => (
      <button
        key={y}
        type="button"
        aria-pressed={y === value}
        onClick={() => onChange(y)}
        className={cn(
          "rounded-md px-2.5 py-1.5 text-xs font-semibold tabular-nums transition-colors",
          y === value
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
        )}
      >
        {y}
      </button>
    ))}
  </div>
);

const axisProps = {
  tick: { fontSize: 11, fill: "hsl(var(--muted-foreground))" },
  axisLine: false,
  tickLine: false,
} as const;

/** Bottom-left padding is kept at 0 so Y-axis tick labels are never clipped. */
const chartMargin = { top: 6, right: 8, left: 0, bottom: 0 } as const;

const ChartTooltip = ({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  formatter?: (value: number) => string;
}) => {
  if (!active || !payload?.length) return null;
  const fmt = formatter || ((v: number) => formatNumber(v));
  return (
    <div className="rounded-lg border border-border bg-popover/95 px-3 py-2.5 text-xs shadow-modal backdrop-blur">
      {label && <p className="mb-2 font-display text-xs font-semibold text-foreground">{label}</p>}
      <div className="space-y-1.5">
        {payload.map((p: any) => (
          <p key={p.dataKey ?? p.name} className="flex items-center gap-2 text-muted-foreground">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: p.color || p.fill || p.payload?.fill }}
            />
            <span className="capitalize">{p.name}</span>
            <span className="ml-2 font-semibold text-foreground tabular-nums">
              {fmt(Number(p.value) || 0)}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
};

const EmptyHint = ({ text }: { text: string }) => (
  <div className="flex h-[200px] flex-col items-center justify-center gap-3 text-center">
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground">
      <Inbox className="h-5 w-5" />
    </span>
    <p className="max-w-[240px] text-sm text-muted-foreground">{text}</p>
  </div>
);

const LegendRow = ({
  color,
  label,
  value,
  hint,
}: {
  color: string;
  label: string;
  value: React.ReactNode;
  hint?: string;
}) => (
  <div className="py-1.5">
    <div className="flex items-center justify-between gap-3">
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
        <span className="min-w-0 truncate text-sm text-muted-foreground">{label}</span>
      </span>
      <span className="shrink-0 whitespace-nowrap font-semibold text-foreground tabular-nums">
        {value}
      </span>
    </div>
    {hint && <p className="mt-0.5 pl-[18px] text-[11px] tabular-nums text-muted-foreground/70">{hint}</p>}
  </div>
);

/** Compact metric tile used inside panels. */
const MetricTile = ({
  icon: Icon,
  label,
  value,
  accent = "neutral",
  centered,
}: {
  icon?: React.ElementType;
  label: string;
  value: React.ReactNode;
  accent?: AccentName;
  centered?: boolean;
}) => {
  const tone = ACCENT[accent];
  return (
    <div
      className={cn(
        "rounded-lg border border-border/70 bg-muted/30 px-3 py-2.5",
        centered && "text-center",
      )}
    >
      <p
        className={cn(
          "font-display text-xl font-bold leading-none text-foreground tabular-nums",
          centered && "text-center",
        )}
      >
        {value}
      </p>
      <p className="mt-1.5 flex items-center gap-1.5 text-[11px] leading-tight text-muted-foreground">
        {Icon && <Icon className={cn("h-3.5 w-3.5 shrink-0", tone.text)} />}
        <span className={cn(!Icon && centered && "text-center")}>{label}</span>
      </p>
    </div>
  );
};

const MeterBar = ({ percent, className }: { percent: number; className?: string }) => (
  <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-secondary", className)}>
    <div
      className={cn("h-full rounded-full transition-all duration-500", ACCENT[rateTone(percent)].bar)}
      style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
    />
  </div>
);

/* ------------------------------------------------------------------ */
/*  Data table primitives                                              */
/* ------------------------------------------------------------------ */

const TH = "px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground first:pl-0 last:pr-0";
const TH_ALIGNED = cn(TH, "text-right");
const TD = "px-4 py-3 text-sm first:pl-0 last:pr-0";
const TD_ALIGNED = cn(TD, "text-right tabular-nums");
const ROW = "border-t border-border/60 transition-colors hover:bg-muted/40";

/** Horizontally scrollable wrapper so wide tables never break the panel. */
const TableScroll = ({ children }: { children: React.ReactNode }) => (
  <div className="-mx-5 overflow-x-auto px-5">
    <table className="w-full border-collapse">{children}</table>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [0, 1, 2, 3, 4].map((i) => CURRENT_YEAR - i);

const HodDashboard = () => {
  const user = useSelector((state: any) => state?.user?.user);
  const [year, setYear] = useState<number>(CURRENT_YEAR);
  const { data, isLoading, isFetching, isError, error, refetch, dataUpdatedAt } =
    useHodDashboard(year);

  const attendanceTrend = useMemo(
    () =>
      (data?.attendance?.trend || []).map((d) => ({
        ...d,
        label: formatDay(d.date),
      })),
    [data],
  );

  const classBar = useMemo(
    () =>
      (data?.students?.byClass || []).map((c) => ({
        name: c.class || "—",
        count: c.count,
      })),
    [data],
  );

  const categoryPie = useMemo(
    () =>
      (data?.students?.byCategory || []).map((c) => ({
        name: categoryLabel(c.category),
        value: c.count,
      })),
    [data],
  );

  const feeSlices = useMemo(
    () => [
      { name: "Paid", value: data?.fee?.paidAmount || 0, color: COLORS.present },
      { name: "Pending", value: data?.fee?.pendingAmount || 0, color: COLORS.leave },
      { name: "Waived", value: data?.fee?.waivedAmount || 0, color: COLORS.slate },
    ],
    [data],
  );

  const genderEntries = useMemo(
    () =>
      Object.entries(data?.students?.byGender || {})
        .map(([g, v]) => ({ g, v: Number(v) || 0 }))
        .sort((a, b) => b.v - a.v),
    [data],
  );

  const teacherTrend = useMemo(
    () =>
      (data?.teacherAttendance?.trend || []).map((d) => ({
        ...d,
        label: formatDay(d.date),
      })),
    [data],
  );

  /* ---------------- loading ---------------- */
  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[104px] w-full rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <Skeleton className="h-80 w-full rounded-xl xl:col-span-2" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  /* ---------------- error ---------------- */
  if (isError) {
    return (
      <Card className="mx-auto mt-10 max-w-lg rounded-xl border-destructive/30 shadow-card">
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-6 w-6" />
          </span>
          <h2 className="font-display text-lg font-bold">Dashboard unavailable</h2>
          <p className="text-sm text-muted-foreground">
            {(error as Error)?.message || "Could not load your department dashboard."}
          </p>
          <Button onClick={() => refetch()} className="mt-2">
            <RefreshCw className="h-4 w-4" /> Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const {
    summary,
    students,
    teachers,
    classes,
    attendance,
    teacherAttendance,
    fee,
    leave,
    remarks,
    midterm,
    department,
    range,
  } = data;

  const departmentLabel = department?.name || "Department";
  const totalEnrolled = students.total || 0;

  const attention = [
    {
      icon: ClipboardList,
      label: "Pending leaves",
      count: summary.pendingLeaves,
      to: "/professor/settings/student-leaves",
      accent: "caution" as AccentName,
    },
    {
      icon: Wallet,
      label: "Pending fees",
      count: summary.pendingFees,
      to: "/professor/settings/department-fee",
      accent: "critical" as AccentName,
    },
    {
      icon: UserCheck,
      label: "Approvals",
      count: students.pendingApproval,
      to: "/professor/department/student-registration",
      accent: "info" as AccentName,
    },
    {
      icon: CalendarCheck,
      label: "Absentees today",
      count: summary.todayAbsent,
      to: "/professor/settings/today-attendance",
      accent: "info" as AccentName,
    },
  ].filter((a) => Number(a.count) > 0);

  return (
    <div className="space-y-7">
      {/* ============== Page header ============== */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="overflow-hidden rounded-xl border-border/70 bg-card shadow-card">
          <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted/50 font-display text-sm font-bold tracking-tight text-foreground">
                {initialsOf(department?.name, department?.code)}
              </span>

              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Department overview
                </p>

                <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-foreground">
                  {departmentLabel}
                </h1>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {department?.code && (
                    <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      {department.code}
                    </span>
                  )}
                  {department?.category && (
                    <Badge variant="outline" className="font-medium">
                      {categoryLabel(department.category)}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {greeting()}
                    {user?.name ? `, ${user.name}` : ""}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatDateRange(range?.from, range?.to) || "Current session"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Updated {lastSyncedLabel(dataUpdatedAt) || "just now"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </span>
                    Live
                  </span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <YearFilter years={YEAR_OPTIONS} value={year} onChange={setYear} />
              <Button
                variant="outline"
                size="icon"
                aria-label="Refresh dashboard"
                onClick={() => refetch()}
                className="h-9 w-9"
              >
                <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ============== Needs attention ============== */}
      {attention.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.25 }}
        >
          <Card className="rounded-xl border-border/70 shadow-card">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5">
              <p className="shrink-0 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Needs attention
              </p>
              <div className="grid flex-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {attention.map((a) => (
                  <Link
                    key={a.label}
                    to={a.to}
                    className="group flex items-center gap-3 rounded-lg border border-border/70 bg-muted/30 px-3 py-2.5 transition-colors hover:border-foreground/20 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        ACCENT[a.accent].tile,
                      )}
                    >
                      <a.icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-sm font-bold leading-tight text-foreground tabular-nums">
                        {formatNumber(a.count)}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] leading-tight text-muted-foreground">
                        {a.label}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ============== KPI cards ============== */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          icon={Users}
          label="Total Students"
          value={formatNumber(summary.totalStudents)}
          hint={`${formatNumber(students.active)} active · ${formatNumber(students.struckOff)} struck off`}
          accent="info"
          to="/professor/department/students"
          delay={0}
        />
        <StatCard
          icon={GraduationCap}
          label="Faculty"
          value={formatNumber(summary.totalTeachers)}
          hint={`${formatNumber(teachers.proff)} professors · ${formatNumber(teachers.staff)} staff`}
          accent="info"
          to="/professor/department/faculty"
          delay={0.04}
        />
        <StatCard
          icon={BookOpen}
          label="Classes"
          value={formatNumber(summary.totalClasses)}
          hint={`${formatNumber(students.pendingApproval)} registrations pending`}
          accent="info"
          to="/professor/department/classes"
          delay={0.08}
        />
        <StatCard
          icon={CalendarCheck}
          label="Attendance Today"
          value={`${summary.attendancePercent}%`}
          hint={`${formatNumber(summary.todayPresent)} present · ${formatNumber(summary.todayAbsent)} absent`}
          progress={summary.attendancePercent}
          accent={rateTone(summary.attendancePercent)}
          delay={0.12}
        />
        <StatCard
          icon={ClipboardList}
          label="Pending Leaves"
          value={formatNumber(summary.pendingLeaves)}
          hint={`${formatNumber(summary.approvedLeaves)} approved this period`}
          accent={summary.pendingLeaves > 0 ? "caution" : "positive"}
          flagged={summary.pendingLeaves > 0}
          to="/professor/settings/student-leaves"
          delay={0.16}
        />
        <StatCard
          icon={Wallet}
          label="Fee Collection"
          value={`${summary.collectionPercent}%`}
          hint={`${formatNumber(summary.pendingFees)} records pending`}
          progress={summary.collectionPercent}
          accent={rateTone(summary.collectionPercent)}
          to="/professor/settings/department-fee"
          delay={0.2}
        />
      </div>

      {/* ============== Attendance ============== */}
      <div className="space-y-4">
        <SectionHeading title="Attendance" hint="Last 7 days vs today" />

        <div className="grid gap-4 xl:grid-cols-3">
          <Panel
            className="xl:col-span-2"
            icon={TrendingUp}
            title="Attendance trend"
            subtitle="Present, absent and leave over the last 7 days"
          >
            {attendanceTrend.length ? (
              <div className="h-[264px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={attendanceTrend} margin={chartMargin}>
                    <defs>
                      <linearGradient id="gradPresent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.present} stopOpacity={0.28} />
                        <stop offset="95%" stopColor={COLORS.present} stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="gradAbsent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.absent} stopOpacity={0.24} />
                        <stop offset="95%" stopColor={COLORS.absent} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" {...axisProps} />
                    <YAxis {...axisProps} width={38} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: "hsl(var(--border))" }} />
                    <Area type="monotone" dataKey="present" name="Present" stroke={COLORS.present} strokeWidth={2} fill="url(#gradPresent)" />
                    <Area type="monotone" dataKey="absent" name="Absent" stroke={COLORS.absent} strokeWidth={2} fill="url(#gradAbsent)" />
                    <Area type="monotone" dataKey="leave" name="Leave" stroke={COLORS.leave} strokeWidth={2} fillOpacity={0} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyHint text="No attendance recorded in the last 7 days." />
            )}
          </Panel>

          <Panel icon={CalendarDays} title="Today's attendance" subtitle="Live snapshot">
            {attendance.today.total ? (
              <div className="flex h-full flex-col justify-center">
                <div className="relative mx-auto h-[184px] w-full max-w-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Present", value: attendance.today.present },
                          { name: "Absent", value: attendance.today.absent },
                          { name: "Leave", value: attendance.today.leave },
                        ].filter((r) => r.value > 0)}
                        dataKey="value"
                        innerRadius={58}
                        outerRadius={80}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {[COLORS.present, COLORS.absent, COLORS.leave].map((c) => (
                          <Cell key={c} fill={c} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-display text-2xl font-bold text-foreground tabular-nums">
                      {attendance.today.percent}%
                    </span>
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      present
                    </span>
                  </div>
                </div>

                <div className="mt-4 divide-y divide-border/60">
                  <LegendRow
                    color={COLORS.present}
                    label="Present"
                    value={formatNumber(attendance.today.present)}
                    hint={`${attendance.today.total ? Math.round((attendance.today.present / attendance.today.total) * 100) : 0}%`}
                  />
                  <LegendRow
                    color={COLORS.absent}
                    label="Absent"
                    value={formatNumber(attendance.today.absent)}
                    hint={`${attendance.today.total ? Math.round((attendance.today.absent / attendance.today.total) * 100) : 0}%`}
                  />
                  <LegendRow
                    color={COLORS.leave}
                    label="Leave"
                    value={formatNumber(attendance.today.leave)}
                    hint={`${attendance.today.total ? Math.round((attendance.today.leave / attendance.today.total) * 100) : 0}%`}
                  />
                </div>
              </div>
            ) : (
              <EmptyHint text="Attendance not marked today yet." />
            )}
          </Panel>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Panel
            className="xl:col-span-2"
            icon={CalendarCheck}
            title="Class-wise attendance"
            subtitle={`${attendance.byClass.length} classes reporting today`}
          >
            {attendance.byClass.length ? (
              <TableScroll>
                <thead>
                  <tr>
                    <th className={TH}>Class</th>
                    <th className={TH_ALIGNED}>Present</th>
                    <th className={TH_ALIGNED}>Absent</th>
                    <th className={TH_ALIGNED}>Leave</th>
                    <th className={cn(TH_ALIGNED, "w-[190px]")}>Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.byClass.map((c) => (
                    <tr key={c.classId} className={ROW}>
                      <td className={cn(TD, "font-medium text-foreground")}>{c.className}</td>
                      <td className={cn(TD_ALIGNED, "text-emerald-600")}>{formatNumber(c.present)}</td>
                      <td className={cn(TD_ALIGNED, "text-rose-600")}>{formatNumber(c.absent)}</td>
                      <td className={cn(TD_ALIGNED, "text-amber-600")}>{formatNumber(c.leave)}</td>
                      <td className={cn(TD, "text-right")}>
                        <div className="flex items-center justify-end gap-2.5">
                          <MeterBar percent={c.percent} className="w-24" />
                          <span className={cn("w-10 font-semibold tabular-nums", ACCENT[rateTone(c.percent)].text)}>
                            {c.percent}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableScroll>
            ) : (
              <EmptyHint text="No class-level attendance for today." />
            )}
          </Panel>

          <Panel icon={UserCheck} title="Teacher attendance" subtitle="Today and 7-day trend">
            <div className="grid grid-cols-3 gap-2.5">
              <MetricTile
                label="Checked in"
                value={formatNumber(teacherAttendance.today.checkedIn)}
                accent="positive"
                centered
              />
              <MetricTile
                label="Checked out"
                value={formatNumber(teacherAttendance.today.checkedOut)}
                accent="info"
                centered
              />
              <MetricTile
                label="Absent"
                value={formatNumber(teacherAttendance.today.absent)}
                accent="critical"
                centered
              />
            </div>

            {teacherTrend.length ? (
              <div className="mt-5 h-[140px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={teacherTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="checkedIn" name="Checked in" stroke={COLORS.primary} strokeWidth={2} fill={COLORS.primary} fillOpacity={0.12} />
                    <Area type="monotone" dataKey="checkedOut" name="Checked out" stroke={COLORS.blue} strokeWidth={2} fillOpacity={0} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No teacher attendance in the last 7 days.
              </p>
            )}
          </Panel>
        </div>
      </div>

      {/* ============== Enrolment & finance ============== */}
      <div className="space-y-4">
        <SectionHeading title="Enrolment & finance" hint={`Financial year ${fee.year}`} />

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel icon={Wallet} title="Fee collection" subtitle={`Year ${fee.year} · ${formatNumber(fee.totalRecords)} records`}>
            {fee.totalAmount ? (
              <div className="flex flex-col items-center gap-5 xl:flex-row xl:items-center xl:gap-6">
                <div className="relative h-[168px] w-[168px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={feeSlices.filter((s) => s.value > 0)} dataKey="value" innerRadius={55} outerRadius={78} paddingAngle={2} stroke="none">
                        {feeSlices.map((s) => (
                          <Cell key={s.name} fill={s.color || COLORS.slate} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip formatter={formatShortPKR} />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-display text-xl font-bold text-foreground tabular-nums">
                      {fee.collectionPercent}%
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      collected
                    </span>
                  </div>
                </div>

                <div className="w-full min-w-0 flex-1">
                  <div className="divide-y divide-border/60">
                    <LegendRow
                      color={COLORS.present}
                      label="Paid"
                      hint={`${formatNumber(fee.paidCount)} students`}
                      value={formatShortPKR(fee.paidAmount)}
                    />
                    <LegendRow
                      color={COLORS.leave}
                      label="Pending"
                      hint={`${formatNumber(fee.pendingCount)} students`}
                      value={formatShortPKR(fee.pendingAmount)}
                    />
                    <LegendRow
                      color={COLORS.slate}
                      label="Waived"
                      hint={`${formatNumber(fee.waivedCount)} students`}
                      value={formatShortPKR(fee.waivedAmount)}
                    />
                  </div>

                  <div className="mt-4 border-t border-border/60 pt-3">
                    <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                      <span className="text-muted-foreground">Total billed</span>
                      <span className="whitespace-nowrap font-semibold text-foreground tabular-nums">
                        {formatPKR(fee.totalAmount)}
                      </span>
                    </div>
                    <MeterBar percent={fee.collectionPercent} />
                  </div>
                </div>
              </div>
            ) : (
              <EmptyHint text={`No fee records for ${fee.year}.`} />
            )}
          </Panel>

          <Panel icon={Users} title="Students by class" subtitle="Distribution across classes">
            {classBar.length ? (
              <div className="h-[252px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classBar} margin={chartMargin}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" {...axisProps} />
                    <YAxis {...axisProps} width={38} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }} />
                    <Bar dataKey="count" name="Students" fill={COLORS.primary} radius={[6, 6, 0, 0]} maxBarSize={46} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyHint text="No students enrolled yet." />
            )}
          </Panel>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Panel icon={GraduationCap} title="Students by category" bodyClassName="flex h-full flex-col justify-center">
            {categoryPie.length ? (
              <>
                <div className="h-[176px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryPie} dataKey="value" innerRadius={45} outerRadius={72} paddingAngle={2} stroke="none">
                        {categoryPie.map((_, i) => (
                          <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 divide-y divide-border/60">
                  {categoryPie.map((c, i) => (
                    <LegendRow
                      key={c.name}
                      color={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                      label={c.name}
                      hint={`${totalEnrolled ? Math.round((c.value / totalEnrolled) * 100) : 0}%`}
                      value={formatNumber(c.value)}
                    />
                  ))}
                </div>
              </>
            ) : (
              <EmptyHint text="No category data." />
            )}
          </Panel>

          <Panel icon={CalendarDays} title="Students by session">
            {data.students.bySession.length ? (
              <div className="h-[252px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.students.bySession} margin={chartMargin}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="session" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis {...axisProps} width={38} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }} />
                    <Bar dataKey="count" name="Students" fill={COLORS.blue} radius={[6, 6, 0, 0]} maxBarSize={42} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyHint text="No session data." />
            )}
          </Panel>

          <Panel icon={UserCheck} title="Student status" subtitle="Live enrolment health">
            <div className="grid grid-cols-2 gap-2.5">
              <MetricTile label="Active" value={formatNumber(students.active)} accent="positive" />
              <MetricTile label="On leave" value={formatNumber(students.onLeave)} accent="caution" />
              <MetricTile label="Applied leave" value={formatNumber(students.appliedLeave)} accent="info" />
              <MetricTile label="Pending approval" value={formatNumber(students.pendingApproval)} accent="info" />
              <MetricTile label="Struck off" value={formatNumber(students.struckOff)} accent="critical" />
              <MetricTile label="Total enrolled" value={formatNumber(students.total)} accent="neutral" />
            </div>

            {genderEntries.length > 0 && (
              <div className="mt-5 border-t border-border/60 pt-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Gender split
                </p>
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-secondary">
                  {genderEntries.map((e) => (
                    <div
                      key={e.g}
                      style={{
                        width: `${totalEnrolled ? (e.v / totalEnrolled) * 100 : 0}%`,
                        background: GENDER_COLOR[e.g] || COLORS.violet,
                      }}
                      title={`${GENDER_LABEL[e.g] || e.g}: ${e.v}`}
                    />
                  ))}
                </div>
                <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
                  {genderEntries.map((e) => (
                    <span key={e.g} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: GENDER_COLOR[e.g] || COLORS.violet }}
                      />
                      {GENDER_LABEL[e.g] || e.g}
                      <span className="font-semibold text-foreground tabular-nums">
                        {formatNumber(e.v)}
                      </span>
                      <span className="tabular-nums text-muted-foreground/70">
                        ({totalEnrolled ? Math.round((e.v / totalEnrolled) * 100) : 0}%)
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Panel>
        </div>
      </div>

      {/* ============== Classes ============== */}
      <div className="space-y-4">
        <SectionHeading title="Classes" hint={`${classes.length} in this department`} />

        <Panel icon={BookOpen} title="Class directory" subtitle="Students, teachers and subjects per class">
          {classes.length ? (
            <TableScroll>
              <thead>
                  <tr className="border-b border-border">
                    <th className={TH}>Class</th>
                    <th className={TH}>Category</th>
                    <th className={TH}>Session</th>
                    <th className={TH_ALIGNED}>Students</th>
                    <th className={TH_ALIGNED}>Teachers</th>
                    <th className={TH_ALIGNED}>Subjects</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((c) => (
                    <tr key={c._id} className={ROW}>
                      <td className={cn(TD, "font-medium text-foreground")}>{c.className}</td>
                      <td className={TD}>
                        <Badge variant="secondary" className="font-medium">
                          {categoryLabel(c.category)}
                        </Badge>
                      </td>
                      <td className={cn(TD, "text-muted-foreground")}>{c.session || "—"}</td>
                      <td className={cn(TD_ALIGNED, "font-semibold text-foreground")}>
                        {formatNumber(c.students)}
                      </td>
                      <td className={cn(TD_ALIGNED, "text-muted-foreground")}>
                        {formatNumber(c.teachers)}
                      </td>
                      <td className={cn(TD_ALIGNED, "text-muted-foreground")}>
                        {formatNumber(c.subjects)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-muted/40">
                    <td className={cn(TD, "text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground")}>
                      Total
                    </td>
                    <td className={TD} />
                    <td className={TD} />
                    <td className={cn(TD_ALIGNED, "font-display font-bold text-foreground")}>
                      {formatNumber(classes.reduce((s, c) => s + (Number(c.students) || 0), 0))}
                    </td>
                    <td className={cn(TD_ALIGNED, "font-display font-bold text-foreground")}>
                      {formatNumber(classes.reduce((s, c) => s + (Number(c.teachers) || 0), 0))}
                    </td>
                    <td className={cn(TD_ALIGNED, "font-display font-bold text-foreground")}>
                      {formatNumber(classes.reduce((s, c) => s + (Number(c.subjects) || 0), 0))}
                    </td>
                  </tr>
                </tfoot>
            </TableScroll>
          ) : (
            <EmptyHint text="No classes in this department yet." />
          )}
        </Panel>
      </div>

      {/* ============== People & operations ============== */}
      <div className="space-y-4">
        <SectionHeading title="People & operations" hint="Items awaiting your attention" />

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel icon={AlertTriangle} title="Top absentees" subtitle="Most absences in selected range">
            {attendance.topAbsentStudents.length ? (
              <ul className="divide-y divide-border/60">
                {attendance.topAbsentStudents.map((s, i) => (
                  <li key={s.studentId || i} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className="w-4 shrink-0 text-xs font-bold text-muted-foreground tabular-nums">
                      {i + 1}
                    </span>
                    <UserAvatar image={s.image} name={s.name} className="h-9 w-9" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{s.name || "Unknown"}</p>
                      <p className="truncate text-xs text-muted-foreground">{s.specialId || "—"}</p>
                    </div>
                    <Badge className="shrink-0 border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-50">
                      {formatNumber(s.absentCount)} absences
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyHint text="No absences recorded in this period." />
            )}
          </Panel>

          <Panel
            icon={ClipboardList}
            title="Recent leave requests"
            subtitle={`${leave.total} total · avg ${leave.avgDays} days`}
          >
            {leave.recent.length ? (
              <ul className="divide-y divide-border/60">
                {leave.recent.map((l) => (
                  <li key={l.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <UserAvatar image={l.studentImage} name={l.studentName} className="h-9 w-9" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {l.studentName || "Student"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {l.leaveTypeName || "Leave"} · {formatDay(l.fromDate)} – {formatDay(l.toDate)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize",
                        LEAVE_TONE[l.status] || LEAVE_TONE.cancelled,
                      )}
                    >
                      {l.status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyHint text="No leave requests yet." />
            )}
          </Panel>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel icon={GraduationCap} title="Faculty by role" subtitle={`${teachers.total} total · ${teachers.active} active`}>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <MetricTile label="Professors" value={formatNumber(teachers.proff)} accent="neutral" centered />
              <MetricTile label="Staff" value={formatNumber(teachers.staff)} accent="neutral" centered />
              <MetricTile label="HODs" value={formatNumber(teachers.hod)} accent="neutral" centered />
              <MetricTile label="Principals" value={formatNumber(teachers.principal)} accent="neutral" centered />
            </div>

            {leave.byType.length > 0 && (
              <div className="mt-5 border-t border-border/60 pt-4">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Leave requests by type
                </p>
                <div className="space-y-2.5">
                  {leave.byType.map((t) => {
                    const max = Math.max(...leave.byType.map((x) => Number(x.count) || 0), 1);
                    return (
                      <div key={t.type}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="truncate text-muted-foreground">{titleCase(t.type)}</span>
                          <span className="font-semibold text-foreground tabular-nums">
                            {formatNumber(t.count)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${((Number(t.count) || 0) / max) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Panel>

          <Panel icon={CalendarCheck} title="Midterm schedule" subtitle="Papers & publication status">
            <div className="grid grid-cols-3 gap-2.5">
              <MetricTile
                icon={BookOpen}
                label="Classes"
                value={formatNumber(midterm.totalClasses)}
                accent="neutral"
                centered
              />
              <MetricTile
                icon={CheckCircle2}
                label="Published"
                value={formatNumber(midterm.publishedClasses)}
                accent="positive"
                centered
              />
              <MetricTile
                icon={Clock}
                label="Upcoming"
                value={formatNumber(midterm.upcomingPapers)}
                accent="caution"
                centered
              />
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Schedules published</span>
                <span className="font-semibold text-foreground tabular-nums">
                  {midterm.publishedClasses}/{midterm.totalClasses}
                </span>
              </div>
              <MeterBar
                percent={
                  midterm.totalClasses ? (midterm.publishedClasses / midterm.totalClasses) * 100 : 0
                }
              />
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-lg border border-border/70 bg-muted/40 p-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="h-4 w-4" />
              </span>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {midterm.upcomingPapers
                  ? `${midterm.upcomingPapers} upcoming paper${
                      midterm.upcomingPapers > 1 ? "s" : ""
                    } scheduled across the department.`
                  : "No upcoming papers scheduled right now."}
              </p>
            </div>
          </Panel>
        </div>
      </div>

      {/* ============== Remarks ============== */}
      <div className="space-y-4">
        <SectionHeading title="Remarks" hint={`${formatNumber(remarks.total)} from faculty`} />

        <Panel icon={FileText} title="Recent remarks" subtitle="Latest notes added by department staff">
          {remarks.recent.length ? (
            <ul className="space-y-4">
              {remarks.recent.map((r) => (
                <li key={r.id} className="flex gap-3">
                  <UserAvatar image={r.authorImage} name={r.authorName} className="h-9 w-9" />
                  <div className="min-w-0 flex-1 border-l-2 border-border pl-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{r.authorName || "Staff"}</p>
                      <Badge variant="outline" className="font-medium capitalize">
                        {r.authorRole || r.entityType || "remark"}
                      </Badge>
                      <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">
                        {formatDay(r.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{r.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyHint text="No remarks recorded yet." />
          )}
        </Panel>
      </div>
    </div>
  );
};

export default HodDashboard;