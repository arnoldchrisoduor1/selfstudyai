import { useCallback, useEffect, useState } from "react";

import { listChunks, listTopics, updateTopic, type Chunk, type Topic } from "@/lib/api-client";

type Status = "loading" | "ready" | "error";

export function useTopics(sourceId: string | undefined) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [status, setStatus] = useState<Status>("loading");

  const reload = useCallback(() => {
    if (!sourceId) {
      setTopics([]);
      setChunks([]);
      setStatus("ready");
      return;
    }
    setStatus("loading");
    Promise.all([listTopics(sourceId), listChunks(sourceId)])
      .then(([topicRows, chunkRows]) => {
        setTopics(topicRows);
        setChunks(chunkRows);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [sourceId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    topics,
    chunks,
    status,
    reload,
    patchTopic: (id: string, input: { title?: string; position?: number; is_core?: boolean }) =>
      updateTopic(id, input),
  };
}
