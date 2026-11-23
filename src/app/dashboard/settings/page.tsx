"use client";

import { Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { User, Lock, Shield, Mic, type LucideIcon } from "lucide-react";
import ProfileInformation from "./components/ProfileInformation";
import PasswordChange from "./components/PasswordChange";
import MijnStem from "./components/MijnStem";
import SecurityMfa from "./components/SecurityMfa";

type SettingsTab = "profile" | "password" | "security" | "mijn-stem";

const VALID_TABS: SettingsTab[] = ["profile", "password", "security", "mijn-stem"];

function isSettingsTab(value: string | null): value is SettingsTab {
  return !!value && (VALID_TABS as string[]).includes(value);
}

const settingsTabs: {
  id: SettingsTab;
  name: string;
  icon: LucideIcon;
  component: ReactNode;
}[] = [
  {
    id: "profile",
    name: "Profiel Informatie",
    icon: User,
    component: <ProfileInformation />,
  },
  {
    id: "password",
    name: "Wachtwoord Wijzigen",
    icon: Lock,
    component: <PasswordChange />,
  },
  {
    id: "security",
    name: "Beveiliging",
    icon: Shield,
    component: <SecurityMfa />,
  },
  {
    id: "mijn-stem",
    name: "Mijn Stem",
    icon: Mic,
    component: <MijnStem />,
  },
];

function SettingsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<SettingsTab>(() =>
    isSettingsTab(tabFromUrl) ? tabFromUrl : "profile"
  );

  useEffect(() => {
    if (isSettingsTab(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    } else if (!tabFromUrl) {
      setActiveTab("profile");
    }
  }, [tabFromUrl]);

  const selectTab = useCallback(
    (tab: SettingsTab) => {
      setActiveTab(tab);
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "profile") {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const activeContent = useMemo(
    () => settingsTabs.find((tab) => tab.id === activeTab)?.component,
    [activeTab]
  );

  return (
    <div className="min-h-full flex-1 bg-gray-50">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="text-2xl font-semibold text-gray-900">Instellingen</h1>

        <nav
          className="mt-6 flex gap-1 overflow-x-auto border-b border-gray-200"
          aria-label="Instellingen secties"
        >
          {settingsTabs.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectTab(tab.id)}
                aria-current={selected ? "page" : undefined}
                className={`relative flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  selected
                    ? "text-[var(--color-primary-700)] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-[var(--color-primary-500)]"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {tab.name}
              </button>
            );
          })}
        </nav>

        <div className="mt-8">{activeContent}</div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-full bg-gray-50 px-6 py-8">
          <div className="mx-auto max-w-4xl">
            <h1 className="text-2xl font-semibold text-gray-900">Instellingen</h1>
            <p className="mt-4 text-sm text-gray-500">Laden…</p>
          </div>
        </div>
      }
    >
      <SettingsPageContent />
    </Suspense>
  );
}
