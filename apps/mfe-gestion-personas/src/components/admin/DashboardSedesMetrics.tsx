import { useState, useEffect } from 'react';
import { Building2, Users, MapPin } from 'lucide-react';
import { estructuraService } from '../../services/estructuraService';

interface SedeMetric {
  sede: string;
  sedes: number;
  capacidad: number;
}

interface DashboardSedesMetricsProps {
  className?: string;
}

export function DashboardSedesMetrics({ className = '' }: DashboardSedesMetricsProps) {
  const [metrics, setMetrics] = useState<SedeMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const response = await estructuraService.obtenerEstructura();
      const { seccionales, sedes } = response.data;

      const sedeMetrics: SedeMetric[] = seccionales.slice(0, 10).map(sec => {
        const sedesDeEstaSeccional = sedes.filter(s => s.idSeccional === sec.idSeccional);
        const capacidadTotal = sedesDeEstaSeccional.reduce((acc, s) => acc + (s.capacidadEstudiantes || 0), 0);
        return {
          sede: sec.nomSeccional,
          sedes: sedesDeEstaSeccional.length,
          capacidad: capacidadTotal,
        };
      });

      setMetrics(sedeMetrics);
    } catch {
      // muestra vacío si el endpoint falla
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl p-6 ${className}`} style={{ border: '1px solid #E5E7EB' }}>
        <div className="animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 rounded" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl p-6 ${className}`} style={{ border: '1px solid #E5E7EB' }}>
      <div className="flex items-center gap-2 mb-4">
        <MapPin size={18} style={{ color: '#003DA5' }} />
        <h3 className="text-sm font-semibold" style={{ color: '#111827' }}>Métricas por Territorial</h3>
      </div>
      {metrics.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: '#6B7280' }}>No hay datos de territoriales disponibles</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {metrics.map((m, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              style={{ border: '1px solid #F3F4F6' }}
            >
              <div className="flex items-center gap-2">
                <Building2 size={14} style={{ color: '#6B7280' }} />
                <span className="text-sm font-medium" style={{ color: '#374151' }}>{m.sede}</span>
              </div>
              <div className="flex items-center gap-4 text-xs" style={{ color: '#6B7280' }}>
                <span className="flex items-center gap-1"><Building2 size={12} />{m.sedes} sedes</span>
                {m.capacidad > 0 && <span className="flex items-center gap-1"><Users size={12} />{m.capacidad}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
