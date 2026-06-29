import { lazy, Suspense } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuthStore } from "@/stores/authStore";
import { Toaster } from "@/components/ui/toaster";

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

export default function App() {
  return (
    <HashRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/login" element={<Login />} />
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
    </HashRouter>
  );
}
