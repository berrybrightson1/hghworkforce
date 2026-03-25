import Link from "next/link";

export default async function KioskDeniedPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const c = (await searchParams).c;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 p-8 text-center text-white">
      <h1 className="text-xl font-semibold">Kiosk not allowed from this network</h1>
      <p className="mt-3 max-w-md text-sm text-slate-300">
        This page is locked to your office PC&apos;s public IP. Open the kiosk link only on the
        machine your admin registered (same setting as employee portal check-in).
      </p>
      {c ? (
        <p className="mt-4 font-mono text-xs text-slate-500">
          Company id: <span className="text-slate-400">{c}</span>
        </p>
      ) : null}
      <Link
        href={c ? `/kiosk/checkin?c=${encodeURIComponent(c)}` : "/"}
        className="mt-8 text-sm text-amber-200 underline"
      >
        Try again from the office network
      </Link>
    </div>
  );
}
