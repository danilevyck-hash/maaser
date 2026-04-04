"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = useCallback(async (fullPin: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: fullPin }),
      });
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setPin("");
        setError("PIN incorrecto");
      }
    } catch {
      setPin("");
      setError("Error de conexion");
    } finally {
      setLoading(false);
    }
  }, [router]);

  function handleDigit(digit: string) {
    if (loading) return;
    setError("");
    const next = pin + digit;
    setPin(next);
    if (next.length === 4) {
      submit(next);
    }
  }

  function handleDelete() {
    if (loading) return;
    setPin((p) => p.slice(0, -1));
    setError("");
  }

  const dots = Array.from({ length: 4 }, (_, i) => i < pin.length);

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-xs">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">✡</div>
          <h1 className="text-2xl font-bold text-navy">Mis Registros</h1>
          <p className="text-gray-500 text-sm mt-1">Ingresa tu PIN</p>
        </div>

        {/* PIN dots */}
        <div className="flex justify-center gap-4 mb-6">
          {dots.map((filled, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full transition-all duration-150 ${
                filled ? "bg-navy scale-110" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-xl text-sm text-center mb-4">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center text-gray-400 text-sm mb-4">Verificando...</div>
        )}

        {/* Number pad */}
        <div className="grid grid-cols-3 gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map(
            (key) => {
              if (key === "") return <div key="empty" />;
              if (key === "del") {
                return (
                  <button
                    key="del"
                    onClick={handleDelete}
                    disabled={loading || pin.length === 0}
                    className="h-16 rounded-xl text-lg font-medium text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors disabled:opacity-30 border-0 bg-transparent cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414-6.414A2 2 0 0110.828 5H21a1 1 0 011 1v12a1 1 0 01-1 1H10.828a2 2 0 01-1.414-.586L3 12z" />
                    </svg>
                  </button>
                );
              }
              return (
                <button
                  key={key}
                  onClick={() => handleDigit(key)}
                  disabled={loading || pin.length >= 4}
                  className="h-16 rounded-xl text-2xl font-semibold text-navy hover:bg-cream active:bg-gold/20 transition-colors disabled:opacity-30 border-0 bg-transparent cursor-pointer"
                >
                  {key}
                </button>
              );
            }
          )}
        </div>
      </div>
    </div>
  );
}
