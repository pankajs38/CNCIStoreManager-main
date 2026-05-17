import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

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
app.use(cookieParser());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, "../dist");

const getRedirectUri = (req) => {
  const origin = `${req.protocol}://${req.get("host")}`;
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

app.get("/api/auth/start", (req, res) => {
  const state = Math.random().toString(36).substring(2, 15);
  res.cookie(COOKIE_STATE_NAME, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60 * 1000,
  });
  res.redirect(buildAuthUrl(req, state));
});

app.get("/api/auth/callback", async (req, res) => {
  const { code, state } = req.query;
  const savedState = req.cookies[COOKIE_STATE_NAME];

  if (!code || !state || state !== savedState) {
    return res.status(400).send("OAuth callback state mismatch or missing parameters.");
  }

  res.clearCookie(COOKIE_STATE_NAME);

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: getRedirectUri(req),
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Token exchange failed", tokenData);
      return res.status(500).send("Failed to exchange authorization code for token.");
    }

    const { access_token: accessToken, refresh_token: refreshToken, expires_in: expiresIn } = tokenData;

    if (refreshToken) {
      res.cookie(COOKIE_REFRESH_NAME, refreshToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }

    const appOrigin = `${req.protocol}://${req.get("host")}`;
    return res.redirect(`${appOrigin}/#/auth/callback?access_token=${encodeURIComponent(accessToken)}&expires_in=${encodeURIComponent(expiresIn)}`);
  } catch (error) {
    console.error("OAuth callback error", error);
    return res.status(500).send("OAuth callback processing failed.");
  }
});

app.get("/api/auth/refresh", async (req, res) => {
  const refreshToken = req.cookies[COOKIE_REFRESH_NAME];

  if (!refreshToken) {
    return res.status(401).json({ error: "missing_refresh_token" });
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Refresh token failed", data);
      return res.status(500).json({ error: "refresh_failed" });
    }

    return res.json({ access_token: data.access_token, expires_in: data.expires_in });
  } catch (error) {
    console.error("Refresh token request failed", error);
    return res.status(500).json({ error: "refresh_request_failed" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie(COOKIE_REFRESH_NAME, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  res.json({ ok: true });
});

app.use(express.static(distPath));
app.get("/*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
