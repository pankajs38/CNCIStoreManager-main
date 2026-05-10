import { useMemo } from "react";
import { useTenderStore } from "@/stores/tenderStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { Reminder } from "@/types";
import { daysBetween } from "@/lib/utils";

export function useReminders(): Reminder[] {
  const { tenders, contracts } = useTenderStore();
  const { customReminders } = useSettingsStore();
  const now = new Date();

  return useMemo(() => {
    const reminders: Reminder[] = [];

    tenders.forEach((t) => {
      if (t.isCompleted) return;
      const publishStage = t.stages.find((s) => s.stage === "published");
      if (publishStage && publishStage.data.closingDate) {
        const closing = new Date(publishStage.data.closingDate as string);
        if (closing >= now) {
          reminders.push({ id: `rem-closing-${t.id}`, type: "tender_opening", title: `Tender Closing: ${t.subject}`, message: `Bid closing on ${publishStage.data.closingDate}. File: ${t.fullFileNo}`, date: publishStage.data.closingDate as string, relatedId: t.id, relatedType: "tender", isDismissed: false, isCompleted: false });
        }
      }

      const openingStage = t.stages.find((s) => s.stage === "tender_opening");
      if (t.currentStage === "published" || (t.currentStage === "bid_closing" && !openingStage)) {
        reminders.push({ id: `rem-open-${t.id}`, type: "tender_opening", title: `Pending Tender Opening: ${t.subject}`, message: `Update status. File: ${t.fullFileNo}`, date: new Date().toISOString().split("T")[0], relatedId: t.id, relatedType: "tender", isDismissed: false, isCompleted: false });
      }

      const demoStage = t.stages.find((s) => s.stage === "sample_demo");
      if (demoStage && demoStage.data.demoDate) {
        const demoDate = new Date(demoStage.data.demoDate as string);
        const daysUntil = daysBetween(now, demoDate);
        if (daysUntil >= -1 && daysUntil <= 1) {
          reminders.push({ id: `rem-demo-${t.id}`, type: "demo", title: `Demo/Sample Call: ${t.subject}`, message: `Demo on ${demoStage.data.demoDate}. File: ${t.fullFileNo}`, date: demoStage.data.demoDate as string, relatedId: t.id, relatedType: "tender", isDismissed: false, isCompleted: false });
        }
      }

      const negStage = t.stages.find((s) => s.stage === "negotiation");
      if (negStage && negStage.data.negotiationDate) {
        const negDate = new Date(negStage.data.negotiationDate as string);
        if (negDate.toDateString() === now.toDateString()) {
          reminders.push({ id: `rem-neg-${t.id}`, type: "negotiation", title: `Negotiation Today: ${t.subject}`, message: `File: ${t.fullFileNo}`, date: negStage.data.negotiationDate as string, relatedId: t.id, relatedType: "tender", isDismissed: false, isCompleted: false });
        }
      }
    });

    contracts.forEach((c) => {
      if (c.isExpired || c.linkedNewFileId) return;
      const endDate = new Date(c.endDate);
      const monthsLeft = daysBetween(now, endDate) / 30;

      if (monthsLeft <= 4 && monthsLeft > 0) {
        const day = now.getDay();
        let shouldRemind = false;
        if (monthsLeft <= 2) shouldRemind = day === 1 || day === 3 || day === 5;
        else if (monthsLeft <= 3) shouldRemind = day === 1 || day === 4;
        else shouldRemind = day === 1;

        if (shouldRemind) {
          reminders.push({ id: `rem-exp-${c.id}`, type: "contract_expiry", title: `${c.type} Expiring: ${c.subject}`, message: `${c.type} with ${c.awardedTo} expires on ${c.endDate}. ${Math.round(monthsLeft)} months left.`, date: c.endDate, relatedId: c.id, relatedType: "contract", isDismissed: false, isCompleted: false });
        }
      }
    });

    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    if (now.getDate() >= lastDay - 2) {
      reminders.push({ id: `rem-save-${now.getMonth()}`, type: "save_data", title: "Monthly Data Backup Reminder", message: "Download and save a backup before month end.", date: new Date().toISOString().split("T")[0], isDismissed: false, isCompleted: false });
    }

    customReminders.forEach((cr) => {
      if (cr.isCompleted) return;
      reminders.push({
        id: `rem-custom-${cr.id}`, type: "general", title: cr.title,
        message: cr.linkedLabel ? `${cr.message || ""} — Linked: ${cr.linkedLabel}`.trim() : (cr.message || `Due: ${cr.date}`),
        date: cr.date, relatedId: cr.linkedId || cr.id, relatedType: cr.linkedType as any, isDismissed: false, isCompleted: false,
      });
    });

    return reminders;
  }, [tenders, contracts, customReminders, now.toDateString()]);
}
