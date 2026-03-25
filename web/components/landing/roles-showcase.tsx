"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useCarouselAutoplay } from "@/hooks/use-carousel-autoplay";
import { Briefcase, CheckCircle2, Settings, Shield, User } from "lucide-react";

const ROLE_ICONS = {
  superAdmin: Settings,
  companyAdmin: Shield,
  hrManager: Briefcase,
  employee: User,
} as const;

export type RoleIconId = keyof typeof ROLE_ICONS;

export type LandingRole = {
  icon: RoleIconId;
  role: string;
  access: string[];
};

function RoleTile({ item, className }: { item: LandingRole; className?: string }) {
  const Icon = ROLE_ICONS[item.icon];
  return (
    <div
      className={cn(
        "group border-r border-b border-hgh-border bg-white p-7 transition-colors duration-300 md:p-8",
        "hover:bg-hgh-offwhite/70",
        className,
      )}
    >
      <div className="mb-5 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-hgh-gold/10">
        <Icon className="text-hgh-gold" size={24} />
      </div>
      <h3 className="mb-4 text-lg font-semibold leading-snug text-hgh-navy">{item.role}</h3>
      <ul className="space-y-2.5">
        {item.access.map((line) => (
          <li
            key={line}
            className="flex items-start gap-2 text-sm leading-relaxed text-hgh-muted"
          >
            <CheckCircle2 className="mt-0.5 shrink-0 text-hgh-success" size={16} />
            <span className="min-w-0 break-words">{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RolesShowcase({ roles }: { roles: LandingRole[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const updateIndexFromScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    setActive(Math.min(Math.max(idx, 0), roles.length - 1));
  }, [roles.length]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateIndexFromScroll();
    const ro = new ResizeObserver(() => updateIndexFromScroll());
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateIndexFromScroll]);

  const scrollToSlide = (i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  const { pauseProps } = useCarouselAutoplay(scrollerRef, roles.length, 3000);

  return (
    <div className="overflow-hidden rounded-xl border-l border-t border-hgh-border bg-white">
      {/* Mobile: carousel (same pattern as features) */}
      <div className="md:hidden" {...pauseProps}>
        <div
          ref={scrollerRef}
          onScroll={updateIndexFromScroll}
          className={cn(
            "flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain",
            "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
          )}
          aria-label="Roles and access"
        >
          {roles.map((item) => (
            <div
              key={item.role}
              className="box-border w-full shrink-0 basis-full snap-center snap-always overflow-hidden"
            >
              <RoleTile item={item} className="border-b-0" />
            </div>
          ))}
        </div>
        <div
          className="flex justify-center gap-2 border-r border-b border-t border-hgh-border bg-white px-4 py-4"
          aria-label="Role slides"
        >
          {roles.map((_, i) => (
            <button
              key={i}
              type="button"
              {...(active === i ? { "aria-current": "true" as const } : {})}
              aria-label={`Go to role ${i + 1} of ${roles.length}`}
              onClick={() => scrollToSlide(i)}
              className={cn(
                "h-2 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hgh-navy/30",
                active === i ? "w-7 bg-hgh-navy" : "w-2 bg-hgh-border hover:bg-hgh-muted/40",
              )}
            />
          ))}
        </div>
      </div>

      {/* Desktop: border grid */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4">
        {roles.map((item) => (
          <RoleTile key={item.role} item={item} />
        ))}
      </div>
    </div>
  );
}
