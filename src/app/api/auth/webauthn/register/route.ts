import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@/lib/webauthn";

const APP_PASSWORD = process.env.APP_PASSWORD || "";

async function hashPassword(pw: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pw);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session || !APP_PASSWORD) return false;
  const expected = await hashPassword(
    APP_PASSWORD + process.env.NEXT_PUBLIC_SUPABASE_URL
  );
  return session === expected;
}

// GET — generate registration options (requires valid session)
export async function GET(req: NextRequest) {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    const rpId = req.headers.get("host")?.split(":")[0] || "localhost";

    // Get existing credential IDs to exclude
    const { data: existing } = await supabase
      .from("webauthn_credentials")
      .select("credential_id");

    const existingIds = (existing || []).map(
      (c: { credential_id: string }) => c.credential_id
    );

    const options = generateRegistrationOptions(
      1, // single user, fixed userId
      "maaser-user",
      rpId,
      existingIds
    );

    return NextResponse.json(options);
  } catch (err) {
    console.error("WebAuthn register GET error:", err);
    return NextResponse.json(
      { error: "Error del servidor" },
      { status: 500 }
    );
  }
}

// POST — verify registration and store credential
export async function POST(req: NextRequest) {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      challenge,
      clientDataJSON,
      attestationObject,
      deviceName,
    } = body;

    const rpId = req.headers.get("host")?.split(":")[0] || "localhost";
    const origin = req.headers.get("origin") || `https://${rpId}`;

    const credential = await verifyRegistrationResponse(
      {
        id: "",
        rawId: "",
        type: "public-key",
        response: {
          attestationObject,
          clientDataJSON,
        },
      },
      challenge,
      rpId,
      origin
    );

    // Store credential in Supabase
    const { error: dbError } = await supabase
      .from("webauthn_credentials")
      .insert({
        credential_id: credential.credentialId,
        public_key: credential.publicKey,
        counter: credential.counter,
        device_name: deviceName || "Dispositivo",
      });

    if (dbError) {
      console.error("DB error storing credential:", dbError);
      return NextResponse.json(
        { error: "Error guardando credencial" },
        { status: 500 }
      );
    }

    // Set session cookie (same as PIN login)
    const token = await hashPassword(
      APP_PASSWORD + process.env.NEXT_PUBLIC_SUPABASE_URL
    );
    const cookieStore = await cookies();
    cookieStore.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return NextResponse.json({
      ok: true,
      credentialId: credential.credentialId,
    });
  } catch (err) {
    console.error("WebAuthn register POST error:", err);
    const message =
      err instanceof Error ? err.message : "Error del servidor";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
