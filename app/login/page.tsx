'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

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

        <input
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: '100%',
            padding: 14,
            marginBottom: 10,
            borderRadius: 10,
            border: '1px solid #ccc',
          }}
        />

        <div style={{ position: 'relative', marginBottom: 16 }}>
          <input
            placeholder="Contraseña"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 56px 14px 14px',
              borderRadius: 10,
              border: '1px solid #ccc',
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
