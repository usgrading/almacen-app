'use client';

import { useState, useEffect, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { CampoFormulario } from '@/components/CampoFormulario';
import {
  MENSAJE_ERROR_PASSWORD,
  validarPassword,
} from '@/lib/validar-password';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const fondoPagina: CSSProperties = {
  minHeight: '100dvh',
  background:
    'linear-gradient(165deg, #eef2f9 0%, #f4f6fb 45%, #e8edf6 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 'clamp(12px, 4vw, 28px)',
  boxSizing: 'border-box',
};

const card: CSSProperties = {
  width: '100%',
  maxWidth: 420,
  background: 'rgba(255, 255, 255, 0.92)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  padding: 'clamp(22px, 5vw, 34px)',
  borderRadius: 22,
  border: '1px solid rgba(226, 232, 240, 0.85)',
  boxShadow:
    '0 1px 2px rgba(15, 23, 42, 0.04), 0 24px 48px -12px rgba(15, 23, 42, 0.12)',
  boxSizing: 'border-box',
};

const inputBase: CSSProperties = {
  width: '100%',
  padding: '13px 15px',
  marginBottom: 0,
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
  color: '#0f172a',
  fontSize: 15,
  boxSizing: 'border-box',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease',
};

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  const handleLogin = async () => {
    if (loading) return;

    if (!email || !password) {
      alert('Llena correo y contraseña');
      return;
    }

    if (!validarPassword(password)) {
      setErrorContraseña(MENSAJE_ERROR_PASSWORD);
      return;
    }
    setErrorContraseña('');

    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        alert('Error: ' + error.message);
        return;
      }

      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      alert('Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  if (!sesionVerificada) {
    return (
      <main style={fondoPagina}>
        <p style={{ margin: 0, color: '#64748B', fontSize: 15, fontWeight: 500 }}>
          Cargando...
        </p>
      </main>
    );
  }

  return (
    <>
      <style>{`
        .login-page input.login-input-field:focus {
          outline: none;
          border-color: #2563eb;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
        }
        .login-page input.login-input-field::placeholder {
          color: #94a3b8;
        }
        .login-page .btn-entrar:not(:disabled):hover {
          filter: brightness(1.05);
          box-shadow: 0 6px 20px rgba(30, 64, 175, 0.38);
        }
        .login-page .btn-entrar:not(:disabled):active {
          transform: translateY(1px);
        }
        .login-page .btn-secundario:hover {
          background: #f1f5f9 !important;
          border-color: #cbd5e1 !important;
          color: #475569 !important;
        }
        .login-toggle-ojo:hover {
          color: #475569 !important;
          background: rgba(148, 163, 184, 0.12);
        }
      `}</style>

      <main className="login-page" style={fondoPagina}>
        <div style={card}>
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
            <h1
              style={{
                margin: 0,
                textAlign: 'center',
                fontSize: 'clamp(1.5rem, 4.2vw, 1.75rem)',
                fontWeight: 700,
                letterSpacing: '-0.03em',
                color: '#0f172a',
                lineHeight: 1.2,
              }}
            >
              Almacén
            </h1>
            <p
              style={{
                margin: '10px 0 0 0',
                textAlign: 'center',
                fontSize: 15,
                fontWeight: 400,
                letterSpacing: '0.02em',
                color: '#64748b',
                lineHeight: 1.45,
                maxWidth: 280,
              }}
            >
              Inicia sesión para continuar
            </p>
          </div>

          <div style={{ marginTop: 26 }}>
            <CampoFormulario
              etiqueta="Correo"
              htmlFor="login-email"
              margenInferior={10}
            >
              <input
                id="login-email"
                className="login-input-field"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputBase}
              />
            </CampoFormulario>

            <CampoFormulario
              etiqueta="Contraseña"
              htmlFor="login-password"
              margenInferior={errorContraseña ? 6 : 16}
            >
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  className="login-input-field"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorContraseña) setErrorContraseña('');
                  }}
                  style={{
                    ...inputBase,
                    paddingRight: 48,
                  }}
                />

                <button
                  type="button"
                  className="login-toggle-ojo"
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

            {errorContraseña ? (
              <p
                role="alert"
                style={{
                  margin: '0 0 14px 0',
                  color: '#B91C1C',
                  fontSize: 13,
                  lineHeight: 1.35,
                }}
              >
                {errorContraseña}
              </p>
            ) : null}

            <button
              type="button"
              className="btn-entrar"
              onClick={handleLogin}
              disabled={loading}
              style={{
                width: '100%',
                padding: '15px 16px',
                borderRadius: 12,
                border: 'none',
                background: loading ? '#93b4e8' : '#1e40af',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: 16,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading
                  ? 'none'
                  : '0 4px 16px rgba(30, 64, 175, 0.35)',
                transition:
                  'background 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease',
              }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

            <button
              type="button"
              className="btn-secundario"
              onClick={() => router.push('/signup')}
              style={{
                width: '100%',
                marginTop: 12,
                padding: '12px 16px',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                background: 'transparent',
                color: '#64748b',
                fontWeight: 500,
                fontSize: 14,
                cursor: 'pointer',
                transition: 'background 0.2s ease, border-color 0.2s ease',
              }}
            >
              Crear cuenta
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
