import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { OfflineBanner } from "./OfflineBanner";
import { FeedbackFAB } from "@/components/common/FeedbackFAB";

export function Layout() {
  return (
    <div className="relative min-h-screen bg-background">
      <OfflineBanner />
      <main className="mx-auto max-w-lg px-4 pb-24 pt-4">
        <Outlet />
      </main>
      <BottomNav />
      {/* Sits above the bottom nav (bottom-20 ≈ 80px clears the ~56px nav) */}
      <FeedbackFAB className="bottom-20" delay={6000} />
    </div>
  );
}
