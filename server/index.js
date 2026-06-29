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
    
    // Always read existing file if it exists to preserve data
    if (fs.existsSync(excelPath)) {
      try {
        workbook = XLSX.readFile(excelPath);
        console.log(`Read existing workbook from ${excelPath}`);
      } catch (readError) {
        console.error(`Error reading existing file, creating new: ${readError.message}`);
        workbook = XLSX.utils.book_new();
      }
    } else {
      workbook = XLSX.utils.book_new();
      console.log(`Creating new workbook at ${excelPath}`);
    }

    // Prepare data: headers + new rows
    const data = [headers, ...rows];

    // Create worksheet from data
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Add or update the sheet
    if (!workbook.SheetNames.includes(sheetName)) {
      workbook.SheetNames.push(sheetName);
    }
    workbook.Sheets[sheetName] = worksheet;

    // Write to file
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
    fs.writeFileSync(excelPath, excelBuffer);
    
    console.log(`Successfully wrote ${rows.length} rows to sheet "${sheetName}" in ${excelPath}`);

    res.json({
      success: true,
      message: `Sheet "${sheetName}" updated with ${rows.length} rows`,
      filePath: excelPath
    });
  } catch (error) {
    console.error("Error writing to Excel sheet:", error);
    res.status(500).json({ 
      error: "Failed to write Excel file",
      details: error.message 
    });
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
