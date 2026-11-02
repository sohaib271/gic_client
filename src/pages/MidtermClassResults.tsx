import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import ClassResultSheet from "@/components/ClassResultSheet";
import { useClasses } from "@/hooks/useClasses";

/**
 * Per-class midterm results.
 *
 * The class grid routes here; the sheet itself owns the student list and the
 * marks form, so this file only resolves the class from the route param.
 */
const MidtermClassResults = () => {
  const navigate = useNavigate();
  const { classId } = useParams();
  const user = useSelector((state: any) => state?.user.user);

  const deptId: string = user?.department?._id ?? user?.department ?? "";
  const { data: classes } = useClasses("", deptId);

  const classData = useMemo(
    () => (classes || []).find((c: any) => c._id === classId),
    [classes, classId],
  );

  return (
    <ClassResultSheet
      classData={classData}
      departmentId={deptId}
      onBack={() => navigate("/professor/settings/midterm-results")}
    />
  );
};

export default MidtermClassResults;