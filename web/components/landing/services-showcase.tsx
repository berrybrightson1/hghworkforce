"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useCarouselAutoplay } from "@/hooks/use-carousel-autoplay";
import { CheckCircle2, CreditCard, Fingerprint } from "lucide-react";

const SERVICE_ICONS = {
  payroll: CreditCard,
  checkin: Fingerprint,
} as const;

export type ServiceIconId = keyof typeof SERVICE_ICONS;

export type ServiceItem = {
  icon: ServiceIconId;
  title: string;
  description: string;
  highlights: string[];
  accentColor: "gold" | "success";
};

function ServiceTile({ service, className }: { service: ServiceItem; className?: string }) {
  const isGold = service.accentColor === "gold";
  const Icon = SERVICE_ICONS[service.icon];

  return (
    <div
      className={cn(
        "group flex flex-col border-r border-b border-hgh-border bg-white p-7 transition-colors duration-300 md:p-8",
        "hover:bg-hgh-offwhite/70",
        className,
      )}
    >
      <div
        className={cn(
          "mb-5 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
          isGold ? "bg-hgh-gold/10" : "bg-hgh-success/10",
        )}
        aria-hidden
      >
        <Icon className={cn("h-6 w-6", isGold ? "text-hgh-gold" : "text-hgh-success")} strokeWidth={1.75} />
      </div>
      <h3 className="mb-3 text-lg font-semibold leading-snug text-hgh-navy">{service.title}</h3>
      <p className="mb-6 text-sm leading-relaxed text-hgh-muted">{service.description}</p>
      <ul className="mt-auto space-y-2.5">
        {service.highlights.map((line) => (
          <li key={line} className="flex items-start gap-2 text-sm leading-relaxed text-hgh-muted">
            <CheckCircle2 className="mt-0.5 shrink-0 text-hgh-success" size={16} />
            <span className="min-w-0 break-words">{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ServicesShowcase({ services }: { services: ServiceItem[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const updateIndexFromScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    setActive(Math.min(Math.max(idx, 0), services.length - 1));
  }, [services.length]);

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

  const { pauseProps } = useCarouselAutoplay(scrollerRef, services.length, 3000);

  return (
    <div className="overflow-hidden rounded-xl border-l border-t border-hgh-border bg-white">
      <div className="md:hidden" {...pauseProps}>
        <div
          ref={scrollerRef}
          onScroll={updateIndexFromScroll}
          className={cn(
            "flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain",
            "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
          )}
          aria-label="Services"
        >
          {services.map((service) => (
            <div
              key={service.title}
              className="box-border w-full shrink-0 basis-full snap-center snap-always overflow-hidden"
            >
              <ServiceTile service={service} className="border-b-0" />
            </div>
          ))}
        </div>
        <div
          className="flex justify-center gap-2 border-r border-b border-t border-hgh-border bg-white px-4 py-4"
          aria-label="Service slides"
        >
          {services.map((_, i) => (
            <button
              key={i}
              type="button"
              {...(active === i ? { "aria-current": "true" as const } : {})}
              aria-label={`Go to service ${i + 1} of ${services.length}`}
              onClick={() => scrollToSlide(i)}
              className={cn(
                "h-2 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hgh-navy/30",
                active === i ? "w-7 bg-hgh-navy" : "w-2 bg-hgh-border hover:bg-hgh-muted/40",
              )}
            />
          ))}
        </div>
      </div>

      <div className="hidden md:grid md:grid-cols-2">
        {services.map((service) => (
          <ServiceTile key={service.title} service={service} />
        ))}
      </div>
    </div>
  );
}
