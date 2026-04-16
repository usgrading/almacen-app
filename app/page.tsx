'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CampoFormulario } from '@/components/CampoFormulario';
import {
  appBtnPrimario,
  appBtnSecundario,
  appCardNarrow,
  appFondoMainCentrado,
  appInput,
  appSubtituloPagina,
  appTituloPagina,
} from '@/lib/app-ui';

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    if (!email || !password) {
      alert('Llena todos los campos');
      return;
    }

    router.push('/dashboard');
  };

  return (
    <main style={appFondoMainCentrado}>
      <div style={appCardNarrow}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <img
            src="/logo.png"
            alt="Logo"
            style={{
              width: 96,
              height: 96,
              objectFit: 'contain',
              marginBottom: 8,
            }}
          />
        </div>
        <h1 style={{ ...appTituloPagina, marginBottom: 6 }}>Almacén</h1>
        <p
          style={{
            ...appSubtituloPagina,
            marginBottom: 22,
          }}
        >
          Inicia sesión para continuar
        </p>

        <CampoFormulario etiqueta="Correo" htmlFor="home-email" margenInferior={10}>
          <input
            id="home-email"
            className="app-input-field"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={appInput}
          />
        </CampoFormulario>

        <CampoFormulario etiqueta="Contraseña" htmlFor="home-password" margenInferior={16}>
          <div style={{ position: 'relative' }}>
            <input
              id="home-password"
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
          onClick={handleLogin}
          style={appBtnPrimario}
        >
          Entrar
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
    </main>
  );
}
