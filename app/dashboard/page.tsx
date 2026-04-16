'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { ensureMiOrganizationId } from '@/lib/organization';
import { isAdmin, normalizeRole, type AppRole } from '@/lib/roles';
import {
  appBtnPrimario,
  appCard,
  appFondoMain,
  appSubtituloPagina,
  appTituloPagina,
} from '@/lib/app-ui';

type Profile = {
  nombre: string | null;
  rol: string | null;
};

function etiquetaRol(rol: string | null) {
  if (rol === 'admin') return 'Administrador';
  if (rol === 'manager') return 'Manager';
  if (rol === 'viewer') return 'Usuario';
  return '';
}

function labelFromProfile(p: Profile | null): string {
  if (!p) return '';
  return etiquetaRol(p.rol);
}

export default function DashboardPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [appRole, setAppRole] = useState<AppRole | null>(null);
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

      const p = (profileData as Profile | null) ?? null;
      setProfile(p);
      setAppRole(normalizeRole(p?.rol ?? null));
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
          ...appFondoMain,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p style={{ color: '#64748b', fontSize: 15, fontWeight: 500 }}>
          Cargando...
        </p>
      </main>
    );
  }

  return (
    <main style={appFondoMain}>
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
              ...appTituloPagina,
              marginBottom: 10,
            }}
          >
            Almacén
          </h1>

          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
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
                ...appSubtituloPagina,
                margin: '4px 0 0 0',
                fontSize: 14,
              }}
            >
              {labelFromProfile(profile)}
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
              onClick={() => router.push('/reportes')}
              style={{ ...buttonStyle, textAlign: 'center' }}
            >
              Inventario y reportes
            </button>

            {isAdmin(appRole) && (
              <button
                onClick={() => router.push('/usuarios')}
                style={buttonStyle}
              >
                Usuarios
              </button>
            )}
          </div>

          <button
            type="button"
            className="app-btn-primario"
            onClick={handleLogout}
            style={{
              ...appBtnPrimario,
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

const cardStyle: CSSProperties = {
  ...appCard,
  padding: 'clamp(20px, 4vw, 28px)',
};

const buttonStyle: CSSProperties = {
  width: '100%',
  padding: 16,
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  background: '#ffffff',
  color: '#0f172a',
  fontSize: 16,
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.06)',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease',
};

const buttonContentStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
};