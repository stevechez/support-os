"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  cancelMfaEnrollment,
  confirmMfaEnrollment,
  enrollMfa,
  unenrollMfa,
  type SecurityActionState,
} from "./security-actions";

export type MfaFactor = {
  id: string;
  friendly_name?: string | null;
  created_at: string;
};

const initial: SecurityActionState = {};

export function SecuritySettings({ factors }: { factors: MfaFactor[] }) {
  const router = useRouter();
  const [enrolling, setEnrolling] = useState<SecurityActionState | null>(null);
  const [starting, startTransition] = useTransition();
  const [removing, setRemoving] = useState<string | null>(null);
  const [confirmState, confirmAction, confirmPending] = useActionState(
    async (prev: SecurityActionState, formData: FormData) => {
      const result = await confirmMfaEnrollment(prev, formData);
      if (result.success) {
        setEnrolling(null);
        router.refresh();
      }
      return result;
    },
    initial
  );

  function startEnrollment() {
    startTransition(async () => {
      const result = await enrollMfa();
      setEnrolling(result);
    });
  }

  function cancelEnrollment() {
    if (enrolling?.factorId) {
      startTransition(async () => {
        await cancelMfaEnrollment(enrolling.factorId!);
        setEnrolling(null);
      });
    } else {
      setEnrolling(null);
    }
  }

  function removeFactor(factorId: string) {
    setRemoving(factorId);
    startTransition(async () => {
      await unenrollMfa(factorId);
      setRemoving(null);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="size-4" />
          Two-factor authentication
        </CardTitle>
        <CardDescription>
          Require a code from an authenticator app (like 1Password, Authy, or
          Google Authenticator) at sign-in.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {factors.length > 0 && (
          <ul className="space-y-2">
            {factors.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <span>{f.friendly_name || "Authenticator app"}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={removing === f.id}
                  onClick={() => removeFactor(f.id)}
                >
                  {removing === f.id ? "Removing…" : "Remove"}
                </Button>
              </li>
            ))}
          </ul>
        )}

        {!enrolling && factors.length === 0 && (
          <Button type="button" onClick={startEnrollment} disabled={starting}>
            {starting ? "Starting…" : "Enable 2FA"}
          </Button>
        )}

        {!enrolling && factors.length > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={startEnrollment}
            disabled={starting}
          >
            {starting ? "Starting…" : "Add another device"}
          </Button>
        )}

        {enrolling?.error && (
          <p className="text-sm text-destructive">{enrolling.error}</p>
        )}

        {enrolling?.qrCode && (
          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">
              Scan this with your authenticator app:
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={enrolling.qrCode}
              alt="TOTP QR code"
              className="size-40 rounded bg-white p-2"
            />
            <p className="break-all text-xs text-muted-foreground">
              Can&apos;t scan it? Enter this key manually: {enrolling.secret}
            </p>

            <form action={confirmAction} className="flex items-end gap-2">
              <input type="hidden" name="factorId" value={enrolling.factorId} />
              <div className="flex-1 space-y-2">
                <Label htmlFor="code">6-digit code</Label>
                <Input
                  id="code"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                />
              </div>
              <Button type="submit" disabled={confirmPending}>
                {confirmPending ? "Verifying…" : "Verify"}
              </Button>
              <Button type="button" variant="ghost" onClick={cancelEnrollment}>
                Cancel
              </Button>
            </form>

            {confirmState.error && (
              <p className="text-sm text-destructive">{confirmState.error}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
