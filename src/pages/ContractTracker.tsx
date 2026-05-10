import { useState, useMemo } from "react";
import { Filter, AlertTriangle, Clock, CheckCircle2, Link2, Eye, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTenderStore } from "@/stores/tenderStore";
import { daysBetween, formatDate } from "@/lib/utils";

export default function ContractTracker() {
  const { contracts, tenders, linkNewFile } = useTenderStore();
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCampus, setFilterCampus] = useState<string>("all");
  const [linkOpen, setLinkOpen] = useState<string | null>(null);
  const [linkFileId, setLinkFileId] = useState("");
  const [detailOpen, setDetailOpen] = useState<string | null>(null);

  const now = new Date();

  const sortedContracts = useMemo(() => {
    let result = [...contracts].filter((c) => !c.isExpired);
    if (filterType !== "all") result = result.filter((c) => c.type === filterType);
    if (filterCampus !== "all") result = result.filter((c) => c.campus === filterCampus);
    return result.sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
  }, [contracts, filterType, filterCampus]);

  const handleLink = () => {
    if (!linkOpen || !linkFileId) return;
    linkNewFile(linkOpen, linkFileId);
    setLinkOpen(null);
    setLinkFileId("");
  };

  const getUrgencyColor = (daysLeft: number) => {
    if (daysLeft <= 60) return "border-l-red-500 bg-red-50/50";
    if (daysLeft <= 90) return "border-l-orange-500 bg-orange-50/50";
    if (daysLeft <= 120) return "border-l-amber-500 bg-amber-50/50";
    return "border-l-green-500 bg-green-50/50";
  };

  const getUrgencyIcon = (daysLeft: number) => {
    if (daysLeft <= 60) return <AlertTriangle className="size-5 text-red-500" />;
    if (daysLeft <= 120) return <Clock className="size-5 text-amber-500" />;
    return <CheckCircle2 className="size-5 text-green-500" />;
  };

  const stats = {
    total: sortedContracts.length,
    critical: sortedContracts.filter((c) => daysBetween(now, new Date(c.endDate)) <= 60).length,
    warning: sortedContracts.filter((c) => { const d = daysBetween(now, new Date(c.endDate)); return d > 60 && d <= 120; }).length,
    healthy: sortedContracts.filter((c) => daysBetween(now, new Date(c.endDate)) > 120).length,
  };

  // Find tender details for the contract detail popup
  const detailContract = detailOpen ? contracts.find((c) => c.id === detailOpen) : null;
  const detailTender = detailContract?.tenderId ? tenders.find((t) => t.id === detailContract.tenderId) : null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-lg bg-white border flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-50"><Clock className="size-5 text-blue-600" /></div><div><p className="text-2xl font-bold tabular-nums">{stats.total}</p><p className="text-xs text-muted-foreground">Active Contracts</p></div></div>
        <div className="p-4 rounded-lg bg-white border flex items-center gap-3"><div className="p-2 rounded-lg bg-red-50"><AlertTriangle className="size-5 text-red-600" /></div><div><p className="text-2xl font-bold tabular-nums text-red-600">{stats.critical}</p><p className="text-xs text-muted-foreground">Critical (≤60d)</p></div></div>
        <div className="p-4 rounded-lg bg-white border flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-50"><Clock className="size-5 text-amber-600" /></div><div><p className="text-2xl font-bold tabular-nums text-amber-600">{stats.warning}</p><p className="text-xs text-muted-foreground">Warning (≤120d)</p></div></div>
        <div className="p-4 rounded-lg bg-white border flex items-center gap-3"><div className="p-2 rounded-lg bg-green-50"><CheckCircle2 className="size-5 text-green-600" /></div><div><p className="text-2xl font-bold tabular-nums text-green-600">{stats.healthy}</p><p className="text-xs text-muted-foreground">Healthy (&gt;120d)</p></div></div>
      </div>

      <div className="flex gap-3">
        <Select value={filterType} onValueChange={setFilterType}><SelectTrigger className="w-36"><Filter className="size-3.5 mr-1.5" /><SelectValue placeholder="All Types" /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="RC">Rate Contract</SelectItem><SelectItem value="AMC">AMC</SelectItem><SelectItem value="CMC">CMC</SelectItem></SelectContent></Select>
        <Select value={filterCampus} onValueChange={setFilterCampus}><SelectTrigger className="w-36"><SelectValue placeholder="All Campus" /></SelectTrigger><SelectContent><SelectItem value="all">All Campus</SelectItem><SelectItem value="N">New Town</SelectItem><SelectItem value="H">Hazra</SelectItem></SelectContent></Select>
      </div>

      <div className="space-y-3">
        {sortedContracts.map((contract) => {
          const daysLeft = daysBetween(now, new Date(contract.endDate));
          const progressPct = Math.max(0, Math.min(100, ((daysBetween(new Date(contract.startDate), now)) / daysBetween(new Date(contract.startDate), new Date(contract.endDate))) * 100));
          return (
            <div key={contract.id} className={`border-l-4 rounded-r-xl bg-white border p-4 ${getUrgencyColor(daysLeft)}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {getUrgencyIcon(daysLeft)}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">{contract.subject}</h3>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${contract.type === "RC" ? "bg-blue-100 text-blue-700" : contract.type === "AMC" ? "bg-purple-100 text-purple-700" : "bg-teal-100 text-teal-700"}`}>{contract.type}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${contract.campus === "N" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}>{contract.campus === "N" ? "New Town" : "Hazra"}</span>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground mt-1">{contract.tenderFileNo}</p>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                      <span>Vendor: <strong>{contract.awardedTo}</strong></span>
                      <span>₹{contract.price.toLocaleString("en-IN")}</span>
                      <span>{formatDate(contract.startDate)} — {formatDate(contract.endDate)}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%`, backgroundColor: daysLeft <= 60 ? "#ef4444" : daysLeft <= 120 ? "#f59e0b" : "#22c55e" }} /></div>
                      <span className={`text-xs font-bold tabular-nums ${daysLeft <= 60 ? "text-red-600" : daysLeft <= 120 ? "text-amber-600" : "text-green-600"}`}>{daysLeft}d left</span>
                    </div>
                  </div>
                </div>
                <div className="shrink-0 flex gap-1.5">
                  <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => setDetailOpen(contract.id)}><Eye className="size-3" /> Details</Button>
                  {contract.linkedNewFileId ? (
                    <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 px-2"><Link2 className="size-3" /> Linked</span>
                  ) : (
                    <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => { setLinkOpen(contract.id); setLinkFileId(""); }}><Link2 className="size-3" /> Link</Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {sortedContracts.length === 0 && <div className="text-center py-16 text-muted-foreground bg-white rounded-xl border">No active contracts found.</div>}
      </div>

      {/* Contract Detail with Awarded Items */}
      <Dialog open={!!detailOpen} onOpenChange={() => setDetailOpen(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="font-display">Contract Details</DialogTitle></DialogHeader>
          {detailContract && (
            <div className="space-y-4 pt-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground text-xs">Subject</span><p className="font-semibold">{detailContract.subject}</p></div>
                <div><span className="text-muted-foreground text-xs">Type</span><p className="font-semibold">{detailContract.type}</p></div>
                <div><span className="text-muted-foreground text-xs">Vendor</span><p>{detailContract.awardedTo}</p></div>
                <div><span className="text-muted-foreground text-xs">Price</span><p className="font-semibold">₹{detailContract.price.toLocaleString("en-IN")}</p></div>
                <div><span className="text-muted-foreground text-xs">Period</span><p>{formatDate(detailContract.startDate)} — {formatDate(detailContract.endDate)}</p></div>
                <div><span className="text-muted-foreground text-xs">File No</span><p className="font-mono text-xs">{detailContract.tenderFileNo}</p></div>
              </div>
              {detailTender?.awardedItems && detailTender.awardedItems.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-1.5"><Package className="size-4 text-gold" /> Awarded Items & Rates</h4>
                  <table className="w-full text-xs border rounded overflow-hidden">
                    <thead><tr className="bg-gray-50 border-b"><th className="px-2 py-1.5 text-left">Item</th><th className="px-2 py-1.5">Qty</th><th className="px-2 py-1.5 text-right">Rate</th><th className="px-2 py-1.5 text-right">Total</th></tr></thead>
                    <tbody>{detailTender.awardedItems.map((ai) => (<tr key={ai.id} className="border-b"><td className="px-2 py-1.5">{ai.name}</td><td className="px-2 py-1.5 text-center">{ai.quantity} {ai.unit}</td><td className="px-2 py-1.5 text-right">₹{ai.unitRate.toLocaleString("en-IN")}</td><td className="px-2 py-1.5 text-right font-medium">₹{ai.totalAmount.toLocaleString("en-IN")}</td></tr>))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!linkOpen} onOpenChange={() => setLinkOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Link New File to Stop Reminder</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div><Label>New File ID</Label><Input value={linkFileId} onChange={(e) => setLinkFileId(e.target.value)} placeholder="Enter new file ID or no." className="mt-1" /></div>
            <Button onClick={handleLink} className="w-full gold-gradient text-white border-0">Link File</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
