import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-muted px-4 py-1.5 text-xs text-muted-foreground">
      <WifiOff className="h-3.5 w-3.5" />
      <span>You're offline — saved words and quizzes still work</span>
    </div>
  );
}
