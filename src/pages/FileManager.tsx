import { useState, useMemo } from "react";
import { Plus, Search, Filter, FolderPlus, Lock, Unlock, Package, Pencil, CheckCircle2, FileText, RotateCcw, Printer, AlertTriangle, XCircle, Link2, Calendar, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuthStore } from "@/stores/authStore";
import { useFileStore } from "@/stores/fileStore";
import { useTaskStore } from "@/stores/taskStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { FILE_NUMBER_MAP, CAMPUS_OPTIONS } from "@/constants/config";
import { formatDate } from "@/lib/utils";
import type { Campus, FileNumberCode, CaseType } from "@/types";

export default function FileManager() {
  const { currentUser, getUserName } = useAuthStore();
  const { files, addFile, updateFile, addFileItem, removeFileItem, insertFileBetween, lockFile, unlockFile, markFileCompleted, editPoNo: storeEditPoNo, canCreatePo, reversePo, closeFile, invalidateFile, createFileFromTasks, markDataScanned, unmarkDataScanned } = useFileStore();
  const { tasks } = useTaskStore();
  const { vendors, addVendor, addActivityLog, addNotification } = useSettingsStore();
  const isAdmin = currentUser?.role === "admin";
  const canScan = currentUser?.canScanData || isAdmin;

  const [createOpen, setCreateOpen] = useState(false);
  const [createFromTaskOpen, setCreateFromTaskOpen] = useState(false);
  const [editOpen, setEditOpen] = useState<string | null>(null);
  const [insertOpen, setInsertOpen] = useState<string | null>(null);
  const [itemOpen, setItemOpen] = useState<string | null>(null);
  const [poEditOpen, setPoEditOpen] = useState<string | null>(null);
  const [poConfirmOpen, setPoConfirmOpen] = useState<string | null>(null);
  const [poConfirmed, setPoConfirmed] = useState(false);
  const [reverseOpen, setReverseOpen] = useState<string | null>(null);
  const [reverseReason, setReverseReason] = useState("");
  const [closeOpen, setCloseOpen] = useState<string | null>(null);
  const [closeReason, setCloseReason] = useState("");
  const [closeType, setCloseType] = useState<"close" | "invalid">("close");

  const [filterCode, setFilterCode] = useState<string>("all");
  const [filterCampus, setFilterCampus] = useState<string>("all");
  const poParam = new URLSearchParams(window.location.search).get("po") || "";
  const [filterPo, setFilterPo] = useState<string>(poParam === "pending_po" ? "without_po" : "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [ncCampus, setNcCampus] = useState<Campus>("N");
  const [ncCode, setNcCode] = useState<FileNumberCode>("281");
  const [ncType, setNcType] = useState<CaseType>("PUR");
  const [ncSubject, setNcSubject] = useState("");

  // Create from task state
  const [taskNoInput, setTaskNoInput] = useState("");
  const [selectedTaskNos, setSelectedTaskNos] = useState<string[]>([]);
  const [ftCampus, setFtCampus] = useState<Campus>("N");
  const [ftCode, setFtCode] = useState<FileNumberCode>("281");
  const [ftType, setFtType] = useState<CaseType>("PUR");

  const [editSupplier, setEditSupplier] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editPoDate, setEditPoDate] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [supplierSearch, setSupplierSearch] = useState("");

  const [niName, setNiName] = useState("");
  const [niQty, setNiQty] = useState("");
  const [niUnit, setNiUnit] = useState("Nos");
  const [niPrice, setNiPrice] = useState("");

  const [poNewNo, setPoNewNo] = useState("");
  const [poJustification, setPoJustification] = useState("");

  const caseTypesForCode: Record<string, CaseType[]> = { "281": ["PUR"], "282": ["RC", "STE", "PAC"], "283": ["PUR"], "362": ["PUR"], "299": ["PUR"] };

  const filteredVendors = useMemo(() => {
    if (!supplierSearch) return vendors.slice(0, 10);
    const q = supplierSearch.toLowerCase();
    return vendors.filter((v) => v.name.toLowerCase().includes(q) || v.firmName?.toLowerCase().includes(q)).slice(0, 10);
  }, [vendors, supplierSearch]);

  const filteredFiles = useMemo(() => {
    let result = files;
    if (filterCode !== "all") result = result.filter((f) => f.fileNumberCode === filterCode);
    if (filterCampus !== "all") result = result.filter((f) => f.campus === filterCampus);
    if (filterPo === "with_po") result = result.filter((f) => f.poNo && !f.poReversed);
    else if (filterPo === "without_po") result = result.filter((f) => !f.poNo || f.poReversed);
    else if (filterPo === "reversed") result = result.filter((f) => f.poReversed);
    else if (filterPo === "closed") result = result.filter((f) => f.isClosed || f.isInvalid);
    if (dateFrom) result = result.filter((f) => f.createdAt.split("T")[0] >= dateFrom);
    if (dateTo) result = result.filter((f) => f.createdAt.split("T")[0] <= dateTo);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((f) => f.fullFileNo.toLowerCase().includes(q) || f.subject?.toLowerCase().includes(q) || f.supplierName?.toLowerCase().includes(q) || f.poNo?.toLowerCase().includes(q));
    }
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [files, filterCode, filterCampus, filterPo, searchQuery, dateFrom, dateTo]);

  const handleCreate = () => {
    if (!ncCampus || !ncCode || !ncType) return;
    const f = addFile({ campus: ncCampus, fileNumberCode: ncCode, caseType: ncType, subject: ncSubject, createdBy: currentUser!.id });
    addActivityLog({ userId: currentUser!.id, userName: currentUser!.name, action: "Created file", module: "file", details: `File: ${f.fullFileNo}`, relatedId: f.id });
    addNotification({ title: "New File Created", message: `File: ${f.fullFileNo}`, module: "file", relatedId: f.id });
    setCreateOpen(false); setNcSubject("");
  };

  const addTaskNoToList = () => {
    const no = taskNoInput.trim().toUpperCase();
    if (!no) return;
    const task = tasks.find((t) => t.taskNo === no);
    if (!task) { alert(`Task ${no} not found`); return; }
    if (selectedTaskNos.includes(no)) return;
    setSelectedTaskNos((prev) => [...prev, no]);
    setTaskNoInput("");
  };

  const handleCreateFromTasks = () => {
    const selTasks = tasks.filter((t) => selectedTaskNos.includes(t.taskNo));
    if (selTasks.length === 0) return;
    const file = createFileFromTasks({ campus: ftCampus, fileNumberCode: ftCode, caseType: ftType, createdBy: currentUser!.id, tasks: selTasks });
    selTasks.forEach((t) => {
      const { linkTaskToFile } = useTaskStore.getState();
      linkTaskToFile(t.id, file.id);
    });
    addActivityLog({ userId: currentUser!.id, userName: currentUser!.name, action: "Created file from tasks", module: "file", details: `File: ${file.fullFileNo}, Tasks: ${selectedTaskNos.join(", ")}`, relatedId: file.id });
    addNotification({ title: "File Created from Tasks", message: `${file.fullFileNo} — ${selectedTaskNos.join(", ")}`, module: "file", relatedId: file.id });
    setCreateFromTaskOpen(false); setSelectedTaskNos([]); setTaskNoInput("");
  };

  const openEdit = (fileId: string) => {
    const f = files.find((x) => x.id === fileId);
    if (!f) return;
    setEditSupplier(f.supplierName || ""); setSupplierSearch(f.supplierName || ""); setEditAmount(f.amount?.toString() || ""); setEditPoDate(f.poDate || ""); setEditSubject(f.subject || ""); setEditOpen(fileId);
  };

  const handleEdit = () => {
    if (!editOpen) return;
    const file = files.find((f) => f.id === editOpen);
    if (file?.isLocked && !isAdmin) return;
    updateFile(editOpen, { supplierName: editSupplier, amount: parseFloat(editAmount) || 0, poDate: editPoDate, subject: editSubject });
    if (editSupplier && !vendors.find((v) => v.name.toLowerCase() === editSupplier.toLowerCase())) {
      addVendor({ id: `v${Date.now()}`, name: editSupplier, firmName: editSupplier, addedBy: currentUser!.id, addedAt: new Date().toISOString() });
    }
    addActivityLog({ userId: currentUser!.id, userName: currentUser!.name, action: "Updated file", module: "file", details: `File: ${file?.fullFileNo}`, relatedId: editOpen });
    setEditOpen(null);
  };

  const handlePoConfirm = (fileId: string) => { setPoConfirmOpen(fileId); setPoConfirmed(false); };

  const handleMarkComplete = () => {
    if (!poConfirmOpen || !poConfirmed) return;
    markFileCompleted(poConfirmOpen, currentUser!.id);
    const file = files.find((f) => f.id === poConfirmOpen);
    addActivityLog({ userId: currentUser!.id, userName: currentUser!.name, action: "Marked file complete & auto-assigned PO", module: "file", details: `File: ${file?.fullFileNo}`, relatedId: poConfirmOpen });
    addNotification({ title: "PO Assigned", message: `File: ${file?.fullFileNo}`, module: "file", relatedId: poConfirmOpen });
    setPoConfirmOpen(null); setPoConfirmed(false);
  };

  const handleReversePo = () => {
    if (!reverseOpen || !reverseReason) return;
    const file = files.find((f) => f.id === reverseOpen);
    reversePo(reverseOpen, reverseReason, currentUser!.id);
    addActivityLog({ userId: currentUser!.id, userName: currentUser!.name, action: "Reversed PO", module: "file", details: `File: ${file?.fullFileNo}, Reason: ${reverseReason}`, relatedId: reverseOpen });
    setReverseOpen(null); setReverseReason("");
  };

  const handleEditPo = () => {
    if (!poEditOpen || !poNewNo || !poJustification) return;
    storeEditPoNo(poEditOpen, poNewNo, poJustification);
    addActivityLog({ userId: currentUser!.id, userName: currentUser!.name, action: "Edited PO number", module: "file", details: `New PO: ${poNewNo}, Justification: ${poJustification}`, relatedId: poEditOpen });
    setPoEditOpen(null); setPoNewNo(""); setPoJustification("");
  };

  const handleAddItem = () => {
    if (!itemOpen || !niName) return;
    const qty = parseFloat(niQty) || 0;
    const price = parseFloat(niPrice) || 0;
    addFileItem(itemOpen, { name: niName, quantity: qty, unit: niUnit, unitPrice: price, totalPrice: qty * price });
    setNiName(""); setNiQty(""); setNiPrice("");
  };

  const handleInsert = () => {
    if (!insertOpen) return;
    const f = files.find((x) => x.id === insertOpen);
    if (!f) return;
    insertFileBetween(insertOpen, { campus: f.campus, fileNumberCode: f.fileNumberCode, caseType: f.caseType, subject: "", createdBy: currentUser!.id });
    setInsertOpen(null);
  };

  const handleCloseFile = () => {
    if (!closeOpen || !closeReason) return;
    const file = files.find((f) => f.id === closeOpen);
    if (closeType === "close") closeFile(closeOpen, closeReason, currentUser!.id);
    else invalidateFile(closeOpen, closeReason, currentUser!.id);
    addActivityLog({ userId: currentUser!.id, userName: currentUser!.name, action: closeType === "close" ? "Closed file" : "Marked file invalid", module: "file", details: `File: ${file?.fullFileNo}, Reason: ${closeReason}`, relatedId: closeOpen });
    addNotification({ title: closeType === "close" ? "File Closed" : "File Marked Invalid", message: `${file?.fullFileNo} — ${closeReason}`, module: "file", relatedId: closeOpen });
    setCloseOpen(null); setCloseReason("");
  };

  const handlePrintFile = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<html><head><title>File Register Report</title><style>body{font-family:sans-serif;padding:30px;max-width:1100px;margin:0 auto}h1{font-size:18px;border-bottom:2px solid #c28a30;padding-bottom:8px}table{width:100%;border-collapse:collapse;margin:16px 0;font-size:12px}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#f5f5f5}.closed{text-decoration:line-through;color:#999}</style></head><body>`);
    win.document.write(`<h1>CNCI Store & Purchase — File Register Report</h1><p style="color:#666;font-size:13px">Generated: ${new Date().toLocaleDateString("en-IN")} | Total Files: ${filteredFiles.length}</p>`);
    win.document.write(`<table><tr><th>S.No</th><th>File No</th><th>Subject</th><th>Campus</th><th>Created By</th><th>Supplier</th><th>Amount</th><th>PO No</th><th>PO Date</th><th>PO By</th><th>Scanned</th><th>Linked Tasks</th><th>Status</th></tr>`);
    filteredFiles.forEach((f, idx) => {
      const cls = f.isClosed || f.isInvalid ? ' class="closed"' : '';
      const status = f.isClosed ? "CLOSED" : f.isInvalid ? "INVALID" : f.isCompleted ? "Completed" : "Active";
      const createdByName = getUserName(f.createdBy);
      const poByName = f.poCreatedBy ? getUserName(f.poCreatedBy) : (f.poNo && !f.poReversed ? getUserName(f.createdBy) : "—");
      const scannedStatus = f.poNo && !f.poReversed ? (f.isDataScanned ? "Yes" : "No") : "—";
      win.document.write(`<tr${cls}><td>${idx + 1}</td><td>${f.fullFileNo}</td><td>${f.subject || "—"}</td><td>${f.campus === "N" ? "NT" : "H"}</td><td>${createdByName}</td><td>${f.supplierName || "—"}</td><td>₹${(f.amount || 0).toLocaleString("en-IN")}</td><td>${f.poReversed ? "REVERSED" : f.poNo || "—"}</td><td>${f.poDate || "—"}</td><td>${poByName}</td><td>${scannedStatus}</td><td>${f.linkedTaskNos?.join(", ") || "—"}</td><td>${status}</td></tr>`);
    });
    win.document.write(`</table></body></html>`);
    win.document.close(); win.print();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-display font-semibold">File Register</h2>
          <p className="text-xs text-muted-foreground">Total: {files.length} | With PO: {files.filter((f) => f.poNo && !f.poReversed).length} | Closed/Invalid: {files.filter((f) => f.isClosed || f.isInvalid).length}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={handlePrintFile} title="Print register"><Printer className="size-3.5" /> Print</Button>
          <Dialog open={createFromTaskOpen} onOpenChange={setCreateFromTaskOpen}>
            <DialogTrigger asChild><Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" title="Create a file by linking task numbers"><Link2 className="size-3.5" /> From Tasks</Button></DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader><DialogTitle className="font-display">Create File from Task Numbers</DialogTitle></DialogHeader>
              <p className="text-xs text-muted-foreground">Enter task numbers (e.g., TSK-001) to link and create a file. Items will be auto-populated.</p>
              <div className="flex gap-2 mt-2">
                <Input value={taskNoInput} onChange={(e) => setTaskNoInput(e.target.value)} placeholder="TSK-001" className="font-mono text-xs" onKeyDown={(e) => { if (e.key === "Enter") addTaskNoToList(); }} />
                <Button size="sm" onClick={addTaskNoToList} className="shrink-0">Add</Button>
              </div>
              {selectedTaskNos.length > 0 && (
                <div className="mt-2 border rounded-lg max-h-40 overflow-y-auto">
                  {selectedTaskNos.map((no) => {
                    const task = tasks.find((t) => t.taskNo === no);
                    return (
                      <div key={no} className="flex items-center justify-between px-3 py-1.5 border-b last:border-0 text-xs">
                        <div className="flex items-center gap-2"><span className="font-mono text-gold font-semibold">{no}</span><span className="truncate">{task?.title || "Unknown"}</span></div>
                        <button className="text-red-400 hover:text-red-600" onClick={() => setSelectedTaskNos((p) => p.filter((n) => n !== no))}>×</button>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div><Label className="text-xs">Campus</Label><Select value={ftCampus} onValueChange={(v) => setFtCampus(v as Campus)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{CAMPUS_OPTIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select></div>
                <div><Label className="text-xs">File No</Label><Select value={ftCode} onValueChange={(v) => { setFtCode(v as FileNumberCode); setFtType(caseTypesForCode[v]?.[0] || "PUR"); }}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(FILE_NUMBER_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent></Select></div>
                <div><Label className="text-xs">Type</Label><Select value={ftType} onValueChange={(v) => setFtType(v as CaseType)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{(caseTypesForCode[ftCode] || ["PUR"]).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <Button onClick={handleCreateFromTasks} disabled={selectedTaskNos.length === 0} className="w-full mt-3 gold-gradient text-white border-0">Create File ({selectedTaskNos.length} tasks)</Button>
            </DialogContent>
          </Dialog>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-1.5 gold-gradient text-white border-0 hover:opacity-90 h-8 text-xs"><FolderPlus className="size-3.5" /> New File</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Create New File</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div><Label>Campus</Label><Select value={ncCampus} onValueChange={(v) => setNcCampus(v as Campus)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{CAMPUS_OPTIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>File Number</Label><Select value={ncCode} onValueChange={(v) => { setNcCode(v as FileNumberCode); setNcType(caseTypesForCode[v]?.[0] || "PUR"); }}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(FILE_NUMBER_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{k} — {v}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Case Type</Label><Select value={ncType} onValueChange={(v) => setNcType(v as CaseType)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{(caseTypesForCode[ncCode] || ["PUR"]).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Subject</Label><Input value={ncSubject} onChange={(e) => setNcSubject(e.target.value)} placeholder="File subject" className="mt-1" /></div>
                <div className="col-span-2"><Button onClick={handleCreate} className="w-full gold-gradient text-white border-0">Create File</Button></div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:gap-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1 min-w-[180px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search file no, subject, supplier, PO..." className="pl-9" /></div>
          <Select value={filterCode} onValueChange={setFilterCode}><SelectTrigger className="w-full sm:w-44"><Filter className="size-3.5 mr-1.5" /><SelectValue placeholder="All File Nos" /></SelectTrigger><SelectContent><SelectItem value="all">All File Nos</SelectItem>{Object.entries(FILE_NUMBER_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{k} — {v}</SelectItem>)}</SelectContent></Select>
          <Select value={filterCampus} onValueChange={setFilterCampus}><SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="All Campus" /></SelectTrigger><SelectContent><SelectItem value="all">All Campus</SelectItem><SelectItem value="N">New Town</SelectItem><SelectItem value="H">Hazra</SelectItem></SelectContent></Select>
          <Select value={filterPo} onValueChange={setFilterPo}><SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="All Status" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="with_po">With PO</SelectItem><SelectItem value="without_po">Without PO</SelectItem><SelectItem value="reversed">Reversed PO</SelectItem><SelectItem value="closed">Closed/Invalid</SelectItem></SelectContent></Select>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Calendar className="size-4 text-muted-foreground" />
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-[130px] text-xs" title="Filter from date" />
          <span className="text-muted-foreground text-xs">–</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 w-[130px] text-xs" title="Filter to date" />
          {(dateFrom || dateTo) && <button className="text-xs text-red-500 hover:underline" onClick={() => { setDateFrom(""); setDateTo(""); }}>Clear</button>}
        </div>
      </div>
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-gray-50">
              <th className="text-center px-2 py-3 font-semibold text-muted-foreground text-xs w-10">S.No</th>
              <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs">File No</th>
              <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs">Subject</th>
              <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs">Campus</th>
              <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs">Created By</th>
              <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs">Items</th>
              <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs">Supplier</th>
              <th className="text-right px-3 py-3 font-semibold text-muted-foreground text-xs">Amount</th>
              <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs">PO No</th>
              <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs">PO By</th>
              <th className="text-center px-3 py-3 font-semibold text-muted-foreground text-xs">Scanned</th>
              <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs">Tasks</th>
              <th className="text-right px-3 py-3 font-semibold text-muted-foreground text-xs">Actions</th>
            </tr></thead>
            <tbody>
              {filteredFiles.map((file, idx) => {
                const isClosed = file.isClosed || file.isInvalid;
                return (
                  <tr key={file.id} className={`border-b hover:bg-gray-50/50 transition-colors ${file.isLocked ? "bg-gray-50" : ""} ${file.isCompleted && !file.poReversed && !isClosed ? "bg-emerald-50/30" : ""} ${file.poReversed ? "bg-red-50/20" : ""} ${isClosed ? "bg-gray-100/50" : ""}`}>
                    <td className="text-center px-2 py-3 text-[10px] text-muted-foreground tabular-nums font-semibold">{idx + 1}</td>
                    <td className="px-3 py-3"><p className={`font-mono text-[10px] font-semibold ${isClosed ? "line-through text-muted-foreground" : "text-navy"}`}>{file.fullFileNo}</p>{isClosed && <span className="text-[9px] font-semibold text-red-500">{file.isClosed ? "CLOSED" : "INVALID"}</span>}</td>
                    <td className={`px-3 py-3 max-w-[160px] truncate text-xs ${isClosed ? "line-through text-muted-foreground" : "text-muted-foreground"}`}>{file.subject || "—"}</td>
                    <td className="px-3 py-3"><span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${file.campus === "N" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>{file.campus === "N" ? "NT" : "H"}</span></td>
                    <td className="px-3 py-3 text-[10px] text-muted-foreground">{getUserName(file.createdBy)}</td>
                    <td className="px-3 py-3"><button onClick={() => setItemOpen(file.id)} className="flex items-center gap-1 text-[10px] text-gold hover:underline font-medium"><Package className="size-3" /> {file.items.length}</button></td>
                    <td className={`px-3 py-3 text-[10px] ${isClosed ? "line-through text-muted-foreground" : "text-muted-foreground"}`}>{file.supplierName || "—"}</td>
                    <td className="px-3 py-3 text-right tabular-nums font-medium text-xs">{file.amount ? `₹${file.amount.toLocaleString("en-IN")}` : "—"}</td>
                    <td className="px-3 py-3 font-mono text-[10px]">
                      {file.poReversed ? (<span className="text-red-600 font-semibold flex items-center gap-1" title={`Reversed: ${file.poReversalReason}`}><AlertTriangle className="size-3" /> Rev</span>) : file.poNo ? (<span className="text-emerald-700 font-semibold">{file.poNo}</span>) : "—"}
                      {file.poDate && <span className="block text-[9px] text-muted-foreground">{formatDate(file.poDate)}</span>}
                    </td>
                    <td className="px-3 py-3 text-[10px] text-muted-foreground">{file.poCreatedBy ? getUserName(file.poCreatedBy) : file.poNo && !file.poReversed ? getUserName(file.createdBy) : "—"}</td>
                    <td className="px-3 py-3 text-center">
                      {file.poNo && !file.poReversed && !isClosed ? (
                        canScan ? (
                          <button
                            onClick={() => file.isDataScanned ? unmarkDataScanned(file.id) : markDataScanned(file.id, currentUser!.id)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                              file.isDataScanned
                                ? "bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200"
                                : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
                            }`}
                            title={file.isDataScanned ? `Scanned by ${getUserName(file.dataScannedBy || '')}` : "Mark as scanned"}
                          >
                            <ScanLine className="size-3" />
                            {file.isDataScanned ? "Yes" : "No"}
                          </button>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                            file.isDataScanned ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                          }`}>
                            <ScanLine className="size-3" />
                            {file.isDataScanned ? "Yes" : "No"}
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">{file.linkedTaskNos && file.linkedTaskNos.length > 0 ? (
                      <div className="flex flex-wrap gap-0.5">{file.linkedTaskNos.map((no) => <span key={no} className="text-[8px] font-mono text-gold bg-gold/10 px-1 py-0.5 rounded">{no}</span>)}</div>
                    ) : <span className="text-[10px] text-muted-foreground">—</span>}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-0.5">
                        {!isClosed && (!file.isLocked || isAdmin) && <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => openEdit(file.id)} title="Edit"><Pencil className="size-3" /></Button>}
                        {!isClosed && !file.isCompleted && !file.poNo && !file.poReversed && canCreatePo(file.id) && (
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-emerald-600" onClick={() => handlePoConfirm(file.id)} title="Create PO"><CheckCircle2 className="size-3" /></Button>
                        )}
                        {isAdmin && file.poNo && !file.poReversed && !isClosed && (
                          <>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-amber-600" onClick={() => { setPoEditOpen(file.id); setPoNewNo(file.poNo || ""); setPoJustification(""); }} title="Edit PO"><FileText className="size-3" /></Button>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500" onClick={() => { setReverseOpen(file.id); setReverseReason(""); }} title="Reverse PO"><RotateCcw className="size-3" /></Button>
                          </>
                        )}
                        {!isClosed && <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400" onClick={() => { setCloseOpen(file.id); setCloseReason(""); setCloseType("close"); }} title="Close/Invalid"><XCircle className="size-3" /></Button>}
                        {isAdmin && !isClosed && (
                          <>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => file.isLocked ? unlockFile(file.id) : lockFile(file.id)} title={file.isLocked ? "Unlock" : "Lock"}>{file.isLocked ? <Lock className="size-3 text-red-500" /> : <Unlock className="size-3 text-green-500" />}</Button>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setInsertOpen(file.id)} title="Insert between"><Plus className="size-3" /></Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredFiles.length === 0 && <tr><td colSpan={13} className="text-center py-12 text-muted-foreground">No files found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Close/Invalid Dialog */}
      <Dialog open={!!closeOpen} onOpenChange={() => setCloseOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Close / Mark Invalid</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">This file will appear as strikethrough in the register.</p>
          <div className="mt-3 space-y-3">
            <div><Label>Action</Label><Select value={closeType} onValueChange={(v) => setCloseType(v as "close" | "invalid")}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="close">Mark as Closed</SelectItem><SelectItem value="invalid">Mark as Invalid</SelectItem></SelectContent></Select></div>
            <div><Label>Justification (required)</Label><Textarea value={closeReason} onChange={(e) => setCloseReason(e.target.value)} className="mt-1" rows={2} placeholder="Reason..." /></div>
            <Button onClick={handleCloseFile} disabled={!closeReason} className="w-full bg-red-600 text-white border-0 hover:bg-red-700">Confirm</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!poConfirmOpen} onOpenChange={() => setPoConfirmOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Confirm PO Creation</DialogTitle></DialogHeader>
          <div className="flex items-center gap-3 mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <Checkbox id="po-confirm" checked={poConfirmed} onCheckedChange={(v) => setPoConfirmed(v === true)} />
            <label htmlFor="po-confirm" className="text-sm font-medium cursor-pointer">I confirm all details are correct.</label>
          </div>
          <Button onClick={handleMarkComplete} disabled={!poConfirmed} className="w-full mt-3 gold-gradient text-white border-0">Create PO</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reverseOpen} onOpenChange={() => setReverseOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display text-red-600">Reverse PO</DialogTitle></DialogHeader>
          <div className="mt-3"><Label>Reason (required)</Label><Textarea value={reverseReason} onChange={(e) => setReverseReason(e.target.value)} className="mt-1" rows={2} /></div>
          <Button onClick={handleReversePo} disabled={!reverseReason} className="w-full mt-2 bg-red-600 text-white border-0 hover:bg-red-700">Reverse PO</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editOpen} onOpenChange={() => setEditOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Edit File</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="col-span-2"><Label>Subject</Label><Input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} className="mt-1" /></div>
            <div className="col-span-2">
              <Label>Supplier / Vendor</Label>
              <Input value={supplierSearch} onChange={(e) => { setSupplierSearch(e.target.value); setEditSupplier(e.target.value); }} placeholder="Search vendor..." className="mt-1" />
              {supplierSearch && filteredVendors.length > 0 && (
                <div className="mt-1 border rounded-lg max-h-32 overflow-y-auto">
                  {filteredVendors.map((v) => (
                    <button key={v.id} className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 border-b last:border-0" onClick={() => { setEditSupplier(v.name); setSupplierSearch(v.name); }}>
                      <span className="font-medium">{v.name}</span>{v.city && <span className="text-muted-foreground ml-2">({v.city})</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div><Label>Amount (₹)</Label><Input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="mt-1" /></div>
            <div><Label>PO Date</Label><Input type="date" value={editPoDate} onChange={(e) => setEditPoDate(e.target.value)} className="mt-1" /></div>
            <div className="col-span-2"><Button onClick={handleEdit} className="w-full gold-gradient text-white border-0">Save</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!poEditOpen} onOpenChange={() => setPoEditOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Edit PO Number</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div><Label>New PO Number</Label><Input value={poNewNo} onChange={(e) => setPoNewNo(e.target.value)} className="mt-1 font-mono text-xs" /></div>
            <div><Label>Justification (required)</Label><Textarea value={poJustification} onChange={(e) => setPoJustification(e.target.value)} className="mt-1" rows={2} /></div>
            <Button onClick={handleEditPo} className="w-full gold-gradient text-white border-0" disabled={!poJustification}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!itemOpen} onOpenChange={() => setItemOpen(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle className="font-display">File Items</DialogTitle></DialogHeader>
          {itemOpen && (() => {
            const file = files.find((f) => f.id === itemOpen);
            if (!file) return null;
            return (
              <div className="space-y-4 pt-2">
                <p className="text-xs font-mono text-muted-foreground">{file.fullFileNo}</p>
                {file.linkedTaskNos && file.linkedTaskNos.length > 0 && (
                  <p className="text-[10px] text-gold">Linked tasks: {file.linkedTaskNos.join(", ")}</p>
                )}
                {file.items.length > 0 && (
                  <table className="w-full text-sm border rounded-lg overflow-hidden">
                    <thead><tr className="bg-gray-50 border-b"><th className="text-left px-3 py-2 font-semibold text-xs">Item</th><th className="text-left px-3 py-2 font-semibold text-xs">Qty</th><th className="text-left px-3 py-2 font-semibold text-xs">Unit</th><th className="text-right px-3 py-2 font-semibold text-xs">Rate</th><th className="text-right px-3 py-2 font-semibold text-xs">Total</th>{(!file.isLocked || isAdmin) && <th className="w-8"></th>}</tr></thead>
                    <tbody>{file.items.map((item) => (
                      <tr key={item.id} className="border-b"><td className="px-3 py-2 text-xs">{item.name}{item.sourceTaskNo && <span className="text-[8px] text-gold ml-1">({item.sourceTaskNo})</span>}</td><td className="px-3 py-2 tabular-nums text-xs">{item.quantity}</td><td className="px-3 py-2 text-xs">{item.unit}</td><td className="px-3 py-2 text-right tabular-nums text-xs">₹{item.unitPrice?.toLocaleString("en-IN")}</td><td className="px-3 py-2 text-right tabular-nums font-medium text-xs">₹{item.totalPrice?.toLocaleString("en-IN")}</td>{(!file.isLocked || isAdmin) && <td className="px-2"><button onClick={() => removeFileItem(file.id, item.id)} className="text-red-400 hover:text-red-600 text-xs">×</button></td>}</tr>
                    ))}</tbody>
                  </table>
                )}
                {(!file.isLocked || isAdmin) && (
                  <div className="grid grid-cols-5 gap-2 items-end">
                    <div className="col-span-2"><Label className="text-xs">Item Name</Label><Input value={niName} onChange={(e) => setNiName(e.target.value)} className="mt-1 h-8 text-xs" /></div>
                    <div><Label className="text-xs">Qty</Label><Input type="number" value={niQty} onChange={(e) => setNiQty(e.target.value)} className="mt-1 h-8 text-xs" /></div>
                    <div><Label className="text-xs">Rate</Label><Input type="number" value={niPrice} onChange={(e) => setNiPrice(e.target.value)} className="mt-1 h-8 text-xs" /></div>
                    <Button size="sm" onClick={handleAddItem} className="h-8 gold-gradient text-white border-0 text-xs">Add</Button>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!insertOpen} onOpenChange={() => setInsertOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Insert File Between</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will insert a new file with A/B suffix.</p>
          <Button onClick={handleInsert} className="w-full gold-gradient text-white border-0 mt-2">Insert</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
