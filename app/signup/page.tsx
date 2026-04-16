'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CampoFormulario } from '@/components/CampoFormulario';
import { supabase } from '@/lib/supabase';

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

    if (password.length < 6) {
      alert('La contraseña debe tener mínimo 6 caracteres');
      return;
    }

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
          Crear cuenta
        </h1>

        <p style={{ marginBottom: 20, color: '#555', textAlign: 'center' }}>
          Registra un nuevo usuario
        </p>

        <CampoFormulario etiqueta="Nombre" htmlFor="signup-nombre" margenInferior={10}>
          <input
            id="signup-nombre"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
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

        <CampoFormulario etiqueta="Correo" htmlFor="signup-email" margenInferior={10}>
          <input
            id="signup-email"
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

        <CampoFormulario etiqueta="Contraseña" htmlFor="signup-password" margenInferior={10}>
          <div style={{ position: 'relative' }}>
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 72px 14px 14px',
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

        <CampoFormulario etiqueta="Confirmar contraseña" htmlFor="signup-confirm" margenInferior={16}>
          <input
            id="signup-confirm"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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

        <button
          onClick={handleRegister}
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
          {loading ? 'Creando...' : 'Crear cuenta'}
        </button>

        <button
          onClick={() => router.push('/login')}
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
          Ya tengo cuenta
        </button>
      </div>
    </main>
  );
}

