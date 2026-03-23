"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const inMaaser = pathname.startsWith("/maaser");
  const inIndriver = pathname.startsWith("/indriver");
  const inGastos = pathname.startsWith("/gastos");

  return (
    <nav className="bg-navy border-b-4 border-gold">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-gold font-bold text-xl tracking-wide">
            ✡ Mis Registros 🚗
          </Link>
          <div className="flex gap-1">
            {inMaaser && (
              <>
                <Link
                  href="/maaser"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === "/maaser"
                      ? "bg-gold text-navy"
                      : "text-cream hover:bg-navy/80 hover:text-gold"
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/maaser/resumen"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === "/maaser/resumen"
                      ? "bg-gold text-navy"
                      : "text-cream hover:bg-navy/80 hover:text-gold"
                  }`}
                >
                  Resumen
                </Link>
              </>
            )}
            {inIndriver && (
              <>
                <Link
                  href="/indriver"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === "/indriver"
                      ? "bg-gold text-navy"
                      : "text-cream hover:bg-navy/80 hover:text-gold"
                  }`}
                >
                  Gastos
                </Link>
                <Link
                  href="/indriver/resumen"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === "/indriver/resumen"
                      ? "bg-gold text-navy"
                      : "text-cream hover:bg-navy/80 hover:text-gold"
                  }`}
                >
                  Resumen
                </Link>
              </>
            )}
            {inGastos && (
              <Link
                href="/gastos"
                className="bg-gold text-navy px-4 py-2 rounded-lg text-sm font-medium"
              >
                MiFinanzas
              </Link>
            )}
            {(inMaaser || inIndriver || inGastos) && (
              <Link
                href="/"
                className="text-cream hover:bg-navy/80 hover:text-gold px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Inicio
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
