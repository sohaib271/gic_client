import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import LoadingScreen from "@/components/LoadingScreen";
import UserService from "@/services/userService";
import { clearUser, setUser } from "@/store/userSlice";

interface RequireAuthProps {
  children: React.ReactNode;
  role: "admin" | "proff";
  requireHod?: boolean;
}

const RequireAuth = ({ children, role, requireHod = false }: RequireAuthProps) => {
  const dispatch = useDispatch();
  const { user, token } = useSelector((state: any) => state.user);
  const [checking, setChecking] = useState(!!token);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    if (!token) {
      setChecking(false);
      setValid(false);
      return;
    }

    let cancelled = false;

    const verify = async () => {
      setChecking(true);
      try {
        const currentUser = await UserService.getCurrentUser();
        if (currentUser?.statusCode >= 400 || currentUser?.error || !currentUser?.role) {
          throw new Error("Invalid session");
        }
        if (currentUser.role !== role || (requireHod && !currentUser.isHod)) {
          throw new Error("Access denied");
        }
        if (!cancelled) {
          dispatch(setUser({ user: currentUser, token }));
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
  }, [dispatch, requireHod, role, token]);

  if (checking) return <LoadingScreen />;
  if (!token || !user || !valid) return <Navigate to="/" replace />;

  return <>{children}</>;
};

export default RequireAuth;
