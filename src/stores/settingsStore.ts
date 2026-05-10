import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ActivityLogEntry, Vendor } from "@/types";
import { generateId } from "@/lib/utils";

export interface CustomReminder {
  id: string;
  title: string;
  message: string;
  date: string;
  createdBy: string;
  createdByName: string;
  isCompleted: boolean;
  linkedType?: "file" | "tender" | "contract";
  linkedId?: string;
  linkedLabel?: string;
}

export interface PageColorConfig {
  pageKey: string;
  label: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
}

export interface TabOrder {
  key: string;
  label: string;
  visible: boolean;
  order: number;
}

export interface ThemePreset {
  name: string;
  colors: Record<string, { bgColor: string; textColor: string; accentColor: string }>;
}

export interface InAppNotification {
  id: string;
  title: string;
  message: string;
  module: string;
  isRead: boolean;
  timestamp: string;
  relatedId?: string;
}

const THEME_PRESETS: ThemePreset[] = [
  {
    name: "Classic Navy",
    colors: { dashboard: { bgColor: "#f0f4f8", textColor: "#1a2744", accentColor: "#c28a30" }, tasks: { bgColor: "#f0f4f8", textColor: "#1a2744", accentColor: "#c28a30" }, files: { bgColor: "#f0f4f8", textColor: "#1a2744", accentColor: "#c28a30" }, tenders: { bgColor: "#f0f4f8", textColor: "#1a2744", accentColor: "#c28a30" }, contracts: { bgColor: "#f0f4f8", textColor: "#1a2744", accentColor: "#c28a30" }, settings: { bgColor: "#f0f4f8", textColor: "#1a2744", accentColor: "#c28a30" }, customisation: { bgColor: "#f0f4f8", textColor: "#1a2744", accentColor: "#c28a30" } },
  },
  {
    name: "Modern Teal",
    colors: { dashboard: { bgColor: "#f0fdfa", textColor: "#134e4a", accentColor: "#14b8a6" }, tasks: { bgColor: "#f0fdfa", textColor: "#134e4a", accentColor: "#14b8a6" }, files: { bgColor: "#f0fdfa", textColor: "#134e4a", accentColor: "#14b8a6" }, tenders: { bgColor: "#f0fdfa", textColor: "#134e4a", accentColor: "#14b8a6" }, contracts: { bgColor: "#f0fdfa", textColor: "#134e4a", accentColor: "#14b8a6" }, settings: { bgColor: "#f0fdfa", textColor: "#134e4a", accentColor: "#14b8a6" }, customisation: { bgColor: "#f0fdfa", textColor: "#134e4a", accentColor: "#14b8a6" } },
  },
  {
    name: "Warm Earth",
    colors: { dashboard: { bgColor: "#faf5f0", textColor: "#44270b", accentColor: "#c2710c" }, tasks: { bgColor: "#faf5f0", textColor: "#44270b", accentColor: "#c2710c" }, files: { bgColor: "#faf5f0", textColor: "#44270b", accentColor: "#c2710c" }, tenders: { bgColor: "#faf5f0", textColor: "#44270b", accentColor: "#c2710c" }, contracts: { bgColor: "#faf5f0", textColor: "#44270b", accentColor: "#c2710c" }, settings: { bgColor: "#faf5f0", textColor: "#44270b", accentColor: "#c2710c" }, customisation: { bgColor: "#faf5f0", textColor: "#44270b", accentColor: "#c2710c" } },
  },
  {
    name: "High Contrast",
    colors: { dashboard: { bgColor: "#ffffff", textColor: "#000000", accentColor: "#dc2626" }, tasks: { bgColor: "#ffffff", textColor: "#000000", accentColor: "#dc2626" }, files: { bgColor: "#ffffff", textColor: "#000000", accentColor: "#dc2626" }, tenders: { bgColor: "#ffffff", textColor: "#000000", accentColor: "#dc2626" }, contracts: { bgColor: "#ffffff", textColor: "#000000", accentColor: "#dc2626" }, settings: { bgColor: "#ffffff", textColor: "#000000", accentColor: "#dc2626" }, customisation: { bgColor: "#ffffff", textColor: "#000000", accentColor: "#dc2626" } },
  },
  {
    name: "Default (Reset)",
    colors: { dashboard: { bgColor: "", textColor: "", accentColor: "" }, tasks: { bgColor: "", textColor: "", accentColor: "" }, files: { bgColor: "", textColor: "", accentColor: "" }, tenders: { bgColor: "", textColor: "", accentColor: "" }, contracts: { bgColor: "", textColor: "", accentColor: "" }, settings: { bgColor: "", textColor: "", accentColor: "" }, customisation: { bgColor: "", textColor: "", accentColor: "" } },
  },
];

