"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOC_NAV_ORDER, findCreatePageIndex } from "@/config/doc-nav-order";

export default function CreateFormNav() {
  const pathname = usePathname() || "";
  const idx = findCreatePageIndex(pathname);
  if (idx === -1) return null;

  const prev = idx > 0 ? DOC_NAV_ORDER[idx - 1] : null;
  const next = idx < DOC_NAV_ORDER.length - 1 ? DOC_NAV_ORDER[idx + 1] : null;

  const hrefOf = (e: { slug: string; createSubpath: string }) =>
    `/documentations/${e.slug}/${e.createSubpath}`;

  return (
    <div className="fixed top-3 right-3 z-40 flex items-center gap-2 bg-white/95 backdrop-blur border border-gray-200 shadow-sm rounded-full px-2 py-1">
      {prev ? (
        <Link
          href={hrefOf(prev)}
          className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 text-gray-700"
          title={`Previous: ${prev.label}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
      ) : (
        <span className="flex items-center justify-center w-8 h-8 rounded-full text-gray-300" title="No previous form">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </span>
      )}

      <span className="text-[11px] text-gray-500 font-medium px-1 select-none">
        {idx + 1} / {DOC_NAV_ORDER.length}
      </span>

      {next ? (
        <Link
          href={hrefOf(next)}
          className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 text-gray-700"
          title={`Next: ${next.label}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      ) : (
        <span className="flex items-center justify-center w-8 h-8 rounded-full text-gray-300" title="No next form">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </span>
      )}
    </div>
  );
}
