import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FileRecord, Campus, FileNumberCode, CaseType, FileItem, Task } from "@/types";
import { SAMPLE_FILES } from "@/constants/mockData";
import { generateId, getFiscalYear } from "@/lib/utils";
import { useAuthStore } from "./authStore";
import { writeFiles } from "@/lib/sheetServices";
import { triggerAutoSync } from "@/lib/autoSync";

interface FileState {
  files: FileRecord[];
  poCounter: Record<string, number>;
  continueNoStart: Record<string, number>;
  loadFromSheetData: () => void;
  syncToSheet: () => Promise<boolean>;
  addFile: (params: { campus: Campus; fileNumberCode: FileNumberCode; caseType: CaseType; subject?: string; createdBy: string }) => FileRecord;
  updateFile: (id: string, updates: Partial<FileRecord>) => void;
  addFileItem: (fileId: string, item: Omit<FileItem, "id">) => void;
  removeFileItem: (fileId: string, itemId: string) => void;
  insertFileBetween: (afterFileId: string, params: { campus: Campus; fileNumberCode: FileNumberCode; caseType: CaseType; subject?: string; createdBy: string }) => FileRecord;
  getNextContinueNo: (fileNumberCode: FileNumberCode) => number;
  lockFile: (id: string) => void;
  unlockFile: (id: string) => void;
  getFilesByCode: (code: FileNumberCode) => FileRecord[];
  getFilesByCampus: (campus: Campus) => FileRecord[];
  markFileCompleted: (id: string, createdByUserId?: string) => void;
  getNextPoNo: (fileNumberCode: FileNumberCode) => number;
  assignPo: (fileId: string, poNo: string, poDate: string, createdByUserId?: string) => void;
  editPoNo: (fileId: string, newPoNo: string, justification: string) => void;
  insertPoInBetween: (afterFileId: string, newPoNo: string, justification: string) => void;
  setContinueNoStart: (fileNumberCode: string, startNo: number) => void;
  reversePo: (fileId: string, reason: string, reversedBy: string) => void;
  canCreatePo: (fileId: string) => boolean;
  closeFile: (fileId: string, reason: string, closedBy: string) => void;
  invalidateFile: (fileId: string, reason: string, closedBy: string) => void;
  markDataScanned: (fileId: string, scannedBy: string) => void;
  unmarkDataScanned: (fileId: string) => void;
  createFileFromTasks: (params: { campus: Campus; fileNumberCode: FileNumberCode; caseType: CaseType; subject?: string; createdBy: string; tasks: Task[]; supplierName?: string }) => FileRecord;
}

