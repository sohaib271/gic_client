import { useLocation } from "react-router-dom";
import { Bell, ChevronDown, Menu } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useSelector } from "react-redux";

const routeTitles: Record<string, string> = {
  dashboard: "Dashboard",
  students: "Students",
  intermediate: "Intermediate",
  "bs-adp": "BS / ADP",
  faculty: "Faculty",
  attendance: "Attendance",
  subjects: "Subjects",
  score: "Score",
  accounts: "Accounts",
  classes: "Classes",
};

interface TopHeaderProps {
  onMenuToggle: () => void;
}

const TopHeader = ({ onMenuToggle }: TopHeaderProps) => {
//  const {user}=useAuth();
const {user}=useAuth()
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1] || "dashboard";
  const title = routeTitles[lastSegment] || "Dashboard";

  const breadcrumb = segments
    .filter((s) => s !== "admin")
    .map((s) => routeTitles[s] || s)
    .join(" / ");


    

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-4 sm:px-6"
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="rounded-lg p-2 text-muted-foreground hover:bg-secondary transition-colors lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-display text-lg font-bold text-foreground">{title}</h1>
          <p className="text-xs text-muted-foreground">Admin / {breadcrumb}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative rounded-lg p-2 text-muted-foreground hover:bg-secondary transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
        </button>

        <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-secondary transition-colors cursor-pointer">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {user?.name?.split(" ")[0]?.[0] ?? ""}{user?.name?.split(" ")[1]?.[0] ?? ""}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-foreground leading-tight">{user?.name}</p>
            <p className="text-xs text-muted-foreground leading-tight">{user?.role?.toUpperCase()}</p>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
        </div>
      </div>
    </motion.header>
  );
};

export default TopHeader;
