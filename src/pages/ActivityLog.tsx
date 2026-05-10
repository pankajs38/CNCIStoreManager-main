import { useState, useMemo } from "react";
import { Search, Filter, Clock, User, FileText, Gavel, Settings2, ClipboardList, Trash2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { formatDateTime } from "@/lib/utils";

const moduleIcons: Record<string, typeof ClipboardList> = {
  task: ClipboardList,
  file: FileText,
  tender: Gavel,
  contract: FileText,
  settings: Settings2,
  auth: User,
  general: Clock,
};

const moduleColors: Record<string, string> = {
  task: "bg-blue-100 text-blue-700",
  file: "bg-amber-100 text-amber-700",
  tender: "bg-violet-100 text-violet-700",
  contract: "bg-teal-100 text-teal-700",
  settings: "bg-gray-100 text-gray-700",
  auth: "bg-rose-100 text-rose-700",
  general: "bg-gray-100 text-gray-600",
};

export default function ActivityLog() {
  const { currentUser, users } = useAuthStore();
  const { activityLog, clearActivityLog } = useSettingsStore();
  const isAdmin = currentUser?.role === "admin";

  const [filterModule, setFilterModule] = useState<string>("all");
  const [filterUser, setFilterUser] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const filtered = useMemo(() => {
    let result = [...activityLog];
    if (filterModule !== "all") result = result.filter((e) => e.module === filterModule);
    if (filterUser !== "all") result = result.filter((e) => e.userId === filterUser);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) => e.action.toLowerCase().includes(q) || e.details.toLowerCase().includes(q) || e.userName.toLowerCase().includes(q));
    }
    if (filterDateFrom) {
      const from = new Date(filterDateFrom);
      from.setHours(0, 0, 0, 0);
      result = result.filter((e) => new Date(e.timestamp) >= from);
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((e) => new Date(e.timestamp) <= to);
    }
    return result;
  }, [activityLog, filterModule, filterUser, searchQuery, filterDateFrom, filterDateTo]);

  const clearDateFilters = () => { setFilterDateFrom(""); setFilterDateTo(""); };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-display font-semibold">Activity Log</h2>
          <p className="text-xs text-muted-foreground">{activityLog.length} entries recorded | Showing: {filtered.length}</p>
        </div>
        {isAdmin && activityLog.length > 0 && (
          <Button variant="outline" size="sm" className="gap-1.5 text-xs text-red-600" onClick={() => { if (window.confirm("Clear all activity logs?")) clearActivityLog(); }} title="Permanently delete all activity log entries">
            <Trash2 className="size-3" /> Clear Log
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search actions, details, user names..." className="pl-9" />
        </div>
        <Select value={filterModule} onValueChange={setFilterModule}>
          <SelectTrigger className="w-36" title="Filter log entries by module"><Filter className="size-3.5 mr-1.5" /><SelectValue placeholder="All Modules" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            <SelectItem value="task">Tasks</SelectItem>
            <SelectItem value="file">Files</SelectItem>
            <SelectItem value="tender">Tenders</SelectItem>
            <SelectItem value="contract">Contracts</SelectItem>
            <SelectItem value="settings">Settings</SelectItem>
            <SelectItem value="auth">Auth</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterUser} onValueChange={setFilterUser}>
          <SelectTrigger className="w-40" title="Filter log entries by specific user"><SelectValue placeholder="All Users" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            {users.filter((u) => u.isActive).map((u) => <SelectItem key={u.id} value={u.id}>{u.name.split(" ")[0]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Date range filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <div>
          <Label className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="size-3" /> From Date</Label>
          <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="mt-1 h-9" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="size-3" /> To Date</Label>
          <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="mt-1 h-9" />
        </div>
        {(filterDateFrom || filterDateTo) && (
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-9" onClick={clearDateFilters}>Clear Dates</Button>
        )}
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-y-auto max-h-[65vh]">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">No activity logged yet. Actions will appear here as they happen.</div>
          ) : (
            <div className="divide-y">
              {filtered.map((entry) => {
                const Icon = moduleIcons[entry.module] || Clock;
                return (
                  <div key={entry.id} className="flex items-start gap-3 p-4 hover:bg-gray-50/50 transition-colors">
                    <div className={`p-2 rounded-lg shrink-0 ${moduleColors[entry.module] || "bg-gray-100"}`}>
                      <Icon className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-foreground">{entry.action}</p>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase ${moduleColors[entry.module]}`}>{entry.module}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{entry.details}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><User className="size-3" /> {entry.userName}</span>
                        <span className="flex items-center gap-1"><Clock className="size-3" /> {formatDateTime(entry.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
