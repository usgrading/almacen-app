'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CampoFormulario } from '@/components/CampoFormulario';

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
    <main
      style={{
        minHeight: '100vh',
        background: '#f5f7fb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'white',
          padding: 24,
          borderRadius: 16,
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center' }}>
  <img
    src="/logo.png"
    alt="Logo"
    style={{
      width: 80,
      height: 80,
      objectFit: 'contain',
      marginBottom: 12,
    }}
  />
</div>
        <h1 style={{ marginBottom: 6, textAlign: 'center' }}>Almacén</h1>
<p style={{ marginBottom: 20, color: '#555', textAlign: 'center' }}>
  Inicia sesión para continuar
</p>


        <CampoFormulario etiqueta="Correo" htmlFor="home-email" margenInferior={10}>
          <input
            id="home-email"
            type="email"
            autoComplete="email"
            placeholder="nombre@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%',
              padding: 14,
              marginBottom: 0,
              borderRadius: 10,
              border: '1px solid #ccc',
              boxSizing: 'border-box',
            }}
          />
        </CampoFormulario>

        <CampoFormulario etiqueta="Contraseña" htmlFor="home-password" margenInferior={16}>
          <div style={{ position: 'relative' }}>
            <input
              id="home-password"
              placeholder="Tu contraseña"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 48px 14px 14px',
                borderRadius: 10,
                border: '1px solid #ccc',
                boxSizing: 'border-box',
              }}
            />

            <span
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                cursor: 'pointer',
                fontSize: 12,
                color: '#0d47a1',
              }}
            >
              {showPassword ? 'Ocultar' : 'Ver'}
            </span>
          </div>
        </CampoFormulario>

        <button
          onClick={handleLogin}
          style={{
            width: '100%',
            padding: 14,
            borderRadius: 10,
            border: 'none',
            background: '#0d47a1',
            color: 'white',
            fontWeight: 'bold',
            fontSize: 16,
          }}
        >
          Entrar
        </button>

        <button
          onClick={() => router.push('/signup')}
          style={{
            width: '100%',
            marginTop: 10,
            padding: 14,
            borderRadius: 10,
            border: '1px solid #ccc',
            background: 'white',
            fontWeight: 'bold',
          }}
        >
          Crear cuenta
        </button>
      </div>
    </main>
  );
}
