import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LoadingScreen from "./components/LoadingScreen";
import { persistor, store } from "./store/store";

// Login is the entry route — keep eager so first paint isn't delayed by a chunk fetch.
import Login from "./pages/Login";

// Layouts and all inner pages are code-split to shrink the initial bundle.
const AdminLayout = lazy(() => import("./components/AdminLayout"));
const ProfessorLayout = lazy(() => import("./components/ProfessorLayout"));

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Students = lazy(() => import("./pages/Students"));
const IntermediateStudents = lazy(() => import("./pages/IntermediateStudents"));
const BsAdpStudents = lazy(() => import("./pages/BsAdpStudents"));
const Attendance = lazy(() => import("./pages/Attendance"));
const IntermediateAttendance = lazy(() => import("./pages/IntermediateAttendance"));
const BsAdpAttendance = lazy(() => import("./pages/BsAdpAttendance"));
const Subjects = lazy(() => import("./pages/Subjects"));
const IntermediateSubjects = lazy(() => import("./pages/IntermediateSubjects"));
const BsAdpSubjects = lazy(() => import("./pages/BsAdpSubjects"));
const Score = lazy(() => import("./pages/Score"));
const IntermediateScore = lazy(() => import("./pages/IntermediateScore"));
const BsAdpScore = lazy(() => import("./pages/BsAdpScore"));
const Accounts = lazy(() => import("./pages/Accounts"));
const IntermediateAccounts = lazy(() => import("./pages/IntermediateAccounts"));
const BsAdpAccounts = lazy(() => import("./pages/BsAdpAccounts"));
const Faculty = lazy(() => import("./pages/Faculty"));
const Classes = lazy(() => import("./pages/Classes"));
const IntermediateClasses = lazy(() => import("./pages/IntermediateClasses"));
const BsAdpClasses = lazy(() => import("./pages/BsAdpClasses"));
const ProfessorDashboard = lazy(() => import("./pages/ProfessorDashboard"));
const ProfessorClasses = lazy(() => import("./pages/ProfessorClasses"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<LoadingScreen />}>
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
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </PersistGate>
  </Provider>
);

export default App;
