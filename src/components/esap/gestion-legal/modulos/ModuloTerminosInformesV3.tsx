/**
 * ModuloTerminosInformesV3 - MOD-05: Términos para Informes
 * DISEÑO CALENDAR + TIMELINE VIEW
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Calendar, Search, Filter, FileText, AlertTriangle, Clock, CheckCircle, 
  List, Calendar as CalendarIcon, TrendingUp, Link, Plus, Eye, 
  ChevronLeft, ChevronRight, CalendarDays
} from 'lucide-react';
import { CardSIGL } from '../design-system/CardSIGL';
import { ButtonSIGL } from '../design-system/ButtonSIGL';
import { BadgeSIGL } from '../design-system/BadgeSIGL';
import { Input } from '../../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { SolicitudInforme, EtapaSolicitudInforme } from '../core/types';
import { solicitudesConsolidadas, estadisticasTerminosInformes } from '../data/datosSolicitudesInformes';
import { ModalDetalleSolicitudInforme } from './ModalDetalleSolicitudInforme';
import { ModalNuevaSolicitudInforme } from './ModalNuevaSolicitudInforme';
import { ModuleInfoTooltip } from '../design-system/ModuleInfoTooltip';
import { ModuleHeader } from '../design-system/ModuleHeader';
import { ModuleMetrics } from '../design-system/ModuleMetrics';
import { ModuleFilters } from '../design-system/ModuleFilters';
import { toast } from 'sonner@2.0.3';

// Tipos necesarios
type VistaModulo = 'timeline' | 'calendario' | 'lista';

interface NuevaSolicitudData {
  asunto: string;
  descripcion: string;
  areaSolicitante: string;
  solicitante: string;
  entregable: string;
  fechaLimite: string;
}

export function ModuloTerminosInformesV3() {
  // ========== ESTADO ==========
  const [solicitudes, setSolicitudes] = useState<SolicitudInforme[]>(solicitudesConsolidadas);
  const [vistaActual, setVistaActual] = useState<VistaModulo>('timeline');
  const [busqueda, setBusqueda] = useState('');
  const [filtroSemaforo, setFiltroSemaforo] = useState<string>('TODOS');
  const [filtroEtapa, setFiltroEtapa] = useState<string>('TODAS');
  const [filtroModuloOrigen, setFiltroModuloOrigen] = useState<string>('TODOS');
  const [mesActual, setMesActual] = useState(new Date());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Estados para modales
  const [modalNuevaSolicitudOpen, setModalNuevaSolicitudOpen] = useState(false);
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<SolicitudInforme | null>(null);
  
  const handleNuevaSolicitud = (data: NuevaSolicitudData) => {
    console.log('📝 Nueva solicitud registrada:', data);
    
    // Calcular días restantes
    const fechaLimite = new Date(data.fechaLimite);
    const hoy = new Date();
    const diasRestantes = Math.ceil((fechaLimite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    const diasTotales = diasRestantes;
    
    // Crear nueva solicitud
    const nuevaSolicitud: SolicitudInforme = {
      id: `SI-2025-${String(solicitudes.length + 1).padStart(3, '0')}`,
      etapa: 'RECIBIDA',
      tipoInforme: data.entregable,
      enteSolicitante: data.areaSolicitante,
      radicadoExterno: `RAD-2025-${Math.floor(Math.random() * 9999)}`,
      asunto: data.asunto,
      descripcion: data.descripcion,
      responsable: data.solicitante,
      fechaSolicitud: new Date(),
      fechaVencimiento: fechaLimite,
      diasTotales: diasTotales,
      diasRestantes: diasRestantes,
      datosRequeridos: []
    };
    
    setSolicitudes(prev => [nuevaSolicitud, ...prev]);
    
    toast.success('Solicitud registrada exitosamente', {
      description: `Se ha creado la solicitud ${nuevaSolicitud.id}`,
      icon: <CheckCircle className="w-4 h-4" />
    });
    setModalNuevaSolicitudOpen(false);
  };

  const handleVerDetalle = (solicitud: SolicitudInforme) => {
    console.log('👁️ Ver detalle de:', solicitud.id);
    setSolicitudSeleccionada(solicitud);
    setModalDetalleOpen(true);
  };

  const handleCambiarEtapa = (id: string, nuevaEtapa: EtapaSolicitudInforme) => {
    console.log('🔄 Cambiar etapa:', id, '→', nuevaEtapa);
    setSolicitudes(prev =>
      prev.map(sol =>
        sol.id === id
          ? { ...sol, etapa: nuevaEtapa }
          : sol
      )
    );
    
    // Actualizar también la solicitud seleccionada si es la misma
    if (solicitudSeleccionada?.id === id) {
      setSolicitudSeleccionada(prev =>
        prev ? { ...prev, etapa: nuevaEtapa } : null
      );
    }
    
    toast.success('Etapa actualizada', {
      description: `Solicitud ${id} movida a ${nuevaEtapa}`,
      icon: <CheckCircle className="w-4 h-4" />
    });
  };

  const handleAgregarComentario = (id: string, comentario: string) => {
    console.log('💬 Comentario agregado a:', id, '→', comentario);
    // En una app real, esto actualizaría el timeline de la solicitud
  };

  const solicitudesFiltradas = useMemo(() => {
    let resultado = [...solicitudes];

    if (busqueda) {
      resultado = resultado.filter(s =>
        s.id.toLowerCase().includes(busqueda.toLowerCase()) ||
        s.asunto?.toLowerCase().includes(busqueda.toLowerCase()) ||
        s.responsable.toLowerCase().includes(busqueda.toLowerCase()) ||
        s.enteSolicitante.toLowerCase().includes(busqueda.toLowerCase())
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

    if (filtroEtapa !== 'TODAS') {
      resultado = resultado.filter(s => s.etapa === filtroEtapa);
    }

    if (filtroModuloOrigen !== 'TODOS') {
      resultado = resultado.filter(s => s.moduloOrigen === filtroModuloOrigen);
    }

    return resultado;
  }, [solicitudes, busqueda, filtroSemaforo, filtroEtapa, filtroModuloOrigen]);

  const solicitudesCriticas = solicitudesFiltradas.filter(s => s.diasRestantes <= 2).length;
  const solicitudesUrgentes = solicitudesFiltradas.filter(s => s.diasRestantes > 2 && s.diasRestantes <= 5).length;
  const solicitudesEnTermino = solicitudesFiltradas.filter(s => s.diasRestantes > 5).length;

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
            onClick: () => setModalNuevaSolicitudOpen(true),
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
          },
          {
            type: 'select',
            value: filtroEtapa,
            onChange: setFiltroEtapa,
            options: [
              { value: 'TODAS', label: 'Todas las etapas' },
              { value: 'RECIBIDA', label: 'Recibida' },
              { value: 'EN_PROCESO', label: 'En proceso' },
              { value: 'FINALIZADA', label: 'Finalizada' }
            ]
          },
          {
            type: 'select',
            value: filtroModuloOrigen,
            onChange: setFiltroModuloOrigen,
            options: [
              { value: 'TODOS', label: 'Todos los módulos' },
              { value: 'DEFENSA_JUDICIAL', label: 'Defensa Judicial' },
              { value: 'JUZGAMIENTO', label: 'Juzgamiento' },
              { value: 'ASESORIA', label: 'Asesoría' },
              { value: 'ORGANOS_CONTROL', label: 'Órganos de Control' },
              { value: 'PROCESOS_COACTIVOS', label: 'Procesos Coactivos' }
            ]
          }
        ]}
        totalItems={solicitudes.length}
        filteredItems={solicitudesFiltradas.length}
        onClearFilters={() => {
          setBusqueda('');
          setFiltroSemaforo('TODOS');
          setFiltroEtapa('TODAS');
          setFiltroModuloOrigen('TODOS');
        }}
        counterText={`Mostrando ${solicitudesFiltradas.length} de ${solicitudes.length} solicitudes`}
      />

      {/* Contenido principal */}
      {vistaActual === 'timeline' && <VistaTimeline solicitudes={solicitudesFiltradas} onVerDetalle={handleVerDetalle} />}
      {vistaActual === 'calendario' && <VistaCalendario solicitudes={solicitudesFiltradas} mesActual={mesActual} setMesActual={setMesActual} onVerDetalle={handleVerDetalle} />}
      {vistaActual === 'lista' && <VistaLista solicitudes={solicitudesFiltradas} onVerDetalle={handleVerDetalle} />}
      
      {/* Modal Nueva Solicitud */}
      <ModalNuevaSolicitudInforme
        isOpen={modalNuevaSolicitudOpen}
        onClose={() => setModalNuevaSolicitudOpen(false)}
        onSubmit={handleNuevaSolicitud}
      />
      
      {/* Modal Detalle Solicitud */}
      <ModalDetalleSolicitudInforme
        isOpen={modalDetalleOpen}
        onClose={() => setModalDetalleOpen(false)}
        solicitud={solicitudSeleccionada}
        onCambiarEtapa={handleCambiarEtapa}
        onAgregarComentario={handleAgregarComentario}
      />
    </div>
  );
}

