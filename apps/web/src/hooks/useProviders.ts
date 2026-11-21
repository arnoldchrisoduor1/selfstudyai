import { useCallback, useEffect, useState } from "react";

import {
  createProvider,
  deleteProvider,
  listProviders,
  setDefaultProvider,
  testProvider,
  updateProvider,
  type AiProvider,
} from "@/lib/api-client";

type Status = "loading" | "ready" | "error";

export function useProviders() {
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [status, setStatus] = useState<Status>("loading");

  const reload = useCallback(() => {
    setStatus("loading");
    listProviders()
      .then((rows) => {
        setProviders(rows);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    providers,
    status,
    reload,
    create: createProvider,
    update: updateProvider,
    remove: deleteProvider,
    test: testProvider,
    setDefault: setDefaultProvider,
  };
}
