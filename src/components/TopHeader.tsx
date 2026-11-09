import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Bell,
  BellRing,
  CalendarCheck,
  CheckCheck,
  ChevronDown,
  GraduationCap,
  Inbox,
  Megaphone,
  Menu,
  QrCode,
  Trash2,
} from "lucide-react";
import { motion } from "framer-motion";
import { AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useSelector } from "react-redux";
import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/hooks/useNotifications";
import type { NotificationItem } from "@/services/notificationService";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

const routeTitles: Record<string, string> = {
  dashboard: "Dashboard",
  students: "Students",
  intermediate: "Intermediate",
  "bs-adp": "BS / ADP",
  faculty: "Faculty",
  attendance: "Attendance",
  subjects: "Subjects",
  score: "Score",
  accounts: "Accounts",
  classes: "Classes",
};

const typeStyles: Record<string, { icon: typeof Bell; className: string }> = {
  announcement: { icon: Megaphone, className: "bg-blue-500/10 text-blue-600" },
  attendance: { icon: CalendarCheck, className: "bg-emerald-500/10 text-emerald-600" },
  qr: { icon: QrCode, className: "bg-violet-500/10 text-violet-600" },
  class: { icon: GraduationCap, className: "bg-amber-500/10 text-amber-600" },
  general: { icon: BellRing, className: "bg-slate-500/10 text-slate-600" },
};

