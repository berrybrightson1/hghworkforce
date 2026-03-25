import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-hgh-offwhite px-6 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-hgh-muted">404</p>
      <h1 className="mt-2 text-2xl font-bold text-hgh-navy">Page not found</h1>
      <p className="mt-3 max-w-md text-sm text-hgh-muted">
        The page you’re looking for doesn’t exist or was moved.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-hgh-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-hgh-navy-light"
        >
          Home
        </Link>
        <Link
          href="/sign-in"
          className="rounded-lg border border-hgh-border bg-white px-5 py-2.5 text-sm font-semibold text-hgh-navy hover:bg-white/90"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
