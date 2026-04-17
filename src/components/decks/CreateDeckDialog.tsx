import { useRef, useState } from "react";
import { Upload, FileText, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCustomDeck, parseWordListText } from "@/lib/decks";
import { toast } from "sonner";

interface CreateDeckDialogProps {
  onCreated?: (deckId: string) => void;
}

export function CreateDeckDialog({ onCreated }: CreateDeckDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("📝");
  const [rawText, setRawText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setTitle("");
    setDescription("");
    setEmoji("📝");
    setRawText("");
    setFileName(null);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setRawText(text);
      setFileName(file.name);
      if (!title) {
        const base = file.name.replace(/\.(txt|csv|md)$/i, "").slice(0, 60);
        setTitle(base || "My Deck");
      }
    } catch {
      toast.error("Could not read that file");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const wordsPreview = parseWordListText(rawText);

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Please give the deck a name");
      return;
    }
    if (wordsPreview.length === 0) {
      toast.error("Add at least one word (one per line)");
      return;
    }
    setSaving(true);
    try {
      const meta = await createCustomDeck({
        title: title.trim(),
        description: description.trim(),
        emoji: emoji.trim() || "📝",
        category: "Custom",
        words: wordsPreview,
      });
      toast.success(`Created "${meta.title}" with ${wordsPreview.length} words`);
      onCreated?.(meta.id);
      reset();
      setOpen(false);
    } catch {
      toast.error("Failed to create deck");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger
        render={
          <button
            type="button"
            className="group flex w-full items-start gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3 text-left transition-all hover:border-primary/60 hover:bg-primary/10 active:scale-[0.99]"
            aria-label="Create custom deck"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Plus className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                Create your own deck
              </p>
              <p className="line-clamp-1 text-xs text-muted-foreground">
                Paste a list or upload a .txt file, one word per line.
              </p>
              <div className="mt-1.5 flex items-center gap-2 text-[10px]">
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
                  Custom
                </span>
                <span className="text-muted-foreground">
                  No sign-up needed
                </span>
              </div>
            </div>
          </button>
        }
      />

      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create custom deck</DialogTitle>
          <DialogDescription>
            Upload a <code className="rounded bg-muted px-1">.txt</code> file
            with one word per line, or paste your list below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Deck name
            </label>
            <div className="flex gap-2">
              <Input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value.slice(0, 2))}
                placeholder="📝"
                className="w-14 text-center text-base"
                maxLength={2}
              />
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My GRE words"
                className="flex-1"
                maxLength={60}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Description (optional)
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Words I keep forgetting"
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">
                Word list ({wordsPreview.length} words)
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-7 gap-1.5 text-xs"
              >
                <Upload className="h-3 w-3" />
                Upload .txt
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.csv,.md,text/plain"
                onChange={handleFile}
                className="hidden"
              />
            </div>
            <textarea
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                setFileName(null);
              }}
              placeholder={`abate\naberration\nabstruse\n...`}
              className="h-40 w-full rounded-lg border bg-background p-3 font-mono text-xs leading-relaxed shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              spellCheck={false}
            />
            {fileName && (
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <FileText className="h-3 w-3" />
                Loaded from {fileName}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-[11px] text-muted-foreground">
            <p className="mb-1 font-semibold text-foreground">How it works</p>
            <ul className="list-disc space-y-0.5 pl-4">
              <li>One word (or short phrase) per line</li>
              <li>Lines starting with <code>#</code> are ignored</li>
              <li>CSV works too — the first column is used</li>
              <li>
                Tap any word to preview the definition; nothing is added to
                your bank until you bookmark it
              </li>
            </ul>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-lg"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={saving || wordsPreview.length === 0 || !title.trim()}
              className="flex-1 rounded-lg"
            >
              {saving ? "Creating..." : `Create (${wordsPreview.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
