import { useState, useMemo, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Plus, Filter, ArrowRightLeft, Search, Trash2, MessageSquare, Eye, Clock, ArrowUp, Upload, FolderPlus, FileSpreadsheet, Settings2, RotateCcw, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/stores/authStore";
import { useTaskStore } from "@/stores/taskStore";
import { useFileStore } from "@/stores/fileStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { TaskSummaryBar } from "@/components/features/TaskSummaryBar";
import { TaskStatusBadge } from "@/components/features/StatusBadge";
import { TASK_STATUS_CONFIG, CAMPUS_OPTIONS, FILE_NUMBER_MAP } from "@/constants/config";
import { formatDateTime, generateId } from "@/lib/utils";
import type { Task, TaskStatus, TaskType, TaskPriority, MonthlySheet, MonthlySheetItem, MonthlyItemStatus, Campus, FileNumberCode, CaseType } from "@/types";

const PRIORITY_LABELS: Record<TaskPriority, string> = { high: "High", medium: "Medium", low: "Low" };
const PRIORITY_COLORS: Record<TaskPriority, string> = { high: "bg-red-100 text-red-700 border-red-200", medium: "bg-amber-100 text-amber-700 border-amber-200", low: "bg-gray-100 text-gray-600 border-gray-200" };
const PRIORITY_ORDER: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };

const MONTHLY_STATUS_LABELS: Record<MonthlyItemStatus, string> = {
  pending: "Pending",
  quotation_called: "Quotation Called",
  reminder_given: "Reminder Given",
  quotation_received: "Quotation Received",
  prepare_gfr_noting: "Prepare GFR/Noting",
  gfr_prepared: "GFR Prepared",
  noting_prepared: "Noting Prepared",
  file_created: "File Created",
};

const MONTHLY_STATUS_COLORS: Record<MonthlyItemStatus, string> = {
  pending: "bg-gray-100 text-gray-600",
  quotation_called: "bg-blue-100 text-blue-700",
  reminder_given: "bg-yellow-100 text-yellow-700",
  quotation_received: "bg-indigo-100 text-indigo-700",
  prepare_gfr_noting: "bg-violet-100 text-violet-700",
  gfr_prepared: "bg-pink-100 text-pink-700",
  noting_prepared: "bg-amber-100 text-amber-800",
  file_created: "bg-emerald-100 text-emerald-700",
};

const MONTHLY_GROUPS = ["Medical Consumables", "Stationery", "General", "Surgical", "Laboratory", "Engineering", "IT & Electronics", "Other"];

