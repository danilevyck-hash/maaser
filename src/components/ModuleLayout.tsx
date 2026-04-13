"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export type TabItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
};

type Props = {
  title: string;
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: React.ReactNode;
};

export default function ModuleLayout({ title, tabs, activeTab, onTabChange, children }: Props) {
  const router = useRouter();
  return (
    <div className="fixed inset-0 flex flex-col bg-[#F2F2F7]">
      {/* iOS-style top bar */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-[#C6C6C8] px-5 pt-14 pb-3 shrink-0">
        <div className="flex items-center justify-between max-w-[430px] mx-auto">
          <Link href="/" className="text-[#007AFF] text-[15px] font-medium no-underline">
            &larr; Inicio
          </Link>
          <h1 className="text-[17px] font-semibold text-[#1C1C1E]">{title}</h1>
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.push("/login");
              router.refresh();
            }}
            className="text-[#007AFF] text-[15px] font-medium bg-transparent border-0 cursor-pointer"
          >
            Salir
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
        <div
          className="max-w-[430px] mx-auto"
          style={{ paddingBottom: "calc(96px + env(safe-area-inset-bottom))" }}
        >
          {children}
        </div>
      </div>

      {/* iOS-style bottom tab bar */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white/80 backdrop-blur-xl border-t border-[#C6C6C8] flex pt-2 z-[100]"
        style={{ paddingBottom: "calc(8px + env(safe-area-inset-bottom))" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-1 text-[10px] font-medium transition-colors border-0 bg-transparent cursor-pointer ${
              activeTab === tab.id ? "text-[#007AFF]" : "text-[#8E8E93]"
            }`}
          >
            <div className="w-6 h-6 flex items-center justify-center">{tab.icon}</div>
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