const DEFAULT_PAGE_COLORS: PageColorConfig[] = [
  { pageKey: "dashboard", label: "Dashboard", bgColor: "", textColor: "", accentColor: "" },
  { pageKey: "tasks", label: "Task Manager", bgColor: "", textColor: "", accentColor: "" },
  { pageKey: "files", label: "File Manager", bgColor: "", textColor: "", accentColor: "" },
  { pageKey: "tenders", label: "Tender Cases", bgColor: "", textColor: "", accentColor: "" },
  { pageKey: "contracts", label: "RC / AMC / CMC", bgColor: "", textColor: "", accentColor: "" },
  { pageKey: "settings", label: "Settings", bgColor: "", textColor: "", accentColor: "" },
  { pageKey: "customisation", label: "Customisation", bgColor: "", textColor: "", accentColor: "" },
  { pageKey: "activity", label: "Activity Log", bgColor: "", textColor: "", accentColor: "" },
];

const DEFAULT_TAB_ORDER: TabOrder[] = [
  { key: "dashboard", label: "Dashboard", visible: true, order: 0 },
  { key: "tasks", label: "Task Manager", visible: true, order: 1 },
  { key: "files", label: "File Manager", visible: true, order: 2 },
  { key: "tenders", label: "Tender Cases", visible: true, order: 3 },
  { key: "contracts", label: "RC / AMC / CMC", visible: true, order: 4 },
  { key: "activity", label: "Activity Log", visible: true, order: 5 },
  { key: "settings", label: "Settings", visible: true, order: 6 },
  { key: "customisation", label: "Customisation", visible: true, order: 7 },
  { key: "profile", label: "My Profile", visible: false, order: 8 },
];

interface SettingsState {
  saveReminderUsers: string[];
  customFileNumbers: { code: string; label: string }[];
  fileFormatTemplate: string;
  tenderFormatTemplate: string;
  notificationSoundEnabled: boolean;

  pageColors: PageColorConfig[];
  pageBackgrounds: Record<string, string>;
  loginBgImage: string;
  tabOrder: TabOrder[];
  homeDashboardWidgets: string[];
  customReminders: CustomReminder[];
  themePresets: ThemePreset[];

  vendors: Vendor[];
  activityLog: ActivityLogEntry[];
  notifications: InAppNotification[];

  setSaveReminderUsers: (users: string[]) => void;
  addCustomFileNumber: (code: string, label: string) => void;
  removeCustomFileNumber: (code: string) => void;
  setFileFormatTemplate: (template: string) => void;
  setTenderFormatTemplate: (template: string) => void;
  setNotificationSoundEnabled: (enabled: boolean) => void;

  setPageColor: (pageKey: string, updates: Partial<PageColorConfig>) => void;
  setPageBackground: (pageKey: string, imageUrl: string) => void;
  removePageBackground: (pageKey: string) => void;
  setLoginBgImage: (url: string) => void;
  setTabOrder: (tabs: TabOrder[]) => void;
  toggleTabVisibility: (key: string) => void;
  setHomeDashboardWidgets: (widgets: string[]) => void;
  addCustomReminder: (reminder: CustomReminder) => void;
  updateCustomReminder: (id: string, updates: Partial<CustomReminder>) => void;
  removeCustomReminder: (id: string) => void;
  applyThemePreset: (preset: ThemePreset) => void;

  addVendor: (vendor: Vendor) => void;
  updateVendor: (id: string, updates: Partial<Vendor>) => void;
  removeVendor: (id: string) => void;
  importVendors: (vendors: Vendor[]) => void;

  addActivityLog: (entry: Omit<ActivityLogEntry, "id" | "timestamp">) => void;
  clearActivityLog: () => void;

  addNotification: (n: Omit<InAppNotification, "id" | "timestamp" | "isRead">) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      saveReminderUsers: ["u1", "u2"],
      customFileNumbers: [],
      fileFormatTemplate: "CNCI/{campus}/S&P/{fileNo}/{type}/{fiscalYear}/{continueNo}",
      tenderFormatTemplate: "CNCI/{campus}/S&P/{fileNo}/TEN/{type}/{fiscalYear}/{name}",
      notificationSoundEnabled: true,

      pageColors: DEFAULT_PAGE_COLORS,
      pageBackgrounds: {},
      loginBgImage: "",
      tabOrder: DEFAULT_TAB_ORDER,
      homeDashboardWidgets: ["taskSummary", "activeTenders", "recentFiles", "quickStats", "expiringContracts", "avgDays"],
      customReminders: [],
      themePresets: THEME_PRESETS,

