import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildInternalAuthEmail } from "@/lib/internal-email";
import {
  normalizeInternalLoginUsername,
  validateInternalLoginUsername,
} from "@/lib/internal-username";
import { generateTemporaryPassword } from "@/lib/temp-password";
import { canManageUsers, parseAppRole } from "@/lib/roles";

/**
 * Alta de usuarios internos: correo y contraseña los genera el servidor.
 * El organization_id sale siempre del perfil del administrador autenticado (Bearer).
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const nombre =
      typeof body.nombre === "string" ? body.nombre.trim() : "";
    const rol = body.rol;

    const usernameRaw =
      typeof body.username === "string" ? body.username : "";
    const normalizedUsername = normalizeInternalLoginUsername(usernameRaw);
    const usernameError = validateInternalLoginUsername(normalizedUsername);

    if (!nombre || usernameError) {
      return NextResponse.json(
        {
          error:
            usernameError ??
            "Indica nombre y un usuario de login válido.",
        },
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

    const { data: ocupado } = await admin
      .from("profiles")
      .select("id")
      .eq("username", normalizedUsername)
      .maybeSingle();

    if (ocupado) {
      return NextResponse.json(
        { error: "Ese nombre de usuario ya está en uso. Elige otro." },
        { status: 409 }
      );
    }

    const internalEmail = buildInternalAuthEmail(normalizedUsername);
    const tempPassword = generateTemporaryPassword();

    const { data: userData, error: userError } =
      await admin.auth.admin.createUser({
        email: internalEmail,
        password: tempPassword,
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

    const { error: profileError } = await admin.from("profiles").upsert(
      {
        id: userId,
        organization_id: organizationId,
        nombre,
        email: internalEmail,
        username: normalizedUsername,
        rol: rolFinal,
        activo: true,
        must_change_password: true,
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
      username: normalizedUsername,
      passwordTemporal: tempPassword,
      rol: rolFinal,
      organization_id: organizationId,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error interno del servidor.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
