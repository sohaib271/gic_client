import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarClock, Plus, Trash2, X, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import TableSkeleton from "@/components/TableSkeleton";
import ConfirmDeleteModal from "@/components/ConfirmDelete";
import LeaveTypeService from "@/services/leaveTypeService";
import AppSettingService, { APP_SETTING_KEYS } from "@/services/appSettingService";
import { toast } from "sonner";

const formatDate = (value?: string) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

interface LeaveManagementProps {
  /**
   * Where "Back to Settings" should go. The page is reused by the HOD layout,
   * which is mounted under /professor, so the default admin path would send
   * HODs into a route their role cannot access.
   */
  backTo?: string;
  /**
   * Read-only mode for roles that may inspect the school-wide leave policy but
   * cannot change it. The backend only lets admins and HODs add or delete leave
   * types, so for every other role the write controls are hidden.
   */
  readOnly?: boolean;
}

const LeaveManagement = ({
  backTo = "/admin/settings",
  readOnly = false,
}: LeaveManagementProps) => {
  const navigate = useNavigate();
  const [leaveTypes, setLeaveTypes] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [leaveApplyEnabled, setLeaveApplyEnabled] = useState(true);
  const [settingLoading, setSettingLoading] = useState(true);

  const loadLeaveTypes = async () => {
    setLoading(true);
    try {
      const result = await LeaveTypeService.getLeaveTypes();
      if (Array.isArray(result)) {
        setLeaveTypes(result);
      } else {
        toast.error(result?.message || "Failed to load leave types");
      }
    } catch {
      toast.error("Could not reach the server");
    } finally {
      setLoading(false);
    }
  };

  const loadLeaveApplySetting = async () => {
    try {
      const result = await AppSettingService.getAppSettings();
      if (result?.statusCode !== undefined && result?.statusCode >= 400) {
        toast.error(result?.message || "Failed to load leave application setting");
      } else {
        setLeaveApplyEnabled(result?.[APP_SETTING_KEYS.applyLeave] ?? true);
      }
    } catch {
      toast.error("Could not reach the server");
    } finally {
      setSettingLoading(false);
    }
  };

  useEffect(() => {
    loadLeaveTypes();
    loadLeaveApplySetting();
  }, []);

  const handleLeaveApplyToggle = async (next: boolean) => {
    const previous = leaveApplyEnabled;
    setLeaveApplyEnabled(next);
    try {
      const result = await AppSettingService.setAppSetting(APP_SETTING_KEYS.applyLeave, next);
      if (result?.statusCode !== undefined && result?.statusCode >= 400) {
        setLeaveApplyEnabled(previous);
        toast.error(result?.message || "Could not update setting");
      } else {
        toast.success(
          next
            ? "Leave applications enabled"
            : "Leave applications disabled",
        );
      }
    } catch {
      setLeaveApplyEnabled(previous);
      toast.error("Could not reach the server");
    }
  };

  const openModal = () => {
    setName("");
    setShowModal(true);
  };

  const handleAdd = async () => {
    if (!name.trim()) {
      toast.error("Enter a leave type name");
      return;
    }
    setAdding(true);
    try {
      const result = await LeaveTypeService.addLeaveType(name.trim());
      if (result?.statusCode !== undefined && result?.statusCode >= 400) {
        toast.error(result?.message || "Could not add leave type");
      } else {
        toast.success(`"${name.trim()}" added`);
        setName("");
        setShowModal(false);
        await loadLeaveTypes();
      }
    } catch {
      toast.error("Could not reach the server");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string, label: string) => {
    setDeleteTarget(null);
    setDeletingId(id);
    try {
      const result = await LeaveTypeService.deleteLeaveType(id);
      if (result?.statusCode !== undefined && result?.statusCode >= 400) {
        toast.error(result?.message || "Could not delete leave type");
      } else {
        toast.success(`"${label}" removed`);
        await loadLeaveTypes();
      }
    } catch {
      toast.error("Could not reach the server");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <button
        onClick={() => navigate(backTo)}
        className="mb-4 flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Settings
      </button>

      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-2 font-display text-xl font-bold text-foreground sm:text-2xl"
      >
        Leave Management
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-8 text-sm text-muted-foreground"
      >
        {readOnly
          ? "Leave types configured across the school"
          : "Manage leave types like Sick, Holiday, Casual, etc."}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${
              leaveApplyEnabled ? "bg-emerald-50" : "bg-gray-100"
            }`}
          >
            <CalendarClock
              className={`h-5 w-5 ${
                leaveApplyEnabled ? "text-emerald-600" : "text-gray-400"
              }`}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Allow students to apply for leave
            </p>
            <p className="text-xs text-muted-foreground">
              {settingLoading
                ? "Loading setting..."
                : readOnly
                  ? "Managed by the admin and HOD accounts"
                  : leaveApplyEnabled
                    ? "Students can submit leave applications"
                    : "Leave applications are disabled for students"}
            </p>
          </div>
        </div>
        <Switch
          checked={leaveApplyEnabled}
          onCheckedChange={handleLeaveApplyToggle}
          disabled={settingLoading || readOnly}
          className="shrink-0"
        />
      </motion.div>

      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-50">
                <CalendarClock className="h-4 w-4 text-amber-600" />
              </div>
              <span className="text-sm font-semibold text-foreground">
                Leave Types
                <span className="ml-2 text-xs font-medium text-muted-foreground">
                  ({leaveTypes.length})
                </span>
              </span>
            </div>
            {!readOnly && (
              <Button onClick={openModal}>
                <Plus className="h-4 w-4 mr-1" />
                Add Leave Type
              </Button>
            )}
          </div>

          {loading ? (
            <TableSkeleton rows={5} cols={readOnly ? 3 : 4} />
          ) : leaveTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {readOnly
                ? "No leave types have been configured yet."
                : 'No leave types yet. Click "Add Leave Type" to add your first one.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px]">
                <thead>
                  <tr className="border-b border-border">
                    {["S.No", "Leave Type", "Status", "Added", ...(readOnly ? [] : ["Action"])].map(
                      (h) => (
                        <th
                          key={h}
                          className="table-header p-3 sm:p-4 text-left text-xs sm:text-sm font-medium text-muted-foreground"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {leaveTypes.map((lt, i) => (
                    <motion.tr
                      key={lt._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors"
                    >
                      <td className="p-3 sm:p-4 text-xs sm:text-sm">
                        {String(i + 1).padStart(2, "0")}
                      </td>
                      <td className="p-3 sm:p-4 text-xs sm:text-sm font-medium">
                        {lt.name}
                      </td>
                      <td className="p-3 sm:p-4">
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
                          <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      </td>
                      <td className="p-3 sm:p-4 text-xs sm:text-sm text-muted-foreground">
                        {formatDate(lt.createdAt)}
                      </td>
                      {!readOnly && (
                        <td className="p-3 sm:p-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 text-xs sm:text-sm"
                            onClick={() => setDeleteTarget(lt)}
                            disabled={deletingId !== null}
                          >
                            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            Delete
                          </Button>
                        </td>
                      )}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-3 sm:p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="flex flex-col w-full max-w-md rounded-2xl bg-card shadow-modal"
            >
              <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-border shrink-0">
                <h2 className="font-display text-lg sm:text-xl font-bold text-foreground">
                  Add Leave Type
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="overflow-y-auto px-4 sm:px-6 py-4 flex-1 space-y-3">
                <label className="text-xs font-medium text-muted-foreground">
                  Name
                </label>
                <Input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  placeholder="e.g. Sick, Holiday, Casual..."
                  maxLength={50}
                />
              </div>

              <div className="flex items-center justify-end gap-2 px-4 sm:px-6 pb-4 sm:pb-6 pt-2 shrink-0">
                <Button
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  disabled={adding}
                >
                  Cancel
                </Button>
                <Button onClick={handleAdd} disabled={adding || !name.trim()}>
                  <Plus className="h-4 w-4 mr-1" />
                  {adding ? "Adding..." : "Add"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDeleteModal
        open={!!deleteTarget}
        title="Delete Leave Type"
        name={deleteTarget?.name ?? ""}
        detail=" This leave type will be permanently removed."
        deleting={deletingId === deleteTarget?._id}
        onConfirm={() => handleDelete(deleteTarget._id, deleteTarget.name)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default LeaveManagement;