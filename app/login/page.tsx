'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { fetchMustChangePassword } from '@/lib/must-change-password';
import { CampoFormulario } from '@/components/CampoFormulario';
import {
  appBtnPrimario,
  appBtnPrimarioDisabled,
  appBtnSecundario,
  appCardNarrow,
  appFondoMainCentrado,
  appInput,
  appSubtituloPagina,
} from '@/lib/app-ui';

/** Base pública de la app (opcional). En Vercel: ej. https://almacen-app-three.vercel.app Si no va, se usa window.location.origin (correcto al abrir ya el sitio desplegado). */
function baseUrlParaAuth(): string {
  const desdeEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  if (desdeEnv) return desdeEnv;
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

const tituloLogin = {
  margin: 0,
  textAlign: 'center' as const,
  fontSize: 'clamp(1.5rem, 4.2vw, 1.75rem)',
  fontWeight: 700,
  letterSpacing: '-0.03em',
  color: '#0f172a',
  lineHeight: 1.2,
};

export default function LoginPage() {
  const router = useRouter();

  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sesionVerificada, setSesionVerificada] = useState(false);
  const [enviandoReset, setEnviandoReset] = useState(false);

  useEffect(() => {
    const verificarSesion = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        const must = await fetchMustChangePassword(
          supabase,
          data.session.user.id
        );
        if (must) {
          router.replace('/cambiar-password');
          return;
        }
        router.replace('/dashboard');
        return;
      }
      setSesionVerificada(true);
    };
    void verificarSesion();
  }, [router]);

  const solicitarResetPassword = async () => {
    const raw = identificador.trim();
    if (!raw.includes('@')) {
      alert(
        'La recuperación por correo solo aplica si inicias sesión con tu correo electrónico. Si usas usuario interno, pide ayuda al administrador.'
      );
      return;
    }

    const cleanEmail = raw.toLowerCase();

    setEnviandoReset(true);
    try {
      const origin = baseUrlParaAuth();
      const redirectTo = origin ? `${origin}/reset-password` : undefined;

      const { data, error } = await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        {
          redirectTo,
        }
      );

      if (error) {
        alert('No se pudo enviar el correo: ' + error.message);
        return;
      }

      console.log('[login] resetPasswordForEmail — data:', data);

      alert(
        'Si ese correo está registrado, recibirás un enlace para restablecer la contraseña.'
      );
    } catch (err) {
      console.error('[login] resetPasswordForEmail — excepción:', err);
      alert('Ocurrió un error al solicitar la recuperación.');
    } finally {
      setEnviandoReset(false);
    }
  };

  const handleLogin = async () => {
    if (loading) return;

    const rawId = identificador.trim();
    const cleanPassword = password;

    if (!rawId || !cleanPassword) {
      alert('Llena usuario o correo y contraseña');
      return;
    }

    try {
      setLoading(true);

      let emailParaAuth = rawId;
      if (!rawId.includes('@')) {
        const res = await fetch('/api/auth/resolve-login-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: rawId }),
        });
        const json = (await res.json()) as { email?: string; error?: string };
        if (!res.ok || !json.email) {
          alert(json.error || 'Usuario o contraseña incorrectos.');
          return;
        }
        emailParaAuth = json.email;
      } else {
        emailParaAuth = rawId.toLowerCase();
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailParaAuth,
        password: cleanPassword,
      });

      if (error) {
        alert('Error: ' + error.message);
        return;
      }

      if (!data.session?.user) {
        alert('No se obtuvo sesión. Intenta de nuevo.');
        return;
      }

      const must = await fetchMustChangePassword(supabase, data.session.user.id);
      if (must) {
        router.replace('/cambiar-password');
        return;
      }

      router.push('/dashboard');
    } catch (err) {
      console.error('[login] signInWithPassword — excepción:', err);
      alert('Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  if (!sesionVerificada) {
    return (
      <main style={appFondoMainCentrado}>
        <p style={{ margin: 0, color: '#64748B', fontSize: 15, fontWeight: 500 }}>
          Cargando...
        </p>
      </main>
    );
  }

  return (
    <main style={appFondoMainCentrado}>
      <div style={appCardNarrow}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: 4,
          }}
        >
          <img
            src="/logo.png"
            alt="Logo"
            style={{
              width: 96,
              height: 96,
              objectFit: 'contain',
              marginBottom: 6,
            }}
          />
          <h1 style={tituloLogin}>Almacén</h1>
          <p
            style={{
              ...appSubtituloPagina,
              maxWidth: 280,
            }}
          >
            Inicia sesión para continuar
          </p>
        </div>

        <div style={{ marginTop: 26 }}>
          <CampoFormulario
            etiqueta="Correo o usuario"
            htmlFor="login-identificador"
            margenInferior={10}
          >
            <input
              id="login-identificador"
              className="app-input-field"
              type="text"
              autoComplete="username"
              value={identificador}
              onChange={(e) => setIdentificador(e.target.value)}
              style={appInput}
            />
          </CampoFormulario>

          <CampoFormulario
            etiqueta="Contraseña"
            htmlFor="login-password"
            margenInferior={16}
          >
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                className="app-input-field"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  ...appInput,
                  paddingRight: 48,
                }}
              />

              <button
                type="button"
                className="app-toggle-ojo"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={
                  showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                }
                style={{
                  position: 'absolute',
                  right: 6,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  cursor: 'pointer',
                  padding: 8,
                  border: 'none',
                  borderRadius: 8,
                  background: 'transparent',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.2s ease, background 0.2s ease',
                }}
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={20}
                    height={20}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.75}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={20}
                    height={20}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.75}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </CampoFormulario>

          <button
            type="button"
            className="app-btn-primario"
            onClick={() => void handleLogin()}
            disabled={loading}
            style={loading ? appBtnPrimarioDisabled : appBtnPrimario}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <button
            type="button"
            className="app-btn-secundario"
            onClick={() => void solicitarResetPassword()}
            disabled={loading || enviandoReset}
            style={{
              ...appBtnSecundario,
              marginTop: 10,
              fontSize: 14,
              opacity: loading || enviandoReset ? 0.6 : 1,
            }}
          >
            {enviandoReset ? 'Enviando...' : '¿Olvidaste tu contraseña?'}
          </button>

          <button
            type="button"
            className="app-btn-secundario"
            onClick={() => router.push('/signup')}
            style={{ ...appBtnSecundario, marginTop: 12 }}
          >
            Crear cuenta
          </button>
        </div>
      </div>
    </main>
  );
}
