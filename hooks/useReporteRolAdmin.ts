"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getUserRole, isAdmin, type AppRole } from "@/lib/roles";

/** Rol del perfil para reportes: mostrar acciones solo a admin. */
export function useReporteRolAdmin() {
  const [rol, setRol] = useState<AppRole | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    void getUserRole(supabase).then((r) => {
      setRol(r);
      setListo(true);
    });
  }, []);

  const esAdmin = listo && isAdmin(rol);

  return { esAdmin, rol, listo };
}
