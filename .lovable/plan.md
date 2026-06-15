## Goal
Give HOD professors (`role==='proff' && isHod===true`) a scoped admin-like portal for their own department. Block plain professors (`isHod===false`) from logging in entirely.

## 1. Login gating (`src/pages/Login.tsx`)
- After successful login: if `user.role==='proff' && !user.isHod`, show toast "Access denied — professors cannot log in", call `dispatch(clearUser())`, return.
- Apply the same check inside the `restoreSession` effect so persisted plain-proff sessions are also rejected.
- HOD continues to `/professor/dashboard`. Admin to `/admin/dashboard`. Anyone else → blocked.

## 2. Professor sidebar (`src/components/ProfessorSidebar.tsx`)
Show extra items when `user.isHod`:
- My Timetable (existing)
- My Classes (existing)
- Department Classes (new)
- Department Faculty (new)
- Department Students (new)

## 3. New HOD pages (department-scoped — filter everywhere by `user.department._id`)

### `src/pages/HodClasses.tsx`
- Lists existing classes for the HOD's department (uses `useClasses()` then filters `cls.departmentId._id === user.department._id`).
- Detects program by `user.department.category`:
  - `intermediate` → render the `IntermediateClasses` form layout (Part I/II)
  - `bs_adp` (or `bs`/`adp`) → render the `BsAdpClasses` form layout (program + semester)
- "Add Class" button opens the matching form, with the **department field pre-filled and locked** to the HOD's department.
- Clicking a class opens `ClassDetailView` in read-only-ish mode (HOD can view; teacher-schedule edit and add-student stay disabled — pass a new `readOnly` prop) since the request says HOD primarily creates classes; we leave editing existing class internals to admin to avoid scope creep.

To avoid duplicating ~1.3k lines, extract the form bodies of `IntermediateClasses`/`BsAdpClasses` into small reusable form components:
- `src/components/forms/IntermediateClassForm.tsx`
- `src/components/forms/BsAdpClassForm.tsx`

Each takes `{ lockedDepartmentId?, onSuccess }`, uses `useClassForm`, and renders inside the existing `ClassFormModal`. Refactor `IntermediateClasses.tsx` and `BsAdpClasses.tsx` to consume these (no behaviour change for admin).

### `src/pages/HodFaculty.tsx`
- Uses `useUsers('proff')`, filters by `u.department?._id === user.department._id && !u.isHod` (excludes self).
- Table reusing `Faculty.tsx` row layout (read-only — no Add button).
- Clicking a professor opens `FacultyDetailView` with `type='proff'` showing schedule + attendance (the existing component already shows attendance history via `useTeacherAttendance`).

### `src/pages/HodStudents.tsx`
- Uses `useUsers('student')` then filters `s.department?._id === user.department._id`.
- Reuses the existing `IntermediateStudents` or `BsAdpStudents` table+modal based on `user.department.category`. Cleanest path: extract their shared body into one `StudentsManager` component taking `{ category, lockedDepartmentId }`, then have `IntermediateStudents`, `BsAdpStudents`, and `HodStudents` thin-wrap it. If that refactor balloons, fall back to a leaner copy that supports create/edit/delete/detail + an "Attendance Report" button per row that opens a modal listing the student's attendance via `UserService.getStudentAttendance(classId, studentId)` (we'll iterate over the student's classes).
- Add CSV/print "Generate Report" button on the page summarising attendance for the filtered list (simple client-side aggregation; date-range optional, default last 30 days).

## 4. Routes (`src/App.tsx`)
Add under `/professor`:
- `classes/department` → `HodClasses`
- `faculty` → `HodFaculty`
- `students` → `HodStudents`

All lazy-loaded.

## 5. Permission guards
- `ClassDetailView`: accept optional `readOnly` prop; when true, hide "Add Student", schedule edit, and "Remove" buttons (HOD path passes `readOnly`).
- HOD pages internally guard `if (!user?.isHod) return <AccessDenied />`.

## Technical notes
- No backend changes assumed — department filtering is client-side using existing endpoints.
- `user.department` is already populated on login (used by Faculty table `m?.department?.code`).
- Sidebar layout/colors unchanged; just more `navItems` for HOD.
- Avoid touching admin pages' behaviour except for the form-extraction refactor, which is a pure move.

## Files
**New**
- `src/pages/HodClasses.tsx`
- `src/pages/HodFaculty.tsx`
- `src/pages/HodStudents.tsx`
- `src/components/forms/IntermediateClassForm.tsx`
- `src/components/forms/BsAdpClassForm.tsx`

**Edited**
- `src/pages/Login.tsx` (block plain proff)
- `src/components/ProfessorSidebar.tsx` (HOD nav items)
- `src/App.tsx` (new routes)
- `src/components/ClassDetailView.tsx` (`readOnly` prop)
- `src/pages/IntermediateClasses.tsx`, `src/pages/BsAdpClasses.tsx` (consume new form components)

Shall I proceed?
