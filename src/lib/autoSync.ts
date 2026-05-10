// filepath: src/lib/autoSync.ts
// Auto-sync utility to write changes to Google Sheets automatically

import { useAuthStore } from "@/stores/authStore";
import { useTaskStore } from "@/stores/taskStore";
import { useFileStore } from "@/stores/fileStore";
import { useTenderStore } from "@/stores/tenderStore";
import { useSettingsStore } from "@/stores/settingsStore";

// Debounce timer for auto-sync
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let isSyncing = false;

// Sync delay in milliseconds (wait for multiple rapid changes)
const SYNC_DELAY = 2000; // 2 seconds

/**
 * Trigger auto-sync to Google Sheets with debouncing
 * Multiple rapid changes will be batched into a single sync
 */
export const triggerAutoSync = async (source: string) => {
  // Clear existing timer
  if (syncTimer) {
    clearTimeout(syncTimer);
  }
  
  // Set new timer for debounced sync
  syncTimer = setTimeout(async () => {
    await performAutoSync(source);
  }, SYNC_DELAY);
};

/**
 * Perform the actual sync to Google Sheets
 */
const performAutoSync = async (source: string) => {
  // Prevent concurrent syncs
  if (isSyncing) {
    console.log("Auto-sync: Already syncing, skipping...");
    return;
  }
  
  const accessToken = useAuthStore.getState().accessToken;
  if (!accessToken) {
    console.warn("Auto-sync: No access token, cannot sync");
    return;
  }
  
  isSyncing = true;
  console.log(`Auto-sync: Starting sync triggered by ${source}...`);
  
  try {
    // Sync all stores that have changes
    const results = await Promise.allSettled([
      useTaskStore.getState().syncToSheet(),
      useFileStore.getState().syncToSheet(),
      useTenderStore.getState().syncToSheet(),
      useSettingsStore.getState().syncToSheet(),
    ]);
    
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
    const totalCount = results.length;
    
    if (successCount === totalCount) {
      console.log(`Auto-sync: Successfully synced all data (${source})`);
    } else {
      console.warn(`Auto-sync: Partial success - ${successCount}/${totalCount} synced`);
    }
  } catch (error) {
    console.error("Auto-sync: Failed to sync:", error);
  } finally {
    isSyncing = false;
  }
};

/**
 * Force immediate sync (no debouncing)
 * Use this for critical operations that need immediate persistence
 */
export const forceImmediateSync = async (source: string): Promise<boolean> => {
  // Clear any pending debounced sync
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
  
  const accessToken = useAuthStore.getState().accessToken;
  if (!accessToken) {
    console.warn("Immediate sync: No access token, cannot sync");
    return false;
  }
  
  console.log(`Immediate sync: Starting forced sync triggered by ${source}...`);
  isSyncing = true;
  
  try {
    const results = await Promise.allSettled([
      useTaskStore.getState().syncToSheet(),
      useFileStore.getState().syncToSheet(),
      useTenderStore.getState().syncToSheet(),
    ]);
    
    const allSuccess = results.every(r => r.status === 'fulfilled' && r.value);
    
    if (allSuccess) {
      console.log(`Immediate sync: Successfully synced all data (${source})`);
    } else {
      console.error(`Immediate sync: Some syncs failed`, results);
    }
    
    return allSuccess;
  } catch (error) {
    console.error("Immediate sync: Failed:", error);
    return false;
  } finally {
    isSyncing = false;
  }
};

/**
 * Check if auto-sync is currently in progress
 */
export const isAutoSyncInProgress = () => isSyncing;