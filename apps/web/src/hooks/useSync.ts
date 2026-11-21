import { useCallback, useEffect, useState } from "react";

import {
  ApiError,
  getSyncStatus,
  syncPull,
  syncPush,
  type SyncStatus,
} from "@/lib/api-client";
import { getDeviceId, setLastSyncAt } from "@/lib/device-id";

export type SyncDisplayState = "synced" | "syncing" | "offline" | "error";

function mapStatus(api: SyncStatus | null, syncing: boolean, errored: boolean): SyncDisplayState {
  if (syncing) return "syncing";
  if (errored) return "error";
  if (!api) return "offline";
  if (api.state === "error") return "error";
  if (api.state === "offline") return "offline";
  if (api.state === "syncing") return "syncing";
  return "synced";
}

export function useSync(enabled: boolean) {
  const [apiStatus, setApiStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [errored, setErrored] = useState(false);

  const refreshStatus = useCallback(() => {
    return getSyncStatus()
      .then((status) => {
        setApiStatus(status);
        setErrored(false);
      })
      .catch(() => {
        setErrored(true);
      });
  }, []);

  useEffect(() => {
    if (!enabled) {
      setApiStatus({ state: "offline", last_sync_at: null, message: "sign in to sync" });
      return;
    }
    let live = true;
    refreshStatus().finally(() => {
      if (!live) return;
    });
    const timer = window.setInterval(() => {
      if (!syncing) refreshStatus();
    }, 30_000);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [enabled, refreshStatus, syncing]);

  const syncNow = useCallback(async () => {
    if (!enabled) return;
    setSyncing(true);
    setErrored(false);
    const deviceId = getDeviceId();
    try {
      await syncPush({ device_id: deviceId, records: [] });
      await syncPull({ device_id: deviceId, limit: 100 });
      const now = new Date().toISOString();
      setLastSyncAt(now);
      await refreshStatus();
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        setApiStatus({ state: "offline", last_sync_at: null, message: "sign in to sync" });
      } else {
        setErrored(true);
      }
      throw error;
    } finally {
      setSyncing(false);
    }
  }, [enabled, refreshStatus]);

  const displayState = mapStatus(apiStatus, syncing, errored);

  return {
    displayState,
    message: errored ? "Sync request failed" : (apiStatus?.message ?? null),
    syncNow,
    refreshStatus,
  };
}