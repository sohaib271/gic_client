import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Search, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUsers } from "@/hooks/useUsers";
import UserAvatar from "@/components/UserAvatar";
import PaginationControls from "@/components/PaginationControls";
import { usePagination } from "@/hooks/usePagination";
import FacultyDetailView from "@/components/FacultyDetailView";

const PrincipalFaculty = () => {
  const { data: users = [], isLoading, refetch } = useUsers("proff");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "hod" | "teacher">("all");
  const [detailFaculty, setDetailFaculty] = useState<any | null>(null);
  const facultyPagination = usePagination(users, 10);

  const filteredUsers = useMemo(() => {
    let result = users;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (u: any) =>
          u?.name?.toLowerCase().includes(s) ||
          u?.lastName?.toLowerCase().includes(s) ||
          u?.email?.toLowerCase().includes(s) ||
          u?.specialId?.toLowerCase().includes(s)
      );
    }
    if (filterType === "hod") {
      result = result.filter((u: any) => u?.isHod);
    } else if (filterType === "teacher") {
      result = result.filter((u: any) => !u?.isHod);
    }
    return result;
  }, [users, search, filterType]);

  const hodCount = users.filter((u: any) => u?.isHod).length;
  const teacherCount = users.filter((u: any) => !u?.isHod).length;

  const renderTable = (data: any[]) => {
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-border">
              {["S.No", "Photo", "Name", "Email", "Role", "Department", "Status", "Action"].map((h) => (
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
            {data?.map((m: any, i: number) => (
              <motion.tr
                key={m?._id || i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors"
              >
                <td className="p-3 sm:p-4 text-xs sm:text-sm">{String(i + 1).padStart(2, "0")}</td>
                <td className="p-3 sm:p-4">
                  <UserAvatar image={m?.image} name={m?.name} lastName={m?.lastName} className="h-10 w-10" />
                </td>
                <td className="p-3 sm:p-4">
                  <div className="font-medium text-foreground">{m?.name} {m?.lastName}</div>
                  <div className="text-xs text-muted-foreground">{m?.specialId}</div>
                </td>
                <td className="p-3 sm:p-4 text-xs sm:text-sm text-muted-foreground">{m?.email}</td>
                <td className="p-3 sm:p-4 text-xs sm:text-sm">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      m?.isHod ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {m?.isHod ? "HOD" : "Teacher"}
                  </span>
                </td>
                <td className="p-3 sm:p-4 text-xs sm:text-sm text-muted-foreground">
                  {m?.department?.code ?? m?.department ?? "—"}
                </td>
                <td className="p-3 sm:p-4 text-xs sm:text-sm">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      m?.isActive ? "bg-emerald/10 text-emerald" : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {m?.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="p-3 sm:p-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-primary hover:text-primary text-xs sm:text-sm"
                    onClick={() => setDetailFaculty(m)}
                  >
                    <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> View
                  </Button>
                </td>
              </motion.tr>
            ))}
            {data?.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-sm text-muted-foreground">
                  No faculty members found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  if (detailFaculty) {
    return (
      <FacultyDetailView
        faculty={detailFaculty}
        type={detailFaculty?.isHod ? "proff" : "proff"}
        onBack={() => setDetailFaculty(null)}
        autoShowSchedule={false}
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
            Faculty & Teachers
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            View all professors, HODs, and teachers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs sm:text-sm font-semibold text-primary">
            Total: {users.length} ({hodCount} HODs, {teacherCount} Teachers)
          </span>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-border bg-card p-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="hod">HODs Only</SelectItem>
                <SelectItem value="teacher">Teachers Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Showing {filteredUsers.length} of {users.length}</span>
          </div>
        </div>
      </motion.div>

      {/* Faculty Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-xl border border-border bg-card shadow-card overflow-hidden"
      >
        {isLoading ? (
          <div className="p-8">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-muted rounded" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {renderTable(facultyPagination.pageItems)}
            <PaginationControls
              page={facultyPagination.page}
              pageSize={facultyPagination.pageSize}
              total={facultyPagination.total}
              onPageChange={facultyPagination.setPage}
            />
          </>
        )}
      </motion.div>

      {/* Detail Modal */}
      <AnimatePresence>
        {detailFaculty && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-3 sm:p-4"
            onClick={() => setDetailFaculty(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="flex flex-col w-full max-w-3xl rounded-2xl bg-card shadow-modal max-h-[90vh]"
            >
              <FacultyDetailView
                faculty={detailFaculty}
                type={detailFaculty?.isHod ? "proff" : "proff"}
                onBack={() => setDetailFaculty(null)}
                autoShowSchedule={false}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PrincipalFaculty;
