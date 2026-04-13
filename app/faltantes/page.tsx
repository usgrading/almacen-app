'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function FaltantesPage() {
  const [faltantes, setFaltantes] = useState<any[]>([]);

  const cargarFaltantes = async () => {
    const { data, error } = await supabase
      .from('faltantes')
      .select('*')
      .order('creado_en', { ascending: false });

    if (!error && data) {
      setFaltantes(data);
    }
  };

  useEffect(() => {
    cargarFaltantes();
  }, []);

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#EEF3F8',
        padding: 20,
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <div
          style={{
            background: '#FFFFFF',
            padding: 20,
            borderRadius: 16,
            boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
            border: '1px solid #DCE5EE',
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: 18,
              textAlign: 'center',
              color: '#1F2937',
              fontSize: 22,
            }}
          >
            Faltantes
          </h2>

          {faltantes.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#64748B' }}>
              No hay faltantes
            </p>
          ) : (
            faltantes.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: 12,
                  borderBottom: '1px solid #E2E8F0',
                }}
              >
                <strong>{item.producto}</strong>
                <div style={{ fontSize: 14, color: '#64748B' }}>
                  {item.cantidad} piezas
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}