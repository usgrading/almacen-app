import type { SupabaseClient } from "@supabase/supabase-js";

export async function getMiOrganizationId(
  client: SupabaseClient
): Promise<string | null> {
  const {
    data: { session },
  } = await client.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return null;

  const { data: row } = await client
    .from("profiles")
    .select("organization_id")
    .eq("id", uid)
    .maybeSingle();

  const org = (row as { organization_id?: string | null } | null)?.organization_id;
  if (org && typeof org === "string") return org;
  return uid;
}

export async function ensureMiOrganizationId(client: SupabaseClient): Promise<void> {
  const {
    data: { session },
  } = await client.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return;

  const { data: row } = await client
    .from("profiles")
    .select("organization_id")
    .eq("id", uid)
    .maybeSingle();

  const org = (row as { organization_id?: string | null } | null)?.organization_id;
  if (org) return;

  await client.from("profiles").update({ organization_id: uid }).eq("id", uid);
}
