import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Send, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import NotificationService from "@/services/notificationService";
import { toast } from "sonner";

const SendAlert = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<number | null>(null);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are both required");
      return;
    }
    setSending(true);
    setSent(null);
    try {
      const result = await NotificationService.sendAlert(
        title.trim(),
        message.trim(),
      );
      if (result?.statusCode !== undefined && result?.statusCode >= 400) {
        toast.error(result?.message || "Could not send alert");
      } else if (result?.success === false) {
        toast.error(result?.message || "Could not send alert");
      } else {
        setSent(result?.recipients ?? 0);
        toast.success(`Alert sent to ${result?.recipients ?? 0} users`);
        setTitle("");
        setMessage("");
      }
    } catch {
      toast.error("Could not reach the server");
    } finally {
      setSending(false);
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
        Send Alert
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-8 text-sm text-muted-foreground"
      >
        Broadcast a message to every user on the mobile app
      </motion.p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardContent className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Title
                </label>
                <Input
                  className="mt-1"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Fee Alert"
                  maxLength={80}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Message
                </label>
                <Textarea
                  className="mt-1"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g. Fee submit last date is 12"
                  rows={5}
                  maxLength={500}
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  {message.length}/500
                </span>
                <Button onClick={handleSend} disabled={sending}>
                  <Send className="h-4 w-4 mr-1" />
                  {sending ? "Sending..." : "Send Alert"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <Card>
            <CardContent className="p-5">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4 block">
                Preview
              </span>

              <div className="flex items-start gap-3 rounded-xl border border-border bg-secondary/40 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50">
                  <BellRing className="h-4 w-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {title.trim() || "Alert title"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 break-words">
                    {message.trim() || "Your message will appear here like this on users' phones."}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    now
                  </p>
                </div>
              </div>

              {sent !== null && (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
                  Last alert delivered to {sent} users (in-app + push, if push is enabled).
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default SendAlert;