import type { FileNumberCode } from "@/types";

export const APP_NAME = "CNCI S&P Manager";
export const DEPARTMENT = "Store & Purchase";
export const INSTITUTE = "Chittaranjan National Cancer Institute";

// Local Excel sheet configuration
export const LOCAL_EXCEL_SHEET_CONFIG = {
  usersSheet: "Users",
  tasksSheet: "Tasks",
  filesSheet: "Files",
  tendersSheet: "Tenders",
  contractsSheet: "Contracts",
  vendorsSheet: "Vendors",
  monthlySheetsSheet: "MonthlySheets",
  remindersSheet: "Reminders",
  activityLogsSheet: "ActivityLogs",
  generalTasksSheet: "GeneralTasks",
};

export const FILE_NUMBER_MAP: Record<FileNumberCode, string> = {
  "281": "Local Purchase (PUR)",
  "282": "Rate Contract (RC) / STE / PAC",
  "283": "Works",
  "362": "GeM Files",
  "299": "General Files",
};

export const CASE_TYPES = ["PUR", "RC", "STE", "PAC", "CMC", "AMC"] as const;

export const TENDER_CASE_TYPES = ["PUR", "RC", "CMC", "AMC", "PAC"] as const;

export const TENDER_FILE_CODES = ["281", "282", "283"] as const;

export const CAMPUS_OPTIONS = [
  { value: "N" as const, label: "New Town" },
  { value: "H" as const, label: "Hazra" },
];

export const TASK_STATUS_CONFIG = {
  assigned: { label: "Assigned", color: "bg-white border border-gray-300", textColor: "text-gray-700" },
  gfr_done: { label: "GFR Done", color: "bg-sky-100 border border-sky-300", textColor: "text-sky-800" },
  noting_done: { label: "Noting Done", color: "bg-amber-100 border border-amber-300", textColor: "text-amber-800" },
  completed: { label: "Completed", color: "bg-emerald-100 border border-emerald-400", textColor: "text-emerald-800" },
};

export const TENDER_STAGE_CONFIG: Record<string, { label: string; color: string }> = {
  rfp_created: { label: "RFP Created", color: "bg-gray-100 text-gray-700" },
  published: { label: "Published", color: "bg-blue-100 text-blue-700" },
  bid_closing: { label: "Bid Closing", color: "bg-indigo-100 text-indigo-700" },
  tender_opening: { label: "Tender Opening", color: "bg-violet-100 text-violet-700" },
  sample_demo: { label: "Sample/Demo", color: "bg-purple-100 text-purple-700" },
  tec_prepared: { label: "TEC Prepared", color: "bg-fuchsia-100 text-fuchsia-700" },
  tec_approval: { label: "TEC Approval", color: "bg-pink-100 text-pink-700" },
  financial_bid: { label: "Financial Bid Opening", color: "bg-rose-100 text-rose-700" },
  l1_evaluation: { label: "L1 Evaluation", color: "bg-orange-100 text-orange-700" },
  financial_approval: { label: "Financial Approval", color: "bg-amber-100 text-amber-700" },
  negotiation: { label: "Negotiation", color: "bg-yellow-100 text-yellow-800" },
  po_issued: { label: "PO Issued", color: "bg-lime-100 text-lime-700" },
  completed: { label: "Completed", color: "bg-emerald-100 text-emerald-800" },
  retender: { label: "Retender", color: "bg-red-100 text-red-700" },
  cancelled: { label: "Cancelled", color: "bg-gray-200 text-gray-500" },
};

export const LP_STAGES = ["GFR 154/155", "Noting", "PO/WO Award"];
export const LP_RC_STAGES = ["Noting", "PO/WO Award"];
export const GEM_STAGES = ["Carting on GeM", "Noting", "Order on GeM"];
