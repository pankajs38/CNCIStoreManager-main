import { lazy, Suspense, useEffect, useState, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuthStore } from "@/stores/authStore";
import { Toaster } from "@/components/ui/toaster";
import { handleOAuthCallback } from "@/lib/googleAuth";
import { useTaskStore } from "@/stores/taskStore";
import { useTenderStore } from "@/stores/tenderStore";
import { useFileStore } from "@/stores/fileStore";

const Login = lazy(() => import("@/pages/Login"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const TaskManager = lazy(() => import("@/pages/TaskManager"));
const FileManager = lazy(() => import("@/pages/FileManager"));
const TenderManager = lazy(() => import("@/pages/TenderManager"));
const ContractTracker = lazy(() => import("@/pages/ContractTracker"));
const Settings = lazy(() => import("@/pages/Settings"));
const Customisation = lazy(() => import("@/pages/Customisation"));
const ActivityLog = lazy(() => import("@/pages/ActivityLog"));
const Profile = lazy(() => import("@/pages/Profile"));
const BestPerformers = lazy(() => import("@/pages/BestPerformers"));

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="size-10 border-4 border-gold/30 border-t-gold rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground font-medium">Loading...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// OAuth callback handler component - processes the OAuth code and redirects
function OAuthCallback() {
  const navigate = useNavigate();
  const { setAccessToken, syncFromSheet } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    const processCallback = async () => {
      if (hasProcessedRef.current) return;
      hasProcessedRef.current = true;

      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const state = urlParams.get("state");

      if (!code || !state) {
        console.warn("No OAuth code or state found, redirecting to login");
        navigate("/login", { replace: true });
        return;
      }

      try {
        const tokens = await handleOAuthCallback(code, state);
        
        if (tokens) {
          setAccessToken(tokens.accessToken);
          if (tokens.refreshToken) {
            // Store refresh token if available
            localStorage.setItem("refresh_token", tokens.refreshToken);
          }
          await syncFromSheet(tokens.accessToken);
          
          // Load all data into individual stores
          useTaskStore.getState().loadFromSheetData();
          useTenderStore.getState().loadFromSheetData();
          useFileStore.getState().loadFromSheetData();
          
          // Redirect to dashboard after successful auth
          navigate("/dashboard", { replace: true });
        } else {
          console.error("Failed to get access token");
          setError("Authentication failed. Please try again.");
          // Clear URL params to prevent re-attempt
          window.history.replaceState({}, document.title, window.location.pathname);
          setTimeout(() => navigate("/login", { replace: true }), 2000);
        }
      } catch (err) {
        console.error("OAuth callback error:", err);
        setError("Authentication error. Please try again.");
        // Clear URL params to prevent re-attempt
        window.history.replaceState({}, document.title, window.location.pathname);
        setTimeout(() => navigate("/login", { replace: true }), 2000);
      }
    };

    processCallback();
  }, [navigate, setAccessToken, syncFromSheet]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<OAuthCallback />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tasks" element={<TaskManager />} />
            <Route path="/files" element={<FileManager />} />
            <Route path="/tenders" element={<TenderManager />} />
            <Route path="/contracts" element={<ContractTracker />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/customisation" element={<Customisation />} />
            <Route path="/activity" element={<ActivityLog />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/best-performers" element={<BestPerformers />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
      <Toaster />
    </BrowserRouter>
  );
}
