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
            <input
              id="reset-password-1"
              className="app-input-field"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorEstilo) setErrorEstilo('');
              }}
              style={appInput}
            />
          </CampoFormulario>

          <CampoFormulario
            etiqueta="Confirmar contraseña"
            htmlFor="reset-password-2"
            margenInferior={errorEstilo ? 8 : 16}
          >
            <input
              id="reset-password-2"
              className="app-input-field"
              type="password"
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
