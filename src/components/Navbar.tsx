"use client";
import { useRouter } from "next/navigation";
import { clearSession, getSession } from "@/lib/auth";
import { LogOut, Settings, ClipboardList, ChevronLeft } from "lucide-react";

interface NavbarProps {
  showBack?: boolean;
  backHref?: string;
  title?: string;
}

export default function Navbar({ showBack, backHref, title }: NavbarProps = {}) {
  const router = useRouter();
  const session = getSession();

  function handleBack() {
    if (backHref) router.push(backHref);
    else router.back();
  }

  function handleLogout() {
    clearSession();
    router.push("/");
  }

  return (
    <header className="bg-beige-50 border-b border-tan-200 shadow-sm sticky top-0 z-30">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        {/* Left */}
        <div className="flex items-center gap-2">
          {showBack && (
            <button
              onClick={handleBack}
              className="p-2 -ml-1 rounded-lg text-sage-500 hover:bg-beige-100 active:bg-beige-200 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => router.push("/documentations/ipqc")}
            className="flex items-center gap-2 text-sage-700 hover:text-sage-500 transition-colors"
          >
            <ClipboardList className="w-4 h-4 flex-shrink-0" />
            <span className="font-semibold text-sm leading-none">{title || "IPQC"}</span>
          </button>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1">
          {session && (
            <span className="text-xs text-sage-500 hidden sm:block mr-2 max-w-[120px] truncate">
              {session.displayName}
            </span>
          )}
          {session?.isAdmin && (
            <button
              onClick={() => router.push("/documentations/ipqc/settings")}
              className="p-2 rounded-lg text-sage-500 hover:bg-beige-100 active:bg-beige-200 transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-sage-500 hover:bg-beige-100 active:bg-beige-200 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
