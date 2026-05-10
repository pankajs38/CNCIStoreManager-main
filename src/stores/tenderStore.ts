import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TenderRecord, TenderStage, TenderStageEntry, ContractRecord, Campus, FileNumberCode, TenderCaseType, TenderAwardedItem } from "@/types";
import { SAMPLE_TENDERS, SAMPLE_CONTRACTS } from "@/constants/mockData";
import { generateId, getFiscalYear } from "@/lib/utils";
import { useAuthStore } from "./authStore";
import { writeTenders, writeContracts } from "@/lib/sheetServices";
import { triggerAutoSync } from "@/lib/autoSync";

interface TenderState {
  tenders: TenderRecord[];
  contracts: ContractRecord[];
  loadFromSheetData: () => void;
  syncToSheet: () => Promise<boolean>;
  addTender: (params: {
    campus: Campus;
    fileNumberCode: FileNumberCode;
    tenderCaseType: TenderCaseType;
    userDefinedName: string;
    subject: string;
    indenterName: string;
    indenterDept: string;
    createdBy: string;
  }) => TenderRecord;
  updateTenderStage: (id: string, stage: TenderStageEntry) => void;
  completeTender: (id: string, awardedTo: string, awardedPrice: number, contractStart?: string, contractEnd?: string) => void;
  cancelTender: (id: string, userId: string) => void;
  retender: (id: string, userId: string) => void;
  updateTenderPoDetails: (id: string, updates: { gemPoNo?: string; gemPoDate?: string; manualPoNo?: string; manualPoDate?: string }) => void;
  addTenderAwardedItems: (id: string, items: TenderAwardedItem[]) => void;
  addContract: (contract: Omit<ContractRecord, "id">) => void;
  updateContract: (id: string, updates: Partial<ContractRecord>) => void;
  linkNewFile: (contractId: string, fileId: string) => void;
  getExpiringContracts: () => ContractRecord[];
}

export const useTenderStore = create<TenderState>()(
  persist(
    (set, get) => ({
      tenders: SAMPLE_TENDERS,
      contracts: SAMPLE_CONTRACTS,

      loadFromSheetData: () => {
        const sheetData = useAuthStore.getState().sheetData;
        if (sheetData) {
          console.log("Loading tenders and contracts from sheet data...");
          set({
            tenders: sheetData.tenders,
            contracts: sheetData.contracts,
          });
        }
      },

      syncToSheet: async () => {
        const { tenders, contracts } = get();
        const accessToken = useAuthStore.getState().accessToken;
        if (!accessToken) {
          console.warn("No access token for sync to sheet");
          return false;
        }
        
        try {
          console.log("Syncing tenders and contracts to Google Sheets...");
          const [tendersResult, contractsResult] = await Promise.all([
            writeTenders(accessToken, tenders),
            writeContracts(accessToken, contracts),
          ]);
          
          const success = tendersResult && contractsResult;
          if (success) {
            console.log("Successfully synced tenders and contracts to Google Sheets");
          } else {
            console.error("Partial sync for tenders/contracts:", { tendersResult, contractsResult });
          }
          return success;
        } catch (error) {
          console.error("Failed to sync tenders/contracts to sheet:", error);
          return false;
        }
      },

      addTender: (params) => {
        const fiscalYear = getFiscalYear();
        const fullFileNo = `CNCI/${params.campus}/S&P/${params.fileNumberCode}/TEN/${params.tenderCaseType}/${fiscalYear}/${params.userDefinedName}`;
        const now = new Date().toISOString();
        const newTender: TenderRecord = {
          id: generateId(),
          campus: params.campus,
          fileNumberCode: params.fileNumberCode,
          tenderCaseType: params.tenderCaseType,
          fiscalYear,
          userDefinedName: params.userDefinedName,
          fullFileNo,
          subject: params.subject,
          indenterName: params.indenterName,
          indenterDept: params.indenterDept,
          stages: [],
          currentStage: "rfp_created",
          isCompleted: false,
          createdAt: now,
          updatedAt: now,
          createdBy: params.createdBy,
          retenderCount: 0,
          awardedItems: [],
        };
        set((state) => ({ tenders: [...state.tenders, newTender] }));
        triggerAutoSync("tenderStore.addTender");
        return newTender;
      },

      updateTenderStage: (id, stageEntry) => {
        set((state) => ({
          tenders: state.tenders.map((t) => {
            if (t.id !== id) return t;
            return { ...t, stages: [...t.stages, stageEntry], currentStage: stageEntry.stage, updatedAt: new Date().toISOString() };
          }),
        }));
        triggerAutoSync("tenderStore.updateTenderStage");
      },

      completeTender: (id, awardedTo, awardedPrice, contractStart, contractEnd) => {
        set((state) => ({
          tenders: state.tenders.map((t) => {
            if (t.id !== id) return t;
            return { ...t, isCompleted: true, awardedTo, awardedPrice, contractPeriodStart: contractStart, contractPeriodEnd: contractEnd, currentStage: "completed" as TenderStage, updatedAt: new Date().toISOString() };
          }),
        }));
        triggerAutoSync("tenderStore.completeTender");
      },

      cancelTender: (id, userId) => {
        set((state) => ({
          tenders: state.tenders.map((t) => {
            if (t.id !== id) return t;
            return {
              ...t,
              currentStage: "cancelled" as TenderStage,
              isCompleted: true,
              stages: [...t.stages, { stage: "cancelled" as TenderStage, date: new Date().toISOString().split("T")[0], updatedBy: userId, data: {} }],
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
        triggerAutoSync("tenderStore.cancelTender");
      },

      retender: (id, userId) => {
        set((state) => ({
          tenders: state.tenders.map((t) => {
            if (t.id !== id) return t;
            return {
              ...t,
              currentStage: "retender" as TenderStage,
              retenderCount: t.retenderCount + 1,
              stages: [...t.stages, { stage: "retender" as TenderStage, date: new Date().toISOString().split("T")[0], updatedBy: userId, data: { call: t.retenderCount + 2 } }],
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
        triggerAutoSync("tenderStore.retender");
      },

      updateTenderPoDetails: (id, updates) => {
        set((state) => ({
          tenders: state.tenders.map((t) => (t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t)),
        }));
        triggerAutoSync("tenderStore.updateTenderPoDetails");
      },

      addTenderAwardedItems: (id, items) => {
        set((state) => ({
          tenders: state.tenders.map((t) => (t.id === id ? { ...t, awardedItems: items, updatedAt: new Date().toISOString() } : t)),
        }));
        triggerAutoSync("tenderStore.addTenderAwardedItems");
      },

      addContract: (contract) => {
        set((state) => ({ contracts: [...state.contracts, { ...contract, id: generateId() }] }));
        triggerAutoSync("tenderStore.addContract");
      },

      updateContract: (id, updates) => {
        set((state) => ({ contracts: state.contracts.map((c) => (c.id === id ? { ...c, ...updates } : c)) }));
        triggerAutoSync("tenderStore.updateContract");
      },

      linkNewFile: (contractId, fileId) => {
        set((state) => ({ contracts: state.contracts.map((c) => (c.id === contractId ? { ...c, linkedNewFileId: fileId } : c)) }));
        triggerAutoSync("tenderStore.linkNewFile");
      },

      getExpiringContracts: () => {
        const now = new Date();
        return get()
          .contracts.filter((c) => !c.isExpired && new Date(c.endDate) > now)
          .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
      },
    }),
    { name: "cnci-tenders" }
  )
);
