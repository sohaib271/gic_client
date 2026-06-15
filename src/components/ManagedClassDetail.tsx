import ClassDetailView from "@/components/ClassDetailView";

interface ManagedClassDetailProps {
  classData: any;
  professors: any[];
  students: any[];
  onBack: () => void;
  onChange: (classData: any) => void;
  onRefetch?: () => void;
  onMarkAttendance?: () => void;
}

const ManagedClassDetail = ({
  classData,
  professors,
  students,
  onBack,
  onChange,
  onRefetch,
  onMarkAttendance,
}: ManagedClassDetailProps) => {
  const update = (updater: (current: any) => any) => {
    onChange(updater(classData));
    onRefetch?.();
  };

  return (
    <ClassDetailView
      classData={classData}
      professors={professors}
      students={students}
      onBack={onBack}
      onViewSchedule={onMarkAttendance}
      onRemoveTeacher={(teacherId) =>
        update((current) => ({
          ...current,
          assignes: (current.assignes || []).filter(
            (assignment: any) =>
              (assignment.teacherId?._id || assignment.teacherId) !== teacherId,
          ),
        }))
      }
      onRemoveStudent={(studentId) =>
        update((current) => ({
          ...current,
          classStudents: (current.classStudents || []).filter(
            (student: any) => (student?._id || student) !== studentId,
          ),
        }))
      }
      onAddTeachers={(teachers) =>
        update((current) => ({
          ...current,
          assignes: [...(current.assignes || []), ...teachers],
        }))
      }
      onAddStudents={(studentIds) =>
        update((current) => ({
          ...current,
          classStudents: [
            ...(current.classStudents || []),
            ...students.filter((student: any) => studentIds.includes(student._id)),
          ],
        }))
      }
      onUpdateTeacherSchedule={(teacherId, schedule) =>
        update((current) => ({
          ...current,
          assignes: (current.assignes || []).map((assignment: any) =>
            (assignment.teacherId?._id || assignment.teacherId) === teacherId
              ? { ...assignment, schedule }
              : assignment,
          ),
        }))
      }
    />
  );
};

export default ManagedClassDetail;
