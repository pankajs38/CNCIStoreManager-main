import { useState, useRef } from "react";
import {
  Palette,
  Image,
  LayoutGrid,
  Bell,
  GripVertical,
  Plus,
  Trash2,
  Check,
  X,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Upload,
  Shield,
  Volume2,
  VolumeX,
  Sparkles,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/authStore";
import { useFileStore } from "@/stores/fileStore";
import { useTenderStore } from "@/stores/tenderStore";
import { useSettingsStore, THEME_PRESETS, type CustomReminder } from "@/stores/settingsStore";
import { generateId, playNotificationSound } from "@/lib/utils";

const WIDGET_OPTIONS = [
  { key: "taskSummary", label: "Task Summary Bar" },
  { key: "activeTenders", label: "Active Tenders" },
  { key: "recentFiles", label: "Recent Files" },
  { key: "quickStats", label: "Quick Stats" },
  { key: "expiringContracts", label: "Expiring Contracts" },
  { key: "avgDays", label: "Avg. Completion Days" },
];

export default function Customisation() {
  const { currentUser } = useAuthStore();
  const { files } = useFileStore();
  const { tenders, contracts } = useTenderStore();
  const isAdmin = currentUser?.role === "admin";
  const {
    pageColors, pageBackgrounds, tabOrder, homeDashboardWidgets, customReminders, notificationSoundEnabled,
    setPageColor, setPageBackground, removePageBackground, setTabOrder, toggleTabVisibility, setHomeDashboardWidgets,
    addCustomReminder, updateCustomReminder, removeCustomReminder, loginBgImage, setLoginBgImage,
    setNotificationSoundEnabled, applyThemePreset,
  } = useSettingsStore();

  const [reminderOpen, setReminderOpen] = useState(false);
  const [newRem, setNewRem] = useState({ title: "", message: "", date: "", linkedType: "" as string, linkedId: "", linkedLabel: "" });

  const handleAddReminder = () => {
    if (!newRem.title || !newRem.date) return;
    const reminder: CustomReminder = {
      id: generateId(), title: newRem.title, message: newRem.message, date: newRem.date,
      createdBy: currentUser?.id || "", createdByName: currentUser?.name || "", isCompleted: false,
      linkedType: (newRem.linkedType as any) || undefined, linkedId: newRem.linkedId || undefined, linkedLabel: newRem.linkedLabel || undefined,
    };
    addCustomReminder(reminder);
    setNewRem({ title: "", message: "", date: "", linkedType: "", linkedId: "", linkedLabel: "" });
    setReminderOpen(false);
  };

  const moveTab = (index: number, direction: "up" | "down") => {
    const newOrder = [...tabOrder];
    const swapIdx = direction === "up" ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= newOrder.length) return;
    const tempOrder = newOrder[index].order;
    newOrder[index] = { ...newOrder[index], order: newOrder[swapIdx].order };
    newOrder[swapIdx] = { ...newOrder[swapIdx], order: tempOrder };
    newOrder.sort((a, b) => a.order - b.order);
    setTabOrder(newOrder);
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.onerror = reject; reader.readAsDataURL(file); });
  };

  const handleBgUpload = async (pageKey: string, file: File | null) => { if (!file) return; const base64 = await convertToBase64(file); setPageBackground(pageKey, base64); };
  const handleLoginBgUpload = async (file: File | null) => { if (!file) return; const base64 = await convertToBase64(file); setLoginBgImage(base64); };

  // Link options
  const linkOptions = [
    ...files.map((f) => ({ type: "file" as const, id: f.id, label: `File: ${f.fullFileNo}` })),
    ...tenders.map((t) => ({ type: "tender" as const, id: t.id, label: `Tender: ${t.subject}` })),
    ...contracts.map((c) => ({ type: "contract" as const, id: c.id, label: `${c.type}: ${c.subject}` })),
  ];

  if (!isAdmin) {
    return (
      <div className="max-w-4xl">
        <div className="bg-white rounded-xl border p-6 mb-6">
          <div className="flex items-center gap-2 mb-4"><Shield className="size-5 text-muted-foreground" /><h3 className="font-display font-semibold">Customisation — Limited Access</h3></div>
          <p className="text-sm text-muted-foreground mb-6">Only TO (S&P) can modify page colors, backgrounds, and tab order. You can create and manage reminders below.</p>
        </div>
        <ReminderSection customReminders={customReminders} currentUser={currentUser} reminderOpen={reminderOpen} setReminderOpen={setReminderOpen} newRem={newRem} setNewRem={setNewRem} handleAddReminder={handleAddReminder} updateCustomReminder={updateCustomReminder} removeCustomReminder={removeCustomReminder} linkOptions={linkOptions} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <Tabs defaultValue="themes">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="themes" className="gap-1.5"><Sparkles className="size-3.5" /> Themes</TabsTrigger>
          <TabsTrigger value="colors" className="gap-1.5"><Palette className="size-3.5" /> Colors</TabsTrigger>
          <TabsTrigger value="backgrounds" className="gap-1.5"><Image className="size-3.5" /> Backgrounds</TabsTrigger>
          <TabsTrigger value="tabs" className="gap-1.5"><LayoutGrid className="size-3.5" /> Tabs</TabsTrigger>
          <TabsTrigger value="home" className="gap-1.5"><LayoutGrid className="size-3.5" /> Home</TabsTrigger>
          <TabsTrigger value="sound" className="gap-1.5"><Volume2 className="size-3.5" /> Sound</TabsTrigger>
          <TabsTrigger value="reminders" className="gap-1.5"><Bell className="size-3.5" /> Reminders</TabsTrigger>
        </TabsList>

        {/* THEME PRESETS */}
        <TabsContent value="themes" className="mt-0 space-y-4">
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-display font-semibold mb-1 flex items-center gap-2"><Sparkles className="size-4 text-gold" /> Theme Presets</h3>
            <p className="text-xs text-muted-foreground mb-4">Apply a coordinated color scheme across all pages with one click.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {THEME_PRESETS.map((preset) => {
                const sample = preset.colors.dashboard;
                return (
                  <button key={preset.name} className="p-4 rounded-lg border-2 border-gray-200 hover:border-gold transition-colors text-left" onClick={() => applyThemePreset(preset)}>
                    <div className="flex items-center gap-2 mb-2">
                      {sample.bgColor && <div className="size-5 rounded-full border" style={{ backgroundColor: sample.bgColor }} />}
                      {sample.textColor && <div className="size-5 rounded-full border" style={{ backgroundColor: sample.textColor }} />}
                      {sample.accentColor && <div className="size-5 rounded-full border" style={{ backgroundColor: sample.accentColor }} />}
                      {!sample.bgColor && <div className="size-5 rounded-full border-2 border-dashed border-gray-300" />}
                    </div>
                    <p className="text-sm font-semibold">{preset.name}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* PAGE COLORS */}
        <TabsContent value="colors" className="mt-0 space-y-4">
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-display font-semibold mb-1 flex items-center gap-2"><Palette className="size-4 text-gold" /> Page Color Customisation</h3>
            <p className="text-xs text-muted-foreground mb-4">Set custom background, text, and accent colors for each page.</p>
            <div className="space-y-4">
              {pageColors.map((page) => (
                <div key={page.pageKey} className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold">{page.label}</span>
                    {(page.bgColor || page.textColor || page.accentColor) && <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground" onClick={() => setPageColor(page.pageKey, { bgColor: "", textColor: "", accentColor: "" })}><RotateCcw className="size-3" /> Reset</Button>}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {(["bgColor", "textColor", "accentColor"] as const).map((key) => {
                      const labels = { bgColor: "Background", textColor: "Text", accentColor: "Accent" };
                      const defaults = { bgColor: "#f8f7f4", textColor: "#1a2744", accentColor: "#c28a30" };
                      return (
                        <div key={key}>
                          <Label className="text-xs text-muted-foreground">{labels[key]}</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <input type="color" value={page[key] || defaults[key]} onChange={(e) => setPageColor(page.pageKey, { [key]: e.target.value })} className="w-8 h-8 rounded border cursor-pointer" />
                            <Input value={page[key]} onChange={(e) => setPageColor(page.pageKey, { [key]: e.target.value })} placeholder={defaults[key]} className="h-8 text-xs font-mono" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* BACKGROUNDS */}
        <TabsContent value="backgrounds" className="mt-0 space-y-4">
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-display font-semibold mb-1 flex items-center gap-2"><Image className="size-4 text-gold" /> Login Page Background</h3>
            <div className="flex items-center gap-4 mt-3">
              <label className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-gray-300 hover:border-gold cursor-pointer transition-colors"><Upload className="size-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Upload Image</span><input type="file" accept="image/*" className="hidden" onChange={(e) => handleLoginBgUpload(e.target.files?.[0] || null)} /></label>
              {loginBgImage && <Button variant="ghost" size="sm" className="text-red-500 gap-1.5" onClick={() => setLoginBgImage("")}><Trash2 className="size-3.5" /> Remove</Button>}
            </div>
            {loginBgImage && <div className="mt-3 rounded-lg overflow-hidden border h-32 w-full"><img src={loginBgImage} alt="Login preview" className="w-full h-full object-cover" /></div>}
          </div>
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-display font-semibold mb-1 flex items-center gap-2"><Image className="size-4 text-gold" /> Page Backgrounds</h3>
            <div className="space-y-4 mt-3">
              {pageColors.map((page) => (
                <div key={page.pageKey} className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">{page.label}</span>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs cursor-pointer hover:bg-gray-100"><Upload className="size-3" />Upload<input type="file" accept="image/*" className="hidden" onChange={(e) => handleBgUpload(page.pageKey, e.target.files?.[0] || null)} /></label>
                      {pageBackgrounds[page.pageKey] && <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => removePageBackground(page.pageKey)}><Trash2 className="size-3.5" /></Button>}
                    </div>
                  </div>
                  {pageBackgrounds[page.pageKey] && <div className="rounded-md overflow-hidden border h-20"><img src={pageBackgrounds[page.pageKey]} alt={page.label} className="w-full h-full object-cover opacity-60" /></div>}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* TABS */}
        <TabsContent value="tabs" className="mt-0 space-y-4">
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-display font-semibold mb-4 flex items-center gap-2"><LayoutGrid className="size-4 text-gold" /> Tab Arrangement</h3>
            <div className="space-y-2">
              {[...tabOrder].sort((a, b) => a.order - b.order).map((tab, idx) => {
                const isProtected = tab.key === "settings" || tab.key === "customisation";
                return (
                  <div key={tab.key} className={`flex items-center gap-3 p-3 rounded-lg border ${tab.visible ? "bg-white" : "bg-gray-50 opacity-60"}`}>
                    <GripVertical className="size-4 text-muted-foreground shrink-0" />
                    <span className={`flex-1 text-sm font-medium ${!tab.visible ? "line-through text-muted-foreground" : ""}`}>{tab.label}</span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={idx === 0} onClick={() => moveTab(idx, "up")}><ArrowUp className="size-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={idx === tabOrder.length - 1} onClick={() => moveTab(idx, "down")}><ArrowDown className="size-3.5" /></Button>
                      {!isProtected ? <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => toggleTabVisibility(tab.key)}>{tab.visible ? <Eye className="size-3.5 text-emerald-600" /> : <EyeOff className="size-3.5 text-red-400" />}</Button> : <div className="h-7 w-7 flex items-center justify-center"><Shield className="size-3.5 text-gold" /></div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* HOME */}
        <TabsContent value="home" className="mt-0 space-y-4">
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-display font-semibold mb-4 flex items-center gap-2"><LayoutGrid className="size-4 text-gold" /> Dashboard Widgets</h3>
            <div className="space-y-2">
              {WIDGET_OPTIONS.map((w) => (
                <div key={w.key} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border">
                  <span className="text-sm font-medium">{w.label}</span>
                  <Switch checked={homeDashboardWidgets.includes(w.key)} onCheckedChange={(checked) => { if (checked) setHomeDashboardWidgets([...homeDashboardWidgets, w.key]); else setHomeDashboardWidgets(homeDashboardWidgets.filter((k) => k !== w.key)); }} />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* SOUND */}
        <TabsContent value="sound" className="mt-0 space-y-4">
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-display font-semibold mb-1 flex items-center gap-2"><Volume2 className="size-4 text-gold" /> Notification Sound</h3>
            <p className="text-xs text-muted-foreground mb-4">Play a sound when reminders pop up on login.</p>
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border">
              <div className="flex items-center gap-2">
                {notificationSoundEnabled ? <Volume2 className="size-4 text-emerald-600" /> : <VolumeX className="size-4 text-muted-foreground" />}
                <span className="text-sm font-medium">Notification Sound</span>
              </div>
              <Switch checked={notificationSoundEnabled} onCheckedChange={setNotificationSoundEnabled} />
            </div>
            <Button variant="outline" size="sm" className="mt-3 gap-1.5 text-xs" onClick={playNotificationSound}><Volume2 className="size-3" /> Test Sound</Button>
          </div>
        </TabsContent>

        {/* REMINDERS */}
        <TabsContent value="reminders" className="mt-0">
          <ReminderSection customReminders={customReminders} currentUser={currentUser} reminderOpen={reminderOpen} setReminderOpen={setReminderOpen} newRem={newRem} setNewRem={setNewRem} handleAddReminder={handleAddReminder} updateCustomReminder={updateCustomReminder} removeCustomReminder={removeCustomReminder} linkOptions={linkOptions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReminderSection({ customReminders, currentUser, reminderOpen, setReminderOpen, newRem, setNewRem, handleAddReminder, updateCustomReminder, removeCustomReminder, linkOptions }: {
  customReminders: CustomReminder[];
  currentUser: { id: string; name: string; role: string } | null;
  reminderOpen: boolean;
  setReminderOpen: (open: boolean) => void;
  newRem: { title: string; message: string; date: string; linkedType: string; linkedId: string; linkedLabel: string };
  setNewRem: (val: any) => void;
  handleAddReminder: () => void;
  updateCustomReminder: (id: string, updates: Partial<CustomReminder>) => void;
  removeCustomReminder: (id: string) => void;
  linkOptions: { type: string; id: string; label: string }[];
}) {
  const isAdmin = currentUser?.role === "admin";
  const activeReminders = customReminders.filter((r) => !r.isCompleted);
  const completedReminders = customReminders.filter((r) => r.isCompleted);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold flex items-center gap-2"><Bell className="size-4 text-gold" /> Custom Reminders</h3>
          <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-1.5 gold-gradient text-white border-0 hover:opacity-90"><Plus className="size-4" /> New Reminder</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Create Reminder</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div><Label>Title</Label><Input value={newRem.title} onChange={(e) => setNewRem({ ...newRem, title: e.target.value })} className="mt-1" placeholder="e.g. Follow up on RC renewal" /></div>
                <div><Label>Message / Details</Label><Textarea value={newRem.message} onChange={(e) => setNewRem({ ...newRem, message: e.target.value })} className="mt-1" rows={2} /></div>
                <div><Label>Reminder Date</Label><Input type="date" value={newRem.date} onChange={(e) => setNewRem({ ...newRem, date: e.target.value })} className="mt-1" /></div>
                <div>
                  <Label className="flex items-center gap-1.5"><Link2 className="size-3" /> Link to File/Tender/Contract (optional)</Label>
                  <Select value={newRem.linkedId || "none"} onValueChange={(v) => {
                    if (v === "none") { setNewRem({ ...newRem, linkedType: "", linkedId: "", linkedLabel: "" }); return; }
                    const opt = linkOptions.find((o) => o.id === v);
                    if (opt) setNewRem({ ...newRem, linkedType: opt.type, linkedId: opt.id, linkedLabel: opt.label });
                  }}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent className="max-h-48">
                      <SelectItem value="none">None</SelectItem>
                      {linkOptions.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddReminder} className="w-full gold-gradient text-white border-0 hover:opacity-90">Create Reminder</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {activeReminders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No active reminders.</p>
        ) : (
          <div className="space-y-2">
            {activeReminders.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border border-amber-100 bg-amber-50/50">
                <Bell className="size-4 text-amber-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{r.title}</p>
                  {r.message && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.message}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">Due: {r.date} &middot; By: {r.createdByName}</p>
                    {r.linkedLabel && <span className="text-xs text-blue-600 flex items-center gap-0.5"><Link2 className="size-2.5" /> {r.linkedLabel}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-emerald-600" onClick={() => updateCustomReminder(r.id, { isCompleted: true })} title="Done"><Check className="size-3.5" /></Button>
                  {(isAdmin || r.createdBy === currentUser?.id) && <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => removeCustomReminder(r.id)} title="Delete"><Trash2 className="size-3.5" /></Button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {completedReminders.length > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-display font-semibold text-sm text-muted-foreground mb-3">Completed Reminders</h3>
          <div className="space-y-2">
            {completedReminders.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50/50 border border-emerald-100 opacity-70">
                <Check className="size-4 text-emerald-600 shrink-0" />
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground line-through">{r.title}</p><p className="text-xs text-muted-foreground">Due: {r.date}</p></div>
                {(isAdmin || r.createdBy === currentUser?.id) && <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 shrink-0" onClick={() => removeCustomReminder(r.id)}><X className="size-3.5" /></Button>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
