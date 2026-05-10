// filepath: src/lib/sheetServices.ts
import { GOOGLE_SHEETS_CONFIG } from "@/constants/config";
import { generateId } from "./utils";
import type { 
  User, Task, FileRecord, TenderRecord, ContractRecord, Vendor, 
  MonthlySheet, MonthlySheetItem, Reminder, ActivityLogEntry,
  TaskStatus, TaskType, TaskPriority, GFRType, Campus, FileNumberCode,
  CaseType, TenderCaseType, MonthlyItemStatus, TenderStage
} from "@/types";

const SPREADSHEET_ID = GOOGLE_SHEETS_CONFIG.spreadsheetId;
const GOOGLE_SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";

// Helper to parse boolean
const parseBoolean = (value: string | boolean | undefined): boolean => {
  if (typeof value === "boolean") return value;
  if (!value) return false;
  return value.toLowerCase() === "true" || value === "1" || value === "yes";
};

// Helper to parse number
const parseNumber = (value: string | number | undefined): number | undefined => {
  if (value === undefined || value === "") return undefined;
  if (typeof value === "number") return value;
  const num = parseFloat(value);
  return isNaN(num) ? undefined : num;
};

// Helper to parse JSON string
const parseJSON = <T>(value: string | undefined, defaultValue: T): T => {
  if (!value) return defaultValue;
  try {
    return JSON.parse(value);
  } catch {
    return defaultValue;
  }
};

// Helper to parse array from comma-separated or JSON
const parseArray = <T>(value: string | undefined, defaultValue: T[]): T[] => {
  if (!value) return defaultValue;
  try {
    return JSON.parse(value);
  } catch {
    // Try comma-separated
    return value.split(",").map(s => s.trim()) as T[];
  }
};

