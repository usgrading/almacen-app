import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  normalizeInternalLoginUsername,
  validateInternalLoginUsername,
} from "@/lib/internal-username";

/**
 * Resuelve identificador de login → email de Supabase Auth.
 * Correo real: se devuelve tal cual (minúsculas).
 * Usuario interno: búsqueda por username en profiles (service role).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const raw =
      typeof body.identifier === "string" ? body.identifier.trim() : "";

    if (!raw) {
      return NextResponse.json(
        { error: "Indica correo o usuario." },
        { status: 400 }
      );
    }

    if (raw.includes("@")) {
      return NextResponse.json({ email: raw.toLowerCase() });
    }

    const normalized = normalizeInternalLoginUsername(raw);
    const invalid = validateInternalLoginUsername(normalized);
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Configuración del servidor incompleta." },
        { status: 500 }
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: row, error } = await admin
      .from("profiles")
      .select("email")
      .eq("username", normalized)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const email =
      row && typeof (row as { email?: unknown }).email === "string"
        ? (row as { email: string }).email.trim()
        : "";

    if (!email) {
      return NextResponse.json(
        { error: "Usuario o contraseña incorrectos." },
        { status: 401 }
      );
    }

    return NextResponse.json({ email });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error interno del servidor.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
