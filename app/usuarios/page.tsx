"use client";

import { CSSProperties, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageLogo } from "@/components/PageLogo";
import { supabase } from "@/lib/supabase";
import { requireMiOrganizationId } from "@/lib/organization";
import { getUserRole, isAdmin, parseAppRole } from "@/lib/roles";
import { CampoFormulario } from "@/components/CampoFormulario";
import {
  appBtnPrimario,
  appBtnPrimarioDisabled,
  appCardInner,
  appFondoMain,
  appInput,
  appNavLink,
  appTituloPagina,
} from "@/lib/app-ui";
import {
  normalizeInternalLoginUsername,
  validateInternalLoginUsername,
} from "@/lib/internal-username";

type Rol = "admin" | "manager" | "viewer";

type Usuario = {
  id: string;
  nombre: string;
  email: string;
  username: string;
  rol: Rol;
  activo: boolean;
  must_change_password: boolean;
};

function getSupabaseErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const m = (error as { message: unknown }).message;
    if (typeof m === "string" && m.length > 0) return m;
  }
  return "Error desconocido";
}

function mismoUuid(a: unknown, b: unknown): boolean {
  const sa = typeof a === "string" ? a.toLowerCase() : "";
  const sb = typeof b === "string" ? b.toLowerCase() : "";
  return sa.length > 0 && sa === sb;
}

function mapProfileRow(row: Record<string, unknown>): Usuario | null {
  if (row.id === undefined || row.id === null) return null;

  const parsed = parseAppRole(row.rol);
  if (
    process.env.NODE_ENV === "development" &&
    parsed === null &&
    row.rol != null &&
    String(row.rol).trim() !== ""
  ) {
    console.warn("[usuarios] profiles.rol inválido para id", row.id, row.rol);
  }
  const rol: Rol = parsed ?? "viewer";

  const activo =
    row.activo === undefined || row.activo === null
      ? true
      : row.activo === true || row.activo === 1 || row.activo === "true";

  const flag =
    row.must_change_password !== undefined && row.must_change_password !== null
      ? row.must_change_password
      : row.debe_cambiar_password;
  const debe =
    flag === undefined || flag === null
      ? false
      : flag === true || flag === 1 || flag === "true";

  return {
    id: String(row.id),
    nombre: String(row.nombre ?? row.name ?? ""),
    email: String(row.email ?? ""),
    username: String(row.username ?? row.user_name ?? ""),
    rol,
    activo,
    must_change_password: debe,
  };
}

