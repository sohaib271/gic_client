import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "./pages/Login";
import AdminLayout from "./components/AdminLayout";
import ProfessorLayout from "./components/ProfessorLayout";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import IntermediateStudents from "./pages/IntermediateStudents";
import BsAdpStudents from "./pages/BsAdpStudents";
import Attendance from "./pages/Attendance";
import IntermediateAttendance from "./pages/IntermediateAttendance";
import BsAdpAttendance from "./pages/BsAdpAttendance";
import Subjects from "./pages/Subjects";
import IntermediateSubjects from "./pages/IntermediateSubjects";
import BsAdpSubjects from "./pages/BsAdpSubjects";
import Score from "./pages/Score";
import IntermediateScore from "./pages/IntermediateScore";
import BsAdpScore from "./pages/BsAdpScore";
import Accounts from "./pages/Accounts";
import IntermediateAccounts from "./pages/IntermediateAccounts";
import BsAdpAccounts from "./pages/BsAdpAccounts";
import Faculty from "./pages/Faculty";
import Classes from "./pages/Classes";
import { Provider } from "react-redux";
import IntermediateClasses from "./pages/IntermediateClasses";
import BsAdpClasses from "./pages/BsAdpClasses";
import ProfessorDashboard from "./pages/ProfessorDashboard";
import ProfessorClasses from "./pages/ProfessorClasses";
import NotFound from "./pages/NotFound";
import { persistor, store } from "./store/store";
import { PersistGate } from "redux-persist/integration/react";

const queryClient = new QueryClient();

const App = () => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="students" element={<Students />} />
                <Route path="students/intermediate" element={<IntermediateStudents />} />
                <Route path="students/bs-adp" element={<BsAdpStudents />} />
                <Route path="faculty" element={<Faculty />} />
                <Route path="attendance" element={<Attendance />} />
                <Route path="attendance/intermediate" element={<IntermediateAttendance />} />
                <Route path="attendance/bs-adp" element={<BsAdpAttendance />} />
                <Route path="subjects" element={<Subjects />} />
                <Route path="subjects/intermediate" element={<IntermediateSubjects />} />
                <Route path="subjects/bs-adp" element={<BsAdpSubjects />} />
                <Route path="score" element={<Score />} />
                <Route path="score/intermediate" element={<IntermediateScore />} />
                <Route path="score/bs-adp" element={<BsAdpScore />} />
                <Route path="accounts" element={<Accounts />} />
                <Route path="accounts/intermediate" element={<IntermediateAccounts />} />
                <Route path="accounts/bs-adp" element={<BsAdpAccounts />} />
                <Route path="classes" element={<Classes />} />
                <Route path="classes/intermediate" element={<IntermediateClasses />} />
                <Route path="classes/bs-adp" element={<BsAdpClasses />} />
              </Route>
              <Route path="/professor" element={<ProfessorLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<ProfessorDashboard />} />
                <Route path="classes" element={<ProfessorClasses />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </PersistGate>
  </Provider>
);

export default App;
