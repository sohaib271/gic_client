import { useState, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, RefreshCw, Search, Save, X, User } from "lucide-react";
import ClassService from "@/services/classService";
import UserService from "@/services/userService";
import UserAvatar from "@/components/UserAvatar";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

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
        visibleStudents.map((s) => UserService.updateUser(s._id, { class: globalClass })),
      );
      const succeeded = visibleStudents.filter((_, i) => results[i].status === "fulfilled").length;
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

  const activeCount = visibleStudents.filter((s) => s?.isActive !== false).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <button
              onClick={() => navigate("/professor/settings/update-students")}
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Classes
            </button>
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              {classInfo?.className ?? "Class Students"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {classInfo?.session ?? ""}{" "}
              {classInfo?.departmentId?.name ?? classInfo?.department ?? ""}
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 px-4 py-2 rounded-lg border border-border bg-background/50">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-sm font-semibold text-foreground">{visibleStudents.length}</p>
            </div>
            <div className="w-px h-4 bg-border"></div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Active</p>
              <p className="text-sm font-semibold text-green-600">{activeCount}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {/* Global Class Update */}
          <div className="flex items-center gap-2">
            <Label className="text-xs font-medium text-muted-foreground">Update Class</Label>
            <div className="relative w-32">
              <Select
                value={globalClass}
                onValueChange={setGlobalClass}
                disabled={globalUpdating}
              >
                <SelectTrigger className="w-full h-9 text-sm">
                  <SelectValue placeholder="Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Class</SelectItem>
                  {CLASS_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleGlobalClassUpdate}
            disabled={!globalClass || globalUpdating || visibleStudents.length === 0}
              className="h-9 px-4 text-sm"
            >
              {globalUpdating ? "Updating…" : "Apply to All"}
            </Button>
          </div>

          <div className="w-px h-5 bg-border hidden sm:block"></div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students..."
              className="pl-9 h-9 text-sm"
            />
          </div>

          <div className="w-px h-5 bg-border hidden sm:block"></div>

          <Button
            onClick={load}
            disabled={globalUpdating}
            className="h-9 px-4 text-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${globalUpdating ? "animate-spin" : ""}`} />
            {globalUpdating ? "Updating…" : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {visibleStudents.length === 0 && (
        <Card className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <User className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-2 text-sm font-semibold text-foreground">No students found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            This class currently has no enrolled students.
          </p>
        </Card>
      )}

      {/* Students Table */}
      <Card>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHeader className="w-8 text-center text-xs font-medium text-muted-foreground">#</TableHeader>
                  <TableHeader className="w-16 text-center text-xs font-medium text-muted-foreground">Photo</TableHeader>
                  <TableHeader className="w-24 text-xs font-medium text-muted-foreground">Student ID</TableHeader>
                  <TableHeader className="text-xs font-medium text-muted-foreground">Name</TableHeader>
                  <TableHeader className="w-20 text-xs font-medium text-muted-foreground text-center">Class</TableHeader>
                  <TableHeader className="text-xs font-medium text-muted-foreground">Email</TableHeader>
                  <TableHeader className="text-xs font-medium text-muted-foreground">Phone</TableHeader>
                  <TableHeader className="w-24 text-xs font-medium text-muted-foreground text-right">Actions</TableHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleStudents.map((s: any, i: number) => {
                  const sid = s?._id ?? i;
                  const studentEdit = edits[sid] ?? {};
                  const isEditing = Object.keys(studentEdit).length > 0;
                  const isSaving = saving === sid || globalUpdating;
                  return (
                    <TableRow
                      key={sid}
                      className="hover:bg-muted/30 transition-colors border-b border-border last:border-0 group"
                    >
                      <TableCell className="w-8 text-center text-xs text-muted-foreground font-medium">
                        {String(i + 1).padStart(2, "0")}
                      </TableCell>
                      <TableCell className="w-16 text-center">
                        <UserAvatar
                          image={s?.image}
                          name={s?.name}
                          lastName={s?.lastName}
                          className="h-8 w-8"
                        />
                      </TableCell>
                      <TableCell className="w-24 text-xs font-medium text-foreground truncate">
                        {s?.specialId ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Input
                            type="text"
                            value={studentEdit.name ?? s?.name ?? ""}
                            onChange={(e) => setField(sid, "name", e.target.value)}
                            disabled={isSaving || !isEditing}
                            className="text-xs bg-transparent border-none focus:ring-0 text-foreground"
                          />
                          <Input
                            type="text"
                            value={studentEdit.lastName ?? s?.lastName ?? ""}
                            onChange={(e) => setField(sid, "lastName", e.target.value)}
                            disabled={isSaving || !isEditing}
                            className="text-xs bg-transparent border-none focus:ring-0 text-muted-foreground"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="w-20 text-center">
                        <Input
                          type="text"
                          value={studentEdit.class ?? s?.class ?? ""}
                          onChange={(e) => setField(sid, "class", e.target.value)}
                          disabled={isSaving || !isEditing}
                          className="text-xs bg-transparent border-none focus:ring-0 text-center text-foreground"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="email"
                          value={studentEdit.email ?? s?.email ?? ""}
                          onChange={(e) => setField(sid, "email", e.target.value)}
                          disabled={isSaving || !isEditing}
                          className="text-xs bg-transparent border-none focus:ring-0 text-foreground"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="tel"
                          value={studentEdit.phone ?? s?.phone ?? ""}
                          onChange={(e) => setField(sid, "phone", e.target.value)}
                          disabled={isSaving || !isEditing}
                          className="text-xs bg-transparent border-none focus:ring-0 text-foreground"
                        />
                      </TableCell>
                      <TableCell className="w-24 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isEditing ? (
                            <>
                              <Button
                                onClick={() => handleSave(sid)}
                                disabled={isSaving}
                                size="sm"
                                className="h-7 px-2 py-0 text-xs"
                              >
                                <Save className="h-3 w-3 mr-1" />
                                {isSaving ? "Saving…" : "Save"}
                              </Button>
                              <Button
                                onClick={() => setEdits((prev) => ({ ...prev, [sid]: {} }))}
                                disabled={isSaving}
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 py-0 text-xs"
                              >
                                <X className="h-3 w-3 mr-1" /> Cancel
                              </Button>
                            </>
                          ) : (
                            <Button
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
                              disabled={isSaving}
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 py-0 text-xs text-muted-foreground"
                            >
                              <User className="h-3 w-3 mr-1" /> Edit
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UpdateClassStudents;
