import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getFiscalYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (month >= 3) {
    return `${year}-${String(year + 1).slice(2)}`;
  }
  return `${year - 1}-${String(year).slice(2)}`;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function daysBetween(d1: Date, d2: Date): number {
  const diff = d2.getTime() - d1.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function playNotificationSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.5);
    setTimeout(() => {
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(784, audioCtx.currentTime);
      gain2.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      osc2.start(audioCtx.currentTime);
      osc2.stop(audioCtx.currentTime + 0.5);
    }, 200);
  } catch {
    // Audio not supported
  }
}

export function generateSampleExcel(type: "tasks" | "files" | "vendors" | "tenders"): string {
  const headers: Record<string, string> = {
    tasks: "Title\tDescription\tTask Type (lp/lp_rc/gem/general)\tAssign To (User Name)\tDue Date (YYYY-MM-DD)\tFile No (optional)",
    files: "Campus (N/H)\tFile Number Code (281/282/283/362/299)\tCase Type (PUR/RC/STE/PAC/CMC/AMC)\tSubject\tItem Names (comma separated)\tSupplier Name\tAmount",
    vendors: "Vendor Name\tFirm Name\tCity\tMobile No\tEmail ID\tGST No",
    tenders: "Campus (N/H)\tFile Number Code (281/282/283)\tCase Type (PUR/RC/CMC/AMC/PAC)\tTender Name\tSubject\tIndenter Name\tIndenting Dept",
  };
  return headers[type] || "";
}
