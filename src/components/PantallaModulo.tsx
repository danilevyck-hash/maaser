"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ENLACE, TITULO } from "@/lib/ui/apple";

export type ItemPestana = {
  id: string;
  label: string;
  icon: React.ReactNode;
};

type Props = {
  title: string;
  tabs: ItemPestana[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: React.ReactNode;
};

/**
 * El marco de Maaser y de Propiedades: fondo blanco, el nombre de la pantalla
 * grande arriba y las pestañas abajo, separadas por una raya de 1 px.
 *
 * Los rótulos («← Inicio», «Salir», el nombre de cada pestaña) son los mismos
 * de siempre: aquí solo cambia cómo se ve.
 */
export default function PantallaModulo({ title, tabs, activeTab, onTabChange, children }: Props) {
  const router = useRouter();
  return (
    <div className="fixed inset-0 flex flex-col bg-white">
      {/* Encabezado */}
      <div className="px-5 pt-14 shrink-0 bg-white">
        <div className="flex items-center justify-between max-w-[430px] mx-auto">
          <Link href="/" className={`${ENLACE} min-h-[44px] flex items-center pr-2`}>
            &larr; Inicio
          </Link>
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.push("/login");
              router.refresh();
            }}
            className={`${ENLACE} min-h-[44px] pl-2`}
          >
            Salir
          </button>
        </div>
        <h1 className={`${TITULO} max-w-[430px] mx-auto pb-2`}>{title}</h1>
      </div>

      {/* Lo que se desliza */}
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
        <div
          className="max-w-[430px] mx-auto"
          style={{ paddingBottom: "calc(96px + env(safe-area-inset-bottom))" }}
        >
          {children}
        </div>
      </div>

      {/* Pestañas */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-[#E5E5EA] flex pt-2 z-[100]"
        style={{ paddingBottom: "calc(8px + env(safe-area-inset-bottom))" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-1 min-h-[44px] text-[14px] transition-colors border-0 bg-transparent cursor-pointer ${
              activeTab === tab.id ? "text-[#1C1C1E] font-semibold" : "text-[#8E8E93]"
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
