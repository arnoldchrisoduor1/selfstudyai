import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import { Button } from "@self-study/ui/Button";
import { SyncStatusChip } from "@self-study/ui/SyncStatusChip";
import { cn } from "@self-study/ui/cn";

import { EncouragementTicker } from "@/components/EncouragementTicker";
import { useAuth } from "@/hooks/useAuth";
import { useSync } from "@/hooks/useSync";
import { getActiveSessionId } from "@/lib/active-session";
import { getDashboard } from "@/lib/api-client";
import { basePath } from "@/lib/nav";

export function ShellTopBar() {
  const router = useRouter();
  const { me, signedIn } = useAuth();
  const { displayState, message, syncNow, refreshStatus } = useSync(signedIn);
  const [points, setPoints] = useState<string | null>(null);
  const [streak, setStreak] = useState<string | null>(null);
  const [activeSessionId, setActive] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    getDashboard()
      .then((data) => {
        if (!live) return;
        setPoints(String(data.total_points));
        setStreak(String(data.streak.current));
      })
      .catch(() => {
        if (!live) return;
        setPoints(null);
        setStreak(null);
      });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    const read = () => setActive(getActiveSessionId());
    read();
    const onStorage = (event: StorageEvent) => {
      if (event.key === "self-study-active-session") read();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", read);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", read);
    };
  }, [router.asPath]);

  const studyLabel = activeSessionId ? "Continue studying" : "Start studying";
  const studyHref = activeSessionId
    ? `${basePath}/study/session/?id=${activeSessionId}`
    : `${basePath}/study/`;

  return (
    <div className="flex w-full min-w-0 items-center gap-md" data-testid="shell-top-bar">
      <div className="hidden shrink-0 items-center gap-sm md:flex">
        {streak !== null ? (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold tabular-nums text-primary"
            data-testid="header-streak"
          >
            Streak {streak}
          </span>
        ) : null}
        {points !== null ? (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-3 py-1.5 text-xs font-semibold tabular-nums text-foreground"
            data-testid="header-points"
          >
            Pts {points}
          </span>
        ) : null}
      </div>

      <div className="hidden min-w-0 flex-1 justify-center px-md lg:flex">
        <EncouragementTicker className="max-w-md rounded-full bg-muted/80 px-4 py-1.5" />
      </div>

      <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-sm sm:gap-md">
        <SyncStatusChip
          state={displayState}
          message={displayState === "error" ? message : null}
          className="!flex-row items-center gap-sm"
          onRetry={() => {
            if (signedIn) syncNow().catch(() => refreshStatus());
            else refreshStatus();
          }}
          data-testid="header-sync"
        />

        {signedIn && me ? (
          <span
            className="hidden max-w-[10rem] truncate text-sm font-medium text-foreground sm:inline"
            data-testid="header-user"
            title={me.user.email}
          >
            {me.user.email}
          </span>
        ) : null}

        <Button
          className={cn("min-h-10 min-w-0 px-4 text-sm")}
          data-testid="header-study-cta"
          onClick={() => router.push(studyHref)}
        >
          {studyLabel}
        </Button>
      </div>
    </div>
  );
}
