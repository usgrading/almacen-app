import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Body = {
  nombre?: string;
  email?: string;
  password?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;

    const nombre = body.nombre?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!nombre || !email || password.length < 6) {
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

    // Contar perfiles existentes
    const { count, error: countError } = await admin
      .from("profiles")
      .select("*", { count: "exact", head: true });

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    const esPrimerUsuario = (count ?? 0) === 0;
    const rolFinal = esPrimerUsuario ? "admin" : "viewer";

    // Crear usuario en auth
    const { data: userData, error: userError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          nombre,
        },
      });

    if (userError || !userData.user) {
      return NextResponse.json(
        { error: userError?.message ?? "No se pudo crear el usuario." },
        { status: 500 }
      );
    }

    const userId = userData.user.id;

    // Crear profile real
    const { error: profileError } = await admin.from("profiles").upsert(
      {
        id: userId,
        organization_id: userId,
        nombre,
        email,
        username: email.split("@")[0],
        rol: rolFinal,
        activo: true,
        debe_cambiar_password: false,
      },
      {
        onConflict: "id",
      }
    );

    if (profileError) {
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      rol: rolFinal,
      esPrimerUsuario,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error interno del servidor.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
