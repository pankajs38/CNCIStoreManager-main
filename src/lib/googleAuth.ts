// filepath: src/lib/googleAuth.ts
// Google OAuth client helpers for a secure backend-based OAuth flow

const getBackendBase = (): string => {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
};

export const initiateGoogleOAuth = (): void => {
  window.location.href = `${getBackendBase()}/api/auth/start`;
};

const parseHashParams = () => {
  if (typeof window === "undefined") {
    return new URLSearchParams("");
  }

  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  const [, query] = hash.split("?", 2);
  return new URLSearchParams(query || "");
};

export const handleOAuthCallback = async (): Promise<{ accessToken: string } | null> => {
  const params = parseHashParams();
  const accessToken = params.get("access_token");

  if (!accessToken) {
    return null;
  }

  return { accessToken };
};

export const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const response = await fetch("/api/auth/refresh", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.access_token || null;
  } catch (error) {
    console.error("Refresh token request failed:", error);
    return null;
  }
};

export const isOAuthConfigured = (): boolean => {
  return true;
};
  return Math.random().toString(36).substring(2, 15);
};

// Store state for verification
let oauthState: string | null = null;

export const initiateGoogleOAuth = (): void => {
  oauthState = generateState();
  localStorage.setItem("oauth_state", oauthState);

  const redirectUri = getRedirectUri();
  console.log("Google OAuth redirect_uri:", redirectUri);

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPES.join(" "));
  authUrl.searchParams.set("state", oauthState);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");

  window.location.href = authUrl.toString();
};

export const handleOAuthCallback = async (code: string, state: string): Promise<{ accessToken: string; refreshToken?: string } | null> => {
  const savedState = localStorage.getItem("oauth_state");
  
  // State from Google might contain additional params (like iss), extract just the state value
  const stateValue = state.split('&')[0];
  
  if (savedState && stateValue !== savedState) {
    console.error("OAuth state mismatch!", { received: stateValue, saved: savedState });
    return null;
  }

  localStorage.removeItem("oauth_state");

  try {
    // Exchange code for tokens
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: getRedirectUri(),
        grant_type: "authorization_code",
      }),
    });

    const responseText = await response.text();
    console.log("Token response status:", response.status);
    console.log("Token response body:", responseText);

    if (!response.ok) {
      throw new Error(`Failed to exchange code for tokens: ${responseText}`);
    }

    const data = JSON.parse(responseText);
    return { accessToken: data.access_token, refreshToken: data.refresh_token };
  } catch (error) {
    console.error("OAuth token exchange failed:", error);
    return null;
  }
};

export const refreshAccessToken = async (refreshToken: string): Promise<string | null> => {
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh token");
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("Token refresh failed:", error);
    return null;
  }
};

export const isOAuthConfigured = (): boolean => {
  return GOOGLE_CLIENT_ID !== "YOUR_GOOGLE_CLIENT_ID";
};