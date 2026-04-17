import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { contarUsuariosAuth } from "@/lib/auth-admin-count";
import { uniqueProfileUsername } from "@/lib/profile-username";

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

    const { count: profileCount, error: countError } = await admin
      .from("profiles")
      .select("*", { count: "exact", head: true });

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    const authTotal = await contarUsuariosAuth(admin);
    if (authTotal === null) {
      return NextResponse.json(
        {
          error:
            "No se pudo verificar usuarios existentes en el servidor. Intenta de nuevo en un momento.",
        },
        { status: 503 }
      );
    }

    const perfiles = profileCount ?? 0;
    /** Admin solo si no hay nadie en Auth ni en profiles (misma regla en móvil y escritorio). */
    const esPrimerUsuario = perfiles === 0 && authTotal === 0;
    const rolFinal = esPrimerUsuario ? "admin" : "viewer";

    // Crear usuario en auth
    const { data: userData, error: userError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          nombre,
          app_rol: rolFinal,
        },
      });

    if (userError || !userData.user) {
      const raw = userError?.message ?? "No se pudo crear el usuario.";
      const hint =
        raw.toLowerCase().includes("database error saving new user")
          ? " Suele deberse a un trigger en auth.users que inserta en profiles (revisa SQL en Supabase) o a username/email duplicado."
          : "";
      return NextResponse.json({ error: raw + hint }, { status: 500 });
    }

    const userId = userData.user.id;
    const username = uniqueProfileUsername(email, userId);

    // Fila en profiles: `rol` siempre en el payload (nunca confiar en DEFAULT de la BD).
    const { error: profileError } = await admin.from("profiles").upsert(
      {
        id: userId,
        organization_id: userId,
        nombre,
        email,
        username,
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
