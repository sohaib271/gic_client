import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
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
  LayoutDashboard,
  RefreshCw,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  slate: "#64748b",
};

const PIE_COLORS = [
  COLORS.primary,
  COLORS.blue,
  COLORS.violet,
  COLORS.teal,
  COLORS.pink,
  "#22c55e",
  "#a3a3a3",
];

const formatNumber = (n?: number) =>
  new Intl.NumberFormat("en-US").format(Number(n) || 0);

const formatPKR = (n?: number) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

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

const LEAVE_TONE: Record<string, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
  cancelled: "border-slate-200 bg-slate-100 text-slate-600",
};

const titleCase = (v?: string) =>
  v ? v.charAt(0).toUpperCase() + v.slice(1) : "—";

/* ------------------------------------------------------------------ */
/*  Small building blocks                                              */
/* ------------------------------------------------------------------ */

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  hint?: string;
  tone: string;
  delay?: number;
}

const StatCard = ({ icon: Icon, label, value, hint, tone, delay = 0 }: StatCardProps) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
    <Card className="group relative h-full overflow-hidden border-border/60 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="mt-2 font-display text-2xl font-bold leading-none text-foreground">{value}</p>
            {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
          </div>
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", tone)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

interface PanelProps {
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

const Panel = ({ title, subtitle, icon: Icon, action, children, className, bodyClassName }: PanelProps) => (
  <Card className={cn("border-border/60 shadow-sm", className)}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
      <div className="flex items-center gap-2.5">
        {Icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <div>
          <CardTitle className="text-sm font-semibold sm:text-base">{title}</CardTitle>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {action}
    </CardHeader>
    <CardContent className={bodyClassName}>{children}</CardContent>
  </Card>
);

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-background/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
      {label && <p className="mb-1.5 font-semibold text-foreground">{label}</p>}
      <div className="space-y-1">
        {payload.map((p: any) => (
          <p key={p.dataKey ?? p.name} className="flex items-center gap-2 text-muted-foreground">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: p.color || p.fill || p.payload?.fill }}
            />
            <span className="capitalize">{p.name}</span>
            <span className="ml-auto font-semibold text-foreground">{formatNumber(p.value)}</span>
          </p>
        ))}
      </div>
    </div>
  );
};

const EmptyHint = ({ text }: { text: string }) => (
  <div className="flex h-[220px] flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
    <FileText className="h-6 w-6 opacity-40" />
    {text}
  </div>
);

