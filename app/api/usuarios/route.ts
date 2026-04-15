import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Rol = "admin" | "manager" | "viewer";

type Body = {
  nombre?: string;
  email?: string;
  username?: string;
  password?: string;
  rol?: Rol;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;

    const nombre = body.nombre?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const username = body.username?.trim() ?? "";
    const password = body.password ?? "";
    const rol: Rol =
      body.rol === "admin" || body.rol === "manager" || body.rol === "viewer"
        ? body.rol
        : "viewer";

    if (!nombre || !email || !username || password.length < 6) {
      return NextResponse.json(
        { error: "Faltan datos o el password es muy corto." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Faltan variables de entorno del servidor." },
        { status: 500 }
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: userData, error: userError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          nombre,
          username,
        },
      });

    if (userError || !userData.user) {
      return NextResponse.json(
        { error: userError?.message ?? "No se pudo crear el usuario en auth." },
        { status: 500 }
      );
    }

    const userId = userData.user.id;

    const { error: profileError } = await admin
      .from("profiles")
      .upsert(
        {
          id: userId,
          organization_id: userId,
          nombre,
          email,
          username,
          rol,
          activo: true,
          debe_cambiar_password: true,
        },
        {
          onConflict: "id",
        }
      );

    if (profileError) {
      await admin.auth.admin.deleteUser(userId);

      return NextResponse.json(
        { error: profileError.message || "No se pudo crear el profile." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      userId,
      rol,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error interno del servidor.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}