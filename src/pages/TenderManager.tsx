
import { useState, useMemo } from "react";
import { Plus, Search, Filter, Eye, Pencil, CheckCircle, Package, Printer, Download, FileText as FileTextIcon, Calendar, Gavel, FileCheck, Calculator, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/stores/authStore";
import { useTenderStore } from "@/stores/tenderStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { TenderStageBadge } from "@/components/features/StatusBadge";
import { CAMPUS_OPTIONS, TENDER_CASE_TYPES, TENDER_FILE_CODES, TENDER_STAGE_CONFIG } from "@/constants/config";
import { formatDate, generateId } from "@/lib/utils";
import type { Campus, FileNumberCode, TenderCaseType, TenderStage, TenderAwardedItem } from "@/types";

const STAGE_ORDER: TenderStage[] = ["rfp_created", "published", "bid_closing", "tender_opening", "sample_demo", "tec_prepared", "tec_approval", "financial_bid", "l1_evaluation", "financial_approval", "negotiation", "po_issued", "completed"];

// Stage group filters
const STAGE_GROUP_FILTERS: { label: string; value: string; stages: TenderStage[] }[] = [
  { label: "Tendering Stage", value: "tendering", stages: ["rfp_created", "published", "bid_closing", "tender_opening", "sample_demo"] },
  { label: "TEC Stage", value: "tec", stages: ["tec_prepared", "tec_approval"] },
  { label: "Financial Evaluation", value: "financial", stages: ["financial_bid", "l1_evaluation", "financial_approval", "negotiation"] },
  { label: "Completed", value: "completed_group", stages: ["completed"] },
];

export default function TenderManager() {
  const { currentUser } = useAuthStore();
  const { tenders, addTender, updateTenderStage, completeTender, cancelTender, retender, updateTenderPoDetails, addTenderAwardedItems } = useTenderStore();
  const { addActivityLog, addNotification } = useSettingsStore();
  const canCreate = currentUser?.canCreateTender || currentUser?.role === "admin";

  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState<string | null>(null);
  const [updateOpen, setUpdateOpen] = useState<string | null>(null);
  const [poDetailOpen, setPoDetailOpen] = useState<string | null>(null);
  const [itemsOpen, setItemsOpen] = useState<string | null>(null);
  const [retenderOpen, setRetenderOpen] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState<string | null>(null);
  const [filterStage, setFilterStage] = useState<string>("all");
  const [filterStageGroup, setFilterStageGroup] = useState<string>("all");
  const [filterCampus, setFilterCampus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [ncCampus, setNcCampus] = useState<Campus>("N");
  const [ncCode, setNcCode] = useState<FileNumberCode>("282");
  const [ncType, setNcType] = useState<TenderCaseType>("PUR");
  const [ncName, setNcName] = useState("");
  const [ncSubject, setNcSubject] = useState("");
  const [ncIndenter, setNcIndenter] = useState("");
  const [ncDept, setNcDept] = useState("");

  const [updateStage, setUpdateStage] = useState<TenderStage>("rfp_created");
  const [updateNotes, setUpdateNotes] = useState("");
  const [updateData, setUpdateData] = useState<Record<string, string>>({});

  const [gemPoNo, setGemPoNo] = useState("");
  const [gemPoDate, setGemPoDate] = useState("");
  const [manualPoNo, setManualPoNo] = useState("");
  const [manualPoDate, setManualPoDate] = useState("");

  const [awardItems, setAwardItems] = useState<TenderAwardedItem[]>([]);
  const [aiName, setAiName] = useState("");
  const [aiQty, setAiQty] = useState("");
  const [aiUnit, setAiUnit] = useState("Nos");
  const [aiRate, setAiRate] = useState("");

  const [retenderConfirm, setRetenderConfirm] = useState("no");
  const [cancelConfirm, setCancelConfirm] = useState("no");

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Stats computations
  const tenderStats = useMemo(() => {
    const active = tenders.filter((t) => !t.isCompleted && t.currentStage !== "cancelled" && t.currentStage !== "retender");
    return {
      pendingPublish: active.filter((t) => t.currentStage === "rfp_created").length,
      bidOpening: active.filter((t) => ["published", "bid_closing", "tender_opening"].includes(t.currentStage)).length,
      tecStage: active.filter((t) => ["tec_prepared", "tec_approval", "sample_demo"].includes(t.currentStage)).length,
      financialStage: active.filter((t) => ["financial_bid", "l1_evaluation", "financial_approval", "negotiation"].includes(t.currentStage)).length,
      dueManualPo: tenders.filter((t) => t.currentStage === "po_issued" && !t.manualPoNo).length,
    };
  }, [tenders]);

  const handleStatClick = (group: string) => {
    setFilterStage("all");
    setFilterStageGroup(group);
  };

  const filteredTenders = useMemo(() => {
    let result = [...tenders];
    if (filterStage !== "all") result = result.filter((t) => t.currentStage === filterStage);
    if (filterStageGroup !== "all") {
      if (filterStageGroup === "pending_publish") {
        result = result.filter((t) => t.currentStage === "rfp_created");
      } else if (filterStageGroup === "bid_opening") {
        result = result.filter((t) => ["published", "bid_closing", "tender_opening"].includes(t.currentStage));
      } else if (filterStageGroup === "due_manual_po") {
        result = result.filter((t) => t.currentStage === "po_issued" && !t.manualPoNo);
      } else {
        const group = STAGE_GROUP_FILTERS.find((g) => g.value === filterStageGroup);
        if (group) result = result.filter((t) => group.stages.includes(t.currentStage));
      }
    }
    if (filterCampus !== "all") result = result.filter((t) => t.campus === filterCampus);
    if (dateFrom) result = result.filter((t) => t.createdAt.split("T")[0] >= dateFrom);
    if (dateTo) result = result.filter((t) => t.createdAt.split("T")[0] <= dateTo);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t) => t.subject.toLowerCase().includes(q) || t.fullFileNo.toLowerCase().includes(q) || t.indenterName?.toLowerCase().includes(q));
    }
    return result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [tenders, filterStage, filterStageGroup, filterCampus, searchQuery, dateFrom, dateTo]);

  const handleCreate = () => {
    if (!ncName || !ncSubject) return;
    const t = addTender({ campus: ncCampus, fileNumberCode: ncCode, tenderCaseType: ncType, userDefinedName: ncName, subject: ncSubject, indenterName: ncIndenter, indenterDept: ncDept, createdBy: currentUser!.id });
    addActivityLog({ userId: currentUser!.id, userName: currentUser!.name, action: "Created tender", module: "tender", details: `Subject: ${ncSubject}`, relatedId: t.id });
    addNotification({ title: "New Tender Created", message: `${ncSubject} (${ncCampus === "N" ? "New Town" : "Hazra"})`, module: "tender", relatedId: t.id });
    setCreateOpen(false);
    setNcName(""); setNcSubject(""); setNcIndenter(""); setNcDept("");
  };

  const openUpdate = (tenderId: string) => {
    const t = tenders.find((x) => x.id === tenderId);
    if (!t) return;
    const currentIdx = STAGE_ORDER.indexOf(t.currentStage);
    const nextStage = currentIdx < STAGE_ORDER.length - 1 ? STAGE_ORDER[currentIdx + 1] : t.currentStage;
    setUpdateStage(nextStage);
    setUpdateNotes("");
    setUpdateData({});
    setUpdateOpen(tenderId);
  };

  const handleUpdate = () => {
    if (!updateOpen) return;
    updateTenderStage(updateOpen, { stage: updateStage, date: new Date().toISOString().split("T")[0], updatedBy: currentUser!.id, data: updateData, notes: updateNotes });
    if (updateStage === "completed") {
      completeTender(updateOpen, updateData.awardedTo || "", parseFloat(updateData.awardedPrice || "0"), updateData.contractStart, updateData.contractEnd);
    }
    const tenderName = tenders.find((t) => t.id === updateOpen)?.subject || "";
    addActivityLog({ userId: currentUser!.id, userName: currentUser!.name, action: `Updated tender stage to ${TENDER_STAGE_CONFIG[updateStage]?.label}`, module: "tender", details: `Tender: ${tenderName}`, relatedId: updateOpen });
    addNotification({ title: "Tender Stage Updated", message: `${tenderName} → ${TENDER_STAGE_CONFIG[updateStage]?.label}`, module: "tender", relatedId: updateOpen });
    setUpdateOpen(null);
  };

  const handleRetender = () => {
    if (!retenderOpen || retenderConfirm !== "yes") return;
    retender(retenderOpen, currentUser!.id);
    const tenderName = tenders.find((t) => t.id === retenderOpen)?.subject || "";
    addActivityLog({ userId: currentUser!.id, userName: currentUser!.name, action: "Retender initiated", module: "tender", details: `Tender: ${tenderName}`, relatedId: retenderOpen });
    setRetenderOpen(null);
    setRetenderConfirm("no");
  };

  const handleCancel = () => {
    if (!cancelOpen || cancelConfirm !== "yes") return;
    cancelTender(cancelOpen, currentUser!.id);
    const tenderName = tenders.find((t) => t.id === cancelOpen)?.subject || "";
    addActivityLog({ userId: currentUser!.id, userName: currentUser!.name, action: "Tender cancelled", module: "tender", details: `Tender: ${tenderName}`, relatedId: cancelOpen });
    setCancelOpen(null);
    setCancelConfirm("no");
  };

  const openPoDetail = (tenderId: string) => {
    const t = tenders.find((x) => x.id === tenderId);
    if (!t) return;
    setGemPoNo(t.gemPoNo || ""); setGemPoDate(t.gemPoDate || ""); setManualPoNo(t.manualPoNo || ""); setManualPoDate(t.manualPoDate || "");
    setPoDetailOpen(tenderId);
  };

  const handleSavePoDetails = () => {
    if (!poDetailOpen) return;
    updateTenderPoDetails(poDetailOpen, { gemPoNo, gemPoDate, manualPoNo, manualPoDate });
    setPoDetailOpen(null);
  };

  const openItemsEntry = (tenderId: string) => {
    const t = tenders.find((x) => x.id === tenderId);
    if (!t) return;
    setAwardItems(t.awardedItems || []);
    setItemsOpen(tenderId);
  };

  const addAwardItem = () => {
    if (!aiName) return;
    const qty = parseFloat(aiQty) || 0;
    const rate = parseFloat(aiRate) || 0;
    setAwardItems([...awardItems, { id: generateId(), name: aiName, quantity: qty, unit: aiUnit, unitRate: rate, totalAmount: qty * rate }]);
    setAiName(""); setAiQty(""); setAiRate("");
  };

  const saveAwardItems = () => {
    if (!itemsOpen) return;
    addTenderAwardedItems(itemsOpen, awardItems);
    setItemsOpen(null);
  };

  // Combined Print
  const handlePrintTenders = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<html><head><title>Tender Report</title><style>body{font-family:sans-serif;padding:30px;max-width:1100px;margin:0 auto}h1{font-size:18px;border-bottom:2px solid #c28a30;padding-bottom:8px}table{width:100%;border-collapse:collapse;margin:16px 0;font-size:12px}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#f5f5f5}</style></head><body>`);
    win.document.write(`<h1>CNCI Store & Purchase — Tender Register</h1><p style="color:#666;font-size:13px">Generated: ${new Date().toLocaleDateString("en-IN")} | Total: ${filteredTenders.length}</p>`);
    win.document.write(`<table><tr><th>S.No</th><th>File No</th><th>Subject</th><th>Campus</th><th>Type</th><th>Indenter</th><th>Stage</th><th>Awarded To</th><th>Price</th></tr>`);
    filteredTenders.forEach((t, idx) => {
      win.document.write(`<tr><td>${idx + 1}</td><td>${t.fullFileNo}</td><td>${t.subject}</td><td>${t.campus === "N" ? "NT" : "H"}</td><td>${t.tenderCaseType}</td><td>${t.indenterName}</td><td>${TENDER_STAGE_CONFIG[t.currentStage]?.label || t.currentStage}</td><td>${t.awardedTo || "—"}</td><td>${t.awardedPrice ? "₹" + t.awardedPrice.toLocaleString("en-IN") : "—"}</td></tr>`);
    });
    win.document.write(`</table></body></html>`);
    win.document.close();
    win.print();
  };

  // Download CSV
  const handleDownloadCSV = () => {
    let csv = "S.No,File No,Subject,Campus,Type,Indenter,Department,Stage,Awarded To,Price,GeM PO,Manual PO,Created\n";
    filteredTenders.forEach((t, idx) => {
      csv += `"${idx + 1}","${t.fullFileNo}","${t.subject}","${t.campus === "N" ? "New Town" : "Hazra"}","${t.tenderCaseType}","${t.indenterName}","${t.indenterDept}","${TENDER_STAGE_CONFIG[t.currentStage]?.label || t.currentStage}","${t.awardedTo || ""}","${t.awardedPrice || ""}","${t.gemPoNo || ""}","${t.manualPoNo || ""}","${t.createdAt.split("T")[0]}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `cnci_tenders_${new Date().toISOString().split("T")[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // Download as Word-like HTML
  const handleDownloadWord = () => {
    let html = `<html><head><meta charset="utf-8"><style>body{font-family:Calibri,sans-serif;padding:30px}h1{font-size:18px;border-bottom:2px solid #c28a30;padding-bottom:8px}table{width:100%;border-collapse:collapse;margin:16px 0;font-size:12px}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#f5f5f5}</style></head><body>`;
    html += `<h1>CNCI Store & Purchase — Tender Register</h1><p>Generated: ${new Date().toLocaleDateString("en-IN")}</p>`;
    html += `<table><tr><th>S.No</th><th>File No</th><th>Subject</th><th>Campus</th><th>Type</th><th>Indenter</th><th>Stage</th><th>Awarded To</th><th>Price</th></tr>`;
    filteredTenders.forEach((t, idx) => {
      html += `<tr><td>${idx + 1}</td><td>${t.fullFileNo}</td><td>${t.subject}</td><td>${t.campus === "N" ? "NT" : "H"}</td><td>${t.tenderCaseType}</td><td>${t.indenterName}</td><td>${TENDER_STAGE_CONFIG[t.currentStage]?.label || t.currentStage}</td><td>${t.awardedTo || "—"}</td><td>${t.awardedPrice ? "₹" + t.awardedPrice.toLocaleString("en-IN") : "—"}</td></tr>`;
    });
    html += `</table></body></html>`;
    const blob = new Blob([html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `cnci_tenders_${new Date().toISOString().split("T")[0]}.doc`; a.click();
    URL.revokeObjectURL(url);
  };

  const detailTender = detailOpen ? tenders.find((t) => t.id === detailOpen) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-display font-semibold">Tender Cases</h2>
          <p className="text-xs text-muted-foreground">Active: {tenders.filter((t) => !t.isCompleted).length} | Completed: {tenders.filter((t) => t.isCompleted).length}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={handlePrintTenders} title="Print the filtered tender list"><Printer className="size-3.5" /> Print</Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={handleDownloadCSV} title="Download as CSV/Excel file"><Download className="size-3.5" /> Excel</Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={handleDownloadWord} title="Download as Word document"><FileTextIcon className="size-3.5" /> Word</Button>
          {canCreate && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild><Button size="sm" className="gap-1.5 gold-gradient text-white border-0 hover:opacity-90" title="Create a new tender case"><Plus className="size-4" /> New Tender</Button></DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle className="font-display">Create Tender Case</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div><Label>Campus</Label><Select value={ncCampus} onValueChange={(v) => setNcCampus(v as Campus)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{CAMPUS_OPTIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label>File Number</Label><Select value={ncCode} onValueChange={(v) => setNcCode(v as FileNumberCode)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{TENDER_FILE_CODES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label>Case Type</Label><Select value={ncType} onValueChange={(v) => setNcType(v as TenderCaseType)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{TENDER_CASE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label>Tender Name (ID)</Label><Input value={ncName} onChange={(e) => setNcName(e.target.value)} placeholder="e.g., MedGas-RC-2025" className="mt-1" /></div>
                  <div className="col-span-2"><Label>Subject</Label><Input value={ncSubject} onChange={(e) => setNcSubject(e.target.value)} placeholder="Tender subject" className="mt-1" /></div>
                  <div><Label>Indenter Name</Label><Input value={ncIndenter} onChange={(e) => setNcIndenter(e.target.value)} className="mt-1" /></div>
                  <div><Label>Indenting Dept</Label><Input value={ncDept} onChange={(e) => setNcDept(e.target.value)} className="mt-1" /></div>
                  <div className="col-span-2"><Button onClick={handleCreate} className="w-full gold-gradient text-white border-0">Create Tender</Button></div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Stats Boxes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        {[
          { icon: Gavel, label: "Pending Publish", value: tenderStats.pendingPublish, group: "pending_publish", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
          { icon: ClipboardCheck, label: "Bid Opening", value: tenderStats.bidOpening, group: "bid_opening", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
          { icon: FileCheck, label: "TEC Stage", value: tenderStats.tecStage, group: "tec", color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200" },
          { icon: Calculator, label: "Financial Eval", value: tenderStats.financialStage, group: "financial", color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200" },
          { icon: FileTextIcon, label: "Due Manual PO", value: tenderStats.dueManualPo, group: "due_manual_po", color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
        ].map((s) => (
          <button
            key={s.label}
            className={`${s.bg} border ${s.border} rounded-xl p-3 text-left hover:shadow-md transition-all cursor-pointer ${filterStageGroup === s.group ? "ring-2 ring-gold shadow-md" : ""}`}
            onClick={() => handleStatClick(filterStageGroup === s.group ? "all" : s.group)}
          >
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`size-4 ${s.color}`} />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{s.label}</span>
            </div>
            <p className={`text-xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:gap-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search tenders, file no, indenter..." className="pl-9" /></div>
          <Select value={filterStageGroup} onValueChange={(v) => { setFilterStageGroup(v); if (v !== "all") setFilterStage("all"); }}><SelectTrigger className="w-full sm:w-52" title="Filter by stage group"><Filter className="size-3.5 mr-1.5" /><SelectValue placeholder="All Stage Groups" /></SelectTrigger><SelectContent><SelectItem value="all">All Stage Groups</SelectItem><SelectItem value="pending_publish">Pending Publish</SelectItem><SelectItem value="bid_opening">Bid Opening</SelectItem>{STAGE_GROUP_FILTERS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}<SelectItem value="due_manual_po">Due Manual PO</SelectItem></SelectContent></Select>
          <Select value={filterStage} onValueChange={(v) => { setFilterStage(v); if (v !== "all") setFilterStageGroup("all"); }}><SelectTrigger className="w-full sm:w-48" title="Filter by specific stage"><SelectValue placeholder="All Stages" /></SelectTrigger><SelectContent><SelectItem value="all">All Stages</SelectItem>{Object.entries(TENDER_STAGE_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select>
          <Select value={filterCampus} onValueChange={setFilterCampus}><SelectTrigger className="w-full sm:w-36" title="Filter by campus"><SelectValue placeholder="All Campus" /></SelectTrigger><SelectContent><SelectItem value="all">All Campus</SelectItem><SelectItem value="N">New Town</SelectItem><SelectItem value="H">Hazra</SelectItem></SelectContent></Select>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Calendar className="size-4 text-muted-foreground" />
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-[130px] text-xs" placeholder="From" title="Filter from date" />
          <span className="text-muted-foreground text-xs">–</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 w-[130px] text-xs" placeholder="To" title="Filter to date" />
          {(dateFrom || dateTo) && <button className="text-xs text-red-500 hover:underline" onClick={() => { setDateFrom(""); setDateTo(""); }}>Clear</button>}
        </div>
      </div>
      <div className="space-y-3">
        {filteredTenders.map((tender, idx) => (
          <div key={tender.id} className={`bg-white rounded-xl border p-4 hover:shadow-md transition-shadow ${tender.isCompleted && tender.currentStage === "completed" ? "border-emerald-300 bg-emerald-50/30" : ""} ${tender.currentStage === "cancelled" ? "opacity-60" : ""}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-semibold text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded tabular-nums">{idx + 1}</span>
                  <h3 className="font-semibold text-foreground">{tender.subject}</h3>
                  <TenderStageBadge stage={tender.currentStage} />
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${tender.campus === "N" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>{tender.campus === "N" ? "New Town" : "Hazra"}</span>
                </div>
                <p className="text-xs font-mono text-muted-foreground mt-1">{tender.fullFileNo}</p>
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                  <span>Indenter: {tender.indenterName}</span>
                  <span>Dept: {tender.indenterDept}</span>
                  {tender.awardedTo && <span className="text-emerald-700 font-medium">Awarded to: {tender.awardedTo} (₹{tender.awardedPrice?.toLocaleString("en-IN")})</span>}
                  {tender.gemPoNo && <span className="text-blue-600 font-medium">GeM PO: {tender.gemPoNo}</span>}
                  {tender.manualPoNo && <span className="text-violet-600 font-medium">Manual PO: {tender.manualPoNo}</span>}
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0 flex-wrap">
                <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => setDetailOpen(tender.id)} title="View full tender details"><Eye className="size-3.5" /> View</Button>
                {tender.isCompleted && tender.currentStage === "completed" && (
                  <>
                    <Button variant="outline" size="sm" className="h-8 gap-1 text-xs text-blue-600" onClick={() => openPoDetail(tender.id)} title="Add/Edit PO numbers"><Pencil className="size-3.5" /> PO</Button>
                    <Button variant="outline" size="sm" className="h-8 gap-1 text-xs text-violet-600" onClick={() => openItemsEntry(tender.id)} title="Enter awarded items"><Package className="size-3.5" /> Items</Button>
                  </>
                )}
                {!tender.isCompleted && (
                  <>
                    <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => openUpdate(tender.id)} title="Advance tender stage"><Pencil className="size-3.5" /> Update</Button>
                    <Button variant="outline" size="sm" className="h-8 gap-1 text-xs text-red-600" onClick={() => { setCancelOpen(tender.id); setCancelConfirm("no"); }} title="Cancel tender">Cancel</Button>
                    <Button variant="outline" size="sm" className="h-8 gap-1 text-xs text-amber-600" onClick={() => { setRetenderOpen(tender.id); setRetenderConfirm("no"); }} title="Retender">Retender</Button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {filteredTenders.length === 0 && <div className="text-center py-16 text-muted-foreground bg-white rounded-xl border">No tenders found.</div>}
      </div>


      {/* Retender Confirmation */}
      <Dialog open={!!retenderOpen} onOpenChange={() => setRetenderOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Confirm Retender</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to initiate retender?</p>
          <Select value={retenderConfirm} onValueChange={setRetenderConfirm}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="no">No</SelectItem><SelectItem value="yes">Yes — Proceed</SelectItem></SelectContent></Select>
          <Button onClick={handleRetender} disabled={retenderConfirm !== "yes"} className="w-full mt-3 gold-gradient text-white border-0">Confirm Retender</Button>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <Dialog open={!!cancelOpen} onOpenChange={() => setCancelOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Confirm Cancel</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This cannot be undone.</p>
          <Select value={cancelConfirm} onValueChange={setCancelConfirm}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="no">No</SelectItem><SelectItem value="yes">Yes — Cancel Tender</SelectItem></SelectContent></Select>
          <Button onClick={handleCancel} disabled={cancelConfirm !== "yes"} className="w-full mt-3 bg-red-600 text-white border-0 hover:bg-red-700">Cancel Tender</Button>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailOpen} onOpenChange={() => setDetailOpen(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Tender Details</DialogTitle></DialogHeader>
          {detailTender && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">File No:</span><p className="font-mono font-semibold">{detailTender.fullFileNo}</p></div>
                <div><span className="text-muted-foreground">Subject:</span><p className="font-semibold">{detailTender.subject}</p></div>
                <div><span className="text-muted-foreground">Indenter:</span><p>{detailTender.indenterName}</p></div>
                <div><span className="text-muted-foreground">Department:</span><p>{detailTender.indenterDept}</p></div>
                <div><span className="text-muted-foreground">Campus:</span><p>{detailTender.campus === "N" ? "New Town" : "Hazra"}</p></div>
                <div><span className="text-muted-foreground">Stage:</span><TenderStageBadge stage={detailTender.currentStage} /></div>
                {detailTender.gemPoNo && <div><span className="text-muted-foreground">GeM PO:</span><p className="font-mono font-semibold text-blue-700">{detailTender.gemPoNo} ({detailTender.gemPoDate})</p></div>}
                {detailTender.manualPoNo && <div><span className="text-muted-foreground">Manual PO:</span><p className="font-mono font-semibold text-violet-700">{detailTender.manualPoNo} ({detailTender.manualPoDate})</p></div>}
              </div>
              {detailTender.awardedItems && detailTender.awardedItems.length > 0 && (
                <div><h4 className="font-semibold mb-2 text-sm">Awarded Items</h4>
                  <table className="w-full text-xs border rounded"><thead><tr className="bg-gray-50 border-b"><th className="px-2 py-1 text-left">Item</th><th className="px-2 py-1 text-left">Qty</th><th className="px-2 py-1 text-right">Rate</th><th className="px-2 py-1 text-right">Total</th></tr></thead>
                    <tbody>{detailTender.awardedItems.map((ai) => (<tr key={ai.id} className="border-b"><td className="px-2 py-1">{ai.name}</td><td className="px-2 py-1">{ai.quantity} {ai.unit}</td><td className="px-2 py-1 text-right">₹{ai.unitRate.toLocaleString("en-IN")}</td><td className="px-2 py-1 text-right font-medium">₹{ai.totalAmount.toLocaleString("en-IN")}</td></tr>))}</tbody>
                  </table>
                </div>
              )}
              <div><h4 className="font-semibold mb-3">Stage History</h4>
                <div className="space-y-3">{detailTender.stages.map((s, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="size-8 rounded-full bg-gold/10 flex items-center justify-center shrink-0 mt-0.5"><CheckCircle className="size-4 text-gold" /></div>
                    <div className="flex-1 min-w-0 pb-3 border-b border-gray-100">
                      <div className="flex items-center gap-2"><TenderStageBadge stage={s.stage} /><span className="text-xs text-muted-foreground tabular-nums">{formatDate(s.date)}</span></div>
                      {Object.entries(s.data).length > 0 && <div className="mt-1.5 text-xs text-muted-foreground space-y-0.5">{Object.entries(s.data).map(([k, v]) => <p key={k}><span className="font-medium capitalize">{k.replace(/([A-Z])/g, " $1").trim()}:</span> {String(v)}</p>)}</div>}
                      {s.notes && <p className="text-xs text-blue-600 mt-1 italic">{s.notes}</p>}
                    </div>
                  </div>
                ))}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Stage Dialog */}
      <Dialog open={!!updateOpen} onOpenChange={() => setUpdateOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Update Tender Stage</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div><Label>Next Stage</Label><Select value={updateStage} onValueChange={(v) => setUpdateStage(v as TenderStage)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{STAGE_ORDER.map((s) => <SelectItem key={s} value={s}>{TENDER_STAGE_CONFIG[s]?.label || s}</SelectItem>)}</SelectContent></Select></div>
            {updateStage === "published" && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Platform</Label><Input value={updateData.platform || ""} onChange={(e) => setUpdateData({ ...updateData, platform: e.target.value })} placeholder="GeM / CPPP" className="mt-1" /></div>
                <div><Label className="text-xs">Bid No</Label><Input value={updateData.bidNo || ""} onChange={(e) => setUpdateData({ ...updateData, bidNo: e.target.value })} className="mt-1" /></div>
                <div className="col-span-2"><Label className="text-xs">Closing Date</Label><Input type="date" value={updateData.closingDate || ""} onChange={(e) => setUpdateData({ ...updateData, closingDate: e.target.value })} className="mt-1" /></div>
              </div>
            )}
            {updateStage === "tender_opening" && <div><Label className="text-xs">No. of Bids Received</Label><Input type="number" value={updateData.bidsReceived || ""} onChange={(e) => setUpdateData({ ...updateData, bidsReceived: e.target.value })} className="mt-1" /></div>}
            {updateStage === "sample_demo" && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Demo Called On</Label><Input type="date" value={updateData.demoCalled || ""} onChange={(e) => setUpdateData({ ...updateData, demoCalled: e.target.value })} className="mt-1" /></div>
                <div><Label className="text-xs">Demo Date</Label><Input type="date" value={updateData.demoDate || ""} onChange={(e) => setUpdateData({ ...updateData, demoDate: e.target.value })} className="mt-1" /></div>
              </div>
            )}
            {updateStage === "l1_evaluation" && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">L1 Firm</Label><Input value={updateData.l1Firm || ""} onChange={(e) => setUpdateData({ ...updateData, l1Firm: e.target.value })} className="mt-1" /></div>
                <div><Label className="text-xs">L1 Price (with GST)</Label><Input type="number" value={updateData.l1PriceWithGST || ""} onChange={(e) => setUpdateData({ ...updateData, l1PriceWithGST: e.target.value })} className="mt-1" /></div>
                <div><Label className="text-xs">L1 Price (without GST)</Label><Input type="number" value={updateData.l1PriceWithoutGST || ""} onChange={(e) => setUpdateData({ ...updateData, l1PriceWithoutGST: e.target.value })} className="mt-1" /></div>
                <div><Label className="text-xs">Warranty Period</Label><Input value={updateData.warrantyPeriod || ""} onChange={(e) => setUpdateData({ ...updateData, warrantyPeriod: e.target.value })} className="mt-1" /></div>
              </div>
            )}
            {updateStage === "negotiation" && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Negotiation Date</Label><Input type="date" value={updateData.negotiationDate || ""} onChange={(e) => setUpdateData({ ...updateData, negotiationDate: e.target.value })} className="mt-1" /></div>
                <div><Label className="text-xs">Email Forwarded?</Label><Select value={updateData.emailFwd || "yes"} onValueChange={(v) => setUpdateData({ ...updateData, emailFwd: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent></Select></div>
              </div>
            )}
            {updateStage === "po_issued" && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">GeM PO No</Label><Input value={updateData.gemPONo || ""} onChange={(e) => setUpdateData({ ...updateData, gemPONo: e.target.value })} className="mt-1" /></div>
                <div><Label className="text-xs">GeM PO Date</Label><Input type="date" value={updateData.gemPODate || ""} onChange={(e) => setUpdateData({ ...updateData, gemPODate: e.target.value })} className="mt-1" /></div>
                <div><Label className="text-xs">Manual PO No</Label><Input value={updateData.manualPONo || ""} onChange={(e) => setUpdateData({ ...updateData, manualPONo: e.target.value })} className="mt-1" /></div>
                <div><Label className="text-xs">Manual PO Date</Label><Input type="date" value={updateData.manualPODate || ""} onChange={(e) => setUpdateData({ ...updateData, manualPODate: e.target.value })} className="mt-1" /></div>
              </div>
            )}
            {updateStage === "completed" && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Awarded To</Label><Input value={updateData.awardedTo || ""} onChange={(e) => setUpdateData({ ...updateData, awardedTo: e.target.value })} className="mt-1" /></div>
                <div><Label className="text-xs">Awarded Price</Label><Input type="number" value={updateData.awardedPrice || ""} onChange={(e) => setUpdateData({ ...updateData, awardedPrice: e.target.value })} className="mt-1" /></div>
                <div><Label className="text-xs">Contract Start</Label><Input type="date" value={updateData.contractStart || ""} onChange={(e) => setUpdateData({ ...updateData, contractStart: e.target.value })} className="mt-1" /></div>
                <div><Label className="text-xs">Contract End</Label><Input type="date" value={updateData.contractEnd || ""} onChange={(e) => setUpdateData({ ...updateData, contractEnd: e.target.value })} className="mt-1" /></div>
              </div>
            )}
            <div><Label>Notes</Label><Textarea value={updateNotes} onChange={(e) => setUpdateNotes(e.target.value)} placeholder="Additional notes..." className="mt-1" rows={2} /></div>
            <Button onClick={handleUpdate} className="w-full gold-gradient text-white border-0">Update Stage</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* PO Details Dialog */}
      <Dialog open={!!poDetailOpen} onOpenChange={() => setPoDetailOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">GeM & Manual PO Details</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div><Label>GeM PO No</Label><Input value={gemPoNo} onChange={(e) => setGemPoNo(e.target.value)} className="mt-1" /></div>
            <div><Label>GeM PO Date</Label><Input type="date" value={gemPoDate} onChange={(e) => setGemPoDate(e.target.value)} className="mt-1" /></div>
            <div><Label>Manual PO No</Label><Input value={manualPoNo} onChange={(e) => setManualPoNo(e.target.value)} className="mt-1" /></div>
            <div><Label>Manual PO Date</Label><Input type="date" value={manualPoDate} onChange={(e) => setManualPoDate(e.target.value)} className="mt-1" /></div>
            <div className="col-span-2"><Button onClick={handleSavePoDetails} className="w-full gold-gradient text-white border-0">Save PO Details</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Awarded Items Dialog */}
      <Dialog open={!!itemsOpen} onOpenChange={() => setItemsOpen(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle className="font-display">Awarded Items & Rates (Optional)</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            {awardItems.length > 0 && (
              <table className="w-full text-xs border rounded overflow-hidden">
                <thead><tr className="bg-gray-50 border-b"><th className="px-2 py-1.5 text-left">Item</th><th className="px-2 py-1.5">Qty</th><th className="px-2 py-1.5 text-right">Rate</th><th className="px-2 py-1.5 text-right">Total</th><th className="w-6"></th></tr></thead>
                <tbody>{awardItems.map((ai, idx) => (
                  <tr key={ai.id} className="border-b"><td className="px-2 py-1.5">{ai.name}</td><td className="px-2 py-1.5 text-center">{ai.quantity} {ai.unit}</td><td className="px-2 py-1.5 text-right">₹{ai.unitRate.toLocaleString("en-IN")}</td><td className="px-2 py-1.5 text-right font-medium">₹{ai.totalAmount.toLocaleString("en-IN")}</td><td><button onClick={() => setAwardItems(awardItems.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600">×</button></td></tr>
                ))}</tbody>
              </table>
            )}
            <div className="grid grid-cols-5 gap-2 items-end">
              <div className="col-span-2"><Label className="text-xs">Item Name</Label><Input value={aiName} onChange={(e) => setAiName(e.target.value)} className="mt-1 h-8 text-xs" /></div>
              <div><Label className="text-xs">Qty</Label><Input type="number" value={aiQty} onChange={(e) => setAiQty(e.target.value)} className="mt-1 h-8 text-xs" /></div>
              <div><Label className="text-xs">Rate (₹)</Label><Input type="number" value={aiRate} onChange={(e) => setAiRate(e.target.value)} className="mt-1 h-8 text-xs" /></div>
              <Button size="sm" onClick={addAwardItem} className="h-8 gold-gradient text-white border-0 text-xs">Add</Button>
            </div>
            <Button onClick={saveAwardItems} className="w-full gold-gradient text-white border-0">Save Items</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
