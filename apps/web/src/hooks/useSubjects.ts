import { useCallback, useEffect, useState } from "react";

import {
  createSubject,
  deleteSubject,
  listSubjects,
  updateSubject,
  type Subject,
} from "@/lib/api-client";

export function useSubjects() {
  const [rows, setRows] = useState<Subject[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const reload = useCallback(() => {
    setStatus("loading");
    listSubjects()
      .then((next) => {
        setRows(next);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    rows,
    status,
    reload,
    createSubject,
    updateSubject,
    deleteSubject,
  };
}
