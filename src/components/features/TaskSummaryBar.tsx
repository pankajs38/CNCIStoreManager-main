import { ClipboardList, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import type { Task } from "@/types";

interface TaskSummaryBarProps {
  tasks: Task[];
  onFilterClick?: (filter: string) => void;
}

export function TaskSummaryBar({ tasks, onFilterClick }: TaskSummaryBarProps) {
  const assigned = tasks.filter((t) => t.status === "assigned").length;
  const inProcess = tasks.filter((t) => t.status === "gfr_done" || t.status === "noting_done").length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const overdue = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "completed").length;

  const items = [
    { label: "Total Assigned", value: tasks.length, icon: ClipboardList, bg: "bg-blue-50 border-blue-200", iconColor: "text-blue-600", filter: "all" },
    { label: "Pending", value: assigned, icon: Clock, bg: "bg-amber-50 border-amber-200", iconColor: "text-amber-600", filter: "assigned" },
    { label: "Under Process", value: inProcess, icon: AlertTriangle, bg: "bg-violet-50 border-violet-200", iconColor: "text-violet-600", filter: "gfr_done" },
    { label: "Completed", value: completed, icon: CheckCircle2, bg: "bg-emerald-50 border-emerald-200", iconColor: "text-emerald-600", filter: "completed" },
  ];

  if (overdue > 0) {
    items.push({ label: "Overdue", value: overdue, icon: AlertTriangle, bg: "bg-red-50 border-red-200", iconColor: "text-red-600", filter: "overdue" });
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className={`flex items-center gap-3 p-4 rounded-lg border ${item.bg} ${onFilterClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
          onClick={() => onFilterClick?.(item.filter)}
          title={`Click to view ${item.label.toLowerCase()} tasks`}
        >
          <div className={`p-2 rounded-lg bg-white/80 ${item.iconColor}`}>
            <item.icon className="size-5" />
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums text-foreground">{item.value}</p>
            <p className="text-xs text-muted-foreground font-medium">{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
