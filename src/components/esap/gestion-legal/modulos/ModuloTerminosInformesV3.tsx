/**
 * ModuloTerminosInformesV3 - MOD-05: Términos para Informes
 * DISEÑO CALENDAR + TIMELINE VIEW
 */

import React, { useState, useMemo, useEffect } from 'react';
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
import { Button } from '../../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { SolicitudInforme, EtapaSolicitudInforme } from '../core/types';
import { solicitudesConsolidadas, estadisticasTerminosInformes } from '../data/datosSolicitudesInformes';
import { ModalDetalleSolicitudInforme } from './ModalDetalleSolicitudInforme';

import { ModuleInfoTooltip } from '../design-system/ModuleInfoTooltip';
import { ModuleHeader } from '../design-system/ModuleHeader';
import { ModuleMetrics } from '../design-system/ModuleMetrics';
import { ModuleFilters } from '../design-system/ModuleFilters';
import { toast } from 'sonner@2.0.3';
import { legalService } from '../../../../services/api/legal.service';
import { ModalNuevoTermino } from './ModalNuevoTermino';
import { ModalDetalleTermino } from './ModalDetalleTermino';
import { ModalDocumentosTermino } from './ModalDocumentosTermino';

// Tipos necesarios
type VistaModulo = 'timeline' | 'calendario' | 'lista';



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
  // Removed ModalNuevoTermino state
  const [modalDocsOpen, setModalDocsOpen] = useState(false);
  const [selectedSolicitud, setSelectedSolicitud] = useState<SolicitudInforme | null>(null);

  // Estados para modales
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<SolicitudInforme | null>(null);

  const [loading, setLoading] = useState(true);

  const handleOpenDetalle = (solicitud: SolicitudInforme) => {
    setSelectedSolicitud(solicitud);
    setModalDetalleOpen(true);
  };

  const handleOpenDocumentos = (solicitud?: SolicitudInforme) => {
    if (solicitud) {
      setSelectedSolicitud(solicitud);
      setModalDocsOpen(true);
    } else {
      toast.info('Selecciona un término para ver sus documentos');
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await legalService.getTerminosListado();
      // Map backend TerminoProcesal to frontend SolicitudInforme
      const mapped: SolicitudInforme[] = data.map((t: any) => ({
        id: t.numeroRadicado || t.id.substring(0, 8), // Show Radicado
        etapa: t.estado as any,
        tipoInforme: t.origenModulo,
        enteSolicitante: t.origenModulo === 'MANUAL' ? 'Usuario' : 'Sistema',
        radicadoExterno: t.numeroRadicado || 'N/A',
        asunto: t.nombreActuacion,
        descripcion: t.observaciones || '', // Now contains Facts
        responsable: t.responsableNombre || t.responsableId || 'Sin asignar',
        fechaSolicitud: new Date(t.fechaBase),
        fechaVencimiento: new Date(t.fechaVencimiento),
        diasTotales: t.diasTermino,
        diasRestantes: t.calculo?.diasRestantes ?? 0,
        datosRequeridos: [],
        metadata: { uuid: t.id } // Store real UUID here
      }));
      setSolicitudes(mapped);
    } catch (error) {
      console.error('Error fetching terminos:', error);
      toast.error('Error al cargar términos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);



  // Estados para modales


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

    // Always sort by urgency (less days remaining first)
    return resultado.sort((a, b) => a.diasRestantes - b.diasRestantes);
  }, [solicitudes, busqueda, filtroSemaforo, solicitudes, filtroEtapa, filtroModuloOrigen]);

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
        buttons={[]}
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
              // ... existing tooltip content ...
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
      {loading ? (
        <div className="flex justify-center p-8">Cargando términos...</div>
      ) : (
        <>
          {vistaActual === 'timeline' && (
            <VistaTimeline
              solicitudes={solicitudesFiltradas}
              onVerDetalle={handleVerDetalle}
              onVerDocumentos={handleOpenDocumentos}
            />
          )}
          {vistaActual === 'calendario' && (
            <VistaCalendario
              solicitudes={solicitudesFiltradas}
              mesActual={mesActual}
              setMesActual={setMesActual}
              onVerDetalle={handleVerDetalle}
            />
          )}
          {vistaActual === 'lista' && (
            <VistaLista
              solicitudes={solicitudesFiltradas}
              onVerDetalle={handleVerDetalle}
              onVerDocumentos={handleOpenDocumentos}
            />
          )}
        </>
      )}

      {/* ModalNuevoTermino removed */}

      <ModalDetalleTermino
        open={modalDetalleOpen}
        onOpenChange={setModalDetalleOpen}
        solicitud={selectedSolicitud}
      />

      {/* We can use this modal for specific calls if we lift state later */}
      <ModalDocumentosTermino
        open={modalDocsOpen}
        onOpenChange={setModalDocsOpen}
        terminoId={selectedSolicitud?.metadata?.uuid || null}
        radicado={selectedSolicitud?.id}
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
  onVerDetalle: (s: SolicitudInforme) => void;
  onVerDocumentos: (s: SolicitudInforme) => void;
}

function VistaTimeline({ solicitudes, onVerDetalle, onVerDocumentos }: VistaTimelineProps) {
  // Ordenar por fecha límite
  const solicitudesOrdenadas = [...solicitudes].sort((a, b) =>
    new Date(a.fechaLimite).getTime() - new Date(b.fechaLimite).getTime()
  );

  return (
    <CardSIGL className="bg-white border border-gray-200 p-6">
      {/* ... (keep header) ... */}
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
                  <ButtonSIGL
                    onClick={() => onVerDetalle(solicitud)}
                    size="sm"
                    className="text-xs"
                    style={{ background: '#003DA5', color: '#FFFFFF' }}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Ver Detalle
                  </ButtonSIGL>
                  <ButtonSIGL
                    onClick={() => toast.info('Documentos', { description: solicitud.id })}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    <FileText className="w-3 h-3 mr-1" />
                    Documentos
                  </ButtonSIGL>
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
  // ... (keep existing logic)
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
              className={`aspect-square border rounded-lg p-1 text-xs ${esHoy ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                } ${solicitudesDia.length > 0 ? 'bg-red-50' : ''}`}
              onClick={() => solicitudesDia.length > 0 && onVerDetalle(solicitudesDia[0])}
            >
              <div className="font-semibold text-gray-700 mb-1">{dia}</div>
              {solicitudesDia.length > 0 && (
                <div className="space-y-0.5 cursor-pointer">
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
  onVerDocumentos: (s: SolicitudInforme) => void;
  onVerDetalle: (solicitud: SolicitudInforme) => void;
}

function VistaLista({ solicitudes, onVerDetalle, onVerDocumentos }: VistaListaProps) {
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
                    <ButtonSIGL
                      onClick={() => onVerDetalle(solicitud)}
                      size="sm"
                      style={{ background: '#003DA5', color: '#FFFFFF' }}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Ver
                    </ButtonSIGL>
                    <Button
                      onClick={() => onVerDocumentos(solicitud)}
                      size="sm"
                      variant="outline"
                      title="Ver Documentos"
                    >
                      <FileText className="w-3 h-3" />
                    </Button>
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

