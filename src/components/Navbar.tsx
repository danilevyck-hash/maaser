"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-navy border-b-4 border-gold">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-gold font-bold text-xl tracking-wide">
            ✡ Registro de Maaser ✡
          </Link>
          <div className="flex gap-1">
            <Link
              href="/"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === "/"
                  ? "bg-gold text-navy"
                  : "text-cream hover:bg-navy/80 hover:text-gold"
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/resumen"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === "/resumen"
                  ? "bg-gold text-navy"
                  : "text-cream hover:bg-navy/80 hover:text-gold"
              }`}
            >
              Resumen Mensual
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
