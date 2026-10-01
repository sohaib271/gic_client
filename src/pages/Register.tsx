import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Loader2, GraduationCap, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StudentFormField as Field } from "@/components/students/StudentFormPrimitives";
import { SEMESTERS } from "@/lib/academic";
import { selectInputClass as selectClass } from "@/lib/formStyles";
import RegistrationService from "@/services/registrationService";

type LinkInfo = {
  department: { name: string; code: string };
  category: string | null;
  class: string | null;
  session: string;
  remainingUses: number;
  requiresInterMarks: boolean;
};

const initialForm = {
  name: "",
  lastName: "",
  email: "",
  password: "",
  cnic: "",
  phone: "",
  address: "",
  city: "",
  rollNo: "",
  matricMarks: "",
  interMarks: "",
  doj: "",
  whatsappNumber: "",
  gender: "M",
  subjects: "",
  class: "I",
};

/**
 * Public student self-registration. Reached only through a HOD/admin-generated
 * link (/register/:token) — there is no way to reach this form without a
 * valid token, and the token decides the department/programme.
 */
const Register = () => {
  const { token } = useParams<{ token: string }>();

  const [info, setInfo] = useState<LinkInfo | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [loadingLink, setLoadingLink] = useState(true);

  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const set =
    (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const load = async () => {
      setLoadingLink(true);
      setLinkError(null);
      try {
        const res = await RegistrationService.getLinkInfo(token);
        if (cancelled) return;
        if (res?.statusCode >= 400 || res?.message) {
          setLinkError(res?.message ?? "This registration link is not valid");
          return;
        }
        setInfo(res);
        // Pre-fill the date of joining so most students don't have to hunt for it
        setForm((f) => ({ ...f, doj: f.doj || new Date().toISOString().split("T")[0] }));
      } catch {
        if (!cancelled) setLinkError("Could not load this registration link");
      } finally {
        if (!cancelled) setLoadingLink(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [token]);

  const validate = (): string | null => {
    if (!form.name.trim()) return "First name is required";
    if (!form.lastName.trim()) return "Last name is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Invalid email format";
    if (form.password.length < 8) return "Password must be at least 8 characters";
    if (!/^\d{13}$/.test(form.cnic)) return "CNIC must be exactly 13 digits, no dashes";
    if (!/^(92\d{10}|0\d{10})$/.test(form.phone)) {
      return "Phone: 12 digits starting with 92, or 11 digits starting with 0";
    }
    if (!form.address.trim()) return "Address is required";
    if (!form.city.trim()) return "City is required";
    if (!form.rollNo || Number.isNaN(Number(form.rollNo)) || Number(form.rollNo) < 1) {
      return "Roll No is required and starts from 1";
    }
    if (!form.matricMarks || Number.isNaN(Number(form.matricMarks))) {
      return "Matric marks are required";
    }
    const matric = Number(form.matricMarks);
    if (matric < 0 || matric > 1200) return "Matric marks must be between 0 and 1200";
    if (info?.requiresInterMarks) {
      if (!form.interMarks || Number.isNaN(Number(form.interMarks))) {
        return "Inter marks are required for this programme";
      }
      const inter = Number(form.interMarks);
      if (inter < 0 || inter > 1200) return "Inter marks must be between 0 and 1200";
    }
    if (!form.doj) return "Date of joining is required";
    if (form.whatsappNumber && !/^(92\d{10}|0\d{10})$/.test(form.whatsappNumber)) {
      return "WhatsApp number format is invalid";
    }
    return null;
  };

  const handleSubmit = async () => {
    setFormError(null);
    const error = validate();
    if (error) {
      setFormError(error);
      return;
    }

    setSubmitting(true);
    try {
      const res = await RegistrationService.apply({
        registrationToken: token!,
        name: form.name.trim(),
        lastName: form.lastName.trim(),
        email: form.email.toLowerCase().trim(),
        password: form.password,
        cnic: form.cnic,
        phone: form.phone,
        address: form.address.trim(),
        city: form.city.trim(),
        rollNo: Number(form.rollNo),
        matricMarks: Number(form.matricMarks),
        ...(info?.requiresInterMarks && { interMarks: Number(form.interMarks) }),
        // Only sent when the link did not lock the class; the service prefers
        // the token's value either way.
        ...(info && !info.class && { class: form.class }),
        doj: form.doj,
        ...(form.whatsappNumber && { whatsappNumber: form.whatsappNumber }),
        ...(form.subjects && { subjects: form.subjects }),
        gender: form.gender,
      });

      if (res?.statusCode >= 400 || res?.error) {
        const msg = res?.message;
        if (Array.isArray(msg)) setFormError(msg.join(", "));
        else setFormError(msg ?? "Could not submit your application");
        return;
      }

      setSuccess(res?.message ?? "Application submitted");
      setForm(initialForm);
    } catch {
      setFormError("Network error, please try again");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading / invalid link ──
  if (loadingLink) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (linkError || !info) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-card">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-destructive" />
          <h1 className="font-display text-lg font-bold text-foreground">Link not available</h1>
          <p className="mt-2 text-sm text-muted-foreground">{linkError}</p>
          <p className="mt-4 text-xs text-muted-foreground">
            Please contact your HOD for a working registration link.
          </p>
        </div>
      </div>
    );
  }

  // ── Submitted ──
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-card">
          <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-600" />
          <h1 className="font-display text-xl font-bold text-foreground">Application received</h1>
          <p className="mt-2 text-sm text-muted-foreground">{success}</p>
          <p className="mt-4 rounded-lg bg-secondary/40 px-4 py-3 text-xs text-muted-foreground">
            <Lock className="mr-1 inline h-3 w-3" />
            You cannot log in until your application is approved. If it is rejected, the
            reason will be shown when you try.
          </p>
          <Button className="mt-6 w-full" onClick={() => setSuccess(null)}>
            Submit another application
          </Button>
        </motion.div>
      </div>
    );
  }

  const programLabel =
    info.category === "intermediate" ? "Intermediate" : info.category === "adp" ? "ADP" : "BS";

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">
              Student Registration
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              {info.department.name} · {programLabel} · Session {info.session}
            </p>
          </div>
        </div>

        <div className="mb-5 rounded-xl border border-border bg-secondary/30 px-4 py-3 text-xs text-muted-foreground">
          Your application must be approved by your HOD or the administration before you can
          log in. {info.remainingUses} place{info.remainingUses === 1 ? "" : "s"} left on this link.
        </div>

        {formError && (
          <div className="mb-5 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First Name">
              <Input value={form.name} onChange={set("name")} />
            </Field>
            <Field label="Last Name">
              <Input value={form.lastName} onChange={set("lastName")} />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={set("email")} />
            </Field>
            <Field label="Password (min 8 characters)">
              <Input type="password" value={form.password} onChange={set("password")} />
            </Field>
            <Field label="CNIC (13 digits, no dashes)">
              <Input maxLength={13} value={form.cnic} onChange={set("cnic")} />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={set("phone")} placeholder="03xxxxxxxxx" />
            </Field>
            <Field label="Gender">
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={form.gender}
                onChange={set("gender")}
              >
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
            <Field label="Roll No">
              <Input type="number" min={1} value={form.rollNo} onChange={set("rollNo")} />
            </Field>
            <Field label="Matric Marks (out of 1200)">
              <Input
                type="number"
                min={0}
                max={1200}
                value={form.matricMarks}
                onChange={set("matricMarks")}
              />
            </Field>
            {info.requiresInterMarks && (
              <Field label="Inter Marks (out of 1200)">
                <Input
                  type="number"
                  min={0}
                  max={1200}
                  value={form.interMarks}
                  onChange={set("interMarks")}
                />
              </Field>
            )}
            <Field label="WhatsApp Number (optional)">
              <Input value={form.whatsappNumber} onChange={set("whatsappNumber")} />
            </Field>
            <Field label="Class / Semester">
              {info.class ? (
                <Input
                  value={`${info.class}${info.class === "I" || info.class === "II" ? "" : " Semester"}`}
                  disabled
                  className="bg-secondary/50 text-muted-foreground"
                />
              ) : info.category === "intermediate" ? (
                <select
                  className={selectClass}
                  value={form.class}
                  onChange={set("class")}
                >
                  <option value="I">1st Year</option>
                  <option value="II">2nd Year</option>
                </select>
              ) : (
                <select
                  className={selectClass}
                  value={form.class}
                  onChange={set("class")}
                >
                  {(info.category === "adp" ? SEMESTERS.slice(0, 4) : SEMESTERS).map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label} Semester
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Department" col2>
              <Input
                value={`${info.department.name}${info.department.code ? ` (${info.department.code})` : ""}`}
                disabled
                className="bg-secondary/50 text-muted-foreground"
              />
            </Field>
            <Field label="Address" col2>
              <textarea
                value={form.address}
                onChange={set("address")}
                placeholder="Town, Street/Block, House No"
                className="min-h-[72px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </Field>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setForm(initialForm)} disabled={submitting}>
              Clear
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Application"}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Register;
