// filepath: src/components/GoogleSheetsSync.tsx
import { useEffect, useState, useRef } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useTaskStore } from "@/stores/taskStore";
import { useTenderStore } from "@/stores/tenderStore";
import { useFileStore } from "@/stores/fileStore";
import { initiateGoogleOAuth, handleOAuthCallback } from "@/lib/googleAuth";

interface GoogleSheetsSyncProps {
  children: React.ReactNode;
}

export const GoogleSheetsSync = ({ children }: GoogleSheetsSyncProps) => {
  const { syncFromSheet, accessToken, lastSynced, isLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const hasSyncedRef = useRef(false);
  const isProcessingCallbackRef = useRef(false);
  const hasInitiatedOAuthRef = useRef(false);

  useEffect(() => {
    const parseCallbackParams = () => {
      let code = null;
      let state = null;

      const urlParams = new URLSearchParams(window.location.search);
      code = urlParams.get("code");
      state = urlParams.get("state");

      if ((!code || !state) && window.location.hash) {
        const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
        const [, query] = hash.split("?", 2);
        if (query) {
          const hashParams = new URLSearchParams(query);
          code = code || hashParams.get("code");
          state = state || hashParams.get("state");
        }
      }

      return { code, state };
    };

    const performSync = async () => {
      // Prevent multiple concurrent sync attempts
      if (hasSyncedRef.current) {
        return;
      }

      // Skip OAuth processing if we're on the callback route - let OAuthCallback component handle it
      if (window.location.pathname === "/auth/callback" || window.location.hash.startsWith("#/auth/callback")) {
        return;
      }

      const { code, state } = parseCallbackParams();

      // If we have OAuth params in URL, skip processing here (OAuthCallback will handle)
      if (code && state) {
        return;
      }

      // If we're already processing callback, don't do anything
      if (isProcessingCallbackRef.current) {
        return;
      }

      // Check if we have a valid access token - sync users BEFORE login
      if (!accessToken) {
        // Only initiate OAuth once and only if we haven't synced before
        if (!hasInitiatedOAuthRef.current && !lastSynced) {
          hasInitiatedOAuthRef.current = true;
          initiateGoogleOAuth();
        }
        return;
      }

      // We have a token, sync users from sheet (needed for login)
      // Only sync once per session
      if (!lastSynced && !hasSyncedRef.current) {
        hasSyncedRef.current = true;
        setIsSyncing(true);
        try {
          await syncFromSheet(accessToken);
          
          // Load all data into individual stores after sync completes
          console.log("Loading data into stores...");
          useTaskStore.getState().loadFromSheetData();
          useTenderStore.getState().loadFromSheetData();
          useFileStore.getState().loadFromSheetData();
          console.log("All stores loaded with sheet data");
        } catch (err) {
          console.error("Failed to sync data from Google Sheets:", err);
          hasSyncedRef.current = false; // Allow retry on error
        } finally {
          setIsSyncing(false);
        }
      }
    };

    performSync();
  }, [accessToken, syncFromSheet, lastSynced]);

  // Show loading state while syncing
  if (isSyncing || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Syncing with Google Sheets...</p>
          <p className="text-sm text-gray-400 mt-2">Please wait while we load your data</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Sync Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default GoogleSheetsSync;