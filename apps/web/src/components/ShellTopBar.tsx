import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/router";

import { Button } from "@self-study/ui/Button";
import { Icon } from "@self-study/ui/Icon";
import { SearchInput } from "@self-study/ui/SearchInput";
import { SyncStatusChip } from "@self-study/ui/SyncStatusChip";

import { useAuth } from "@/hooks/useAuth";
import { useSync } from "@/hooks/useSync";
import { getActiveSessionId } from "@/lib/active-session";
import { getCreditsBalance } from "@/lib/api-client";
import { basePath } from "@/lib/nav";

export function ShellTopBar() {
  const router = useRouter();
  const { me, signedIn } = useAuth();
  const { displayState, message, syncNow, refreshStatus } = useSync(signedIn);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [credits, setCredits] = useState<string | null>(null);
  const [activeSessionId, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (!signedIn) {
      setCredits(null);
      return;
    }
    let live = true;
    getCreditsBalance()
      .then((balance) => {
        if (live) setCredits(String(balance.available));
      })
      .catch(() => {
        if (live) setCredits(null);
      });
    return () => {
      live = false;
    };
  }, [signedIn]);

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

  const studyLabel = activeSessionId ? "Continue review" : "Start review";
  const studyHref = activeSessionId
    ? `${basePath}/study/session/?id=${activeSessionId}`
    : `${basePath}/study/`;

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearchOpen(false);
    router.push(`${basePath}/sources/?q=${encodeURIComponent(trimmed)}`);
  }

  const searchField = (testId: string) => (
    <form onSubmit={submitSearch} className="min-w-0 flex-1" role="search">
      <SearchInput
        label="Search notes and books"
        labelHidden
        placeholder="Search notes and books"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        data-testid={testId}
      />
    </form>
  );

  return (
    <div className="flex w-full min-w-0 items-center gap-sm" data-testid="shell-top-bar">
      <div className="hidden min-w-0 flex-1 md:block">{searchField("header-search")}</div>
      {searchOpen ? (
        <div className="flex min-w-0 flex-1 items-center gap-sm md:hidden">
          {searchField("header-search-mobile")}
          <Button type="button" variant="quiet" onClick={() => setSearchOpen(false)}>
            Close
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="quiet"
          className="min-w-11 px-sm md:hidden"
          aria-label="Search"
          data-testid="header-search-open"
          onClick={() => setSearchOpen(true)}
        >
          <Icon name="search" />
        </Button>
      )}
      <div className={searchOpen ? "hidden md:contents" : "contents"}>
          <Button
            type="button"
            variant="secondary"
            data-testid="header-add-material"
            onClick={() => router.push(`${basePath}/sources/`)}
          >
            <Icon name="upload_file" size="sm" />
            <span className="hidden sm:inline">Add material</span>
          </Button>
          {credits !== null ? (
            <span
              className="hidden items-center gap-xs rounded-full border border-border bg-surface px-sm text-label-sm text-text-muted md:inline-flex"
              data-testid="header-credits"
            >
              <Icon name="bolt" size="sm" />
              {credits}
            </span>
          ) : null}
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
              className="hidden max-w-sidebar truncate text-label-md text-foreground lg:inline"
              data-testid="header-user"
              title={me.user.email}
            >
              {me.user.email}
            </span>
          ) : null}
          <Button data-testid="header-study-cta" onClick={() => router.push(studyHref)}>
            <Icon name="play_arrow" size="sm" />
            <span className="hidden sm:inline">{studyLabel}</span>
          </Button>
      </div>
    </div>
  );
}
