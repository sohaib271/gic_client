import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import TableSkeleton from "@/components/TableSkeleton";
import UserService from "@/services/userService";
import UserAvatar from "@/components/UserAvatar";
import { toast } from "sonner";

const roleLabel = (role: string) => {
  switch (role) {
    case "admin":
      return "Admin";
    case "proff":
      return "Teacher";
    case "hod":
      return "HOD";
    default:
      return "Student";
  }
};

const formatTime = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDate = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  const today = new Date();
  const sameDay =
    date.toDateString() === today.toDateString();
  return sameDay
    ? "Today"
    : date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const ActiveUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await UserService.getActiveToday();
        if (Array.isArray(result)) {
          const allowedRoles = ["student", "proff", "hod"];
          setUsers(result.filter((u) => allowedRoles.includes(u.role)));
        } else {
          toast.error(result?.message || "Failed to load active users");
        }
      } catch {
        toast.error("Could not reach the server");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div>
      <button
        onClick={() => navigate("/admin/settings")}
        className="mb-4 flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Settings
      </button>

      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-2 font-display text-xl font-bold text-foreground sm:text-2xl"
      >
        Today Active Users
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-8 text-sm text-muted-foreground"
      >
        Users who logged in today with their last login time
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <div className="p-2 rounded-lg bg-emerald-50">
          <Users className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            Active today
          </p>
          <p className="text-xs text-muted-foreground">
            {loading
              ? "Counting..."
              : `${users.length} user${users.length === 1 ? "" : "s"} logged in since midnight`}
          </p>
        </div>
      </motion.div>

      <Card>
        <CardContent className="p-5">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4 block">
            Login History (Today)
          </span>

          {loading ? (
            <TableSkeleton rows={5} cols={6} />
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active users yet today.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-border">
                    {[
                      "S.No",
                      "Photo",
                      "Name",
                      "Role",
                      "Special ID",
                      "Last Login",
                    ].map((h) => (
                      <th
                        key={h}
                        className="table-header p-3 sm:p-4 text-left text-xs sm:text-sm font-medium text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <motion.tr
                      key={u._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors"
                    >
                      <td className="p-3 sm:p-4 text-xs sm:text-sm">
                        {String(i + 1).padStart(2, "0")}
                      </td>
                      <td className="p-3 sm:p-4">
                        <UserAvatar image={u.image} name={u.name} lastName={u.lastName} className="h-10 w-10" />
                      </td>
                      <td className="p-3 sm:p-4 text-xs sm:text-sm font-medium">
                        {`${u.name ?? ""} ${u.lastName ?? ""}`}
                      </td>
                      <td className="p-3 sm:p-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            u.role === "student"
                              ? "bg-sky-50 text-sky-600"
                              : u.role === "proff"
                                ? "bg-violet-50 text-violet-600"
                                : u.role === "hod"
                                  ? "bg-amber-50 text-amber-600"
                                  : "bg-emerald-50 text-emerald-600"
                          }`}
                        >
                          {roleLabel(u.role)}
                        </span>
                      </td>
                      <td className="p-3 sm:p-4 text-xs sm:text-sm text-muted-foreground">
                        {u.specialId ?? "—"}
                      </td>
                      <td className="p-3 sm:p-4 text-xs sm:text-sm">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {formatTime(u.lastLoginAt)}
                          <span className="text-muted-foreground">
                            ({formatDate(u.lastLoginAt)})
                          </span>
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ActiveUsers;