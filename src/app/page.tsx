"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ENLACE, TITULO } from "@/lib/ui/apple";

const modules = [
  {
    href: "/maaser",
    name: "Maaser",
    desc: "Registro de donaciones",
  },
  {
    href: "/por-cobrar",
    name: "Por Cobrar",
    desc: "Cuentas por cobrar",
  },
  {
    href: "/indriver",
    name: "InDriver",
    desc: "Gastos mensuales",
  },
  {
    href: "/propiedades",
    name: "Propiedades",
    desc: "Gestión de alquileres",
  },
  {
    href: "/finanzas",
    name: "Finanzas",
    desc: "Finanzas personales",
  },
];

export default function Home() {
  const router = useRouter();

  return (
    <div className="fixed inset-0 flex flex-col bg-white">
      {/* Encabezado */}
      <div className="px-5 pt-14 shrink-0">
        <div className="flex items-center justify-end max-w-[430px] mx-auto">
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
        <h1 className={`${TITULO} max-w-[430px] mx-auto pb-4`}>Mis Registros</h1>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
        <div className="max-w-[430px] mx-auto pb-8">
          {modules.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="flex items-center gap-3 px-5 py-4 min-h-[60px] no-underline border-t border-[#E5E5EA] active:bg-[#F2F2F7] transition-colors"
            >
              <span className="flex-1 min-w-0">
                <span className="block text-[17px] font-medium text-[#1C1C1E]">{m.name}</span>
                <span className="block text-[15px] text-[#6E6E73] mt-0.5">{m.desc}</span>
              </span>
              <svg
                className="w-[18px] h-[18px] text-[#AEAEB2] shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
