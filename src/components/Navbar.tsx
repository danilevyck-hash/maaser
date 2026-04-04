"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const inMaaser = pathname.startsWith("/maaser");
  const inIndriver = pathname.startsWith("/indriver");
  const inPropiedades = pathname.startsWith("/propiedades");
  const inLogin = pathname.startsWith("/login");
  const inSection = inMaaser || inIndriver;

  // Propiedades has its own full-screen layout, login has no navbar
  if (inPropiedades || inLogin) return null;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="bg-navy border-b-4 border-gold">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title row */}
        <div className="flex items-center justify-between h-12">
          <Link href="/" className="text-gold font-bold text-lg tracking-wide">
            ✡ Mis Registros 🚗
          </Link>
          <div className="flex items-center gap-3">
            {inSection && (
              <Link
                href="/"
                className="text-cream/70 hover:text-gold text-xs font-medium transition-colors"
              >
                ← Inicio
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="text-cream/50 hover:text-red-400 text-xs font-medium transition-colors bg-transparent border-0 cursor-pointer"
            >
              Salir
            </button>
          </div>
        </div>
        {/* Nav links row (only when in a section) */}
        {inSection && (
          <div className="flex gap-1 pb-2">
            {inMaaser && (
              <>
                <Link
                  href="/maaser"
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === "/maaser"
                      ? "bg-gold text-navy"
                      : "text-cream hover:bg-navy/80 hover:text-gold"
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/maaser/beneficiarios"
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === "/maaser/beneficiarios"
                      ? "bg-gold text-navy"
                      : "text-cream hover:bg-navy/80 hover:text-gold"
                  }`}
                >
                  Beneficiarios
                </Link>
                <Link
                  href="/maaser/resumen"
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === "/indriver"
                      ? "bg-gold text-navy"
                      : "text-cream hover:bg-navy/80 hover:text-gold"
                  }`}
                >
                  Gastos
                </Link>
                <Link
                  href="/indriver/resumen"
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === "/indriver/resumen"
                      ? "bg-gold text-navy"
                      : "text-cream hover:bg-navy/80 hover:text-gold"
                  }`}
                >
                  Resumen
                </Link>
              </>
            )}

          </div>
        )}
      </div>
    </nav>
  );
}
