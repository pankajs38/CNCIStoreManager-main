// filepath: src/components/GoogleSheetsSync.tsx
import { useEffect, useState, useRef } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useTaskStore } from "@/stores/taskStore";
import { useTenderStore } from "@/stores/tenderStore";
import { useFileStore } from "@/stores/fileStore";

interface LocalDataLoaderProps {
  children: React.ReactNode;
}

export const LocalDataLoader = ({ children }: LocalDataLoaderProps) => {
  const { syncFromSheet, sheetData, isLoading } = useAuthStore();
  const [isLoadingLocal, setIsLoadingLocal] = useState(false);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    const initializeLocalData = async () => {
      if (hasLoadedRef.current || sheetData) return;
      hasLoadedRef.current = true;
      setIsLoadingLocal(true);

      try {
        await syncFromSheet();
        useTaskStore.getState().loadFromSheetData();
        useTenderStore.getState().loadFromSheetData();
        useFileStore.getState().loadFromSheetData();
      } catch (error) {
        console.error("Failed to load local Excel data:", error);
      } finally {
        setIsLoadingLocal(false);
      }
    };

    initializeLocalData();
  }, [sheetData, syncFromSheet]);

  // Show loading state while initializing local data
  if (isLoading || isLoadingLocal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading local Excel data...</p>
          <p className="text-sm text-gray-400 mt-2">Please wait while we initialize the app.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default LocalDataLoader;