// filepath: src/lib/googleSheets.ts
import { generateId } from "./utils";
import { GOOGLE_SHEETS_CONFIG } from "@/constants/config";

const SPREADSHEET_ID = GOOGLE_SHEETS_CONFIG.spreadsheetId;
const SHEET_NAME = GOOGLE_SHEETS_CONFIG.usersSheet;

// Google Sheets API configuration
const GOOGLE_SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";

// Field mapping based on User type
const USER_FIELDS = [
  "id",
  "name",
  "designation",
  "role",
  "password",
  "canCreateTender",
  "canScanData",
  "isActive",
  "photo",
  "mobile",
  "email",
  "employeeId",
  "department",
] as const;

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

// Parse boolean string to boolean
const parseBoolean = (value: string | boolean | undefined): boolean => {
  if (typeof value === "boolean") return value;
  if (!value) return false;
  return value.toLowerCase() === "true" || value === "1" || value === "yes";
};

// Convert sheet row to User object
const rowToUser = (row: string[], headers: string[]): GoogleSheetUser | null => {
  if (row.length < 2) return null;

  const user: GoogleSheetUser = {
    id: "",
    name: "",
    designation: "",
    role: "user",
    password: "",
    canCreateTender: false,
    canScanData: false,
    isActive: true,
  };

  headers.forEach((header, index) => {
    const field = header.trim().toLowerCase().replace(/\s+/g, ""); // Remove spaces
    const value = row[index]?.trim() || "";

    // Handle common header variations and typos
    if (field === "id" || field === "slno" || field === "sno" || field === "serial") user.id = value || generateId();
    else if (field === "name" || field === "username" || field === "user") user.name = value;
    else if (field === "designation" || field === "designaiton" || field === "desig" || field === "title") user.designation = value;
    else if (field === "role") user.role = value.toLowerCase() === "admin" ? "admin" : "user";
    else if (field === "password" || field === "pass" || field === "pwd") user.password = value;
    else if (field === "cancreatetender" || field === "cancreatetenders" || field === "createtender") user.canCreateTender = parseBoolean(value);
    else if (field === "canscandata" || field === "canscan" || field === "scandata") user.canScanData = parseBoolean(value);
    else if (field === "isactive" || field === "active" || field === "status") user.isActive = parseBoolean(value);
    else if (field === "photo" || field === "image" || field === "avatar") user.photo = value;
    else if (field === "mobile" || field === "phone" || field === "mobileno") user.mobile = value;
    else if (field === "email" || field === "emailid" || field === "mail") user.email = value;
    else if (field === "employeeid" || field === "empid" || field === "emp" || field === "employee") user.employeeId = value;
    else if (field === "department" || field === "dept" || field === "deptname") user.department = value;
  });

  // Validate required fields
  if (!user.name || !user.password) {
    console.warn("Skipping row - missing required fields:", row);
    return null;
  }

  // Default id if not provided
  if (!user.id) {
    user.id = generateId();
  }

  return user;
};

// Fetch users from Google Sheet
export const fetchUsersFromSheet = async (accessToken: string): Promise<GoogleSheetUser[]> => {
  try {
    const response = await fetch(
      `${GOOGLE_SHEETS_API}/${SPREADSHEET_ID}/values/${SHEET_NAME}!A:Z`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.values || data.values.length < 2) {
      console.warn("Sheet is empty or has no data rows");
      return [];
    }

    const headers = data.values[0] as string[];
    const rows = data.values.slice(1) as string[][];

    const users: GoogleSheetUser[] = [];
    for (const row of rows) {
      const user = rowToUser(row, headers);
      if (user) {
        users.push(user);
      }
    }

    return users;
  } catch (error) {
    console.error("Error fetching users from Google Sheet:", error);
    throw error;
  }
};

// Get spreadsheet info
export const getSpreadsheetInfo = async (accessToken: string) => {
  try {
    const response = await fetch(`${GOOGLE_SHEETS_API}/${SPREADSHEET_ID}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get spreadsheet info: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting spreadsheet info:", error);
    throw error;
  }
};

// Check if sheet exists
export const checkSheetExists = async (accessToken: string): Promise<boolean> => {
  try {
    const info = await getSpreadsheetInfo(accessToken);
    const sheets = info.sheets || [];
    return sheets.some((s: { properties: { title: string } }) => s.properties.title === SHEET_NAME);
  } catch {
    return false;
  }
};