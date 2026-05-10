import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { ReminderPopup } from "@/components/features/ReminderPopup";
import { useSettingsStore } from "@/stores/settingsStore";
import { cn } from "@/lib/utils";

const PAGE_KEY_MAP: Record<string, string> = {
  "/dashboard": "dashboard",
  "/tasks": "tasks",
  "/files": "files",
  "/tenders": "tenders",
  "/contracts": "contracts",
  "/settings": "settings",
  "/customisation": "customisation",
  "/activity": "activity",
};

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { pageColors, pageBackgrounds } = useSettingsStore();

  const pageKey = PAGE_KEY_MAP[location.pathname] || "";
  const colorConfig = pageColors.find((p) => p.pageKey === pageKey);
  const bgImage = pageBackgrounds[pageKey];

  const mainStyle: React.CSSProperties = {};
  if (colorConfig?.bgColor) mainStyle.backgroundColor = colorConfig.bgColor;
  if (colorConfig?.textColor) mainStyle.color = colorConfig.textColor;
  if (bgImage) {
    mainStyle.backgroundImage = `linear-gradient(rgba(255,255,255,0.88), rgba(255,255,255,0.88)), url(${bgImage})`;
    mainStyle.backgroundSize = "cover";
    mainStyle.backgroundPosition = "center";
    mainStyle.backgroundAttachment = "fixed";
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 lg:static lg:z-auto transition-transform duration-300",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <Sidebar />
      </div>
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 transition-colors duration-300" style={mainStyle}>
          <Outlet />
        </main>
      </div>
      <ReminderPopup />
    </div>
  );
}
