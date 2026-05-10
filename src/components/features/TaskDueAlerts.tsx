import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Clock, Bell } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useTaskStore } from "@/stores/taskStore";

interface TaskAlert {
  id: string;
  taskNo: string;
  title: string;
  dueDate: string;
  daysLeft: number;
  level: "urgent" | "warning" | "info";
}

export function TaskDueAlerts() {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const { tasks } = useTaskStore();

  const alerts = useMemo(() => {
    if (!currentUser) return [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const userTasks = tasks.filter(
      (t) => t.assignedTo === currentUser.id && t.status !== "completed" && t.dueDate
    );

    const result: TaskAlert[] = [];
    userTasks.forEach((t) => {
      const due = new Date(t.dueDate!);
      due.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysLeft <= 3) {
        let level: TaskAlert["level"] = "info";
        if (daysLeft <= 0) level = "urgent";
        else if (daysLeft <= 1) level = "urgent";
        else if (daysLeft <= 2) level = "warning";
        else level = "info";

        result.push({
          id: t.id,
          taskNo: t.taskNo,
          title: t.title,
          dueDate: t.dueDate!,
          daysLeft,
          level,
        });
      }
    });

    return result.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [tasks, currentUser]);

  if (alerts.length === 0) return null;

  const levelConfig = {
    urgent: { bg: "bg-red-50", border: "border-red-300", text: "text-red-700", icon: AlertTriangle, label: "Overdue" },
    warning: { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-700", icon: Clock, label: "Due Tomorrow" },
    info: { bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-700", icon: Bell, label: "Due Soon" },
  };

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <AlertTriangle className="size-3.5 text-amber-500" /> Task Due Alerts ({alerts.length})
      </h4>
      <div className="space-y-1.5">
        {alerts.slice(0, 8).map((alert) => {
          const cfg = levelConfig[alert.level];
          const Icon = cfg.icon;
          const dueLabel =
            alert.daysLeft < 0
              ? `${Math.abs(alert.daysLeft)} day(s) overdue`
              : alert.daysLeft === 0
              ? "Due today"
              : alert.daysLeft === 1
              ? "Due tomorrow"
              : `${alert.daysLeft} days left`;

          return (
            <div
              key={alert.id}
              className={`flex items-center gap-2.5 p-2.5 rounded-lg ${cfg.bg} border ${cfg.border} cursor-pointer hover:shadow-sm transition-shadow`}
              onClick={() => navigate("/tasks")}
            >
              <Icon className={`size-4 ${cfg.text} shrink-0`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-semibold text-gold bg-gold/10 px-1 py-0.5 rounded">{alert.taskNo}</span>
                  <span className="text-xs font-medium text-foreground truncate">{alert.title}</span>
                </div>
                <p className={`text-[10px] font-semibold ${cfg.text} mt-0.5`}>{dueLabel}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
