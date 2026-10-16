import { useState, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Save,
  RefreshCw,
  Search,
  X,
  Mail,
  Phone,
  ChevronDown,
} from "lucide-react";
import ClassService from "@/services/classService";
import UserService from "@/services/userService";
import UserAvatar from "@/components/UserAvatar";
import { toast } from "sonner";

const CLASS_OPTIONS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

const UpdateClassStudents = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { classId } = useParams<{ classId: string }>();
  const classDataFromState = (location.state as { classData?: any })?.classData;

  const [classInfo, setClassInfo] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [edits, setEdits] = useState<Record<string, Partial<any>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [globalClass, setGlobalClass] = useState("");
  const [globalUpdating, setGlobalUpdating] = useState(false);

  const load = async () => {
    if (!classId) return;
    try {
      // Prefer the class data already passed from the classes grid (has classStudents embedded).
      if (classDataFromState?.classStudents) {
        setClassInfo(classDataFromState);
        setStudents(classDataFromState.classStudents);
        setEdits({});
        setGlobalClass("");
        return;
      }
      const infoRes = await ClassService.getClassInfo(classId);
      const cls = infoRes?.class ?? infoRes;
      setClassInfo(cls);
      setStudents(cls?.classStudents ?? []);
      setEdits({});
      setGlobalClass("");
    } catch {
      toast.error("Failed to load class students");
    }
  };

  const visibleStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return students;
    return students.filter(
      (s: any) =>
        `${s?.name ?? ""} ${s?.lastName ?? ""}`
          .toLowerCase()
          .includes(query) ||
        s?.specialId?.toLowerCase().includes(query) ||
        s?.email?.toLowerCase().includes(query),
    );
  }, [students, search]);

  const setField = (sid: string, key: string, value: string) => {
    setEdits((prev) => ({
      ...prev,
      [sid]: { ...(prev[sid] ?? {}), [key]: value },
    }));
  };

  const handleSave = async (sid: string) => {
    const changes = edits[sid];
    if (!changes || Object.keys(changes).length === 0) return;
    setSaving(sid);
    try {
      const res = await UserService.updateUser(sid, changes);
      if (res?.error || res?.statusCode >= 400) {
        toast.error(res?.message ?? "Failed to update student");
        return;
      }
      toast.success("Student updated");
      setEdits((prev) => ({ ...prev, [sid]: {} }));
    } catch {
      toast.error("Network error, please try again");
    } finally {
      setSaving(null);
    }
  };

  const handleGlobalClassUpdate = async () => {
    if (!globalClass) {
      toast.error("Please select a class");
      return;
    }
    if (visibleStudents.length === 0) {
      toast.error("No students to update");
      return;
    }
    setGlobalUpdating(true);
    try {
      const results = await Promise.allSettled(
        visibleStudents.map((s) =>
          UserService.updateUser(s._id, { class: globalClass }),
        ),
      );
      const succeeded = visibleStudents.filter(
        (_, i) => results[i].status === "fulfilled",
      ).length;
      const failed = visibleStudents.length - succeeded;
      if (succeeded) toast.success(`${succeeded} student(s) class updated`);
      if (failed) toast.error(`${failed} student(s) could not be updated`);
      setGlobalClass("");
      setEdits({});
      await load();
    } catch {
      toast.error("Network error, please try again");
    } finally {
      setGlobalUpdating(false);
    }
  };

  const formatName = (s: any) =>
    `${s?.name ?? ""} ${s?.lastName ?? ""}`.trim() || s?.specialId || "Student";

  if (!classId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Class not specified.</div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            onClick={() => navigate("/professor/settings/update-students")}
            className="mb-2 flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Classes
          </button>
          <h1 className="font-display text-xl font-bold text-foreground">
            {classInfo?.className ?? "Class Students"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {classInfo?.session ?? ""}{" "}
            {classInfo?.departmentId?.name ??
              classInfo?.department ??
              ""}
          </p>
        </div>

        {/* Global class update dropdown */}
        <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-1.5">
          <select
            value={globalClass}
            onChange={(e) => setGlobalClass(e.target.value)}
            className="bg-transparent border-0 outline-none text-sm font-medium focus:ring-0 w-auto min-w-[60px]"
          >
            <option value="">Class</option>
            {CLASS_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <ChevronDown className="h-4 w-4 text-muted-foreground pointer-events-none" />
          <button
            onClick={handleGlobalClassUpdate}
            disabled={!globalClass || globalUpdating || visibleStudents.length === 0}
            className="rounded-md border border-primary bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {globalUpdating ? "Updating…" : "Apply to All"}
          </button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students..."
            className="pl-9 rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring w-full"
          />
        </div>
        <button
          onClick={load}
          className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-secondary transition-colors"
          disabled={globalUpdating}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${globalUpdating ? "animate-spin" : ""}`} />
          {globalUpdating ? "Updating…" : "Refresh"}
        </button>
      </div>

      {visibleStudents.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-16 text-center text-sm text-muted-foreground">
          No students found in this class.
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
        <table className="w-full text-sm min-w-[820px]">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              {[
                "#",
                "Photo",
                "Student ID",
                "Name",
                "Class",
                "Email",
                "Phone",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  className={`px-4 py-3 font-display font-semibold text-foreground ${
                    h === "Actions" ? "text-right" : "text-left"
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleStudents.map((s: any, i: number) => {
              const sid = s?._id ?? i;
              const studentEdit = edits[sid] ?? {};
              const isSaving = saving === sid || globalUpdating;
              return (
                <tr
                  key={sid}
                  className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors group"
                >
                  <td className="px-4 py-3 text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </td>
                  <td className="px-4 py-3">
                    <UserAvatar
                      image={s?.image}
                      name={s?.name}
                      lastName={s?.lastName}
                      className="h-9 w-9"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground truncate max-w-[140px]">
                    {s?.specialId ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    <input
                      type="text"
                      defaultValue={s?.name ?? ""}
                      onChange={(e) => setField(sid, "name", e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                      disabled={isSaving}
                    />
                    <input
                      type="text"
                      defaultValue={s?.lastName ?? ""}
                      onChange={(e) => setField(sid, "lastName", e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 mt-1"
                      disabled={isSaving}
                    />
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    <input
                      type="text"
                      defaultValue={s?.class ?? ""}
                      onChange={(e) => setField(sid, "class", e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                      disabled={isSaving}
                    />
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    <input
                      type="email"
                      defaultValue={s?.email ?? ""}
                      onChange={(e) => setField(sid, "email", e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                      disabled={isSaving}
                    />
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    <input
                      type="tel"
                      defaultValue={s?.phone ?? ""}
                      onChange={(e) => setField(sid, "phone", e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                      disabled={isSaving}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      {Object.keys(studentEdit).length > 0 ? (
                        <>
                          <button
                            onClick={() => handleSave(sid)}
                            disabled={isSaving}
                            className="inline-flex items-center gap-1 rounded-lg border border-primary px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
                          >
                            <Save className={`h-3 w-3 ${isSaving ? "animate-spin" : ""}`} />
                            {isSaving ? "Saving…" : "Save"}
                          </button>
                          <button
                            onClick={() => setEdits((prev) => ({ ...prev, [sid]: {} }))}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-50"
                            disabled={isSaving}
                          >
                            <X className="h-3 w-3" /> Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() =>
                            setEdits((prev) => ({
                              ...prev,
                              [sid]: {
                                name: s?.name ?? "",
                                lastName: s?.lastName ?? "",
                                class: s?.class ?? "",
                                email: s?.email ?? "",
                                phone: s?.phone ?? "",
                              },
                            }))
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-50"
                          disabled={isSaving}
                        >
                          <User className="h-3 w-3" /> Edit
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UpdateClassStudents;
