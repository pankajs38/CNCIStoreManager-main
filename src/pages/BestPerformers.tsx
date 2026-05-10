import { useState, useMemo } from "react";
import { Trophy, Award, Star, Printer, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthStore } from "@/stores/authStore";
import { useTaskStore } from "@/stores/taskStore";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

interface PerformerRecord {
  userId: string;
  userName: string;
  designation: string;
  tasksCompleted: number;
  efficiency: number;
  avgDays: number;
  period: string;
  periodLabel: string;
}

export default function BestPerformers() {
  const { currentUser, users } = useAuthStore();
  const { tasks } = useTaskStore();
  const isAdmin = currentUser?.role === "admin";

  const [viewMode, setViewMode] = useState<"monthly" | "yearly">("monthly");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const getEfficiency = (userId: string, filteredTasks: typeof tasks) => {
    const userTasks = filteredTasks.filter((t) => t.assignedTo === userId);
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

  const records = useMemo(() => {
    const activeUsers = users.filter((u) => u.isActive && u.role !== "admin");
    const year = parseInt(selectedYear);
    const results: PerformerRecord[] = [];

    if (viewMode === "monthly") {
      for (let m = 0; m < 12; m++) {
        const start = new Date(year, m, 1);
        const end = new Date(year, m + 1, 0, 23, 59, 59);
        if (start > new Date()) break;

        const monthTasks = tasks.filter((t) => {
          const upd = new Date(t.updatedAt);
          return t.status === "completed" && upd >= start && upd <= end;
        });

        const scores = activeUsers.map((u) => {
          const completed = monthTasks.filter((t) => t.assignedTo === u.id).length;
          const eff = getEfficiency(u.id, tasks.filter((t) => { const upd = new Date(t.updatedAt); return upd >= start && upd <= end; }));
          return { user: u, score: completed, eff };
        }).sort((a, b) => b.score - a.score || b.eff.pct - a.eff.pct);

        if (scores[0]?.score > 0) {
          results.push({
            userId: scores[0].user.id,
            userName: scores[0].user.name,
            designation: scores[0].user.designation,
            tasksCompleted: scores[0].score,
            efficiency: scores[0].eff.pct,
            avgDays: scores[0].eff.avgDays,
            period: `${year}-${String(m + 1).padStart(2, "0")}`,
            periodLabel: `${MONTH_NAMES[m]} ${year}`,
          });
        }
      }
    } else {
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31, 23, 59, 59);
      const yearTasks = tasks.filter((t) => {
        const upd = new Date(t.updatedAt);
        return t.status === "completed" && upd >= start && upd <= end;
      });

      const scores = activeUsers.map((u) => {
        const completed = yearTasks.filter((t) => t.assignedTo === u.id).length;
        const eff = getEfficiency(u.id, tasks.filter((t) => { const upd = new Date(t.updatedAt); return upd >= start && upd <= end; }));
        return { user: u, score: completed, eff };
      }).sort((a, b) => b.score - a.score || b.eff.pct - a.eff.pct);

      if (scores[0]?.score > 0) {
        results.push({
          userId: scores[0].user.id,
          userName: scores[0].user.name,
          designation: scores[0].user.designation,
          tasksCompleted: scores[0].score,
          efficiency: scores[0].eff.pct,
          avgDays: scores[0].eff.avgDays,
          period: selectedYear,
          periodLabel: `Year ${selectedYear}`,
        });
      }
    }

    return results;
  }, [tasks, users, viewMode, selectedYear]);

  const handlePrint = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<html><head><title>Best Performers — CNCI S&P</title><style>body{font-family:sans-serif;padding:40px;max-width:800px;margin:0 auto}h1{font-size:20px;border-bottom:3px solid #c28a30;padding-bottom:10px;text-align:center}h2{font-size:16px;color:#1a2744;margin-top:24px}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{border:1px solid #ddd;padding:10px;text-align:left;font-size:14px}th{background:#f5f5f5}.trophy{color:#c28a30;font-size:18px}.header{text-align:center;margin-bottom:30px}.footer{text-align:center;margin-top:30px;font-size:12px;color:#999;border-top:1px solid #ddd;padding-top:10px}</style></head><body>`);
    win.document.write(`<div class="header"><h1>🏆 CNCI Store & Purchase — Best Performers</h1><p style="color:#666">${viewMode === "monthly" ? "Monthly" : "Yearly"} Report — ${selectedYear}</p><p style="font-size:12px;color:#999">For Notice Board Display</p></div>`);
    win.document.write(`<table><tr><th>Period</th><th>Best Performer</th><th>Designation</th><th>Tasks Completed</th><th>Efficiency</th><th>Avg Days</th></tr>`);
    records.forEach((r) => {
      win.document.write(`<tr><td><strong>${r.periodLabel}</strong></td><td class="trophy">⭐ ${r.userName}</td><td>${r.designation}</td><td style="text-align:center">${r.tasksCompleted}</td><td style="text-align:center">${r.efficiency}%</td><td style="text-align:center">${r.avgDays}</td></tr>`);
    });
    win.document.write(`</table>`);
    win.document.write(`<div class="footer">Generated on ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })} — CNCI Store & Purchase Department</div>`);
    win.document.write(`</body></html>`);
    win.document.close();
    win.print();
  };

  if (!isAdmin) {
    return (
      <div className="max-w-3xl">
        <div className="bg-white rounded-xl border p-6 text-center">
          <p className="text-muted-foreground">This page is accessible to administrators only.</p>
        </div>
      </div>
    );
  }

  const years = [];
  for (let y = 2024; y <= new Date().getFullYear() + 1; y++) years.push(y.toString());

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-display font-semibold flex items-center gap-2"><Trophy className="size-5 text-gold" /> Best Performers Record</h2>
          <p className="text-xs text-muted-foreground">Printable record for notice board display</p>
        </div>
        <div className="flex gap-2">
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as "monthly" | "yearly")}>
            <SelectTrigger className="w-32"><Calendar className="size-3.5 mr-1.5" /><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="yearly">Yearly</SelectItem></SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={handlePrint} title="Print for notice board"><Printer className="size-4" /> Print</Button>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center text-muted-foreground">No performance records found for the selected period.</div>
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <div key={r.period} className="bg-white rounded-xl border p-5 flex items-center gap-5">
              {(() => {
                const u = users.find((x) => x.id === r.userId);
                return u?.photo ? (
                  <img src={u.photo} alt="" className="size-14 rounded-full object-cover border-4 border-amber-300 shadow-lg shrink-0" />
                ) : (
                  <div className="size-14 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shrink-0 shadow-lg">
                    {viewMode === "monthly" ? <Award className="size-7 text-white" /> : <Trophy className="size-7 text-white" />}
                  </div>
                );
              })()}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gold uppercase tracking-wide flex items-center gap-1"><Star className="size-3" /> {r.periodLabel}</p>
                <p className="text-lg font-bold text-foreground">{r.userName}</p>
                <p className="text-xs text-muted-foreground">{r.designation}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-2xl font-bold text-gold tabular-nums">{r.tasksCompleted}</p>
                <p className="text-xs text-muted-foreground">tasks completed</p>
                <p className="text-xs font-semibold text-emerald-600">{r.efficiency}% efficiency</p>
                <p className="text-[10px] text-muted-foreground">Avg {r.avgDays} days</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
