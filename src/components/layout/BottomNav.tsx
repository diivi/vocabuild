import { NavLink } from "react-router-dom";
import { Home, BookOpen, GraduationCap, Settings } from "lucide-react";
import { SettingsDialog } from "@/components/common/SettingsDialog";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/wordbank", icon: BookOpen, label: "Word Bank" },
  { to: "/review", icon: GraduationCap, label: "Review" },
] as const;

const tabClass =
  "flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors";
const inactiveClass = "text-muted-foreground hover:text-foreground";
const activeClass = "text-primary";

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div
        className="mx-auto flex max-w-lg items-center justify-around"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(tabClass, isActive ? activeClass : inactiveClass)
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={cn("h-5 w-5", isActive && "fill-primary/20")}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className={cn("font-medium", isActive && "font-semibold")}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}

        <SettingsDialog
          trigger={
            <button
              type="button"
              className={cn(tabClass, inactiveClass)}
              aria-label="Settings"
            >
              <Settings className="h-5 w-5" strokeWidth={2} />
              <span className="font-medium">Settings</span>
            </button>
          }
        />
      </div>
    </nav>
  );
}
