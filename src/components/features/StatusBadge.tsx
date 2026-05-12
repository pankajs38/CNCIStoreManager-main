import { cn } from "@/lib/utils";
import { TASK_STATUS_CONFIG, TENDER_STAGE_CONFIG } from "@/constants/config";
import type { TaskStatus, TenderStage } from "@/types";

interface TaskStatusBadgeProps {
  status: TaskStatus;
}

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  const config = TASK_STATUS_CONFIG[status] || { label: status || "Unknown", color: "bg-gray-100", textColor: "text-gray-700" };
  return (
    <span className={cn("inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold", config.color, config.textColor)}>
      {config.label}
    </span>
  );
}

interface TenderStageBadgeProps {
  stage: TenderStage;
}

export function TenderStageBadge({ stage }: TenderStageBadgeProps) {
  const config = TENDER_STAGE_CONFIG[stage] || { label: stage, color: "bg-gray-100 text-gray-600" };
  return (
    <span className={cn("inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold", config.color)}>
      {config.label}
    </span>
  );
}
