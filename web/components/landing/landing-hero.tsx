import Link from "next/link";
import { Building2, CalendarClock, FileSpreadsheet, Fingerprint, Users, Wallet } from "lucide-react";
import { HeroProductNotices } from "@/components/landing/hero-product-notices";
import { cn } from "@/lib/utils";
import type { LandingAuth } from "@/lib/landing-auth";

const TRUSTED_BY_NAMES = [
  "Hobort Auto Parts",
  "RebryCreatives",
  "Hobort Shipping",
  "Globor Distributions",
  "Senseli",
  "Dimension 6",
] as const;

const ORBIT_PHASE = [
  "hgh-landing-orbit--0",
  "hgh-landing-orbit--1",
  "hgh-landing-orbit--2",
  "hgh-landing-orbit--3",
  "hgh-landing-orbit--4",
  "hgh-landing-orbit--5",
] as const;

function OrbisIcon({
  children,
  className,
  phase = 0,
}: {
  children: React.ReactNode;
  className?: string;
  phase?: number;
}) {
  return (
    <div
      className={cn(
        "absolute hidden md:flex md:h-[3.25rem] md:w-[3.25rem] lg:h-14 lg:w-14",
        "items-center justify-center rounded-full border border-hgh-border/90 bg-white",
        "shadow-md shadow-hgh-navy/10 hgh-landing-orbit",
        ORBIT_PHASE[Math.min(phase, ORBIT_PHASE.length - 1)],
        className,
      )}
    >
      {children}
    </div>
  );
}

