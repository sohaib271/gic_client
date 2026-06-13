import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Trash2, X, Eye, ArrowRight, Upload } from "lucide-react";
import ConfirmDeleteModal from "@/components/ConfirmDelete"
import TableSkeleton from "@/components/TableSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDepartments } from "@/hooks/useDepartments";
import UserService from "@/services/userService";
import { useUsers } from "@/hooks/useUsers";
import { useSelector } from "react-redux";

const PREVIEW_COUNT = 5;

const selectClass = cn(
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
);

const Field = ({ label, children, col2 = false }: { label: string; children: React.ReactNode; col2?: boolean }) => (
  <div className={col2 ? "sm:col-span-2" : ""}>
    <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
    {children}
  </div>
);

const defaultForm = {
  name: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  gender: "M",
  address: "",
  cnic: "",
  department: "",
  city: "",
  session: "",
  class: "I",
  subjects: "",
  matricMarks: "",
  whatsappNumber: "",
  doj: "",
};

const IntermediateStudents = () => {
  const user=useSelector((state:any)=>state.user.user);
  const { data: departments } = useDepartments();
  const { data: users, refetch, isLoading } = useUsers("student");

  const intermediateDept = useMemo(() =>
    departments?.filter((u: any) => u?.category === "intermediate"),
    [departments]
  );
  // ✅ Derived — no separate state needed, always in sync with API data
  const intermediateUsers = useMemo(() =>
    users?.filter((u: any) => u?.category === "intermediate"),
    [users]
  );
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("I");
  const [showModal, setShowModal] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
const [deleteTarget,   setDeleteTarget]   = useState<any | null>(null);
const [deleting,       setDeleting]       = useState(false);
  // ── Add state for bulk upload ──
const [bulkUploading, setBulkUploading] = useState(false);

// ── Add handler ──
const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // ✅ Reset input so same file can be re-uploaded
  e.target.value = "";

  const allowedTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.ms-excel", // .xls
  ];
  if (!allowedTypes.includes(file.type)) {
    toast.error("Only Excel files (.xlsx, .xls) are allowed");
    return;
  }

  setBulkUploading(true);
  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await UserService.bulkUploadStudents(formData);

    if (res?.statusCode >= 400 || res?.error) {
      toast.error(res?.message ?? "Bulk upload failed");
      return;
    }

    toast.success(`${res.successful} students uploaded successfully`);

    if (res.failed > 0) {
      toast.warning(`⚠️ ${res.failed} rows failed`);
      // Show individual row errors
      res.errors?.forEach((err: { row: number; error: string }) => {
        toast.error(`Row ${err.row}: ${err.error}`);
      });
    }

    await refetch();
  } catch {
    toast.error("Network error during bulk upload");
  } finally {
    setBulkUploading(false);
  }
};
  // ✅ Local additions on top of server data
  // const [localStudents, setLocalStudents] = useState<any[]>([]);
  const [detailStudent, setDetailStudent] = useState<any | null>(null);
  const [form, setForm] = useState(defaultForm);

  // ✅ All students = server data + any locally added ones this session
  // const allStudents = useMemo(() => [...intermediateUsers, ...localStudents], [intermediateUsers, localStudents]);

  const set = (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const filtered = intermediateUsers?.filter(
    (s:any) =>
      (s?.name?.toLowerCase().includes(search.toLowerCase()) ||
        s?.specialId?.toLowerCase().includes(search.toLowerCase())) &&
      s?.class === selectedClass
  );

  const displayed = showAll ? filtered : filtered?.slice(0, PREVIEW_COUNT);

 const handleDeleteConfirm = async () => {
  if (!deleteTarget?._id) return;
  setDeleting(true);
  try {
    const res = await UserService.deleteUser(deleteTarget._id);
    if (res?.error || res?.statusCode >= 400) {
      toast.error(res?.message ?? "Failed to delete student");
      return;
    }
    toast.success(res?.message ?? "Student deleted successfully");
    setDeleteTarget(null);
    await refetch();
  } catch {
    toast.error("Network error, please try again");
  } finally {
    setDeleting(false);
  }
};

const handleEditStudent = async () => {
  if (!validateForm(true) || !editingStudent?._id) return;
  setSaving(true);

  // ✅ Email and password excluded from payload
  const payload: any = {
    name:        form.name,
    lastName:    form.lastName,
    phone:       form.phone,
    gender:      form.gender,
    address:     form.address,
    cnic:        form.cnic,
    city:        form.city,
    class:       form.class,
    department:  form.department,
    session:     form.session,
    matricMarks: Number(form.matricMarks),
    subjects:    form.subjects.split(",").map((s) => s.trim()).filter(Boolean),
    ...(form.whatsappNumber && { whatsappNumber: form.whatsappNumber }),
    doj: form.doj,
    // ❌ email and password intentionally omitted
  };

  try {
    const res = await UserService.updateUser(editingStudent._id, payload);
    if (res?.error || res?.statusCode >= 400) {
      if (Array.isArray(res?.errors)) res.errors.forEach((e: string) => toast.error(e));
      else toast.error(res?.message ?? "Something went wrong");
      return;
    }
    toast.success(res?.message ?? "Student updated successfully");
    setShowModal(false);
    setEditingStudent(null);
    setForm({ ...defaultForm, class: selectedClass });
    await refetch();
  } catch (err: any) {
    const data = err?.response?.data;
    if (Array.isArray(data?.errors)) data.errors.forEach((m: string) => toast.error(m));
    else if (Array.isArray(data?.message)) data.message.forEach((m: string) => toast.error(m));
    else toast.error(data?.message ?? "Network error, please try again");
  } finally {
    setSaving(false);
  }
};

  const validateForm = (isEdit = false): boolean => {
  if (!form.name.trim() || !form.lastName.trim()) {
    toast.error("First name and last name are required"); return false;
  }
  if (form.name.trim().length > 30) { toast.error("First name must not exceed 30 characters"); return false; }
  if (form.lastName.trim().length > 30) { toast.error("Last name must not exceed 30 characters"); return false; }

  // ✅ Email validation only on create
  if (!isEdit && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    toast.error("Invalid email format"); return false;
  }
  // ✅ Password required only on create
  if (!isEdit && !form.password.trim()) {
    toast.error("Password is required"); return false;
  }

  if (!/^\d{13}$/.test(form.cnic)) { toast.error("CNIC must be exactly 13 digits, no dashes"); return false; }
  if (!/^(92\d{10}|0\d{10})$/.test(form.phone)) {
    toast.error("Phone: 12 digits starting with 92, or 11 digits starting with 0"); return false;
  }
  if (!form.address.trim()) { toast.error("Address is required"); return false; }
  if (!form.city.trim()) { toast.error("City is required"); return false; }
  if (!form.department) { toast.error("Department is required"); return false; }
  if (!form.session.trim()) { toast.error("Session is required"); return false; }
  if (!form.matricMarks || isNaN(Number(form.matricMarks))) { toast.error("Valid matric marks are required"); return false; }
  if (Number(form.matricMarks) < 0 || Number(form.matricMarks) > 1100) { toast.error("Matric marks must be between 0 and 1100"); return false; }
  if (form.whatsappNumber && !/^(92\d{10}|0\d{10})$/.test(form.whatsappNumber)) {
    toast.error("WhatsApp number format is invalid"); return false;
  }
  return true;
};

  const handleAddStudent = async () => {
    if (!validateForm()) return;
    setSaving(true);

    const payload = {
      name: form.name,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone,
      password: form.password,
      gender: form.gender,
      address: form.address,
      category: "intermediate",
      cnic: form.cnic,
      city: form.city,
      class: form.class,
      department: form.department,
      session: form.session,
      matricMarks: Number(form.matricMarks),
      subjects: form.subjects.split(",").map((s) => s.trim()).filter(Boolean),
      ...(form.whatsappNumber && { whatsappNumber: form.whatsappNumber }),
      doj: form.doj,
    };
    try {
      const res = await UserService.addStudent(payload);

      if (res?.error || res?.statusCode >= 400) {
        // ✅ Fixed: was res?.message?.errors — backend sends res.errors
        if (Array.isArray(res?.errors)) {
          res.errors.forEach((e: string) => toast.error(e));
        } else {
          toast.error(res?.message ?? "Something went wrong");
        }
        return;
      }

      toast.success(res?.message ?? "Student added successfully");
      // setLocalStudents((prev) => [...prev, res?.user]);
      setShowModal(false);
      setForm({ ...defaultForm, class: selectedClass });
      await refetch();

    } catch (err: any) {
      // ✅ Fixed: was err?.res?.message — axios uses err.response.data
      console.error("Add student error:", err);
      const data = err?.response?.data;
      if (Array.isArray(data?.errors)) {
        data.errors.forEach((m: string) => toast.error(m));
      } else if (Array.isArray(data?.message)) {
        data.message.forEach((m: string) => toast.error(m));
      } else {
        toast.error(data?.message ?? "Network error, please try again");
      }
    } finally {
      setSaving(false);
    }
  };


  

  if (isLoading || !user) {
  return <TableSkeleton rows={5} cols={7} />;
}

  return (
    <div>
      <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="mb-4 font-display text-xl font-bold text-foreground sm:text-2xl">
        Intermediate Students
      </motion.h1>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="mb-4 flex flex-wrap items-center gap-3">
        <span className="font-display text-sm font-semibold text-foreground">Total: {filtered?.length}</span>
        <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring">
          <option value="I">1st Year</option>
          <option value="II">2nd Year</option>
        </select>
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Student..." className="pl-9" />
        </div>
       {/* ── Replace the existing button area in the filter row ── */}
<div className="flex items-center gap-2 ml-auto">
  {/* ✅ Hidden file input */}
  <input
    id="bulk-upload-intermediate"
    type="file"
    accept=".xlsx,.xls"
    className="hidden"
    onChange={handleBulkUpload}
  />

  {/* ✅ Upload Bulk button */}
  <Button
    variant="outline"
    disabled={bulkUploading}
    onClick={() => document.getElementById("bulk-upload-intermediate")?.click()}
  >
    {bulkUploading ? (
      <>
        <span className="mr-1 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        Uploading...
      </>
    ) : (
      <>
        <Upload className="mr-1 h-4 w-4" /> Upload Bulk
      </>
    )}
  </Button>

  {/* ✅ Existing Add More button */}
  <Button onClick={() => { setForm({ ...defaultForm, class: selectedClass }); setShowModal(true); }}>
    <Plus className="mr-1 h-4 w-4" /> Add More
  </Button>
</div>
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-border">
              {["S.No", "Student ID", "Name", "Last Name", "Class", "DOJ", "Actions"].map((h) => (
                <th key={h} className="table-header p-4 text-left text-sm font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayed?.map((s, i) => (
              <motion.tr key={s._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                <td className="p-4 text-sm">{String(i + 1).padStart(2, "0")}</td>
                <td className="p-4 text-sm font-medium">{s?.specialId}</td>
                <td className="p-4 text-sm">{s?.name}</td>
                <td className="p-4 text-sm text-muted-foreground">{s?.lastName}</td>
                <td className="p-4 text-sm">{s?.class === "I" ? "1st Year" : "2nd Year"}</td>
                <td className="p-4 text-sm text-muted-foreground">{s?.doj}</td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <button onClick={() => setDetailStudent(s)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">
                      <Eye className="h-4 w-4" />
                    </button>
                  <button
  onClick={() => {
    setEditingStudent(s);
    setForm({
      name:           s?.name ?? "",
      lastName:       s?.lastName ?? "",
      email:          s?.email ?? "",       // ✅ shown but readonly
      phone:          s?.phone ?? "",
      password:       "",                   // ✅ always blank — never prefilled
      gender:         s?.gender ?? "M",
      address:        s?.address ?? "",
      cnic:           s?.cnic ?? "",
      department:     s?.department?._id ?? "",
      city:           s?.city ?? "",
      session:        s?.session ?? "",
      class:          s?.class ?? "I",
      subjects:       s?.subjects?.join(", ") ?? "",
      matricMarks:    s?.matricMarks?.toString() ?? "",
      whatsappNumber: s?.whatsappNumber ?? "",
      doj:            s?.doj ?? "",
    });
    setShowModal(true);
  }}
  className="rounded-md p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">
  <Pencil className="h-4 w-4" />
</button>
                    <button onClick={() => setDeleteTarget(s)}
  className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
  <Trash2 className="h-4 w-4" />
</button>
                  </div>
                </td>
              </motion.tr>
            ))}
            {displayed?.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">No students found</td></tr>
            )}
          </tbody>
        </table>
      </motion.div>

      {filtered?.length > PREVIEW_COUNT && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={() => setShowAll(!showAll)}>
            {showAll ? "Show Less" : `View All (${filtered?.length})`}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* ✅ Detail modal using real API fields */}
      <AnimatePresence>
        {detailStudent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4"
            onClick={() => setDetailStudent(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-card p-6 shadow-modal max-h-[90vh] overflow-y-auto">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-foreground">Student Details</h2>
                <button onClick={() => setDetailStudent(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3 text-sm">
                {([
                  ["Student ID",  detailStudent?.specialId],
                  ["First Name",  detailStudent?.name],
                  ["Last Name",   detailStudent?.lastName],
                  ["Email",       detailStudent?.email],
                  ["Phone",       detailStudent?.phone],
                  ["CNIC",        detailStudent?.cnic],
                  ["Gender",      detailStudent?.gender === "M" ? "Male" : "Female"],
                  ["Class",       detailStudent?.class === "I" ? "1st Year" : "2nd Year"],
                  ["Session",     detailStudent?.session],
                  ["City",        detailStudent?.city],
                  ["Address",     detailStudent?.address],
                  ["Date of Joining", detailStudent?.doj],
                  ["Matric Marks", detailStudent?.matricMarks],
                  ["Subjects",    detailStudent?.subjects?.join(", ") || "—"],
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label} className="flex justify-between border-b border-border pb-2 last:border-0">
                    <span className="font-medium text-muted-foreground">{label}</span>
                    <span className="text-foreground text-right">{value ?? "—"}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Student Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4"
            onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()}
              className="flex flex-col w-full max-w-lg rounded-2xl bg-card shadow-modal max-h-[90vh]">

              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border shrink-0">
               <h2 className="font-display text-xl font-bold text-foreground">
  {editingStudent ? "Edit Student" : "Add Intermediate Student"}
</h2>
               <button onClick={() => {
  setShowModal(false);
  setEditingStudent(null);
  setForm({ ...defaultForm, class: selectedClass });
}} className="text-muted-foreground hover:text-foreground">
  <X className="h-5 w-5" />
</button>
              </div>

              <div className="overflow-y-auto flex-1 px-6 py-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="First Name">
                    <Input value={form.name} onChange={set("name")} placeholder="Ali" />
                  </Field>
                  <Field label="Last Name">
                    <Input value={form.lastName} onChange={set("lastName")} placeholder="Khan" />
                  </Field>
                  <Field label="Email">
  <Input
    type="email"
    value={form.email}
    onChange={set("email")}
    placeholder="student@email.com"
    readOnly={!!editingStudent}
    disabled={!!editingStudent}
    className={editingStudent ? "bg-secondary/50 cursor-not-allowed text-muted-foreground" : ""}
  />
  {editingStudent && (
    <p className="mt-1 text-xs text-muted-foreground">Email cannot be changed</p>
  )}
</Field>
<Field label={editingStudent ? "Password (leave blank to keep unchanged)" : "Password"}>
  <Input
    type="password"
    value={form.password}
    onChange={set("password")}
    placeholder={editingStudent ? "••••••••" : ""}
  />
</Field>
                  <Field label="CNIC (13 digits, no dashes)">
                    <Input value={form.cnic} onChange={set("cnic")} placeholder="3520012345678" maxLength={13} />
                  </Field>
                  <Field label="Phone">
                    <Input value={form.phone} onChange={set("phone")} placeholder="03xxxxxxxxx or 92xxxxxxxxxx" />
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
                    <Input value={form.city} onChange={set("city")} placeholder="Lahore" />
                  </Field>
                  <Field label="Class">
                    <select className={selectClass} value={form.class} onChange={set("class")}>
                      <option value="I">1st Year</option>
                      <option value="II">2nd Year</option>
                    </select>
                  </Field>
                  <Field label="Address" col2>
                    <textarea value={form.address} onChange={set("address")} placeholder="Town, Street/Block, House No"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring min-h-[72px] resize-none" />
                  </Field>
                  <Field label="Department">
                    <select className={selectClass} value={form.department} onChange={set("department")}>
                      <option value="">Select department</option>
                      {intermediateDept?.map((d: any) => (
                        <option key={d?._id} value={d?._id}>{d?.code}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Session (e.g. 2023-2025)">
                    <Input value={form.session} onChange={set("session")} placeholder="2023-2025" />
                  </Field>
                  <Field label="Matric Marks (out of 1100)">
                    <Input type="number" min={0} max={1100} value={form.matricMarks} onChange={set("matricMarks")} placeholder="850" />
                  </Field>
                  <Field label="Subjects (comma separated, optional)" col2>
                    <Input value={form.subjects} onChange={set("subjects")} placeholder="Physics, Chemistry, Math" />
                  </Field>
                  <Field label="WhatsApp Number (optional)" col2>
                    <Input value={form.whatsappNumber} onChange={set("whatsappNumber")} placeholder="03xxxxxxxxx or 92xxxxxxxxxx" />
                  </Field>
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
  <Button variant="outline" onClick={() => {
    setShowModal(false);
    setEditingStudent(null);
    setForm({ ...defaultForm, class: selectedClass });
  }} disabled={saving}>Cancel</Button>
  <Button onClick={editingStudent ? handleEditStudent : handleAddStudent} disabled={saving}>
    {saving ? "Saving..." : editingStudent ? "Update Student" : "Save Student"}
  </Button>
</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <ConfirmDeleteModal
  open={!!deleteTarget}
  studentName={`${deleteTarget?.name ?? ""} ${deleteTarget?.lastName ?? ""}`}
  deleting={deleting}
  onConfirm={handleDeleteConfirm}
  onCancel={() => setDeleteTarget(null)}
/>
    </div>
  );
};

export default IntermediateStudents;