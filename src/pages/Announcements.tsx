import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  BellRing,
  Inbox,
  Send,
  Trash2,
  Search,
  CheckCircle2,
  Plus,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import ConfirmDeleteModal from "@/components/ConfirmDelete";
import TableSkeleton from "@/components/TableSkeleton";
import AnnouncementService, { AnnouncementItem } from "@/services/announcementService";
import { useClasses } from "@/hooks/useClasses";
import { toast } from "sonner";

const categories: Array<{ key: string; label: string }> = [
  { key: "intermediate", label: "Intermediate" },
  { key: "bs", label: "BS" },
  { key: "adp", label: "ADP" },
];

const formatDate = (value: string) => {
  const date = new Date(value);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

const Announcements = () => {
  const navigate = useNavigate();

  const [formOpen, setFormOpen] = useState(false);

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

  const [category, setCategory] = useState("intermediate");
  const [classSearch, setClassSearch] = useState("");

  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);

  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<AnnouncementItem | null>(null);
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

  const selectAllClasses = () => {
    const allNames = classList.map((c: any) => c.className).filter(Boolean);
    setSelectedClasses((prev) =>
      prev.length === allNames.length && allNames.every((n) => prev.includes(n))
        ? []
        : allNames,
    );
  };

  const load = async () => {
    setLoading(true);
    try {
      const result = await AnnouncementService.getAnnouncements();
      const list =
        result?.announcements && Array.isArray(result.announcements)
          ? result.announcements
          : [];
      setAnnouncements(list);
    } catch {
      toast.error("Could not load announcements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setSelectedClasses([]);
    setClassSearch("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedClasses.length === 0) return toast.error("Select at least one class");
    if (!title.trim()) return toast.error("Title is required");
    if (!description.trim()) return toast.error("Details are required");

    setSending(true);
    try {
      const result = await AnnouncementService.createAnnouncement({
        className: selectedClasses,
        title: title.trim(),
        description: description.trim(),
      });
      if (result?.announcement || result?.message?.includes("created")) {
        toast.success("Announcement published");
        resetForm();
        setFormOpen(false);
        load();
      } else {
        toast.error(result?.message || "Failed to create announcement");
      }
    } catch {
      toast.error("Could not reach the server");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await AnnouncementService.deleteAnnouncement(deleteTarget._id);
      if (result?.message) {
        toast.success("Announcement deleted");
        setAnnouncements((prev) =>
          prev.filter((a) => a._id !== deleteTarget._id),
        );
      } else {
        toast.error(result?.message || "Could not delete announcement");
      }
    } catch {
      toast.error("Could not reach the server");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

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
        Announcements
      </motion.h1>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-sm text-muted-foreground"
        >
          Publish announcements to students and teachers — everyone gets notified
        </motion.p>
        <button
          onClick={() => setFormOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Add Announcement
        </button>
      </div>

      {/* Create form modal */}
      <AnimatePresence>
        {formOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4"
            onClick={() => !sending && setFormOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-card p-6 shadow-modal"
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <BellRing className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-semibold text-foreground">
                      New Announcement
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Pick a teacher, target classes, then write the announcement
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => !sending && setFormOpen(false)}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="grid gap-5">
              {/* Classes */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Classes{" "}
                  <span className="text-destructive">*</span>{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({selectedClasses.length} selected)
                  </span>
                </label>

                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllClasses}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      classList.length > 0 &&
                      selectedClasses.length === classList.length
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/70"
                    }`}
                    title="Select all classes"
                  >
                    All
                  </button>
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
                  <div className="grid max-h-44 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
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

              {/* Title */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Title <span className="text-destructive">*</span>
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Midterm exam schedule"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Details <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Write the announcement details here…"
                  className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => !sending && setFormOpen(false)}
                  className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {sending ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {sending ? "Publishing…" : "Publish Announcement"}
                </button>
              </div>
            </form>
            </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      {/* List */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Inbox className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-display text-base font-semibold text-foreground">
                All Announcements
              </h2>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                {announcements.length}
              </span>
            </div>

            {loading ? (
              <TableSkeleton rows={5} cols={5} />
            ) : announcements.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Inbox className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No announcements yet. Publish your first one above.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.map((a, i) => (
                  <motion.div
                    key={a._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="rounded-xl border border-border p-4 transition-colors hover:bg-secondary/40"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-display text-sm font-semibold text-foreground">
                          {a.title}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                          {a.description}
                        </p>
                      </div>
                      <button
                        onClick={() => setDeleteTarget(a)}
                        className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        by {a.createdBy?.name ?? "Unknown"}{" "}
                        {a.createdBy?.role ? `(${a.createdBy.role})` : ""}
                      </span>
                      <span>
                        {formatDate(a.createdAt)} · {formatTime(a.createdAt)}
                      </span>
                      <span className="text-muted-foreground">
                        {Array.isArray(a.classNames) ? a.classNames.length : 0}{" "}
                        class{a.classNames?.length === 1 ? "" : "es"}
                      </span>
                      <span>
                        {a.readBy?.length ?? 0} read
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {a.classNames?.slice(0, 4).map((cn) => (
                        <span
                          key={cn}
                          className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground"
                        >
                          {cn}
                        </span>
                      ))}
                      {(a.classNames?.length ?? 0) > 4 && (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                          +{(a.classNames.length - 4)} more
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <ConfirmDeleteModal
        open={!!deleteTarget}
        title="Delete Announcement"
        name={deleteTarget?.title ?? ""}
        detail="This announcement and its notifications will be permanently removed."
        deleting={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default Announcements;