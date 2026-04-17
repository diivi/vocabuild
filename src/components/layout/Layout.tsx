import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { OfflineBanner } from "./OfflineBanner";

export function Layout() {
  return (
    <div className="relative min-h-screen bg-background">
      <OfflineBanner />
      <main className="mx-auto max-w-lg px-4 pb-24 pt-4">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
