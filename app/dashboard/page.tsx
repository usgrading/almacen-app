'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { ensureMiOrganizationId } from '@/lib/organization';

type Profile = {
  nombre: string | null;
  rol: string | null;
};

function getRoleLabel(role: string | null) {
  if (role === 'admin') return 'Administrador';
  if (role === 'manager') return 'Manager';
  if (role === 'viewer') return 'Usuario';
  return '';
}

export default function DashboardPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [esCel, setEsCel] = useState(false);

  useEffect(() => {
  const checkUser = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push('/login');
        return;
      }

      await ensureMiOrganizationId(supabase);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('nombre, rol')
        .eq('id', session.user.id)
        .single();

      setProfile((profileData as Profile | null) ?? null);
    } finally {
      setLoading(false);
    }
  };

  void checkUser();
}, [router]);

  useEffect(() => {
    const revisarPantalla = () => {
      setEsCel(window.innerWidth < 768);
    };

    revisarPantalla();
    window.addEventListener('resize', revisarPantalla);

    return () => window.removeEventListener('resize', revisarPantalla);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <main
        style={{
          ...pageStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p style={{ color: '#1F2937', fontSize: 16 }}>Cargando...</p>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={{ maxWidth: esCel ? 520 : 1100, margin: '0 auto' }}>
        <div style={cardStyle}>
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
              margin: '0 0 10px 0',
              textAlign: 'center',
              fontSize: esCel ? 24 : 28,
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
              marginBottom: 16,
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
              {profile?.nombre || 'Sin nombre'}
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
              {getRoleLabel(profile?.rol ?? null)}
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: esCel ? '1fr' : 'repeat(2, minmax(0, 1fr))',
              gap: 12,
            }}
          >
            <button
              onClick={() => router.push('/entradas/entradas-mx')}
              style={buttonStyle}
            >
              <span style={buttonContentStyle}>
                <span>Entradas</span>
                <span className="fi fi-mx"></span>
              </span>
            </button>

            <button
              onClick={() => router.push('/entradas/entradas-usa')}
              style={buttonStyle}
            >
              <span style={buttonContentStyle}>
                <span>Entradas</span>
                <span className="fi fi-us"></span>
              </span>
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

            <button
              onClick={() => router.push('/reportes')}
              style={{ ...buttonStyle, textAlign: 'center' }}
            >
              Reportes
            </button>

            <button
              onClick={() => router.push('/usuarios')}
              style={buttonStyle}
            >
              Usuarios
            </button>
          </div>

          <button
            onClick={handleLogout}
            style={{
              ...logoutButtonStyle,
              marginTop: 14,
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#EEF3F8',
  padding: 20,
  fontFamily: 'Arial, sans-serif',
};

const cardStyle: React.CSSProperties = {
  background: '#FFFFFF',
  borderRadius: 20,
  padding: 20,
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
  border: '1px solid #DCE5EE',
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: 16,
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

const buttonContentStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
};

const logoutButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  marginBottom: 0,
  background: '#1E40AF',
  color: '#FFFFFF',
  border: '1px solid #1E40AF',
  boxShadow: '0 8px 18px rgba(30, 64, 175, 0.20)',
};