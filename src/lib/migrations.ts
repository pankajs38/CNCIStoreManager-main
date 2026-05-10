import type { Task, TaskRemark } from "@/types";

// Migrate old string[] remarks to new TaskRemark[] format
function migrateRemarks(remarks: any[]): TaskRemark[] {
  if (!remarks || remarks.length === 0) return [];
  if (typeof remarks[0] === "string") {
    return remarks.map((r: string) => ({ text: r, user: "System", date: new Date().toISOString() }));
  }
  return remarks as TaskRemark[];
}

export function migrateTask(task: any): Task {
  return {
    ...task,
    remarks: migrateRemarks(task.remarks || []),
  };
}
