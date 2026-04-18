import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { uniqueProfileUsername } from "@/lib/profile-username";
import { canManageUsers, parseAppRole } from "@/lib/roles";

/**
 * Creación de usuarios internos: NO crea organizaciones.
 * El `organization_id` es siempre el del admin (Bearer) leído desde `profiles`.
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const nombre =
      typeof body.nombre === "string" ? body.nombre.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password =
      typeof body.password === "string" ? body.password : "";
    const username = body.username;
    const rol = body.rol;

    if (!nombre || !email || password.length < 6) {
      return NextResponse.json(
        { error: "Faltan nombre, correo o contraseña válida (mín. 6 caracteres)." },
        { status: 400 }
      );
    }

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

    // Usuario autenticado = quien envía el Bearer (mismo flujo que supabase.auth.getSession en cliente)
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

    const rawOrg = inviterRow.organization_id;
    if (
      rawOrg == null ||
      typeof rawOrg !== "string" ||
      rawOrg.trim() === ""
    ) {
      return NextResponse.json(
        {
          error:
            "Tu perfil no tiene organization_id. No se puede asignar organización al nuevo usuario.",
        },
        { status: 403 }
      );
    }
    const organizationId = rawOrg.trim();

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
          nombre,
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
    const handleBase =
      typeof username === "string" && username.trim().length > 0
        ? username.trim()
        : email;
    const usernameFinal = uniqueProfileUsername(handleBase, userId);

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

    return NextResponse.json({
      ok: true,
      rol: rolFinal,
      organization_id: organizationId,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error interno del servidor.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
