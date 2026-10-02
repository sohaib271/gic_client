import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Shield,
  KeyRound,
  Mail,
  Phone,
  Send,
  Lock,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import UserAvatar from "@/components/UserAvatar";
import UserService from "@/services/userService";
import AuthService from "@/services/authService";
import { toast } from "sonner";

const LockedField = () => (
  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
    <Lock className="h-3 w-3" /> Locked
  </span>
);

const Security = ({ backPath = "/admin/settings", roleName = "admin profile" }: { backPath?: string; roleName?: string }) => {
  const navigate = useNavigate();

  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState({
    name: "",
    lastName: "",
    email: "",
    phone: "",
    city: "",
    image: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);

  const [cur, setCur] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  const [otpSending, setOtpSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    UserService.getCurrentUser()
      .then((u: any) => {
        if (u?._id) {
          setUserId(u._id);
          setProfile({
            name: u.name ?? "",
            lastName: u.lastName ?? "",
            email: u.email ?? "",
            phone: u.phone ?? "",
            city: u.city ?? "",
            image: u.image ?? "",
          });
        }
      })
      .catch(() => toast.error("Could not load your profile"));
  }, []);

  const saveProfile = async () => {
    setProfileSaving(true);
    try {
      const result = await UserService.updateUser(userId, {
        name: profile.name.trim(),
        lastName: profile.lastName.trim(),
        phone: profile.phone.trim(),
        city: profile.city.trim(),
      });
      if (result?.message || result?.user) {
        toast.success("Profile updated");
      } else {
        toast.error(result?.message || "Could not update profile");
      }
    } catch {
      toast.error("Could not reach the server");
    } finally {
      setProfileSaving(false);
    }
  };

  const changePassword = async () => {
    if (!cur || !newPass || !confirm)
      return toast.error("Fill in all password fields");
    if (newPass.length < 6)
      return toast.error("New password must be at least 6 characters");
    if (newPass !== confirm)
      return toast.error("New passwords do not match");

    setPwSaving(true);
    try {
      const result = await AuthService.changePassword(cur, newPass);
      if (result?.message) {
        toast.success("Password changed");
        setCur("");
        setNewPass("");
        setConfirm("");
      } else {
        toast.error(result?.message || "Could not change password");
      }
    } catch {
      toast.error("Could not reach the server");
    } finally {
      setPwSaving(false);
    }
  };

  const sendOtp = async () => {
    setOtpSending(true);
    setOtpSent(false);
    try {
      const result = await AuthService.sendResetOtp(profile.email);
      if (result?.message) {
        setOtpSent(true);
        toast.success("OTP sent to your email");
      } else {
        toast.error(result?.message || "Could not send OTP");
      }
    } catch {
      toast.error("Could not reach the server");
    } finally {
      setOtpSending(false);
    }
  };

  const inputCls =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";
  const labelCls = "mb-1.5 block text-sm font-medium text-foreground";

  return (
    <div>
      <button
        onClick={() => navigate(backPath)}
        className="mb-4 flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Settings
      </button>

      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-2 font-display text-xl font-bold text-foreground sm:text-2xl"
      >
        Security & Account
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-8 text-sm text-muted-foreground"
      >
        Manage your {roleName}, password and account security
      </motion.p>

      <div className="grid gap-6">
        {/* Account details */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="p-6">
              <div className="mb-5 flex items-center gap-3">
                <UserAvatar
                  image={profile.image}
                  name={profile.name}
                  lastName={profile.lastName}
                  className="h-10 w-10"
                />
                <div>
                  <h2 className="font-display text-base font-semibold text-foreground">
                    Account Details
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Name, phone and city can be changed
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>First name</label>
                  <input
                    value={profile.name}
                    onChange={(e) =>
                      setProfile({ ...profile, name: e.target.value })
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Last name</label>
                  <input
                    value={profile.lastName}
                    onChange={(e) =>
                      setProfile({ ...profile, lastName: e.target.value })
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={`${labelCls} flex items-center gap-2`}>
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    Email <LockedField />
                  </label>
                  <input
                    value={profile.email}
                    readOnly
                    disabled
                    className={`${inputCls} opacity-60`}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Email is your login ID and cannot be changed from here.
                  </p>
                </div>
                <div>
                  <label className={`${labelCls} flex items-center gap-2`}>
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    Phone
                  </label>
                  <input
                    value={profile.phone}
                    onChange={(e) =>
                      setProfile({ ...profile, phone: e.target.value })
                    }
                    className={inputCls}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>City</label>
                  <input
                    value={profile.city ?? ""}
                    onChange={(e) =>
                      setProfile({ ...profile, city: e.target.value })
                    }
                    className={inputCls}
                  />
                </div>
              </div>

              <button
                onClick={saveProfile}
                disabled={profileSaving || !userId}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {profileSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Save Changes
              </button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Change password */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                  <KeyRound className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="font-display text-base font-semibold text-foreground">
                    Change Password
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Min 6 characters, must include a number
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: "Current password", value: cur, set: setCur, show: showCur, toggle: setShowCur },
                  { label: "New password", value: newPass, set: setNewPass, show: showNew, toggle: setShowNew },
                  { label: "Confirm new password", value: confirm, set: setConfirm, show: showConfirm, toggle: setShowConfirm },
                ].map((f) => (
                  <div key={f.label}>
                    <label className={labelCls}>{f.label}</label>
                    <div className="relative">
                      <input
                        type={f.show ? "text" : "password"}
                        value={f.value}
                        onChange={(e) => f.set(e.target.value)}
                        className={`${inputCls} pr-9`}
                      />
                      <button
                        type="button"
                        onClick={() => f.toggle(!f.show)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {f.show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={changePassword}
                disabled={pwSaving}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-600/90 disabled:opacity-50"
              >
                {pwSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="h-4 w-4" />
                )}
                Update Password
              </button>
            </CardContent>
          </Card>
        </motion.div>

        {/* OTP / email verification */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50">
                  <Mail className="h-5 w-5 text-sky-600" />
                </div>
                <div>
                  <h2 className="font-display text-base font-semibold text-foreground">
                    Email Verification / OTP
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Verify your email with a one-time password
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="rounded-lg bg-secondary/60 px-3 py-2 text-sm text-foreground">
                  {profile.email || "—"}
                </div>
                <button
                  onClick={sendOtp}
                  disabled={otpSending || !profile.email}
                  className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-600/90 disabled:opacity-50"
                >
                  {otpSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {otpSending ? "Sending…" : "Send OTP to email"}
                </button>
              </div>

              {otpSent && (
                <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  OTP sent! It expires in 10 minutes. Check your inbox (and spam).
                </p>
              )}
              <p className="mt-3 text-[11px] text-muted-foreground">
                The OTP is delivered to your registered email and is valid for 10
                minutes. You can request up to 3 OTPs every 15 minutes.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Security;