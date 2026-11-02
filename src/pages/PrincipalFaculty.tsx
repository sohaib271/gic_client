import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Search, Filter, X, GraduationCap, Building2, Mail, Phone, MapPin, Award, Calendar, Grid, List, RefreshCw, UserCheck } from "lucide-react";
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

const FacultyCard = ({ faculty, onView, index, isHod }: { faculty: any; onView: () => void; index: number; isHod: boolean }) => {
  const fullName = `${faculty?.name || ""} ${faculty?.lastName || ""}`.trim();
  const department = faculty?.department?.code || faculty?.department || "—";
  const roleLabel = isHod ? "HOD" : "Teacher";
  const roleColor = isHod ? "bg-primary/10 text-primary" : "bg-emerald/10 text-emerald";
  const roleIcon = isHod ? <GraduationCap className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />;

  return (
    <motion.div
      key={faculty?._id || index}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      onClick={onView}
      className="group relative flex flex-col h-full rounded-2xl border border-border/50 bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/30 cursor-pointer"
    >
      

      {/* Image & Name */}
      <div className="mb-4 flex flex-col items-center text-center">
        <UserAvatar image={faculty?.image} name={faculty?.name} lastName={faculty?.lastName} className="h-20 w-20 mb-3 ring-2 ring-primary/20" />
        <h3 className="font-display text-lg font-bold text-foreground truncate w-full">{fullName}</h3>
        <p className="mt-1 text-sm text-muted-foreground truncate w-full">{faculty?.specialId}</p>
      </div>

      {/* Department & Role */}
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-2 text-sm">
          <Building2 className="h-4 w-4 flex-shrink-0 text-primary/60" />
          <span className="font-medium text-foreground text-center">{department}</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${roleColor}`}>
            {roleIcon}
            {roleLabel}
          </span>
        </div>
      </div>

      {/* Status & View */}
      <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            faculty?.isActive ? "bg-emerald/10 text-emerald" : "bg-destructive/10 text-destructive"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${faculty?.isActive ? "bg-emerald" : "bg-destructive"}`} />
          {faculty?.isActive ? "Active" : "Inactive"}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-primary hover:bg-primary/5 hover:text-primary"
          onClick={(e) => { e.stopPropagation(); onView(); }}
        >
          <Eye className="h-3.5 w-3.5" />
          View
        </Button>
      </div>
    </motion.div>
  );
};

const FacultyCardSkeleton = ({ index }: { index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.04 }}
    className="rounded-2xl border border-border/50 bg-card p-5 animate-pulse flex flex-col items-center"
  >
    <div className="h-20 w-20 rounded-full bg-muted mb-3" />
    <div className="h-5 w-3/4 bg-muted rounded mb-1 w-full" />
    <div className="h-4 w-1/2 bg-muted rounded mb-4 w-full" />
    <div className="h-4 w-2/3 bg-muted rounded mb-2 w-full" />
    <div className="h-8 w-24 bg-muted rounded-full mb-4" />
    <div className="mt-auto w-full flex items-center justify-between pt-4 border-t border-border/50">
      <div className="h-6 w-20 bg-muted rounded-full" />
      <div className="h-8 w-20 bg-muted rounded-lg" />
    </div>
  </motion.div>
);

const PrincipalFaculty = () => {
  const { data: users = [], isLoading, refetch } = useUsers("proff");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "hod" | "teacher">("all");
  const [detailFaculty, setDetailFaculty] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

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

  const facultyPagination = usePagination(filteredUsers, viewMode === "grid" ? 12 : 10);

  const hodCount = users.filter((u: any) => u?.isHod).length;
  const teacherCount = users.filter((u: any) => !u?.isHod).length;
  const activeCount = users.filter((u: any) => u?.isActive).length;

  const renderGrid = (data: any[]) => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {data?.map((m: any, i: number) => (
        <FacultyCard key={m?._id || i} faculty={m} onView={() => setDetailFaculty(m)} index={i} isHod={!!m?.isHod} />
      ))}
      {data?.length === 0 && (
        <div className="col-span-full rounded-2xl border border-border/50 bg-card p-12 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <GraduationCap className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mb-1 font-display text-lg font-semibold text-foreground">No faculty members found</h3>
          <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );

  const renderList = (data: any[]) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px]">
        <thead>
          <tr className="border-b border-border">
            {["S.No", "Photo", "Name", "Email", "Role", "Department", "Status", "Action"].map((h) => (
              <th key={h} className="table-header p-3 sm:p-4 text-left text-xs sm:text-sm font-medium text-muted-foreground">
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
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${m?.isHod ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {m?.isHod ? "HOD" : "Teacher"}
                </span>
              </td>
              <td className="p-3 sm:p-4 text-xs sm:text-sm text-muted-foreground">{m?.department?.code ?? m?.department ?? "—"}</td>
              <td className="p-3 sm:p-4 text-xs sm:text-sm">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${m?.isActive ? "bg-emerald/10 text-emerald" : "bg-destructive/10 text-destructive"}`}>
                  {m?.isActive ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="p-3 sm:p-4">
                <Button variant="ghost" size="sm" className="gap-1.5 text-primary hover:text-primary text-xs sm:text-sm" onClick={() => setDetailFaculty(m)}>
                  <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> View
                </Button>
              </td>
            </motion.tr>
          ))}
          {data?.length === 0 && (
            <tr>
              <td colSpan={8} className="p-8 text-center text-sm text-muted-foreground">No faculty members found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

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
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">Faculty & Teachers</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">View all professors, HODs, and teachers</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs sm:text-sm font-semibold text-primary">
            Total: {users.length} ({hodCount} HODs, {teacherCount} Teachers, {activeCount} Active)
          </span>
          <Button variant="outline" size="sm" onClick={refetch} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* Filters & View Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-border bg-card p-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center gap-3 flex-1">
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
            <div className="flex items-center gap-2 border-l border-border pl-3 sm:hidden">
              <Button variant="outline" size="icon" onClick={() => setViewMode("grid")} className={viewMode === "grid" ? "bg-primary text-primary-foreground" : ""}>
                <Grid className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setViewMode("list")} className={viewMode === "list" ? "bg-primary text-primary-foreground" : ""}>
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 border-l border-border pl-3">
              <Button variant="outline" size="icon" onClick={() => setViewMode("grid")} className={viewMode === "grid" ? "bg-primary text-primary-foreground" : ""}>
                <Grid className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setViewMode("list")} className={viewMode === "list" ? "bg-primary text-primary-foreground" : ""}>
                <List className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Showing {filteredUsers.length} of {users.length}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Faculty Grid/List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-xl border border-border/50 bg-transparent shadow-none overflow-hidden"
      >
        {isLoading ? (
          <div className="p-6">
            {viewMode === "grid" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[1, 2, 3, 4, 5, 6].map((i) => <FacultyCardSkeleton key={i} index={i} />)}
              </div>
            ) : (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-12 bg-muted rounded" />)}
              </div>
            )}
          </div>
        ) : (
          <>
            {viewMode === "grid" ? renderGrid(facultyPagination.pageItems) : renderList(facultyPagination.pageItems)}
            <div className="border-t border-border/50 p-4 bg-transparent">
              <PaginationControls
                page={facultyPagination.page}
                pageSize={facultyPagination.pageSize}
                total={facultyPagination.total}
                onPageChange={facultyPagination.setPage}
              />
            </div>
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