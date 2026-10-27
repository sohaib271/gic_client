import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import { UserCheck, UserX, Link2, Copy, Check, Ban, Clock, ChevronDown, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import TableSkeleton from "@/components/TableSkeleton";
import PaginationControls from "@/components/PaginationControls";
import { useDepartments } from "@/hooks/useDepartments";
import { SEMESTERS } from "@/lib/academic";
import { selectInputClass as selectClass } from "@/lib/formStyles";
import RegistrationService from "@/services/registrationService";
import { toast } from "sonner";

const PAGE_SIZE = 25;

type Tab = "pending" | "links";

/** Label + value pair used throughout the View application modal. */
const Detail = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="min-w-0">
    <p className="text-[11px] text-muted-foreground">{label}</p>
    <p className="mt-0.5 break-words text-xs font-medium text-foreground sm:text-sm">
      {value === null || value === undefined || value === "" ? "—" : value}
    </p>
  </div>
);

/** Section heading inside the View modal. */
const DetailGroup = ({ title, children }: { title: string; children: ReactNode }) => (
  <div>
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {title}
    </p>
    <div className="grid gap-3 sm:grid-cols-2">{children}</div>
  </div>
);

/**
 * Renders the student's subjects for the View modal. The schema stores these
 * as `string[]` (the backend already splits the comma-separated input), but
 * older records and some admin-created students may still hold a raw string —
 * so handle both shapes rather than calling `.split` on an array.
 */
const subjectList = (raw?: string | string[] | null) => {
  if (Array.isArray(raw)) return raw.filter(Boolean).join(", ");
  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .join(", ");
  }
  return "";
};

/**
 * HOD/admin screen for the self-registration flow: generate shareable links
 * per department/programme, and approve or reject the applications that come
 * in through them.
 */
