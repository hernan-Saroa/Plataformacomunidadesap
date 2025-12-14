/**
 * ANÁLISIS DE CUMPLIMIENTO RF002 - UNIVERSO DE AUDITORÍAS
 * Dashboard ejecutivo mostrando el estado de implementación del requerimiento
 */

import { CheckCircle2, AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import { Badge } from '../../ui/badge';

export function AnalisisRF002() {
  const requerimientos = [
    {
      id: 1,
      nombre: 'Formulario automatizado con todas las preguntas del formato DAFP',
      estado: 'completo',
      porcentaje: 100,
      detalles: [
        '5 dimensiones de impacto evaluadas',
        'Probabilidad de ocurrencia',
        'Campos de proceso, responsable y observaciones',
        'Selector de territoriales ESAP'
      ]
    },
    {
      id: 2,
      nombre: 'Cálculo automático de nivel de riesgo según criterios DAFP',
      estado: 'completo',
      porcentaje: 100,
      detalles: [
        'Fórmula: Impacto × Probabilidad',
        'Clasificación en 4 niveles (BAJO, MEDIO, ALTO, CRÍTICO)',
        'Cálculo en tiempo real',
        'Rangos según estándar DAFP (1-25)'
      ]
    },
    {
      id: 3,
      nombre: 'Priorización automática de auditorías por años (1-4 años)',
      estado: 'completo',
      porcentaje: 100,
      detalles: [
        'CRÍTICO → Año 1',
        'ALTO → Año 1-2',
        'MEDIO → Año 2-3',
        'BAJO → Año 3-4'
      ]
    },
    {
      id: 4,
      nombre: 'Identificación de procesos críticos y de alto riesgo',
      estado: 'completo',
      porcentaje: 100,
      detalles: [
        'Badges visuales con colores por riesgo',
        'Ordenamiento automático (mayor a menor)',
        'Filtros por clasificación',
        'Métricas en dashboard'
      ]
    },
    {
      id: 5,
      nombre: 'Diferenciación entre sede principal y 16 territoriales',
      estado: 'completo',
      porcentaje: 100,
      detalles: [
        'Selector de tipo de sede',
        'Lista completa de 16 territoriales ESAP',
        'Filtro por tipo de sede',
        'Métricas separadas sede/territoriales'
      ]
    },
    {
      id: 6,
      nombre: 'Exportación a Excel compatible con formato DAFP oficial',
      estado: 'completo',
      porcentaje: 100,
      detalles: [
        'Exportación a CSV con UTF-8 BOM',
        'Estructura según formato DAFP',
        'Todas las columnas requeridas',
        'Nombre descriptivo del archivo'
      ]
    },
    {
      id: 7,
      nombre: 'Versionamiento del universo de auditoría por año fiscal',
      estado: 'parcial',
      porcentaje: 80,
      detalles: [
        '✅ Campo de año fiscal y versión',
        '✅ Estado (borrador/aprobado/vigente)',
        '❌ Historial de versiones',
        '❌ Comparación entre versiones'
      ]
    }
  ];

  const cumplimientoTotal = Math.round(
    requerimientos.reduce((sum, req) => sum + req.porcentaje, 0) / requerimientos.length
  );

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'completo':
        return { bg: '#10B981', text: '#FFFFFF', icon: CheckCircle2 };
      case 'parcial':
        return { bg: '#F59E0B', text: '#FFFFFF', icon: Clock };
      case 'pendiente':
        return { bg: '#DC2626', text: '#FFFFFF', icon: AlertTriangle };
      default:
        return { bg: '#6B7280', text: '#FFFFFF', icon: Clock };
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* HEADER */}
      <div className="rounded-2xl border-2 p-4 sm:p-6" style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black" style={{ color: '#1F2937' }}>
              Análisis RF002 - Universo de Auditorías
            </h2>
            <p className="text-xs sm:text-sm mt-1" style={{ color: '#6B7280' }}>
              Estado de cumplimiento del requerimiento funcional según especificaciones DAFP
            </p>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="relative w-24 h-24">
              {/* Círculo de progreso */}
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="#E5E7EB"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="#10B981"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - cumplimientoTotal / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black" style={{ color: '#10B981' }}>
                  {cumplimientoTotal}%
                </span>
              </div>
            </div>
            <Badge style={{ background: '#10B98120', color: '#10B981' }}>
              Cumplimiento Total
            </Badge>
          </div>
        </div>

        {/* RESUMEN DE ESTADOS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl p-4" style={{ background: '#10B98110', borderLeft: '4px solid #10B981' }}>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-5 h-5" style={{ color: '#10B981' }} />
              <span className="font-bold" style={{ color: '#10B981' }}>Completados</span>
            </div>
            <p className="text-2xl font-black" style={{ color: '#10B981' }}>
              {requerimientos.filter(r => r.estado === 'completo').length}
            </p>
            <p className="text-xs" style={{ color: '#6B7280' }}>de 7 requerimientos</p>
          </div>

          <div className="rounded-xl p-4" style={{ background: '#F59E0B10', borderLeft: '4px solid #F59E0B' }}>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-5 h-5" style={{ color: '#F59E0B' }} />
              <span className="font-bold" style={{ color: '#F59E0B' }}>Parciales</span>
            </div>
            <p className="text-2xl font-black" style={{ color: '#F59E0B' }}>
              {requerimientos.filter(r => r.estado === 'parcial').length}
            </p>
            <p className="text-xs" style={{ color: '#6B7280' }}>requieren ajustes</p>
          </div>

          <div className="rounded-xl p-4" style={{ background: '#DC262610', borderLeft: '4px solid #DC2626' }}>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-5 h-5" style={{ color: '#DC2626' }} />
              <span className="font-bold" style={{ color: '#DC2626' }}>Pendientes</span>
            </div>
            <p className="text-2xl font-black" style={{ color: '#DC2626' }}>
              {requerimientos.filter(r => r.estado === 'pendiente').length}
            </p>
            <p className="text-xs" style={{ color: '#6B7280' }}>sin implementar</p>
          </div>
        </div>
      </div>

      {/* LISTA DE REQUERIMIENTOS */}
      <div className="space-y-3">
        {requerimientos.map((req, index) => {
          const estadoConfig = getEstadoColor(req.estado);
          const IconComponent = estadoConfig.icon;

          return (
            <div
              key={req.id}
              className="rounded-xl border-2 p-4 sm:p-5 hover:shadow-md transition-all"
              style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
            >
              <div className="flex flex-col sm:flex-row items-start gap-4">
                {/* Número */}
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-black"
                  style={{ background: '#F3F4F6', color: '#6B7280' }}
                >
                  {req.id}
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
                    <h3 className="font-bold text-sm sm:text-base" style={{ color: '#1F2937' }}>
                      {req.nombre}
                    </h3>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center gap-1 px-3 py-1 rounded-full" style={{ background: estadoConfig.bg }}>
                        <IconComponent className="w-4 h-4" style={{ color: estadoConfig.text }} />
                        <span className="text-xs font-bold" style={{ color: estadoConfig.text }}>
                          {req.porcentaje}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div className="mb-3">
                    <div className="w-full h-2 rounded-full" style={{ background: '#E5E7EB' }}>
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${req.porcentaje}%`,
                          background: estadoConfig.bg
                        }}
                      />
                    </div>
                  </div>

                  {/* Detalles */}
                  <ul className="space-y-1">
                    {req.detalles.map((detalle, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm" style={{ color: '#6B7280' }}>
                        <span className="flex-shrink-0 mt-1">•</span>
                        <span>{detalle}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* INTEGRACIÓN CON OTROS MÓDULOS */}
      <div className="rounded-2xl border-2 p-4 sm:p-6" style={{ background: '#FEF3C7', borderColor: '#F59E0B' }}>
        <div className="flex items-start gap-3">
          <TrendingUp className="w-6 h-6 flex-shrink-0" style={{ color: '#F59E0B' }} />
          <div>
            <h3 className="font-bold mb-2" style={{ color: '#92400E' }}>
              Siguiente Paso: Integración con RF003 (Programa Anual)
            </h3>
            <p className="text-sm mb-3" style={{ color: '#92400E' }}>
              Para completar el flujo de planificación de auditorías, es necesario implementar:
            </p>
            <ul className="space-y-2 text-sm" style={{ color: '#92400E' }}>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Botón "Exportar al Programa Anual" para procesos de Año 1 y Año 1-2</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Sincronización bidireccional entre Universo y Programa Anual</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Indicador visual de procesos ya exportados</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
