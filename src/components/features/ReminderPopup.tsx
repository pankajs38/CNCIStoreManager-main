import { useState, useEffect } from "react";
import { Bell, X, AlertTriangle, Calendar, FileText, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReminders } from "@/hooks/useReminders";
import { useSettingsStore } from "@/stores/settingsStore";
import { cn, playNotificationSound } from "@/lib/utils";
import type { Reminder } from "@/types";

const iconMap: Record<string, typeof Bell> = {
  tender_opening: Calendar,
  demo: AlertTriangle,
  negotiation: ShieldAlert,
  contract_expiry: FileText,
  save_data: Bell,
  general: Bell,
};

export function ReminderPopup() {
  const reminders = useReminders();
  const { notificationSoundEnabled } = useSettingsStore();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);
  const [soundPlayed, setSoundPlayed] = useState(false);

  const activeReminders = reminders.filter((r) => !dismissed.has(r.id));

  useEffect(() => {
    if (activeReminders.length > 0) {
      setIsOpen(true);
      if (notificationSoundEnabled && !soundPlayed) {
        playNotificationSound();
        setSoundPlayed(true);
      }
    }
  }, [activeReminders.length, notificationSoundEnabled, soundPlayed]);

  if (activeReminders.length === 0) return null;

  const dismiss = (id: string) => setDismissed((prev) => new Set([...prev, id]));

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 gold-gradient text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-shadow"
        >
          <Bell className="size-5" />
          <span className="font-semibold text-sm">{activeReminders.length} Reminders</span>
        </button>
      )}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 max-h-[70vh] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 navy-gradient text-white">
            <div className="flex items-center gap-2"><Bell className="size-5" /><span className="font-semibold">Reminders ({activeReminders.length})</span></div>
            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded"><X className="size-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin">
            {activeReminders.map((r) => (
              <ReminderItem key={r.id} reminder={r} onDismiss={() => dismiss(r.id)} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function ReminderItem({ reminder, onDismiss }: { reminder: Reminder; onDismiss: () => void }) {
  const Icon = iconMap[reminder.type] || Bell;
  const typeColors: Record<string, string> = {
    tender_opening: "border-l-violet-500 bg-violet-50/50",
    demo: "border-l-orange-500 bg-orange-50/50",
    negotiation: "border-l-red-500 bg-red-50/50",
    contract_expiry: "border-l-amber-500 bg-amber-50/50",
    save_data: "border-l-blue-500 bg-blue-50/50",
    general: "border-l-gray-400 bg-gray-50/50",
  };

  return (
    <div className={cn("border-l-4 rounded-r-lg p-3 text-sm", typeColors[reminder.type] || "border-l-gray-400 bg-gray-50/50")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <Icon className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="font-semibold text-foreground text-pretty leading-snug">{reminder.title}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{reminder.message}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="shrink-0 h-7 w-7 p-0" onClick={onDismiss}><X className="size-3.5" /></Button>
      </div>
    </div>
  );
}
