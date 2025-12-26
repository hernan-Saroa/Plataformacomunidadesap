/**
 * ModuloTerminosInformesV3 - MOD-05: Términos para Informes
 * DISEÑO CALENDAR + TIMELINE VIEW
 */

import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Calendar, Clock, AlertTriangle, CheckCircle, Eye, Plus, Search, Filter,
  XCircle, Send, Download, FileText, TrendingUp, CalendarDays, List,
  ChevronLeft, ChevronRight, AlertCircle
} from 'lucide-react';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { SolicitudInforme } from '../core/types';
import { solicitudesInformesMock } from '../data/datosSolicitudesInformes';
import { toast } from 'sonner@2.0.3';
import { ModuleHeader } from '../design-system/ModuleHeader';
import { ModuleMetrics } from '../design-system/ModuleMetrics';
import { ModuleFilters } from '../design-system/ModuleFilters';
import { ModuleInfoTooltip } from '../design-system/ModuleInfoTooltip';

type VistaModulo = 'calendario' | 'timeline' | 'lista';

export function ModuloTerminosInformesV3() {
  const [vistaActual, setVistaActual] = useState<VistaModulo>('timeline');
  const [busqueda, setBusqueda] = useState('');
  const [filtroSemaforo, setFiltroSemaforo] = useState<string>('TODOS');
  const [mesActual, setMesActual] = useState(new Date());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const solicitudesFiltradas = useMemo(() => {
    let resultado = [...solicitudesInformesMock];

    if (busqueda) {
      resultado = resultado.filter(s =>
        s.id.toLowerCase().includes(busqueda.toLowerCase()) ||
        s.asunto?.toLowerCase().includes(busqueda.toLowerCase()) ||
        s.solicitante.toLowerCase().includes(busqueda.toLowerCase())
      );
    }

    if (filtroSemaforo !== 'TODOS') {
      resultado = resultado.filter(s => {
        if (filtroSemaforo === 'ROJO') return s.diasRestantes <= 2;
        if (filtroSemaforo === 'AMARILLO') return s.diasRestantes > 2 && s.diasRestantes <= 5;
        if (filtroSemaforo === 'VERDE') return s.diasRestantes > 5;
        return true;
      });
    }

    return resultado;
  }, [busqueda, filtroSemaforo]);

  const solicitudesCriticas = solicitudesInformesMock.filter(s => s.diasRestantes <= 2).length;
  const solicitudesUrgentes = solicitudesInformesMock.filter(s => s.diasRestantes > 2 && s.diasRestantes <= 5).length;
  const solicitudesEnTermino = solicitudesInformesMock.filter(s => s.diasRestantes > 5).length;

  return (
    <div className="space-y-4">
      {/* Header con ModuleHeader */}
      <ModuleHeader
        title="Control de Términos e Informes"
        subtitle="Seguimiento a solicitudes y plazos de entrega"
        toggleView={{
          current: vistaActual,
          onChange: (view) => setVistaActual(view as VistaModulo),
          options: [
            { label: 'Timeline', icon: <TrendingUp className="w-4 h-4" />, value: 'timeline' },
            { label: 'Calendario', icon: <CalendarDays className="w-4 h-4" />, value: 'calendario' },
            { label: 'Lista', icon: <List className="w-4 h-4" />, value: 'lista' }
          ]
        }}
        buttons={[
          {
            label: 'Nueva Solicitud',
            labelMobile: 'Nuevo',
            icon: <Plus className="w-4 h-4" />,
            onClick: () => toast.info('Nueva Solicitud de Informe'),
            variant: 'primary'
          }
        ]}
        infoTooltip={
          <ModuleInfoTooltip
            title="Guía de Términos e Informes"
            variant="icon"
            sections={[
              {
                label: "🔗 Procedencia del Flujo",
                content: "Este módulo NO recibe casos, es un MÓDULO TRANSVERSAL que consolida TODOS los términos activos de todos los módulos: Defensa Judicial, Juzgamiento, Asesoría, Órganos de Control, etc.",
                type: "info"
              },
              {
                label: "⏰ Propósito del Módulo",
                content: "Control centralizado de TODOS los términos procesales y administrativos vigentes del área jurídica, con alertas tempranas para garantizar cumplimiento oportuno y evitar vencimientos.",
                type: "default"
              },
              {
                label: "🚦 Semáforo Inteligente",
                content: "🟢 VERDE (En término): >5 días restantes | 🟡 AMARILLO (Próximo a vencer): 2-5 días | 🔴 ROJO (Vencido): ≤1 día o vencido. El sistema prioriza automáticamente los términos críticos en la vista principal.",
                type: "warning"
              },
              {
                label: "🔄 Tipos de Términos",
                content: "• Judiciales: Contestaciones, recursos, alegatos (perentorios) | • Disciplinarios: Descargos, pruebas (improrrogables) | • Administrativos: Respuestas PQRS, informes a órganos de control | • Contractuales: Plazos de ejecución, entrega de informes.",
                type: "default"
              },
              {
                label: "📊 Dashboard de Control",
                content: "Vista ejecutiva con: Total de términos activos | Términos vencidos (acción urgente) | Próximos a vencer (planear acción) | En término (monitoreo normal). Gráficos de tendencias y alertas.",
                type: "default"
              },
              {
                label: "🔔 Sistema de Alertas",
                content: "Notificaciones automáticas por email/SMS: • 5 días antes: Alerta preventiva | • 2 días antes: Alerta urgente | • 1 día antes: Alerta crítica | • Vencido: Escalamiento automático a coordinación.",
                type: "premium"
              },
              {
                label: "🔗 Integración TOTAL",
                content: "Este módulo se integra con TODOS los módulos: • Defensa Judicial (términos judiciales) • Juzgamiento (términos disciplinarios) • Asesoría (SLA de conceptos) • Órganos Control (términos de respuesta) • Procesos Coactivos (términos de cobro).",
                type: "success"
              },
              {
                label: "💡 Cómo Usar",
                content: "1️⃣ Vista principal muestra TODOS los términos en semáforo único → 2️⃣ Filtrar por módulo origen para ver términos específicos → 3️⃣ Click en término para ver expediente completo → 4️⃣ Marcar como cumplido al ejecutar acción → 5️⃣ Exportar reporte de términos para gerencia.",
                type: "default"
              },
              {
                label: "📈 Reportes e Indicadores",
                content: "Genera indicadores de gestión: • % Cumplimiento de términos (meta: >95%) | • Términos vencidos mensual (meta: 0) | • Tiempo promedio de respuesta | • Análisis de causas de vencimiento para mejora continua.",
                type: "info"
              }
            ]}
          />
        }
      />

      {/* Métricas */}
      <ModuleMetrics
        metrics={[
          {
            label: 'Críticas (≤2 días)',
            value: solicitudesCriticas,
            icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
            color: 'red'
          },
          {
            label: 'Urgentes (3-5 días)',
            value: solicitudesUrgentes,
            icon: <Clock className="w-5 h-5 text-yellow-600" />,
            color: 'yellow'
          },
          {
            label: 'En Término (&gt;5 días)',
            value: solicitudesEnTermino,
            icon: <CheckCircle className="w-5 h-5 text-green-600" />,
            color: 'green'
          }
        ]}
      />

      {/* Filtros */}
      <ModuleFilters
        searchValue={busqueda}
        onSearchChange={setBusqueda}
        searchPlaceholder="Buscar por ID, asunto, solicitante..."
        filters={[
          {
            type: 'select',
            value: filtroSemaforo,
            onChange: setFiltroSemaforo,
            options: [
              { value: 'TODOS', label: 'Todos los estados' },
              { value: 'ROJO', label: '🔴 Críticas (≤2 días)' },
              { value: 'AMARILLO', label: '🟡 Urgentes (3-5 días)' },
              { value: 'VERDE', label: '🟢 En término (>5 días)' }
            ]
          }
        ]}
        totalItems={solicitudesInformesMock.length}
        filteredItems={solicitudesFiltradas.length}
        onClearFilters={() => {
          setBusqueda('');
          setFiltroSemaforo('TODOS');
        }}
        counterText={`Mostrando ${solicitudesFiltradas.length} de ${solicitudesInformesMock.length} solicitudes`}
      />

      {/* Contenido principal */}
      {vistaActual === 'timeline' && <VistaTimeline solicitudes={solicitudesFiltradas} />}
      {vistaActual === 'calendario' && <VistaCalendario solicitudes={solicitudesFiltradas} mesActual={mesActual} setMesActual={setMesActual} />}
      {vistaActual === 'lista' && <VistaLista solicitudes={solicitudesFiltradas} />}
    </div>
  );
}

