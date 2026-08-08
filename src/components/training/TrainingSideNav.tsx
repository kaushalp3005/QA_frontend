"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, LayoutGrid, Plus } from "lucide-react";
import { cn } from "@/lib/styles";
import { TRAINING_PAGES } from "@/config/training-nav";

const HUB = { href: "/training", title: "Overview", icon: LayoutGrid };

/** True when `href` is the training section the current route belongs to. */
function useActiveHref() {
  const pathname = usePathname() || "";
  if (pathname === "/training") return HUB.href;
  return (
    TRAINING_PAGES.find(
      (p) => pathname === p.href || pathname.startsWith(`${p.href}/`)
    )?.href ?? null
  );
}

/**
 * Print routes render a paper-sized sheet and must own the full width — the
 * section chrome would both squeeze it on screen and land on the printout.
 */
function useIsPrintRoute() {
  const pathname = usePathname() || "";
  return pathname.endsWith("/print");
}

/**
 * Sticky left rail listing every training form. Desktop only — the mobile
 * equivalent is <TrainingTopNav />.
 */
export default function TrainingSideNav() {
  const activeHref = useActiveHref();
  const isPrint = useIsPrintRoute();

  if (isPrint) return null;

  return (
    // `self-stretch` is load-bearing: the layout row uses `items-start`, which
    // would shrink this column to the card's own height and leave `sticky`
    // nothing to travel within.
    <aside className="hidden lg:block w-60 shrink-0 self-stretch">
      <div className="sticky top-0 surface-card p-3">
        {/* Section brand */}
        <div className="flex items-center gap-2.5 px-2 pb-3 mb-2 border-b border-cream-300">
          <div className="w-9 h-9 rounded-xl bg-brand-500 text-white flex items-center justify-center shadow-soft shrink-0">
            <GraduationCap className="w-[18px] h-[18px]" strokeWidth={2.25} />
          </div>
          <div className="leading-tight min-w-0">
            <p className="text-[13px] font-bold text-ink-600 truncate">Training</p>
            <p className="text-[10px] text-ink-400 font-semibold uppercase tracking-wide">
              CFPLA.C7
            </p>
          </div>
        </div>

        <nav className="space-y-1">
          <Link
            href={HUB.href}
            className={cn(
              "group relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all",
              activeHref === HUB.href
                ? "bg-brand-500 text-white shadow-brand"
                : "text-ink-500 hover:text-ink-600 hover:bg-cream-200/80"
            )}
          >
            <HUB.icon
              className={cn(
                "h-4 w-4 shrink-0",
                activeHref === HUB.href
                  ? "text-white"
                  : "text-ink-400 group-hover:text-brand-500"
              )}
            />
            <span className="truncate">{HUB.title}</span>
          </Link>

          <p className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-ink-300">
            Forms
          </p>

          {TRAINING_PAGES.map((page) => {
            const isActive = activeHref === page.href;
            const Icon = page.icon;
            return (
              <div key={page.href} className="group/row flex items-center gap-1">
                <Link
                  href={page.href}
                  title={page.title}
                  className={cn(
                    "group relative flex-1 min-w-0 flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all",
                    isActive
                      ? "bg-brand-500 text-white shadow-brand"
                      : "text-ink-500 hover:text-ink-600 hover:bg-cream-200/80"
                  )}
                >
                  {!isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-0 bg-brand-500 rounded-r group-hover:h-5 transition-all duration-200" />
                  )}
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
                      isActive ? "text-white" : "text-ink-400 group-hover:text-brand-500"
                    )}
                  />
                  <span className="truncate">{page.shortTitle}</span>
                </Link>

                {/* Jump straight to a blank form without opening the list first */}
                <Link
                  href={`${page.href}/create`}
                  title={`New ${page.title}`}
                  aria-label={`New ${page.title}`}
                  className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-ink-300
                             opacity-0 group-hover/row:opacity-100 focus:opacity-100
                             hover:text-brand-500 hover:bg-cream-200 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Link>
              </div>
            );
          })}
        </nav>

        <p className="mt-3 pt-3 border-t border-cream-300 px-2 text-[10px] text-ink-300 leading-relaxed">
          Effective &ge;80% &middot; Retrain &lt;60%
        </p>
      </div>
    </aside>
  );
}

/** Horizontal scroller shown instead of the rail on tablet/mobile. */
export function TrainingTopNav() {
  const activeHref = useActiveHref();
  const isPrint = useIsPrintRoute();
  const items = [{ href: HUB.href, label: HUB.title, icon: HUB.icon }].concat(
    TRAINING_PAGES.map((p) => ({ href: p.href, label: p.shortTitle, icon: p.icon }))
  );

  if (isPrint) return null;

  return (
    <nav className="lg:hidden -mx-3 sm:mx-0 px-3 sm:px-0 mb-4 overflow-x-auto">
      <div className="flex items-center gap-2 w-max">
        {items.map((item) => {
          const isActive = activeHref === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition",
                isActive
                  ? "bg-brand-500 text-white border-brand-500 shadow-brand"
                  : "bg-cream-50 text-ink-500 border-cream-300 hover:text-brand-500 hover:border-brand-500"
              )}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
