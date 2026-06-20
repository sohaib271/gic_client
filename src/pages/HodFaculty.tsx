import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Briefcase, Check, Clock, Eye, History, Plus, UserCircle, X } from "lucide-react";
import { useSelector } from "react-redux";
import TableSkeleton from "@/components/TableSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUsers } from "@/hooks/useUsers";
import { useTeacherAttendanceHistory } from "@/hooks/useTeacherAttendance";
import FacultyDetailView from "@/components/FacultyDetailView";
import UserService from "@/services/userService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const selectClass = cn(
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base",
  "ring-offset-background focus-visible:outline-none focus-visible:ring-2",
  "focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm",
);

const defaultForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  gender: "M",
  address: "",
  doj: "",
  city: "",
  cnic: "",
  subjects: "",
  qualification: "",
};

const Field = ({
  label,
  children,
  col2 = false,
}: {
  label: string;
  children: React.ReactNode;
  col2?: boolean;
}) => (
  <div className={col2 ? "sm:col-span-2" : ""}>
    <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
    {children}
  </div>
);

const HodFaculty = () => {
  const user = useSelector((state: any) => state?.user.user);
  const { data: users, isLoading, refetch } = useUsers("proff");
  const [detail, setDetail] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [selectedTeacher, setSelectedTeacher] = useState<any | null>(null);
  const [showTeacherHistory, setShowTeacherHistory] = useState(false);

  const deptId = user?.department?._id ?? user?.department;
  const { records: teacherAttendance, isLoading: attendanceLoading } =
    useTeacherAttendanceHistory(showTeacherHistory ? selectedTeacher?._id : null);

  const deptProfessors = useMemo(
    () =>
      (users || []).filter((u: any) => {
        const uDept = u?.department?._id ?? u?.department;
        return uDept === deptId && u?._id !== user?._id;
      }),
    [users, deptId, user?._id],
  );

  const set =
    (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const validateForm = () => {
    if (!deptId) return "Your department is missing from your account";
    if (!form.firstName.trim() || !form.lastName.trim()) return "First name and last name are required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Invalid email format";
    if (!form.password.trim()) return "Password is required";
    if (!/^\d{13}$/.test(form.cnic)) return "CNIC must be exactly 13 digits";
    if (!/^(92\d{10}|0\d{10})$/.test(form.phone)) return "Phone format is invalid";
    if (!form.city.trim()) return "City is required";
    if (!form.address.trim()) return "Address is required";
    if (!form.doj) return "Date of joining is required";
    if (!form.subjects.trim()) return "At least one subject is required";
    if (!form.qualification.trim()) return "Qualification is required";
    return null;
  };

  const handleSave = async () => {
    const error = validateForm();
    if (error) {
      toast.error(error);
      return;
    }

    setSaving(true);
    try {
      const res = await UserService.addProf({
        role: "proff",
        name: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        gender: form.gender,
        address: form.address,
        doj: form.doj,
        city: form.city,
        cnic: form.cnic,
        department: deptId,
        isHod: false,
        subjects: form.subjects.split(",").map((s) => s.trim()).filter(Boolean),
        qualification: form.qualification,
      });

      if (res?.error || res?.statusCode >= 400) {
        if (Array.isArray(res?.errors)) res.errors.forEach((e: string) => toast.error(e));
        else toast.error(res?.message ?? "Failed to add teacher");
        return;
      }

      toast.success(res?.message ?? "Teacher added successfully");
      setShowModal(false);
      setForm(defaultForm);
      await refetch();
    } catch {
      toast.error("Network error, please try again");
    } finally {
      setSaving(false);
    }
  };

  if (!user?.isHod) {
    return <div className="p-6 text-sm text-muted-foreground">Access denied.</div>;
  }

  if (isLoading) return <TableSkeleton rows={5} cols={5} />;

  if (showTeacherHistory && selectedTeacher) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <button
            onClick={() => {
              setShowTeacherHistory(false);
              setSelectedTeacher(null);
            }}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Faculty
          </button>
        </div>

        <div className="flex items-center gap-3 border-b border-border bg-secondary/20 px-5 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <UserCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {selectedTeacher.name} {selectedTeacher.lastName}
              <span className="ml-2 text-xs font-normal text-muted-foreground">{selectedTeacher.specialId}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {selectedTeacher.department?.code ?? user?.department?.code ?? "-"} - Attendance History
            </p>
          </div>
        </div>

        {attendanceLoading && (
          <div className="space-y-2 p-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg border border-border bg-card" />
            ))}
          </div>
        )}

        {!attendanceLoading && teacherAttendance.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <History className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No attendance records found.</p>
          </div>
        )}

        {!attendanceLoading && teacherAttendance.length > 0 && (() => {
          const grouped: Record<string, typeof teacherAttendance> = {};
          teacherAttendance.forEach((r) => {
            const dateKey = new Date(r.currentDate).toISOString().split("T")[0];
            grouped[dateKey] = grouped[dateKey] ?? [];
            grouped[dateKey].push(r);
          });

          return (
            <div className="divide-y divide-border">
              {Object.entries(grouped)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([date, dayRecords]) => {
                  const checkIn = dayRecords.find((r) => r.type === "check-in");
                  const checkOut = dayRecords.find((r) => r.type === "check-out");
                  return (
                    <div key={date} className="px-5 py-3 transition-colors hover:bg-secondary/20">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-medium text-foreground">
                          {new Date(date).toLocaleDateString("en-GB", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                        <div className="flex flex-wrap items-center gap-3">
                          {checkIn ? (
                            <span className="flex items-center gap-1 rounded-full border border-green-200 bg-green-100 px-2.5 py-0.5 text-xs text-green-700">
                              <Check className="h-3 w-3" />
                              In {new Date(checkIn.currentDate).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          ) : (
                            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground/50">
                              No check-in
                            </span>
                          )}
                          {checkOut ? (
                            <span className="flex items-center gap-1 rounded-full border border-blue-200 bg-blue-100 px-2.5 py-0.5 text-xs text-blue-700">
                              <Clock className="h-3 w-3" />
                              Out {new Date(checkOut.currentDate).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          ) : (
                            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground/50">
                              No check-out
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          );
        })()}
      </div>
    );
  }

  if (detail) {
    return <FacultyDetailView faculty={detail} type="proff" onBack={() => setDetail(null)} />;
  }

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" /> Department Faculty
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Professors in {user?.department?.code ?? user?.department?.name ?? "your department"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs sm:text-sm font-semibold text-primary">
            Total: {deptProfessors.length}
          </span>
          <Button size="sm" onClick={() => setShowModal(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Teacher
          </Button>
        </div>
      </motion.div>

      <div className="rounded-xl border border-border bg-card shadow-card overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-border">
              {["S.No", "First Name", "Last Name", "Date of Joining", "Subjects", "Action"].map((h) => (
                <th key={h} className="p-3 sm:p-4 text-left text-xs sm:text-sm font-medium text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {deptProfessors.map((m: any, i: number) => (
              <motion.tr key={m?._id ?? i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="border-b border-border last:border-0 hover:bg-secondary/40 transition-colors">
                <td className="p-3 sm:p-4 text-xs sm:text-sm">{String(i + 1).padStart(2, "0")}</td>
                <td className="p-3 sm:p-4 text-xs sm:text-sm font-medium">{m?.name}</td>
                <td className="p-3 sm:p-4 text-xs sm:text-sm">{m?.lastName}</td>
                <td className="p-3 sm:p-4 text-xs sm:text-sm text-muted-foreground">{m?.doj}</td>
                <td className="p-3 sm:p-4 text-xs sm:text-sm text-muted-foreground truncate max-w-[200px]">
                  {Array.isArray(m?.subjects) ? m.subjects.join(", ") : m?.subjects ?? "—"}
                </td>
                <td className="p-3 sm:p-4">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setDetail(m)}
                      className="gap-1.5 text-primary hover:text-primary text-xs sm:text-sm">
                      <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTeacher(m);
                        setShowTeacherHistory(true);
                      }}
                      className="gap-1.5 text-xs sm:text-sm"
                    >
                      <History className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Attendance
                    </Button>
                  </div>
                </td>
              </motion.tr>
            ))}
            {deptProfessors.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">
                  No professors in your department.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4" onClick={() => setShowModal(false)}>
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-card shadow-modal" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="font-display text-xl font-bold text-foreground">Add Department Teacher</h2>
                <p className="text-xs text-muted-foreground">Department is preset to {user?.department?.code ?? "your department"}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid flex-1 gap-4 overflow-y-auto px-6 py-4 sm:grid-cols-2">
              <Field label="First Name">
                <Input value={form.firstName} onChange={set("firstName")} />
              </Field>
              <Field label="Last Name">
                <Input value={form.lastName} onChange={set("lastName")} />
              </Field>
              <Field label="Email">
                <Input type="email" value={form.email} onChange={set("email")} />
              </Field>
              <Field label="Password">
                <Input type="password" value={form.password} onChange={set("password")} />
              </Field>
              <Field label="CNIC (13 digits)">
                <Input maxLength={13} value={form.cnic} onChange={set("cnic")} />
              </Field>
              <Field label="Phone No">
                <Input value={form.phone} onChange={set("phone")} />
              </Field>
              <Field label="Gender">
                <select className={selectClass} value={form.gender} onChange={set("gender")}>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </Field>
              <Field label="Date of Joining">
                <Input type="date" value={form.doj} onChange={set("doj")} />
              </Field>
              <Field label="City">
                <Input value={form.city} onChange={set("city")} />
              </Field>
              <Field label="Qualification">
                <Input value={form.qualification} onChange={set("qualification")} />
              </Field>
              <Field label="Department" col2>
                <Input
                  value={user?.department?.code ?? user?.department?.name ?? "Your department"}
                  disabled
                  className="bg-secondary/50 text-muted-foreground"
                />
              </Field>
              <Field label="Subjects (comma separated)" col2>
                <Input value={form.subjects} onChange={set("subjects")} />
              </Field>
              <Field label="Address" col2>
                <Input value={form.address} onChange={set("address")} />
              </Field>
            </div>
            <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
              <Button variant="outline" onClick={() => setShowModal(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Teacher"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HodFaculty;
