"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import UsersTab from "@/components/settings/UsersTab";
import PermissionsTab from "@/components/settings/PermissionsTab";
import { getStoredUser } from "@/lib/api/auth";
import { isSuperAdmin } from "@/lib/constants/modules";
import { Users, ShieldCheck } from "lucide-react";

type Tab = "users" | "permissions";

export default function SettingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("users");
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user || !isSuperAdmin(user.email)) {
      router.replace("/dashboard");
      return;
    }
    setAuthorized(true);
  }, [router]);

  if (!authorized) {
    return (
      <DashboardLayout>
        <div className="min-h-[60vh] flex items-center justify-center text-sage-500 text-sm">
          Checking access…
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-sage-800">Settings</h1>
          <p className="text-xs text-sage-500">Super admin controls for QC users and permissions</p>
        </div>

        {/* Tab switcher */}
        <div className="bg-white rounded-2xl border border-tan-100 shadow-sm p-1 mb-5 inline-flex gap-1">
          <button
            onClick={() => setTab("users")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              tab === "users"
                ? "bg-sage-500 text-white shadow-sm"
                : "text-sage-600 hover:bg-beige-50"
            }`}
          >
            <Users className="w-4 h-4" /> Users
          </button>
          <button
            onClick={() => setTab("permissions")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              tab === "permissions"
                ? "bg-sage-500 text-white shadow-sm"
                : "text-sage-600 hover:bg-beige-50"
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Permissions
          </button>
        </div>

        {tab === "users" ? <UsersTab /> : <PermissionsTab />}
      </div>
    </DashboardLayout>
  );
}
