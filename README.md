# GIC College Management System (Admin & HOD Panel) — Frontend

A React + TypeScript admin and professor(HOD) portal for managing students, faculty, classes, and attendance.

---

## Tech Stack

- **React 18** with TypeScript
- **Vite** — build tool
- **Tailwind CSS** + **shadcn/ui** — styling and components
- **Framer Motion** — animations
- **Redux Toolkit** — global auth state, persisted to `localStorage`
- **TanStack Query** — server state and data fetching
- **Sonner** — toast notifications
- **html5-qrcode** — QR code scanning (professor attendance)

---

## Project Structure

```
src/
├── components/          # Shared UI components
│   ├── AttendanceMarker.tsx
│   ├── ClassDetail.tsx
│   ├── ConfirmDeleteModal.tsx
│   ├── FacultyDetailView.tsx
│   ├── QRScanner.tsx
│   ├── TeacherQRModal.tsx
│   └── TableSkeleton.tsx
├── hooks/               # Custom React hooks
│   ├── useUsers.ts
│   ├── useClasses.ts
│   ├── useMyClasses.ts
│   ├── useDepartments.ts
│   ├── useTeacherSchedule.ts
│   └── useTeacherAttendanceHistory.ts
├── pages/               # Route-level pages
│   ├── admin/
│   │   ├── Dashboard.tsx
│   │   ├── Faculty.tsx
│   │   ├── IntermediateStudents.tsx
│   │   ├── BsAdpStudents.tsx
│   │   ├── IntermediateClasses.tsx
│   │   └── BsAdpClasses.tsx
│   └── professor/
│       ├── ProfessorDashboard.tsx
│       └── ProfessorClasses.tsx
├── services/            # API service classes
│   ├── userService.ts
│   ├── classService.ts
│   ├── teacherAttendanceService.ts
│   └── otherService.ts
└── store/               # Redux store
    ├── store.ts
    └── userSlice.ts
```

---

## Roles & Access

| Role | Access |
|---|---|
| `admin` | Full dashboard, faculty, students, classes, reports |
| `proff (HOD)` | Own dashboard, assigned classes, attendance marking, QR scan, CRUD their Department classes,faculty and students |

---

## Key Features

### Admin
- **Dashboard** — live student counts, attendance report generator, faculty list with attendance history, struck-off students with history, Faculty QR panel
- **Students** — add/edit/delete intermediate and BS/ADP students, bulk upload via Excel, detail view
- **Faculty** — add professors/principal/VP, view schedule, generate QR code
- **Classes** — create and manage classes by category (intermediate/BS/ADP), assign teachers with schedules, enroll students, struck-off management

### Professor (HOD)
- **Dashboard** — personal timetable with past/live/upcoming lecture states, attendance history
- **Classes** — view assigned & department classes, mark bulk attendance, update individual student attendance, view history, struck/unstruck students from assigned classes and department, add/remove teacher student from their department classes
- **QR Scan** — scan admin's QR code to check in/check out with GPS validation

---

## Auth Flow

Login → Secure HTTP-only JWT cookie set by backend → Automatic cookie inclusion via browser on all API requests → Role-based routing handled via login response.

---

## Bulk Upload Format

Excel columns must match exactly (order does not matter):

```
name | lastName | email | phone | password | gender | address | cnic
department | city | session | category | class | subjects | matricMarks | doj
```

Download a blank template from the Upload Bulk button in the students pages.

---

## Environment

No `.env` required. The API base URL is set directly in `src/services/otherService.ts`. Change it before building for production:
