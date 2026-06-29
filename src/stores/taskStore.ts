import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Task, TaskStatus, TaskRemark, TaskPriority, MonthlySheet, MonthlySheetItem, MonthlyItemStatus } from "@/types";
import { SAMPLE_TASKS } from "@/constants/mockData";
import { generateId } from "@/lib/utils";
import { useAuthStore } from "./authStore";
import { writeTasks, writeMonthlySheets, writeGeneralTasks } from "@/lib/sheetServices";
import { triggerAutoSync, forceImmediateSync } from "@/lib/autoSync";

interface GeneralTask {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  assignedBy: string;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  status: "pending" | "in_progress" | "completed";
  priority: TaskPriority;
  remarks: TaskRemark[];
}

interface TaskState {
  tasks: Task[];
  generalTasks: GeneralTask[];
  taskCounter: number;
  monthlySheets: MonthlySheet[];
  loadFromSheetData: () => void;
  syncToSheet: () => Promise<boolean>;
  addTask: (task: Omit<Task, "id" | "taskNo" | "createdAt" | "updatedAt" | "history" | "transferHistory" | "remarks">) => Task;
  updateTaskStatus: (id: string, status: TaskStatus, userId: string, userName: string, remark?: string) => void;
  updateTaskPriority: (id: string, priority: TaskPriority) => void;
  updateTaskGfrType: (id: string, gfrType: string) => void;
  transferTask: (id: string, toUserId: string, reason: string, fromUserId: string) => void;
  addRemark: (id: string, text: string, userId: string, userName: string) => void;
  deleteTask: (id: string) => void;
  linkTaskToFile: (taskId: string, fileId: string) => void;
  addGeneralTask: (task: Omit<GeneralTask, "id" | "createdAt" | "updatedAt" | "remarks">) => void;
  updateGeneralTaskStatus: (id: string, status: GeneralTask["status"], userId: string, userName: string, remark?: string) => void;
  updateGeneralTaskPriority: (id: string, priority: TaskPriority) => void;
  deleteGeneralTask: (id: string) => void;
  getTasksByUser: (userId: string) => Task[];
  getAverageDays: (userId: string) => number;
  getNextTaskNo: () => string;
  getTaskByNo: (taskNo: string) => Task | undefined;
  reopenTask: (id: string, userId: string, userName: string) => void;
  addFollowUpTask: (parentId: string, task: Omit<Task, "id" | "taskNo" | "createdAt" | "updatedAt" | "history" | "transferHistory" | "remarks" | "parentTaskId" | "childTaskIds">) => Task;
  addMonthlySheet: (sheet: Omit<MonthlySheet, "id" | "uploadedAt" | "updatedAt">) => MonthlySheet;
  updateMonthlyItemStatus: (sheetId: string, itemId: string, status: MonthlyItemStatus, note?: string) => void;
  updateMonthlyItem: (sheetId: string, itemId: string, updates: Partial<MonthlySheetItem>) => void;
  linkMonthlyItemToFile: (sheetId: string, itemId: string, fileId: string) => void;
  deleteMonthlySheet: (sheetId: string) => void;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: SAMPLE_TASKS,
      generalTasks: [
        { id: "gt1", title: "Prepare monthly stock report", description: "Compile stock data for June 2025", assignedTo: "u3", assignedBy: "u1", createdAt: "2025-07-01T10:00:00Z", updatedAt: "2025-07-01T10:00:00Z", dueDate: "2025-07-15", status: "completed", priority: "medium", remarks: [{ text: "Report submitted", user: "Shailesh Kumar Singh", date: "2025-07-14T15:00:00Z" }] },
        { id: "gt2", title: "Update inventory register", description: "Update physical stock entries in register", assignedTo: "u5", assignedBy: "u1", createdAt: "2025-07-10T10:00:00Z", updatedAt: "2025-07-10T10:00:00Z", dueDate: "2025-07-25", status: "in_progress", priority: "high", remarks: [] },
        { id: "gt3", title: "Arrange old files for audit", description: "Organize 2023-24 files for audit inspection", assignedTo: "u4", assignedBy: "u1", createdAt: "2025-07-15T10:00:00Z", updatedAt: "2025-07-15T10:00:00Z", dueDate: "2025-08-01", status: "pending", priority: "medium", remarks: [] },
        { id: "gt4", title: "Verify dead stock items", description: "Physical verification of dead stock items in store room", assignedTo: "u5", assignedBy: "u1", createdAt: "2025-08-01T10:00:00Z", updatedAt: "2025-08-01T10:00:00Z", dueDate: "2025-08-20", status: "pending", priority: "low", remarks: [] },
        { id: "gt5", title: "Update asset register", description: "Enter new assets purchased in Q1 into asset register", assignedTo: "u2", assignedBy: "u1", createdAt: "2025-08-05T10:00:00Z", updatedAt: "2025-08-05T10:00:00Z", dueDate: "2025-08-30", status: "in_progress", priority: "medium", remarks: [{ text: "50% done, continuing", user: "Surojit Biswas", date: "2025-08-15T10:00:00Z" }] },
      ],
      taskCounter: 14, // starts after sample tasks TSK-001..014
      monthlySheets: [],

      loadFromSheetData: () => {
        const sheetData = useAuthStore.getState().sheetData;
        if (sheetData) {
          console.log("Loading tasks and monthlySheets from sheet data...");
          set({
            tasks: sheetData.tasks,
            monthlySheets: sheetData.monthlySheets,
            // Calculate taskCounter from existing tasks
            taskCounter: sheetData.tasks.reduce((max, t) => {
              const match = t.taskNo?.match(/TSK-(\d+)/);
              const num = match ? parseInt(match[1], 10) : 0;
              return num > max ? num : max;
            }, 14),
          });
        }
      },

      syncToSheet: async () => {
        const { tasks, monthlySheets, generalTasks } = get();
        
        try {
          console.log("Syncing tasks, monthlySheets, and generalTasks in local persistence mode...");
          const [tasksResult, monthlyResult, generalTasksResult] = await Promise.all([
            writeTasks(undefined, tasks),
            writeMonthlySheets(undefined, monthlySheets),
            writeGeneralTasks(undefined, generalTasks),
          ]);
          
          const success = tasksResult && monthlyResult && generalTasksResult;
          if (success) {
            console.log("Successfully synced tasks, monthlySheets, and generalTasks locally");
          } else {
            console.error("Partial local sync for tasks/monthlySheets/generalTasks:", { tasksResult, monthlyResult, generalTasksResult });
          }
          return success;
        } catch (error) {
          console.error("Failed to sync tasks/monthlySheets/generalTasks to sheet:", error);
          return false;
        }
      },

      getNextTaskNo: () => {
        const counter = get().taskCounter + 1;
        return `TSK-${String(counter).padStart(3, "0")}`;
      },

      getTaskByNo: (taskNo) => get().tasks.find((t) => t.taskNo === taskNo),

      reopenTask: (id, userId, userName) => {
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id !== id) return t;
            const now = new Date().toISOString();
            return {
              ...t,
              status: "assigned" as TaskStatus,
              updatedAt: now,
              remarks: [...t.remarks, { text: `Task reopened by ${userName}`, user: userName, date: now }],
              history: [...t.history, { date: now, action: "Task reopened", user: userId, fromStatus: t.status, toStatus: "assigned" as TaskStatus }],
            };
          }),
        }));
        triggerAutoSync("taskStore.reopenTask");
      },

      addFollowUpTask: (parentId, task) => {
        const now = new Date().toISOString();
        const counter = get().taskCounter + 1;
        const taskNo = `TSK-${String(counter).padStart(3, "0")}`;
        const parent = get().tasks.find((t) => t.id === parentId);
        const newTask: Task = {
          ...task,
          id: generateId(),
          taskNo,
          createdAt: now,
          updatedAt: now,
          parentTaskId: parentId,
          childTaskIds: [],
          remarks: [],
          history: [{ date: now, action: `Follow-up task created from ${parent?.taskNo || parentId}`, user: task.assignedBy }],
          transferHistory: [],
        };
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === parentId
              ? { ...t, childTaskIds: [...(t.childTaskIds || []), newTask.id], updatedAt: now, history: [...t.history, { date: now, action: `Follow-up task ${taskNo} created`, user: task.assignedBy }] }
              : t
          ).concat(newTask),
          taskCounter: counter,
        }));
        triggerAutoSync("taskStore.addFollowUpTask");
        return newTask;
      },

      addTask: (task) => {
        const now = new Date().toISOString();
        const counter = get().taskCounter + 1;
        const taskNo = `TSK-${String(counter).padStart(3, "0")}`;
        const newTask: Task = {
          ...task,
          id: generateId(),
          taskNo,
          createdAt: now,
          updatedAt: now,
          remarks: [],
          history: [{ date: now, action: "Task created", user: task.assignedBy }],
          transferHistory: [],
        };
        set((state) => ({ tasks: [...state.tasks, newTask], taskCounter: counter }));
        triggerAutoSync("taskStore.addTask");
        return newTask;
      },

      updateTaskStatus: (id, status, userId, userName, remark) => {
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id !== id) return t;
            const now = new Date().toISOString();
            const newRemarks = remark
              ? [...t.remarks, { text: remark, user: userName, date: now }]
              : [...t.remarks, { text: `Status changed to ${status}`, user: userName, date: now }];
            return {
              ...t,
              status,
              updatedAt: now,
              remarks: newRemarks,
              history: [...t.history, { date: now, action: `Status changed to ${status}`, user: userId, fromStatus: t.status, toStatus: status }],
            };
          }),
        }));
        triggerAutoSync("taskStore.updateTaskStatus");
      },

      updateTaskPriority: (id, priority) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, priority, updatedAt: new Date().toISOString() } : t
          ),
        }));
        triggerAutoSync("taskStore.updateTaskPriority");
      },

      updateTaskGfrType: (id, gfrType) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, gfrType: gfrType as any, updatedAt: new Date().toISOString() } : t
          ),
        }));
        triggerAutoSync("taskStore.updateTaskGfrType");
      },

      transferTask: (id, toUserId, reason, fromUserId) => {
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id !== id) return t;
            const now = new Date().toISOString();
            return {
              ...t,
              assignedTo: toUserId,
              updatedAt: now,
              transferHistory: [...t.transferHistory, { date: now, fromUser: fromUserId, toUser: toUserId, reason }],
              history: [...t.history, { date: now, action: `Task transferred`, user: fromUserId }],
            };
          }),
        }));
        triggerAutoSync("taskStore.transferTask");
      },

      addRemark: (id, text, userId, userName) => {
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id !== id) return t;
            const now = new Date().toISOString();
            return {
              ...t,
              remarks: [...t.remarks, { text, user: userName, date: now }],
              updatedAt: now,
              history: [...t.history, { date: now, action: `Remark added: ${text.substring(0, 50)}`, user: userId }],
            };
          }),
        }));
        triggerAutoSync("taskStore.addRemark");
      },

      deleteTask: (id) => {
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
        triggerAutoSync("taskStore.deleteTask");
      },

      linkTaskToFile: (taskId, fileId) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, linkedFileId: fileId, updatedAt: new Date().toISOString() } : t
          ),
        }));
        triggerAutoSync("taskStore.linkTaskToFile");
      },

      addGeneralTask: (task) => {
        const now = new Date().toISOString();
        set((state) => ({
          generalTasks: [...state.generalTasks, { ...task, id: generateId(), createdAt: now, updatedAt: now, remarks: [] }],
        }));
        triggerAutoSync("taskStore.addGeneralTask");
      },

      updateGeneralTaskStatus: (id, status, userId, userName, remark) => {
        set((state) => ({
          generalTasks: state.generalTasks.map((t) => {
            if (t.id !== id) return t;
            const now = new Date().toISOString();
            const newRemarks = remark
              ? [...t.remarks, { text: remark, user: userName, date: now }]
              : [...t.remarks, { text: `Status changed to ${status}`, user: userName, date: now }];
            return { ...t, status, updatedAt: now, remarks: newRemarks };
          }),
        }));
        triggerAutoSync("taskStore.updateGeneralTaskStatus");
      },

      updateGeneralTaskPriority: (id, priority) => {
        set((state) => ({
          generalTasks: state.generalTasks.map((t) =>
            t.id === id ? { ...t, priority, updatedAt: new Date().toISOString() } : t
          ),
        }));
        triggerAutoSync("taskStore.updateGeneralTaskPriority");
      },

      deleteGeneralTask: (id) => {
        set((state) => ({ generalTasks: state.generalTasks.filter((t) => t.id !== id) }));
        triggerAutoSync("taskStore.deleteGeneralTask");
      },

      getTasksByUser: (userId) => get().tasks.filter((t) => t.assignedTo === userId),

      getAverageDays: (userId) => {
        const completed = get().tasks.filter((t) => t.assignedTo === userId && t.status === "completed");
        if (completed.length === 0) return 0;
        const totalDays = completed.reduce((sum, t) => {
          const start = new Date(t.createdAt).getTime();
          const end = new Date(t.updatedAt).getTime();
          return sum + (end - start) / (1000 * 60 * 60 * 24);
        }, 0);
        return Math.round(totalDays / completed.length);
      },

      addMonthlySheet: (sheet) => {
        const now = new Date().toISOString();
        const newSheet: MonthlySheet = { ...sheet, id: generateId(), uploadedAt: now, updatedAt: now };
        set((state) => ({ monthlySheets: [...state.monthlySheets, newSheet] }));
        triggerAutoSync("taskStore.addMonthlySheet");
        return newSheet;
      },

      updateMonthlyItemStatus: (sheetId, itemId, status, note) => {
        set((state) => ({
          monthlySheets: state.monthlySheets.map((s) => {
            if (s.id !== sheetId) return s;
            return {
              ...s,
              updatedAt: new Date().toISOString(),
              items: s.items.map((i) => {
                if (i.id !== itemId) return i;
                const dateField: Partial<MonthlySheetItem> = {};
                if (status === "quotation_called") dateField.quotationCalledDate = new Date().toISOString().split("T")[0];
                if (status === "reminder_given") dateField.reminderDate = new Date().toISOString().split("T")[0];
                if (status === "quotation_received") dateField.quotationReceivedDate = new Date().toISOString().split("T")[0];
                if (status === "gfr_prepared") dateField.gfrPreparedDate = new Date().toISOString().split("T")[0];
                if (status === "noting_prepared") dateField.notingPreparedDate = new Date().toISOString().split("T")[0];
                return {
                  ...i,
                  ...dateField,
                  status,
                  statusLog: [...i.statusLog, { status, date: new Date().toISOString(), note }],
                };
              }),
            };
          }),
        }));
        triggerAutoSync("taskStore.updateMonthlyItemStatus");
      },

      updateMonthlyItem: (sheetId, itemId, updates) => {
        set((state) => ({
          monthlySheets: state.monthlySheets.map((s) => {
            if (s.id !== sheetId) return s;
            return {
              ...s,
              updatedAt: new Date().toISOString(),
              items: s.items.map((i) => (i.id === itemId ? { ...i, ...updates } : i)),
            };
          }),
        }));
        triggerAutoSync("taskStore.updateMonthlyItem");
      },

      linkMonthlyItemToFile: (sheetId, itemId, fileId) => {
        set((state) => ({
          monthlySheets: state.monthlySheets.map((s) => {
            if (s.id !== sheetId) return s;
            return {
              ...s,
              updatedAt: new Date().toISOString(),
              items: s.items.map((i) => (i.id === itemId ? { ...i, linkedFileId: fileId, status: "file_created" as MonthlyItemStatus, statusLog: [...i.statusLog, { status: "file_created" as MonthlyItemStatus, date: new Date().toISOString() }] } : i)),
            };
          }),
        }));
        triggerAutoSync("taskStore.linkMonthlyItemToFile");
      },

      deleteMonthlySheet: (sheetId) => {
        set((state) => ({ monthlySheets: state.monthlySheets.filter((s) => s.id !== sheetId) }));
        triggerAutoSync("taskStore.deleteMonthlySheet");
      },
    }),
    { name: "cnci-tasks" }
  )
);