const timeAgo = (dateStr: string) => {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

interface TopHeaderProps {
  onMenuToggle: () => void;
}

const NotificationRow = ({
  notification,
  currentUserName,
  onRead,
  onDelete,
}: {
  notification: NotificationItem;
  currentUserName?: string;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}) => {
  const style = typeStyles[notification.type] ?? typeStyles.general;
  const Icon = style.icon;
  const isForSomeoneElse =
    !!notification.userName &&
    notification.userName.toLowerCase() !== currentUserName?.toLowerCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`group relative flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/70 ${
        notification.isRead ? "" : "bg-primary/[0.045]"
      }`}
    >
      <div
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.className}`}
      >
        <Icon className="h-[18px] w-[18px]" />
      </div>

      <button
        onClick={() => !notification.isRead && onRead(notification._id)}
        className="min-w-0 flex-1 text-left"
      >
        <p
          className={`pr-6 text-sm leading-snug ${
            notification.isRead
              ? "font-medium text-muted-foreground"
              : "font-semibold text-foreground"
          }`}
        >
          {notification.title}
        </p>
        <p className="mt-0.5 line-clamp-2 pr-5 text-xs leading-relaxed text-muted-foreground">
          {notification.message}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground/80">
          <span className="font-medium">{notification.senderName}</span>
          {isForSomeoneElse && (
            <>
              <span className="text-muted-foreground/40">→</span>
              <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium text-muted-foreground">
                {notification.userName}
              </span>
            </>
          )}
          <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/50" />
          <span>{timeAgo(notification.createdAt)}</span>
          {!notification.isRead && (
            <>
              <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/50" />
              <span className="font-medium text-primary">New</span>
            </>
          )}
        </div>
      </button>

      <div className="flex shrink-0 items-start gap-1 pt-0.5">
        {!notification.isRead && (
          <span className="mt-1.5 h-2 w-2 rounded-full bg-primary transition-opacity group-hover:opacity-0" />
        )}
        <button
          aria-label="Delete notification"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification._id);
          }}
          className="rounded-md p-1 text-muted-foreground/60 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive focus:opacity-100 group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
};

const LoadingRows = () => (
  <div className="space-y-1 p-4">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="flex items-start gap-3 py-2">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-2.5 w-1/3" />
        </div>
      </div>
    ))}
  </div>
);

const EmptyState = ({ filtered }: { filtered: boolean }) => (
  <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
      <Inbox className="h-6 w-6 text-muted-foreground/60" />
    </div>
    <div>
      <p className="text-sm font-medium text-foreground">
        {filtered ? "No unread notifications" : "You're all caught up"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {filtered
          ? "Everything has been read"
          : "New notifications will appear here"}
      </p>
    </div>
  </div>
);

const TopHeader = ({ onMenuToggle }: TopHeaderProps) => {
  //  const {user}=useAuth();
  const { user } = useAuth();
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1] || "dashboard";
  const title = routeTitles[lastSegment] || "Dashboard";

  const breadcrumb = segments
    .filter((s) => s !== "admin")
    .map((s) => routeTitles[s] || s)
    .join(" / ");

  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [limit, setLimit] = useState(20);

  const isAdmin = user?.role === "admin";
  const { data, isLoading } = useNotifications(1, limit);
  const markAsRead = useMarkNotificationRead();
  const markAllAsRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const total = data?.total ?? 0;

  const visible = useMemo(
    () =>
      filter === "all"
        ? notifications
        : notifications.filter((n) => !n.isRead),
    [notifications, filter],
  );

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-4 sm:px-6"
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="rounded-lg p-2 text-muted-foreground hover:bg-secondary transition-colors lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-display text-lg font-bold text-foreground">{title}</h1>
          <p className="text-xs text-muted-foreground">Admin / {breadcrumb}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <button
              aria-label="Notifications"
              className="relative rounded-xl border border-border bg-background p-2 text-muted-foreground shadow-sm transition-all hover:border-primary/40 hover:text-foreground hover:shadow"
            >
              <Bell className="h-[18px] w-[18px]" />
              {unreadCount > 0 && (
                <>
                  <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground ring-2 ring-card">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                  <span className="absolute -right-1 -top-1 h-[18px] w-[18px] animate-ping rounded-full bg-destructive/40 [animation-duration:2s]" />
                </>
              )}
            </button>
          </PopoverTrigger>

          <PopoverContent
            align="end"
            sideOffset={8}
            className="w-[92vw] max-w-[400px] overflow-hidden rounded-xl border-border p-0 shadow-lg shadow-black/5"
          >
            {/* ── Header ─────────────────────────────── */}
            <div className="flex items-center justify-between px-4 pb-3 pt-4">
              <div>
                <p className="text-[15px] font-semibold tracking-tight text-foreground">
                  Notifications
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {unreadCount > 0
                    ? `You have ${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
                    : "No new notifications"}
                </p>
              </div>
              {!isAdmin && unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead.mutate()}
                  disabled={markAllAsRead.isPending}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Read all
                </button>
              )}
            </div>

            {/* ── Filter tabs ────────────────────────── */}
            <div className="px-4 pb-2">
              <div className="inline-flex rounded-lg bg-muted p-0.5">
                {(["all", "unread"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-all ${
                      filter === f
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f}
                    {f === "unread" && unreadCount > 0 && (
                      <span className="ml-1.5 text-[10px] font-bold text-primary">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* ── List ───────────────────────────────── */}
            <ScrollArea className="h-[360px]">
              {isLoading ? (
                <LoadingRows />
              ) : visible.length === 0 ? (
                <EmptyState filtered={filter === "unread"} />
              ) : (
                <div className="divide-y divide-border/70">
                  <AnimatePresence initial={false}>
                    {visible.map((n) => (
                      <NotificationRow
                        key={n._id}
                        notification={n}
                        currentUserName={user?.name}
                        onRead={(id) => markAsRead.mutate(id)}
                        onDelete={(id) => deleteNotification.mutate(id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {/* ── Load more footer ─────────────────── */}
              {!isLoading && filter === "all" && visible.length < total && (
                <button
                  onClick={() => setLimit((l) => l + 20)}
                  disabled={isLoading}
                  className="w-full border-t border-border/70 bg-muted/40 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                >
                  Load more ({total - visible.length} remaining)
                </button>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-secondary transition-colors cursor-pointer">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {user?.name?.split(" ")[0]?.[0] ?? ""}{user?.name?.split(" ")[1]?.[0] ?? ""}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-foreground leading-tight">{user?.name}</p>
            <p className="text-xs text-muted-foreground leading-tight">{user?.role?.toUpperCase()}</p>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
        </div>
      </div>
    </motion.header>
  );
};

export default TopHeader;
