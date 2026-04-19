import { useState, useEffect } from "react";
import { MessageSquareHeart, Send, Check, RefreshCw, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const FEEDBACK_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const FEEDBACK_LS_KEY = "vocabuild_feedback_last_sent";

function getCooldownLeft() {
  const last = localStorage.getItem(FEEDBACK_LS_KEY);
  if (!last) return null;
  const remaining = FEEDBACK_COOLDOWN_MS - (Date.now() - Number(last));
  return remaining > 0 ? remaining : null;
}

// ---------------------------------------------------------------------------
// Inline feedback form — shared between the dialog and the landing section
// ---------------------------------------------------------------------------

export function FeedbackFormBody({ onSent }: { onSent?: () => void }) {
  const [text, setText] = useState("");
  const [contact, setContact] = useState("");
  const [honey, setHoney] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [cooldownLeft, setCooldownLeft] = useState<number | null>(getCooldownLeft);

  const hoursLeft = cooldownLeft ? Math.ceil(cooldownLeft / (60 * 60 * 1000)) : 0;
  const canSubmit = !cooldownLeft && text.trim().length >= 10 && status !== "sending";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    if (honey) { setStatus("sent"); onSent?.(); return; }

    setStatus("sending");
    try {
      await fetch("https://ntfy.sh/vocabuild", {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          "Title": "VocaBuild Feedback",
          "Tags": "speech_balloon",
          "Priority": "default",
        },
        body: contact.trim()
          ? `${text.trim()}\n\n— ${contact.trim()}`
          : text.trim(),
      });
      localStorage.setItem(FEEDBACK_LS_KEY, String(Date.now()));
      setCooldownLeft(FEEDBACK_COOLDOWN_MS);
      setStatus("sent");
      setText("");
      setContact("");
      onSent?.();
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-success/15">
          <Check className="h-5 w-5 text-success" />
        </div>
        <p className="font-semibold text-foreground text-sm">Feedback received — thank you!</p>
        <p className="text-xs text-muted-foreground">
          I'll read it soon. If you're enjoying the app, share it with a friend. 🙌
        </p>
        {cooldownLeft ? (
          <p className="text-xs text-muted-foreground/60">
            Next message in ~{hoursLeft}h.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Honeypot */}
      <input
        aria-hidden="true"
        tabIndex={-1}
        autoComplete="off"
        style={{ display: "none" }}
        value={honey}
        onChange={(e) => setHoney(e.target.value)}
      />

      <textarea
        rows={4}
        placeholder="What's working? What's missing? What felt off?…"
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 500))}
        disabled={!!cooldownLeft || status === "sending"}
        className="w-full resize-none rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
      />

      <div className="flex items-center justify-between text-xs text-muted-foreground/60">
        <span>
          {text.trim().length < 10 && text.length > 0
            ? `${10 - text.trim().length} more chars needed`
            : ""}
        </span>
        <span className={cn(text.trim().length >= 10 ? "text-success" : "")}>
          {text.trim().length}/500
        </span>
      </div>

      <div>
        <input
          type="text"
          placeholder="Email, Twitter, anything — totally optional"
          value={contact}
          onChange={(e) => setContact(e.target.value.slice(0, 120))}
          disabled={!!cooldownLeft || status === "sending"}
          className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
        />
        <p className="mt-1 text-xs text-muted-foreground/60">
          If you leave a way to reach you, I can follow up and make your experience better — but no pressure at all.
        </p>
      </div>

      {cooldownLeft ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
          Already sent recently — try again in ~{hoursLeft}h.
        </p>
      ) : null}

      {status === "error" && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Something went wrong. Check your connection and try again.
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {status === "sending" ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        {status === "sending" ? "Sending…" : "Send Feedback"}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// FAB — floating pill that opens the feedback dialog
// ---------------------------------------------------------------------------

interface FeedbackFABProps {
  /** Extra Tailwind classes for positioning. Defaults to bottom-6. */
  className?: string;
  /** How many ms to wait before the pill slides in. Defaults to 4000. */
  delay?: number;
}

export function FeedbackFAB({ className, delay = 4000 }: FeedbackFABProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  if (dismissed || !visible) return null;

  return (
    <>
      <div
        className={cn(
          "fixed right-4 z-50 flex items-center gap-2 rounded-full border border-primary/30",
          "bg-background/90 px-4 py-2.5 text-sm font-medium text-foreground shadow-lg backdrop-blur",
          "animate-[fade-up_0.4s_ease-out_both]",
          className ?? "bottom-6",
        )}
      >
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 hover:text-primary transition-colors"
        >
          <MessageSquareHeart className="h-4 w-4 shrink-0 text-primary" />
          Share feedback
        </button>
        <button
          aria-label="Dismiss"
          onClick={() => setDismissed(true)}
          className="ml-1 rounded-full p-0.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <MessageSquareHeart className="h-5 w-5 text-primary" />
              <DialogTitle>Share your feedback</DialogTitle>
            </div>
            <DialogDescription>
              I read every message personally — your input directly shapes what gets built next.
              And if VocaBuild is helping you,{" "}
              <span className="font-medium text-foreground">tell a friend</span>. 🙌
            </DialogDescription>
          </DialogHeader>
          <FeedbackFormBody onSent={() => setTimeout(() => setOpen(false), 2500)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
