import { useState } from "react";
import { Outlet } from "react-router-dom";
import ProfessorSidebar from "./ProfessorSidebar";
import TopHeader from "./TopHeader";

const ProfessorLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="flex min-h-screen bg-background">
      <ProfessorSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1 flex-col lg:ml-64">
        <TopHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default ProfessorLayout;
