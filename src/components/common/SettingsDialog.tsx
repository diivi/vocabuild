import { useState, useRef } from "react";
import {
  Settings, Key, Trash2, Check, Sun, Moon, Monitor,
  Download, Upload, RefreshCw, CloudUpload,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { setGeminiKey, removeGeminiKey, hasGeminiKey } from "@/lib/api/gemini";
import {
  exportData, importData,
  hasGistToken, setGistToken, removeGistToken, syncWithGist,
} from "@/lib/sync";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [hasGemini, setHasGemini] = useState(hasGeminiKey);
  const [gistToken, setGistTokenInput] = useState("");
  const [hasGist, setHasGist] = useState(hasGistToken);
  const [syncing, setSyncing] = useState(false);
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveGemini = () => {
    if (geminiApiKey.trim()) {
      setGeminiKey(geminiApiKey.trim());
      setHasGemini(true);
      setGeminiApiKey("");
      toast.success("Gemini API key saved");
    }
  };

  const handleRemoveGemini = () => {
    removeGeminiKey();
    setHasGemini(false);
    toast.success("Gemini API key removed");
  };

  const handleSaveGist = () => {
    if (gistToken.trim()) {
      setGistToken(gistToken.trim());
      setHasGist(true);
      setGistTokenInput("");
      toast.success("GitHub token saved");
    }
  };

  const handleRemoveGist = () => {
    removeGistToken();
    setHasGist(false);
    toast.success("GitHub token removed");
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncWithGist();
      if (result.pulled > 0) {
        toast.success(`Synced! ${result.pulled} new word${result.pulled > 1 ? "s" : ""} pulled`);
      } else {
        toast.success("Synced! Everything is up to date");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleExport = async () => {
    try {
      const json = await exportData();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vocabuild-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported");
    } catch {
      toast.error("Export failed");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const json = await file.text();
      const added = await importData(json);
      toast.success(added > 0 ? `Imported ${added} new word${added > 1 ? "s" : ""}` : "All words already exist");
    } catch {
      toast.error("Invalid backup file");
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
        <Settings className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Sync, AI features, and preferences</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* --- Sync --- */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <CloudUpload className="h-4 w-4 text-muted-foreground" />
              Cloud Sync (GitHub Gist)
            </label>

            {hasGist ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex flex-1 items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm">
                    <Check className="h-4 w-4 text-success" />
                    <span className="text-muted-foreground">Token configured</span>
                  </div>
                  <Button variant="outline" size="icon" onClick={handleRemoveGist} className="shrink-0">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <Button
                  onClick={handleSync}
                  disabled={syncing}
                  className="w-full gap-2 rounded-lg"
                  size="sm"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
                  {syncing ? "Syncing..." : "Sync now"}
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={gistToken}
                  onChange={(e) => setGistTokenInput(e.target.value)}
                  placeholder="GitHub personal access token"
                  className="text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleSaveGist()}
                />
                <Button onClick={handleSaveGist} disabled={!gistToken.trim()} size="sm">
                  Save
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Syncs your words across devices via a private GitHub Gist.
              Create a token at github.com/settings/tokens with "gist" scope.
            </p>
          </div>

          {/* --- Export / Import --- */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Backup</label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExport} className="flex-1 gap-1.5 rounded-lg">
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 gap-1.5 rounded-lg"
              >
                <Upload className="h-3.5 w-3.5" />
                Import
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Export/import your word bank as a JSON file.
            </p>
          </div>

          {/* --- Gemini --- */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Key className="h-4 w-4 text-muted-foreground" />
              Gemini API Key
            </label>

            {hasGemini ? (
              <div className="flex items-center gap-2">
                <div className="flex flex-1 items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-muted-foreground">Key configured</span>
                </div>
                <Button variant="outline" size="icon" onClick={handleRemoveGemini} className="shrink-0">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="Enter your Gemini API key"
                  className="text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleSaveGemini()}
                />
                <Button onClick={handleSaveGemini} disabled={!geminiApiKey.trim()} size="sm">
                  Save
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Enables mnemonics, smart suggestions, and word connections.
            </p>
          </div>

          {/* --- Theme --- */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Theme</label>
            <div className="flex gap-1 rounded-lg border p-1">
              {([
                { value: "light" as const, icon: Sun, label: "Light" },
                { value: "dark" as const, icon: Moon, label: "Dark" },
                { value: "system" as const, icon: Monitor, label: "System" },
              ] as const).map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors",
                    theme === value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
