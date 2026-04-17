'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CampoFormulario } from '@/components/CampoFormulario';
import {
  MENSAJE_ERROR_PASSWORD,
  validarPassword,
} from '@/lib/validar-password';
import {
  appBtnPrimario,
  appBtnPrimarioDisabled,
  appBtnSecundario,
  appCardNarrow,
  appFondoMainCentrado,
  appInput,
  appMensajeError,
  appSubtituloPagina,
} from '@/lib/app-ui';

const titulo = {
  margin: 0,
  textAlign: 'center' as const,
  fontSize: 'clamp(1.5rem, 4.2vw, 1.75rem)',
  fontWeight: 700,
  letterSpacing: '-0.03em',
  color: '#0f172a',
  lineHeight: 1.2,
};

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [sesionRecuperacion, setSesionRecuperacion] = useState(false);
  const [errorEstilo, setErrorEstilo] = useState('');

  useEffect(() => {
    let cancelado = false;

    const hashEsRecuperacion = () =>
      typeof window !== 'undefined' &&
      window.location.hash.includes('type=recovery');

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelado) return;
      if (event === 'PASSWORD_RECOVERY' && session) {
        setSesionRecuperacion(true);
        setVerificando(false);
      }
    });

    const verificar = async () => {
      await new Promise((r) => setTimeout(r, 200));

      let {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelado) return;

      if (hashEsRecuperacion() && !session?.user) {
        await new Promise((r) => setTimeout(r, 400));
        const s2 = await supabase.auth.getSession();
        session = s2.data.session;
        if (cancelado) return;
      }

      if (session?.user && hashEsRecuperacion()) {
        setSesionRecuperacion(true);
      }

      setVerificando(false);
    };

    void verificar();

    return () => {
      cancelado = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleActualizar = async () => {
    if (loading) return;

    setErrorEstilo('');

    if (!password || !confirmPassword) {
      setErrorEstilo('Escribe y confirma la nueva contraseña.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorEstilo('Las contraseñas no coinciden.');
      return;
    }
    if (!validarPassword(password)) {
      setErrorEstilo(MENSAJE_ERROR_PASSWORD);
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        alert('No se pudo actualizar la contraseña: ' + error.message);
        return;
      }

      await supabase.auth.signOut();
      alert('Contraseña actualizada. Inicia sesión con la nueva contraseña.');
      router.replace('/login');
    } catch (e) {
      console.error(e);
      alert('Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  if (verificando) {
    return (
      <main style={appFondoMainCentrado}>
        <p style={{ margin: 0, color: '#64748B', fontSize: 15, fontWeight: 500 }}>
          Verificando enlace...
        </p>
      </main>
    );
  }

  if (!sesionRecuperacion) {
    return (
      <main style={appFondoMainCentrado}>
        <div style={appCardNarrow}>
          <h1 style={titulo}>Enlace inválido o caducado</h1>
          <p style={{ ...appSubtituloPagina, marginTop: 12 }}>
            Solicita un nuevo correo de recuperación desde la pantalla de acceso.
          </p>
          <button
            type="button"
            className="app-btn-primario"
            onClick={() => router.push('/login')}
            style={{ ...appBtnPrimario, marginTop: 20, width: '100%' }}
          >
            Ir al inicio de sesión
          </button>
        </div>
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
          <h1 style={titulo}>Nueva contraseña</h1>
          <p
            style={{
              ...appSubtituloPagina,
              maxWidth: 300,
              marginTop: 8,
            }}
          >
            Elige una contraseña segura para tu cuenta.
          </p>
        </div>

        <div style={{ marginTop: 22 }}>
          <CampoFormulario
            etiqueta="Nueva contraseña"
            htmlFor="reset-password-1"
            margenInferior={10}
          >
            <div style={{ position: 'relative' }}>
              <input
                id="reset-password-1"
                className="app-input-field"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorEstilo) setErrorEstilo('');
                }}
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

          <CampoFormulario
            etiqueta="Confirmar contraseña"
            htmlFor="reset-password-2"
            margenInferior={errorEstilo ? 8 : 16}
          >
            <input
              id="reset-password-2"
              className="app-input-field"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errorEstilo) setErrorEstilo('');
              }}
              style={appInput}
            />
          </CampoFormulario>

          {errorEstilo ? (
            <p role="alert" style={appMensajeError}>
              {errorEstilo}
            </p>
          ) : null}

          <button
            type="button"
            className="app-btn-primario"
            onClick={() => void handleActualizar()}
            disabled={loading}
            style={
              loading ? appBtnPrimarioDisabled : { ...appBtnPrimario, width: '100%' }
            }
          >
            {loading ? 'Guardando...' : 'Guardar contraseña'}
          </button>

          <button
            type="button"
            className="app-btn-secundario"
            onClick={() => router.push('/login')}
            style={{ ...appBtnSecundario, marginTop: 14, width: '100%' }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </main>
  );
}