export default function UsuariosPage() {
  const router = useRouter();

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargaError, setCargaError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [esCel, setEsCel] = useState(false);
  const [accesoAdmin, setAccesoAdmin] = useState(false);
  const [comprobandoAcceso, setComprobandoAcceso] = useState(true);

  const [nombre, setNombre] = useState("");
  const [username, setUsername] = useState("");
  const [rol, setRol] = useState<Rol>("viewer");
  const [modalCreado, setModalCreado] = useState(false);
  const [creadoUsername, setCreadoUsername] = useState("");
  const [creadoPassword, setCreadoPassword] = useState("");

  const canSubmit = useMemo(() => {
    const norm = normalizeInternalLoginUsername(username);
    const inv = validateInternalLoginUsername(norm);
    return nombre.trim().length > 0 && inv === null;
  }, [nombre, username]);

  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      setCargaError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        router.push("/login");
        return;
      }

      let orgId: string;
      try {
        orgId = await requireMiOrganizationId(supabase);
      } catch {
        setCargaError(
          "Tu perfil no tiene organización asignada. Contacta al administrador."
        );
        setUsuarios([]);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const rows = (data as Record<string, unknown>[]) ?? [];
      const filtradas = rows.filter((row) => mismoUuid(row.organization_id, orgId));
      const mapped = filtradas
        .map((row) => mapProfileRow(row))
        .filter((u): u is Usuario => u !== null);

      setUsuarios(mapped);
    } catch (error) {
      const detail = getSupabaseErrorMessage(error);
      const hint =
        detail.toLowerCase().includes("organization_id") ||
        detail.toLowerCase().includes("schema cache")
          ? " Ejecuta en Supabase la migración que añade la columna organization_id a profiles."
          : "";

      setCargaError(detail + hint);
      setUsuarios([]);
      console.error("profiles select:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const verificarAdmin = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user?.id) {
          router.push("/login");
          return;
        }
        await requireMiOrganizationId(supabase);
        const rol = await getUserRole(supabase);
        if (!isAdmin(rol)) {
          router.replace("/dashboard");
          return;
        }
        setAccesoAdmin(true);
      } catch {
        router.replace("/dashboard");
      } finally {
        setComprobandoAcceso(false);
      }
    };
    void verificarAdmin();
  }, [router]);

  useEffect(() => {
    if (!accesoAdmin) return;
    void cargarUsuarios();
  }, [accesoAdmin]);

  useEffect(() => {
    const revisarPantalla = () => {
      setEsCel(window.innerWidth < 768);
    };

    revisarPantalla();
    window.addEventListener("resize", revisarPantalla);

    return () => window.removeEventListener("resize", revisarPantalla);
  }, []);

  const resetForm = () => {
    setNombre("");
    setUsername("");
    setRol("viewer");
  };

  const copiarPortapapeles = async (texto: string, etiqueta: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      alert(`${etiqueta} copiado al portapapeles.`);
    } catch {
      alert(`No se pudo copiar. Copia manualmente: ${texto}`);
    }
  };

  const crearUsuario = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit || submitting) return;

    try {
      setSubmitting(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      if (!accessToken) {
        throw new Error("Tu sesión no es válida. Cierra sesión y vuelve a entrar.");
      }

      const response = await fetch("/api/usuarios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          nombre: nombre.trim(),
          username: username.trim(),
          rol,
        }),
      });

      const result = (await response.json()) as {
        error?: string;
        username?: string;
        passwordTemporal?: string;
        rol?: string;
      };

      if (!response.ok) {
        throw new Error(result?.error || "No se pudo crear el usuario.");
      }

      const uOk = typeof result.username === "string" ? result.username : "";
      const pOk =
        typeof result.passwordTemporal === "string"
          ? result.passwordTemporal
          : "";

      resetForm();
      await cargarUsuarios();

      setCreadoUsername(uOk);
      setCreadoPassword(pOk);
      setModalCreado(true);
    } catch (error) {
      alert(getSupabaseErrorMessage(error) || "Error al crear el usuario");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActivo = async (usuario: Usuario) => {
    if (!accesoAdmin) return;
    try {
      const nuevoEstado = !usuario.activo;

      const { error } = await supabase
        .from("profiles")
        .update({ activo: nuevoEstado })
        .eq("id", usuario.id);

      if (error) {
        throw error;
      }

      setUsuarios((prev) =>
        prev.map((u) => (u.id === usuario.id ? { ...u, activo: nuevoEstado } : u))
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al actualizar el estado del usuario";
      alert(message);
    }
  };

  if (comprobandoAcceso) {
    return (
      <main style={styles.container}>
        <p style={{ textAlign: "center", color: "#64748B" }}>Cargando...</p>
      </main>
    );
  }

  if (!accesoAdmin) {
    return null;
  }

  return (
    <main style={styles.container}>
      <div style={{ maxWidth: esCel ? 520 : 1100, margin: "0 auto" }}>
        <button
          type="button"
          className="app-nav-link"
          onClick={() => router.push("/dashboard")}
          style={styles.backButton}
        >
          ← Inicio
        </button>

        <PageLogo />

        <h1 style={styles.title}>Gestión de Usuarios</h1>

        {cargaError && (
          <div style={styles.errorBanner}>
            <p style={{ margin: 0, fontWeight: 600 }}>No se pudo cargar la lista</p>
            <p style={{ margin: "8px 0 0 0", fontSize: 14 }}>{cargaError}</p>

            <p style={{ margin: "8px 0 0 0", fontSize: 13, color: "#64748B" }}>
              Si ves permisos raros, revisa el RLS de <code>profiles</code> y que cada perfil tenga
              el <code>organization_id</code> correcto.
            </p>

            <button type="button" onClick={() => void cargarUsuarios()} style={styles.retryButton}>
              Reintentar
            </button>
          </div>
        )}

        <form onSubmit={crearUsuario} style={styles.form}>
          <h2 style={styles.sectionTitle}>Crear nuevo usuario</h2>

          <div style={styles.formGrid}>
            <CampoFormulario etiqueta="Nombre" htmlFor="usuario-nombre">
              <input
                id="usuario-nombre"
                className="app-input-field"
                style={{ ...styles.input, marginBottom: 0 }}
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </CampoFormulario>

            <CampoFormulario etiqueta="Usuario (login)" htmlFor="usuario-username">
              <input
                id="usuario-username"
                className="app-input-field"
                style={{ ...styles.input, marginBottom: 0 }}
                type="text"
                autoComplete="off"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </CampoFormulario>

            <CampoFormulario etiqueta="Rol" htmlFor="usuario-rol">
              <select
                id="usuario-rol"
                className="app-input-field"
                style={{
                  ...styles.input,
                  marginBottom: 0,
                  backgroundColor: "#f8fafc",
                  fontWeight: 400,
                }}
                value={rol}
                onChange={(e) => setRol(e.target.value as Rol)}
              >
                <option value="admin">admin</option>
                <option value="manager">manager</option>
                <option value="viewer">viewer</option>
              </select>
            </CampoFormulario>
          </div>

          <button
            type="submit"
            className="app-btn-primario"
            disabled={!canSubmit || submitting}
            style={
              !canSubmit || submitting
                ? { ...appBtnPrimarioDisabled, marginTop: 4 }
                : { ...appBtnPrimario, marginTop: 4 }
            }
          >
            {submitting ? "Creando..." : "Crear usuario"}
          </button>
        </form>

        {modalCreado ? (
          <div style={styles.modalOverlay} role="dialog" aria-modal="true">
            <div style={styles.modalCard}>
              <h3 style={styles.modalTitle}>Usuario creado</h3>
              <p style={styles.modalText}>
                Entrega estas credenciales al colaborador. En el primer acceso deberá
                cambiar la contraseña.
              </p>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>Usuario</span>
                <code style={styles.modalCode}>{creadoUsername}</code>
                <button
                  type="button"
                  onClick={() => void copiarPortapapeles(creadoUsername, "Usuario")}
                  style={styles.modalCopyBtn}
                >
                  Copiar usuario
                </button>
              </div>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>Contraseña temporal</span>
                <code style={styles.modalCode}>{creadoPassword}</code>
                <button
                  type="button"
                  onClick={() =>
                    void copiarPortapapeles(creadoPassword, "Contraseña temporal")
                  }
                  style={styles.modalCopyBtn}
                >
                  Copiar contraseña
                </button>
              </div>
              <button
                type="button"
                className="app-btn-primario"
                onClick={() => setModalCreado(false)}
                style={{ ...appBtnPrimario, width: "100%", marginTop: 14 }}
              >
                Entendido
              </button>
            </div>
          </div>
        ) : null}

        <section style={styles.tableSection}>
          <h2 style={styles.sectionTitle}>Listado de usuarios</h2>
          <p style={styles.orgHint}>
            Solo ves a quienes tú diste de alta aquí; no aparecen cuentas ni usuarios de otras
            empresas.
          </p>

          {loading ? (
            <p>Cargando usuarios...</p>
          ) : cargaError ? (
            <div style={styles.emptyCell}>Corrige el error arriba y pulsa Reintentar.</div>
          ) : usuarios.length === 0 ? (
            <div style={styles.emptyCell}>No hay usuarios en tu organización.</div>
          ) : esCel ? (
            <div style={styles.mobileList}>
              {usuarios.map((usuario) => (
                <div key={usuario.id} style={styles.mobileCard}>
                  <div style={styles.mobileHeader}>
                    <strong style={styles.mobileTitle}>{usuario.nombre}</strong>
                    <span style={styles.mobileRol}>{usuario.rol}</span>
                  </div>

                  <div style={styles.mobileRow}>
                    <span style={styles.mobileLabel}>Usuario:</span>
                    <span style={styles.mobileValue}>{usuario.username}</span>
                  </div>

                  <div style={styles.mobileRow}>
                    <span style={styles.mobileLabel}>Activo:</span>
                    <span style={styles.mobileValue}>{usuario.activo ? "true" : "false"}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleActivo(usuario)}
                    style={{
                      ...styles.button,
                      marginTop: "10px",
                      backgroundColor: usuario.activo ? "#b91c1c" : "#065f46",
                    }}
                  >
                    {usuario.activo ? "Desactivar" : "Activar"}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Nombre</th>
                    <th style={styles.th}>Usuario</th>
                    <th style={styles.th}>Rol</th>
                    <th style={styles.th}>Activo</th>
                    <th style={styles.th}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((usuario) => (
                    <tr key={usuario.id}>
                      <td style={styles.td}>{usuario.nombre}</td>
                      <td style={styles.td}>{usuario.username}</td>
                      <td style={styles.td}>{usuario.rol}</td>
                      <td style={styles.td}>{usuario.activo ? "true" : "false"}</td>
                      <td style={styles.td}>
                        <button
                          type="button"
                          onClick={() => toggleActivo(usuario)}
                          style={{
                            ...styles.button,
                            backgroundColor: usuario.activo ? "#b91c1c" : "#065f46",
                          }}
                        >
                          {usuario.activo ? "Desactivar" : "Activar"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    ...appFondoMain,
    color: "#0f172a",
  },
  title: {
    ...appTituloPagina,
    marginBottom: "16px",
  },
  errorBanner: {
    marginBottom: "16px",
    padding: "14px",
    borderRadius: "10px",
    border: "1px solid #fecaca",
    backgroundColor: "#fef2f2",
    color: "#991b1b",
  },
  retryButton: {
    marginTop: "12px",
    padding: "10px 16px",
    borderRadius: "12px",
    border: "1px solid #991b1b",
    backgroundColor: "#ffffff",
    color: "#991b1b",
    fontWeight: 600,
    cursor: "pointer",
  },
  backButton: {
    ...appNavLink,
    marginBottom: "10px",
  },
  sectionTitle: {
    marginBottom: "12px",
    fontSize: "18px",
    fontWeight: 700,
    color: "#0f172a",
  },
  form: {
    ...appCardInner,
    padding: "18px",
    marginBottom: "24px",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "12px",
    marginBottom: "12px",
  },
  input: {
    ...appInput,
    fontSize: "15px",
  },
  button: {
    ...appBtnPrimario,
    width: "auto",
    fontSize: "14px",
    padding: "10px 14px",
  },
  tableSection: {
    ...appCardInner,
    padding: "18px",
  },
  orgHint: {
    margin: "0 0 14px 0",
    fontSize: "13px",
    color: "#64748b",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: "10px",
    borderBottom: "1px solid #e5e7eb",
    fontSize: "14px",
    backgroundColor: "#f3f4f6",
  },
  td: {
    padding: "10px",
    borderBottom: "1px solid #f3f4f6",
    fontSize: "14px",
  },
  emptyCell: {
    padding: "14px",
    textAlign: "center",
    color: "#6b7280",
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
  },
  mobileList: {
    display: "grid",
    gap: "10px",
  },
  mobileCard: {
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "12px",
  },
  mobileHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    marginBottom: "8px",
  },
  mobileTitle: {
    color: "#111827",
    fontSize: "16px",
  },
  mobileRol: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#1e40af",
    textTransform: "uppercase",
  },
  mobileRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    marginTop: "4px",
  },
  mobileLabel: {
    color: "#64748b",
    fontSize: "13px",
  },
  mobileValue: {
    color: "#334155",
    fontSize: "13px",
    fontWeight: 600,
    textAlign: "right",
    wordBreak: "break-word",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
    padding: 16,
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: "22px 20px",
    maxWidth: 440,
    width: "100%",
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.18)",
    border: "1px solid #e2e8f0",
  },
  modalTitle: {
    margin: "0 0 10px 0",
    fontSize: "19px",
    fontWeight: 700,
    color: "#0f172a",
  },
  modalText: {
    margin: "0 0 16px 0",
    fontSize: "14px",
    color: "#475569",
    lineHeight: 1.45,
  },
  modalRow: {
    marginBottom: 14,
    paddingBottom: 12,
    borderBottom: "1px solid #f1f5f9",
  },
  modalLabel: {
    display: "block",
    fontSize: "12px",
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: 6,
  },
  modalCode: {
    display: "block",
    fontSize: "14px",
    wordBreak: "break-all",
    backgroundColor: "#f8fafc",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    color: "#0f172a",
    marginBottom: 8,
    fontFamily: "ui-monospace, monospace",
  },
  modalCopyBtn: {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#334155",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer",
  },
};