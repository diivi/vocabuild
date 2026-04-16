import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { OfflineBanner } from "./OfflineBanner";
import { SettingsDialog } from "@/components/common/SettingsDialog";

export function Layout() {
  return (
    <div className="relative min-h-screen bg-background">
      <OfflineBanner />
      <div className="fixed right-3 top-3 z-40">
        <SettingsDialog />
      </div>
      <main className="mx-auto max-w-lg px-4 pb-20 pt-4">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
