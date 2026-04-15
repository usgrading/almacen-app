import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { uniqueProfileUsername } from "@/lib/profile-username";
import { canManageUsers, normalizeRole } from "@/lib/roles";

type Rol = "admin" | "manager" | "viewer";

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
      .select("organization_id, role, rol")
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
      role?: string | null;
      rol?: string | null;
    } | null;

    const inviterRole = normalizeRole(inviterRow?.role ?? inviterRow?.rol ?? null);
    if (!canManageUsers(inviterRole)) {
      return NextResponse.json(
        { error: "Solo un administrador puede crear usuarios." },
        { status: 403 }
      );
    }

    const organizationId = inviterRow?.organization_id ?? inviter.id;

    let rolFinal: Rol = "viewer";
    if (rol === "admin" || rol === "manager" || rol === "viewer") {
      rolFinal = rol;
    }

    const { data: userData, error: userError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
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

    const { error: profileError } = await admin.from("profiles").upsert(
      {
        id: userId,
        organization_id: organizationId,
        nombre,
        email,
        username: usernameFinal,
        rol: rolFinal,
        role: rolFinal,
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
