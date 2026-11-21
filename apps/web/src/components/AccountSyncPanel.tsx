import { useState } from "react";

import { Button } from "@self-study/ui/Button";
import { DataTable } from "@self-study/ui/DataTable";
import { Input } from "@self-study/ui/Input";
import { Loader } from "@self-study/ui/Loader";
import { Modal } from "@self-study/ui/Modal";
import { SettingRow } from "@self-study/ui/SettingRow";
import { StatusChip } from "@self-study/ui/StatusChip";
import { useToast } from "@self-study/ui/useToast";

import {
  authLogout,
  confirmPasswordReset,
  deleteAccount,
  fetchExport,
  linkLocalData,
  requestPasswordReset,
  signIn,
  signUp,
  verifyEmail,
} from "@/lib/api-client";
import { getLastSyncAt } from "@/lib/device-id";
import { useAuth } from "@/hooks/useAuth";
import { useSync } from "@/hooks/useSync";

export function AccountSyncPanel() {
  const { push } = useToast();
  const { me, signedIn, status, reload } = useAuth();
  const { displayState, message, syncNow } = useSync(signedIn);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const lastSync = getLastSyncAt();

  async function run(action: () => Promise<void>, success: string, failure: string) {
    setBusy(true);
    try {
      await action();
      push(success, "success");
      reload();
    } catch {
      push(failure, "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleExport() {
    setBusy(true);
    try {
      const data = await fetchExport();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `self-study-export-${data.exported_at.replace(/[:]/g, "-")}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      push("Export downloaded", "success");
    } catch {
      push("Export failed", "error");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") return <Loader label="Loading account" />;

  return (
    <section className="flex flex-col gap-lg" data-testid="account-sync-panel">
      {!signedIn ? (
        <>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="auth-email"
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="auth-password"
          />
          <div className="flex flex-wrap gap-sm">
            <Button
              disabled={busy}
              onClick={() =>
                run(
                  async () => {
                    await signUp({ email, password });
                  },
                  "Account created. Check email for verify token.",
                  "Sign up failed",
                )
              }
              data-testid="auth-sign-up"
            >
              Sign up
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() =>
                run(
                  async () => {
                    await signIn({ email, password });
                  },
                  "Signed in",
                  "Sign in failed",
                )
              }
              data-testid="auth-sign-in"
            >
              Sign in
            </Button>
          </div>
          <div className="border-t border-border pt-lg">
            <h2 className="mb-md font-heading text-xl font-semibold">Password reset</h2>
            <Input
              label="Email"
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              data-testid="reset-email"
            />
            <Button
              className="mt-md"
              variant="secondary"
              disabled={busy}
              onClick={() =>
                run(
                  async () => {
                    await requestPasswordReset(resetEmail);
                  },
                  "If the email exists, a reset token was sent",
                  "Reset request failed",
                )
              }
            >
              Send reset token
            </Button>
            <Input
              className="mt-md"
              label="Reset token"
              value={resetToken}
              onChange={(e) => setResetToken(e.target.value)}
              data-testid="reset-token"
            />
            <Input
              label="New password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              data-testid="reset-new-password"
            />
            <Button
              className="mt-md"
              variant="secondary"
              disabled={busy}
              onClick={() =>
                run(
                  async () => {
                    await confirmPasswordReset({ token: resetToken, new_password: newPassword });
                  },
                  "Password updated",
                  "Reset failed",
                )
              }
            >
              Confirm reset
            </Button>
          </div>
          <div className="border-t border-border pt-lg">
            <h2 className="mb-md font-heading text-xl font-semibold">Verify email</h2>
            <Input label="Verification token" value={verifyToken} onChange={(e) => setVerifyToken(e.target.value)} />
            <Button
              className="mt-md"
              variant="secondary"
              disabled={busy}
              onClick={() =>
                run(
                  async () => {
                    await verifyEmail(verifyToken);
                  },
                  "Email verified",
                  "Verification failed",
                )
              }
            >
              Verify
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-sm">
            <span className="text-base font-semibold">{me?.user.email}</span>
            <StatusChip
              label={me?.user.email_verified ? "Verified" : "Unverified"}
              tone={me?.user.email_verified ? "accent" : "neutral"}
            />
            <StatusChip label={displayState === "synced" ? "Sync OK" : displayState} tone="neutral" />
          </div>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          <SettingRow
            label="Last sync"
            helper={lastSync ?? me?.user.updated_at}
            control={<p className="text-base text-foreground">{lastSync ?? "Not synced on this device"}</p>}
          />
          <div className="flex flex-wrap gap-sm">
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await syncNow();
                  push("Sync complete", "success");
                } catch {
                  push("Sync failed", "error");
                } finally {
                  setBusy(false);
                }
              }}
              data-testid="sync-now"
            >
              Sync now
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => void handleExport()}>
              Export
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() =>
                run(
                  async () => {
                    await authLogout();
                  },
                  "Signed out. Local data kept.",
                  "Sign out failed",
                )
              }
            >
              Sign out
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => setLinkOpen(true)}>
              Link local data
            </Button>
            <Button variant="destructive" disabled={busy} onClick={() => setDeleteOpen(true)}>
              Delete account
            </Button>
          </div>
          <DataTable
            rows={(me?.sessions ?? []).filter((s) => !s.revoked_at)}
            getRowId={(row) => row.id}
            columns={[
              { key: "agent", header: "Device", cell: (row) => row.user_agent ?? row.kind },
              { key: "created", header: "Created", cell: (row) => row.created_at },
              { key: "expires", header: "Expires", cell: (row) => row.expires_at },
            ]}
          />
        </>
      )}

      <Modal open={linkOpen} title="Link local data" onClose={() => setLinkOpen(false)} data-testid="link-local-modal">
        <p className="mb-md text-base text-muted-foreground">
          Assign existing local rows to this account. This cannot be undone from the UI.
        </p>
        <Button
          disabled={busy}
          onClick={() =>
            run(
              async () => {
                await linkLocalData(true);
                setLinkOpen(false);
              },
              "Local data linked",
              "Link failed",
            )
          }
        >
          Confirm link
        </Button>
      </Modal>

      <Modal open={deleteOpen} title="Delete account" onClose={() => setDeleteOpen(false)} data-testid="delete-account-modal">
        <p className="mb-md text-base text-destructive">Permanently delete this account and revoke all sessions.</p>
        <Button
          variant="destructive"
          disabled={busy}
          onClick={() =>
            run(
              async () => {
                await deleteAccount();
                setDeleteOpen(false);
              },
              "Account deleted",
              "Delete failed",
            )
          }
        >
          Delete account
        </Button>
      </Modal>
    </section>
  );
}