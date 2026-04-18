import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { uniqueProfileUsername } from "@/lib/profile-username";

type Body = {
  nombre?: string;
  email?: string;
  password?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;

    const nombreRaw = typeof body.nombre === "string" ? body.nombre.trim() : "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!email || password.length < 6) {
      return NextResponse.json(
        { error: "Faltan datos o el password es muy corto." },
        { status: 400 }
      );
    }

    const orgNombre =
      nombreRaw.length > 0 ? nombreRaw : "Nueva organización";
    const nombrePerfil =
      nombreRaw.length > 0
        ? nombreRaw
        : email.includes("@")
          ? email.split("@")[0]!
          : "Usuario";

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

    const { data: org, error: orgError } = await admin
      .from("organizations")
      .insert({ nombre: orgNombre })
      .select()
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        {
          error:
            (orgError?.message ?? "No se pudo crear la organización.") +
            " Revisa la tabla organizations (columna nombre NOT NULL).",
        },
        { status: 500 }
      );
    }

    const organizationId = org.id as string;
    const rolFinal = "admin" as const;

    const { data: userData, error: userError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          nombre: nombrePerfil,
          app_rol: rolFinal,
          app_organization_id: organizationId,
        },
      });

    if (userError || !userData.user) {
      await admin.from("organizations").delete().eq("id", organizationId);
      const raw = userError?.message ?? "No se pudo crear el usuario.";
      const hint =
        raw.toLowerCase().includes("database error saving new user")
          ? " Suele deberse a un trigger en auth.users que inserta en profiles (revisa SQL en Supabase) o a username/email duplicado."
          : "";
      return NextResponse.json({ error: raw + hint }, { status: 500 });
    }

    const userId = userData.user.id;
    const username = uniqueProfileUsername(email, userId);

    const { error: profileError } = await admin.from("profiles").upsert(
      {
        id: userId,
        organization_id: organizationId,
        nombre: nombrePerfil,
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
      await admin.from("organizations").delete().eq("id", organizationId);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      rol: rolFinal,
      organizationId,
      organizationNombre: orgNombre,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error interno del servidor.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
