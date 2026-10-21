import { useState } from "react";
import { LayoutDashboard, LogOut, X, GraduationCap, Users, School, Building2, FileText } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import AuthService from "@/services/authService";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { clearUser } from "@/store/userSlice";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/principal/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/principal/faculty", icon: GraduationCap, label: "Faculty & Teachers" },
  { to: "/principal/students", icon: Users, label: "Students" },
  { to: "/principal/classes", icon: School, label: "Classes" },
  { to: "/principal/departments", icon: Building2, label: "Departments" },
];

interface PrincipalSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const PrincipalSidebar = ({ isOpen, onToggle }: PrincipalSidebarProps) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state: any) => state?.user.user);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    const res = await AuthService.logout(user?._id);
    setLoggingOut(false);
    setLogoutOpen(false);
    if (res?.message !== "Logged Out") return toast.error("Invalid user");
    toast.success(res?.message);
    dispatch(clearUser());
    localStorage.removeItem("persist:root");
    navigate("/");
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-foreground/50 lg:hidden"
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-64 flex-col bg-sidebar transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={onToggle}
          className="absolute right-3 top-4 rounded-lg p-1.5 text-sidebar-foreground hover:bg-sidebar-hover lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 px-6 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold text-card">GIC Principal</span>
        </div>

        <div className="mx-4 mb-6 flex items-center gap-3 rounded-xl bg-sidebar-hover px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {user?.name?.split(" ")[0]?.[0] ?? ""}{user?.name?.split(" ")[1]?.[0] ?? ""}
          </div>
          <div>
            <p className="text-sm font-semibold text-card">{user?.name}</p>
            <p className="text-xs text-sidebar-foreground">Principal</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 overflow-y-auto">
          {navItems.map((item, i) => (
            <motion.div
              key={item.to}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <NavLink
                to={item.to}
                onClick={() => window.innerWidth < 1024 && onToggle()}
                className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            </motion.div>
          ))}
        </nav>

        <div className="p-3">
          <button onClick={() => setLogoutOpen(true)} className="sidebar-link text-destructive cursor-pointer">
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Logout</DialogTitle>
            <DialogDescription>
              Are you sure you want to logout from your account?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setLogoutOpen(false)} disabled={loggingOut}>
              No, Cancel
            </Button>
            <Button variant="destructive" onClick={handleLogout} disabled={loggingOut}>
              {loggingOut ? "Logging out..." : "Yes, Logout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PrincipalSidebar;
