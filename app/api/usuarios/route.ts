import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Rol = "admin" | "manager" | "viewer";

type CreateUserBody = {
  nombre: string;
  email: string;
  username: string;
  password: string;
  rol: Rol;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<CreateUserBody>;

    const nombre = body.nombre?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const username = body.username?.trim() ?? "";
    const password = body.password ?? "";
    const rol = (body.rol ?? "viewer") as Rol;

    if (!nombre || !email || !username || password.length < 6) {
      return jsonError("Datos incompletos o inválidos.");
    }

    if (!["admin", "manager", "viewer"].includes(rol)) {
      return jsonError("Rol inválido.");
    }

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : "";

    if (!token) {
      return jsonError("No autorizado.", 401);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonError("Faltan variables de entorno del servidor.", 500);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const {
      data: { user: requester },
      error: requesterError,
    } = await admin.auth.getUser(token);

    if (requesterError || !requester) {
      return jsonError("Sesión inválida.", 401);
    }

    const { data: requesterProfile, error: requesterProfileError } = await admin
      .from("profiles")
      .select("id, organization_id, rol")
      .eq("id", requester.id)
      .maybeSingle();

    if (requesterProfileError) {
      return jsonError(requesterProfileError.message, 500);
    }

    const requesterOrgId = requesterProfile?.organization_id ?? requester.id;

    const { count: totalEnOrg, error: countError } = await admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", requesterOrgId);

    if (countError) {
      return jsonError(countError.message, 500);
    }

    const rolFinal: Rol = (totalEnOrg ?? 0) === 0 ? "admin" : rol;

    const { data: createdUser, error: createUserError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          nombre,
          username,
        },
      });

    if (createUserError || !createdUser.user) {
      return jsonError(createUserError?.message ?? "No se pudo crear el usuario.", 500);
    }

    const newUserId = createdUser.user.id;

    const { error: profileError } = await admin.from("profiles").upsert(
      {
        id: newUserId,
        organization_id: requesterOrgId,
        email,
        username,
        nombre,
        rol: rolFinal,
        activo: true,
        debe_cambiar_password: true,
      },
      {
        onConflict: "id",
      }
    );

    if (profileError) {
      await admin.auth.admin.deleteUser(newUserId);
      return jsonError(profileError.message, 500);
    }

    return NextResponse.json({
      ok: true,
      userId: newUserId,
      rol: rolFinal,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error interno del servidor.";
    return jsonError(message, 500);
  }
}