interface VistaTimelineProps {
  solicitudes: SolicitudInforme[];
}

function VistaTimeline({ solicitudes }: VistaTimelineProps) {
  // Ordenar por fecha límite
  const solicitudesOrdenadas = [...solicitudes].sort((a, b) => 
    new Date(a.fechaLimite).getTime() - new Date(b.fechaLimite).getTime()
  );

  return (
    <Card className="bg-white border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="font-bold text-lg" style={{ color: '#003DA5' }}>
          Timeline de Vencimientos
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Visualización cronológica de plazos de entrega
        </p>
      </div>

      <div className="space-y-4">
        {solicitudesOrdenadas.map((solicitud, index) => {
          const diasRestantes = solicitud.diasRestantes;
          let semaforoColor = '#10B981';
          let semaforoBg = '#D1FAE5';
          if (diasRestantes <= 2) {
            semaforoColor = '#DC2626';
            semaforoBg = '#FEE2E2';
          } else if (diasRestantes <= 5) {
            semaforoColor = '#F59E0B';
            semaforoBg = '#FEF3C7';
          }

          return (
            <motion.div
              key={solicitud.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative pl-8 pb-4 border-l-2"
              style={{ borderColor: semaforoColor }}
            >
              {/* Punto en la línea de tiempo */}
              <div
                className="absolute left-[-9px] top-0 w-4 h-4 rounded-full border-4 border-white"
                style={{ backgroundColor: semaforoColor }}
              />

              {/* Contenido */}
              <div
                className="p-4 rounded-lg border-2 hover:shadow-md transition-all"
                style={{ borderColor: semaforoColor, backgroundColor: semaforoBg }}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <h4 className="font-bold text-sm" style={{ color: '#003DA5' }}>
                      {solicitud.id}
                    </h4>
                    <p className="text-xs text-gray-700 mt-1 line-clamp-2">
                      {solicitud.asunto || 'Sin asunto'}
                    </p>
                  </div>
                  <Badge
                    className="text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: semaforoColor, color: '#FFFFFF' }}
                  >
                    {diasRestantes} día{diasRestantes !== 1 ? 's' : ''}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                  <div>
                    <span className="text-gray-600">Solicitante:</span>
                    <p className="font-semibold text-gray-900">{solicitud.solicitante}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Fecha límite:</span>
                    <p className="font-semibold text-gray-900">
                      {new Date(solicitud.fechaLimite).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => toast.success('Detalle Solicitud', { description: solicitud.id })}
                    size="sm"
                    className="text-xs"
                    style={{ background: '#003DA5', color: '#FFFFFF' }}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Ver Detalle
                  </Button>
                  <Button
                    onClick={() => toast.info('Documentos', { description: solicitud.id })}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    <FileText className="w-3 h-3 mr-1" />
                    Documentos
                  </Button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}

interface VistaCalendarioProps {
  solicitudes: SolicitudInforme[];
  mesActual: Date;
  setMesActual: (date: Date) => void;
}

function VistaCalendario({ solicitudes, mesActual, setMesActual }: VistaCalendarioProps) {
  const nombreMes = mesActual.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  const mesAnterior = () => {
    setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() - 1, 1));
  };

  const mesSiguiente = () => {
    setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 1));
  };

  // Generar días del mes
  const primerDia = new Date(mesActual.getFullYear(), mesActual.getMonth(), 1);
  const ultimoDia = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 0);
  const diasMes = ultimoDia.getDate();

  const dias = [];
  for (let i = 1; i <= diasMes; i++) {
    dias.push(i);
  }

  return (
    <Card className="bg-white border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg capitalize" style={{ color: '#003DA5' }}>
          {nombreMes}
        </h3>
        <div className="flex items-center gap-2">
          <Button onClick={mesAnterior} size="sm" variant="outline">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button onClick={mesSiguiente} size="sm" variant="outline">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(dia => (
          <div key={dia} className="text-center font-bold text-xs text-gray-500 py-2">
            {dia}
          </div>
        ))}

        {/* Espacios en blanco antes del primer día */}
        {Array.from({ length: primerDia.getDay() }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {/* Días del mes */}
        {dias.map(dia => {
          const fecha = new Date(mesActual.getFullYear(), mesActual.getMonth(), dia);
          const solicitudesDia = solicitudes.filter(s => {
            const fechaLimite = new Date(s.fechaLimite);
            return fechaLimite.getDate() === dia &&
                   fechaLimite.getMonth() === mesActual.getMonth() &&
                   fechaLimite.getFullYear() === mesActual.getFullYear();
          });

          const esHoy = new Date().toDateString() === fecha.toDateString();

          return (
            <div
              key={dia}
              className={`aspect-square border rounded-lg p-1 text-xs ${
                esHoy ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              } ${solicitudesDia.length > 0 ? 'bg-red-50' : ''}`}
            >
              <div className="font-semibold text-gray-700 mb-1">{dia}</div>
              {solicitudesDia.length > 0 && (
                <div className="space-y-0.5">
                  {solicitudesDia.slice(0, 2).map(s => (
                    <div
                      key={s.id}
                      className="text-[9px] px-1 py-0.5 rounded truncate"
                      style={{
                        backgroundColor: s.diasRestantes <= 2 ? '#DC2626' : s.diasRestantes <= 5 ? '#F59E0B' : '#10B981',
                        color: '#FFFFFF'
                      }}
                    >
                      {s.id}
                    </div>
                  ))}
                  {solicitudesDia.length > 2 && (
                    <div className="text-[9px] text-gray-600">
                      +{solicitudesDia.length - 2} más
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

interface VistaListaProps {
  solicitudes: SolicitudInforme[];
}

function VistaLista({ solicitudes }: VistaListaProps) {
  return (
    <Card className="bg-white border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">ID</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Asunto</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Solicitante</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Fecha Límite</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Días Restantes</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Estado</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {solicitudes.map((solicitud) => {
              const semaforoColor = solicitud.diasRestantes <= 2 ? '#DC2626' : solicitud.diasRestantes <= 5 ? '#F59E0B' : '#10B981';

              return (
                <tr key={solicitud.id} className="border-t border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900 font-semibold">{solicitud.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <div className="line-clamp-2">{solicitud.asunto || 'Sin asunto'}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{solicitud.solicitante}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(solicitud.fechaLimite).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className="text-xs font-bold"
                      style={{ backgroundColor: semaforoColor, color: '#FFFFFF' }}
                    >
                      {solicitud.diasRestantes} día{solicitud.diasRestantes !== 1 ? 's' : ''}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{solicitud.etapa}</td>
                  <td className="px-4 py-3">
                    <Button
                      onClick={() => toast.success('Detalle Solicitud', { description: solicitud.id })}
                      size="sm"
                      style={{ background: '#003DA5', color: '#FFFFFF' }}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Ver
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}