import Link from "next/link";

export default function PortalAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col bg-hgh-offwhite">
      <header className="border-b border-hgh-border bg-hgh-navy px-4 py-4 text-white">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <Link href="/" className="text-sm font-semibold tracking-wide text-hgh-gold">
            HGH WorkForce
          </Link>
          <Link href="/sign-in" className="text-xs text-white/70 hover:text-white">
            Admin sign in
          </Link>
        </div>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
