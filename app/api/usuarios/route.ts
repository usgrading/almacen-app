import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { nombre, email, username, password, rol } = await req.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const admin = createClient(supabaseUrl, serviceRole);

    // 🔥 VALIDAR ROL CORRECTO
    let rolFinal = "viewer";

    if (rol === "admin" || rol === "manager" || rol === "viewer") {
      rolFinal = rol;
    }

    // 1. Crear usuario en auth
    const { data: userData, error: userError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (userError || !userData.user) {
      throw userError;
    }

    const userId = userData.user.id;

    // 2. Crear profile REAL
    const { error: profileError } = await admin.from("profiles").upsert(
      {
        id: userId,
        organization_id: userId,
        nombre,
        email,
        username,
        rol: rolFinal, // 🔥 AQUÍ ESTÁ LA CLAVE
        activo: true,
        debe_cambiar_password: true,
      },
      {
        onConflict: "id",
      }
    );

    if (profileError) {
      throw profileError;
    }

    return NextResponse.json({ ok: true, rol: rolFinal });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "error" },
      { status: 500 }
    );
  }
}
