import { useCallback, useEffect, useState } from "react";

import { getAuthMe, type AuthMe } from "@/lib/api-client";

export function useAuth() {
  const [me, setMe] = useState<AuthMe | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const reload = useCallback(() => {
    setStatus("loading");
    getAuthMe()
      .then((data) => {
        setMe(data);
        setStatus("ready");
      })
      .catch(() => {
        setMe(null);
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    me,
    signedIn: me !== null,
    status,
    reload,
  };
}