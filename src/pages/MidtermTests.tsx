import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Search, ChevronDown, UserRound, ArrowLeft } from "lucide-react";
import classroomArt from "@/assets/classroom-art.jpg";
import { useClasses } from "@/hooks/useClasses";

const YEARS = Array.from({ length: 12 }, (_, i) => 2025 + i);
const ALL_YEARS = "all";

const MidtermTests = () => {
  const navigate = useNavigate();
  const user = useSelector((state: any) => state?.user.user);
  const [search, setSearch] = useState("");

  const deptId: string = user?.department?._id ?? user?.department ?? "";
  const { data: classes, isLoading } = useClasses("", deptId);

  const deptClasses = useMemo(
    () =>
      (classes || []).filter(
        (c: any) => (c?.departmentId?._id ?? c?.departmentId) === deptId,
      ),
    [classes, deptId],
  );

  const yearOf = (session?: string) => (session || "").slice(0, 4);

  // Every session is listed by default; the year dropdown narrows the grid down.
  const [year, setYear] = useState<string>(ALL_YEARS);

  // Cover every session year present in the department, not just the default range.
  const yearOptions = useMemo(() => {
    const fromData = deptClasses
      .map((c: any) => Number(yearOf(c.session)))
      .filter((y: number) => Number.isFinite(y) && y > 0);
    return Array.from(new Set([...YEARS, ...fromData])).sort((a, b) => a - b);
  }, [deptClasses]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return deptClasses.filter((c: any) => {
      if (year !== ALL_YEARS && yearOf(c.session) !== year) return false;
      if (!q) return true;
      return (c.className || "").toLowerCase().includes(q);
    });
  }, [deptClasses, search, year]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&family=Poppins:wght@400;500;600&display=swap');
        .mtx-page {
          margin: -0.75rem;
          padding: 38px 34px 48px;
          background: radial-gradient(circle at top right, rgba(235,247,246,.55), transparent 28%), #f8fafc;
          font-family: 'Poppins', Arial, sans-serif;
          color: #14213d;
        }
        .mtx-topbar { display:flex; align-items:flex-start; justify-content:space-between; gap:24px; margin-bottom:34px; flex-wrap:wrap; }
        .mtx-title h2 { margin:0; font-family:'Nunito',sans-serif; font-size:24px; font-weight:700; color:#474747; line-height:1.22; }
        .mtx-title p { margin:0 0 16px; color:#14213d; font-size:14px; font-weight:400; line-height:1.6; font-family:'Nunito',sans-serif; }
        .mtx-actions { display:flex; align-items:center; flex-wrap:wrap; gap:12px; }
        .mtx-control { height:48px; background:#fff; border:1px solid #dfe5ec; border-radius:12px; display:flex; align-items:center; gap:10px; padding:0 14px; box-shadow:0 4px 12px rgba(31,45,61,.04); box-sizing:border-box; }
        .mtx-control svg { width:20px; height:20px; flex-shrink:0; }
        .mtx-search { width:170px; }
        .mtx-search input { width:100%; border:0; outline:0; background:transparent; font-size:13px; color:#34445a; font-family:inherit; }
        .mtx-search input::placeholder { color:#8995a6; }
        .mtx-year { min-width:100px; justify-content:space-between; font-size:13px; font-weight:500; }
        .mtx-year select { background:transparent; border:0; outline:0; font-weight:500; color:#14213d; padding-right:4px; cursor:pointer; font-family:inherit; font-size:13px; }
        .mtx-grid { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:18px; }
        .mtx-card { min-width:0; background:#fff; border:1px solid #e4e9f0; border-radius:18px; padding:12px 12px 0; overflow:hidden; box-shadow:0 6px 18px rgba(31,45,61,.08); transition:.18s ease; cursor:pointer; text-align:center; }
        .mtx-card:hover { transform:translateY(-3px); box-shadow:0 14px 30px rgba(31,45,61,.11); }
        .mtx-art { width:100%; aspect-ratio:215 / 198; border-radius:14px; overflow:hidden; background:#eef3f5; }
        .mtx-art img { width:100%; height:100%; display:block; object-fit:cover; object-position:center center; }
        .mtx-meta { padding:14px 8px 12px; text-align:center; }
        .mtx-meta h3 { margin:0; font-size:15px; line-height:1.35; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .mtx-year-label { margin-top:5px; font-size:13px; line-height:1.4; color:#6f7c90; }
        .mtx-students { border-top:1px solid #e8edf2; min-height:46px; display:flex; align-items:center; justify-content:center; gap:8px; font-size:13px; font-weight:500; color:#1d2d43; }
        .mtx-students svg { width:16px; height:16px; }
        .mtx-empty { grid-column:1 / -1; padding:60px 20px; text-align:center; color:#6f7c90; font-size:14px; background:#fff; border:1px solid #e4e9f0; border-radius:18px; }
        .mtx-skeleton { min-width:0; background:#fff; border:1px solid #e4e9f0; border-radius:18px; padding:12px 12px 0; overflow:hidden; box-shadow:0 6px 18px rgba(31,45,61,.08); }
        .mtx-skeleton .art { width:100%; aspect-ratio:215 / 198; border-radius:14px; background:#eef3f5; animation:pulse 1.4s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        .mtx-pagination-wrap { margin-top:30px; display:flex; justify-content:flex-end; }
        @media(max-width:1500px){ .mtx-grid { gap:16px } }
        @media(min-width:640px){ .mtx-page { margin:-1rem } }
        @media(min-width:768px){ .mtx-page { margin:-1.5rem } }
        @media(min-width:1024px){ .mtx-page { margin:-2rem } }
        @media(max-width:1260px){ .mtx-grid { grid-template-columns:repeat(4,minmax(0,1fr)) } }
        @media(max-width:1000px){ .mtx-grid { grid-template-columns:repeat(3,minmax(0,1fr)) } .mtx-topbar { flex-direction:column } .mtx-actions { justify-content:flex-start; width:100% } }
        @media(max-width:820px){ .mtx-page { padding:24px 16px } .mtx-grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px } .mtx-search { width:100% } }
        @media(max-width:540px){ .mtx-grid { grid-template-columns:1fr } .mtx-year { flex:1; justify-content:center } }
      `}</style>

      <div className="mtx-page">
        <button
          onClick={() => navigate("/professor/settings")}
          className="mb-4 flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Settings
        </button>

        <div className="mtx-topbar">
          <div className="mtx-title">
            <h2>{year === ALL_YEARS ? "Classes" : `Classes (${year})`}</h2>
            <p>Manage and organize all your classes in one place.</p>
          </div>

          <div className="mtx-actions">
            <label className="mtx-control mtx-search">
              <Search />
              <input
                type="text"
                placeholder="Search classes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <div className="mtx-control mtx-year">
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                aria-label="Filter by session year"
              >
                <option value={ALL_YEARS}>All Years</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <ChevronDown />
            </div>
          </div>
        </div>

        <section className="mtx-grid">
          {isLoading &&
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="mtx-skeleton">
                <div className="art" />
              </div>
            ))}

          {!isLoading &&
            visible.map((cls: any) => (
              <article
                key={cls._id}
                className="mtx-card"
                onClick={() => navigate(`/professor/settings/midterm-tests/${cls._id}`)}
              >
                <div className="mtx-art">
                  <img src={classroomArt} alt={cls.className} />
                </div>
                <div className="mtx-meta">
                  <h3>{cls.className}</h3>
                  <div className="mtx-year-label">{yearOf(cls.session) || "—"}</div>
                </div>
                <div className="mtx-students">
                  <UserRound />
                  <span>{(cls.classStudents || []).length}</span>
                </div>
              </article>
            ))}

          {!isLoading && visible.length === 0 && (
            <div className="mtx-empty">No classes found.</div>
          )}
        </section>
      </div>
    </>
  );
};

export default MidtermTests;
