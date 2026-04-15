'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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

      alert(
        result?.esPrimerUsuario
          ? 'Cuenta creada. Este usuario quedó como admin.'
          : 'Cuenta creada correctamente.'
      );

      router.push('/login');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Ocurrió un error inesperado');
      console.error(error);
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
          Crear cuenta
        </h1>

        <p style={{ marginBottom: 20, color: '#555', textAlign: 'center' }}>
          Registra un nuevo usuario
        </p>

        <input
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            width: '100%',
            padding: 14,
            marginBottom: 10,
            borderRadius: 10,
            border: '1px solid #ccc',
          }}
        />

        <input
          placeholder="Correo"
          type="email"
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

        <div style={{ position: 'relative', marginBottom: 10 }}>
          <input
            placeholder="Contraseña"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 72px 14px 14px',
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

        <input
          placeholder="Confirmar contraseña"
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          style={{
            width: '100%',
            padding: 14,
            marginBottom: 16,
            borderRadius: 10,
            border: '1px solid #ccc',
          }}
        />

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

