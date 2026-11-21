import { useCallback, useEffect, useState } from "react";

import {
  createProfile,
  createSetting,
  listProfiles,
  listSettings,
  updateProfile,
  updateSetting,
  type LocalProfile,
  type Setting,
} from "@/lib/api-client";

export function useSettings() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const reload = useCallback(() => {
    setStatus("loading");
    Promise.all([listSettings(), listProfiles()])
      .then(([nextSettings, profiles]) => {
        setSettings(nextSettings);
        setProfile(profiles[0] ?? null);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    settings,
    profile,
    status,
    reload,
    createSetting,
    updateSetting,
    createProfile,
    updateProfile,
  };
}
