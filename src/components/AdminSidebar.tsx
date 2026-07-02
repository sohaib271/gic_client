import { useState } from "react";
import { LayoutDashboard, Users, CalendarCheck, BookOpen, Trophy, Wallet, GraduationCap, LogOut, X, ChevronDown, School, Receipt } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import AuthService from "@/services/authService";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { clearUser } from "@/store/userSlice";

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  children?: { to: string; label: string }[];
}

const navItems: NavItem[] = [
  { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  {
    to: "/admin/students",
    icon: Users,
    label: "Students",
    children: [
      { to: "/admin/students/intermediate", label: "Intermediate" },
      { to: "/admin/students/bs-adp", label: "BS / ADP" },
    ],
  },
  { to: "/admin/faculty", icon: GraduationCap, label: "Faculty" },
  {
    to: "/admin/classes",
    icon: School,
    label: "Classes",
    children: [
      { to: "/admin/classes/intermediate", label: "Intermediate" },
      { to: "/admin/classes/bs-adp", label: "BS / ADP" },
    ],
  },
  {
    to: "/admin/fee",
    icon: Receipt,
    label: "Fee",
    children: [
      { to: "/admin/fee/intermediate", label: "Intermediate" },
      { to: "/admin/fee/bs-adp", label: "BS / ADP" },
    ],
  },
  // {
  //   to: "/admin/attendance",
  //   icon: CalendarCheck,
  //   label: "Attendance",
  //   children: [
  //     { to: "/admin/attendance/intermediate", label: "Intermediate" },
  //     { to: "/admin/attendance/bs-adp", label: "BS / ADP" },
  //   ],
  // },
  // {
  //   to: "/admin/subjects",
  //   icon: BookOpen,
  //   label: "Subjects",
  //   children: [
  //     { to: "/admin/subjects/intermediate", label: "Intermediate" },
  //     { to: "/admin/subjects/bs-adp", label: "BS / ADP" },
  //   ],
  // },
  // {
  //   to: "/admin/score",
  //   icon: Trophy,
  //   label: "Score",
  //   children: [
  //     { to: "/admin/score/intermediate", label: "Intermediate" },
  //     { to: "/admin/score/bs-adp", label: "BS / ADP" },
  //   ],
  // },
  // {
  //   to: "/admin/accounts",
  //   icon: Wallet,
  //   label: "Accounts",
  //   children: [
  //     { to: "/admin/accounts/intermediate", label: "Intermediate" },
  //     { to: "/admin/accounts/bs-adp", label: "BS / ADP" },
  //   ],
  // },
];

interface AdminSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const AdminSidebar = ({ isOpen, onToggle }: AdminSidebarProps) => {
  const navigate=useNavigate();
  const dispatch=useDispatch()
  const user=useSelector((state:any)=>state?.user.user);
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(
    navItems.filter((item) => item.children && location.pathname.startsWith(item.to)).map((item) => item.to)
  );

  const toggleExpand = (to: string) => {
    setExpandedItems((prev) => (prev.includes(to) ? prev.filter((i) => i !== to) : [...prev, to]));
  };

  async function signOut(){
    const res=await AuthService.logout(user?._id);
    if(res?.message !== "Logged Out") return toast.error("Invalid user");

    toast.success(res?.message);
    dispatch(clearUser())
    localStorage.removeItem("persist:root");
    navigate("/")
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
            <Users className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold text-card">GIC Admin Panel</span>
        </div>

        <div className="mx-4 mb-6 flex items-center gap-3 rounded-xl bg-sidebar-hover px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {user?.name?.split(" ")[0]?.[0] ?? ""}{user?.name?.split(" ")[1]?.[0] ?? ""}
          </div>
          <div>
            <p className="text-sm font-semibold text-card">{user?.name}</p>
            <p className="text-xs text-sidebar-foreground">{user?.role==="admin"?"Administrator":user?.role}</p>
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
              {item.children ? (
                <div>
                  <button
                    onClick={() => {
                      navigate(item.to);
                      toggleExpand(item.to);
                    }}
                    className={`sidebar-link w-full justify-between ${
                      location.pathname.startsWith(item.to) ? "active" : ""
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        expandedItems.includes(item.to) ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  <AnimatePresence>
                    {expandedItems.includes(item.to) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="ml-8 mt-1 space-y-1 border-l border-sidebar-foreground/20 pl-3">
                          {item.children.map((child) => (
                            <NavLink
                              key={child.to}
                              to={child.to}
                              onClick={() => window.innerWidth < 1024 && onToggle()}
                              className={({ isActive }) =>
                                `block rounded-md px-3 py-2 text-sm transition-colors ${
                                  isActive
                                    ? "bg-primary/20 font-medium text-card"
                                    : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-card"
                                }`
                              }
                            >
                              {child.label}
                            </NavLink>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <NavLink
                  to={item.to}
                  onClick={() => window.innerWidth < 1024 && onToggle()}
                  className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </NavLink>
              )}
            </motion.div>
          ))}
        </nav>

        <div className="p-3">
          <button onClick={()=>signOut()} className="sidebar-link text-destructive cursor-pointer">
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
