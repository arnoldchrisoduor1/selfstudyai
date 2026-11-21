import { useCallback, useEffect, useState } from "react";

import {
  deleteSource,
  getSource,
  listSources,
  reembedSource,
  uploadSource,
  type Source,
} from "@/lib/api-client";

type Status = "loading" | "ready" | "error";

export function useSources(subjectId?: string) {
  const [sources, setSources] = useState<Source[]>([]);
  const [status, setStatus] = useState<Status>("loading");

  const reload = useCallback(() => {
    setStatus("loading");
    listSources(subjectId)
      .then((rows) => {
        setSources(rows);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [subjectId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    sources,
    status,
    reload,
    upload: (file: File, kind?: string) => {
      if (!subjectId) return Promise.reject(new Error("subject required"));
      return uploadSource({ subjectId, file, kind });
    },
    remove: (id: string) => deleteSource(id),
    reembed: (id: string) => reembedSource(id),
  };
}

export function useSource(id: string | undefined) {
  const [source, setSource] = useState<Source | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  const reload = useCallback(() => {
    if (!id) {
      setSource(null);
      setStatus("ready");
      return;
    }
    setStatus("loading");
    getSource(id)
      .then((row) => {
        setSource(row);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { source, status, reload };
}