const PendingRegistrations = () => {
  const user = useSelector((state: any) => state?.user?.user);
  const { data: departments } = useDepartments();

  const isAdmin = user?.role === "admin";
  const deptId: string = user?.department?._id ?? user?.department ?? "";

  const [tab, setTab] = useState<Tab>("pending");

  // ── Pending applications ──
  const [pending, setPending] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<any | null>(null);
  const [reason, setReason] = useState("");

  // ── Links ──
  const [links, setLinks] = useState<any[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  // Holds the link awaiting confirmation — revoke only runs once the HOD says yes.
  const [revoking, setRevoking] = useState<any | null>(null);
  // Full application whose details are open in the View modal.
  const [viewing, setViewing] = useState<any | null>(null);
  const [form, setForm] = useState({
    department: deptId,
    category: "",
    class: "",
    session: "2022-2026",
    maxUses: "100",
    expiresInDays: "30",
  });

  const loadPending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await RegistrationService.listPending({ page, limit: PAGE_SIZE });
      if (res?.statusCode >= 400 || res?.error) {
        toast.error(res?.message ?? "Failed to load applications");
        return;
      }
      setPending(res?.students ?? []);
      setTotalCount(res?.total ?? 0);
      setTotalPages(res?.totalPages ?? 1);
    } catch {
      toast.error("Network error, please try again");
    } finally {
      setLoading(false);
    }
  }, [page]);

  const loadLinks = useCallback(async () => {
    setLinksLoading(true);
    try {
      const res = await RegistrationService.listLinks();
      if (res?.statusCode >= 400 || res?.error) {
        toast.error(res?.message ?? "Failed to load links");
        return;
      }
      setLinks(res?.tokens ?? []);
    } catch {
      toast.error("Network error, please try again");
    } finally {
      setLinksLoading(false);
    }
  }, []);

  useEffect(() => { loadPending(); }, [loadPending]);
  useEffect(() => { if (tab === "links") loadLinks(); }, [tab, loadLinks]);

  useEffect(() => {
    if (deptId && !isAdmin) setForm((f) => ({ ...f, department: deptId }));
  }, [deptId, isAdmin]);

  // The API already pages server-side, so these are the rows for the current page.
  const pageItems = pending;
  const total = totalCount;

  const scopedDepartments = useMemo(() => {
    const all = departments ?? [];
    if (isAdmin) return all;
    return all.filter((d: any) => d?._id === deptId);
  }, [departments, isAdmin, deptId]);

  const selectedDept = useMemo(
    () => scopedDepartments.find((d: any) => d?._id === form.department),
    [scopedDepartments, form.department],
  );

  // The link's category is fixed to whatever the department allows, so the
  // options narrow as soon as a department is picked.
  const categoryOptions = useMemo(() => {
    if (!selectedDept) return [];
    return selectedDept.category === "intermediate"
      ? [{ value: "intermediate", label: "Intermediate" }]
      : [
          { value: "bs", label: "BS" },
          { value: "adp", label: "ADP" },
        ];
  }, [selectedDept]);

  const effectiveCategory =
    form.category || (categoryOptions.length === 1 ? categoryOptions[0].value : "");

  const classOptions = useMemo(() => {
    if (effectiveCategory === "intermediate") {
      return [
        { value: "I", label: "1st Year" },
        { value: "II", label: "2nd Year" },
      ];
    }
    const list = effectiveCategory === "adp" ? SEMESTERS.slice(0, 4) : SEMESTERS;
    return list.map((s) => ({ value: s.value, label: `${s.label} Semester` }));
  }, [effectiveCategory]);

  const createLink = async () => {
    if (!form.department) { toast.error("Select a department"); return; }
    try {
      const res = await RegistrationService.createLink({
        department: form.department,
        ...(effectiveCategory && { category: effectiveCategory }),
        ...(form.class && { class: form.class }),
        ...(form.session && { session: form.session }),
        maxUses: Number(form.maxUses) || 100,
        expiresInDays: Number(form.expiresInDays) || undefined,
      });
      if (res?.statusCode >= 400 || res?.error) {
        toast.error(res?.message ?? "Failed to create link");
        return;
      }
      toast.success("Registration link created");
      loadLinks();
    } catch {
      toast.error("Network error, please try again");
    }
  };

  const copyLink = async (token: string) => {
    const url = `${window.location.origin}/register/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(token);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Could not copy — the link is shown in the table");
    }
  };

  const revoke = async (id: string) => {
    try {
      const res = await RegistrationService.revokeLink(id);
      if (res?.statusCode >= 400 || res?.error) {
        toast.error(res?.message ?? "Failed to revoke link");
        return;
      }
      toast.success("Link revoked");
      setRevoking(null);
      loadLinks();
    } catch {
      toast.error("Network error, please try again");
    }
  };

  const review = async (id: string, decision: "approved" | "rejected", why?: string) => {
    setReviewing(id);
    try {
      const res = await RegistrationService.review(id, {
        decision,
        ...(why && { reason: why }),
      });
      if (res?.statusCode >= 400 || res?.error) {
        toast.error(res?.message ?? "Failed to save decision");
        return;
      }
      toast.success(res?.message ?? (decision === "approved" ? "Approved" : "Rejected"));
      setRejecting(null);
      setReason("");
      loadPending();
    } catch {
      toast.error("Network error, please try again");
    } finally {
      setReviewing(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">
          Student Registration
        </h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Share a link so students can apply, then approve or reject each application.
        </p>
      </div>

      <div className="flex gap-1 rounded-lg border border-border bg-secondary/30 p-1 w-fit">
        {([[
          "pending",
          "Pending Applications",
        ], ["links", "Registration Links"]] as [Tab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === key
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── PENDING ── */}
      {tab === "pending" && (
        <>
          {loading ? (
            <TableSkeleton rows={5} cols={6} />
          ) : pending.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-border bg-card px-6 py-14 text-center">
              <Clock className="mb-3 h-9 w-9 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">No pending applications</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Applications submitted through your registration links will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-border">
                      {["Student ID", "Name", "Department", "Class", "Session", "Shift", "Marks", "Actions"]
                        .map((h) => (
                          <th key={h} className="p-3 text-left text-xs font-medium text-muted-foreground sm:text-sm">
                            {h}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((s: any) => (
                      <motion.tr key={s._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="border-b border-border last:border-0">
                        <td className="p-3 text-xs font-medium sm:text-sm">{s.specialId}</td>
                        <td className="p-3 text-xs sm:text-sm">
                          {s.name} {s.lastName}
                          <p className="text-[11px] text-muted-foreground">{s.email}</p>
                        </td>
                        <td className="p-3 text-xs text-muted-foreground sm:text-sm">
                          {s.department?.code ?? s.department?.name ?? "—"}
                        </td>
                        <td className="p-3 text-xs sm:text-sm">{s.class ?? "—"}</td>
                        <td className="p-3 text-xs text-muted-foreground sm:text-sm">{s.session}</td>
                        <td className="p-3 text-xs sm:text-sm">{s.shift ?? "—"}</td>
                        <td className="p-3 text-xs text-muted-foreground sm:text-sm">
                          {s.matricMarks}
                          {s.interMarks != null ? ` / ${s.interMarks}` : ""}
                        </td>
                        <td className="p-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline" disabled={reviewing === s._id}
                                className="gap-1">
                                Action <ChevronDown className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem
                                disabled={reviewing === s._id}
                                onSelect={() => setViewing(s)}
                                className="gap-2">
                                <Eye className="h-3.5 w-3.5" /> View
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                disabled={reviewing === s._id}
                                onSelect={() => review(s._id, "approved")}
                                className="gap-2 text-green-700 focus:bg-green-600 focus:text-white">
                                <UserCheck className="h-3.5 w-3.5" /> Accept
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={reviewing === s._id}
                                onSelect={() => { setRejecting(s); setReason(""); }}
                                className="gap-2 text-destructive focus:bg-destructive focus:text-white">
                                <UserX className="h-3.5 w-3.5" /> Reject
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {total > PAGE_SIZE && (
                <PaginationControls
                  page={page}
                  pageSize={PAGE_SIZE}
                  total={total}
                  onPageChange={setPage}
                />
              )}
            </div>
          )}

          {/* Reject reason */}
          {rejecting && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
              <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-modal">
                <h2 className="font-display text-lg font-bold text-foreground">
                  Reject {rejecting.specialId}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  The student will see this reason when they try to log in.
                </p>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Matric marks could not be verified"
                  className="mt-4 min-h-[90px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button>
                  <Button variant="destructive"
                    onClick={() => review(rejecting._id, "rejected", reason.trim() || "Not accepted")}>
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* View — everything the student submitted */}
          {viewing && (
            <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/50 p-4">
              <div className="my-8 w-full max-w-2xl rounded-2xl bg-card p-6 shadow-modal">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display text-lg font-bold text-foreground">
                      {viewing.name} {viewing.lastName}
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {viewing.specialId} · applied{" "}
                      {viewing.createdAt
                        ? new Date(viewing.createdAt).toLocaleString()
                        : "—"}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setViewing(null)}>
                    Close
                  </Button>
                </div>

                <div className="mt-5 space-y-5">
                  <DetailGroup title="Personal details">
                    <Detail label="Full name" value={`${viewing.name ?? ""} ${viewing.lastName ?? ""}`.trim()} />
                    <Detail label="Email" value={viewing.email} />
                    <Detail label="CNIC" value={viewing.cnic} />
                    <Detail label="Gender" value={viewing.gender} />
                  </DetailGroup>

                  <DetailGroup title="Contact">
                    <Detail label="Phone" value={viewing.phone} />
                    <Detail label="WhatsApp" value={viewing.whatsappNumber} />
                    <Detail label="City" value={viewing.city} />
                    <Detail label="Address" value={viewing.address} />
                  </DetailGroup>

                  <DetailGroup title="Academic">
                    <Detail
                      label="Department"
                      value={
                        viewing.department?.name
                          ? `${viewing.department.name}${
                              viewing.department.code ? ` (${viewing.department.code})` : ""
                            }`
                          : "—"
                      }
                    />
                    <Detail label="Programme" value={viewing.category} />
                    <Detail label="Class / Semester" value={viewing.class} />
                    <Detail label="Session" value={viewing.session} />
                    <Detail label="Shift" value={viewing.shift} />
                    <Detail label="Subjects" value={subjectList(viewing.subjects)} />
                  </DetailGroup>

                  <DetailGroup title="Marks & joining">
                    <Detail label="Matric marks" value={viewing.matricMarks} />
                    <Detail label="Inter marks" value={viewing.interMarks} />
                    <Detail label="Date of joining" value={viewing.doj} />
                    <Detail label="Role" value={viewing.role} />
                  </DetailGroup>
                </div>

                <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
                  <Button variant="outline" onClick={() => setViewing(null)}>
                    Close
                  </Button>
                  <Button variant="outline"
                    onClick={() => { setViewing(null); setRejecting(viewing); setReason(""); }}
                    className="text-destructive">
                    <UserX className="h-3.5 w-3.5" /> Reject
                  </Button>
                  <Button onClick={() => { setViewing(null); review(viewing._id, "approved"); }}
                    className="bg-green-600 hover:bg-green-700">
                    <UserCheck className="h-3.5 w-3.5" /> Accept
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── LINKS ── */}
      {tab === "links" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Link2 className="h-4 w-4 text-primary" /> Create a registration link
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Department</label>
                <select className={selectClass} value={form.department}
                  onChange={(e) => setForm((f) => ({ ...f, department: e.target.value, category: "", class: "" }))}>
                  <option value="">Select department</option>
                  {scopedDepartments.map((d: any) => (
                    <option key={d?._id} value={d?._id}>{d?.code} — {d?.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Programme</label>
                <select className={selectClass} value={effectiveCategory}
                  disabled={categoryOptions.length <= 1}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value, class: "" }))}>
                  {categoryOptions.length === 0 && <option value="">Select department first</option>}
                  {categoryOptions.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Class (optional — leave blank to let students pick)
                </label>
                <select className={selectClass} value={form.class}
                  onChange={(e) => setForm((f) => ({ ...f, class: e.target.value }))}>
                  <option value="">Any class</option>
                  {classOptions.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Session</label>
                <Input value={form.session} onChange={(e) => setForm((f) => ({ ...f, session: e.target.value }))} />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Max applications</label>
                <Input type="number" min={1} value={form.maxUses}
                  onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))} />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Valid for (days)</label>
                <Input type="number" min={1} value={form.expiresInDays}
                  onChange={(e) => setForm((f) => ({ ...f, expiresInDays: e.target.value }))} />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={createLink} className="gap-1.5">
                <Link2 className="h-4 w-4" /> Create Link
              </Button>
            </div>
          </div>

          {linksLoading ? (
            <TableSkeleton rows={4} cols={5} />
          ) : links.length === 0 ? (
            <div className="rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
              No registration links yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-border">
                    {["Link", "Department", "Programme", "Used", "Status", "Actions"].map((h) => (
                      <th key={h} className="p-3 text-left text-xs font-medium text-muted-foreground sm:text-sm">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {links.map((l: any) => {
                    const closed = !l.isActive || l.expired || l.remainingUses <= 0;
                    return (
                      <tr key={l._id} className="border-b border-border last:border-0">
                        <td className="max-w-[220px] p-3">
                          <p className="truncate font-mono text-[11px] text-foreground">
                            {`${window.location.origin}/register/${l.token}`}
                          </p>
                          {l.session && (
                            <p className="text-[11px] text-muted-foreground">Session {l.session}</p>
                          )}
                        </td>
                        <td className="p-3 text-xs sm:text-sm">
                          {l.department?.code ?? l.department?.name ?? "—"}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground sm:text-sm">
                          {l.category ?? "Any"}{l.class ? ` · ${l.class}` : ""}
                        </td>
                        <td className="p-3 text-xs sm:text-sm">{l.usedCount} / {l.maxUses}</td>
                        <td className="p-3">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            closed
                              ? "bg-muted/20 text-muted-foreground"
                              : "bg-green-100 text-green-700"
                          }`}>
                            {l.expired ? "Expired" : !l.isActive ? "Revoked" : l.remainingUses <= 0 ? "Full" : "Active"}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="outline" onClick={() => copyLink(l.token)} className="gap-1">
                              {copied === l.token
                                ? <Check className="h-3.5 w-3.5 text-green-600" />
                                : <Copy className="h-3.5 w-3.5" />}
                            </Button>
                            {!closed && (
                              <Button size="sm" variant="outline" onClick={() => setRevoking(l)}
                                className="gap-1 text-destructive">
                                <Ban className="h-3.5 w-3.5" /> Revoke
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Revoke confirmation — yes/no before the link is actually killed */}
          {revoking && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
              <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-modal">
                <h2 className="font-display text-lg font-bold text-foreground">
                  Revoke this registration link?
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Anyone holding this link will no longer be able to open the registration
                  form. Students who already submitted are not affected — review them in the
                  Pending tab.
                </p>

                <div className="mt-4 rounded-lg bg-secondary/40 px-3 py-2">
                  <p className="truncate font-mono text-[11px] text-foreground">
                    {`${window.location.origin}/register/${revoking.token}`}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {revoking.department?.code ?? revoking.department?.name ?? "—"}
                    {" · "}
                    {revoking.category ?? "Any"}
                    {revoking.class ? ` · Class ${revoking.class}` : ""}
                    {" · "}
                    {revoking.usedCount}/{revoking.maxUses} used
                  </p>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setRevoking(null)}>
                    No, keep it
                  </Button>
                  <Button variant="destructive" onClick={() => revoke(revoking._id)}>
                    Yes, revoke
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PendingRegistrations;
