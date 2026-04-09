import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@/lib/webauthn";

const APP_PASSWORD = process.env.APP_PASSWORD || "";

async function hashPassword(pw: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pw);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// GET — generate authentication options
export async function GET(req: NextRequest) {
  try {
    const rpId = req.headers.get("host")?.split(":")[0] || "localhost";

    // Get all stored credential IDs
    const { data: credentials, error: dbError } = await supabase
      .from("webauthn_credentials")
      .select("credential_id");

    if (dbError || !credentials || credentials.length === 0) {
      return NextResponse.json(
        { error: "No hay credenciales registradas" },
        { status: 404 }
      );
    }

    const credentialIds = credentials.map(
      (c: { credential_id: string }) => c.credential_id
    );

    const options = generateAuthenticationOptions(credentialIds, rpId);

    return NextResponse.json(options);
  } catch (err) {
    console.error("WebAuthn authenticate GET error:", err);
    return NextResponse.json(
      { error: "Error del servidor" },
      { status: 500 }
    );
  }
}

// POST — verify authentication and set session
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      challenge,
      credentialId,
      clientDataJSON,
      authenticatorData,
      signature,
    } = body;

    // Look up the credential
    const { data: cred, error: dbError } = await supabase
      .from("webauthn_credentials")
      .select("*")
      .eq("credential_id", credentialId)
      .single();

    if (dbError || !cred) {
      return NextResponse.json(
        { error: "Credencial no encontrada" },
        { status: 404 }
      );
    }

    const rpId = req.headers.get("host")?.split(":")[0] || "localhost";
    const origin = req.headers.get("origin") || `https://${rpId}`;

    const { newCounter } = await verifyAuthenticationResponse(
      {
        id: credentialId,
        rawId: credentialId,
        type: "public-key",
        response: {
          authenticatorData,
          clientDataJSON,
          signature,
        },
      },
      {
        publicKey: cred.public_key,
        counter: cred.counter,
      },
      challenge,
      rpId,
      origin
    );

    // Update counter
    await supabase
      .from("webauthn_credentials")
      .update({ counter: newCounter })
      .eq("credential_id", credentialId);

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

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("WebAuthn authenticate POST error:", err);
    const message =
      err instanceof Error ? err.message : "Error del servidor";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
