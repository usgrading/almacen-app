import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { uniqueProfileUsername } from "@/lib/profile-username";
import { canManageUsers, parseAppRole } from "@/lib/roles";

export async function POST(req: NextRequest) {
  try {
    const { nombre, email, username, password, rol } = await req.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const authHeader = req.headers.get("authorization");
    const bearer = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;
    if (!bearer) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const admin = createClient(supabaseUrl, serviceRole, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const {
      data: { user: inviter },
      error: inviterError,
    } = await admin.auth.getUser(bearer);

    if (inviterError || !inviter?.id) {
      return NextResponse.json(
        { error: "Sesión inválida. Vuelve a iniciar sesión." },
        { status: 401 }
      );
    }

    const { data: inviterProfile, error: inviterProfileError } = await admin
      .from("profiles")
      .select("organization_id, rol")
      .eq("id", inviter.id)
      .maybeSingle();

    if (inviterProfileError) {
      return NextResponse.json(
        { error: inviterProfileError.message },
        { status: 500 }
      );
    }

    const inviterRow = inviterProfile as {
      organization_id?: string | null;
      rol?: string | null;
    } | null;

    if (!inviterRow) {
      return NextResponse.json(
        { error: "No se encontró tu perfil (profiles)." },
        { status: 403 }
      );
    }

    const inviterRole = parseAppRole(inviterRow.rol);
    if (inviterRole === null) {
      return NextResponse.json(
        {
          error:
            "Tu perfil no tiene un rol válido en profiles.rol. Contacta al administrador.",
        },
        { status: 403 }
      );
    }
    if (!canManageUsers(inviterRole)) {
      return NextResponse.json(
        { error: "Solo un administrador puede crear usuarios." },
        { status: 403 }
      );
    }

    const organizationId = inviterRow.organization_id ?? inviter.id;

    if (rol === undefined || rol === null) {
      return NextResponse.json(
        { error: "Falta el campo rol (admin, manager o viewer)." },
        { status: 400 }
      );
    }
    const rolFinal = parseAppRole(rol);
    if (rolFinal === null) {
      return NextResponse.json(
        { error: "El rol debe ser admin, manager o viewer." },
        { status: 400 }
      );
    }

    const { data: userData, error: userError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          app_rol: rolFinal,
          app_organization_id: organizationId,
        },
      });

    if (userError || !userData.user) {
      const raw = userError?.message ?? "No se pudo crear el usuario.";
      const hint =
        raw.toLowerCase().includes("database error saving new user")
          ? " Revisa trigger en auth.users → profiles y unicidad de username/email."
          : "";
      return NextResponse.json({ error: raw + hint }, { status: 500 });
    }

    const userId = userData.user.id;
    const emailStr = String(email).trim().toLowerCase();
    const handleBase =
      typeof username === "string" && username.trim().length > 0
        ? username.trim()
        : emailStr;
    const usernameFinal = uniqueProfileUsername(handleBase, userId);

    // `rol` explícito; el trigger + user_metadata.app_rol ya alinean; el upsert fija el perfil final.
    const { error: profileError } = await admin.from("profiles").upsert(
      {
        id: userId,
        organization_id: organizationId,
        nombre,
        email,
        username: usernameFinal,
        rol: rolFinal,
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
        { error: profileError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, rol: rolFinal });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error interno del servidor.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