// Generic fetch function
export const fetchSheetData = async (accessToken: string, sheetName: string): Promise<string[][]> => {
  if (!accessToken) {
    console.error(`No access token provided for sheet ${sheetName}`);
    return [];
  }
  
  try {
    // Use a larger range to accommodate more columns
    const response = await fetch(
      `${GOOGLE_SHEETS_API}/${SPREADSHEET_ID}/values/${sheetName}!A:ZZ`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch sheet ${sheetName}:`, response.status, response.statusText);
      // If 401, the token is invalid - clear it
      if (response.status === 401) {
        console.error("Token is invalid/expired - need to re-authenticate");
      }
      return [];
    }

    const data = await response.json();
    if (!data.values || data.values.length < 2) {
      return [];
    }

    return data.values.slice(1) as string[][]; // Skip header row
  } catch (error) {
    console.error(`Error fetching sheet ${sheetName}:`, error);
    return [];
  }
};

// Fetch headers
export const fetchSheetHeaders = async (accessToken: string, sheetName: string): Promise<string[]> => {
  try {
    const response = await fetch(
      `${GOOGLE_SHEETS_API}/${SPREADSHEET_ID}/values/${sheetName}!1:1`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) return [];
    const data = await response.json();
    return (data.values?.[0] as string[]) || [];
  } catch {
    return [];
  }
};

// ==================== USERS ====================
export interface GoogleSheetUser {
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

export const fetchUsers = async (accessToken: string): Promise<User[]> => {
  const rows = await fetchSheetData(accessToken, GOOGLE_SHEETS_CONFIG.usersSheet);
  const headers = await fetchSheetHeaders(accessToken, GOOGLE_SHEETS_CONFIG.usersSheet);
  
  return rows.map(row => {
    const user: GoogleSheetUser = {
      id: "", name: "", designation: "", role: "user", password: "",
      canCreateTender: false, isActive: true
    };
    
    headers.forEach((header, index) => {
      const field = header.trim().toLowerCase().replace(/\s+/g, "");
      const value = row[index]?.trim() || "";
      
      if (field === "id") user.id = value || generateId();
      else if (field === "name") user.name = value;
      else if (field === "designation") user.designation = value;
      else if (field === "role") user.role = value.toLowerCase() === "admin" ? "admin" : "user";
      else if (field === "password") user.password = value;
      else if (field === "cancreatetender") user.canCreateTender = parseBoolean(value);
      else if (field === "canscandata") user.canScanData = parseBoolean(value);
      else if (field === "isactive") user.isActive = parseBoolean(value);
      else if (field === "photo") user.photo = value;
      else if (field === "mobile") user.mobile = value;
      else if (field === "email") user.email = value;
      else if (field === "employeeid") user.employeeId = value;
      else if (field === "department") user.department = value;
    });
    
    if (!user.id) user.id = generateId();
    return user as User;
  }).filter(u => u.name && u.password);
};

// ==================== TASKS ====================
export const fetchTasks = async (accessToken: string): Promise<Task[]> => {
  const rows = await fetchSheetData(accessToken, GOOGLE_SHEETS_CONFIG.tasksSheet);
  const headers = await fetchSheetHeaders(accessToken, GOOGLE_SHEETS_CONFIG.tasksSheet);
  
  return rows.map(row => {
    const task: Partial<Task> = {};
    
    headers.forEach((header, index) => {
      const field = header.trim().toLowerCase().replace(/\s+/g, "");
      const value = row[index]?.trim() || "";
      
      if (field === "id") task.id = value || generateId();
      else if (field === "taskno" || field === "tasknumber") task.taskNo = value;
      else if (field === "title") task.title = value;
      else if (field === "description" || field === "desc") task.description = value;
      else if (field === "tasktype") task.taskType = value as TaskType;
      else if (field === "assignedto") task.assignedTo = value;
      else if (field === "assignedby") task.assignedBy = value;
      else if (field === "createdat") task.createdAt = value;
      else if (field === "updatedat") task.updatedAt = value;
      else if (field === "duedate") task.dueDate = value;
      else if (field === "status") task.status = value as TaskStatus;
      else if (field === "priority") task.priority = value as TaskPriority;
      else if (field === "gfrtype") task.gfrType = value as GFRType;
      else if (field === "gembidno" || field === "gembid") task.gemBidNo = value;
      else if (field === "fileno" || field === "filenumber") task.fileNo = value;
      else if (field === "linkedfileid") task.linkedFileId = value;
      else if (field === "parenttaskid") task.parentTaskId = value;
      else if (field === "childtaskids") task.childTaskIds = parseArray(value, []);
      else if (field === "remarks") task.remarks = parseJSON(value, []);
      else if (field === "history") task.history = parseJSON(value, []);
      else if (field === "transferhistory") task.transferHistory = parseJSON(value, []);
    });
    
    if (!task.id) task.id = generateId();
    if (!task.createdAt) task.createdAt = new Date().toISOString();
    if (!task.updatedAt) task.updatedAt = task.createdAt;
    if (!task.status) task.status = "assigned";
    if (!task.priority) task.priority = "medium";
    if (!task.remarks) task.remarks = [];
    if (!task.history) task.history = [];
    if (!task.transferHistory) task.transferHistory = [];
    
    return task as Task;
  }).filter(t => t.taskNo);
};

// ==================== FILES ====================
export const fetchFiles = async (accessToken: string): Promise<FileRecord[]> => {
  const rows = await fetchSheetData(accessToken, GOOGLE_SHEETS_CONFIG.filesSheet);
  const headers = await fetchSheetHeaders(accessToken, GOOGLE_SHEETS_CONFIG.filesSheet);
  
  return rows.map(row => {
    const file: Partial<FileRecord> = {};
    
    headers.forEach((header, index) => {
      const field = header.trim().toLowerCase().replace(/\s+/g, "");
      const value = row[index]?.trim() || "";
      
      if (field === "id") file.id = value || generateId();
      else if (field === "campus") file.campus = value as Campus;
      else if (field === "filenumbercode" || field === "filenumber") file.fileNumberCode = value as FileNumberCode;
      else if (field === "casetype") file.caseType = value as CaseType;
      else if (field === "fiscalyear") file.fiscalYear = value;
      else if (field === "continueno" || field === "continue") file.continueNo = parseNumber(value) || 1;
      else if (field === "suffix") file.suffix = value;
      else if (field === "fullfileno") file.fullFileNo = value;
      else if (field === "subject") file.subject = value;
      else if (field === "items") file.items = parseJSON(value, []);
      else if (field === "suppliername" || field === "supplier") file.supplierName = value;
      else if (field === "amount") file.amount = parseNumber(value);
      else if (field === "fileinitiator" || field === "initiator") file.fileInitiator = value;
      else if (field === "pono" || field === "po") file.poNo = value;
      else if (field === "podate") file.poDate = value;
      else if (field === "createdat") file.createdAt = value;
      else if (field === "updatedat") file.updatedAt = value;
      else if (field === "createdby") file.createdBy = value;
      else if (field === "islocked" || field === "locked") file.isLocked = parseBoolean(value);
      else if (field === "linkedtenderid") file.linkedTenderId = value;
      else if (field === "linkedtasknos") file.linkedTaskNos = parseArray(value, []);
      else if (field === "linkedmonthlyitemids") file.linkedMonthlyItemIds = parseArray(value, []);
      else if (field === "iscompleted" || field === "completed") file.isCompleted = parseBoolean(value);
      else if (field === "pojustification") file.poJustification = value;
      else if (field === "poreversed" || field === "reversed") file.poReversed = parseBoolean(value);
      else if (field === "poreversalreason") file.poReversalReason = value;
      else if (field === "poreversedby") file.poReversedBy = value;
      else if (field === "poreversedat") file.poReversedAt = value;
      else if (field === "pocreatedby") file.poCreatedBy = value;
      else if (field === "isclosed" || field === "closed") file.isClosed = parseBoolean(value);
      else if (field === "isinvalid" || field === "invalid") file.isInvalid = parseBoolean(value);
      else if (field === "closereason") file.closeReason = value;
      else if (field === "closedby") file.closedBy = value;
      else if (field === "closedat") file.closedAt = value;
      else if (field === "isdatascanned" || field === "datascanned") file.isDataScanned = parseBoolean(value);
      else if (field === "datascannedby") file.dataScannedBy = value;
      else if (field === "datascannedat") file.dataScannedAt = value;
    });
    
    if (!file.id) file.id = generateId();
    if (!file.createdAt) file.createdAt = new Date().toISOString();
    if (!file.updatedAt) file.updatedAt = file.createdAt;
    if (!file.items) file.items = [];
    if (!file.isLocked) file.isLocked = false;
    
    return file as FileRecord;
  }).filter(f => f.fullFileNo);
};

// ==================== TENDERS ====================
export const fetchTenders = async (accessToken: string): Promise<TenderRecord[]> => {
  const rows = await fetchSheetData(accessToken, GOOGLE_SHEETS_CONFIG.tendersSheet);
  const headers = await fetchSheetHeaders(accessToken, GOOGLE_SHEETS_CONFIG.tendersSheet);
  
  return rows.map(row => {
    const tender: Partial<TenderRecord> = {};
    
    headers.forEach((header, index) => {
      const field = header.trim().toLowerCase().replace(/\s+/g, "");
      const value = row[index]?.trim() || "";
      
      if (field === "id") tender.id = value || generateId();
      else if (field === "campus") tender.campus = value as Campus;
      else if (field === "filenumbercode") tender.fileNumberCode = value as FileNumberCode;
      else if (field === "tendercaseType") tender.tenderCaseType = value as TenderCaseType;
      else if (field === "fiscalyear") tender.fiscalYear = value;
      else if (field === "userdefinedname" || field === "tendername") tender.userDefinedName = value;
      else if (field === "fullfileno") tender.fullFileNo = value;
      else if (field === "subject") tender.subject = value;
      else if (field === "indentername" || field === "indenter") tender.indenterName = value;
      else if (field === "indenterdept" || field === "dept") tender.indenterDept = value;
      else if (field === "stages") tender.stages = parseJSON(value, []);
      else if (field === "currentstage") tender.currentStage = value as TenderStage;
      else if (field === "iscompleted") tender.isCompleted = parseBoolean(value);
      else if (field === "createdat") tender.createdAt = value;
      else if (field === "updatedat") tender.updatedAt = value;
      else if (field === "createdby") tender.createdBy = value;
      else if (field === "contractperiodstart") tender.contractPeriodStart = value;
      else if (field === "contractperiodend") tender.contractPeriodEnd = value;
      else if (field === "awardedto") tender.awardedTo = value;
      else if (field === "awardedprice") tender.awardedPrice = parseNumber(value);
      else if (field === "linkednewfileid") tender.linkedNewFileId = value;
      else if (field === "retendercount") tender.retenderCount = parseNumber(value) || 0;
      else if (field === "gemporno") tender.gemPoNo = value;
      else if (field === "gempordate") tender.gemPoDate = value;
      else if (field === "manualpono") tender.manualPoNo = value;
      else if (field === "manualpodate") tender.manualPoDate = value;
      else if (field === "awardeditems") tender.awardedItems = parseJSON(value, []);
    });
    
    if (!tender.id) tender.id = generateId();
    if (!tender.createdAt) tender.createdAt = new Date().toISOString();
    if (!tender.updatedAt) tender.updatedAt = tender.createdAt;
    if (!tender.stages) tender.stages = [];
    if (!tender.retenderCount) tender.retenderCount = 0;
    if (!tender.awardedItems) tender.awardedItems = [];
    
    return tender as TenderRecord;
  }).filter(t => t.fullFileNo);
};

// ==================== CONTRACTS ====================
export const fetchContracts = async (accessToken: string): Promise<ContractRecord[]> => {
  const rows = await fetchSheetData(accessToken, GOOGLE_SHEETS_CONFIG.contractsSheet);
  const headers = await fetchSheetHeaders(accessToken, GOOGLE_SHEETS_CONFIG.contractsSheet);
  
  return rows.map(row => {
    const contract: Partial<ContractRecord> = {};
    
    headers.forEach((header, index) => {
      const field = header.trim().toLowerCase().replace(/\s+/g, "");
      const value = row[index]?.trim() || "";
      
      if (field === "id") contract.id = value || generateId();
      else if (field === "tenderid") contract.tenderId = value;
      else if (field === "tenderfileno") contract.tenderFileNo = value;
      else if (field === "subject") contract.subject = value;
      else if (field === "type") contract.type = value as "RC" | "CMC" | "AMC";
      else if (field === "awardedto") contract.awardedTo = value;
      else if (field === "startdate") contract.startDate = value;
      else if (field === "enddate") contract.endDate = value;
      else if (field === "price" || field === "amount") contract.price = parseNumber(value);
      else if (field === "linkednewfileid") contract.linkedNewFileId = value;
      else if (field === "isexpired") contract.isExpired = parseBoolean(value);
      else if (field === "campus") contract.campus = value as Campus;
      else if (field === "awardeditems") contract.awardedItems = parseJSON(value, []);
    });
    
    if (!contract.id) contract.id = generateId();
    if (!contract.awardedItems) contract.awardedItems = [];
    
    return contract as ContractRecord;
  }).filter(c => c.tenderId);
};

// ==================== VENDORS ====================
export const fetchVendors = async (accessToken: string): Promise<Vendor[]> => {
  const rows = await fetchSheetData(accessToken, GOOGLE_SHEETS_CONFIG.vendorsSheet);
  const headers = await fetchSheetHeaders(accessToken, GOOGLE_SHEETS_CONFIG.vendorsSheet);
  
  return rows.map(row => {
    const vendor: Partial<Vendor> = {};
    
    headers.forEach((header, index) => {
      const field = header.trim().toLowerCase().replace(/\s+/g, "");
      const value = row[index]?.trim() || "";
      
      if (field === "id") vendor.id = value || generateId();
      else if (field === "name") vendor.name = value;
      else if (field === "firmname" || field === "firm") vendor.firmName = value;
      else if (field === "city") vendor.city = value;
      else if (field === "address") vendor.address = value;
      else if (field === "phone" || field === "mobile") vendor.phone = value;
      else if (field === "email") vendor.email = value;
      else if (field === "gstno" || field === "gst") vendor.gstNo = value;
      else if (field === "addedby") vendor.addedBy = value;
      else if (field === "addedat") vendor.addedAt = value;
    });
    
    if (!vendor.id) vendor.id = generateId();
    if (!vendor.addedAt) vendor.addedAt = new Date().toISOString();
    
    return vendor as Vendor;
  }).filter(v => v.name);
};

// ==================== MONTHLY SHEETS ====================
export const fetchMonthlySheets = async (accessToken: string): Promise<MonthlySheet[]> => {
  const rows = await fetchSheetData(accessToken, GOOGLE_SHEETS_CONFIG.monthlySheetsSheet);
  const headers = await fetchSheetHeaders(accessToken, GOOGLE_SHEETS_CONFIG.monthlySheetsSheet);
  
  return rows.map(row => {
    const sheet: Partial<MonthlySheet> = {};
    
    headers.forEach((header, index) => {
      const field = header.trim().toLowerCase().replace(/\s+/g, "");
      const value = row[index]?.trim() || "";
      
      if (field === "id") sheet.id = value || generateId();
      else if (field === "month") sheet.month = value;
      else if (field === "year") sheet.year = parseNumber(value) || new Date().getFullYear();
      else if (field === "campus") sheet.campus = value as Campus;
      else if (field === "group") sheet.group = value;
      else if (field === "sheetname") sheet.sheetName = value;
      else if (field === "items") sheet.items = parseJSON(value, []);
      else if (field === "uploadedby") sheet.uploadedBy = value;
      else if (field === "uploadedat") sheet.uploadedAt = value;
      else if (field === "updatedat") sheet.updatedAt = value;
    });
    
    if (!sheet.id) sheet.id = generateId();
    if (!sheet.uploadedAt) sheet.uploadedAt = new Date().toISOString();
    if (!sheet.updatedAt) sheet.updatedAt = sheet.uploadedAt;
    if (!sheet.items) sheet.items = [];
    
    return sheet as MonthlySheet;
  }).filter(s => s.month && s.year);
};

// ==================== REMINDERS ====================
export const fetchReminders = async (accessToken: string): Promise<Reminder[]> => {
  const rows = await fetchSheetData(accessToken, GOOGLE_SHEETS_CONFIG.remindersSheet);
  const headers = await fetchSheetHeaders(accessToken, GOOGLE_SHEETS_CONFIG.remindersSheet);
  
  return rows.map(row => {
    const reminder: Partial<Reminder> = {};
    
    headers.forEach((header, index) => {
      const field = header.trim().toLowerCase().replace(/\s+/g, "");
      const value = row[index]?.trim() || "";
      
      if (field === "id") reminder.id = value || generateId();
      else if (field === "type") reminder.type = value as Reminder["type"];
      else if (field === "title") reminder.title = value;
      else if (field === "message") reminder.message = value;
      else if (field === "date") reminder.date = value;
      else if (field === "relatedid") reminder.relatedId = value;
      else if (field === "relatedtype") reminder.relatedType = value as "file" | "tender" | "contract";
      else if (field === "isdismissed" || field === "dismissed") reminder.isDismissed = parseBoolean(value);
      else if (field === "iscompleted" || field === "completed") reminder.isCompleted = parseBoolean(value);
    });
    
    if (!reminder.id) reminder.id = generateId();
    if (!reminder.isDismissed) reminder.isDismissed = false;
    if (!reminder.isCompleted) reminder.isCompleted = false;
    
    return reminder as Reminder;
  }).filter(r => r.title && r.date);
};

// ==================== ACTIVITY LOGS ====================
export const fetchActivityLogs = async (accessToken: string): Promise<ActivityLogEntry[]> => {
  const rows = await fetchSheetData(accessToken, GOOGLE_SHEETS_CONFIG.activityLogsSheet);
  const headers = await fetchSheetHeaders(accessToken, GOOGLE_SHEETS_CONFIG.activityLogsSheet);
  
  return rows.map(row => {
    const log: Partial<ActivityLogEntry> = {};
    
    headers.forEach((header, index) => {
      const field = header.trim().toLowerCase().replace(/\s+/g, "");
      const value = row[index]?.trim() || "";
      
      if (field === "id") log.id = value || generateId();
      else if (field === "userid") log.userId = value;
      else if (field === "username") log.userName = value;
      else if (field === "action") log.action = value;
      else if (field === "module") log.module = value as ActivityLogEntry["module"];
      else if (field === "details") log.details = value;
      else if (field === "timestamp") log.timestamp = value;
      else if (field === "relatedid") log.relatedId = value;
    });
    
    if (!log.id) log.id = generateId();
    if (!log.timestamp) log.timestamp = new Date().toISOString();
    
    return log as ActivityLogEntry;
  }).filter(l => l.action);
};

// ==================== SYNC ALL DATA ====================
export interface AllSheetData {
  users: User[];
  tasks: Task[];
  files: FileRecord[];
  tenders: TenderRecord[];
  contracts: ContractRecord[];
  vendors: Vendor[];
  monthlySheets: MonthlySheet[];
  reminders: Reminder[];
  activityLogs: ActivityLogEntry[];
}

export const syncAllData = async (accessToken: string): Promise<AllSheetData> => {
  const [users, tasks, files, tenders, contracts, vendors, monthlySheets, reminders, activityLogs] = await Promise.all([
    fetchUsers(accessToken),
    fetchTasks(accessToken),
    fetchFiles(accessToken),
    fetchTenders(accessToken),
    fetchContracts(accessToken),
    fetchVendors(accessToken),
    fetchMonthlySheets(accessToken),
    fetchReminders(accessToken),
    fetchActivityLogs(accessToken),
  ]);

  return {
    users,
    tasks,
    files,
    tenders,
    contracts,
    vendors,
    monthlySheets,
    reminders,
    activityLogs,
  };
};

// ==================== WRITE FUNCTIONS ====================

// Helper to convert column number to letter (1=A, 2=B, ..., 26=Z, 27=AA, etc.)
const getColumnLetter = (num: number): string => {
  if (num <= 0) return 'A';
  let result = '';
  while (num > 0) {
    num--;
    result = String.fromCharCode(65 + (num % 26)) + result;
    num = Math.floor(num / 26);
  }
  return result;
};

// Generic write function to update entire sheet
const writeSheetData = async (accessToken: string, sheetName: string, headers: string[], rows: string[][]): Promise<boolean> => {
  if (!accessToken) {
    console.error(`No access token provided for writing to sheet ${sheetName}`);
    return false;
  }
  
  try {
    const values = [headers, ...rows];
    console.log(`Writing to sheet "${sheetName}": ${rows.length} rows, ${headers.length} columns`);
    
    // Calculate the actual range needed based on number of columns
    const numCols = headers.length;
    const endCol = getColumnLetter(numCols);
    const range = `A:${endCol}`;
    
    console.log(`Writing to range: ${sheetName}!${range}`);
    
    const response = await fetch(
      `${GOOGLE_SHEETS_API}/${SPREADSHEET_ID}/values/${sheetName}!${range}?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values }),
      }
    );

    const responseText = await response.text();
    console.log(`Write response for "${sheetName}":`, response.status, responseText);

    if (!response.ok) {
      console.error(`Failed to write to sheet ${sheetName}:`, response.status, responseText);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Error writing to sheet ${sheetName}:`, error);
    return false;
  }
};

// ==================== WRITE USERS ====================
const USER_HEADERS = ["id", "name", "designation", "role", "password", "canCreateTender", "canScanData", "isActive", "photo", "mobile", "email", "employeeId", "department"];

const userToRow = (user: User): string[] => [
  user.id,
  user.name,
  user.designation,
  user.role,
  user.password,
  String(user.canCreateTender),
  String(user.canScanData || false),
  String(user.isActive),
  user.photo || "",
  user.mobile || "",
  user.email || "",
  user.employeeId || "",
  user.department || "",
];

export const writeUsers = async (accessToken: string, users: User[]): Promise<boolean> => {
  const rows = users.map(userToRow);
  return writeSheetData(accessToken, GOOGLE_SHEETS_CONFIG.usersSheet, USER_HEADERS, rows);
};

// ==================== WRITE TASKS ====================
const TASK_HEADERS = ["id", "taskNo", "title", "description", "taskType", "assignedTo", "assignedBy", "createdAt", "updatedAt", "dueDate", "status", "priority", "gfrType", "gemBidNo", "fileNo", "linkedFileId", "parentTaskId", "childTaskIds", "remarks", "history", "transferHistory"];

const taskToRow = (task: Task): string[] => [
  task.id,
  task.taskNo || "",
  task.title || "",
  task.description || "",
  task.taskType || "",
  task.assignedTo || "",
  task.assignedBy || "",
  task.createdAt || "",
  task.updatedAt || "",
  task.dueDate || "",
  task.status || "",
  task.priority || "",
  task.gfrType || "",
  task.gemBidNo || "",
  task.fileNo || "",
  task.linkedFileId || "",
  task.parentTaskId || "",
  JSON.stringify(task.childTaskIds || []),
  JSON.stringify(task.remarks || []),
  JSON.stringify(task.history || []),
  JSON.stringify(task.transferHistory || []),
];

export const writeTasks = async (accessToken: string, tasks: Task[]): Promise<boolean> => {
  const rows = tasks.map(taskToRow);
  return writeSheetData(accessToken, GOOGLE_SHEETS_CONFIG.tasksSheet, TASK_HEADERS, rows);
};

// ==================== WRITE FILES ====================
const FILE_HEADERS = ["id", "campus", "fileNumberCode", "caseType", "fiscalYear", "continueNo", "suffix", "fullFileNo", "subject", "items", "supplierName", "amount", "fileInitiator", "poNo", "poDate", "createdAt", "updatedAt", "createdBy", "isLocked", "linkedTenderId", "linkedTaskNos", "linkedMonthlyItemIds", "isCompleted", "poJustification", "poReversed", "poReversalReason", "poReversedBy", "poReversedAt", "poCreatedBy", "isClosed", "isInvalid", "closeReason", "closedBy", "closedAt", "isDataScanned", "dataScannedBy", "dataScannedAt"];

const fileToRow = (file: FileRecord): string[] => [
  file.id,
  file.campus || "",
  file.fileNumberCode || "",
  file.caseType || "",
  file.fiscalYear || "",
  String(file.continueNo || 1),
  file.suffix || "",
  file.fullFileNo || "",
  file.subject || "",
  JSON.stringify(file.items || []),
  file.supplierName || "",
  String(file.amount || 0),
  file.fileInitiator || "",
  file.poNo || "",
  file.poDate || "",
  file.createdAt || "",
  file.updatedAt || "",
  file.createdBy || "",
  String(file.isLocked || false),
  file.linkedTenderId || "",
  JSON.stringify(file.linkedTaskNos || []),
  JSON.stringify(file.linkedMonthlyItemIds || []),
  String(file.isCompleted || false),
  file.poJustification || "",
  String(file.poReversed || false),
  file.poReversalReason || "",
  file.poReversedBy || "",
  file.poReversedAt || "",
  file.poCreatedBy || "",
  String(file.isClosed || false),
  String(file.isInvalid || false),
  file.closeReason || "",
  file.closedBy || "",
  file.closedAt || "",
  String(file.isDataScanned || false),
  file.dataScannedBy || "",
  file.dataScannedAt || "",
];

export const writeFiles = async (accessToken: string, files: FileRecord[]): Promise<boolean> => {
  const rows = files.map(fileToRow);
  return writeSheetData(accessToken, GOOGLE_SHEETS_CONFIG.filesSheet, FILE_HEADERS, rows);
};

// ==================== WRITE TENDERS ====================
const TENDER_HEADERS = ["id", "campus", "fileNumberCode", "tenderCaseType", "fiscalYear", "userDefinedName", "fullFileNo", "subject", "indenterName", "indenterDept", "stages", "currentStage", "isCompleted", "createdAt", "updatedAt", "createdBy", "contractPeriodStart", "contractPeriodEnd", "awardedTo", "awardedPrice", "linkedNewFileId", "retenderCount", "gemPoNo", "gemPoDate", "manualPoNo", "manualPoDate", "awardedItems"];

const tenderToRow = (tender: TenderRecord): string[] => [
  tender.id,
  tender.campus || "",
  tender.fileNumberCode || "",
  tender.tenderCaseType || "",
  tender.fiscalYear || "",
  tender.userDefinedName || "",
  tender.fullFileNo || "",
  tender.subject || "",
  tender.indenterName || "",
  tender.indenterDept || "",
  JSON.stringify(tender.stages || []),
  tender.currentStage || "",
  String(tender.isCompleted || false),
  tender.createdAt || "",
  tender.updatedAt || "",
  tender.createdBy || "",
  tender.contractPeriodStart || "",
  tender.contractPeriodEnd || "",
  tender.awardedTo || "",
  String(tender.awardedPrice || 0),
  tender.linkedNewFileId || "",
  String(tender.retenderCount || 0),
  tender.gemPoNo || "",
  tender.gemPoDate || "",
  tender.manualPoNo || "",
  tender.manualPoDate || "",
  JSON.stringify(tender.awardedItems || []),
];

export const writeTenders = async (accessToken: string, tenders: TenderRecord[]): Promise<boolean> => {
  const rows = tenders.map(tenderToRow);
  return writeSheetData(accessToken, GOOGLE_SHEETS_CONFIG.tendersSheet, TENDER_HEADERS, rows);
};

// ==================== WRITE CONTRACTS ====================
const CONTRACT_HEADERS = ["id", "tenderId", "tenderFileNo", "subject", "type", "awardedTo", "startDate", "endDate", "price", "linkedNewFileId", "isExpired", "campus", "awardedItems"];

const contractToRow = (contract: ContractRecord): string[] => [
  contract.id,
  contract.tenderId || "",
  contract.tenderFileNo || "",
  contract.subject || "",
  contract.type || "",
  contract.awardedTo || "",
  contract.startDate || "",
  contract.endDate || "",
  String(contract.price || 0),
  contract.linkedNewFileId || "",
  String(contract.isExpired || false),
  contract.campus || "",
  JSON.stringify(contract.awardedItems || []),
];

export const writeContracts = async (accessToken: string, contracts: ContractRecord[]): Promise<boolean> => {
  const rows = contracts.map(contractToRow);
  return writeSheetData(accessToken, GOOGLE_SHEETS_CONFIG.contractsSheet, CONTRACT_HEADERS, rows);
};

// ==================== WRITE VENDORS ====================
const VENDOR_HEADERS = ["id", "name", "firmName", "city", "address", "phone", "email", "gstNo", "addedBy", "addedAt"];

const vendorToRow = (vendor: Vendor): string[] => [
  vendor.id,
  vendor.name || "",
  vendor.firmName || "",
  vendor.city || "",
  vendor.address || "",
  vendor.phone || "",
  vendor.email || "",
  vendor.gstNo || "",
  vendor.addedBy || "",
  vendor.addedAt || "",
];

export const writeVendors = async (accessToken: string, vendors: Vendor[]): Promise<boolean> => {
  const rows = vendors.map(vendorToRow);
  return writeSheetData(accessToken, GOOGLE_SHEETS_CONFIG.vendorsSheet, VENDOR_HEADERS, rows);
};

// ==================== WRITE MONTHLY SHEETS ====================
const MONTHLY_SHEET_HEADERS = ["id", "month", "year", "campus", "group", "sheetName", "items", "uploadedBy", "uploadedAt", "updatedAt"];

const monthlySheetToRow = (sheet: MonthlySheet): string[] => [
  sheet.id,
  sheet.month || "",
  String(sheet.year || new Date().getFullYear()),
  sheet.campus || "",
  sheet.group || "",
  sheet.sheetName || "",
  JSON.stringify(sheet.items || []),
  sheet.uploadedBy || "",
  sheet.uploadedAt || "",
  sheet.updatedAt || "",
];

export const writeMonthlySheets = async (accessToken: string, monthlySheets: MonthlySheet[]): Promise<boolean> => {
  const rows = monthlySheets.map(monthlySheetToRow);
  return writeSheetData(accessToken, GOOGLE_SHEETS_CONFIG.monthlySheetsSheet, MONTHLY_SHEET_HEADERS, rows);
};

// ==================== WRITE REMINDERS ====================
const REMINDER_HEADERS = ["id", "type", "title", "message", "date", "relatedId", "relatedType", "isDismissed", "isCompleted"];

const reminderToRow = (reminder: Reminder): string[] => [
  reminder.id,
  reminder.type || "",
  reminder.title || "",
  reminder.message || "",
  reminder.date || "",
  reminder.relatedId || "",
  reminder.relatedType || "",
  String(reminder.isDismissed || false),
  String(reminder.isCompleted || false),
];

export const writeReminders = async (accessToken: string, reminders: Reminder[]): Promise<boolean> => {
  const rows = reminders.map(reminderToRow);
  return writeSheetData(accessToken, GOOGLE_SHEETS_CONFIG.remindersSheet, REMINDER_HEADERS, rows);
};

// ==================== WRITE ACTIVITY LOGS ====================
const ACTIVITY_LOG_HEADERS = ["id", "userId", "userName", "action", "module", "details", "timestamp", "relatedId"];

const activityLogToRow = (log: ActivityLogEntry): string[] => [
  log.id,
  log.userId || "",
  log.userName || "",
  log.action || "",
  log.module || "",
  log.details || "",
  log.timestamp || "",
  log.relatedId || "",
];

export const writeActivityLogs = async (accessToken: string, activityLogs: ActivityLogEntry[]): Promise<boolean> => {
  const rows = activityLogs.map(activityLogToRow);
  return writeSheetData(accessToken, GOOGLE_SHEETS_CONFIG.activityLogsSheet, ACTIVITY_LOG_HEADERS, rows);
};

// ==================== WRITE GENERAL TASKS ====================
const GENERAL_TASK_HEADERS = ["id", "title", "description", "assignedTo", "assignedBy", "createdAt", "updatedAt", "dueDate", "status", "priority", "remarks"];

const generalTaskToRow = (task: any): string[] => [
  task.id || "",
  task.title || "",
  task.description || "",
  task.assignedTo || "",
  task.assignedBy || "",
  task.createdAt || "",
  task.updatedAt || "",
  task.dueDate || "",
  task.status || "pending",
  task.priority || "medium",
  JSON.stringify(task.remarks || []),
];

export const writeGeneralTasks = async (accessToken: string, generalTasks: any[]): Promise<boolean> => {
  const rows = generalTasks.map(generalTaskToRow);
  return writeSheetData(accessToken, GOOGLE_SHEETS_CONFIG.generalTasksSheet, GENERAL_TASK_HEADERS, rows);
};

// ==================== WRITE CUSTOM REMINDERS ====================
const CUSTOM_REMINDER_HEADERS = ["id", "title", "message", "date", "createdBy", "createdByName", "isCompleted", "linkedType", "linkedId", "linkedLabel"];

const customReminderToRow = (reminder: any): string[] => [
  reminder.id || "",
  reminder.title || "",
  reminder.message || "",
  reminder.date || "",
  reminder.createdBy || "",
  reminder.createdByName || "",
  String(reminder.isCompleted || false),
  reminder.linkedType || "",
  reminder.linkedId || "",
  reminder.linkedLabel || "",
];

export const writeCustomReminders = async (accessToken: string, customReminders: any[]): Promise<boolean> => {
  const rows = customReminders.map(customReminderToRow);
  return writeSheetData(accessToken, GOOGLE_SHEETS_CONFIG.remindersSheet, CUSTOM_REMINDER_HEADERS, rows);
};

// ==================== SYNC ALL DATA TO SHEETS ====================
export interface SyncToSheetResult {
  users: boolean;
  tasks: boolean;
  files: boolean;
  tenders: boolean;
  contracts: boolean;
  vendors: boolean;
  monthlySheets: boolean;
  reminders: boolean;
  activityLogs: boolean;
}

export const syncAllDataToSheet = async (
  accessToken: string,
  data: AllSheetData
): Promise<SyncToSheetResult> => {
  console.log("Writing all data to Google Sheets...", {
    users: data.users?.length || 0,
    tasks: data.tasks?.length || 0,
    files: data.files?.length || 0,
    tenders: data.tenders?.length || 0,
    contracts: data.contracts?.length || 0,
    vendors: data.vendors?.length || 0,
    monthlySheets: data.monthlySheets?.length || 0,
    reminders: data.reminders?.length || 0,
    activityLogs: data.activityLogs?.length || 0,
  });
  
  const [users, tasks, files, tenders, contracts, vendors, monthlySheets, reminders, activityLogs] = await Promise.all([
    writeUsers(accessToken, data.users),
    writeTasks(accessToken, data.tasks),
    writeFiles(accessToken, data.files),
    writeTenders(accessToken, data.tenders),
    writeContracts(accessToken, data.contracts),
    writeVendors(accessToken, data.vendors),
    writeMonthlySheets(accessToken, data.monthlySheets),
    writeReminders(accessToken, data.reminders),
    writeActivityLogs(accessToken, data.activityLogs),
  ]);

  const result = { users, tasks, files, tenders, contracts, vendors, monthlySheets, reminders, activityLogs };
  console.log("Write results:", result);
  return result;
};