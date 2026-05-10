import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Bell, Menu, Check, CheckCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReminders } from "@/hooks/useReminders";
import { useSettingsStore } from "@/stores/settingsStore";
import { DataExportDialog } from "@/components/features/DataExportDialog";
import { formatDateTime } from "@/lib/utils";

const titleMap: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/tasks": "Task Manager",
  "/files": "File Manager",
  "/tenders": "Tender Cases",
  "/contracts": "RC / AMC / CMC Tracker",
  "/settings": "Settings",
  "/customisation": "Customisation",
  "/activity": "Activity Log",
  "/profile": "My Profile",
};

interface TopBarProps {
  onToggleSidebar?: () => void;
}

export function TopBar({ onToggleSidebar }: TopBarProps) {
  const location = useLocation();
  const reminders = useReminders();
  const { notifications, markNotificationRead, markAllNotificationsRead, clearNotifications } = useSettingsStore();
  const title = titleMap[location.pathname] || "CNCI S&P Manager";
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-4 lg:px-6 shrink-0 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="lg:hidden p-2" onClick={onToggleSidebar}><Menu className="size-5" /></Button>
        <h2 className="text-lg font-display font-semibold text-foreground">{title}</h2>
      </div>
      <div className="flex items-center gap-2">
        <DataExportDialog />
        <div className="relative" ref={notifRef}>
          <Button variant="ghost" size="sm" className="relative p-2" onClick={() => setNotifOpen(!notifOpen)} title="View notifications and reminders">
            <Bell className="size-5" />
            {(reminders.length + unreadCount) > 0 && <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{reminders.length + unreadCount}</span>}
          </Button>
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border z-50 max-h-96 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
                <span className="text-xs font-semibold text-muted-foreground">Notifications ({notifications.length})</span>
                <div className="flex gap-1">
                  {unreadCount > 0 && <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={markAllNotificationsRead} title="Mark all notifications as read"><CheckCheck className="size-3" /></Button>}
                  {notifications.length > 0 && <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-red-500" onClick={clearNotifications} title="Clear all notifications"><Trash2 className="size-3" /></Button>}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No notifications.</p>
                ) : (
                  notifications.slice(0, 20).map((n) => (
                    <div key={n.id} className={`flex items-start gap-2 px-3 py-2 border-b hover:bg-gray-50 cursor-pointer ${!n.isRead ? "bg-blue-50/30" : ""}`} onClick={() => markNotificationRead(n.id)}>
                      <div className={`size-2 rounded-full mt-1.5 shrink-0 ${n.isRead ? "bg-gray-300" : "bg-blue-500"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground">{n.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{formatDateTime(n.timestamp)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
