import { Suspense } from "react";
import { PortalLoginForm } from "./portal-login-form";

export default function PortalLoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <div className="rounded-2xl border border-hgh-border bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-hgh-navy">Employee sign in</h1>
        <p className="mt-1 text-sm text-hgh-muted">
          Enter your employee code and 4-digit PIN. New employees can create a PIN first.
        </p>
        <div className="mt-6">
          <Suspense fallback={<p className="text-sm text-hgh-muted">Loading…</p>}>
            <PortalLoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
