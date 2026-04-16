import { useState, useEffect } from "react";
import { getDailyActivity } from "@/lib/db-operations";
import { cn } from "@/lib/utils";

const WEEKS = 15;
const DAYS = WEEKS * 7;
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

function toLocalKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatLocalDate(key: string): string {
  // Parse "YYYY-MM-DD" as local (not UTC)
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getIntensity(wordsAdded: number, questionsAnswered: number): number {
  const total = wordsAdded + questionsAnswered;
  if (total === 0) return 0;
  if (total <= 2) return 1;
  if (total <= 5) return 2;
  if (total <= 10) return 3;
  return 4;
}

const intensityClasses = [
  "bg-muted",
  "bg-primary/20",
  "bg-primary/40",
  "bg-primary/65",
  "bg-primary",
] as const;

interface DayData {
  key: string;
  intensity: number;
  wordsAdded: number;
  questionsAnswered: number;
}

export function ContributionChart() {
  const [activity, setActivity] = useState<
    Map<string, { wordsAdded: number; questionsAnswered: number }>
  >(new Map());
  const [selected, setSelected] = useState<DayData | null>(null);

  useEffect(() => {
    getDailyActivity(DAYS).then(setActivity);
  }, []);

  const today = new Date();
  const todayKey = toLocalKey(today);
  const todayDow = today.getDay(); // 0=Sun

  // Start date: go back enough to fill WEEKS+1 columns, aligned to Sunday
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (DAYS - 1) - todayDow);

  const weeks: DayData[][] = [];
  const current = new Date(startDate);

  for (let w = 0; w < WEEKS + 1; w++) {
    const week: DayData[] = [];
    for (let d = 0; d < 7; d++) {
      const key = toLocalKey(current);
      const isFuture = key > todayKey;
      const entry = activity.get(key);
      const wordsAdded = entry?.wordsAdded ?? 0;
      const questionsAnswered = entry?.questionsAnswered ?? 0;

      week.push({
        key,
        intensity: isFuture ? -1 : getIntensity(wordsAdded, questionsAnswered),
        wordsAdded,
        questionsAnswered,
      });

      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
  }

  // Month labels along the top
  const monthLabels: { label: string; col: number }[] = [];
  let lastMonth = -1;
  for (let w = 0; w < weeks.length; w++) {
    const firstDay = weeks[w][0];
    const [, m] = firstDay.key.split("-").map(Number);
    if (m !== lastMonth) {
      const date = new Date(Number(firstDay.key.slice(0, 4)), m - 1, 1);
      monthLabels.push({
        label: date.toLocaleDateString("en-US", { month: "short" }),
        col: w,
      });
      lastMonth = m;
    }
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">Activity</p>

      {/* Month labels */}
      <div className="flex gap-[3px]" style={{ paddingLeft: 24 }}>
        {monthLabels.map((m, i) => {
          const nextCol = monthLabels[i + 1]?.col ?? weeks.length;
          const span = nextCol - m.col;
          return (
            <div
              key={m.label + m.col}
              className="text-[9px] text-muted-foreground"
              style={{ width: span * 15 - 3 }}
            >
              {m.label}
            </div>
          );
        })}
      </div>

      <div className="flex gap-[3px]">
        {/* Day labels */}
        <div className="flex flex-col gap-[3px] pr-1">
          {DAY_LABELS.map((label, i) => (
            <div
              key={i}
              className="h-[12px] text-[9px] leading-[12px] text-muted-foreground"
            >
              {label}
            </div>
          ))}
        </div>
        {/* Grid */}
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day) => (
              <button
                key={day.key}
                onClick={() =>
                  day.intensity >= 0 &&
                  setSelected(selected?.key === day.key ? null : day)
                }
                className={cn(
                  "h-[12px] w-[12px] rounded-[2px] transition-all",
                  day.intensity < 0 && "bg-transparent",
                  day.intensity >= 0 && intensityClasses[day.intensity],
                  selected?.key === day.key && "ring-1 ring-foreground ring-offset-1 ring-offset-background"
                )}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Selected day detail */}
      {selected && (
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-xs">
          <span className="font-medium text-foreground">
            {formatLocalDate(selected.key)}
          </span>
          <span className="text-muted-foreground">—</span>
          {selected.wordsAdded > 0 || selected.questionsAnswered > 0 ? (
            <span className="text-muted-foreground">
              {selected.wordsAdded > 0 &&
                `${selected.wordsAdded} word${selected.wordsAdded > 1 ? "s" : ""}`}
              {selected.wordsAdded > 0 && selected.questionsAnswered > 0 && ", "}
              {selected.questionsAnswered > 0 &&
                `${selected.questionsAnswered} answer${selected.questionsAnswered > 1 ? "s" : ""}`}
            </span>
          ) : (
            <span className="text-muted-foreground">No activity</span>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 text-[9px] text-muted-foreground">
        <span>Less</span>
        {intensityClasses.map((cls, i) => (
          <div
            key={i}
            className={cn("h-[10px] w-[10px] rounded-[2px]", cls)}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
