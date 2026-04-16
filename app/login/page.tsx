'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { CampoFormulario } from '@/components/CampoFormulario';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sesionVerificada, setSesionVerificada] = useState(false);

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
        <p style={{ margin: 0, color: '#64748B', fontSize: 15 }}>Cargando...</p>
      </main>
    );
  }

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

        <h1 style={{ marginBottom: 6, textAlign: 'center' }}>
          Almacén
        </h1>

        <p style={{ marginBottom: 20, color: '#555', textAlign: 'center' }}>
          Inicia sesión para continuar
        </p>

        <CampoFormulario etiqueta="Correo" htmlFor="login-email" margenInferior={10}>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
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

        <CampoFormulario etiqueta="Contraseña" htmlFor="login-password" margenInferior={16}>
          <div style={{ position: 'relative' }}>
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 56px 14px 14px',
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
                fontSize: 13,
                fontWeight: 500,
                color: '#0d47a1',
                userSelect: 'none',
              }}
            >
              {showPassword ? 'Ocultar' : 'Ver'}
            </span>
          </div>
        </CampoFormulario>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: 14,
            borderRadius: 10,
            border: 'none',
            background: loading ? '#7aa7e6' : '#0d47a1',
            color: 'white',
            fontWeight: 'bold',
            fontSize: 16,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Entrando...' : 'Entrar'}
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
            cursor: 'pointer',
          }}
        >
          Crear cuenta
        </button>
      </div>
    </main>
  );
}
