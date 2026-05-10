import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, ClipboardList, FolderOpen, Gavel, ShieldCheck, Settings,
  LogOut, FileStack, Paintbrush, ScrollText, UserCircle, Trophy,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { cn } from "@/lib/utils";
import cnciLogo from "@/assets/cnci-logo-official.png";

const iconMap: Record<string, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard, tasks: ClipboardList, files: FolderOpen, tenders: Gavel,
  contracts: FileStack, settings: Settings, customisation: Paintbrush, activity: ScrollText, profile: UserCircle, bestperformers: Trophy,
};

const routeMap: Record<string, string> = {
  dashboard: "/dashboard", tasks: "/tasks", files: "/files", tenders: "/tenders",
  contracts: "/contracts", settings: "/settings", customisation: "/customisation", activity: "/activity", profile: "/profile", bestperformers: "/best-performers",
};

const adminOnlyTabs = new Set(["settings"]);

export function Sidebar() {
  const { currentUser, logout } = useAuthStore();
  const { tabOrder } = useSettingsStore();
  const isAdmin = currentUser?.role === "admin";
  const sortedTabs = [...tabOrder].sort((a, b) => a.order - b.order);

  return (
    <aside className="w-64 h-screen sticky top-0 flex flex-col navy-gradient text-white shrink-0">
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img src={cnciLogo} alt="CNCI" className="size-10 rounded-lg object-contain bg-white/90 p-0.5" />
          <div className="min-w-0">
            <h1 className="text-sm font-bold leading-tight truncate">CNCI S&P</h1>
            <p className="text-[10px] text-white/60 leading-tight">Store & Purchase</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
        {sortedTabs.map((tab) => {
          if (!tab.visible) return null;
          if (adminOnlyTabs.has(tab.key) && !isAdmin) return null;
          const Icon = iconMap[tab.key] || LayoutDashboard;
          const to = routeMap[tab.key] || "/dashboard";
          return (
            <NavLink key={tab.key} to={to}
              className={({ isActive }) => cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200", isActive ? "bg-white/15 text-white shadow-inner" : "text-white/70 hover:bg-white/10 hover:text-white")}>
              <Icon className="size-[18px] shrink-0" />
              <span className="truncate">{tab.label}</span>
            </NavLink>
          );
        })}
        {isAdmin && (
          <NavLink to="/best-performers"
            className={({ isActive }) => cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200", isActive ? "bg-white/15 text-white shadow-inner" : "text-white/70 hover:bg-white/10 hover:text-white")}>
            <Trophy className="size-[18px] shrink-0" />
            <span className="truncate">Best Performers</span>
          </NavLink>
        )}
        <NavLink to="/profile"
          className={({ isActive }) => cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200", isActive ? "bg-white/15 text-white shadow-inner" : "text-white/70 hover:bg-white/10 hover:text-white")}>
          <UserCircle className="size-[18px] shrink-0" />
          <span className="truncate">My Profile</span>
        </NavLink>
      </nav>

      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          {currentUser?.photo ? (
            <img src={currentUser.photo} alt="" className="size-8 rounded-full object-cover shrink-0" />
          ) : (
            <div className="size-8 rounded-full gold-gradient flex items-center justify-center text-xs font-bold text-white shrink-0">
              {currentUser?.name?.charAt(0) || "?"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold truncate">{currentUser?.name}</p>
            <p className="text-[10px] text-white/50 truncate">{currentUser?.designation}</p>
          </div>
        </div>
        <button onClick={logout} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-red-300 hover:bg-red-500/20 transition-colors">
          <LogOut className="size-4" />Sign Out
        </button>
      </div>

      <div className="px-5 py-2 border-t border-white/10">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="size-3 text-emerald-400" />
          <span className="text-[10px] text-white/40">{currentUser?.role === "admin" ? "Administrator" : "Standard User"}</span>
        </div>
      </div>
    </aside>
  );
}
