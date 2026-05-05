/**
 * ═════════════════════════════════════════════════════════════════════════
 * DASHBOARD PRINCIPAL OCI
 * ═════════════════════════════════════════════════════════════════════════
 * 
 * Vista ejecutiva con KPIs, gráficos y accesos rápidos
 * Basado en especificaciones de PROMPT_FIGMA_OCI_COMPLETO.md
 * 
 * Incluye:
 * - Saludo personalizado
 * - 4 KPI Cards con tendencias
 * - Gráfico de barras: Auditorías por estado
 * - Widget de próximos vencimientos
 * - Gráfico dona: Cumplimiento planes de mejora
 * - Accesos rápidos
 * 
 * @version 1.0
 */

import React, { useMemo } from 'react';
import { Plus, LayoutGrid, BarChart3, Download } from 'lucide-react';
import { KPICard } from './KPICard';
import { VencimientosWidget, type Vencimiento } from './VencimientosWidget';
import { AccesosRapidos, type AccesoRapido } from './AccesosRapidos';
import { ESAP_COLORS } from '../utils/esapThemeOCI';
import { toast } from 'sonner@2.0.3';

// ═════════════════════════════════════════════════════════════════════════
// TIPOS
// ═════════════════════════════════════════════════════════════════════════

interface DashboardOCIProps {
  usuario?: {
    nombre: string;
    rol: string;
  };
  onNuevaAuditoria?: () => void;
  onVerKanban?: () => void;
  className?: string;
}

// ═════════════════════════════════════════════════════════════════════════
// DATOS DE EJEMPLO
// ═════════════════════════════════════════════════════════════════════════

const VENCIMIENTOS_EJEMPLO: Vencimiento[] = [
  {
    id: 'v1',
    tipo: 'informe',
    titulo: 'Informe PTEP',
    descripcion: 'Informe Pormenorizado del Estado del Control Interno',
    fechaVencimiento: '2025-02-02',
  },
  {
    id: 'v2',
    tipo: 'auditoria',
    titulo: 'Auditoría Financiera',
    descripcion: 'Cierre de auditoría de gestión financiera',
    fechaVencimiento: '2025-02-05',
  },
  {
    id: 'v3',
    tipo: 'plan',
    titulo: 'Seguimiento Julio',
    descripcion: 'Seguimiento trimestral planes de mejoramiento',
    fechaVencimiento: '2025-02-12',
  },
];

const AUDITORIAS_POR_ESTADO = [
  { estado: 'Backlog', cantidad: 8, color: '#E8F4F8', borderColor: '#2E86AB' },
  { estado: 'Planeación', cantidad: 5, color: '#FEF9E7', borderColor: '#F39C12' },
  { estado: 'Ejecución', cantidad: 4, color: '#D4EFDF', borderColor: '#27AE60' },
  { estado: 'Comunicación', cantidad: 2, color: '#FADBD8', borderColor: '#E74C3C' },
  { estado: 'Cerrado', cantidad: 12, color: '#D5D8DC', borderColor: '#6C757D' },
];

// ═════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═════════════════════════════════════════════════════════════════════════

