import { useSelector } from "react-redux";
import FacultyDetailView from "@/components/FacultyDetailView";

const ProfessorDashboard = () => {
  const user = useSelector((state: any) => state?.user.user);

  // We render the FacultyDetailView in "schedule-only" mode
  // by wrapping it to auto-show the schedule
  return (
    <div>
      <FacultyDetailView
        faculty={user}
        type="proff"
        onBack={() => {}}
        autoShowSchedule
      />
    </div>
  );
};

export default ProfessorDashboard;
