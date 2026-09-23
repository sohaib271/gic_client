import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  UserCircle2,
  Mail,
  Phone,
  MapPin,
  Building2,
  GraduationCap,
  ShieldCheck,
  Loader2,
  Save,
  BadgeCheck,
  Sparkles,
  Plus,
} from "lucide-react";
import { useSelector } from "react-redux";
import { useDepartments } from "@/hooks/useDepartments";
import UserService from "@/services/userService";
import { toast } from "sonner";

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow";
const labelCls = "mb-1.5 block text-sm font-medium text-foreground";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className={labelCls}>{label}</label>
    {children}
  </div>
);

const InfoRow = ({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
}: {
  icon: any;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
}) => (
  <div className="flex items-center gap-3">
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
      <Icon className={`h-4 w-4 ${iconColor}`} />
    </div>
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-semibold text-foreground">{value || "—"}</p>
    </div>
  </div>
);

const HodProfile = () => {
  const reduxUser = useSelector((state: any) => state?.user.user);
  const { data: departments } = useDepartments();
  const deptFromList = (departments || []).find(
    (d: any) => d?._id === (reduxUser?.department?._id ?? reduxUser?.department),
  );
  const [userId, setUserId] = useState("");
  const [form, setForm] = useState({
    name: "",
    lastName: "",
    email: "",
    phone: "",
    city: "",
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    UserService.getCurrentUser()
      .then((u: any) => {
        if (u?._id) {
          setUserId(u._id);
          setForm({
            name: u.name ?? "",
            lastName: u.lastName ?? "",
            email: u.email ?? "",
            phone: u.phone ?? "",
            city: u.city ?? "",
          });
        }
      })
      .catch(() => toast.error("Could not load your profile"))
      .finally(() => setLoading(false));
  }, []);

  const saveProfile = async () => {
    if (!userId) return toast.error("Not signed in");
    if (!form.name.trim()) return toast.error("First name is required");
    setSaving(true);
    try {
      const result = await UserService.updateUser(userId, {
        name: form.name.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
      });
      if (result?.message || result?.user) {
        toast.success("Profile updated successfully");
      } else {
        toast.error(result?.message || "Could not update profile");
      }
    } catch {
      toast.error("Could not reach the server");
    } finally {
      setSaving(false);
    }
  };

  const dept = reduxUser?.department;
  const deptName =
    deptFromList?.name ??
    (typeof dept === "object" ? dept?.name : undefined) ??
    deptFromList?.code ??
    (typeof dept === "object" ? dept?.code : undefined) ??
    "—";
  const deptCode =
    deptFromList?.code ??
    (typeof dept === "object" ? dept?.code : undefined) ??
    "—";
  const fullName = `${form.name} ${form.lastName}`.trim() || "HOD";
  const initials = form.name
    ? `${form.name[0] ?? ""}${form.lastName?.[0] ?? ""}`.toUpperCase()
    : "H";

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarUrl(URL.createObjectURL(file));
      toast.success("Photo selected");
    }
    e.target.value = "";
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-36 rounded-2xl bg-card border border-border animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-card border border-border animate-pulse" />
          ))}
        </div>
        <div className="h-72 rounded-2xl bg-card border border-border animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Cover */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/90 via-primary to-primary/70 p-6 sm:p-8 shadow-card"
      >
        <div className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 right-24 h-44 w-44 rounded-full bg-white/10 blur-xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-white/40 bg-white/20 font-display text-3xl font-bold text-white shadow-md backdrop-blur">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="profile"
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Change photo"
              className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-primary text-white shadow-md transition-transform hover:scale-110"
            >
              <Plus className="h-3 w-3" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarSelect}
            />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">{fullName}</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur">
                <ShieldCheck className="h-3.5 w-3.5" /> HOD
              </span>
            </div>
            <p className="mt-1 text-sm text-white/85 flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4" /> Head of Department · {deptName}
            </p>
          </div>
          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
            <p className="text-[11px] uppercase tracking-wide text-white/70">Department Code</p>
            <p className="font-display text-lg font-bold text-white">
              {deptCode}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Quick stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Department",
            value: deptName,
            icon: Building2,
            iconBg: "bg-blue-50",
            iconColor: "text-blue-600",
          },
          {
            label: "Email",
            value: form.email || "—",
            icon: Mail,
            iconBg: "bg-violet-50",
            iconColor: "text-violet-600",
          },
          {
            label: "Phone",
            value: form.phone || "—",
            icon: Phone,
            iconBg: "bg-emerald-50",
            iconColor: "text-emerald-600",
          },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.06 }}
            className="rounded-xl border border-border bg-card p-4 shadow-card"
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.iconBg}`}>
                <s.icon className={`h-5 w-5 ${s.iconColor}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </p>
                <p className="truncate text-sm font-semibold text-foreground">{s.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* About / Info */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <UserCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-display text-base font-semibold text-foreground">
                  Profile Overview
                </h2>
                <p className="text-xs text-muted-foreground">Your account details</p>
              </div>
            </div>

            <div className="space-y-4">
              <InfoRow
                icon={GraduationCap}
                iconBg="bg-amber-50"
                iconColor="text-amber-600"
                label="Role"
                value="Head of Department"
              />
              <InfoRow
                icon={Building2}
                iconBg="bg-blue-50"
                iconColor="text-blue-600"
                label="Department"
                value={deptName}
              />
              <InfoRow
                icon={Mail}
                iconBg="bg-violet-50"
                iconColor="text-violet-600"
                label="Email"
                value={form.email || "—"}
              />
              <InfoRow
                icon={Phone}
                iconBg="bg-emerald-50"
                iconColor="text-emerald-600"
                label="Phone"
                value={form.phone || "—"}
              />
              <InfoRow
                icon={MapPin}
                iconBg="bg-rose-50"
                iconColor="text-rose-600"
                label="City"
                value={form.city || "—"}
              />
              <InfoRow
                icon={BadgeCheck}
                iconBg="bg-teal-50"
                iconColor="text-teal-600"
                label="Status"
                value="Active Account"
              />
            </div>
          </div>
        </motion.div>

        {/* Edit Profile */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-3"
        >
          <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-display text-base font-semibold text-foreground">
                  Edit Profile
                </h2>
                <p className="text-xs text-muted-foreground">
                  Update your personal information
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputCls}
                  placeholder="Enter first name"
                />
              </Field>
              <Field label="Last name">
                <input
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className={inputCls}
                  placeholder="Enter last name"
                />
              </Field>
              <Field label="Email (login ID)">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={form.email}
                    readOnly
                    disabled
                    className={`${inputCls} pl-9 opacity-60`}
                  />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Email is your login ID and cannot be changed.
                </p>
              </Field>
              <Field label="Phone">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className={`${inputCls} pl-9`}
                    placeholder="Enter phone number"
                  />
                </div>
              </Field>
              <div className="sm:col-span-2">
                <Field label="City">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={form.city ?? ""}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      className={`${inputCls} pl-9`}
                      placeholder="Enter your city"
                    />
                  </div>
                </Field>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-secondary/40 px-4 py-3">
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Role: HOD (Professor) · {deptName}
              </span>
              <button
                onClick={saveProfile}
                disabled={saving || !userId}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default HodProfile;