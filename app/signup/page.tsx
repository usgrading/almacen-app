'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CampoFormulario } from '@/components/CampoFormulario';
import { supabase } from '@/lib/supabase';
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

/** Misma jerarquía visual que `/login` (logo + título + subtítulo). */
const tituloSignupCard = {
  margin: 0,
  textAlign: 'center' as const,
  fontSize: 'clamp(1.5rem, 4.2vw, 1.75rem)',
  fontWeight: 700,
  letterSpacing: '-0.03em',
  color: '#0f172a',
  lineHeight: 1.2,
};

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sesionVerificada, setSesionVerificada] = useState(false);
  const [errorContraseña, setErrorContraseña] = useState('');

  useEffect(() => {
    const verificarSesion = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace('/dashboard');
        return;
      }
      setSesionVerificada(true);
    };
    void verificarSesion();
  }, [router]);

  const handleRegister = async () => {
    if (loading) return;

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      alert('Llena todos los campos');
      return;
    }

    if (password !== confirmPassword) {
      alert('Las contraseñas no coinciden');
      return;
    }

    if (!validarPassword(password)) {
      setErrorContraseña(MENSAJE_ERROR_PASSWORD);
      return;
    }
    setErrorContraseña('');

    try {
      setLoading(true);

      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: name.trim(),
          email: email.trim(),
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'No se pudo crear la cuenta.');
      }

      if (result.esPrimerUsuario === false) {
        alert(
          'Tu cuenta queda como usuario estándar. Solo la primera cuenta registrada en esta base de datos es administradora (si ya creaste una desde otro dispositivo o entorno, las siguientes son usuario). Un administrador puede cambiar tu rol en Usuarios.'
        );
      }

      const emailLogin = email.trim().toLowerCase();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: emailLogin,
        password,
      });

      if (signInError) {
        throw new Error(
          'Tu cuenta se creó, pero no se pudo iniciar sesión automáticamente: ' +
            signInError.message +
            '. Inicia sesión manualmente en la pantalla de acceso.'
        );
      }

      router.replace('/dashboard');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Ocurrió un error inesperado');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!sesionVerificada) {
    return (
      <main style={appFondoMainCentrado}>
        <p style={{ margin: 0, color: '#64748B', fontSize: 15 }}>Cargando...</p>
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
          <h1 style={tituloSignupCard}>Crear cuenta</h1>
          <p
            style={{
              ...appSubtituloPagina,
              maxWidth: 280,
            }}
          >
            Registra un nuevo usuario
          </p>
        </div>

        <div style={{ marginTop: 22 }}>
        <CampoFormulario etiqueta="Nombre" htmlFor="signup-nombre" margenInferior={10}>
          <input
            id="signup-nombre"
            className="app-input-field"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={appInput}
          />
        </CampoFormulario>

        <CampoFormulario etiqueta="Correo" htmlFor="signup-email" margenInferior={10}>
          <input
            id="signup-email"
            className="app-input-field"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={appInput}
          />
        </CampoFormulario>

        <CampoFormulario etiqueta="Contraseña" htmlFor="signup-password" margenInferior={10}>
          <div style={{ position: 'relative' }}>
            <input
              id="signup-password"
              className="app-input-field"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorContraseña) setErrorContraseña('');
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

        <CampoFormulario etiqueta="Confirmar contraseña" htmlFor="signup-confirm" margenInferior={errorContraseña ? 6 : 16}>
          <input
            id="signup-confirm"
            className="app-input-field"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errorContraseña) setErrorContraseña('');
            }}
            style={appInput}
          />
        </CampoFormulario>

        {errorContraseña ? (
          <p role="alert" style={appMensajeError}>
            {errorContraseña}
          </p>
        ) : null}

        <button
          type="button"
          className="app-btn-primario"
          onClick={handleRegister}
          disabled={loading}
          style={loading ? appBtnPrimarioDisabled : appBtnPrimario}
        >
          {loading ? 'Creando...' : 'Crear cuenta'}
        </button>

        <button
          type="button"
          className="app-btn-secundario"
          onClick={() => router.push('/login')}
          style={{ ...appBtnSecundario, marginTop: 12 }}
        >
          Ya tengo cuenta
        </button>
        </div>
      </div>
    </main>
  );
}