export function LandingHero({ auth }: { auth: LandingAuth }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-hgh-offwhite/40 to-hgh-offwhite pb-0 pt-24 md:pt-28">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_50%_at_50%_-10%,rgba(201,168,76,0.09),transparent_55%)]"
        aria-hidden
      />

      {/* Concentric rings */}
      <div
        className="pointer-events-none absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2"
        aria-hidden
      >
        {(
          [
            "size-[280px]",
            "size-[400px]",
            "size-[520px]",
            "size-[640px]",
            "size-[780px]",
            "size-[920px]",
          ] as const
        ).map((sizeClass) => (
          <div
            key={sizeClass}
            className={cn(
              "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-hgh-gold/10",
              sizeClass,
            )}
          />
        ))}
      </div>

      <OrbisIcon phase={0} className="left-[4%] top-[26%] text-hgh-gold">
        <Wallet className="h-6 w-6" strokeWidth={1.75} aria-hidden />
      </OrbisIcon>
      <OrbisIcon phase={1} className="left-[10%] top-[52%] text-hgh-navy">
        <Fingerprint className="h-6 w-6" strokeWidth={1.75} aria-hidden />
      </OrbisIcon>
      <OrbisIcon phase={2} className="left-[18%] top-[36%] text-hgh-success">
        <Building2 className="h-6 w-6" strokeWidth={1.75} aria-hidden />
      </OrbisIcon>
      <OrbisIcon phase={3} className="right-[6%] top-[24%] text-hgh-navy">
        <Users className="h-6 w-6" strokeWidth={1.75} aria-hidden />
      </OrbisIcon>
      <OrbisIcon phase={4} className="right-[12%] top-[48%] text-hgh-gold">
        <FileSpreadsheet className="h-6 w-6" strokeWidth={1.75} aria-hidden />
      </OrbisIcon>
      <OrbisIcon phase={5} className="right-[20%] top-[34%] text-hgh-success">
        <CalendarClock className="h-6 w-6" strokeWidth={1.75} aria-hidden />
      </OrbisIcon>

      <div className="relative z-10 mx-auto max-w-4xl px-6 pb-4 pt-6 text-center md:pt-10">
        {/* Value tag — editorial kicker (not the services cards below) */}
        <div className="mb-6 flex justify-center px-2">
          <div className="flex max-w-md items-start gap-2.5 text-left">
            <span className="mt-0.5 h-[2.35rem] w-0.5 shrink-0 rounded-full bg-hgh-gold" aria-hidden />
            <div className="min-w-0">
              <p className="text-[0.5625rem] font-semibold uppercase tracking-[0.12em] text-hgh-muted">People ops</p>
              <p className="mt-1 text-[0.8125rem] font-semibold leading-snug text-hgh-navy sm:text-[13px] sm:leading-snug">
                Payroll, time, and statutory runs — one connected flow.
              </p>
            </div>
          </div>
        </div>

        <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-[1.12] tracking-tight text-hgh-navy sm:text-5xl sm:leading-[1.08] lg:text-[3.25rem]">
          One platform for payroll, attendance, and your{" "}
          <span className="text-hgh-gold">whole workforce</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-hgh-muted">
          From small teams to multi-company operations — run compliant Ghana payroll, track attendance through the
          employee portal and optional office kiosk (face-verified), and keep everyone aligned from one dashboard.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {auth.loggedIn ? (
            <Link
              href={auth.appHref}
              className="inline-flex items-center justify-center rounded-full bg-hgh-navy px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-hgh-navy/25 transition hover:bg-hgh-navy-light"
            >
              {auth.label}
            </Link>
          ) : (
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center rounded-full bg-hgh-navy px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-hgh-navy/25 transition hover:bg-hgh-navy-light"
            >
              Get started free
            </Link>
          )}
          <a
            href="mailto:?subject=HGH%20WorkForce%20%E2%80%94%20Talk%20to%20sales"
            className="inline-flex items-center justify-center rounded-full border border-hgh-border bg-white px-8 py-3.5 text-sm font-semibold text-hgh-navy shadow-sm transition hover:border-hgh-gold/40 hover:bg-hgh-offwhite"
          >
            Talk to sales team
          </a>
        </div>

        {auth.loggedIn ? (
          <p className="mt-6 text-sm text-hgh-muted">
            You&apos;re signed in —{" "}
            <Link
              href={auth.appHref}
              className="font-medium text-hgh-navy underline decoration-hgh-gold/50 underline-offset-2 hover:text-hgh-gold"
            >
              open your workspace
            </Link>
            .
          </p>
        ) : (
          <p className="mt-6 text-sm text-hgh-muted">
            Employees:{" "}
            <Link
              href="/sign-in?next=/portal/checkin"
              className="font-medium text-hgh-navy underline decoration-hgh-gold/50 underline-offset-2 hover:text-hgh-gold"
            >
              Sign in to check in
            </Link>
            {" · "}
            <Link
              href="/sign-in?next=/dashboard/attendance"
              className="font-medium text-hgh-navy underline decoration-hgh-gold/50 underline-offset-2 hover:text-hgh-gold"
            >
              Manager sign-in
            </Link>
          </p>
        )}

        <HeroProductNotices />
      </div>

      {/* Trusted by — single compact row + marquee */}
      <div className="relative z-10 mt-5 border-t border-hgh-border bg-gradient-to-b from-white to-hgh-offwhite md:mt-6">
        <div className="mx-auto flex max-w-6xl flex-col overflow-hidden border-b border-hgh-border/80 bg-white/90 shadow-sm sm:flex-row sm:items-stretch">
          <div className="flex shrink-0 items-center justify-center border-b border-hgh-border/70 px-4 py-2.5 sm:border-b-0 sm:border-r sm:py-0 sm:pl-5 sm:pr-4">
            <p className="whitespace-nowrap text-center text-xs font-medium leading-snug text-hgh-muted sm:text-left sm:text-[13px]">
              Trusted by teams in Ghana
            </p>
          </div>
          <div className="relative min-w-0 flex-1 overflow-hidden py-2 sm:py-2.5 hgh-trusted-marquee-fade">
            <p className="sr-only" id="trusted-marquee-label">
              Partner and customer names shown in a scrolling list: {TRUSTED_BY_NAMES.join(", ")}.
            </p>
            <div
              className="hidden flex-wrap items-center justify-center gap-x-5 gap-y-1 px-4 py-0.5 motion-reduce:flex"
              aria-hidden
            >
              {TRUSTED_BY_NAMES.map((name) => (
                <span
                  key={name}
                  className="shrink-0 select-none text-[0.8125rem] font-semibold tracking-tight text-hgh-muted/75 sm:text-sm"
                >
                  {name}
                </span>
              ))}
            </div>
            <div
              className={cn(
                "hidden w-max items-center gap-x-10 px-4 motion-safe:flex motion-safe:animate-[marquee_32s_linear_infinite] motion-safe:hover:[animation-play-state:paused]",
                "md:gap-x-14",
              )}
              aria-labelledby="trusted-marquee-label"
            >
              {[...TRUSTED_BY_NAMES, ...TRUSTED_BY_NAMES].map((name, i) => (
                <span
                  key={`${name}-${i}`}
                  {...(i >= TRUSTED_BY_NAMES.length ? { "aria-hidden": true as const } : {})}
                  className="shrink-0 select-none text-[0.8125rem] font-semibold tracking-tight text-hgh-muted/75 sm:text-sm"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
