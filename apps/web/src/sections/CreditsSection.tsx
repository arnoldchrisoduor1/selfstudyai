import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import { Button } from "@self-study/ui/Button";
import { DataTable } from "@self-study/ui/DataTable";
import { EmptyState } from "@self-study/ui/EmptyState";
import { ErrorState } from "@self-study/ui/ErrorState";
import { Input } from "@self-study/ui/Input";
import { Loader } from "@self-study/ui/Loader";
import { StatCard } from "@self-study/ui/StatCard";
import { useToast } from "@self-study/ui/useToast";

import {
  ApiError,
  getCreditsBalance,
  getCreditsLedger,
  topupCredits,
  type CreditsBalance,
  type CreditsLedgerEntry,
} from "@/lib/api-client";
import { basePath } from "@/lib/nav";

const LOW_BALANCE_THRESHOLD = 100;

export function CreditsSection() {
  const router = useRouter();
  const { push } = useToast();
  const [balance, setBalance] = useState<CreditsBalance | null>(null);
  const [ledger, setLedger] = useState<CreditsLedgerEntry[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "unauthorized">("loading");
  const [amount, setAmount] = useState("500");
  const [busy, setBusy] = useState(false);

  function reload() {
    setStatus("loading");
    Promise.all([getCreditsBalance(), getCreditsLedger()])
      .then(([bal, entries]) => {
        setBalance(bal);
        setLedger(entries);
        setStatus("ready");
      })
      .catch((error) => {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          setStatus("unauthorized");
          return;
        }
        setStatus("error");
      });
  }

  useEffect(() => {
    reload();
  }, []);

  if (status === "loading") return <Loader label="Loading credits" />;
  if (status === "unauthorized") {
    return (
      <ErrorState
        title="Sign in required"
        message="Open Settings → Account & sync to sign in."
        onRetry={() => router.push(`${basePath}/settings/`)}
      />
    );
  }
  if (status === "error") {
    return <ErrorState title="Credits unavailable" message="The API did not respond." onRetry={reload} />;
  }
  if (!balance) return <EmptyState title="No balance" message="Balance data missing." />;

  const low = balance.available < LOW_BALANCE_THRESHOLD;

  return (
    <section className="flex max-w-3xl flex-col gap-lg" data-testid="credits-section">
      <h1 className="font-heading text-3xl font-semibold">Credits</h1>
      {low ? (
        <p className="text-base text-destructive" data-testid="low-balance-warning">
          Low balance: {balance.available} credits available.
        </p>
      ) : null}
      <div className="grid gap-md sm:grid-cols-3">
        <StatCard label="Balance" value={String(balance.balance)} data-testid="credits-balance" />
        <StatCard label="Reserved" value={String(balance.reserved)} />
        <StatCard label="Available" value={String(balance.available)} data-testid="credits-available" />
      </div>
      <div className="flex flex-wrap items-end gap-md">
        <Input
          label="Top-up amount"
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          data-testid="topup-amount"
        />
        <Button
          disabled={busy}
          onClick={async () => {
            const credits = Number(amount);
            if (!Number.isFinite(credits) || credits <= 0) {
              push("Enter a positive amount", "warning");
              return;
            }
            setBusy(true);
            try {
              await topupCredits({
                amount_credits: credits,
                idempotency_key: `web-topup-${Date.now()}`,
              });
              push("Top-up recorded", "success");
              reload();
            } catch {
              push("Top-up failed", "error");
            } finally {
              setBusy(false);
            }
          }}
          data-testid="topup-submit"
        >
          Mock top up
        </Button>
      </div>
      {ledger.length === 0 ? (
        <EmptyState title="No ledger entries" message="Top up to add credits." />
      ) : (
        <DataTable
          rows={ledger}
          getRowId={(row) => row.id}
          columns={[
            { key: "amount", header: "Amount", cell: (row) => row.amount },
            { key: "kind", header: "Kind", cell: (row) => row.kind },
            { key: "reference", header: "Reference", cell: (row) => row.reference ?? "—" },
            { key: "created", header: "Created", cell: (row) => row.created_at },
          ]}
        />
      )}
    </section>
  );
}