const LegendRow = ({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex items-center justify-between gap-3 text-sm">
    <span className="flex items-center gap-2 text-muted-foreground">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
    <span className="font-semibold text-foreground">{value}</span>
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
  const { data, isLoading, isFetching, isError, error, refetch } = useHodDashboard(year);

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
        name: titleCase(c.category),
        value: c.count,
      })),
    [data],
  );

  const feePie = useMemo(() => {
    const fee = data?.fee;
    if (!fee) return [];
    return [
      { name: "Paid", value: fee.paidAmount },
      { name: "Pending", value: fee.pendingAmount },
      { name: "Waived", value: fee.waivedAmount },
    ].filter((r) => r.value > 0);
  }, [data]);

  const genderEntries = useMemo(
    () => Object.entries(data?.students?.byGender || {}),
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
        <Skeleton className="h-36 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
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
      <Card className="mx-auto mt-10 max-w-lg border-destructive/30 shadow-sm">
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-6 w-6" />
          </span>
          <h2 className="font-display text-lg font-bold">Dashboard unavailable</h2>
          <p className="text-sm text-muted-foreground">
            {(error as Error)?.message || "Could not load your department dashboard."}
          </p>
          <Button onClick={() => refetch()} className="mt-2 gap-2">
            <RefreshCw className="h-4 w-4" /> Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { summary, students, teachers, classes, attendance, teacherAttendance, fee, leave, remarks, midterm, department, range } = data;

  const departmentLabel = department?.name || "Department";
  const totalEnrolled = students.total || 0;

  return (
    <div className="space-y-6">
      {/* ============== Hero ============== */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/95 to-accent p-5 text-primary-foreground shadow-lg sm:p-7"
      >
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 right-24 h-44 w-44 rounded-full bg-black/10 blur-2xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-medium text-primary-foreground/90">
              <LayoutDashboard className="h-4 w-4" />
              {greeting()}, {user?.name || "HOD"}
            </p>
            <h1 className="mt-1 flex flex-wrap items-center gap-2 font-display text-2xl font-bold sm:text-3xl">
              {departmentLabel}
              {department?.code && (
                <span className="rounded-md bg-white/20 px-2 py-0.5 text-sm font-semibold tracking-wide">
                  {department.code}
                </span>
              )}
            </h1>
            <p className="mt-1.5 text-sm text-primary-foreground/85">
              Department overview
              {range?.from && range?.to ? ` · ${formatDateRange(range.from, range.to)}` : ""}
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              {[
                { icon: Users, label: `${formatNumber(summary.totalStudents)} Students` },
                { icon: GraduationCap, label: `${formatNumber(summary.totalTeachers)} Faculty` },
                { icon: BookOpen, label: `${formatNumber(summary.totalClasses)} Classes` },
              ].map((chip) => (
                <span
                  key={chip.label}
                  className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur"
                >
                  <chip.icon className="h-3.5 w-3.5" />
                  {chip.label}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="h-9 w-[120px] border-white/30 bg-white/15 text-primary-foreground focus:ring-white/40">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {YEAR_OPTIONS.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    Year {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => refetch()}
              className="h-9 gap-2 bg-white/15 text-primary-foreground hover:bg-white/25"
            >
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ============== KPI cards ============== */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          icon={Users}
          label="Total Students"
          value={formatNumber(summary.totalStudents)}
          hint={`${formatNumber(students.active)} active`}
          tone="bg-sky-100 text-sky-600"
          delay={0}
        />
        <StatCard
          icon={GraduationCap}
          label="Faculty"
          value={formatNumber(summary.totalTeachers)}
          hint={`${formatNumber(teachers.proff)} professors`}
          tone="bg-violet-100 text-violet-600"
          delay={0.04}
        />
        <StatCard
          icon={BookOpen}
          label="Classes"
          value={formatNumber(summary.totalClasses)}
          hint={`${formatNumber(students.pendingApproval)} pending approvals`}
          tone="bg-teal-100 text-teal-600"
          delay={0.08}
        />
        <StatCard
          icon={CalendarCheck}
          label="Attendance Today"
          value={`${summary.attendancePercent}%`}
          hint={`${formatNumber(summary.todayPresent)} present · ${formatNumber(summary.todayAbsent)} absent`}
          tone="bg-emerald-100 text-emerald-600"
          delay={0.12}
        />
        <StatCard
          icon={ClipboardList}
          label="Pending Leaves"
          value={formatNumber(summary.pendingLeaves)}
          hint={`${formatNumber(summary.approvedLeaves)} approved`}
          tone="bg-amber-100 text-amber-600"
          delay={0.16}
        />
        <StatCard
          icon={Wallet}
          label="Fee Collection"
          value={`${summary.collectionPercent}%`}
          hint={`${formatNumber(summary.pendingFees)} pending`}
          tone="bg-rose-100 text-rose-600"
          delay={0.2}
        />
      </div>

      {/* ============== Attendance ============== */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          icon={TrendingUp}
          title="Attendance trend"
          subtitle="Last 7 days · present vs absent vs leave"
        >
          {attendanceTrend.length ? (
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={attendanceTrend} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradPresent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.present} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={COLORS.present} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradAbsent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.absent} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.absent} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
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
            <div className="flex flex-col items-center">
              <div className="relative h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Present", value: attendance.today.present, fill: COLORS.present },
                        { name: "Absent", value: attendance.today.absent, fill: COLORS.absent },
                        { name: "Leave", value: attendance.today.leave, fill: COLORS.leave },
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
                  <span className="font-display text-2xl font-bold">{attendance.today.percent}%</span>
                  <span className="text-[11px] text-muted-foreground">present</span>
                </div>
              </div>
              <div className="mt-2 w-full space-y-2">
                <LegendRow color={COLORS.present} label="Present" value={formatNumber(attendance.today.present)} />
                <LegendRow color={COLORS.absent} label="Absent" value={formatNumber(attendance.today.absent)} />
                <LegendRow color={COLORS.leave} label="Leave" value={formatNumber(attendance.today.leave)} />
              </div>
            </div>
          ) : (
            <EmptyHint text="Attendance not marked today yet." />
          )}
        </Panel>
      </div>

      {/* ============== Fee + students by class ============== */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel icon={Wallet} title="Fee collection" subtitle={`Year ${fee.year}`}>
          {fee.totalAmount ? (
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <div className="relative h-[170px] w-[170px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={feePie} dataKey="value" innerRadius={55} outerRadius={78} paddingAngle={2} stroke="none">
                      {feePie.map((_, i) => (
                        <Cell key={i} fill={[COLORS.present, COLORS.absent, COLORS.slate][i]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-xl font-bold">{fee.collectionPercent}%</span>
                  <span className="text-[11px] text-muted-foreground">collected</span>
                </div>
              </div>
              <div className="w-full space-y-3">
                <LegendRow color={COLORS.present} label={`Paid (${formatNumber(fee.paidCount)})`} value={formatShortPKR(fee.paidAmount)} />
                <LegendRow color={COLORS.absent} label={`Pending (${formatNumber(fee.pendingCount)})`} value={formatShortPKR(fee.pendingAmount)} />
                <LegendRow color={COLORS.slate} label={`Waived (${formatNumber(fee.waivedCount)})`} value={formatShortPKR(fee.waivedAmount)} />
                <div className="border-t pt-3">
                  <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Total {formatPKR(fee.totalAmount)}</span>
                    <span>{formatNumber(fee.totalRecords)} records</span>
                  </div>
                  <Progress value={fee.collectionPercent} className="h-2" />
                </div>
              </div>
            </div>
          ) : (
            <EmptyHint text={`No fee records for ${fee.year}.`} />
          )}
        </Panel>

        <Panel icon={Users} title="Students by class" subtitle="Distribution across classes">
          {classBar.length ? (
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classBar} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
                  <Bar dataKey="count" name="Students" fill={COLORS.primary} radius={[6, 6, 0, 0]} maxBarSize={46} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyHint text="No students enrolled yet." />
          )}
        </Panel>
      </div>

      {/* ============== Breakdown ============== */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel icon={GraduationCap} title="Students by category">
          {categoryPie.length ? (
            <>
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryPie} dataKey="value" innerRadius={45} outerRadius={72} paddingAngle={2} stroke="none">
                      {categoryPie.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 space-y-2">
                {categoryPie.map((c, i) => (
                  <LegendRow key={c.name} color={PIE_COLORS[i % PIE_COLORS.length]} label={c.name} value={formatNumber(c.value)} />
                ))}
              </div>
            </>
          ) : (
            <EmptyHint text="No category data." />
          )}
        </Panel>

        <Panel icon={CalendarDays} title="Students by session">
          {data.students.bySession.length ? (
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.students.bySession} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="session" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
                  <Bar dataKey="count" name="Students" fill={COLORS.blue} radius={[6, 6, 0, 0]} maxBarSize={42} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyHint text="No session data." />
          )}
        </Panel>

        <Panel icon={UserCheck} title="Student status" subtitle="Live enrolment health">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Active", value: students.active, tone: "text-emerald-600" },
              { label: "On leave", value: students.onLeave, tone: "text-amber-600" },
              { label: "Applied leave", value: students.appliedLeave, tone: "text-sky-600" },
              { label: "Pending", value: students.pendingApproval, tone: "text-violet-600" },
              { label: "Struck off", value: students.struckOff, tone: "text-rose-600" },
              { label: "Total", value: students.total, tone: "text-foreground" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border/60 bg-secondary/30 px-3 py-3">
                <p className={cn("font-display text-xl font-bold", s.tone)}>{formatNumber(s.value)}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {genderEntries.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Gender</p>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                {genderEntries.map(([g], i) => {
                  const pct = totalEnrolled ? (Number(data.students.byGender[g]) / totalEnrolled) * 100 : 0;
                  return (
                    <div
                      key={g}
                      style={{ width: `${pct}%`, background: PIE_COLORS[i % PIE_COLORS.length] }}
                      title={`${g}: ${data.students.byGender[g]}`}
                    />
                  );
                })}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {genderEntries.map(([g, v], i) => (
                  <span key={g} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    {g === "M" ? "Male" : g === "F" ? "Female" : g}: <span className="font-semibold text-foreground">{formatNumber(v)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </Panel>
      </div>

      {/* ============== Classes table ============== */}
      <Panel icon={BookOpen} title="Classes" subtitle={`${classes.length} classes in this department`}>
        {classes.length ? (
          <div className="-mx-6 overflow-x-auto px-6">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Class</th>
                  <th className="pb-2 pr-4 font-medium">Category</th>
                  <th className="pb-2 pr-4 font-medium">Session</th>
                  <th className="pb-2 pr-4 text-right font-medium">Students</th>
                  <th className="pb-2 pr-4 text-right font-medium">Teachers</th>
                  <th className="pb-2 text-right font-medium">Subjects</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((c) => (
                  <tr key={c._id} className="border-b border-border/50 last:border-0 hover:bg-secondary/40">
                    <td className="py-2.5 pr-4 font-medium text-foreground">{c.className}</td>
                    <td className="py-2.5 pr-4">
                      <Badge variant="secondary" className="font-normal capitalize">{c.category || "—"}</Badge>
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{c.session || "—"}</td>
                    <td className="py-2.5 pr-4 text-right font-semibold">{formatNumber(c.students)}</td>
                    <td className="py-2.5 pr-4 text-right">{formatNumber(c.teachers)}</td>
                    <td className="py-2.5 text-right">{formatNumber(c.subjects)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">No classes in this department yet.</p>
        )}
      </Panel>

      {/* ============== Attention lists ============== */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel icon={AlertTriangle} title="Top absentees" subtitle="Most absences in selected range">
          {attendance.topAbsentStudents.length ? (
            <ul className="space-y-2">
              {attendance.topAbsentStudents.map((s, i) => (
                <li key={s.studentId || i} className="flex items-center gap-3 rounded-xl border border-border/60 px-3 py-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-xs font-bold text-destructive">
                    {i + 1}
                  </span>
                  <UserAvatar image={s.image} name={s.name} className="h-9 w-9" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.name || "Unknown"}</p>
                    <p className="truncate text-xs text-muted-foreground">{s.specialId || "—"}</p>
                  </div>
                  <Badge className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-50">
                    {formatNumber(s.absentCount)} absences
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No absences recorded. 👍</p>
          )}
        </Panel>

        <Panel
          icon={ClipboardList}
          title="Recent leave requests"
          subtitle={`${leave.total} total · avg ${leave.avgDays} days`}
        >
          {leave.recent.length ? (
            <ul className="space-y-2">
              {leave.recent.map((l) => (
                <li key={l.id} className="flex items-center gap-3 rounded-xl border border-border/60 px-3 py-2.5">
                  <UserAvatar image={l.studentImage} name={l.studentName} className="h-9 w-9" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{l.studentName || "Student"}</p>
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
            <p className="py-6 text-center text-sm text-muted-foreground">No leave requests yet.</p>
          )}
        </Panel>
      </div>

      {/* ============== Staff + midterm ============== */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel icon={UserCheck} title="Teacher attendance" subtitle="Today and 7-day trend">
          <div className="mb-4 grid grid-cols-3 gap-3">
            {[
              { label: "Checked in", value: teacherAttendance.today.checkedIn, tone: "text-emerald-600" },
              { label: "Checked out", value: teacherAttendance.today.checkedOut, tone: "text-sky-600" },
              { label: "Absent", value: teacherAttendance.today.absent, tone: "text-rose-600" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border/60 bg-secondary/30 px-3 py-2.5 text-center">
                <p className={cn("font-display text-xl font-bold", s.tone)}>{formatNumber(s.value)}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {teacherTrend.length ? (
            <div className="h-[150px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={teacherTrend} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="checkedIn" name="Checked in" stroke={COLORS.primary} strokeWidth={2} fill={COLORS.primary} fillOpacity={0.12} />
                  <Area type="monotone" dataKey="checkedOut" name="Checked out" stroke={COLORS.blue} strokeWidth={2} fillOpacity={0} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No teacher attendance in the last 7 days.</p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2 border-t pt-3 sm:grid-cols-4">
            {[
              { label: "Professors", value: teachers.proff },
              { label: "Staff", value: teachers.staff },
              { label: "HODs", value: teachers.hod },
              { label: "Principals", value: teachers.principal },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="font-display text-lg font-bold">{formatNumber(s.value)}</p>
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel icon={CalendarCheck} title="Midterm schedule" subtitle="Papers & publication status">
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: BookOpen, label: "Classes", value: midterm.totalClasses, tone: "bg-sky-100 text-sky-600" },
              { icon: CheckCircle2, label: "Published", value: midterm.publishedClasses, tone: "bg-emerald-100 text-emerald-600" },
              { icon: Clock, label: "Upcoming", value: midterm.upcomingPapers, tone: "bg-amber-100 text-amber-600" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border/60 bg-secondary/30 p-3 text-center">
                <span className={cn("mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg", s.tone)}>
                  <s.icon className="h-4 w-4" />
                </span>
                <p className="font-display text-xl font-bold">{formatNumber(s.value)}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
              <span>Schedules published</span>
              <span>
                {midterm.publishedClasses}/{midterm.totalClasses}
              </span>
            </div>
            <Progress
              value={midterm.totalClasses ? (midterm.publishedClasses / midterm.totalClasses) * 100 : 0}
              className="h-2"
            />
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-xl border border-border/60 bg-secondary/30 p-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-4 w-4" />
            </span>
            <p className="text-xs text-muted-foreground">
              {midterm.upcomingPapers
                ? `${midterm.upcomingPapers} upcoming paper${midterm.upcomingPapers > 1 ? "s" : ""} scheduled across the department.`
                : "No upcoming papers scheduled right now."}
            </p>
          </div>
        </Panel>
      </div>

      {/* ============== Remarks feed ============== */}
      <Panel icon={FileText} title="Recent remarks" subtitle={`${formatNumber(remarks.total)} remarks from faculty`}>
        {remarks.recent.length ? (
          <ul className="space-y-3">
            {remarks.recent.map((r) => (
              <li key={r.id} className="flex gap-3">
                <UserAvatar image={r.authorImage} name={r.authorName} className="h-9 w-9" />
                <div className="min-w-0 flex-1 rounded-xl border border-border/60 bg-secondary/20 px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{r.authorName || "Staff"}</p>
                    <Badge variant="outline" className="font-normal capitalize">
                      {r.authorRole || r.entityType || "remark"}
                    </Badge>
                    <span className="ml-auto text-xs text-muted-foreground">{formatDay(r.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{r.text}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">No remarks recorded yet.</p>
        )}
      </Panel>
    </div>
  );
};

export default HodDashboard;
