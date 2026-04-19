"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { fetchMustChangePassword } from "@/lib/must-change-password";

function isPublicPath(path: string): boolean {
  if (path === "/") return true;
  if (
    path === "/login" ||
    path === "/signup" ||
    path.startsWith("/reset-password")
  ) {
    return true;
  }
  return false;
}

export function MustChangePasswordGate({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!pathname || isPublicPath(pathname) || pathname === "/cambiar-password") {
      return;
    }

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        return;
      }

      const must = await fetchMustChangePassword(supabase, session.user.id);
      if (must) {
        router.replace("/cambiar-password");
      }
    })();
  }, [pathname, router]);

  return <>{children}</>;
}
