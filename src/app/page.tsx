"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

const modules = [
  {
    href: "/maaser",
    icon: "✡",
    name: "Maaser",
    desc: "Registro de donaciones",
  },
  {
    href: "/indriver",
    icon: "🚗",
    name: "InDriver",
    desc: "Gastos mensuales",
  },
  {
    href: "/propiedades",
    icon: "🏠",
    name: "Propiedades",
    desc: "Gestión de alquileres",
  },
  {
    href: "/finanzas",
    icon: "💰",
    name: "Finanzas",
    desc: "Finanzas personales",
  },
];

export default function Home() {
  const router = useRouter();

  return (
    <div className="fixed inset-0 flex flex-col bg-[#F2F2F7]">
      {/* Top bar */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-[#C6C6C8] px-5 pt-14 pb-3 shrink-0">
        <div className="flex items-center justify-between max-w-[430px] mx-auto">
          <h1 className="text-[17px] font-semibold text-[#1C1C1E]">Mis Registros</h1>
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
        <div className="max-w-[430px] mx-auto p-4 space-y-3">
          {modules.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="bg-white rounded-2xl shadow-sm flex items-center px-4 py-4 no-underline active:bg-gray-50 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-[#F2F2F7] flex items-center justify-center text-2xl shrink-0">
                {m.icon}
              </div>
              <div className="flex-1 ml-4 min-w-0">
                <div className="text-[17px] font-semibold text-[#1C1C1E]">{m.name}</div>
                <div className="text-[15px] text-[#8E8E93] mt-0.5">{m.desc}</div>
              </div>
              <svg
                className="w-5 h-5 text-[#C6C6C8] shrink-0 ml-2"
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
