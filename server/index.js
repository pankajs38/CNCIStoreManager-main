import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import XLSX from "xlsx";
import fs from "fs";

dotenv.config();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const COOKIE_STATE_NAME = "oauth_state";
const COOKIE_REFRESH_NAME = "refresh_token";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variable.");
}

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(cookieParser());
// When running behind a proxy (like Render), trust the proxy so
// `req.protocol` reflects the original request (http vs https).
app.set("trust proxy", true);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, "../dist");

const getRedirectUri = (req) => {
  // Prefer the X-Forwarded-Proto header when available (proxy sets this).
  const forwardedProto = (req.get("x-forwarded-proto") || req.protocol || "http").split(",")[0];
  const proto = forwardedProto.includes("https") ? "https" : "http";
  const origin = `${proto}://${req.get("host")}`;
  return `${origin}/api/auth/callback`;
};

const buildAuthUrl = (req, state) => {
  const redirectUri = getRedirectUri(req);
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPES.join(" "));
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  return authUrl.toString();
};

// OAuth endpoints disabled for local-only mode
app.get("/api/auth/start", (req, res) => {
  res.status(410).json({ error: "OAuth disabled in local-only mode" });
});

app.get("/api/auth/callback", async (req, res) => {
  res.status(410).send("OAuth callback endpoint disabled in local-only mode.");
});

app.get("/api/auth/refresh", async (req, res) => {
  res.status(410).json({ error: "OAuth refresh disabled in local-only mode" });
});

app.post("/api/auth/logout", (req, res) => {
  res.status(410).json({ error: "OAuth/logout disabled in local-only mode" });
});

// ==================== LOCAL EXCEL WRITE ENDPOINT ====================
app.post("/api/write-sheet", (req, res) => {
  try {
    const { sheetName, headers, rows } = req.body;

    if (!sheetName || !headers || !Array.isArray(rows)) {
      return res.status(400).json({
        error: "Missing or invalid parameters: sheetName, headers, rows",
      });
    }

    // Use dist folder for Excel file (served and accessible)
    const excelPath = path.join(distPath, "CNCIStoreManager.xlsx");

    let workbook;
    if (!fs.existsSync(excelPath)) {
      // Create new Excel file if it doesn't exist
      workbook = XLSX.utils.book_new();
      console.log(`Creating new workbook at ${excelPath}`);
    } else {
      // Read existing workbook
      workbook = XLSX.readFile(excelPath);
      console.log(`Read existing workbook from ${excelPath}`);
    }

    // Check if sheet exists; if not, create it
    if (!workbook.Sheets[sheetName]) {
      workbook.SheetNames.push(sheetName);
      // Create new sheet with headers + new rows
      const data = [headers, ...rows];
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      workbook.Sheets[sheetName] = worksheet;
      console.log(`Created new sheet "${sheetName}" with ${rows.length} rows`);
    } else {
      // Sheet exists - APPEND rows instead of replacing
      const existingSheet = workbook.Sheets[sheetName];
      
      // Convert existing sheet to array of arrays
      const existingData = XLSX.utils.sheet_to_json(existingSheet, { header: 1 });
      
      // Remove header from existing data (first row)
      const existingRows = existingData.slice(1);
      
      console.log(`Existing sheet has ${existingRows.length} rows`);
      
      // Combine existing rows with new rows
      const allData = [headers, ...existingRows, ...rows];
      
      // Create new worksheet with combined data
      const worksheet = XLSX.utils.aoa_to_sheet(allData);
      workbook.Sheets[sheetName] = worksheet;
      
      console.log(`Appended ${rows.length} new rows. Total now: ${allData.length - 1} rows`);
    }

    // Write back to file using proper Node.js method
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
    fs.writeFileSync(excelPath, excelBuffer);
    
    console.log(`Successfully wrote to ${excelPath}`);

    res.json({
      success: true,
      message: `Sheet "${sheetName}" updated with ${rows.length} new rows appended`,
      filePath: excelPath
    });
  } catch (error) {
    console.error("Error writing to Excel sheet:", error);
    res.status(500).json({ error: error.message, details: error.toString() });
  }
});

app.use(express.static(distPath));
app.get("/*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
