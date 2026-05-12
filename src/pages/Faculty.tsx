import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Plus, X, ChevronRight } from "lucide-react";
import { professors as mockProfessors, principals as mockPrincipals, vicePrincipals as mockVicePrincipals } from "@/data/mockData";
import TableSkeleton from "@/components/TableSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDepartments } from "@/hooks/useDepartments";
import { useUsers } from "@/hooks/useUsers";
import UserService from "@/services/userService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import FacultyDetailView from "@/components/FacultyDetailView";

type FacultyType = "proff" | "principal" | "vice_principal";

const selectClass = cn(
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base",
  "ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none",
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-muted-foreground">{label}</label>
    {children}
  </div>
);

const Faculty = () => {
  const { data } = useDepartments();
  const { data: users, isLoading } = useUsers("proff");
  console.log(users)
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<FacultyType>("proff");
  const [professors, setProfessors] = useState(mockProfessors);
  const [principalList, setPrincipalList] = useState(mockPrincipals);
  const [vpList, setVpList] = useState(mockVicePrincipals);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [detailFaculty, setDetailFaculty] = useState<any | null>(null);
  const [detailType, setDetailType] = useState<FacultyType>("proff");

  const defaultForm = {
    firstName: "", lastName: "", email: "", phone: "",
    password: "", gender: "M", address: "", doj: "", city: "",
    hod: "No", cnic: "", department: "", subjects: "", qualification: "",
  };

  const [form, setForm] = useState(defaultForm);
  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const openModal = (type: FacultyType) => {
    setModalType(type);
    setForm(defaultForm);
    setShowModal(true);
  };

  const validateForm = (): boolean => {
    if (!form.firstName.trim() || !form.lastName.trim()) { toast.error("First name and last name are required"); return false; }
    if (form.firstName.trim().length > 30) { toast.error("First name must not exceed 30 characters"); return false; }
    if (form.lastName.trim().length > 30) { toast.error("Last name must not exceed 30 characters"); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { toast.error("Invalid email format"); return false; }
    if (!/^\d{13}$/.test(form.cnic)) { toast.error("CNIC must be exactly 13 digits"); return false; }
    if (!/^(92\d{10}|0\d{10})$/.test(form.phone)) { toast.error("Phone: 12 digits starting with 92, or 11 digits starting with 0"); return false; }
    if (!form.address.trim()) { toast.error("Address is required"); return false; }
    if (!form.doj) { toast.error("Date of joining is required"); return false; }
    if (!form.password.trim()) { toast.error("Password is required"); return false; }
    if (!form.city.trim()) { toast.error("City is required"); return false; }
    if (modalType === "proff") {
      if (!form.department) { toast.error("Department is required"); return false; }
      if (!form.subjects.trim()) { toast.error("At least one subject is required"); return false; }
      if (!form.qualification.trim()) { toast.error("Qualification is required"); return false; }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    const newMember: any = {
      name: form.firstName, lastName: form.lastName, doj: form.doj,
      email: form.email, cnic: form.cnic, city: form.city,
      phone: form.phone, password: form.password, gender: form.gender, address: form.address,
      ...(modalType === "proff" && {
        isHod: form.hod === "Yes", department: form.department,
        subjects: form.subjects.split(",").map((s) => s.trim()).filter(Boolean),
        qualification: form.qualification,
      }),
    };
    try {
      const res = await UserService.addProf(newMember);
      if (res?.error || res?.statusCode >= 400) {
        if (Array.isArray(res?.message?.errors)) res.message.errors.forEach((e: string) => toast.error(e));
        else toast.error(res?.message ?? "Something went wrong");
        return;
      }
      toast.success(res?.message ?? "Added successfully");
      if (modalType === "proff") setProfessors((p) => [...p, res?.user ?? newMember]);
      else if (modalType === "principal") setPrincipalList((p) => [...p, res?.user ?? newMember]);
      else setVpList((p) => [...p, res?.user ?? newMember]);
      setShowModal(false);
    } catch (err: any) {
      const message = err?.response?.data?.message;
      if (Array.isArray(message)) message.forEach((m: string) => toast.error(m));
      else toast.error(message ?? "Network error, please try again");
    } finally { setSaving(false); }
  };

  if (isLoading) return <TableSkeleton rows={6} cols={5} />;

  // Detail view
  if (detailFaculty) {
    return (
      <FacultyDetailView
        faculty={detailFaculty}
        type={detailType}
        onBack={() => setDetailFaculty(null)}
      />
    );
  }

  const renderTable = (data: any[], type: FacultyType, showAll: boolean) => {
    const displayData = showAll ? data : data?.slice(0, 3);
    const isProfessor = type === "proff";
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-border">
              {["S.No", "First Name", "Last Name", "Date of Joining",
                ...(isProfessor ? ["HOD", "Department"] : []), "Action"].map((h) => (
                <th key={h} className="table-header p-3 sm:p-4 text-left text-xs sm:text-sm font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayData?.map((m: any, i: number) => (
              <motion.tr key={m?._id || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                <td className="p-3 sm:p-4 text-xs sm:text-sm">{String(i + 1).padStart(2, "0")}</td>
                <td className="p-3 sm:p-4 text-xs sm:text-sm font-medium">{m?.name}</td>
                <td className="p-3 sm:p-4 text-xs sm:text-sm">{m?.lastName}</td>
                <td className="p-3 sm:p-4 text-xs sm:text-sm text-muted-foreground">{m?.doj}</td>
                {isProfessor && (
                  <>
                    <td className="p-3 sm:p-4 text-xs sm:text-sm">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${m?.isHod ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {m?.isHod ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="p-3 sm:p-4 text-xs sm:text-sm">{m?.department?.code}</td>
                  </>
                )}
                <td className="p-3 sm:p-4">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-primary hover:text-primary text-xs sm:text-sm"
                    onClick={() => { setDetailFaculty(m); setDetailType(type); }}>
                    <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> View Detail
                  </Button>
                </td>
              </motion.tr>
            ))}
            {displayData?.length === 0 && (
              <tr>
                <td colSpan={isProfessor ? 7 : 5} className="p-8 text-center text-sm text-muted-foreground">No records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const sections = [
    { title: "Professors", type: "proff" as FacultyType, data: professors, count: professors.length },
    { title: "Principal", type: "principal" as FacultyType, data: principalList, count: principalList.length },
    { title: "Vice Principal", type: "vice_principal" as FacultyType, data: vpList, count: vpList.length },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">Faculty</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage professors, principal & vice principals</p>
        </div>
        <span className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs sm:text-sm font-semibold text-primary w-fit">
          Total Faculty: {professors.length + principalList.length + vpList.length}
        </span>
      </motion.div>

      {sections.map((section, sIdx) => {
        const isExpanded = expandedSection === section.type;
        return (
          <motion.div key={section.type} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sIdx * 0.1 }}
            className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border px-4 sm:px-5 py-3 sm:py-4">
              <div className="flex items-center gap-3">
                <h3 className="font-display text-base sm:text-lg font-semibold text-foreground">{section.title}</h3>
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">{section.count}</span>
              </div>
              <div className="flex items-center gap-2">
                {section.data.length > 3 && (
                  <Button variant="ghost" size="sm" className="gap-1 text-primary hover:text-primary text-xs sm:text-sm"
                    onClick={() => setExpandedSection(isExpanded ? null : section.type)}>
                    {isExpanded ? "Show Less" : "View All"}
                    <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  </Button>
                )}
                <Button size="sm" className="gap-1.5 text-xs sm:text-sm" onClick={() => openModal(section.type)}>
                  <Plus className="h-4 w-4" /> Add More
                </Button>
              </div>
            </div>
            {renderTable(users, section.type, isExpanded)}
          </motion.div>
        );
      })}

      {/* Add Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-3 sm:p-4"
            onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()}
              className="flex flex-col w-full max-w-lg rounded-2xl bg-card shadow-modal max-h-[90vh]">

              <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-border shrink-0">
                <h2 className="font-display text-lg sm:text-xl font-bold text-foreground">
                  Add {modalType === "proff" ? "Professor" : modalType === "principal" ? "Principal" : "Vice Principal"}
                </h2>
                <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="overflow-y-auto px-4 sm:px-6 py-4 flex-1">
                <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                  <Field label="First Name"><Input value={form.firstName} onChange={set("firstName")} /></Field>
                  <Field label="Last Name"><Input value={form.lastName} onChange={set("lastName")} /></Field>
                  <Field label="Email"><Input type="email" value={form.email} onChange={set("email")} /></Field>
                  <Field label="Phone No"><Input placeholder="03xxxxxxxxx or 92xxxxxxxxxx" value={form.phone} onChange={set("phone")} /></Field>
                  <Field label="City"><Input value={form.city} onChange={set("city")} /></Field>
                  <Field label="CNIC (13 digits)"><Input placeholder="3520012345678" value={form.cnic} onChange={set("cnic")} maxLength={13} /></Field>
                  <Field label="Password"><Input type="password" value={form.password} onChange={set("password")} /></Field>
                  <Field label="Gender">
                    <select className={selectClass} value={form.gender} onChange={set("gender")}>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                    </select>
                  </Field>
                  <Field label="Date of Joining"><Input type="date" value={form.doj} onChange={set("doj")} /></Field>
                  {modalType === "proff" && (
                    <Field label="HOD">
                      <select className={selectClass} value={form.hod} onChange={set("hod")}>
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </Field>
                  )}
                  <Field label="Address"><Input placeholder="Street, City" value={form.address} onChange={set("address")} /></Field>
                  {modalType === "proff" && (
                    <>
                      <Field label="Department">
                        <select className={selectClass} value={form.department} onChange={set("department")}>
                          <option value="">Select department</option>
                          {data?.map((d: any) => (
                            <option key={d?._id} value={d?._id}>{d?.code}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Subjects (comma separated)">
                        <Input placeholder="Math, Physics" value={form.subjects} onChange={set("subjects")} />
                      </Field>
                      <Field label="Qualification">
                        <Input placeholder="e.g. M.Sc Physics" value={form.qualification} onChange={set("qualification")} />
                      </Field>
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-border shrink-0">
                <Button variant="outline" onClick={() => setShowModal(false)} disabled={saving}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Faculty;
