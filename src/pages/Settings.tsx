import { useState } from "react";
import { UserPlus, Shield, Save, FileText, Trash2, Pencil, Lock, Download, Users, Hash, RefreshCw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useAuthStore } from "@/stores/authStore";
import { useTaskStore } from "@/stores/taskStore";
import { useFileStore } from "@/stores/fileStore";
import { useTenderStore } from "@/stores/tenderStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { FILE_NUMBER_MAP } from "@/constants/config";
import { generateId } from "@/lib/utils";
import type { User } from "@/types";

export default function Settings() {
  const { currentUser, users, addUser, updateUser, removeUser, changePassword, adminChangePassword, syncFromSheet, lastSynced } = useAuthStore();
  const { tasks, generalTasks } = useTaskStore();
  const { files, setContinueNoStart, continueNoStart } = useFileStore();
  const { tenders, contracts } = useTenderStore();
  const { fileFormatTemplate, tenderFormatTemplate, saveReminderUsers, customFileNumbers, vendors, setFileFormatTemplate, setTenderFormatTemplate, setSaveReminderUsers, addCustomFileNumber, removeCustomFileNumber, addVendor, importVendors, addActivityLog } = useSettingsStore();
  const { getUserName } = useAuthStore();

  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState<string | null>(null);
  const [adminPwOpen, setAdminPwOpen] = useState<string | null>(null);
  const [vendorEditOpen, setVendorEditOpen] = useState<string | null>(null);

  const [nuName, setNuName] = useState("");
  const [nuDesignation, setNuDesignation] = useState("");
  const [nuPassword, setNuPassword] = useState("");
  const [nuRole, setNuRole] = useState<"admin" | "user">("user");
  const [nuTender, setNuTender] = useState(false);

  const [euName, setEuName] = useState("");
  const [euDesignation, setEuDesignation] = useState("");
  const [euTender, setEuTender] = useState(false);

  const [adminNewPw, setAdminNewPw] = useState("");

  const [newFnCode, setNewFnCode] = useState("");
  const [newFnLabel, setNewFnLabel] = useState("");
  const [localFileFormat, setLocalFileFormat] = useState(fileFormatTemplate);
  const [localTenderFormat, setLocalTenderFormat] = useState(tenderFormatTemplate);

  const [newVendorName, setNewVendorName] = useState("");
  const [newVendorFirm, setNewVendorFirm] = useState("");
  const [newVendorCity, setNewVendorCity] = useState("");
  const [newVendorPhone, setNewVendorPhone] = useState("");
  const [newVendorEmail, setNewVendorEmail] = useState("");
  const [newVendorGst, setNewVendorGst] = useState("");

  const [evName, setEvName] = useState("");
  const [evFirm, setEvFirm] = useState("");
  const [evCity, setEvCity] = useState("");
  const [evPhone, setEvPhone] = useState("");
  const [evEmail, setEvEmail] = useState("");
  const [evGst, setEvGst] = useState("");

  const [continueNoCode, setContinueNoCode] = useState("");
  const [continueNoVal, setContinueNoVal] = useState("");

  // Local Excel sync state
  const [isSyncingToSheet, setIsSyncingToSheet] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleReloadLocalData = async () => {
    setIsSyncingToSheet(true);
    setSyncMessage(null);

    try {
      console.log("Reloading data from local Excel...");
      await syncFromSheet();
      useTaskStore.getState().loadFromSheetData();
      useFileStore.getState().loadFromSheetData();
      useTenderStore.getState().loadFromSheetData();
      setSyncMessage({ type: "success", text: "Data reloaded from local Excel successfully." });
    } catch (error) {
      console.error("Reload error:", error);
      setSyncMessage({ type: "error", text: "Failed to reload data from local Excel." });
    } finally {
      setIsSyncingToSheet(false);
    }
  };

  const isAdmin = currentUser?.role === "admin";
  if (!isAdmin) {
    return (
      <div className="max-w-4xl">
        <div className="bg-white rounded-xl border p-6 mb-6">
          <div className="flex items-center gap-2 mb-4"><Shield className="size-5 text-muted-foreground" /><h3 className="font-display font-semibold">User Settings</h3></div>
          <PasswordChangeSection currentUser={currentUser} changePassword={changePassword} />
        </div>
      </div>
    );
  }

  const handleAddUser = () => {
    if (!nuName || !nuPassword) return;
    const newUser: User = { id: generateId(), name: nuName, designation: nuDesignation, role: nuRole, password: nuPassword, canCreateTender: nuTender, isActive: true };
    addUser(newUser);
    addActivityLog({ userId: currentUser.id, userName: currentUser.name, action: "Added user", module: "settings", details: `User: ${nuName}` });
    setAddUserOpen(false);
    setNuName(""); setNuDesignation(""); setNuPassword("");
  };

  const openEditUser = (userId: string) => {
    const u = users.find((x) => x.id === userId);
    if (!u) return;
    setEuName(u.name); setEuDesignation(u.designation); setEuTender(u.canCreateTender);
    setEditUserOpen(userId);
  };

  const handleEditUser = () => {
    if (!editUserOpen) return;
    updateUser(editUserOpen, { name: euName, designation: euDesignation, canCreateTender: euTender });
    setEditUserOpen(null);
  };

  const handleAdminPwChange = () => {
    if (!adminPwOpen || !adminNewPw) return;
    adminChangePassword(adminPwOpen, adminNewPw);
    addActivityLog({ userId: currentUser.id, userName: currentUser.name, action: "Changed user password", module: "settings", details: `User: ${getUserName(adminPwOpen)}` });
    setAdminPwOpen(null);
    setAdminNewPw("");
  };

  const handleAddFileNumber = () => {
    if (!newFnCode || !newFnLabel) return;
    addCustomFileNumber(newFnCode, newFnLabel);
    setNewFnCode(""); setNewFnLabel("");
  };

  const handleSetContinueNo = () => {
    if (!continueNoCode || !continueNoVal) return;
    setContinueNoStart(continueNoCode, parseInt(continueNoVal));
    addActivityLog({ userId: currentUser.id, userName: currentUser.name, action: "Set continue no start", module: "settings", details: `Code: ${continueNoCode}, Start: ${continueNoVal}` });
    setContinueNoCode(""); setContinueNoVal("");
  };

  const downloadSampleFile = (type: "tasks" | "files" | "vendors" | "tenders") => {
    const content = generateSampleExcel(type);
    const blob = new Blob([content], { type: "text/tab-separated-values" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cnci_sample_${type}.tsv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (type === "vendors") {
        const lines = text.split("\n").slice(1).filter((l) => l.trim());
        const newVendors = lines.map((line) => {
          const cols = line.split("\t");
          return { id: generateId(), name: cols[0]?.trim() || "", firmName: cols[1]?.trim() || cols[0]?.trim() || "", city: cols[2]?.trim(), address: cols[2]?.trim(), phone: cols[3]?.trim(), email: cols[4]?.trim(), gstNo: cols[5]?.trim(), addedBy: currentUser.id, addedAt: new Date().toISOString() };
        }).filter((v) => v.name);
        importVendors(newVendors);
        addActivityLog({ userId: currentUser.id, userName: currentUser.name, action: "Imported vendors", module: "settings", details: `${newVendors.length} vendors imported` });
      } else if (type === "json_backup") {
        try {
          const data = JSON.parse(text);
          if (data.tasks) localStorage.setItem("cnci-tasks", JSON.stringify({ state: { tasks: data.tasks, generalTasks: data.generalTasks || [] } }));
          if (data.files) localStorage.setItem("cnci-files", JSON.stringify({ state: { files: data.files, poCounter: data.poCounter || {} } }));
          if (data.tenders) localStorage.setItem("cnci-tenders", JSON.stringify({ state: { tenders: data.tenders, contracts: data.contracts || [] } }));
          window.location.reload();
        } catch { alert("Invalid JSON file"); }
      }
    };
    reader.readAsText(file);
  };

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

  const exportCSV = (type: "tasks" | "files" | "tenders" | "contracts" | "vendors") => {
    let csv = "";
    if (type === "tasks") {
      csv = "Title,Type,Assigned To,Status,Created,Due Date,File No\n";
      tasks.forEach((t) => { csv += `"${t.title}","${t.taskType}","${getUserName(t.assignedTo)}","${t.status}","${t.createdAt.split("T")[0]}","${t.dueDate || ""}","${t.fileNo || ""}"\n`; });
    } else if (type === "files") {
      csv = "File No,Campus,Subject,Supplier,Amount,PO No,PO Date,Created\n";
      files.forEach((f) => { csv += `"${f.fullFileNo}","${f.campus === "N" ? "New Town" : "Hazra"}","${f.subject}","${f.supplierName}","${f.amount}","${f.poReversed ? "REVERSED" : f.poNo}","${f.poDate || ""}","${f.createdAt.split("T")[0]}"\n`; });
    } else if (type === "tenders") {
      csv = "File No,Subject,Campus,Stage,Indenter,Department,GeM PO,Manual PO,Created\n";
      tenders.forEach((t) => { csv += `"${t.fullFileNo}","${t.subject}","${t.campus === "N" ? "New Town" : "Hazra"}","${t.currentStage}","${t.indenterName}","${t.indenterDept}","${t.gemPoNo || ""}","${t.manualPoNo || ""}","${t.createdAt.split("T")[0]}"\n`; });
    } else if (type === "contracts") {
      csv = "File No,Subject,Type,Awarded To,Start,End,Amount,Campus\n";
      contracts.forEach((c) => { csv += `"${c.tenderFileNo}","${c.subject}","${c.type}","${c.awardedTo}","${c.startDate}","${c.endDate}","${c.price}","${c.campus === "N" ? "New Town" : "Hazra"}"\n`; });
    } else if (type === "vendors") {
      csv = "Name,Firm Name,City,Phone,Email,GST No\n";
      vendors.forEach((v) => { csv += `"${v.name}","${v.firmName || ""}","${v.city || ""}","${v.phone || ""}","${v.email || ""}","${v.gstNo || ""}"\n`; });
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cnci_${type}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddVendor = () => {
    if (!newVendorName) return;
    addVendor({ id: generateId(), name: newVendorName, firmName: newVendorFirm || newVendorName, city: newVendorCity, address: newVendorCity, phone: newVendorPhone, email: newVendorEmail, gstNo: newVendorGst, addedBy: currentUser.id, addedAt: new Date().toISOString() });
    setNewVendorName(""); setNewVendorFirm(""); setNewVendorCity(""); setNewVendorPhone(""); setNewVendorEmail(""); setNewVendorGst("");
  };

  const openVendorEdit = (vendorId: string) => {
    const v = vendors.find((x) => x.id === vendorId);
    if (!v) return;
    setEvName(v.name); setEvFirm(v.firmName || ""); setEvCity(v.city || ""); setEvPhone(v.phone || ""); setEvEmail(v.email || ""); setEvGst(v.gstNo || "");
    setVendorEditOpen(vendorId);
  };

  const handleEditVendor = () => {
    if (!vendorEditOpen) return;
    const { updateVendor } = useSettingsStore.getState();
    updateVendor(vendorEditOpen, { name: evName, firmName: evFirm, city: evCity, phone: evPhone, email: evEmail, gstNo: evGst });
    setVendorEditOpen(null);
  };

  return (
    <div className="max-w-4xl">
      <Tabs defaultValue="users">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="users" title="Manage system users and their roles">Users</TabsTrigger>
          <TabsTrigger value="password" title="Change passwords for users">Password</TabsTrigger>
          <TabsTrigger value="fileformat" title="Configure file numbering format and custom codes">File Formats</TabsTrigger>
          <TabsTrigger value="vendors" title="Manage vendor/supplier master list">Vendor Master</TabsTrigger>
          <TabsTrigger value="permissions" title="Set user permissions for tender creation and data save reminders">Permissions</TabsTrigger>
          <TabsTrigger value="data" title="Import and export data in various formats">Data Management</TabsTrigger>
        </TabsList>

        {/* USERS */}
        <TabsContent value="users" className="space-y-4 mt-0">
          <div className="flex justify-between items-center">
            <h3 className="font-display font-semibold">Users ({users.filter((u) => u.isActive).length})</h3>
            <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
              <DialogTrigger asChild><Button size="sm" className="gap-1.5 gold-gradient text-white border-0 hover:opacity-90" title="Add a new user to the system"><UserPlus className="size-4" /> Add User</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-display">Add New User</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="col-span-2"><Label>Full Name</Label><Input value={nuName} onChange={(e) => setNuName(e.target.value)} className="mt-1" /></div>
                  <div><Label>Designation</Label><Input value={nuDesignation} onChange={(e) => setNuDesignation(e.target.value)} className="mt-1" /></div>
                  <div><Label>Password</Label><Input value={nuPassword} onChange={(e) => setNuPassword(e.target.value)} className="mt-1" /></div>
                  <div><Label>Role</Label><Select value={nuRole} onValueChange={(v) => setNuRole(v as "admin" | "user")}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="admin">Admin</SelectItem><SelectItem value="user">User</SelectItem></SelectContent></Select></div>
                  <div className="flex items-center gap-2 pt-6"><Switch checked={nuTender} onCheckedChange={setNuTender} /><Label className="text-sm">Can Create Tenders</Label></div>
                  <div className="col-span-2"><Button onClick={handleAddUser} className="w-full gold-gradient text-white border-0">Add User</Button></div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Designation</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Actions</th>
              </tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className={`border-b ${!u.isActive ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.designation}</td>
                    <td className="px-4 py-3"><span className={`text-xs font-semibold px-2 py-0.5 rounded ${u.role === "admin" ? "bg-gold/20 text-gold-dark" : "bg-gray-100 text-gray-600"}`}>{u.role}</span></td>
                    <td className="px-4 py-3">{u.isActive ? <span className="text-xs text-green-600 font-medium">Active</span> : <span className="text-xs text-red-600">Inactive</span>}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditUser(u.id)} title="Edit user name, designation, and tender permission"><Pencil className="size-3.5" /></Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setAdminPwOpen(u.id); setAdminNewPw(""); }} title="Change this user's password"><Lock className="size-3.5" /></Button>
                        {u.id !== currentUser?.id && u.isActive && <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => removeUser(u.id)} title="Deactivate this user"><Trash2 className="size-3.5" /></Button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* PASSWORD */}
        <TabsContent value="password" className="space-y-4 mt-0">
          <PasswordChangeSection currentUser={currentUser} changePassword={changePassword} />
        </TabsContent>

        {/* FILE FORMAT */}
        <TabsContent value="fileformat" className="space-y-6 mt-0">
          <div className="bg-white rounded-xl border p-5 space-y-4">
            <h3 className="font-display font-semibold flex items-center gap-2"><FileText className="size-4 text-gold" /> File Number Format</h3>
            <div><Label className="text-xs text-muted-foreground">Variables: {"{campus}"}, {"{fileNo}"}, {"{type}"}, {"{fiscalYear}"}, {"{continueNo}"}</Label><Input value={localFileFormat} onChange={(e) => setLocalFileFormat(e.target.value)} className="mt-1 font-mono text-xs" /></div>
            <Button size="sm" onClick={() => setFileFormatTemplate(localFileFormat)} className="gap-1.5" title="Save the file number format template"><Save className="size-3.5" /> Save Format</Button>
          </div>
          <div className="bg-white rounded-xl border p-5 space-y-4">
            <h3 className="font-display font-semibold flex items-center gap-2"><FileText className="size-4 text-gold" /> Tender File Format</h3>
            <div><Label className="text-xs text-muted-foreground">Variables: {"{campus}"}, {"{fileNo}"}, {"{type}"}, {"{fiscalYear}"}, {"{name}"}</Label><Input value={localTenderFormat} onChange={(e) => setLocalTenderFormat(e.target.value)} className="mt-1 font-mono text-xs" /></div>
            <Button size="sm" onClick={() => setTenderFormatTemplate(localTenderFormat)} className="gap-1.5" title="Save the tender file format template"><Save className="size-3.5" /> Save Format</Button>
          </div>
          <div className="bg-white rounded-xl border p-5 space-y-4">
            <h3 className="font-display font-semibold flex items-center gap-2"><Hash className="size-4 text-gold" /> Continue No Starting Number</h3>
            <p className="text-xs text-muted-foreground">Set the starting continue number for each file type. New files will start from this number.</p>
            <div className="flex gap-2 items-end">
              <div>
                <Label className="text-xs">File Number Code</Label>
                <Select value={continueNoCode} onValueChange={setContinueNoCode}>
                  <SelectTrigger className="mt-1 w-48"><SelectValue placeholder="Select code" /></SelectTrigger>
                  <SelectContent>{Object.entries(FILE_NUMBER_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{k} — {v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Start From No</Label>
                <Input type="number" value={continueNoVal} onChange={(e) => setContinueNoVal(e.target.value)} placeholder="e.g., 50" className="mt-1 w-28" />
              </div>
              <Button size="sm" onClick={handleSetContinueNo} className="gold-gradient text-white border-0" title="Set the starting continue number for new files of this type">Set</Button>
            </div>
            {Object.keys(continueNoStart || {}).length > 0 && (
              <div className="space-y-1 mt-2">{Object.entries(continueNoStart || {}).map(([code, start]) => (
                <p key={code} className="text-xs text-muted-foreground">Code <strong>{code}</strong> starts from <strong>{start}</strong></p>
              ))}</div>
            )}
          </div>
          <div className="bg-white rounded-xl border p-5 space-y-4">
            <h3 className="font-display font-semibold">Custom File Numbers</h3>
            <div className="flex gap-2"><Input value={newFnCode} onChange={(e) => setNewFnCode(e.target.value)} placeholder="Code (e.g., 400)" className="w-24" /><Input value={newFnLabel} onChange={(e) => setNewFnLabel(e.target.value)} placeholder="Label" className="flex-1" /><Button size="sm" onClick={handleAddFileNumber} className="gold-gradient text-white border-0">Add</Button></div>
            {customFileNumbers.length > 0 && <div className="space-y-1">{customFileNumbers.map((fn) => (<div key={fn.code} className="flex items-center justify-between py-2 px-3 rounded bg-gray-50"><span className="text-sm"><strong>{fn.code}</strong> — {fn.label}</span><Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500" onClick={() => removeCustomFileNumber(fn.code)}><Trash2 className="size-3" /></Button></div>))}</div>}
          </div>
        </TabsContent>

        {/* VENDOR MASTER */}
        <TabsContent value="vendors" className="space-y-4 mt-0">
          <div className="bg-white rounded-xl border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold flex items-center gap-2"><Users className="size-4 text-gold" /> Vendor Master ({vendors.length})</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => downloadSampleFile("vendors")} title="Download a sample vendor import file"><Download className="size-3" /> Sample</Button>
                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs cursor-pointer hover:bg-gray-50" title="Import vendor list from TSV/CSV file">
                  <Upload className="size-3" /> Import
                  <input type="file" accept=".tsv,.csv,.txt" className="hidden" onChange={(e) => handleImportFile(e, "vendors")} />
                </label>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => exportCSV("vendors")} title="Export vendor list as CSV"><Download className="size-3" /> Export</Button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Input value={newVendorName} onChange={(e) => setNewVendorName(e.target.value)} placeholder="Vendor name *" />
              <Input value={newVendorFirm} onChange={(e) => setNewVendorFirm(e.target.value)} placeholder="Firm name" />
              <Input value={newVendorCity} onChange={(e) => setNewVendorCity(e.target.value)} placeholder="City" />
            </div>
            <div className="grid grid-cols-4 gap-2 items-end">
              <Input value={newVendorPhone} onChange={(e) => setNewVendorPhone(e.target.value)} placeholder="Mobile No" />
              <Input value={newVendorEmail} onChange={(e) => setNewVendorEmail(e.target.value)} placeholder="Email ID" />
              <Input value={newVendorGst} onChange={(e) => setNewVendorGst(e.target.value)} placeholder="GST No" />
              <Button size="sm" onClick={handleAddVendor} className="gold-gradient text-white border-0">Add Vendor</Button>
            </div>
            <div className="max-h-72 overflow-y-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b sticky top-0"><th className="text-left px-3 py-2 font-semibold text-xs">Name</th><th className="text-left px-3 py-2 font-semibold text-xs">Firm</th><th className="text-left px-3 py-2 font-semibold text-xs">City</th><th className="text-left px-3 py-2 font-semibold text-xs">Phone</th><th className="text-left px-3 py-2 font-semibold text-xs">Email</th><th className="text-left px-3 py-2 font-semibold text-xs">GST</th><th className="w-8"></th></tr></thead>
                <tbody>{vendors.map((v) => (
                  <tr key={v.id} className="border-b hover:bg-gray-50/50">
                    <td className="px-3 py-1.5">{v.name}</td>
                    <td className="px-3 py-1.5 text-muted-foreground text-xs">{v.firmName || "—"}</td>
                    <td className="px-3 py-1.5 text-muted-foreground text-xs">{v.city || "—"}</td>
                    <td className="px-3 py-1.5 text-muted-foreground text-xs">{v.phone || "—"}</td>
                    <td className="px-3 py-1.5 text-muted-foreground text-xs">{v.email || "—"}</td>
                    <td className="px-3 py-1.5 text-muted-foreground text-xs">{v.gstNo || "—"}</td>
                    <td className="px-2"><Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => openVendorEdit(v.id)} title="Edit vendor details"><Pencil className="size-3" /></Button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* PERMISSIONS */}
        <TabsContent value="permissions" className="space-y-4 mt-0">
          <div className="bg-white rounded-xl border p-5 space-y-4">
            <h3 className="font-display font-semibold">Tender Creation Permission</h3>
            <p className="text-xs text-muted-foreground">Toggle which users can create new tender cases.</p>
            <div className="space-y-2">{users.filter((u) => u.isActive).map((u) => (<div key={u.id} className="flex items-center justify-between py-2"><span className="text-sm">{u.name} <span className="text-xs text-muted-foreground">({u.designation})</span></span><Switch checked={u.canCreateTender} onCheckedChange={(v) => updateUser(u.id, { canCreateTender: v })} /></div>))}</div>
          </div>
          <div className="bg-white rounded-xl border p-5 space-y-4">
            <h3 className="font-display font-semibold">Data Scan Permission</h3>
            <p className="text-xs text-muted-foreground">Toggle which users can mark files as &quot;Data Scanned&quot; after PO creation.</p>
            <div className="space-y-2">{users.filter((u) => u.isActive).map((u) => (<div key={u.id} className="flex items-center justify-between py-2"><span className="text-sm">{u.name} <span className="text-xs text-muted-foreground">({u.designation})</span></span><Switch checked={u.canScanData || u.role === "admin"} disabled={u.role === "admin"} onCheckedChange={(v) => updateUser(u.id, { canScanData: v })} /></div>))}</div>
          </div>
          <div className="bg-white rounded-xl border p-5 space-y-4">
            <h3 className="font-display font-semibold">Save Data Reminder Recipients</h3>
            <p className="text-xs text-muted-foreground">These users will receive end-of-month data backup reminders.</p>
            <div className="space-y-2">{users.filter((u) => u.isActive).map((u) => (<div key={u.id} className="flex items-center justify-between py-2"><span className="text-sm">{u.name}</span><Switch checked={saveReminderUsers.includes(u.id)} onCheckedChange={(v) => { if (v) setSaveReminderUsers([...saveReminderUsers, u.id]); else setSaveReminderUsers(saveReminderUsers.filter((id) => id !== u.id)); }} /></div>))}</div>
          </div>
        </TabsContent>

        {/* DATA MANAGEMENT */}
        <TabsContent value="data" className="space-y-4 mt-0">
          {/* Local Excel Data Section */}
          <div className="bg-white rounded-xl border p-5 space-y-4">
            <h3 className="font-display font-semibold flex items-center gap-2"><Download className="size-4 text-gold" /> Local Excel Data</h3>
            <p className="text-xs text-muted-foreground">Load application data from the local Excel file at public/CNCIStoreManager.xlsx.</p>
            
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3">
                  <FileText className="size-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Local Excel data source</p>
                    <p className="text-xs text-muted-foreground">Last loaded: {lastSynced ? new Date(lastSynced).toLocaleString() : "Never"}</p>
                  </div>
                </div>
              </div>
              <Button 
                onClick={handleReloadLocalData} 
                disabled={isSyncingToSheet}
                className="gap-2"
              >
                {isSyncingToSheet ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="size-4 animate-spin" />
                    Reloading...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Download className="size-4" />
                    Reload from Excel
                  </span>
                )}
              </Button>
            </div>

            {syncMessage && (
              <div className={`p-3 rounded-lg text-sm ${syncMessage.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {syncMessage.text}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border p-5 space-y-4">
            <h3 className="font-display font-semibold flex items-center gap-2"><Download className="size-4 text-gold" /> Download Sample Templates</h3>
            <p className="text-xs text-muted-foreground">Download sample files, fill data, and upload back to import.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(["tasks", "files", "vendors", "tenders"] as const).map((t) => (
                <Button key={t} variant="outline" size="sm" className="gap-1.5 capitalize text-xs" onClick={() => downloadSampleFile(t)} title={`Download a sample ${t} template to fill and re-upload`}><Download className="size-3" /> {t} Template</Button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border p-5 space-y-4">
            <h3 className="font-display font-semibold flex items-center gap-2"><Upload className="size-4 text-gold" /> Import Data</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Import Full Backup (JSON)</Label><Input type="file" accept=".json" className="mt-1" onChange={(e) => handleImportFile(e, "json_backup")} /></div>
              <div><Label className="text-xs">Import Vendor List (TSV/CSV)</Label><Input type="file" accept=".tsv,.csv,.txt" className="mt-1" onChange={(e) => handleImportFile(e, "vendors")} /></div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-5 space-y-4">
            <h3 className="font-display font-semibold flex items-center gap-2"><Download className="size-4 text-gold" /> Export Data</h3>
            <div className="space-y-3">
              <div><Label className="text-xs font-semibold text-muted-foreground mb-2 block">Full Backup (JSON — for re-import)</Label><Button onClick={exportJSON} className="w-full gap-2 gold-gradient text-white border-0 hover:opacity-90" title="Download complete system backup in JSON format"><Download className="size-4" /> Download Complete Backup</Button></div>
              <div><Label className="text-xs font-semibold text-muted-foreground mb-2 block">Export as CSV (Excel-compatible)</Label>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">{(["tasks", "files", "tenders", "contracts", "vendors"] as const).map((t) => (<Button key={t} variant="outline" size="sm" className="gap-1.5 capitalize text-xs" onClick={() => exportCSV(t)} title={`Export ${t} data as CSV file`}><Download className="size-3" /> {t}</Button>))}</div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={!!editUserOpen} onOpenChange={() => setEditUserOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Edit User</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="col-span-2"><Label>Name</Label><Input value={euName} onChange={(e) => setEuName(e.target.value)} className="mt-1" /></div>
            <div><Label>Designation</Label><Input value={euDesignation} onChange={(e) => setEuDesignation(e.target.value)} className="mt-1" /></div>
            <div className="flex items-center gap-2 pt-4"><Switch checked={euTender} onCheckedChange={setEuTender} /><Label className="text-sm">Can Create Tenders</Label></div>
            <div className="col-span-2"><Button onClick={handleEditUser} className="w-full gold-gradient text-white border-0">Save Changes</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Password Change Dialog */}
      <Dialog open={!!adminPwOpen} onOpenChange={() => setAdminPwOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Change Password for {adminPwOpen ? getUserName(adminPwOpen) : ""}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div><Label>New Password</Label><Input type="password" value={adminNewPw} onChange={(e) => setAdminNewPw(e.target.value)} className="mt-1" /></div>
            <Button onClick={handleAdminPwChange} className="w-full gold-gradient text-white border-0">Change Password</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Vendor Dialog */}
      <Dialog open={!!vendorEditOpen} onOpenChange={() => setVendorEditOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Edit Vendor</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="col-span-2"><Label>Vendor Name</Label><Input value={evName} onChange={(e) => setEvName(e.target.value)} className="mt-1" /></div>
            <div><Label>Firm Name</Label><Input value={evFirm} onChange={(e) => setEvFirm(e.target.value)} className="mt-1" /></div>
            <div><Label>City</Label><Input value={evCity} onChange={(e) => setEvCity(e.target.value)} className="mt-1" /></div>
            <div><Label>Mobile No</Label><Input value={evPhone} onChange={(e) => setEvPhone(e.target.value)} className="mt-1" /></div>
            <div><Label>Email ID</Label><Input value={evEmail} onChange={(e) => setEvEmail(e.target.value)} className="mt-1" /></div>
            <div className="col-span-2"><Label>GST No</Label><Input value={evGst} onChange={(e) => setEvGst(e.target.value)} className="mt-1" /></div>
            <div className="col-span-2"><Button onClick={handleEditVendor} className="w-full gold-gradient text-white border-0">Save Vendor</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PasswordChangeSection({ currentUser }: { currentUser: any; changePassword?: any }) {
  const { setPasswordDirect } = useAuthStore();
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = () => {
    setError(""); setSuccess(false);
    if (!newPw || !confirmPw) { setError("Both fields are required"); return; }
    if (newPw !== confirmPw) { setError("Passwords do not match"); return; }
    if (newPw.length < 4) { setError("Password must be at least 4 characters"); return; }
    setPasswordDirect(currentUser.id, newPw);
    setSuccess(true); setNewPw(""); setConfirmPw("");
  };

  return (
    <div className="bg-white rounded-xl border p-5 space-y-4">
      <h3 className="font-display font-semibold flex items-center gap-2"><Lock className="size-4 text-gold" /> Change Your Password</h3>
      <div className="grid grid-cols-2 gap-3 max-w-md">
        <div><Label>New Password</Label><Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="mt-1" placeholder="Enter new password" /></div>
        <div><Label>Re-enter New Password</Label><Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="mt-1" placeholder="Confirm new password" /></div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {success && <p className="text-xs text-green-600">Password changed successfully!</p>}
      <Button size="sm" onClick={handleChange} className="gold-gradient text-white border-0">Change Password</Button>
    </div>
  );
}
