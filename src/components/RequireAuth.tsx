import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import LoadingScreen from "@/components/LoadingScreen";
import UserService from "@/services/userService";
import { clearUser, setUser } from "@/store/userSlice";
import { isHodProfessor, isPrincipalUser, isValidUserResponse, normalizeRole } from "@/lib/auth";

interface RequireAuthProps {
  children: React.ReactNode;
  role?: "admin" | "proff" | "principal";
  requireHod?: boolean;
  requirePrincipal?: boolean;
}

const RequireAuth = ({ children, role, requireHod = false, requirePrincipal = false }: RequireAuthProps) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: any) => state.user);
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      setChecking(true);
      try {
        const currentUser = await UserService.getCurrentUser();
        if (!isValidUserResponse(currentUser)) {
          throw new Error("Invalid session");
        }
        if (role === "admin" && normalizeRole(currentUser.role) !== "admin") {
          throw new Error("Access denied");
        }
        if (role === "proff" && normalizeRole(currentUser.role) !== "proff") {
          throw new Error("Access denied");
        }
        if (role === "principal" && !isPrincipalUser(currentUser)) {
          throw new Error("Access denied");
        }
        if (requireHod && !isHodProfessor(currentUser)) {
          throw new Error("Access denied");
        }
        if (requirePrincipal && !isPrincipalUser(currentUser)) {
          throw new Error("Access denied");
        }
        if (!cancelled) {
          dispatch(setUser({ user: currentUser }));
          setValid(true);
        }
      } catch {
        if (!cancelled) {
          dispatch(clearUser());
          setValid(false);
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    verify();
    return () => {
      cancelled = true;
    };
  }, [dispatch, requireHod, requirePrincipal, role]);

  if (checking) return <LoadingScreen />;
  if (!user || !valid) return <Navigate to="/" replace />;

  return <>{children}</>;
};

export default RequireAuth;
