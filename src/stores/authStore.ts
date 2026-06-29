import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";
import { DEFAULT_USERS } from "@/constants/mockData";
import { syncAllData, syncAllDataToSheet, type AllSheetData } from "@/lib/sheetServices";

interface AuthState {
  currentUser: User | null;
  users: User[];
  isAuthenticated: boolean;
  isLoading: boolean;
  lastSynced: string | null;
  sheetData: AllSheetData | null;
  syncFromSheet: () => Promise<void>;
  syncToSheet: () => Promise<boolean>;
  login: (name: string, password: string) => boolean;
  logout: () => void;
  addUser: (user: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  removeUser: (id: string) => void;
  getUserById: (id: string) => User | undefined;
  getUserName: (id: string) => string;
  changePassword: (userId: string, oldPassword: string, newPassword: string) => boolean;
  adminChangePassword: (userId: string, newPassword: string) => void;
  setPasswordDirect: (userId: string, newPassword: string) => void;
  updateProfile: (id: string, updates: Partial<User>) => void;
  updateSheetData: (updates: Partial<AllSheetData>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      // Use DEFAULT_USERS as initial state - persist middleware will load from localStorage if available
      users: DEFAULT_USERS,
      isAuthenticated: false,
      isLoading: false,
      lastSynced: null,
      sheetData: null,

      updateSheetData: (updates) => set((state) => ({
        sheetData: state.sheetData ? { ...state.sheetData, ...updates } : null,
      })),

      syncFromSheet: async () => {
        set({ isLoading: true });
        try {
          console.log("Starting full sync from local Excel...");
          const allData = await syncAllData();
          console.log("Fetched all data from sheets:", {
            users: allData.users.length,
            tasks: allData.tasks.length,
            files: allData.files.length,
            tenders: allData.tenders.length,
            contracts: allData.contracts.length,
            vendors: allData.vendors.length,
            monthlySheets: allData.monthlySheets.length,
            reminders: allData.reminders.length,
            activityLogs: allData.activityLogs.length,
          });
          
          set({ 
            users: allData.users,
            sheetData: allData,
            lastSynced: new Date().toISOString(),
            isLoading: false 
          });
          console.log(`Loaded all data from local Excel`);
        } catch (error) {
          set({ isLoading: false });
          console.error("Failed to load data from local Excel:", error);
          // Keep existing data on error
        }
      },

      syncToSheet: async () => {
        const { sheetData, users } = get();
        if (!sheetData) {
          console.warn("No sheet data to sync");
          return false;
        }
        
        try {
          console.log("Syncing all data to local persistence mode...");
          const result = await syncAllDataToSheet(undefined, {
            ...sheetData,
            users,
          });
          
          const allSuccess = Object.values(result).every(v => v);
          if (allSuccess) {
            console.log("Successfully applied local persistence mode sync");
          } else {
            console.error("Partial local sync result:", result);
          }
          return allSuccess;
        } catch (error) {
          console.error("Failed to sync to local persistence mode:", error);
          return false;
        }
      },

      login: (name, password) => {
        // Always include DEFAULT_USERS as fallback
        const availableUsers = [...DEFAULT_USERS, ...get().users];
        const user = availableUsers.find(
          (u) => u.name.toLowerCase() === name.toLowerCase() && u.password === password && u.isActive
        );
        if (user) {
          set({ currentUser: user, isAuthenticated: true });
          return true;
        }
        return false;
      },

      logout: () => set({ currentUser: null, isAuthenticated: false }),

      addUser: (user) => set((state) => ({ users: [...state.users, user] })),

      updateUser: (id, updates) =>
        set((state) => ({
          users: state.users.map((u) => (u.id === id ? { ...u, ...updates } : u)),
          currentUser: state.currentUser?.id === id ? { ...state.currentUser, ...updates } : state.currentUser,
        })),

      removeUser: (id) =>
        set((state) => ({
          users: state.users.map((u) => (u.id === id ? { ...u, isActive: false } : u)),
        })),

      getUserById: (id) => get().users.find((u) => u.id === id),

      getUserName: (id) => {
        const user = get().users.find((u) => u.id === id);
        return user ? user.name : "Unknown";
      },

      changePassword: (userId, oldPassword, newPassword) => {
        const user = get().users.find((u) => u.id === userId);
        if (!user || user.password !== oldPassword) return false;
        set((state) => ({
          users: state.users.map((u) => (u.id === userId ? { ...u, password: newPassword } : u)),
          currentUser: state.currentUser?.id === userId ? { ...state.currentUser, password: newPassword } : state.currentUser,
        }));
        return true;
      },

      adminChangePassword: (userId, newPassword) => {
        set((state) => ({
          users: state.users.map((u) => (u.id === userId ? { ...u, password: newPassword } : u)),
        }));
      },

      setPasswordDirect: (userId, newPassword) => {
        set((state) => ({
          users: state.users.map((u) => (u.id === userId ? { ...u, password: newPassword } : u)),
          currentUser: state.currentUser?.id === userId ? { ...state.currentUser, password: newPassword } : state.currentUser,
        }));
      },

      updateProfile: (id, updates) =>
        set((state) => ({
          users: state.users.map((u) => (u.id === id ? { ...u, ...updates } : u)),
          currentUser: state.currentUser?.id === id ? { ...state.currentUser, ...updates } : state.currentUser,
        })),
    }),
    { 
      name: "cnci-auth",
      partialize: (state) => ({ 
        lastSynced: state.lastSynced,
        users: state.users,
        sheetData: state.sheetData
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log("Auth store rehydrated");
        }
      }
    }
  )
);