      vendors: [
        { id: "v1", name: "Labtech India Pvt Ltd", firmName: "Labtech India Pvt Ltd", city: "Kolkata", address: "Kolkata", phone: "9876543210", email: "info@labtech.in", gstNo: "19AABCL1234F1Z5", addedBy: "u1", addedAt: "2025-01-01" },
        { id: "v2", name: "CleanWell Corp", firmName: "CleanWell Corp", city: "Mumbai", address: "Mumbai", phone: "9812345678", email: "sales@cleanwell.com", gstNo: "27AABCC9876D1Z8", addedBy: "u1", addedAt: "2025-01-01" },
        { id: "v3", name: "Siemens Healthineers", firmName: "Siemens Healthineers India", city: "Delhi", address: "Delhi", phone: "9900112233", email: "india@siemens-healthineers.com", gstNo: "07AADCS5566G1Z3", addedBy: "u1", addedAt: "2025-01-01" },
        { id: "v4", name: "Merck Life Science", firmName: "Merck Life Science Pvt Ltd", city: "Mumbai", address: "Mumbai", phone: "9811223344", email: "orders@merck.co.in", gstNo: "27AABCM7788H1Z1", addedBy: "u1", addedAt: "2025-01-01" },
        { id: "v5", name: "GE Healthcare", firmName: "GE Healthcare India", city: "Bengaluru", address: "Bengaluru", phone: "9733445566", email: "support@ge.com", gstNo: "29AADCG3344J1Z6", addedBy: "u1", addedAt: "2025-01-01" },
        { id: "v6", name: "Johnson & Johnson", firmName: "J&J Medical India", city: "Mumbai", address: "Mumbai", phone: "9622334455", email: "medinfo@jnj.com", gstNo: "27AABCJ9988K1Z4", addedBy: "u1", addedAt: "2025-01-01" },
        { id: "v7", name: "Luminous Power", firmName: "Luminous Power Technologies", city: "Delhi", address: "Delhi", phone: "9544556677", email: "service@luminous.in", gstNo: "07AABCL2233M1Z2", addedBy: "u1", addedAt: "2025-01-01" },
      ],
      activityLog: [],
      notifications: [],

      setSaveReminderUsers: (users) => set({ saveReminderUsers: users }),
      addCustomFileNumber: (code, label) =>
        set((state) => ({ customFileNumbers: [...state.customFileNumbers, { code, label }] })),
      removeCustomFileNumber: (code) =>
        set((state) => ({ customFileNumbers: state.customFileNumbers.filter((f) => f.code !== code) })),
      setFileFormatTemplate: (template) => set({ fileFormatTemplate: template }),
      setTenderFormatTemplate: (template) => set({ tenderFormatTemplate: template }),
      setNotificationSoundEnabled: (enabled) => set({ notificationSoundEnabled: enabled }),

      setPageColor: (pageKey, updates) =>
        set((state) => ({
          pageColors: state.pageColors.map((p) => (p.pageKey === pageKey ? { ...p, ...updates } : p)),
        })),
      setPageBackground: (pageKey, imageUrl) =>
        set((state) => ({ pageBackgrounds: { ...state.pageBackgrounds, [pageKey]: imageUrl } })),
      removePageBackground: (pageKey) =>
        set((state) => {
          const updated = { ...state.pageBackgrounds };
          delete updated[pageKey];
          return { pageBackgrounds: updated };
        }),
      setLoginBgImage: (url) => set({ loginBgImage: url }),
      setTabOrder: (tabs) => set({ tabOrder: tabs }),
      toggleTabVisibility: (key) =>
        set((state) => ({ tabOrder: state.tabOrder.map((t) => (t.key === key ? { ...t, visible: !t.visible } : t)) })),
      setHomeDashboardWidgets: (widgets) => set({ homeDashboardWidgets: widgets }),
      addCustomReminder: (reminder) =>
        set((state) => ({ customReminders: [...state.customReminders, reminder] })),
      updateCustomReminder: (id, updates) =>
        set((state) => ({ customReminders: state.customReminders.map((r) => (r.id === id ? { ...r, ...updates } : r)) })),
      removeCustomReminder: (id) =>
        set((state) => ({ customReminders: state.customReminders.filter((r) => r.id !== id) })),
      applyThemePreset: (preset) =>
        set((state) => ({
          pageColors: state.pageColors.map((p) => {
            const presetColor = preset.colors[p.pageKey];
            if (presetColor) return { ...p, ...presetColor };
            return p;
          }),
        })),

      addVendor: (vendor) => set((state) => ({ vendors: [...state.vendors, vendor] })),
      updateVendor: (id, updates) =>
        set((state) => ({ vendors: state.vendors.map((v) => (v.id === id ? { ...v, ...updates } : v)) })),
      removeVendor: (id) => set((state) => ({ vendors: state.vendors.filter((v) => v.id !== id) })),
      importVendors: (newVendors) =>
        set((state) => {
          const existingNames = new Set(state.vendors.map((v) => v.name.toLowerCase()));
          const unique = newVendors.filter((v) => !existingNames.has(v.name.toLowerCase()));
          return { vendors: [...state.vendors, ...unique] };
        }),

      addActivityLog: (entry) =>
        set((state) => ({
          activityLog: [{ ...entry, id: generateId(), timestamp: new Date().toISOString() }, ...state.activityLog].slice(0, 500),
        })),
      clearActivityLog: () => set({ activityLog: [] }),

      addNotification: (n) =>
        set((state) => ({
          notifications: [{ ...n, id: generateId(), timestamp: new Date().toISOString(), isRead: false }, ...state.notifications].slice(0, 200),
        })),
      markNotificationRead: (id) =>
        set((state) => ({ notifications: state.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)) })),
      markAllNotificationsRead: () =>
        set((state) => ({ notifications: state.notifications.map((n) => ({ ...n, isRead: true })) })),
      clearNotifications: () => set({ notifications: [] }),
    }),
    { name: "cnci-settings" }
  )
);

export { THEME_PRESETS };
