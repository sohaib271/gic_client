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

// Public self-registration. Also eager: a student arriving from a shared link
// should see the form immediately, and this route needs no auth.
import Register from "./pages/Register";

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
const Fee = lazy(() => import("./pages/Fee"));
const IntermediateFee = lazy(() => import("./pages/IntermediateFee"));
const BsAdpFee = lazy(() => import("./pages/BsAdpFee"));
const Settings = lazy(() => import("./pages/Settings"));
const LeaveManagement = lazy(() => import("./pages/LeaveManagement"));
const AppSettings = lazy(() => import("./pages/AppSettings"));
const SendAlert = lazy(() => import("./pages/SendAlert"));
const Survey = lazy(() => import("./pages/Survey"));
const ActiveUsers = lazy(() => import("./pages/ActiveUsers"));
const Announcements = lazy(() => import("./pages/Announcements"));
const Security = lazy(() => import("./pages/Security"));
const StudentProgress = lazy(() => import("./pages/StudentProgress"));
const HodSettings = lazy(() => import("./pages/HodSettings"));
const HodStudentProgress = lazy(() => import("./pages/HodStudentProgress"));
const HodDepartmentFee = lazy(() => import("./pages/HodDepartmentFee"));
const TodayAttendance = lazy(() => import("./pages/TodayAttendance"));
const HodSecurity = lazy(() => import("./pages/HodSecurity"));
const HodStudentLeaves = lazy(() => import("./pages/HodStudentLeaves"));
const PendingRegistrations = lazy(() => import("./pages/PendingRegistrations"));
const HodAppSetting = lazy(() => import("./pages/HodAppSetting"));
const MidtermTests = lazy(() => import("./pages/MidtermTests"));
const MidtermClassSchedule = lazy(() => import("./pages/MidtermClassSchedule"));
const MidtermResults = lazy(() => import("./pages/MidtermResults"));
const MidtermClassResults = lazy(() => import("./pages/MidtermClassResults"));
const ProfessorDashboard = lazy(() => import("./pages/ProfessorDashboard"));
const ProfessorClasses = lazy(() => import("./pages/ProfessorClasses"));
const HodClasses = lazy(() => import("./pages/HodClasses"));
const HodFaculty = lazy(() => import("./pages/HodFaculty"));
const HodStudents = lazy(() => import("./pages/HodStudents"));
const HodDashboard = lazy(() => import("./pages/HodDashboard"));
  const HodProfile = lazy(() => import("./pages/HodProfile"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Preview = lazy(() => import("./pages/__ResultPreview"));

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
              <Route path="/__preview" element={<Preview />} />
              <Route path="/register/:token" element={<Register />} />
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
                <Route path="fee" element={<Fee />} />
                <Route path="fee/intermediate" element={<IntermediateFee />} />
                <Route path="fee/bs-adp" element={<BsAdpFee />} />
                <Route path="settings" element={<Settings />} />
                <Route path="leave-management" element={<LeaveManagement />} />
                <Route path="app-settings" element={<AppSettings />} />
                <Route path="send-alert" element={<SendAlert />} />
                <Route path="survey" element={<Survey />} />
                <Route path="active-users" element={<ActiveUsers />} />
                <Route path="student-registration" element={<PendingRegistrations />} />
                <Route path="announcements" element={<Announcements />} />
                <Route path="security" element={<Security />} />
                <Route path="student-progress" element={<StudentProgress />} />
              </Route>
              <Route path="/professor" element={<ProfessorLayout />}>
                <Route index element={<Navigate to="department/dashboard" replace />} />
                <Route path="dashboard" element={<ProfessorDashboard />} />
                <Route path="classes" element={<ProfessorClasses />} />
                <Route path="department/dashboard" element={<HodDashboard />} />
                <Route path="department/classes" element={<HodClasses />} />
                <Route path="department/faculty" element={<HodFaculty />} />
                <Route path="department/students" element={<HodStudents />} />
                <Route path="department/student-registration" element={<PendingRegistrations />} />
                <Route path="profile" element={<HodProfile />} />
                <Route path="settings" element={<HodSettings />} />
                <Route path="settings/student-progress" element={<HodStudentProgress />} />
                <Route path="settings/department-fee" element={<HodDepartmentFee />} />
                <Route path="settings/today-attendance" element={<TodayAttendance />} />
                <Route path="settings/student-leaves" element={<HodStudentLeaves />} />
                <Route path="settings/leave-types" element={<LeaveManagement backTo="/professor/settings" />} />
                <Route path="settings/app-setting" element={<HodAppSetting />} />
                <Route path="settings/midterm-tests" element={<MidtermTests />} />
                <Route path="settings/midterm-tests/:classId" element={<MidtermClassSchedule />} />
                <Route path="settings/midterm-results" element={<MidtermResults />} />
                <Route path="settings/midterm-results/:classId" element={<MidtermClassResults />} />
                <Route path="settings/security" element={<HodSecurity />} />
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