interface VistaTimelineProps {
  solicitudes: SolicitudInforme[];
  onVerDetalle: (solicitud: SolicitudInforme) => void;
}

function VistaTimeline({ solicitudes, onVerDetalle }: VistaTimelineProps) {
  // Ordenar por fecha límite
  const solicitudesOrdenadas = [...solicitudes].sort((a, b) => 
    new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime()
  );

  return (
    <CardSIGL className="bg-white border border-gray-200 p-6">
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
                  <BadgeSIGL
                    className="text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: semaforoColor, color: '#FFFFFF' }}
                  >
                    {diasRestantes} día{diasRestantes !== 1 ? 's' : ''}
                  </BadgeSIGL>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                  <div>
                    <span className="text-gray-600">Responsable:</span>
                    <p className="font-semibold text-gray-900">{solicitud.responsable}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Fecha límite:</span>
                    <p className="font-semibold text-gray-900">
                      {new Date(solicitud.fechaVencimiento).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onVerDetalle(solicitud)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 hover:shadow-md active:scale-95"
                    style={{ 
                      background: '#003DA5', 
                      color: '#FFFFFF',
                      border: 'none'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#2962FF'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#003DA5'}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Ver Detalle
                  </button>
                  <button
                    onClick={() => toast.info('Documentos', { description: solicitud.id })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 hover:shadow-md active:scale-95"
                    style={{ 
                      background: '#FFFFFF', 
                      color: '#003DA5',
                      border: '1.5px solid #003DA5'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#E0EDFF';
                      e.currentTarget.style.borderColor = '#2962FF';
                      e.currentTarget.style.color = '#2962FF';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#FFFFFF';
                      e.currentTarget.style.borderColor = '#003DA5';
                      e.currentTarget.style.color = '#003DA5';
                    }}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Documentos
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </CardSIGL>
  );
}

interface VistaCalendarioProps {
  solicitudes: SolicitudInforme[];
  mesActual: Date;
  setMesActual: (date: Date) => void;
  onVerDetalle: (solicitud: SolicitudInforme) => void;
}

function VistaCalendario({ solicitudes, mesActual, setMesActual, onVerDetalle }: VistaCalendarioProps) {
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
    <CardSIGL className="bg-white border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg capitalize" style={{ color: '#003DA5' }}>
          {nombreMes}
        </h3>
        <div className="flex items-center gap-2">
          <ButtonSIGL onClick={mesAnterior} size="sm" variant="outline">
            <ChevronLeft className="w-4 h-4" />
          </ButtonSIGL>
          <ButtonSIGL onClick={mesSiguiente} size="sm" variant="outline">
            <ChevronRight className="w-4 h-4" />
          </ButtonSIGL>
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
            const fechaVencimiento = new Date(s.fechaVencimiento);
            return fechaVencimiento.getDate() === dia &&
                   fechaVencimiento.getMonth() === mesActual.getMonth() &&
                   fechaVencimiento.getFullYear() === mesActual.getFullYear();
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
                      onClick={() => onVerDetalle(s)}
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
    </CardSIGL>
  );
}

interface VistaListaProps {
  solicitudes: SolicitudInforme[];
  onVerDetalle: (solicitud: SolicitudInforme) => void;
}

function VistaLista({ solicitudes, onVerDetalle }: VistaListaProps) {
  return (
    <CardSIGL className="bg-white border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">ID</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Asunto</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Responsable</th>
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
                  <td className="px-4 py-3 text-sm text-gray-600">{solicitud.responsable}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(solicitud.fechaVencimiento).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <BadgeSIGL
                      className="text-xs font-bold"
                      style={{ backgroundColor: semaforoColor, color: '#FFFFFF' }}
                    >
                      {solicitud.diasRestantes} día{solicitud.diasRestantes !== 1 ? 's' : ''}
                    </BadgeSIGL>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{solicitud.etapa}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onVerDetalle(solicitud)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 hover:shadow-md active:scale-95"
                      style={{ 
                        background: '#003DA5', 
                        color: '#FFFFFF',
                        border: 'none'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#2962FF'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#003DA5'}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Ver
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </CardSIGL>
  );
}