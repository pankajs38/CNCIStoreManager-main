export type Campus = "N" | "H";

export type FileNumberCode = "281" | "282" | "283" | "362" | "299";

export type CaseType = "PUR" | "RC" | "STE" | "PAC" | "CMC" | "AMC";

export type TenderCaseType = "PUR" | "RC" | "CMC" | "AMC" | "PAC";

export type TaskStatus = "assigned" | "gfr_done" | "noting_done" | "completed";

export type TaskType = "lp" | "lp_rc" | "gem" | "general";

export type GFRType = "GFR154" | "GFR155";

export type TaskPriority = "high" | "medium" | "low";

export type TenderStage =
  | "rfp_created"
  | "published"
  | "bid_closing"
  | "tender_opening"
  | "sample_demo"
  | "tec_prepared"
  | "tec_approval"
  | "financial_bid"
  | "l1_evaluation"
  | "financial_approval"
  | "negotiation"
  | "po_issued"
  | "completed"
  | "retender"
  | "cancelled";

export type MonthlyItemStatus =
  | "pending"
  | "quotation_called"
  | "reminder_given"
  | "quotation_received"
  | "prepare_gfr_noting"
  | "gfr_prepared"
  | "noting_prepared"
  | "file_created";

export interface User {
  id: string;
  name: string;
  designation: string;
  role: "admin" | "user";
  password: string;
  canCreateTender: boolean;
  canScanData?: boolean;
  isActive: boolean;
  photo?: string;
  mobile?: string;
  email?: string;
  employeeId?: string;
  department?: string;
}

export interface Task {
  id: string;
  taskNo: string;
  title: string;
  description: string;
  taskType: TaskType;
  assignedTo: string;
  assignedBy: string;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  status: TaskStatus;
  priority: TaskPriority;
  gfrType?: GFRType;
  gemBidNo?: string;
  fileNo?: string;
  linkedFileId?: string;
  parentTaskId?: string;
  childTaskIds?: string[];
  remarks: TaskRemark[];
  history: TaskHistoryEntry[];
  transferHistory: TaskTransfer[];
}

export interface TaskRemark {
  text: string;
  user: string;
  date: string;
}

export interface TaskHistoryEntry {
  date: string;
  action: string;
  user: string;
  fromStatus?: TaskStatus;
  toStatus?: TaskStatus;
}

export interface TaskTransfer {
  date: string;
  fromUser: string;
  toUser: string;
  reason: string;
}

export interface MonthlySheetItem {
  id: string;
  serialNo: number;
  itemName: string;
  quantity?: number;
  unit?: string;
  estimatedRate?: number;
  firmNames: string[];
  status: MonthlyItemStatus;
  statusLog: { status: MonthlyItemStatus; date: string; note?: string }[];
  quotationCalledDate?: string;
  reminderDate?: string;
  quotationReceivedDate?: string;
  gfrPreparedDate?: string;
  notingPreparedDate?: string;
  linkedFileId?: string;
  linkedTaskNo?: string;
  assignedTo?: string;
  rate?: number;
}

export interface MonthlySheet {
  id: string;
  month: string;
  year: number;
  campus: Campus;
  group: string;
  sheetName: string;
  items: MonthlySheetItem[];
  uploadedBy: string;
  uploadedAt: string;
  updatedAt: string;
}

export interface FileRecord {
  id: string;
  campus: Campus;
  fileNumberCode: FileNumberCode;
  caseType: CaseType;
  fiscalYear: string;
  continueNo: number;
  suffix?: string;
  fullFileNo: string;
  subject?: string;
  items: FileItem[];
  supplierName?: string;
  amount?: number;
  fileInitiator: string;
  poNo?: string;
  poDate?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isLocked: boolean;
  linkedTenderId?: string;
  linkedTaskNos?: string[];
  linkedMonthlyItemIds?: string[];
  isCompleted?: boolean;
  poJustification?: string;
  poReversed?: boolean;
  poReversalReason?: string;
  poReversedBy?: string;
  poReversedAt?: string;
  poCreatedBy?: string;
  isClosed?: boolean;
  isInvalid?: boolean;
  closeReason?: string;
  closedBy?: string;
  closedAt?: string;
  isDataScanned?: boolean;
  dataScannedBy?: string;
  dataScannedAt?: string;
}

export interface FileItem {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  totalPrice?: number;
  sourceTaskNo?: string;
  sourceMonthlyItemId?: string;
}

export interface TenderRecord {
  id: string;
  campus: Campus;
  fileNumberCode: FileNumberCode;
  tenderCaseType: TenderCaseType;
  fiscalYear: string;
  userDefinedName: string;
  fullFileNo: string;
  subject: string;
  indenterName: string;
  indenterDept: string;
  stages: TenderStageEntry[];
  currentStage: TenderStage;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  contractPeriodStart?: string;
  contractPeriodEnd?: string;
  awardedTo?: string;
  awardedPrice?: number;
  linkedNewFileId?: string;
  retenderCount: number;
  gemPoNo?: string;
  gemPoDate?: string;
  manualPoNo?: string;
  manualPoDate?: string;
  awardedItems?: TenderAwardedItem[];
}

export interface TenderAwardedItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitRate: number;
  totalAmount: number;
}

export interface TenderStageEntry {
  stage: TenderStage;
  date: string;
  updatedBy: string;
  data: Record<string, string | number | boolean>;
  notes?: string;
}

export interface L1PriceBreakdown {
  unitPriceWithoutGST: number;
  unitPriceWithGST: number;
  totalPriceWithoutGST: number;
  totalPriceWithGST: number;
  warrantyIncluded: boolean;
  warrantyPeriod?: string;
  cmcPeriod?: string;
  cmcPrice?: number;
  firmName: string;
}

export interface ContractRecord {
  id: string;
  tenderId: string;
  tenderFileNo: string;
  subject: string;
  type: "RC" | "CMC" | "AMC";
  awardedTo: string;
  startDate: string;
  endDate: string;
  price: number;
  linkedNewFileId?: string;
  isExpired: boolean;
  campus: Campus;
  awardedItems?: TenderAwardedItem[];
}

export interface Reminder {
  id: string;
  type: "tender_opening" | "demo" | "negotiation" | "contract_expiry" | "save_data" | "general";
  title: string;
  message: string;
  date: string;
  relatedId?: string;
  relatedType?: "file" | "tender" | "contract";
  isDismissed: boolean;
  isCompleted: boolean;
}

export interface Vendor {
  id: string;
  name: string;
  firmName?: string;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
  gstNo?: string;
  addedBy: string;
  addedAt: string;
}

export interface ActivityLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  module: "task" | "file" | "tender" | "contract" | "settings" | "auth" | "general";
  details: string;
  timestamp: string;
  relatedId?: string;
}

export interface AppSettings {
  fileFormats: Record<FileNumberCode, string>;
  customFileNumbers: { code: string; label: string }[];
  defaultFiscalYear: string;
  colorScheme: Record<string, string>;
}
