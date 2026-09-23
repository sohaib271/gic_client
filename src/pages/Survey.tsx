import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ClipboardList,
  Plus,
  X,
  Search,
  Inbox,
  Eye,
  Pencil,
  Trash2,
  Send,
  CheckCircle2,
  ListChecks,
  Users,
  MessageCircleQuestion,
  CircleDot,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import ConfirmDeleteModal from "@/components/ConfirmDelete";
import TableSkeleton from "@/components/TableSkeleton";
import SurveyService, { SurveyItem, SurveyQuestion } from "@/services/surveyService";
import { useClasses } from "@/hooks/useClasses";
import { toast } from "sonner";

const categories: Array<{ key: string; label: string }> = [
  { key: "intermediate", label: "Intermediate" },
  { key: "bs", label: "BS" },
  { key: "adp", label: "ADP" },
];

const typeLabels: Record<string, string> = {
  text: "Text answer",
  single: "Single choice",
  multiple: "Multiple choice",
};

const formatDate = (value?: string) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const emptyQuestion = (): SurveyQuestion => ({
  question: "",
  type: "single",
  options: ["", ""],
  required: true,
});

const Survey = () => {
  const navigate = useNavigate();

  const classesData: any = useClasses();
  const classList = useMemo(
    () =>
      Array.isArray(classesData?.data)
        ? classesData.data
        : Array.isArray(classesData?.data?.classes)
          ? classesData.data.classes
          : [],
    [classesData],
  );

  const [surveys, setSurveys] = useState<SurveyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SurveyItem | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<SurveyQuestion[]>([emptyQuestion()]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [category, setCategory] = useState("intermediate");
  const [classSearch, setClassSearch] = useState("");

  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SurveyItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredClasses = useMemo(
    () =>
      classList
        .filter((c: any) => c.category === category)
        .filter((c: any) =>
          c.className?.toLowerCase().includes(classSearch.trim().toLowerCase()),
        ),
    [classList, category, classSearch],
  );

  const toggleClass = (name: string) =>
    setSelectedClasses((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );

  const load = async () => {
    setLoading(true);
    try {
      const result = await SurveyService.list();
      setSurveys(Array.isArray(result?.surveys) ? result.surveys : []);
    } catch {
      toast.error("Could not load surveys");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setDescription("");
    setQuestions([emptyQuestion()]);
    setSelectedClasses([]);
    setClassSearch("");
    setFormOpen(true);
  };

  const openEdit = (s: SurveyItem) => {
    setEditing(s);
    setTitle(s.title);
    setDescription(s.description ?? "");
    setQuestions(
      Array.isArray(s.questions) && s.questions.length > 0
        ? s.questions.map((q) => ({
            question: q.question,
            type: q.type,
            options: Array.isArray(q.options) ? q.options : [],
            required: !!q.required,
          }))
        : [emptyQuestion()],
    );
    setSelectedClasses(Array.isArray(s.classNames) ? s.classNames : []);
    setCategory("bs");
    setClassSearch("");
    setFormOpen(true);
  };

  const updateQuestion = (idx: number, patch: Partial<SurveyQuestion>) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)),
    );
  };

  const updateOption = (qi: number, oi: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qi) return q;
        const options = [...(q.options ?? [])];
        options[oi] = value;
        return { ...q, options };
      }),
    );
  };

  const validateForm = () => {
    if (!title.trim()) return "Title is required";
    if (selectedClasses.length === 0) return "Select at least one class";
    if (questions.length === 0) return "Add at least one question";
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) return `Question ${i + 1} text is required`;
      if (q.type !== "text") {
        const options = q.options
          ?.map((o) => String(o).trim())
          .filter((o) => o !== "") ?? [];
        if (options.length < 2)
          return `Question ${i + 1}: add at least 2 options`;
        const seen = new Set<string>();
        for (const o of options) {
          if (seen.has(o))
            return `Question ${i + 1}: duplicate option "${o}"`;
          seen.add(o);
        }
      }
    }
    return null;
  };

  const handleSave = async () => {
    const err = validateForm();
    if (err) return toast.error(err);

    const payload = {
      title: title.trim(),
      description: description.trim(),
      classNames: selectedClasses,
      category,
      questions: questions.map((q) => ({
        question: q.question.trim(),
        type: q.type,
        options:
          q.type === "text" ? [] : (q.options ?? []).map((o) => String(o).trim()).filter((o) => o !== ""),
        required: q.required,
      })),
      status: editing?.status ?? "active",
    };

    setSaving(true);
    try {
      const result = editing
        ? await SurveyService.update(editing._id, payload)
        : await SurveyService.create(payload);
      if (result?.survey || result?.message) {
        toast.success(editing ? "Survey updated" : "Survey created");
        setFormOpen(false);
        load();
      } else {
        toast.error(result?.message || "Could not save survey");
      }
    } catch {
      toast.error("Could not reach the server");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (s: SurveyItem) => {
    const next = s.status === "active" ? "inactive" : "active";
    try {
      const result = await SurveyService.setStatus(s._id, next);
      if (result?.message) {
        toast.success(next === "active" ? "Survey published" : "Survey unpublished");
        setSurveys((prev) =>
          prev.map((x) =>
            x._id === s._id ? { ...x, status: next } : x,
          ),
        );
      }
    } catch {
      toast.error("Could not update survey");
    }
  };

  const openDetail = async (s: SurveyItem) => {
    setDetailLoading(true);
    setDetail({ id: s._id, title: s.title });
    try {
      const result = await SurveyService.detail(s._id);
      setDetail({ id: s._id, ...result });
    } catch {
      toast.error("Could not load results");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await SurveyService.remove(deleteTarget._id);
      if (result?.message) {
        toast.success("Survey deleted");
        setSurveys((prev) => prev.filter((x) => x._id !== deleteTarget._id));
      } else {
        toast.error(result?.message || "Could not delete survey");
      }
    } catch {
      toast.error("Could not reach the server");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const stats = useMemo(() => {
    const total = surveys.length;
    const active = surveys.filter((s) => s.status === "active").length;
    const inactive = total - active;
    const responses = surveys.reduce((sum, s) => sum + (s.responseCount ?? 0), 0);
    return [
      { label: "Total Surveys", value: total, icon: ClipboardList, color: "text-teal-600", bg: "bg-teal-50" },
      { label: "Active", value: active, icon: Send, color: "text-emerald-600", bg: "bg-emerald-50" },
      { label: "Inactive", value: inactive, icon: Inbox, color: "text-rose-600", bg: "bg-rose-50" },
      { label: "Total Responses", value: responses, icon: Users, color: "text-indigo-600", bg: "bg-indigo-50" },
    ];
  }, [surveys]);

  return (
    <div>
      <button
        onClick={() => navigate("/admin/settings")}
        className="mb-4 flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Settings
      </button>

      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-2 font-display text-xl font-bold text-foreground sm:text-2xl"
      >
        Survey
      </motion.h1>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-sm text-muted-foreground"
        >
          Design questionnaires and publish them to students
        </motion.p>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Create Survey
        </button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border bg-card p-4 shadow-card"
          >
            <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${stat.bg}`}>
              <stat.icon className={`h-4.5 w-4.5 ${stat.color}`} />
            </div>
            <p className="font-display text-xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* List */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-display text-base font-semibold text-foreground">
                All Surveys
              </h2>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                {surveys.length}
              </span>
            </div>

            {loading ? (
              <TableSkeleton rows={5} cols={5} />
            ) : surveys.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <ClipboardList className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No surveys yet. Create your first one above.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {surveys.map((s, i) => (
                  <motion.div
                    key={s._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="rounded-xl border border-border p-4 transition-colors hover:bg-secondary/40"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-display text-sm font-semibold text-foreground">
                            {s.title}
                          </p>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              s.status === "active"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {s.status === "active" ? "Active" : "Inactive"}
                          </span>
                        </div>
                        {s.description && (
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                            {s.description}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => openDetail(s)}
                          disabled={detailLoading}
                          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                          title="View results"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(s)}
                          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => toggleStatus(s)}
                          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-amber/10 hover:text-amber-600"
                          title={s.status === "active" ? "Unpublish" : "Publish"}
                        >
                          {s.status === "active" ? (
                            <Inbox className="h-4 w-4" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(s)}
                          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <ListChecks className="h-3.5 w-3.5" />
                        {Array.isArray(s.questions) ? s.questions.length : 0} questions
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {s.responseCount ?? 0} responses
                      </span>
                      <span>
                        {Array.isArray(s.classNames) ? s.classNames.length : 0} class
                        {(s.classNames?.length ?? 0) === 1 ? "" : "es"}
                      </span>
                      <span>
                        {s.createdBy?.name
                          ? `by ${s.createdBy.name}${s.createdBy.role ? ` (${s.createdBy.role})` : ""}`
                          : ""}
                        {formatDate(s.createdAt)}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Create / Edit modal */}
      <AnimatePresence>
        {formOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4"
            onClick={() => !saving && setFormOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6 shadow-modal"
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <ClipboardList className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-semibold text-foreground">
                      {editing ? "Edit Survey" : "New Survey"}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {editing
                        ? "Update the survey details below"
                        : "Set a title, pick classes, then build your questions"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => !saving && setFormOpen(false)}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-5">
                {/* Title */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Title <span className="text-destructive">*</span>
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Semester feedback survey"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder="Optional — explain the purpose of this survey…"
                    className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                {/* Classes */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Classes <span className="text-destructive">*</span>{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      ({selectedClasses.length} selected)
                    </span>
                  </label>

                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    {categories.map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => setCategory(c.key)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                          category === c.key
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground hover:bg-secondary/70"
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                    <div className="relative ml-auto w-full max-w-[200px]">
                      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={classSearch}
                        onChange={(e) => setClassSearch(e.target.value)}
                        placeholder="Search class…"
                        className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                  </div>

                  {filteredClasses.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No classes found in this category.
                    </p>
                  ) : (
                    <div className="grid max-h-40 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
                      {filteredClasses.map((c: any) => {
                        const selected = selectedClasses.includes(c.className);
                        return (
                          <button
                            key={c._id}
                            type="button"
                            onClick={() => toggleClass(c.className)}
                            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-left text-xs transition-colors ${
                              selected
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-background text-muted-foreground hover:border-primary/40"
                            }`}
                          >
                            <CheckCircle2
                              className={`h-3.5 w-3.5 shrink-0 ${
                                selected ? "opacity-100" : "opacity-25"
                              }`}
                            />
                            <span className="truncate">{c.className}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Questions */}
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <MessageCircleQuestion className="h-4 w-4 text-primary" />
                    Questions <span className="text-destructive">*</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      ({questions.length})
                    </span>
                  </label>

                  <div className="grid gap-3">
                    {questions.map((q, qi) => (
                      <div
                        key={qi}
                        className="rounded-xl border border-border bg-background p-3"
                      >
                        <div className="flex items-start gap-2">
                          <span className="mt-2.5 shrink-0 text-xs font-semibold text-muted-foreground">
                            Q{qi + 1}
                          </span>
                          <div className="min-w-0 flex-1 space-y-2">
                            <input
                              value={q.question}
                              onChange={(e) =>
                                updateQuestion(qi, { question: e.target.value })
                              }
                              placeholder={`Question ${qi + 1} text…`}
                              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                            />
                            <div className="flex flex-wrap items-center gap-2">
                              <select
                                value={q.type}
                                onChange={(e) =>
                                  updateQuestion(qi, {
                                    type: e.target.value as SurveyQuestion["type"],
                                  })
                                }
                                className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                              >
                                {Object.entries(typeLabels).map(([k, v]) => (
                                  <option key={k} value={k}>
                                    {v}
                                  </option>
                                ))}
                              </select>
                              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <input
                                  type="checkbox"
                                  checked={q.required}
                                  onChange={(e) =>
                                    updateQuestion(qi, {
                                      required: e.target.checked,
                                    })
                                  }
                                  className="h-3.5 w-3.5 accent-primary"
                                />
                                Required
                              </label>
                            </div>

                            {q.type !== "text" && (
                              <div className="space-y-1.5 rounded-lg bg-secondary/50 p-2.5">
                                {q.options?.map((opt, oi) => (
                                  <div key={oi} className="flex items-center gap-2">
                                    <CircleDot className="h-3 w-3 shrink-0 text-muted-foreground" />
                                    <input
                                      value={opt}
                                      onChange={(e) =>
                                        updateOption(qi, oi, e.target.value)
                                      }
                                      placeholder={`Option ${oi + 1}`}
                                      className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateQuestion(qi, {
                                          options: q.options.filter(
                                            (_, x) => x !== oi,
                                          ),
                                        })
                                      }
                                      disabled={q.options.length <= 2}
                                      className="rounded p-1 text-muted-foreground hover:text-destructive disabled:opacity-30"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateQuestion(qi, {
                                      options: [...q.options, ""],
                                    })
                                  }
                                  className="text-xs font-medium text-primary hover:underline"
                                >
                                  + Add option
                                </button>
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setQuestions((prev) =>
                                prev.filter((_, x) => x !== qi),
                              )
                            }
                            disabled={questions.length === 1}
                            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                            title="Remove question"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setQuestions((prev) => [...prev, emptyQuestion()])
                    }
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-primary/40 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Question
                  </button>
                </div>

                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => !saving && setFormOpen(false)}
                    className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                  >
                    {saving ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {saving
                      ? "Saving…"
                      : editing
                        ? "Update Survey"
                        : "Create & Publish"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results modal */}
      <AnimatePresence>
        {detail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4"
            onClick={() => setDetail(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6 shadow-modal"
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
                    <ClipboardList className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-semibold text-foreground">
                      {detail.title ?? "Survey Results"}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Responses & breakdown
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDetail(null)}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {detailLoading && !detail?.survey ? (
                <TableSkeleton rows={6} cols={2} />
              ) : (
                <>
                  <div className="mb-5 grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-border bg-background p-3 text-center">
                      <p className="font-display text-lg font-bold text-foreground">
                        {detail.targetStudents ?? 0}
                      </p>
                      <p className="text-[11px] text-muted-foreground">Target students</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-3 text-center">
                      <p className="font-display text-lg font-bold text-primary">
                        {detail.responseCount ?? 0}
                      </p>
                      <p className="text-[11px] text-muted-foreground">Responded</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-3 text-center">
                      <p className="font-display text-lg font-bold text-emerald-600">
                        {detail.targetStudents
                          ? Math.round(
                              ((detail.responseCount ?? 0) / detail.targetStudents) * 100,
                            )
                          : 0}
                        %
                      </p>
                      <p className="text-[11px] text-muted-foreground">Response rate</p>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    {Array.isArray(detail.stats) &&
                      detail.stats.map((st: any, idx: number) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-border bg-background p-4"
                        >
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <p className="text-sm font-medium text-foreground">
                              {idx + 1}. {st.question}
                            </p>
                            <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                              {typeLabels[st.type] ?? st.type}
                            </span>
                          </div>

                          {st.type === "text" ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {st.textAnswers?.length > 0 ? (
                                st.textAnswers.map((t: string, ti: number) => (
                                  <span
                                    key={ti}
                                    className="rounded-lg bg-secondary px-2.5 py-1 text-xs text-muted-foreground"
                                  >
                                    {t}
                                  </span>
                                ))
                              ) : (
                                <p className="text-xs text-muted-foreground/70">
                                  No text answers yet.
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="mt-2 space-y-2">
                              {st.options?.map((opt: string) => {
                                const count = st.tally?.[opt] ?? 0;
                                const pct = st.answered
                                  ? Math.round((count / st.answered) * 100)
                                  : 0;
                                return (
                                  <div key={opt} className="flex items-center gap-2">
                                    <span className="w-1/3 shrink-0 truncate text-xs text-muted-foreground">
                                      {opt}
                                    </span>
                                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                                      <div
                                        className="h-full rounded-full bg-primary/70 transition-all"
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                    <span className="w-16 shrink-0 text-right text-xs font-medium text-foreground">
                                      {count} ({pct}%)
                                    </span>
                                  </div>
                                );
                              })}
                              {(st.answered ?? 0) === 0 && (
                                <p className="text-xs text-muted-foreground/70">
                                  No responses yet.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>

                  {Array.isArray(detail.responses) && detail.responses.length > 0 && (
                    <div className="mt-5">
                      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <Users className="h-4 w-4 text-primary" /> Responders
                      </h3>
                      <div className="grid max-h-48 gap-2 overflow-y-auto">
                        {detail.responses.map((r: any) => (
                          <div
                            key={r._id}
                            className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">
                                {r.student?.name ?? "Unknown"}{" "}
                                {r.student?.lastName ?? ""}
                              </p>
                              <p className="text-muted-foreground">
                                {r.student?.specialId ?? ""} ·{" "}
                                {formatDate(r.submittedAt)}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                              Submitted
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDeleteModal
        open={!!deleteTarget}
        title="Delete Survey"
        name={deleteTarget?.title ?? ""}
        detail="The survey and all its responses will be permanently removed."
        deleting={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default Survey;