"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-4xl">
        <Link
          href="/maaser"
          className="bg-white rounded-2xl shadow-lg border-2 border-transparent hover:border-gold transition-all p-8 text-center group"
        >
          <div className="text-5xl mb-4">✡</div>
          <h2 className="text-2xl font-bold text-navy mb-2">Maaser</h2>
          <p className="text-gray-500 text-sm">Registro de donaciones</p>
          <div className="mt-4 text-gold font-medium text-sm group-hover:underline">
            Entrar →
          </div>
        </Link>

        <Link
          href="/indriver"
          className="bg-white rounded-2xl shadow-lg border-2 border-transparent hover:border-gold transition-all p-8 text-center group"
        >
          <div className="text-5xl mb-4">🚗</div>
          <h2 className="text-2xl font-bold text-navy mb-2">InDriver</h2>
          <p className="text-gray-500 text-sm">Gastos mensuales</p>
          <div className="mt-4 text-gold font-medium text-sm group-hover:underline">
            Entrar →
          </div>
        </Link>

        <Link
          href="/gastos"
          className="bg-white rounded-2xl shadow-lg border-2 border-transparent hover:border-gold transition-all p-8 text-center group"
        >
          <div className="text-5xl mb-4">💰</div>
          <h2 className="text-2xl font-bold text-navy mb-2">MiFinanzas</h2>
          <p className="text-gray-500 text-sm">Control de gastos personales</p>
          <div className="mt-4 text-gold font-medium text-sm group-hover:underline">
            Entrar →
          </div>
        </Link>
      </div>
    </div>
  );
}
