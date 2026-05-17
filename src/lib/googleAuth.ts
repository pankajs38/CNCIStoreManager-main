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
