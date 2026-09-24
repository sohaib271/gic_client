import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import UserService from "@/services/userService";

const ActiveUserToggle = ({ user, refetch, showLabel = true }: { user: any; refetch?: () => void; showLabel?: boolean }) => {
  const [checked, setChecked] = useState(user?.isActive !== false);
  const [saving, setSaving] = useState(false);

  const handleToggle = async (next: boolean) => {
    if (!user?._id) return;
    const previous = checked;
    // Optimistic update
    setChecked(next);
    setSaving(true);
    try {
      const res = await UserService.updateUser(user._id, { isActive: next });
      if (res?.error || res?.statusCode >= 400) {
        setChecked(previous);
        toast.error(res?.message ?? "Failed to update status");
        return;
      }
      toast.success(next ? "User activated" : "User deactivated");
      await refetch?.();
    } catch {
      setChecked(previous);
      toast.error("Network error, please try again");
    } finally {
      setSaving(false);
    }
  };

  return (
    <span className="inline-flex items-center gap-1.5" title={checked ? "Active" : "Inactive"}>
      <Switch checked={checked} disabled={saving} onCheckedChange={handleToggle} />
      {showLabel && (
        <span className={`text-xs font-medium ${checked ? "text-emerald-600" : "text-muted-foreground"}`}>
          {checked ? "Active" : "Inactive"}
        </span>
      )}
    </span>
  );
};

export default ActiveUserToggle;