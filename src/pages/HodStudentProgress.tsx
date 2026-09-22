import StudentProgress from "./StudentProgress";
import { useSelector } from "react-redux";

const HodStudentProgress = () => {
  const user = useSelector((state: any) => state?.user.user);
  const deptId = user?.department?._id ?? user?.department ?? null;

  return <StudentProgress deptId={deptId} backPath="/professor/settings" />;
};

export default HodStudentProgress;