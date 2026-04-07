"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { RentProperty, RentContract, RentCharge } from "@/lib/propiedades-types";
import { useToast } from "@/components/Toast";
import ModuleLayout from "@/components/ModuleLayout";
import DashboardTab from "@/components/propiedades/DashboardTab";
import PropiedadesTab from "@/components/propiedades/PropiedadesTab";
import CobrosTab from "@/components/propiedades/CobrosTab";
import ContratosTab from "@/components/propiedades/ContratosTab";

type Tab = "dashboard" | "propiedades" | "cobros" | "contratos";
const validTabs: Tab[] = ["dashboard", "propiedades", "cobros", "contratos"];

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const tabItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" />
        <rect x="14" y="3" width="7" height="5" />
        <rect x="14" y="12" width="7" height="9" />
        <rect x="3" y="16" width="7" height="5" />
      </svg>
    ),
  },
  {
    id: "propiedades",
    label: "Propiedades",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    id: "cobros",
    label: "Cobros",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
  {
    id: "contratos",
    label: "Contratos",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
];

export default function PropiedadesPageWrapper() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 flex items-center justify-center bg-[#F2F2F7]">
        <div className="text-[#8E8E93] text-[15px]">Cargando...</div>
      </div>
    }>
      <PropiedadesPage />
    </Suspense>
  );
}

function PropiedadesPage() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const initialTab = validTabs.includes(searchParams.get("tab") as Tab) ? (searchParams.get("tab") as Tab) : "dashboard";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [properties, setProperties] = useState<RentProperty[]>([]);
  const [contracts, setContracts] = useState<RentContract[]>([]);
  const [charges, setCharges] = useState<RentCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth] = useState(getCurrentMonth);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, cRes, chRes] = await Promise.all([
        fetch("/api/propiedades/properties"),
        fetch("/api/propiedades/contracts"),
        fetch("/api/propiedades/charges?month=" + currentMonth),
      ]);
      const [pData, cData, chData] = await Promise.all([
        pRes.json(),
        cRes.json(),
        chRes.json(),
      ]);
      setProperties(Array.isArray(pData) ? pData : []);
      setContracts(Array.isArray(cData) ? cData : []);
      setCharges(Array.isArray(chData) ? chData : []);
    } catch {
      showToast("Error al cargar datos", "error");
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth]);

  useEffect(() => {
    fetch("/api/propiedades/charges/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month: currentMonth }),
    }).then(() => fetchAll());
  }, [currentMonth, fetchAll]);

  const activeContracts = contracts.filter((c) => c.active);

  return (
    <ModuleLayout
      title="Propiedades"
      tabs={tabItems}
      activeTab={tab}
      onTabChange={(id) => setTab(id as Tab)}
    >
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="text-[#8E8E93] text-[15px]">Cargando...</div>
        </div>
      ) : (
        <>
          {tab === "dashboard" && (
            <DashboardTab
              properties={properties}
              contracts={activeContracts}
              charges={charges}
              currentMonth={currentMonth}
            />
          )}
          {tab === "propiedades" && (
            <PropiedadesTab
              properties={properties}
              contracts={activeContracts}
              charges={charges}
              onRefresh={fetchAll}
            />
          )}
          {tab === "cobros" && (
            <CobrosTab
              charges={charges}
              currentMonth={currentMonth}
              onRefresh={fetchAll}
            />
          )}
          {tab === "contratos" && (
            <ContratosTab
              contracts={activeContracts}
              properties={properties}
              onRefresh={fetchAll}
            />
          )}
        </>
      )}
    </ModuleLayout>
  );
}
