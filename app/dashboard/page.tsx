'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.push('/login');
        return;
      }

      setUser(data.user);

      const userId = data.user.id;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      setProfile(profileData);
      setLoading(false);
    };

    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <main
        style={{
          minHeight: '100vh',
          background: '#EEF3F8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <p style={{ color: '#1F2937', fontSize: 16 }}>Cargando...</p>
      </main>
    );
  }

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: 18,
    marginBottom: 12,
    borderRadius: 14,
    border: '1px solid #D7E0EA',
    background: '#FFFFFF',
    color: '#1F2937',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)',
    transition: 'all 0.2s ease',
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#EEF3F8',
        padding: 20,
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 20,
            padding: 24,
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
            border: '1px solid #DCE5EE',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: 18,
            }}
          >
            <Image
  src="/logo.png"
  alt="Estrella Express"
  width={0}
  height={0}
  sizes="100vw"
  style={{
    width: '140px',
    height: 'auto',
    objectFit: 'contain',
  }}
  priority
/>
          </div>

          <h1
            style={{
              margin: '0 0 6px 0',
              textAlign: 'center',
              fontSize: 28,
              color: '#1E40AF',
              fontWeight: 700,
            }}
          >
            Almacén
          </h1>

          

          <div
  style={{
    background: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    textAlign: 'center',
  }}
>
  <p
    style={{
      margin: 0,
      color: '#1F2937',
      fontWeight: 700,
      fontSize: 18,
    }}
  >
    {profile?.name || 'Sin nombre'}
  </p>

  <p
    style={{
      margin: 0,
      marginTop: 4,
      color: '#64748B',
      fontSize: 14,
      fontWeight: 500,
    }}
  >
    {profile?.role === 'admin'
      ? 'Administrador'
      : profile?.role === 'viewer'
      ? 'Usuario'
      : ''}
  </p>
</div>

          

          <div style={{ marginTop: 10 }}>
            <button
  onClick={() => router.push('/entradas/entradas-mx')}
  style={buttonStyle}
>
  Entradas <span className="fi fi-mx" style={{ marginLeft: 8 }}></span>
</button>

<button
  onClick={() => router.push('/entradas/entradas-usa')}
  style={buttonStyle}
>
  Entradas <span className="fi fi-us" style={{ marginLeft: 8 }}></span>
</button>


            <button
              onClick={() => router.push('/salidas')}
              style={buttonStyle}
            >
              Salidas
            </button>

            <button
              onClick={() => router.push('/inventario')}
              style={buttonStyle}
            >
              Inventario
            </button>

            <div
  onClick={() => router.push('/faltantes')}
  style={{
    ...buttonStyle,
    textAlign: 'center',
  }}
>
  Faltantes
</div>

            {profile?.role === 'admin' && (
              <button
                onClick={() => router.push('/usuarios')}
                style={buttonStyle}
              >
                Usuarios
              </button>
            )}
          </div>

          <button
            onClick={handleLogout}
            style={{
              ...buttonStyle,
              marginTop: 8,
              marginBottom: 0,
              background: '#1E40AF',
              color: '#FFFFFF',
              border: '1px solid #1E40AF',
              boxShadow: '0 8px 18px rgba(30, 64, 175, 0.20)',
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </main>
  );
}