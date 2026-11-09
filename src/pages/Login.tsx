import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import LoadingScreen from "@/components/LoadingScreen";
import loginHero from "@/assets/login/login-hero.jpg";
import AuthService from "@/services/authService";
import UserService from "@/services/userService";
import { useDispatch } from "react-redux";
import { clearUser, setUser } from "@/store/userSlice";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { isAdminUser, isHodProfessor, isPrincipalUser, isValidUserResponse } from "@/lib/auth";

const Login = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const dispatch = useDispatch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(isAuthenticated);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setCheckingSession(false);
      return;
    }

    let cancelled = false;

    const restoreSession = async () => {
      setCheckingSession(true);
      try {
        const currentUser = await UserService.getCurrentUser();
        if (!isValidUserResponse(currentUser)) {
          throw new Error("Invalid session");
        }

        // Block plain professors (non-HOD) from restoring a session
        if (!isAdminUser(currentUser) && !isHodProfessor(currentUser) && !isPrincipalUser(currentUser)) {
          throw new Error("Professors cannot log in");
        }

        if (!cancelled) {
          dispatch(setUser({ user: currentUser }));
          if (isAdminUser(currentUser)) {
            navigate("/admin/dashboard", { replace: true });
          } else if (isPrincipalUser(currentUser)) {
            navigate("/principal/dashboard", { replace: true });
          } else if (isHodProfessor(currentUser)) {
            navigate("/professor/department/dashboard", { replace: true });
          } else {
            navigate("/professor/dashboard", { replace: true });
          }
        }
      } catch {
        if (!cancelled) {
          dispatch(clearUser());
          setCheckingSession(false);
        }
      }
    };

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, [dispatch, isAuthenticated, navigate, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const res = await AuthService.login({ email, password });
      if (res?.error) {
        toast.error(res?.message);
        setLoading(false);
        return;
      }
      if (!isValidUserResponse(res?.user)) {
        toast.error(res?.message || "Invalid login response");
        setLoading(false);
        return;
      }
      if (!isAdminUser(res?.user) && !isHodProfessor(res?.user) && !isPrincipalUser(res?.user)) {
        toast.error("Access denied — only Admin, HOD, or Principal can log in");
        setLoading(false);
        return;
      }

      let loginUser = res?.user;
      dispatch(setUser({ user: loginUser }));
      try {
        const currentUser = await UserService.getCurrentUser();
        if (isValidUserResponse(currentUser)) {
          loginUser = currentUser;
          dispatch(setUser({ user: loginUser }));
        }
      } catch {
      }
      setError("");

      if (isAdminUser(loginUser)) {
        navigate("/admin/dashboard");
      } else if (isPrincipalUser(loginUser)) {
        navigate("/principal/dashboard");
      } else if (isHodProfessor(loginUser)) {
        navigate("/professor/department/dashboard");
      } else {
        toast.error("Access denied");
      }

    } catch (err) {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (loading || checkingSession) return <LoadingScreen />;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950">
      <img
        src={loginHero}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#081726]/80 via-[#0b1f33]/35 to-[#0b1f33]/5" />
      <div className="absolute inset-0 bg-slate-950/10" />

      <div className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center gap-10 px-5 py-12 lg:flex-row lg:justify-end lg:gap-16 lg:px-[5%] xl:pr-[10%]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-2xl text-center lg:absolute lg:left-[5%] lg:top-[23%] lg:max-w-[44vw] lg:text-left xl:max-w-[48vw]"
        >
          <h1 className="font-body text-4xl font-bold tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)] sm:text-5xl lg:text-6xl xl:text-7xl">
            Congratulations
          </h1>
          <p className="mt-3 font-body text-xl font-medium text-white/95 sm:text-2xl lg:mt-5 lg:text-3xl">
            Welcome to GIC Portal!
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-[430px] shrink-0 lg:mx-0 lg:w-[31vw] lg:min-w-[400px] lg:max-w-[560px]"
        >
          <div className="rounded-[24px] border border-white/50 bg-white/45 p-8 pb-10 shadow-[0_24px_70px_-20px_rgba(2,18,35,0.55)] backdrop-blur-2xl sm:p-9 sm:pb-11 xl:p-10 xl:pb-16">
            <h2 className="font-body text-[30px] font-bold leading-none text-slate-900 xl:text-[34px]">Login</h2>
            <div className="mt-3 h-[2px] w-40 rounded-full bg-slate-700/50 xl:w-48" />
            <p className="mt-5 font-body text-[15px] text-slate-700 xl:mt-6 xl:text-[17px]">Welcome onboard with us!</p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-5 xl:mt-9 xl:space-y-6">
              <div>
                <label
                  htmlFor="admin-email"
                  className="mb-2 block font-body text-[15px] font-semibold text-slate-800 xl:text-[16px]"
                >
                  Admin Email ID
                </label>
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  placeholder="Enter your username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 w-full rounded-[10px] border border-transparent bg-[#E9F1FC] px-4 font-body text-[15px] text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-[#F2B01E] focus:ring-2 focus:ring-[#F2B01E]/40 xl:h-14 xl:px-5 xl:text-[16px]"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-password"
                  className="mb-2 block font-body text-[15px] font-semibold text-slate-800 xl:text-[16px]"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 w-full rounded-[10px] border border-transparent bg-[#E9F1FC] px-4 pr-11 font-body text-[15px] text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-[#F2B01E] focus:ring-2 focus:ring-[#F2B01E]/40 xl:h-14 xl:px-5 xl:pr-12 xl:text-[16px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-800 xl:right-4"
                  >
                    {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-body text-sm font-medium text-red-700"
                >
                  {error}
                </motion.p>
              )}

              <button
                type="submit"
                className="mt-2 h-12 w-full rounded-[10px] bg-[#F2B01E] font-body text-[16px] font-bold text-slate-900 transition hover:bg-[#e3a40f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/40 active:translate-y-px xl:h-14 xl:text-[17px]"
              >
                Log in
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
