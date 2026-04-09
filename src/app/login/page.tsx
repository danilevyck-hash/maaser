"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Phase = "login" | "prompt-faceid" | "registering";

export default function LoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [phase, setPhase] = useState<Phase>("login");
  const [webauthnAvailable, setWebauthnAvailable] = useState(false);
  const [faceIdLoading, setFaceIdLoading] = useState(false);
  const autoTriggered = useRef(false);

  // Check if WebAuthn is available on mount
  useEffect(() => {
    const hasFlag = localStorage.getItem("maaser_webauthn_available") === "true";
    const browserSupport =
      typeof window !== "undefined" &&
      !!window.PublicKeyCredential &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function";

    if (hasFlag && browserSupport) {
      setWebauthnAvailable(true);
    }
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  // ─── PIN login ───
  const submitPin = useCallback(
    async (fullPin: string) => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: fullPin }),
        });
        if (res.ok) {
          // Check if browser supports platform authenticator
          const canRegister =
            !!window.PublicKeyCredential &&
            typeof window.PublicKeyCredential
              .isUserVerifyingPlatformAuthenticatorAvailable === "function";

          if (canRegister) {
            const available =
              await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
            if (
              available &&
              localStorage.getItem("maaser_webauthn_available") !== "true"
            ) {
              setPhase("prompt-faceid");
              setLoading(false);
              return;
            }
          }
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
    },
    [router]
  );

  function handleDigit(digit: string) {
    if (loading || phase !== "login") return;
    setError("");
    const next = pin + digit;
    setPin(next);
    if (next.length === 4) {
      submitPin(next);
    }
  }

  function handleDelete() {
    if (loading || phase !== "login") return;
    setPin((p) => p.slice(0, -1));
    setError("");
  }

  // ─── Face ID Authentication ───
  async function handleFaceIdLogin() {
    setFaceIdLoading(true);
    setError("");
    try {
      // 1. Get authentication options
      const optRes = await fetch("/api/auth/webauthn/authenticate");
      if (!optRes.ok) {
        throw new Error("No hay credenciales");
      }
      const options = await optRes.json();

      // 2. Call WebAuthn API
      const credential = (await navigator.credentials.get({
        publicKey: {
          challenge: base64urlToBuffer(options.challenge),
          rpId: options.rpId,
          allowCredentials: options.allowCredentials.map(
            (c: { type: string; id: string }) => ({
              type: c.type,
              id: base64urlToBuffer(c.id),
            })
          ),
          userVerification: options.userVerification,
          timeout: options.timeout,
        },
      })) as PublicKeyCredential;

      const response =
        credential.response as AuthenticatorAssertionResponse;

      // 3. Verify on server
      const verifyRes = await fetch("/api/auth/webauthn/authenticate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge: options.challenge,
          credentialId: bufferToBase64url(credential.rawId),
          clientDataJSON: bufferToBase64url(response.clientDataJSON),
          authenticatorData: bufferToBase64url(response.authenticatorData),
          signature: bufferToBase64url(response.signature),
        }),
      });

      if (verifyRes.ok) {
        router.push("/");
        router.refresh();
      } else {
        const data = await verifyRes.json();
        throw new Error(data.error || "Verificación falló");
      }
    } catch (err) {
      console.error("Face ID login error:", err);
      showToast("No se pudo verificar");
      setWebauthnAvailable(false);
    } finally {
      setFaceIdLoading(false);
    }
  }

  // Auto-trigger Face ID on page load
  useEffect(() => {
    if (webauthnAvailable && !autoTriggered.current) {
      autoTriggered.current = true;
      const timer = setTimeout(() => {
        handleFaceIdLogin();
      }, 300);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webauthnAvailable]);

  // ─── Face ID Registration ───
  async function handleRegisterFaceId() {
    setPhase("registering");
    try {
      // 1. Get registration options
      const optRes = await fetch("/api/auth/webauthn/register");
      if (!optRes.ok) throw new Error("Error obteniendo opciones");
      const options = await optRes.json();

      // 2. Call WebAuthn API
      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge: base64urlToBuffer(options.challenge),
          rp: options.rp,
          user: {
            id: base64urlToBuffer(options.user.id),
            name: options.user.name,
            displayName: options.user.displayName,
          },
          pubKeyCredParams: options.pubKeyCredParams,
          authenticatorSelection: options.authenticatorSelection,
          attestation: options.attestation,
          timeout: options.timeout,
          excludeCredentials: options.excludeCredentials.map(
            (c: { type: string; id: string }) => ({
              type: c.type,
              id: base64urlToBuffer(c.id),
            })
          ),
        },
      })) as PublicKeyCredential;

      const response =
        credential.response as AuthenticatorAttestationResponse;

      // 3. Verify on server
      const verifyRes = await fetch("/api/auth/webauthn/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge: options.challenge,
          clientDataJSON: bufferToBase64url(response.clientDataJSON),
          attestationObject: bufferToBase64url(response.attestationObject),
          deviceName: "Face ID",
        }),
      });

      if (verifyRes.ok) {
        const data = await verifyRes.json();
        // Save to localStorage
        localStorage.setItem("maaser_webauthn_available", "true");
        const existing = JSON.parse(
          localStorage.getItem("maaser_webauthn_cred_ids") || "[]"
        );
        existing.push(data.credentialId);
        localStorage.setItem(
          "maaser_webauthn_cred_ids",
          JSON.stringify(existing)
        );
        showToast("Face ID configurado");
        setTimeout(() => {
          router.push("/");
          router.refresh();
        }, 1000);
      } else {
        throw new Error("Error registrando");
      }
    } catch (err) {
      console.error("Face ID registration error:", err);
      showToast("No se pudo configurar Face ID");
      router.push("/");
      router.refresh();
    }
  }

  function handleSkipFaceId() {
    router.push("/");
    router.refresh();
  }

  // ─── Helpers ───
  function base64urlToBuffer(base64url: string): ArrayBuffer {
    let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) base64 += "=";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  function bufferToBase64url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  const dots = Array.from({ length: 4 }, (_, i) => i < pin.length);

  // ─── Face ID prompt after PIN login ───
  if (phase === "prompt-faceid" || phase === "registering") {
    return (
      <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-xs text-center">
          <div className="text-5xl mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#007AFF"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-16 h-16 mx-auto"
            >
              <path d="M7 3H5a2 2 0 0 0-2 2v2" />
              <path d="M17 3h2a2 2 0 0 1 2 2v2" />
              <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
              <path d="M17 21h2a2 2 0 0 0 2-2v-2" />
              <circle cx="9" cy="10" r="0.5" fill="#007AFF" />
              <circle cx="15" cy="10" r="0.5" fill="#007AFF" />
              <path d="M9.5 15a3.5 3.5 0 0 0 5 0" />
            </svg>
          </div>
          <h2 className="text-[20px] font-bold text-[#1C1C1E] mb-2">
            {phase === "registering"
              ? "Configurando Face ID..."
              : "Entrar con Face ID la proxima vez?"}
          </h2>
          {phase === "prompt-faceid" && (
            <p className="text-[#8E8E93] text-[15px] mb-6">
              Usa Face ID para entrar mas rapido sin PIN
            </p>
          )}
          {phase === "registering" && (
            <p className="text-[#8E8E93] text-[15px] mb-6">
              Sigue las instrucciones en pantalla...
            </p>
          )}
          {phase === "prompt-faceid" && (
            <div className="space-y-3">
              <button
                onClick={handleRegisterFaceId}
                className="w-full h-[50px] bg-[#007AFF] text-white text-[17px] font-semibold rounded-xl active:opacity-80 transition-opacity border-0 cursor-pointer"
              >
                Si
              </button>
              <button
                onClick={handleSkipFaceId}
                className="w-full h-[50px] bg-transparent text-[#007AFF] text-[17px] font-medium rounded-xl active:bg-[#E5E5EA] transition-colors border-0 cursor-pointer"
              >
                No, gracias
              </button>
            </div>
          )}
        </div>
        {toast && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#1C1C1E] text-white px-6 py-3 rounded-xl text-[15px] font-medium shadow-lg z-50 animate-fade-in">
            {toast}
          </div>
        )}
      </div>
    );
  }

  // ─── Main login screen ───
  return (
    <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-xs">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">&#x2721;</div>
          <h1 className="text-[22px] font-bold text-[#1C1C1E]">
            Mis Registros
          </h1>
          <p className="text-[#8E8E93] text-[15px] mt-1">Ingresa tu PIN</p>
        </div>

        {/* Face ID button */}
        {webauthnAvailable && (
          <button
            onClick={handleFaceIdLogin}
            disabled={faceIdLoading}
            className="w-full h-[50px] bg-[#007AFF] text-white text-[17px] font-semibold rounded-xl mb-5 flex items-center justify-center gap-2 active:opacity-80 transition-opacity disabled:opacity-50 border-0 cursor-pointer"
          >
            {faceIdLoading ? (
              "Verificando..."
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-6 h-6"
                >
                  <path d="M7 3H5a2 2 0 0 0-2 2v2" />
                  <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                  <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                  <path d="M17 21h2a2 2 0 0 0 2-2v-2" />
                  <circle cx="9" cy="10" r="0.5" fill="currentColor" />
                  <circle cx="15" cy="10" r="0.5" fill="currentColor" />
                  <path d="M9.5 15a3.5 3.5 0 0 0 5 0" />
                </svg>
                Entrar con Face ID
              </>
            )}
          </button>
        )}

        {/* PIN dots */}
        <div className="flex justify-center gap-4 mb-6">
          {dots.map((filled, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full transition-all duration-150 ${
                filled ? "bg-[#007AFF] scale-110" : "bg-[#C6C6C8]"
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/20 text-[#FF3B30] px-4 py-2 rounded-xl text-[15px] text-center mb-4">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center text-[#8E8E93] text-[15px] mb-4">
            Verificando...
          </div>
        )}

        {/* Number pad */}
        <div className="grid grid-cols-3 gap-3">
          {[
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "",
            "0",
            "del",
          ].map((key) => {
            if (key === "") return <div key="empty" />;
            if (key === "del") {
              return (
                <button
                  key="del"
                  onClick={handleDelete}
                  disabled={loading || pin.length === 0}
                  className="h-16 rounded-xl text-lg font-medium text-[#8E8E93] active:bg-[#E5E5EA] transition-colors disabled:opacity-30 border-0 bg-transparent cursor-pointer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414-6.414A2 2 0 0110.828 5H21a1 1 0 011 1v12a1 1 0 01-1 1H10.828a2 2 0 01-1.414-.586L3 12z"
                    />
                  </svg>
                </button>
              );
            }
            return (
              <button
                key={key}
                onClick={() => handleDigit(key)}
                disabled={loading || pin.length >= 4}
                className="h-16 rounded-xl text-2xl font-semibold text-[#1C1C1E] active:bg-[#E5E5EA] transition-colors disabled:opacity-30 border-0 bg-transparent cursor-pointer"
              >
                {key}
              </button>
            );
          })}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#1C1C1E] text-white px-6 py-3 rounded-xl text-[15px] font-medium shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