export const useFileStore = create<FileState>()(
  persist(
    (set, get) => ({
      files: SAMPLE_FILES,
      poCounter: { "281": 2, "282": 0, "283": 0, "362": 0, "299": 0 },
      continueNoStart: {},

      loadFromSheetData: () => {
        const sheetData = useAuthStore.getState().sheetData;
        if (sheetData) {
          console.log("Loading files from sheet data...");
          set({ files: sheetData.files });
        }
      },

      syncToSheet: async () => {
        const { files } = get();
        
        try {
          console.log("Syncing files in local persistence mode...");
          const result = await writeFiles(undefined, files);
          if (result) {
            console.log("Successfully synced files locally");
          } else {
            console.error("Failed to sync files locally");
          }
          return result;
        } catch (error) {
          console.error("Failed to sync files to sheet:", error);
          return false;
        }
      },

      addFile: (params) => {
        const fiscalYear = getFiscalYear();
        const continueNo = get().getNextContinueNo(params.fileNumberCode);
        const fullFileNo = `CNCI/${params.campus}/S&P/${params.fileNumberCode}/${params.caseType}/${fiscalYear}/${String(continueNo).padStart(3, "0")}`;
        const now = new Date().toISOString();
        const newFile: FileRecord = {
          id: generateId(), campus: params.campus, fileNumberCode: params.fileNumberCode, caseType: params.caseType,
          fiscalYear, continueNo, fullFileNo, subject: params.subject || "", items: [], supplierName: "", amount: 0,
          fileInitiator: params.createdBy, poNo: "", poDate: "", createdAt: now, updatedAt: now, createdBy: params.createdBy,
          isLocked: false, isCompleted: false,
        };
        set((state) => ({ files: [...state.files, newFile] }));
        triggerAutoSync("fileStore.addFile");
        return newFile;
      },

      updateFile: (id, updates) => {
        set((state) => ({ files: state.files.map((f) => f.id === id ? { ...f, ...updates, updatedAt: new Date().toISOString() } : f) }));
        triggerAutoSync("fileStore.updateFile");
      },

      addFileItem: (fileId, item) => {
        set((state) => ({ files: state.files.map((f) => f.id === fileId ? { ...f, items: [...f.items, { ...item, id: generateId() }], updatedAt: new Date().toISOString() } : f) }));
        triggerAutoSync("fileStore.addFileItem");
      },

      removeFileItem: (fileId, itemId) => {
        set((state) => ({ files: state.files.map((f) => f.id === fileId ? { ...f, items: f.items.filter((i) => i.id !== itemId), updatedAt: new Date().toISOString() } : f) }));
        triggerAutoSync("fileStore.removeFileItem");
      },

      insertFileBetween: (afterFileId, params) => {
        const afterFile = get().files.find((f) => f.id === afterFileId);
        if (!afterFile) return get().addFile(params);
        const sameContinue = get().files.filter((f) => f.fileNumberCode === afterFile.fileNumberCode && f.continueNo === afterFile.continueNo && f.suffix);
        const suffix = sameContinue.length === 0 ? "A" : String.fromCharCode("A".charCodeAt(0) + sameContinue.length);
        const fullFileNo = `${afterFile.fullFileNo}${suffix}`;
        const now = new Date().toISOString();
        const newFile: FileRecord = {
          id: generateId(), campus: params.campus, fileNumberCode: params.fileNumberCode, caseType: params.caseType,
          fiscalYear: afterFile.fiscalYear, continueNo: afterFile.continueNo, suffix, fullFileNo, subject: params.subject || "",
          items: [], supplierName: "", amount: 0, fileInitiator: params.createdBy, poNo: "", poDate: "",
          createdAt: now, updatedAt: now, createdBy: params.createdBy, isLocked: false, isCompleted: false,
        };
        set((state) => { const idx = state.files.findIndex((f) => f.id === afterFileId); const newFiles = [...state.files]; newFiles.splice(idx + 1, 0, newFile); return { files: newFiles }; });
        triggerAutoSync("fileStore.insertFileBetween");
        return newFile;
      },

      getNextContinueNo: (fileNumberCode) => {
        const startNo = get().continueNoStart[fileNumberCode];
        const filesOfType = get().files.filter((f) => f.fileNumberCode === fileNumberCode && !f.suffix);
        if (filesOfType.length === 0) return startNo || 1;
        const maxNo = Math.max(...filesOfType.map((f) => f.continueNo));
        return Math.max(maxNo + 1, startNo || 0);
      },

      lockFile: (id) => {
        set((state) => ({ files: state.files.map((f) => (f.id === id ? { ...f, isLocked: true } : f)) }));
        triggerAutoSync("fileStore.lockFile");
      },
      unlockFile: (id) => {
        set((state) => ({ files: state.files.map((f) => (f.id === id ? { ...f, isLocked: false } : f)) }));
        triggerAutoSync("fileStore.unlockFile");
      },
      getFilesByCode: (code) => get().files.filter((f) => f.fileNumberCode === code),
      getFilesByCampus: (campus) => get().files.filter((f) => f.campus === campus),

      getNextPoNo: (fileNumberCode) => {
        const existingPos = get().files.filter((f) => f.fileNumberCode === fileNumberCode && f.poNo && !f.suffix && !f.poReversed);
        return existingPos.length > 0 ? existingPos.length + 1 : 1;
      },

      markFileCompleted: (id, createdByUserId?: string) => {
        const file = get().files.find((f) => f.id === id);
        if (!file) return;
        const poCount = get().getNextPoNo(file.fileNumberCode);
        const fiscalYear = getFiscalYear();
        const caseLabel = file.caseType === "PUR" && file.fileNumberCode === "283" ? "Works" : file.caseType;
        const poNo = `NCI/${file.campus}/S&P/${file.fileNumberCode}/${caseLabel}/${fiscalYear}/${String(poCount).padStart(3, "0")}`;
        const poDate = new Date().toISOString().split("T")[0];
        set((state) => ({ files: state.files.map((f) => f.id === id ? { ...f, isCompleted: true, poNo, poDate, poCreatedBy: createdByUserId || f.createdBy, updatedAt: new Date().toISOString() } : f) }));
        triggerAutoSync("fileStore.markFileCompleted");
      },

      assignPo: (fileId, poNo, poDate, createdByUserId?: string) => {
        set((state) => ({ files: state.files.map((f) => f.id === fileId ? { ...f, poNo, poDate, isCompleted: true, poCreatedBy: createdByUserId || f.createdBy, updatedAt: new Date().toISOString() } : f) }));
        triggerAutoSync("fileStore.assignPo");
      },

      editPoNo: (fileId, newPoNo, justification) => {
        set((state) => ({ files: state.files.map((f) => f.id === fileId ? { ...f, poNo: newPoNo, poJustification: justification, updatedAt: new Date().toISOString() } : f) }));
        triggerAutoSync("fileStore.editPoNo");
      },

      insertPoInBetween: (afterFileId, newPoNo, justification) => {
        set((state) => ({ files: state.files.map((f) => f.id === afterFileId ? { ...f, poNo: newPoNo, poJustification: justification, updatedAt: new Date().toISOString() } : f) }));
        triggerAutoSync("fileStore.insertPoInBetween");
      },

      setContinueNoStart: (fileNumberCode, startNo) =>
        set((state) => ({ continueNoStart: { ...state.continueNoStart, [fileNumberCode]: startNo } })),

      reversePo: (fileId, reason, reversedBy) => {
        set((state) => ({
          files: state.files.map((f) => f.id === fileId
            ? { ...f, poReversed: true, poReversalReason: reason, poReversedBy: reversedBy, poReversedAt: new Date().toISOString(), poNo: "", poDate: "", isCompleted: false, updatedAt: new Date().toISOString() }
            : f
          ),
        }));
        triggerAutoSync("fileStore.reversePo");
      },

      canCreatePo: (fileId) => {
        const file = get().files.find((f) => f.id === fileId);
        if (!file) return false;
        if (file.poNo || file.isCompleted) return false;
        if (!file.supplierName || !file.items || file.items.length === 0) return false;
        if (file.isClosed || file.isInvalid) return false;
        return true;
      },

      closeFile: (fileId, reason, closedBy) => {
        set((state) => ({
          files: state.files.map((f) => f.id === fileId
            ? { ...f, isClosed: true, closeReason: reason, closedBy, closedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
            : f
          ),
        }));
        triggerAutoSync("fileStore.closeFile");
      },

      invalidateFile: (fileId, reason, closedBy) => {
        set((state) => ({
          files: state.files.map((f) => f.id === fileId
            ? { ...f, isInvalid: true, closeReason: reason, closedBy, closedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
            : f
          ),
        }));
        triggerAutoSync("fileStore.invalidateFile");
      },

      markDataScanned: (fileId, scannedBy) => {
        set((state) => ({
          files: state.files.map((f) => f.id === fileId
            ? { ...f, isDataScanned: true, dataScannedBy: scannedBy, dataScannedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
            : f
          ),
        }));
        triggerAutoSync("fileStore.markDataScanned");
      },

      unmarkDataScanned: (fileId) => {
        set((state) => ({
          files: state.files.map((f) => f.id === fileId
            ? { ...f, isDataScanned: false, dataScannedBy: undefined, dataScannedAt: undefined, updatedAt: new Date().toISOString() }
            : f
          ),
        }));
        triggerAutoSync("fileStore.unmarkDataScanned");
      },

      createFileFromTasks: (params) => {
        const fiscalYear = getFiscalYear();
        const continueNo = get().getNextContinueNo(params.fileNumberCode);
        const fullFileNo = `CNCI/${params.campus}/S&P/${params.fileNumberCode}/${params.caseType}/${fiscalYear}/${String(continueNo).padStart(3, "0")}`;
        const now = new Date().toISOString();
        const items: FileItem[] = [];
        const linkedTaskNos: string[] = [];
        params.tasks.forEach((task) => {
          linkedTaskNos.push(task.taskNo);
          // Use task title as item name if no specific items
          items.push({ id: generateId(), name: task.title, quantity: 1, unit: "Lot", unitPrice: 0, totalPrice: 0, sourceTaskNo: task.taskNo });
        });
        const newFile: FileRecord = {
          id: generateId(), campus: params.campus, fileNumberCode: params.fileNumberCode, caseType: params.caseType,
          fiscalYear, continueNo, fullFileNo, subject: params.subject || params.tasks.map(t => t.title).join("; "),
          items, supplierName: params.supplierName || "", amount: 0, fileInitiator: params.createdBy,
          poNo: "", poDate: "", createdAt: now, updatedAt: now, createdBy: params.createdBy,
          isLocked: false, isCompleted: false, linkedTaskNos,
        };
        set((state) => ({ files: [...state.files, newFile] }));
        triggerAutoSync("fileStore.createFileFromTasks");
        return newFile;
      },
    }),
    { name: "cnci-files" }
  )
);