export function DashboardOCI({
  usuario = { nombre: 'Mario Bernal', rol: 'Jefe OCI' },
  onNuevaAuditoria,
  onVerKanban,
  className = '',
}: DashboardOCIProps) {
  
  // Fecha actual
  const fechaActual = useMemo(() => {
    const fecha = new Date();
    const opciones: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    const fechaFormateada = fecha.toLocaleDateString('es-CO', opciones);
    return fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
  }, []);

  // Saludo según hora del día
  const saludo = useMemo(() => {
    const hora = new Date().getHours();
    if (hora < 12) return 'Buenos días';
    if (hora < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }, []);

  // Handlers por defecto si no se proporcionan
  const handleNuevaAuditoria = () => {
    if (onNuevaAuditoria) {
      onNuevaAuditoria();
    } else {
      toast.success('Crear nueva auditoría', {
        description: 'Abriendo formulario de nueva auditoría',
        duration: 2000,
      });
    }
  };

  const handleVerKanban = () => {
    if (onVerKanban) {
      onVerKanban();
    } else {
      toast.info('Ver tablero Kanban', {
        description: 'Navegando al tablero de auditorías',
        duration: 2000,
      });
    }
  };

  // Accesos rápidos
  const accesosRapidos: AccesoRapido[] = [
    {
      id: 'nueva',
      label: 'Nueva Auditoría',
      descripcion: 'Crear una nueva auditoría',
      icon: Plus,
      color: '#27AE60',
      onClick: handleNuevaAuditoria,
    },
    {
      id: 'kanban',
      label: 'Ver Kanban',
      descripcion: 'Tablero de auditorías',
      icon: LayoutGrid,
      color: '#2874A6',
      onClick: handleVerKanban,
    },
    {
      id: 'reportes',
      label: 'Reportes Ejecutivos',
      descripcion: 'Informes y estadísticas',
      icon: BarChart3,
      color: '#8B5CF6',
      onClick: () => {
        toast.info('Abrir reportes ejecutivos');
      },
    },
    {
      id: 'exportar',
      label: 'Exportar SIRECI',
      descripcion: 'Exportar datos a SIRECI',
      icon: Download,
      color: '#EF4444',
      onClick: () => {
        toast.info('Exportar a SIRECI');
      },
    },
  ];

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      <div className="max-w-[1920px] mx-auto px-8 py-6">
        {/* SALUDO PERSONALIZADO */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#1B4F72] mb-1">
            {saludo}, {usuario.nombre.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-600">
            {fechaActual}
          </p>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
          <KPICard
            titulo="Ejecución PAI"
            valor={78}
            unidad="%"
            color="verde"
            tendencia={{
              valor: 5,
              tipo: 'positiva',
              descripcion: 'vs mes anterior',
            }}
            tooltip="Porcentaje de ejecución del Plan Anual de Auditorías"
          />

          <KPICard
            titulo="Auditorías Activas"
            valor={5}
            color="amarillo"
            tendencia={{
              valor: -1,
              tipo: 'neutral',
              descripcion: 'vs mes anterior',
            }}
            tooltip="Auditorías en proceso actualmente"
          />

          <KPICard
            titulo="Planes Vencidos"
            valor={3}
            color="rojo"
            tendencia={{
              valor: 2,
              tipo: 'negativa',
              descripcion: 'nuevos',
            }}
            tooltip="Planes de mejoramiento vencidos"
          />

          <KPICard
            titulo="Informes Pendientes"
            valor={2}
            color="azul"
            tendencia={{
              valor: 0,
              tipo: 'neutral',
            }}
            tooltip="Informes de ley pendientes de entrega"
          />
        </div>

        {/* GRID PRINCIPAL: Gráficos + Vencimientos */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
          {/* GRÁFICO DE BARRAS: Auditorías por Estado */}
          <div className="xl:col-span-2">
            <GraficoBarrasAuditorias data={AUDITORIAS_POR_ESTADO} />
          </div>

          {/* PRÓXIMOS VENCIMIENTOS */}
          <div>
            <VencimientosWidget
              vencimientos={VENCIMIENTOS_EJEMPLO}
              maxItems={5}
              onVerTodos={() => toast.info('Ver calendario completo')}
            />
          </div>
        </div>

        {/* GRÁFICO DONA: Cumplimiento Planes de Mejora */}
        <div className="mb-6">
          <GraficoCumplimientoPlanes />
        </div>

        {/* ACCESOS RÁPIDOS */}
        <AccesosRapidos accesos={accesosRapidos} />
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// COMPONENTE: GRÁFICO DE BARRAS
// ═════════════════════════════════════════════════════════════════════════

interface GraficoBarrasAuditoriasProps {
  data: typeof AUDITORIAS_POR_ESTADO;
}

function GraficoBarrasAuditorias({ data }: GraficoBarrasAuditoriasProps) {
  const maxCantidad = Math.max(...data.map((d) => d.cantidad));

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        Auditorías por Estado
      </h3>

      <div className="space-y-4">
        {data.map((item) => {
          const porcentaje = (item.cantidad / maxCantidad) * 100;

          return (
            <div key={item.estado}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {item.estado}
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {item.cantidad}
                </span>
              </div>

              <div className="w-full h-8 bg-gray-100 rounded-lg overflow-hidden">
                <div
                  className="h-full transition-all duration-500 flex items-center justify-end pr-3"
                  style={{
                    width: `${porcentaje}%`,
                    backgroundColor: item.color,
                    borderRight: `3px solid ${item.borderColor}`,
                  }}
                >
                  {porcentaje > 15 && (
                    <span className="text-xs font-semibold text-gray-700">
                      {item.cantidad}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// COMPONENTE: GRÁFICO DONA (Simplificado)
// ═════════════════════════════════════════════════════════════════════════

function GraficoCumplimientoPlanes() {
  const datos = [
    { label: 'Completos', porcentaje: 45, color: '#27AE60' },
    { label: 'Parciales', porcentaje: 30, color: '#F39C12' },
    { label: 'Pendientes', porcentaje: 25, color: '#E74C3C' },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        Cumplimiento Planes de Mejora
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {datos.map((item) => (
          <div key={item.label} className="text-center">
            <div className="mb-2">
              <div
                className="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-2xl font-bold text-white"
                style={{ backgroundColor: item.color }}
              >
                {item.porcentaje}%
              </div>
            </div>
            <h4 className="text-sm font-semibold text-gray-900 mb-1">
              {item.label}
            </h4>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full"
                style={{
                  width: `${item.porcentaje}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═════════════════════════════════════════════════════════════════════════

export default DashboardOCI;