export default function TaskManager() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlStatus = searchParams.get("status") || "";
  const { currentUser, users, getUserName } = useAuthStore();
  const { tasks, generalTasks, addTask, updateTaskStatus, updateTaskPriority, updateTaskGfrType, transferTask, addRemark, deleteTask, addGeneralTask, updateGeneralTaskStatus, updateGeneralTaskPriority, deleteGeneralTask, monthlySheets, addMonthlySheet, updateMonthlyItemStatus, updateMonthlyItem, linkMonthlyItemToFile, deleteMonthlySheet, reopenTask, addFollowUpTask } = useTaskStore();
  const { addFile, createFileFromTasks } = useFileStore();
  const { addActivityLog } = useSettingsStore();
  const isAdmin = currentUser?.role === "admin";

  const [filterUser, setFilterUser] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>(urlStatus === "overdue" ? "all" : (urlStatus || "all"));
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newGTaskOpen, setNewGTaskOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState<string | null>(null);
  const [remarkOpen, setRemarkOpen] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState<string | null>(null);
  const [remarkText, setRemarkText] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [followUpOpen, setFollowUpOpen] = useState<string | null>(null);
  const [fuTitle, setFuTitle] = useState("");
  const [fuDesc, setFuDesc] = useState("");
  const [fuAssignee, setFuAssignee] = useState("");
  const [fuDueDate, setFuDueDate] = useState("");
  const [fuPriority, setFuPriority] = useState<TaskPriority>("medium");
  const [createFileOpen, setCreateFileOpen] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [cfCampus, setCfCampus] = useState<Campus>("N");
  const [cfCode, setCfCode] = useState<FileNumberCode>("281");
  const [cfType, setCfType] = useState<CaseType>("PUR");

  const [ntTitle, setNtTitle] = useState("");
  const [ntDesc, setNtDesc] = useState("");
  const [ntType, setNtType] = useState<TaskType>("lp");
  const [ntAssignee, setNtAssignee] = useState("");
  const [ntDueDate, setNtDueDate] = useState("");
  const [ntGfrType, setNtGfrType] = useState<string>("");
  const [ntFileNo, setNtFileNo] = useState("");
  const [ntPriority, setNtPriority] = useState<TaskPriority>("medium");

  const [gtTitle, setGtTitle] = useState("");
  const [gtDesc, setGtDesc] = useState("");
  const [gtAssignee, setGtAssignee] = useState("");
  const [gtDue, setGtDue] = useState("");
  const [gtPriority, setGtPriority] = useState<TaskPriority>("medium");

  const [gtFilterUser, setGtFilterUser] = useState<string>("all");
  const [gtFilterStatus, setGtFilterStatus] = useState<string>("all");
  const [gtFilterPriority, setGtFilterPriority] = useState<string>("all");
  const [gtSearch, setGtSearch] = useState("");

  // Monthly sheet state
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);
  const [msMonth, setMsMonth] = useState(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [msYear, setMsYear] = useState(String(new Date().getFullYear()));
  const [msCampus, setMsCampus] = useState<Campus>("N");
  const [msGroup, setMsGroup] = useState("Medical Consumables");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [msFilterCampus, setMsFilterCampus] = useState<string>("all");
  const [msFilterGroup, setMsFilterGroup] = useState<string>("all");
  const [msFilterMonth, setMsFilterMonth] = useState<string>("all");
  const [statusNoteOpen, setStatusNoteOpen] = useState<{ sheetId: string; itemId: string; status: MonthlyItemStatus } | null>(null);
  const [statusNote, setStatusNote] = useState("");
  const [msCreateFileOpen, setMsCreateFileOpen] = useState<{ sheetId: string; itemIds: string[] } | null>(null);
  const [msCfCampus, setMsCfCampus] = useState<Campus>("N");
  const [msCfCode, setMsCfCode] = useState<FileNumberCode>("281");
  const [msCfType, setMsCfType] = useState<CaseType>("PUR");
  const [selectedMsItems, setSelectedMsItems] = useState<{ sheetId: string; itemId: string }[]>([]);

  const caseTypesForCode: Record<string, CaseType[]> = { "281": ["PUR"], "282": ["RC", "STE", "PAC"], "283": ["PUR"], "362": ["PUR"], "299": ["PUR"] };

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (filterUser !== "all") result = result.filter((t) => t.assignedTo === filterUser);
    if (filterStatus !== "all") result = result.filter((t) => t.status === filterStatus);
    if (filterPriority !== "all") result = result.filter((t) => t.priority === filterPriority);
    if (urlStatus === "overdue") result = result.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "completed");
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t) => t.title.toLowerCase().includes(q) || t.fileNo?.toLowerCase().includes(q) || t.taskNo?.toLowerCase().includes(q));
    }
    return result.sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority || "medium"];
      const pb = PRIORITY_ORDER[b.priority || "medium"];
      if (pa !== pb) return pa - pb;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [tasks, filterUser, filterStatus, filterPriority, searchQuery, isAdmin, currentUser, urlStatus]);

  const filteredGeneralTasks = useMemo(() => {
    let result = generalTasks;
    if (gtFilterUser !== "all") result = result.filter((t) => t.assignedTo === gtFilterUser);
    if (gtFilterStatus !== "all") result = result.filter((t) => t.status === gtFilterStatus);
    if (gtFilterPriority !== "all") result = result.filter((t) => t.priority === gtFilterPriority);
    if (gtSearch) {
      const q = gtSearch.toLowerCase();
      result = result.filter((t) => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
    }
    return result.sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority || "medium"];
      const pb = PRIORITY_ORDER[b.priority || "medium"];
      if (pa !== pb) return pa - pb;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [generalTasks, gtFilterUser, gtFilterStatus, gtFilterPriority, gtSearch, isAdmin, currentUser]);

  const filteredSheets = useMemo(() => {
    let result = monthlySheets;
    if (msFilterCampus !== "all") result = result.filter((s) => s.campus === msFilterCampus);
    if (msFilterGroup !== "all") result = result.filter((s) => s.group === msFilterGroup);
    if (msFilterMonth !== "all") result = result.filter((s) => `${s.year}-${s.month}` === msFilterMonth);
    return result.sort((a, b) => b.year - a.year || b.month.localeCompare(a.month));
  }, [monthlySheets, msFilterCampus, msFilterGroup, msFilterMonth]);

  const handleAddTask = () => {
    if (!ntTitle || !ntAssignee) return;
    const newTask = addTask({ title: ntTitle, description: ntDesc, taskType: ntType, assignedTo: ntAssignee, assignedBy: currentUser!.id, dueDate: ntDueDate || undefined, status: "assigned", priority: ntPriority, gfrType: ntGfrType ? (ntGfrType as any) : undefined, fileNo: ntFileNo || undefined });
    addActivityLog({ userId: currentUser!.id, userName: currentUser!.name, action: "Created task", module: "task", details: `Task: ${ntTitle} (${newTask.taskNo}), Assigned to: ${getUserName(ntAssignee)}` });
    setNewTaskOpen(false);
    setNtTitle(""); setNtDesc(""); setNtAssignee(""); setNtDueDate(""); setNtFileNo(""); setNtPriority("medium"); setNtGfrType("");
  };

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    updateTaskStatus(taskId, newStatus, currentUser!.id, currentUser!.name);
    addActivityLog({ userId: currentUser!.id, userName: currentUser!.name, action: "Changed task status", module: "task", details: `Task: ${task.title} (${task.taskNo}), Status: ${task.status} → ${newStatus}`, relatedId: taskId });
  };

  const handleTransfer = (taskId: string) => {
    if (!transferTo || !transferReason) return;
    transferTask(taskId, transferTo, transferReason, currentUser!.id);
    addActivityLog({ userId: currentUser!.id, userName: currentUser!.name, action: "Transferred task", module: "task", details: `To: ${getUserName(transferTo)}, Reason: ${transferReason}`, relatedId: taskId });
    setTransferOpen(null);
    setTransferTo(""); setTransferReason("");
  };

  const handleRemark = (taskId: string) => {
    if (!remarkText) return;
    addRemark(taskId, remarkText, currentUser!.id, currentUser!.name);
    setRemarkOpen(null);
    setRemarkText("");
  };

  const handleReopen = (taskId: string) => {
    reopenTask(taskId, currentUser!.id, currentUser!.name);
    const task = tasks.find((t) => t.id === taskId);
    addActivityLog({ userId: currentUser!.id, userName: currentUser!.name, action: "Reopened task", module: "task", details: `Task: ${task?.title} (${task?.taskNo})`, relatedId: taskId });
  };

  const handleAddFollowUp = () => {
    if (!followUpOpen || !fuTitle || !fuAssignee) return;
    const parent = tasks.find((t) => t.id === followUpOpen);
    const newTask = addFollowUpTask(followUpOpen, {
      title: fuTitle,
      description: fuDesc,
      taskType: parent?.taskType || "lp",
      assignedTo: fuAssignee,
      assignedBy: currentUser!.id,
      dueDate: fuDueDate || undefined,
      status: "assigned",
      priority: fuPriority,
      gfrType: parent?.gfrType,
      fileNo: parent?.fileNo,
    });
    addActivityLog({ userId: currentUser!.id, userName: currentUser!.name, action: "Created follow-up task", module: "task", details: `Follow-up ${newTask.taskNo} from ${parent?.taskNo}, Assigned to: ${getUserName(fuAssignee)}`, relatedId: newTask.id });
    setFollowUpOpen(null);
    setFuTitle(""); setFuDesc(""); setFuAssignee(""); setFuDueDate(""); setFuPriority("medium");
  };

  const handleAddGeneralTask = () => {
    if (!gtTitle || !gtAssignee) return;
    addGeneralTask({ title: gtTitle, description: gtDesc, assignedTo: gtAssignee, assignedBy: currentUser!.id, dueDate: gtDue || undefined, status: "pending", priority: gtPriority });
    addActivityLog({ userId: currentUser!.id, userName: currentUser!.name, action: "Created general task", module: "task", details: `Task: ${gtTitle}` });
    setNewGTaskOpen(false);
    setGtTitle(""); setGtDesc(""); setGtAssignee(""); setGtDue(""); setGtPriority("medium");
  };

  const handleCreateFileFromTasks = () => {
    if (selectedTaskIds.length === 0) return;
    const selTasks = tasks.filter((t) => selectedTaskIds.includes(t.id));
    const file = createFileFromTasks({ campus: cfCampus, fileNumberCode: cfCode, caseType: cfType, createdBy: currentUser!.id, tasks: selTasks });
    selTasks.forEach((t) => {
      const { linkTaskToFile } = useTaskStore.getState();
      linkTaskToFile(t.id, file.id);
    });
    addActivityLog({ userId: currentUser!.id, userName: currentUser!.name, action: "Created file from tasks", module: "file", details: `File: ${file.fullFileNo}, Tasks: ${selTasks.map(t => t.taskNo).join(", ")}`, relatedId: file.id });
    setCreateFileOpen(false);
    setSelectedTaskIds([]);
    navigate("/files");
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds((prev) => prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]);
  };

  // Monthly sheet upload handler
  const handleSheetUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) return;
      const items: MonthlySheetItem[] = [];
      for (let i = 1; i < lines.length; i++) {
        const delimiter = text.includes("\t") ? "\t" : ",";
        const cols = delimiter === "," ? lines[i].match(/("[^"]*"|[^,]*)(?:,|$)/g)?.map(c => c.replace(/,$/, "").replace(/^"|"$/g, "").trim()) || [] : lines[i].split("\t");
        if (!cols[1]?.trim()) continue;
        items.push({
          id: generateId(),
          serialNo: parseInt(cols[0]?.trim()) || i,
          itemName: cols[1]?.trim() || "",
          quantity: parseFloat(cols[2]?.trim()) || undefined,
          unit: cols[3]?.trim() || "",
          estimatedRate: parseFloat(cols[4]?.trim()) || undefined,
          firmNames: (cols[5]?.trim() || "").split(",").map((s) => s.trim()).filter(Boolean),
          status: "pending",
          statusLog: [{ status: "pending", date: new Date().toISOString() }],
        });
      }
      const sheetName = file.name.replace(/\.(tsv|csv|txt|xlsx?)$/i, "");
      addMonthlySheet({
        month: msMonth,
        year: parseInt(msYear),
        campus: msCampus,
        group: msGroup,
        sheetName,
        items,
        uploadedBy: currentUser!.id,
      });
      addActivityLog({ userId: currentUser!.id, userName: currentUser!.name, action: "Uploaded monthly sheet", module: "task", details: `${sheetName} (${items.length} items), ${msGroup}, ${msCampus === "N" ? "New Town" : "Hazra"}` });
      setUploadSheetOpen(false);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleMonthlyStatusChange = (sheetId: string, itemId: string, newStatus: MonthlyItemStatus) => {
    if (newStatus === "file_created") {
      // Need to create a file first
      setMsCreateFileOpen({ sheetId, itemIds: [itemId] });
      return;
    }
    if (newStatus === "quotation_called" || newStatus === "reminder_given") {
      setStatusNoteOpen({ sheetId, itemId, status: newStatus });
      return;
    }
    updateMonthlyItemStatus(sheetId, itemId, newStatus);
  };

  const handleStatusWithNote = () => {
    if (!statusNoteOpen) return;
    updateMonthlyItemStatus(statusNoteOpen.sheetId, statusNoteOpen.itemId, statusNoteOpen.status, statusNote);
    setStatusNoteOpen(null);
    setStatusNote("");
  };

  const handleCreateFileFromMonthly = () => {
    if (!msCreateFileOpen) return;
    const sheet = monthlySheets.find((s) => s.id === msCreateFileOpen.sheetId);
    if (!sheet) return;
    const selItems = sheet.items.filter((i) => msCreateFileOpen.itemIds.includes(i.id));
    const file = addFile({ campus: msCfCampus, fileNumberCode: msCfCode, caseType: msCfType, subject: selItems.map((i) => i.itemName).join("; "), createdBy: currentUser!.id });
    // Add items to file
    const { addFileItem } = useFileStore.getState();
    selItems.forEach((item) => {
      addFileItem(file.id, { name: item.itemName, quantity: item.quantity || 1, unit: item.unit || "Nos", unitPrice: item.rate || item.estimatedRate || 0, totalPrice: (item.quantity || 1) * (item.rate || item.estimatedRate || 0), sourceMonthlyItemId: item.id });
    });
    // Update file supplier from firm names
    const firms = selItems.flatMap((i) => i.firmNames).filter(Boolean);
    if (firms.length > 0) {
      const { updateFile } = useFileStore.getState();
      updateFile(file.id, { supplierName: firms[0] });
    }
    // Link monthly items to file
    msCreateFileOpen.itemIds.forEach((itemId) => {
      linkMonthlyItemToFile(msCreateFileOpen.sheetId, itemId, file.id);
    });
    addActivityLog({ userId: currentUser!.id, userName: currentUser!.name, action: "Created file from monthly sheet", module: "file", details: `File: ${file.fullFileNo}, Items: ${selItems.length}` });
    setMsCreateFileOpen(null);
    setSelectedMsItems([]);
    navigate("/files");
  };

  const downloadSampleMonthlySheet = (format: "tsv" | "csv" = "csv") => {
    let content: string;
    let mimeType: string;
    let ext: string;
    if (format === "csv") {
      content = "S.No,Item Name,Quantity,Unit,Estimated Rate,\"Firm Names (comma separated)\"\n1,Sample Item,10,Nos,500,\"Firm A, Firm B\"\n2,Another Item,5,Ltrs,1200,Firm C";
      mimeType = "text/csv";
      ext = "csv";
    } else {
      content = "S.No\tItem Name\tQuantity\tUnit\tEstimated Rate\tFirm Names (comma separated)\n1\tSample Item\t10\tNos\t500\tFirm A, Firm B\n2\tAnother Item\t5\tLtrs\t1200\tFirm C";
      mimeType = "text/tab-separated-values";
      ext = "tsv";
    }
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `cnci_monthly_sheet_sample.${ext}`; a.click();
    URL.revokeObjectURL(url);
  };

  const getAvailableStatuses = (task: Task): TaskStatus[] => {
    if (task.taskType === "lp") return ["assigned", "gfr_done", "noting_done", "completed"];
    if (task.taskType === "lp_rc") return ["assigned", "noting_done", "completed"];
    if (task.taskType === "gem") return ["assigned", "gfr_done", "noting_done", "completed"];
    return ["assigned", "gfr_done", "noting_done", "completed"];
  };

  const getStatusRowClass = (status: TaskStatus) => {
    const map: Record<TaskStatus, string> = { assigned: "", gfr_done: "status-gfr", noting_done: "status-noting", completed: "status-completed" };
    return map[status];
  };

  const historyTask = historyOpen ? tasks.find((t) => t.id === historyOpen) : null;

  const renderPriorityBadge = (priority: TaskPriority, taskId?: string, isGeneral?: boolean) => {
    if (isAdmin) {
      return (
        <Select value={priority} onValueChange={(v) => {
          if (isGeneral && taskId) updateGeneralTaskPriority(taskId, v as TaskPriority);
          else if (taskId) updateTaskPriority(taskId, v as TaskPriority);
        }}>
          <SelectTrigger className="h-6 w-20 text-[10px] border-0 bg-transparent p-0">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${PRIORITY_COLORS[priority]}`}>
              {priority === "high" && <ArrowUp className="size-2.5" />}
              {PRIORITY_LABELS[priority]}
            </span>
          </SelectTrigger>
          <SelectContent><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
        </Select>
      );
    }
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${PRIORITY_COLORS[priority]}`}>
        {priority === "high" && <ArrowUp className="size-2.5" />}
        {PRIORITY_LABELS[priority]}
      </span>
    );
  };

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    monthlySheets.forEach((s) => set.add(`${s.year}-${s.month}`));
    return Array.from(set).sort().reverse();
  }, [monthlySheets]);

  return (
    <div className="space-y-5">
      <TaskSummaryBar tasks={isAdmin ? tasks : tasks.filter((t) => t.assignedTo === currentUser?.id)} />

      <Tabs defaultValue="assigned" className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="assigned">Assigned Tasks</TabsTrigger>
            <TabsTrigger value="general">General Tasks</TabsTrigger>
            <TabsTrigger value="monthly">Monthly Sheets</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            {selectedTaskIds.length > 0 && (
              <Button size="sm" variant="outline" className="gap-1.5 text-emerald-700 border-emerald-300" onClick={() => setCreateFileOpen(true)} title="Create a new file from selected tasks">
                <FolderPlus className="size-4" /> Create File ({selectedTaskIds.length})
              </Button>
            )}
            <Dialog open={newTaskOpen} onOpenChange={setNewTaskOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5 gold-gradient text-white border-0 hover:opacity-90"><Plus className="size-4" /> New Task</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle className="font-display">Create New Task</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="col-span-2"><Label>Title</Label><Input value={ntTitle} onChange={(e) => setNtTitle(e.target.value)} placeholder="Task title" className="mt-1" /></div>
                  <div className="col-span-2"><Label>Description</Label><Textarea value={ntDesc} onChange={(e) => setNtDesc(e.target.value)} placeholder="Details..." className="mt-1" rows={2} /></div>
                  <div>
                    <Label>Task Type</Label>
                    <Select value={ntType} onValueChange={(v) => setNtType(v as TaskType)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lp">LP (Local Purchase)</SelectItem>
                        <SelectItem value="lp_rc">LP against RC/STE/PAC</SelectItem>
                        <SelectItem value="gem">GeM Case</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select value={ntPriority} onValueChange={(v) => setNtPriority(v as TaskPriority)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {ntType === "lp" && (
                    <div><Label>GFR Type <span className="text-muted-foreground text-[10px]">(optional)</span></Label>
                      <Select value={ntGfrType} onValueChange={setNtGfrType}><SelectTrigger className="mt-1"><SelectValue placeholder="Select later" /></SelectTrigger><SelectContent><SelectItem value="GFR154">GFR 154</SelectItem><SelectItem value="GFR155">GFR 155</SelectItem></SelectContent></Select>
                    </div>
                  )}
                  <div><Label>Assign To</Label><Select value={ntAssignee} onValueChange={setNtAssignee}><SelectTrigger className="mt-1"><SelectValue placeholder="Select user" /></SelectTrigger><SelectContent>{users.filter((u) => u.isActive).map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label>Due Date</Label><Input type="date" value={ntDueDate} onChange={(e) => setNtDueDate(e.target.value)} className="mt-1" /></div>
                  <div><Label>File No (optional)</Label><Input value={ntFileNo} onChange={(e) => setNtFileNo(e.target.value)} placeholder="CNCI/..." className="mt-1" /></div>
                  <div className="col-span-2"><Button onClick={handleAddTask} className="w-full gold-gradient text-white border-0 hover:opacity-90">Create Task</Button></div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* ASSIGNED TASKS TAB */}
        <TabsContent value="assigned" className="space-y-4 mt-0">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[180px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search tasks, task no..." className="pl-9" /></div>
            <Select value={filterUser} onValueChange={setFilterUser}><SelectTrigger className="w-full sm:w-40"><Filter className="size-3.5 mr-1.5" /><SelectValue placeholder="All Users" /></SelectTrigger><SelectContent><SelectItem value="all">All Users</SelectItem>{users.filter((u) => u.isActive).map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="All Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem>{Object.entries(TASK_STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}><SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="All Priority" /></SelectTrigger><SelectContent><SelectItem value="all">All Priority</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select>
          </div>

          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-gray-50">
                  <th className="text-center px-2 py-3 w-8"><input type="checkbox" className="size-3.5 rounded" onChange={(e) => { if (e.target.checked) setSelectedTaskIds(filteredTasks.map(t => t.id)); else setSelectedTaskIds([]); }} checked={selectedTaskIds.length > 0 && selectedTaskIds.length === filteredTasks.length} /></th>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs">Task No</th>
                  <th className="text-left px-2 py-3 font-semibold text-muted-foreground text-xs">Pri</th>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs">Task</th>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs">Type</th>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs">Assigned To</th>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs">Due</th>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs min-w-[130px]">Status</th>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs">Remarks</th>
                  <th className="text-right px-3 py-3 font-semibold text-muted-foreground text-xs">Actions</th>
                </tr></thead>
                <tbody>
                  {filteredTasks.map((task) => {
                    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "completed";
                    const canEditStatus = task.assignedTo === currentUser?.id || isAdmin;
                    const priority = task.priority || "medium";
                    return (
                      <tr key={task.id} className={`border-b hover:bg-gray-50/50 transition-colors ${getStatusRowClass(task.status)} ${isOverdue ? "status-overdue" : ""}`}>
                        <td className="text-center px-2 py-3"><input type="checkbox" className="size-3.5 rounded" checked={selectedTaskIds.includes(task.id)} onChange={() => toggleTaskSelection(task.id)} /></td>
                        <td className="px-3 py-3"><span className="text-[10px] font-mono font-semibold text-gold bg-gold/10 px-1.5 py-0.5 rounded">{task.taskNo}</span></td>
                        <td className="px-2 py-3">{renderPriorityBadge(priority, task.id, false)}</td>
                        <td className="px-3 py-3">
                          <p className="font-medium text-foreground text-xs">{task.title}</p>
                          {task.fileNo && <p className="text-[10px] text-muted-foreground mt-0.5">{task.fileNo}</p>}
                          {task.linkedFileId && <span className="text-[9px] text-emerald-600 font-medium">Linked to file</span>}
                          {task.parentTaskId && (() => { const p = tasks.find(t => t.id === task.parentTaskId); return p ? <span className="text-[9px] text-violet-600 font-medium flex items-center gap-0.5 mt-0.5"><GitBranch className="size-2.5" /> Follow-up of {p.taskNo}</span> : null; })()}
                          {task.childTaskIds && task.childTaskIds.length > 0 && <span className="text-[9px] text-blue-600 font-medium mt-0.5 block">{task.childTaskIds.length} follow-up(s)</span>}
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-gray-100">{task.taskType.replace("_", "/")}</span>
                          {task.taskType === "lp" && (
                            <div className="mt-0.5">
                              {isAdmin || task.assignedTo === currentUser?.id ? (
                                <Select value={task.gfrType || ""} onValueChange={(v) => updateTaskGfrType(task.id, v)}>
                                  <SelectTrigger className="h-5 text-[9px] w-16 border-0 bg-transparent p-0"><SelectValue placeholder="GFR?" /></SelectTrigger>
                                  <SelectContent><SelectItem value="GFR154">GFR 154</SelectItem><SelectItem value="GFR155">GFR 155</SelectItem></SelectContent>
                                </Select>
                              ) : task.gfrType ? (
                                <span className="text-[9px] text-muted-foreground">{task.gfrType}</span>
                              ) : null}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground text-xs">{getUserName(task.assignedTo)}</td>
                        <td className="px-3 py-3 tabular-nums text-muted-foreground text-xs">{task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}</td>
                        <td className="px-3 py-3">
                          {canEditStatus ? (
                            <Select value={task.status} onValueChange={(v) => handleStatusChange(task.id, v as TaskStatus)}>
                              <SelectTrigger className="h-7 text-xs w-32 border-0 bg-transparent p-0"><TaskStatusBadge status={task.status} /></SelectTrigger>
                              <SelectContent>{getAvailableStatuses(task).map((s) => (<SelectItem key={s} value={s}>{TASK_STATUS_CONFIG[s].label}</SelectItem>))}</SelectContent>
                            </Select>
                          ) : (<TaskStatusBadge status={task.status} />)}
                        </td>
                        <td className="px-3 py-3 max-w-[160px]">
                          {task.remarks.length > 0 ? (
                            <div className="space-y-0.5">
                              <p className="text-[10px] text-blue-600 italic truncate">{task.remarks[task.remarks.length - 1].text}</p>
                              <p className="text-[9px] text-muted-foreground">{task.remarks[task.remarks.length - 1].user} • {formatDateTime(task.remarks[task.remarks.length - 1].date)}</p>
                            </div>
                          ) : <span className="text-[10px] text-muted-foreground">—</span>}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-end gap-0.5">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setHistoryOpen(task.id)} title="View task history"><Eye className="size-3" /></Button>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setRemarkOpen(task.id); setRemarkText(""); }} title="Add remark"><MessageSquare className="size-3" /></Button>
                            {task.status === "completed" && canEditStatus && (
                              <>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-amber-600" onClick={() => handleReopen(task.id)} title="Reopen this completed task"><RotateCcw className="size-3" /></Button>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-violet-600" onClick={() => { setFollowUpOpen(task.id); setFuTitle(""); setFuDesc(""); setFuAssignee(""); setFuDueDate(""); setFuPriority("medium"); }} title="Add follow-up task in this trail"><GitBranch className="size-3" /></Button>
                              </>
                            )}
                            {isAdmin && (
                              <>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setTransferOpen(task.id); setTransferTo(""); setTransferReason(""); }} title="Transfer task"><ArrowRightLeft className="size-3" /></Button>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500" onClick={() => deleteTask(task.id)} title="Delete task"><Trash2 className="size-3" /></Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredTasks.length === 0 && (<tr><td colSpan={10} className="text-center py-12 text-muted-foreground">No tasks found.</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* GENERAL TASKS TAB */}
        <TabsContent value="general" className="space-y-4 mt-0">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[180px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><Input value={gtSearch} onChange={(e) => setGtSearch(e.target.value)} placeholder="Search general tasks..." className="pl-9" /></div>
            <Select value={gtFilterUser} onValueChange={setGtFilterUser}><SelectTrigger className="w-full sm:w-40"><Filter className="size-3.5 mr-1.5" /><SelectValue placeholder="All Users" /></SelectTrigger><SelectContent><SelectItem value="all">All Users</SelectItem>{users.filter((u) => u.isActive).map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select>
            <Select value={gtFilterStatus} onValueChange={setGtFilterStatus}><SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="All Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent></Select>
            <Select value={gtFilterPriority} onValueChange={setGtFilterPriority}><SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="All Priority" /></SelectTrigger><SelectContent><SelectItem value="all">All Priority</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select>
            <Dialog open={newGTaskOpen} onOpenChange={setNewGTaskOpen}>
              <DialogTrigger asChild><Button size="sm" className="gap-1.5 gold-gradient text-white border-0 hover:opacity-90"><Plus className="size-4" /> General Task</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-display">New General Task</DialogTitle></DialogHeader>
                <div className="space-y-3 pt-2">
                  <div><Label>Title</Label><Input value={gtTitle} onChange={(e) => setGtTitle(e.target.value)} className="mt-1" /></div>
                  <div><Label>Description</Label><Textarea value={gtDesc} onChange={(e) => setGtDesc(e.target.value)} className="mt-1" rows={2} /></div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label>Assign To</Label><Select value={gtAssignee} onValueChange={setGtAssignee}><SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{users.filter((u) => u.isActive).map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Due Date</Label><Input type="date" value={gtDue} onChange={(e) => setGtDue(e.target.value)} className="mt-1" /></div>
                    <div><Label>Priority</Label><Select value={gtPriority} onValueChange={(v) => setGtPriority(v as TaskPriority)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select></div>
                  </div>
                  <Button onClick={handleAddGeneralTask} className="w-full gold-gradient text-white border-0">Create</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs">Priority</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs">Task</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs">Assigned To</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs">Due</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs">Remarks</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs">Actions</th>
              </tr></thead>
              <tbody>
                {filteredGeneralTasks.map((gt) => {
                  const canEdit = gt.assignedTo === currentUser?.id || isAdmin;
                  const pri = gt.priority || "medium";
                  return (
                    <tr key={gt.id} className={`border-b ${gt.status === "completed" ? "status-completed" : gt.status === "in_progress" ? "status-noting" : ""}`}>
                      <td className="px-4 py-3">{renderPriorityBadge(pri, gt.id, true)}</td>
                      <td className="px-4 py-3"><p className="font-medium text-xs">{gt.title}</p><p className="text-[10px] text-muted-foreground">{gt.description}</p></td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{getUserName(gt.assignedTo)}</td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground text-xs">{gt.dueDate ? new Date(gt.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}</td>
                      <td className="px-4 py-3">
                        <Select value={gt.status} onValueChange={(v) => updateGeneralTaskStatus(gt.id, v as any, currentUser!.id, currentUser!.name)} disabled={!canEdit}>
                          <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 max-w-[160px]">
                        {gt.remarks.length > 0 ? (
                          <div><p className="text-[10px] text-blue-600 italic truncate">{gt.remarks[gt.remarks.length - 1].text}</p><p className="text-[9px] text-muted-foreground">{formatDateTime(gt.remarks[gt.remarks.length - 1].date)}</p></div>
                        ) : <span className="text-[10px] text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">{isAdmin && <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => deleteGeneralTask(gt.id)}><Trash2 className="size-3.5" /></Button>}</td>
                    </tr>
                  );
                })}
                {filteredGeneralTasks.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">No general tasks found.</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* MONTHLY SHEETS TAB */}
        <TabsContent value="monthly" className="space-y-4 mt-0">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              <Select value={msFilterCampus} onValueChange={setMsFilterCampus}><SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Campus" /></SelectTrigger><SelectContent><SelectItem value="all">All Campus</SelectItem><SelectItem value="N">New Town</SelectItem><SelectItem value="H">Hazra</SelectItem></SelectContent></Select>
              <Select value={msFilterGroup} onValueChange={setMsFilterGroup}><SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Group" /></SelectTrigger><SelectContent><SelectItem value="all">All Groups</SelectItem>{MONTHLY_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select>
              <Select value={msFilterMonth} onValueChange={setMsFilterMonth}><SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Month" /></SelectTrigger><SelectContent><SelectItem value="all">All Months</SelectItem>{availableMonths.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => downloadSampleMonthlySheet("csv")} title="Download sample CSV template"><FileSpreadsheet className="size-3.5" /> CSV</Button>
              <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => downloadSampleMonthlySheet("tsv")} title="Download sample TSV template"><FileSpreadsheet className="size-3.5" /> TSV</Button>
              <Dialog open={uploadSheetOpen} onOpenChange={setUploadSheetOpen}>
                <DialogTrigger asChild><Button size="sm" className="gap-1.5 gold-gradient text-white border-0 hover:opacity-90 h-8 text-xs"><Upload className="size-3.5" /> Upload Sheet</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle className="font-display">Upload Monthly Sheet</DialogTitle></DialogHeader>
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs">Month</Label><Select value={msMonth} onValueChange={setMsMonth}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{["01","02","03","04","05","06","07","08","09","10","11","12"].map((m, i) => <SelectItem key={m} value={m}>{["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i]}</SelectItem>)}</SelectContent></Select></div>
                      <div><Label className="text-xs">Year</Label><Input value={msYear} onChange={(e) => setMsYear(e.target.value)} className="mt-1" type="number" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs">Campus</Label><Select value={msCampus} onValueChange={(v) => setMsCampus(v as Campus)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{CAMPUS_OPTIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select></div>
                      <div><Label className="text-xs">Group</Label><Select value={msGroup} onValueChange={setMsGroup}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{MONTHLY_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select></div>
                    </div>
                    <div>
                      <Label className="text-xs">Upload File (TSV/CSV)</Label>
                      <Input ref={fileInputRef} type="file" accept=".tsv,.csv,.txt" className="mt-1" onChange={handleSheetUpload} />
                      <p className="text-[10px] text-muted-foreground mt-1">Format: S.No | Item Name | Quantity | Unit | Est. Rate | Firm Names (comma sep). Supports CSV and TSV.</p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {filteredSheets.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center text-muted-foreground text-sm">
              No monthly sheets uploaded yet. Upload a sheet to start tracking items.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSheets.map((sheet) => (
                <div key={sheet.id} className="bg-white rounded-xl border overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                    <div>
                      <h4 className="text-sm font-semibold">{sheet.sheetName}</h4>
                      <p className="text-[10px] text-muted-foreground">{sheet.group} • {sheet.campus === "N" ? "NT" : "H"} • {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(sheet.month) - 1]} {sheet.year} • {sheet.items.length} items</p>
                    </div>
                    <div className="flex gap-1">
                      {selectedMsItems.filter(si => si.sheetId === sheet.id).length > 0 && (
                        <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 text-emerald-700 border-emerald-300" onClick={() => {
                          const ids = selectedMsItems.filter(si => si.sheetId === sheet.id).map(si => si.itemId);
                          setMsCreateFileOpen({ sheetId: sheet.id, itemIds: ids });
                        }}>
                          <FolderPlus className="size-3" /> Create File ({selectedMsItems.filter(si => si.sheetId === sheet.id).length})
                        </Button>
                      )}
                      {isAdmin && <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => deleteMonthlySheet(sheet.id)} title="Delete sheet"><Trash2 className="size-3" /></Button>}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="border-b bg-gray-50/50">
                        <th className="text-center px-2 py-2 w-7"><input type="checkbox" className="size-3" onChange={(e) => { if (e.target.checked) { const newSel = sheet.items.filter(i => i.status !== "file_created").map(i => ({ sheetId: sheet.id, itemId: i.id })); setSelectedMsItems(prev => [...prev.filter(si => si.sheetId !== sheet.id), ...newSel]); } else { setSelectedMsItems(prev => prev.filter(si => si.sheetId !== sheet.id)); } }} /></th>
                        <th className="text-left px-2 py-2 font-semibold text-muted-foreground">S.No</th>
                        <th className="text-left px-2 py-2 font-semibold text-muted-foreground">Item</th>
                        <th className="text-left px-2 py-2 font-semibold text-muted-foreground">Qty</th>
                        <th className="text-left px-2 py-2 font-semibold text-muted-foreground">Firms</th>
                        <th className="text-left px-2 py-2 font-semibold text-muted-foreground min-w-[150px]">Status</th>
                        <th className="text-left px-2 py-2 font-semibold text-muted-foreground">Dates</th>
                      </tr></thead>
                      <tbody>
                        {sheet.items.map((item) => (
                          <tr key={item.id} className={`border-b hover:bg-gray-50/50 ${item.status === "file_created" ? "bg-emerald-50/30" : ""}`}>
                            <td className="text-center px-2 py-2"><input type="checkbox" className="size-3" disabled={item.status === "file_created"} checked={selectedMsItems.some(si => si.sheetId === sheet.id && si.itemId === item.id)} onChange={(e) => { if (e.target.checked) setSelectedMsItems(prev => [...prev, { sheetId: sheet.id, itemId: item.id }]); else setSelectedMsItems(prev => prev.filter(si => !(si.sheetId === sheet.id && si.itemId === item.id))); }} /></td>
                            <td className="px-2 py-2 tabular-nums text-muted-foreground">{item.serialNo}</td>
                            <td className="px-2 py-2 font-medium max-w-[200px]">{item.itemName}{item.quantity && <span className="text-muted-foreground ml-1">({item.quantity} {item.unit})</span>}</td>
                            <td className="px-2 py-2 tabular-nums">{item.estimatedRate ? `₹${item.estimatedRate.toLocaleString("en-IN")}` : "—"}</td>
                            <td className="px-2 py-2 text-muted-foreground max-w-[120px] truncate">{item.firmNames.join(", ") || "—"}</td>
                            <td className="px-2 py-2">
                              {item.status === "file_created" ? (
                                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">File Created</span>
                              ) : (
                                <Select value={item.status} onValueChange={(v) => handleMonthlyStatusChange(sheet.id, item.id, v as MonthlyItemStatus)}>
                                  <SelectTrigger className="h-6 text-[10px] w-[140px] p-0 border-0">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${MONTHLY_STATUS_COLORS[item.status]}`}>{MONTHLY_STATUS_LABELS[item.status]}</span>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(Object.keys(MONTHLY_STATUS_LABELS) as MonthlyItemStatus[]).filter(s => s !== "file_created" || item.status === "noting_prepared").map((s) => (
                                      <SelectItem key={s} value={s} className="text-xs">{MONTHLY_STATUS_LABELS[s]}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </td>
                            <td className="px-2 py-2 text-[9px] text-muted-foreground space-y-0.5">
                              {item.quotationCalledDate && <div>Quot. called: {item.quotationCalledDate}</div>}
                              {item.reminderDate && <div>Reminder: {item.reminderDate}</div>}
                              {item.quotationReceivedDate && <div>Quot. recd: {item.quotationReceivedDate}</div>}
                              {item.gfrPreparedDate && <div>GFR: {item.gfrPreparedDate}</div>}
                              {item.notingPreparedDate && <div>Noting: {item.notingPreparedDate}</div>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create File from Tasks Dialog */}
      <Dialog open={createFileOpen} onOpenChange={setCreateFileOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Create File from Selected Tasks</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Selected tasks: {selectedTaskIds.length}. Items from these tasks will be added to the new file.</p>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div><Label className="text-xs">Campus</Label><Select value={cfCampus} onValueChange={(v) => setCfCampus(v as Campus)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{CAMPUS_OPTIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">File No</Label><Select value={cfCode} onValueChange={(v) => { setCfCode(v as FileNumberCode); setCfType(caseTypesForCode[v]?.[0] || "PUR"); }}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(FILE_NUMBER_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Case Type</Label><Select value={cfType} onValueChange={(v) => setCfType(v as CaseType)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{(caseTypesForCode[cfCode] || ["PUR"]).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="mt-2 max-h-40 overflow-y-auto border rounded-lg">
            {tasks.filter(t => selectedTaskIds.includes(t.id)).map(t => (
              <div key={t.id} className="flex items-center gap-2 px-3 py-1.5 border-b last:border-0 text-xs">
                <span className="font-mono text-gold font-semibold">{t.taskNo}</span>
                <span className="truncate">{t.title}</span>
              </div>
            ))}
          </div>
          <Button onClick={handleCreateFileFromTasks} className="w-full mt-2 gold-gradient text-white border-0">Create File</Button>
        </DialogContent>
      </Dialog>

      {/* Create File from Monthly Items Dialog */}
      <Dialog open={!!msCreateFileOpen} onOpenChange={() => setMsCreateFileOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Create File from Monthly Items</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Items will be auto-added to the new file with firm names as supplier.</p>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div><Label className="text-xs">Campus</Label><Select value={msCfCampus} onValueChange={(v) => setMsCfCampus(v as Campus)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{CAMPUS_OPTIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">File No</Label><Select value={msCfCode} onValueChange={(v) => { setMsCfCode(v as FileNumberCode); setMsCfType(caseTypesForCode[v]?.[0] || "PUR"); }}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(FILE_NUMBER_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Case Type</Label><Select value={msCfType} onValueChange={(v) => setMsCfType(v as CaseType)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{(caseTypesForCode[msCfCode] || ["PUR"]).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <Button onClick={handleCreateFileFromMonthly} className="w-full mt-3 gold-gradient text-white border-0">Create File</Button>
        </DialogContent>
      </Dialog>

      {/* Status Note Dialog */}
      <Dialog open={!!statusNoteOpen} onOpenChange={() => setStatusNoteOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">{statusNoteOpen?.status === "quotation_called" ? "Quotation Called" : "Reminder Given"}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div><Label>Note / Date Details</Label><Textarea value={statusNote} onChange={(e) => setStatusNote(e.target.value)} className="mt-1" rows={2} placeholder="e.g., Called on 15-Apr-2026 from M/s ABC Corp..." /></div>
            <Button onClick={handleStatusWithNote} className="w-full gold-gradient text-white border-0">Confirm</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Follow-Up Task Dialog */}
      <Dialog open={!!followUpOpen} onOpenChange={() => setFollowUpOpen(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="font-display flex items-center gap-2"><GitBranch className="size-4 text-violet-600" /> Add Follow-up Task</DialogTitle></DialogHeader>
          {followUpOpen && (() => {
            const parent = tasks.find(t => t.id === followUpOpen);
            return (
              <div className="space-y-4 pt-2">
                <div className="p-3 bg-violet-50 rounded-lg border border-violet-200">
                  <p className="text-xs text-violet-700 font-semibold">Following up on:</p>
                  <p className="text-sm font-medium mt-1">{parent?.taskNo} — {parent?.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Type: {parent?.taskType.replace("_", "/")} • {parent?.fileNo || "No file linked"}</p>
                </div>
                <div><Label>Follow-up Title</Label><Input value={fuTitle} onChange={(e) => setFuTitle(e.target.value)} placeholder="What needs to be done next?" className="mt-1" /></div>
                <div><Label>Description</Label><Textarea value={fuDesc} onChange={(e) => setFuDesc(e.target.value)} placeholder="Details..." className="mt-1" rows={2} /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Assign To</Label>
                    <Select value={fuAssignee} onValueChange={setFuAssignee}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select user" /></SelectTrigger>
                      <SelectContent>{users.filter((u) => u.isActive).map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Due Date</Label><Input type="date" value={fuDueDate} onChange={(e) => setFuDueDate(e.target.value)} className="mt-1" /></div>
                  <div>
                    <Label>Priority</Label>
                    <Select value={fuPriority} onValueChange={(v) => setFuPriority(v as TaskPriority)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleAddFollowUp} disabled={!fuTitle || !fuAssignee} className="w-full gold-gradient text-white border-0 hover:opacity-90">Create Follow-up Task</Button>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={!!historyOpen} onOpenChange={() => setHistoryOpen(null)}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display flex items-center gap-2"><Clock className="size-4" /> Task History & Remarks</DialogTitle></DialogHeader>
          {historyTask && (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2"><span className="text-xs font-mono text-gold bg-gold/10 px-1.5 py-0.5 rounded">{historyTask.taskNo}</span><p className="font-semibold text-sm">{historyTask.title}</p></div>
                <p className="text-xs text-muted-foreground mt-1">{historyTask.fileNo || "No file linked"}</p>
                {historyTask.parentTaskId && (() => { const p = tasks.find(t => t.id === historyTask.parentTaskId); return p ? <p className="text-xs text-violet-600 mt-1 flex items-center gap-1"><GitBranch className="size-3" /> Follow-up of <span className="font-mono font-semibold">{p.taskNo}</span> — {p.title}</p> : null; })()}
              </div>
              {/* Task Trail */}
              {historyTask.childTaskIds && historyTask.childTaskIds.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Follow-up Tasks Trail</h4>
                  <div className="space-y-2">
                    {historyTask.childTaskIds.map((cid) => {
                      const child = tasks.find(t => t.id === cid);
                      if (!child) return null;
                      return (
                        <div key={cid} className="flex items-center gap-2 p-2 rounded-lg bg-violet-50/50 border border-violet-100 text-xs">
                          <GitBranch className="size-3 text-violet-500 shrink-0" />
                          <span className="font-mono text-violet-700 font-semibold">{child.taskNo}</span>
                          <span className="truncate flex-1">{child.title}</span>
                          <span className="text-muted-foreground">→ {getUserName(child.assignedTo)}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${child.status === "completed" ? "bg-emerald-100 text-emerald-700" : child.status === "assigned" ? "bg-gray-100 text-gray-600" : "bg-amber-100 text-amber-700"}`}>{child.status.replace("_", " ")}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Status History</h4>
                <div className="space-y-2">
                  {historyTask.history.map((h, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <div className="size-2 rounded-full bg-gold mt-1.5 shrink-0" />
                      <div><p className="font-medium">{h.action}</p><p className="text-muted-foreground">{getUserName(h.user)} • {formatDateTime(h.date)}</p></div>
                    </div>
                  ))}
                </div>
              </div>
              {historyTask.remarks.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Remarks Log</h4>
                  <div className="space-y-2">
                    {historyTask.remarks.map((r, i) => (
                      <div key={i} className="p-2 rounded-lg bg-blue-50/50 border border-blue-100 text-xs">
                        <p className="font-medium text-foreground">{r.text}</p>
                        <p className="text-muted-foreground mt-0.5">{r.user} • {formatDateTime(r.date)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {historyTask.transferHistory.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Transfer History</h4>
                  <div className="space-y-2">
                    {historyTask.transferHistory.map((t, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <ArrowRightLeft className="size-3 mt-0.5 text-muted-foreground shrink-0" />
                        <div><p>{getUserName(t.fromUser)} → {getUserName(t.toUser)}</p><p className="text-muted-foreground">{t.reason} • {formatDateTime(t.date)}</p></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!transferOpen} onOpenChange={() => setTransferOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Transfer Task</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div><Label>Transfer To</Label><Select value={transferTo} onValueChange={setTransferTo}><SelectTrigger className="mt-1"><SelectValue placeholder="Select user" /></SelectTrigger><SelectContent>{users.filter((u) => u.isActive).map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Reason</Label><Textarea value={transferReason} onChange={(e) => setTransferReason(e.target.value)} className="mt-1" rows={2} /></div>
            <Button onClick={() => transferOpen && handleTransfer(transferOpen)} className="w-full gold-gradient text-white border-0">Transfer</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!remarkOpen} onOpenChange={() => setRemarkOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Add Remark / Feedback</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <Textarea value={remarkText} onChange={(e) => setRemarkText(e.target.value)} placeholder="Enter your remark or update..." rows={3} />
            <Button onClick={() => remarkOpen && handleRemark(remarkOpen)} className="w-full gold-gradient text-white border-0">Submit Remark</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
