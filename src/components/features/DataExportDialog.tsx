import { useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTaskStore } from "@/stores/taskStore";
import { useFileStore } from "@/stores/fileStore";
import { useTenderStore } from "@/stores/tenderStore";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";

type ExportType = "tasks" | "files" | "tenders" | "contracts" | "vendors" | "all";

export function DataExportDialog() {
  const [open, setOpen] = useState(false);
  const [campusFilter, setCampusFilter] = useState<string>("all");
  const { tasks, generalTasks } = useTaskStore();
  const { files } = useFileStore();
  const { tenders, contracts } = useTenderStore();
  const { getUserName } = useAuthStore();
  const { vendors } = useSettingsStore();

  const exportJSON = () => {
    const data = { tasks, generalTasks, files, tenders, contracts, vendors, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cnci_sp_backup_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = (type: ExportType) => {
    let csv = "";
    const cf = campusFilter;

    if (type === "tasks" || type === "all") {
      csv = "Title,Type,Assigned To,Status,Created,Due Date,File No\n";
      tasks.forEach((t) => { csv += `"${t.title}","${t.taskType}","${getUserName(t.assignedTo)}","${t.status}","${t.createdAt.split("T")[0]}","${t.dueDate || ""}","${t.fileNo || ""}"\n`; });
    }
    if (type === "files" || type === "all") {
      if (type === "all") csv += "\n--- FILES ---\n";
      csv += "File No,Campus,Subject,Supplier,Amount,PO No,PO Date,Created\n";
      const filtered = cf !== "all" ? files.filter((f) => f.campus === cf) : files;
      filtered.forEach((f) => { csv += `"${f.fullFileNo}","${f.campus === "N" ? "New Town" : "Hazra"}","${f.subject}","${f.supplierName}","${f.amount}","${f.poNo}","${f.poDate || ""}","${f.createdAt.split("T")[0]}"\n`; });
    }
    if (type === "tenders" || type === "all") {
      if (type === "all") csv += "\n--- TENDERS ---\n";
      csv += "File No,Subject,Campus,Stage,Indenter,Department,GeM PO,Manual PO,Created\n";
      const filtered = cf !== "all" ? tenders.filter((t) => t.campus === cf) : tenders;
      filtered.forEach((t) => { csv += `"${t.fullFileNo}","${t.subject}","${t.campus === "N" ? "New Town" : "Hazra"}","${t.currentStage}","${t.indenterName}","${t.indenterDept}","${t.gemPoNo || ""}","${t.manualPoNo || ""}","${t.createdAt.split("T")[0]}"\n`; });
    }
    if (type === "contracts" || type === "all") {
      if (type === "all") csv += "\n--- CONTRACTS ---\n";
      csv += "File No,Subject,Type,Awarded To,Start,End,Amount,Campus\n";
      const filtered = cf !== "all" ? contracts.filter((c) => c.campus === cf) : contracts;
      filtered.forEach((c) => { csv += `"${c.tenderFileNo}","${c.subject}","${c.type}","${c.awardedTo}","${c.startDate}","${c.endDate}","${c.price}","${c.campus === "N" ? "New Town" : "Hazra"}"\n`; });
    }
    if (type === "vendors") {
      csv = "Name,Address,Phone,GST No\n";
      vendors.forEach((v) => { csv += `"${v.name}","${v.address || ""}","${v.phone || ""}","${v.gstNo || ""}"\n`; });
    }

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cnci_${type}_${cf !== "all" ? cf + "_" : ""}${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2"><Download className="size-4" /> Export</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="font-display">Export Data</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">Campus Filter</Label>
            <Select value={campusFilter} onValueChange={setCampusFilter}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Campuses</SelectItem><SelectItem value="N">New Town</SelectItem><SelectItem value="H">Hazra</SelectItem></SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-semibold text-muted-foreground mb-2 block">Full Backup (JSON)</Label>
            <Button onClick={exportJSON} className="w-full gap-2 gold-gradient text-white border-0 hover:opacity-90"><FileText className="size-4" /> Complete Backup</Button>
          </div>
          <div>
            <Label className="text-sm font-semibold text-muted-foreground mb-2 block">Export as CSV (Excel-compatible)</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["tasks", "files", "tenders", "contracts", "vendors", "all"] as const).map((t) => (
                <Button key={t} variant="outline" size="sm" className="gap-1.5 capitalize text-xs" onClick={() => exportCSV(t)}>
                  <FileSpreadsheet className="size-3.5" /> {t}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
