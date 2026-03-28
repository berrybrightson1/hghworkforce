"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useCarouselAutoplay } from "@/hooks/use-carousel-autoplay";
import {
  Banknote,
  Building2,
  CalendarDays,
  ClipboardList,
  Clock,
  CreditCard,
  Smartphone,
  Receipt,
  Share2,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";

const FEATURE_ICONS = {
  payroll: CreditCard,
  attendance: Smartphone,
  taxCompliance: ShieldCheck,
  multiCompany: Building2,
  payslip: Receipt,
  selfService: Users,
  shifts: Clock,
  reports: TrendingUp,
  integrations: Share2,
  leave: CalendarDays,
  loans: Banknote,
  audit: ClipboardList,
} as const;

export type FeatureIconId = keyof typeof FEATURE_ICONS;

export type LandingFeature = {
  icon: FeatureIconId;
  title: string;
  description: string;
};

function FeatureTile({
  feature,
  className,
}: {
  feature: LandingFeature;
  className?: string;
}) {
  const Icon = FEATURE_ICONS[feature.icon];
  return (
    <div
      className={cn(
        "group border-r border-b border-hgh-border bg-white p-7 transition-colors duration-300 md:p-8",
        "hover:bg-hgh-offwhite/70",
        className,
      )}
    >
      <div className="mb-5 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-hgh-navy transition-colors duration-300 group-hover:bg-hgh-gold">
        <Icon className="text-hgh-gold transition-colors duration-300 group-hover:text-hgh-navy" size={24} />
      </div>
      <h3 className="mb-2 break-words text-lg font-semibold leading-snug text-hgh-navy">
        {feature.title}
      </h3>
      <p className="break-words text-sm leading-relaxed text-hgh-muted">{feature.description}</p>
    </div>
  );
}

export function FeaturesShowcase({ features }: { features: LandingFeature[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const updateIndexFromScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    setActive(Math.min(Math.max(idx, 0), features.length - 1));
  }, [features.length]);

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

  const { pauseProps } = useCarouselAutoplay(scrollerRef, features.length, 3000);

  return (
    <div className="overflow-hidden rounded-xl border-l border-t border-hgh-border bg-white">
      {/* Mobile: carousel */}
      <div className="md:hidden" {...pauseProps}>
        <div
          ref={scrollerRef}
          onScroll={updateIndexFromScroll}
          className={cn(
            "flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain",
            "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
          )}
          aria-label="Feature highlights"
        >
          {features.map((feature) => (
            <div
              key={feature.title}
              className="box-border w-full shrink-0 basis-full snap-center snap-always overflow-hidden"
            >
              <FeatureTile feature={feature} className="border-b-0" />
            </div>
          ))}
        </div>
        <div
          className="flex justify-center gap-2 border-r border-b border-t border-hgh-border bg-white px-4 py-4"
          aria-label="Feature slides"
        >
          {features.map((_, i) => (
            <button
              key={i}
              type="button"
              {...(active === i ? { "aria-current": "true" as const } : {})}
              aria-label={`Go to feature ${i + 1} of ${features.length}`}
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
        {features.map((feature) => (
          <FeatureTile key={feature.title} feature={feature} />
        ))}
      </div>
    </div>
  );
}
