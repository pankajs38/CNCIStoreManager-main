import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ClipboardList, FolderOpen, Gavel, FileStack, Plus, TrendingUp, AlertTriangle, ArrowRight, Users, Printer, Trophy, Star, Award, FileWarning, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import { useTaskStore } from "@/stores/taskStore";
import { useFileStore } from "@/stores/fileStore";
import { useTenderStore } from "@/stores/tenderStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useReminders } from "@/hooks/useReminders";
import { TaskSummaryBar } from "@/components/features/TaskSummaryBar";
import { TaskDueAlerts } from "@/components/features/TaskDueAlerts";
import { TenderStageBadge } from "@/components/features/StatusBadge";
import { initiateGoogleOAuth, isOAuthConfigured } from "@/lib/googleAuth";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function Dashboard() {
  const navigate = useNavigate();
  const { currentUser, users, accessToken, syncFromSheet, lastSynced, isLoading } = useAuthStore();
  const { tasks } = useTaskStore();
  const { files } = useFileStore();
  const { tenders, contracts } = useTenderStore();
  const { homeDashboardWidgets } = useSettingsStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [initialSyncDone, setInitialSyncDone] = useState(false);
  useReminders();

  // Auto-sync on mount if we have a token but no data loaded
  useEffect(() => {
    const doInitialSync = async () => {
      if (accessToken && users.length === 0 && !initialSyncDone && !isLoading) {
        console.log("Auto-syncing from Google Sheets on mount...");
        setInitialSyncDone(true);
        try {
          await syncFromSheet(accessToken);
        } catch (err) {
          console.error("Initial sync failed:", err);
        }
      }
    };
    doInitialSync();
  }, [accessToken, users.length, syncFromSheet, initialSyncDone, isLoading]);

  const activeUsers = useMemo(() => users.filter((u) => u.isActive), [users]);
  const userNamesList = activeUsers.map((u) => `${u.name} (${u.password})`).join(", ");

  // Debug: show all users in console
  console.log("Current users in store:", users);
  console.log("Active users:", activeUsers);
  console.log("Access token available:", !!accessToken);

  const handleSync = async () => {
    if (!accessToken && isOAuthConfigured()) {
      initiateGoogleOAuth();
      return;
    }
    if (accessToken) {
      setIsSyncing(true);
      try {
        await syncFromSheet(accessToken);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const myTasks = tasks.filter((t) => t.assignedTo === currentUser?.id);
  const activeTenders = tenders.filter((t) => !t.isCompleted);
  const expiringContracts = contracts
    .filter((c) => !c.isExpired)
    .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
    .slice(0, 5);

  const filesPendingPo = files.filter((f) => !f.poNo && !f.isCompleted && !f.isClosed && !f.isInvalid && !f.poReversed);

  const isAdmin = currentUser?.role === "admin";
  const showWidget = (key: string) => homeDashboardWidgets.includes(key);

  const handlePrint = () => window.print();

  const getEfficiency = (userId: string) => {
    const userTasks = tasks.filter((t) => t.assignedTo === userId);
    const completed = userTasks.filter((t) => t.status === "completed");
    if (userTasks.length === 0) return { pct: 0, avgDays: 0, total: 0, done: 0 };
    const pct = Math.round((completed.length / userTasks.length) * 100);
    let totalDays = 0;
    completed.forEach((t) => {
      const s = new Date(t.createdAt).getTime();
      const e = new Date(t.updatedAt).getTime();
      totalDays += (e - s) / (1000 * 60 * 60 * 24);
    });
    const avgDays = completed.length > 0 ? Math.round(totalDays / completed.length) : 0;
    return { pct, avgDays, total: userTasks.length, done: completed.length };
  };

  const topPerformers = useMemo(() => {
    const activeUsers = users.filter((u) => u.isActive && u.role !== "admin");
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const lastMonthStart = new Date(lastMonthYear, lastMonth, 1);
    const lastMonthEnd = new Date(lastMonthYear, lastMonth + 1, 0, 23, 59, 59);
    const lastMonthName = MONTH_NAMES[lastMonth];

    const weeklyScores = activeUsers.map((u) => {
      const completedThisWeek = tasks.filter((t) => t.assignedTo === u.id && t.status === "completed" && new Date(t.updatedAt) >= weekAgo);
      return { user: u, score: completedThisWeek.length, pct: getEfficiency(u.id).pct };
    }).sort((a, b) => b.score - a.score || b.pct - a.pct);

    const monthlyScores = activeUsers.map((u) => {
      const completedLastMonth = tasks.filter((t) => t.assignedTo === u.id && t.status === "completed" && new Date(t.updatedAt) >= lastMonthStart && new Date(t.updatedAt) <= lastMonthEnd);
      return { user: u, score: completedLastMonth.length, pct: getEfficiency(u.id).pct };
    }).sort((a, b) => b.score - a.score || b.pct - a.pct);

    return {
      weekly: weeklyScores[0]?.score > 0 ? weeklyScores[0] : null,
      monthly: monthlyScores[0]?.score > 0 ? monthlyScores[0] : null,
      lastMonthName,
    };
  }, [tasks, users]);

  const handleSummaryClick = (filter: string) => {
    navigate(`/tasks?status=${filter}`);
  };

  const getUserPhoto = (userId: string) => {
    const u = users.find((x) => x.id === userId);
    return u?.photo || "";
  };

  return (
    <div className="space-y-6 print-area">
      {/* Debug Info - Remove in production */}
      {(isLoading || isSyncing) && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
          <p className="font-bold">Syncing users from Google Sheets...</p>
        </div>
      )}
      {lastSynced && (
        <div className="text-xs text-muted-foreground">
          Last synced: {new Date(lastSynced).toLocaleString()} | Users: {users.length} | Active: {activeUsers.length}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Welcome, {currentUser?.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">{currentUser?.designation} — CNCI Store & Purchase</p>
        </div>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2">
                  <Users className="size-4" />
                  {activeUsers.length} Users
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-md">
                <p className="font-semibold mb-1">Active Users:</p>
                <p className="text-sm">{userNamesList || "No users loaded"}</p>
                <p className="text-xs text-muted mt-2">Debug: Check console for full user data</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button 
            size="sm" 
            variant="outline" 
            className="gap-2" 
            onClick={handleSync} 
            disabled={isSyncing}
            title={lastSynced ? `Last synced: ${new Date(lastSynced).toLocaleString()}` : "Sync users from Google Sheets"}
          >
            <RefreshCw className={`size-4 ${isSyncing ? "animate-spin" : ""}`} /> 
            {isSyncing ? "Syncing..." : "Sync Users"}
          </Button>
          <Button size="sm" variant="outline" className="gap-2" onClick={handlePrint} title="Print dashboard"><Printer className="size-4" /> Print</Button>
          <Link to="/tasks"><Button size="sm" className="gap-2 gold-gradient text-white border-0 hover:opacity-90"><Plus className="size-4" /> New Task</Button></Link>
          <Link to="/files"><Button size="sm" variant="outline" className="gap-2"><Plus className="size-4" /> New File</Button></Link>
        </div>
      </div>

      {/* Top Performer Cards */}
      {(topPerformers.weekly || topPerformers.monthly) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topPerformers.weekly && (
            <div className="flex items-center gap-4 p-5 rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50">
              {getUserPhoto(topPerformers.weekly.user.id) ? (
                <img src={getUserPhoto(topPerformers.weekly.user.id)} alt="" className="size-14 rounded-full object-cover border-3 border-amber-400 shadow-lg" />
              ) : (
                <div className="size-14 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shrink-0 shadow-lg">
                  <Trophy className="size-7 text-white" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-1"><Star className="size-3" /> Best Performer — This Week</p>
                <p className="text-lg font-bold text-foreground truncate mt-1">{topPerformers.weekly.user.name}</p>
                <p className="text-sm text-muted-foreground">{topPerformers.weekly.score} tasks completed • {topPerformers.weekly.pct}% efficiency</p>
              </div>
            </div>
          )}
          {topPerformers.monthly && (
            <div className="flex items-center gap-4 p-5 rounded-xl border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50">
              {getUserPhoto(topPerformers.monthly.user.id) ? (
                <img src={getUserPhoto(topPerformers.monthly.user.id)} alt="" className="size-14 rounded-full object-cover border-3 border-blue-400 shadow-lg" />
              ) : (
                <div className="size-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg">
                  <Award className="size-7 text-white" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide flex items-center gap-1"><Star className="size-3" /> Best Performer — {topPerformers.lastMonthName}</p>
                <p className="text-lg font-bold text-foreground truncate mt-1">{topPerformers.monthly.user.name}</p>
                <p className="text-sm text-muted-foreground">{topPerformers.monthly.score} tasks completed • {topPerformers.monthly.pct}% efficiency</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Task Due Date Alerts for Current User */}
      <TaskDueAlerts />

      {/* Task Summary Bar */}
      {showWidget("taskSummary") && (
        <TaskSummaryBar tasks={tasks} onFilterClick={handleSummaryClick} />
      )}

      {/* Quick Stats — full-width row */}
      {showWidget("quickStats") && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: Gavel, label: "Active Tenders", value: activeTenders.length, link: "/tenders", color: "text-violet-600", bg: "bg-violet-50" },
            { icon: FileWarning, label: "Pending PO", value: filesPendingPo.length, link: "/files?po=pending_po", color: "text-amber-600", bg: "bg-amber-50" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-xl border p-5 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(s.link)}
            >
              <div className={`inline-flex p-2.5 rounded-lg ${s.bg} mb-3`}>
                <s.icon className={`size-5 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold tabular-nums text-foreground">{s.value}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Two-column layout: Tenders + Contracts / Efficiency + Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Tenders */}
        {showWidget("activeTenders") && (
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-display font-semibold flex items-center gap-2"><Gavel className="size-5 text-gold" /> Active Tenders</h3>
              <Link to="/tenders" className="text-sm text-gold font-semibold flex items-center gap-1 hover:underline">View All <ArrowRight className="size-4" /></Link>
            </div>
            {activeTenders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No active tenders.</p>
            ) : (
              <div className="space-y-3">
                {activeTenders.slice(0, 6).map((t) => (
                  <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => navigate("/tenders")}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{t.subject}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.fullFileNo} • {t.campus === "N" ? "New Town" : "Hazra"}</p>
                    </div>
                    <TenderStageBadge stage={t.currentStage} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Expiring Contracts */}
        {showWidget("expiringContracts") && (
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-display font-semibold flex items-center gap-2"><AlertTriangle className="size-5 text-amber-500" /> Expiring Contracts</h3>
              <Link to="/contracts" className="text-sm text-gold font-semibold flex items-center gap-1 hover:underline">View All <ArrowRight className="size-4" /></Link>
            </div>
            {expiringContracts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No contracts nearing expiry.</p>
            ) : (
              <div className="space-y-3">
                {expiringContracts.map((c) => {
                  const daysLeft = Math.ceil((new Date(c.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={c.id} className="p-4 rounded-lg bg-amber-50/50 border border-amber-100 cursor-pointer hover:bg-amber-50 transition-colors" onClick={() => navigate("/contracts")}>
                      <p className="text-sm font-semibold text-foreground">{c.subject}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">{c.type} • {c.awardedTo}</span>
                        <span className={`text-sm font-bold tabular-nums ${daysLeft < 60 ? "text-red-600" : daysLeft < 120 ? "text-amber-600" : "text-green-600"}`}>{daysLeft} days left</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Efficiency + Recent Tasks — two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Efficiency */}
        {showWidget("avgDays") && (
          <div className="bg-white rounded-xl border p-6">
            <h3 className="text-base font-display font-semibold mb-4 flex items-center gap-2"><TrendingUp className="size-5 text-gold" /> User Efficiency</h3>
            <div className="space-y-4">
              {users.filter((u) => u.isActive && u.role !== "admin").map((u) => {
                const eff = getEfficiency(u.id);
                return (
                  <div key={u.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        {u.photo ? (
                          <img src={u.photo} alt="" className="size-7 rounded-full object-cover" />
                        ) : (
                          <div className="size-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">{u.name.charAt(0)}</div>
                        )}
                        <span className="text-sm text-foreground font-medium">{u.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{eff.done}/{eff.total} tasks</span>
                        <span className={`text-sm font-bold tabular-nums ${eff.pct >= 75 ? "text-emerald-600" : eff.pct >= 50 ? "text-amber-600" : "text-red-600"}`}>{eff.pct}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${eff.pct >= 75 ? "bg-emerald-500" : eff.pct >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${eff.pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Tasks */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-display font-semibold flex items-center gap-2"><ClipboardList className="size-5 text-gold" /> Recent Tasks</h3>
            <Link to="/tasks" className="text-sm text-gold font-semibold hover:underline">View All</Link>
          </div>
          <div className="space-y-3">
            {tasks.slice(0, 6).map((t) => (
              <div key={t.id} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
                <span className="text-xs font-mono text-gold bg-gold/10 px-2 py-1 rounded font-semibold">{t.taskNo}</span>
                <span className="text-sm text-foreground truncate flex-1">{t.title}</span>
                <span className={`text-xs font-semibold px-2 py-1 rounded ${t.status === "completed" ? "bg-emerald-100 text-emerald-700" : t.status === "assigned" ? "bg-gray-100 text-gray-600" : "bg-amber-100 text-amber-700"}`}>
                  {t.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
