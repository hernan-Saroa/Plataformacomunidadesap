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
import { ModalNuevaSolicitudInforme } from './ModalNuevaSolicitudInforme';
import { ModuleInfoTooltip } from '../design-system/ModuleInfoTooltip';
import { ModuleHeader } from '../design-system/ModuleHeader';
import { ModuleMetrics } from '../design-system/ModuleMetrics';
import { ModuleFilters } from '../design-system/ModuleFilters';
import { toast } from 'sonner@2.0.3';
import { legalService } from '../../../../services/api/legal.service';
import { ModalNuevoTermino } from './ModalNuevoTermino';
import { ModalDetalleTermino } from './ModalDetalleTermino';
import { ModalDocumentosTermino } from './ModalDocumentosTermino';
import { VistaArchivados, ItemArchivado, EstadoArchivado } from '../design-system/VistaArchivados';
import { usePermisos, PERMISOS } from '../config/PermisosContext';

// Tipos necesarios
type VistaModulo = 'timeline' | 'calendario' | 'lista' | 'archivados';



export function ModuloTerminosInformesV3() {
  // ========== PERMISOS ==========
  const { usuario } = usePermisos();
  
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
  const [modalNuevaSolicitudOpen, setModalNuevaSolicitudOpen] = useState(false);
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<SolicitudInforme | null>(null);

  const [loading, setLoading] = useState(true);

  // NOTA: Las notificaciones de términos urgentes/críticos se manejan
  // ahora centralmente en GestionLegalFull para mayor consistencia

  const handleOpenDetalle = (solicitud: SolicitudInforme) => {
    setSelectedSolicitud(solicitud);
    setModalDetalleOpen(true);
  };
  
  // ✅ Estado para items archivados/eliminados
  const [itemsArchivados, setItemsArchivados] = useState<ItemArchivado[]>([
    {
      id: 'SI-2024-999',
      codigo: 'SI-2024-999',
      nombre: 'Informe Gestión Jurídica Vigencia 2024 - Contraloría General de la República',
      tipo: 'Solicitud de Informe',
      estado: 'ARCHIVADO',
      fechaArchivado: new Date('2024-12-15T16:30:00'),
      usuarioArchivo: 'Dra. Ana María Rodríguez',
      motivoArchivo: 'Informe entregado exitosamente a la Contraloría. Oficio de recibido CGR-REC-2024-5678. Término cumplido dentro del plazo legal',
      metadatos: {
        'Tipo Informe': 'Gestión Jurídica Anual',
        'Solicitante': 'Contraloría General de la República',
        'Radicado': 'CGR-REQ-2024-1234',
        'Responsable': 'Dra. Ana María Rodríguez',
        'Fecha Solicitud': '10/11/2024',
        'Fecha Entrega': '15/12/2024',
        'Término': '35 días',
        'Cumplimiento': 'Dentro del término legal'
      }
    },
    {
      id: 'SI-2024-888',
      codigo: 'SI-2024-888',
      nombre: 'Respuesta Derecho de Petición sobre contratos 2023-2024 - Ciudadano Juan Pérez',
      tipo: 'Solicitud de Informe',
      estado: 'ARCHIVADO',
      fechaArchivado: new Date('2024-11-20T14:15:00'),
      usuarioArchivo: 'Dr. Carlos Méndez',
      motivoArchivo: 'Derecho de petición respondido dentro del término legal de 15 días. Notificación enviada por correo certificado y correo electrónico',
      metadatos: {
        'Tipo Informe': 'Derecho de Petición',
        'Solicitante': 'Juan Pérez González',
        'Radicado': 'DP-2024-0456',
        'Responsable': 'Dr. Carlos Méndez',
        'Fecha Solicitud': '10/11/2024',
        'Fecha Respuesta': '20/11/2024',
        'Término Legal': '15 días hábiles',
        'Estado': 'Respondido en término'
      }
    },
    {
      id: 'SI-2024-777',
      codigo: 'SI-2024-777',
      nombre: 'Informe Procesos Disciplinarios Trimestre III 2024 - Procuraduría General',
      tipo: 'Solicitud de Informe',
      estado: 'ARCHIVADO',
      fechaArchivado: new Date('2024-10-28T10:45:00'),
      usuarioArchivo: 'Dr. Jorge Silva',
      motivoArchivo: 'Informe trimestral entregado a Procuraduría. Oficio PGN-REC-2024-3456. Incluye estadísticas y estado de 12 procesos disciplinarios activos',
      metadatos: {
        'Tipo Informe': 'Trimestral Procesos Disciplinarios',
        'Solicitante': 'Procuraduría General de la Nación',
        'Radicado': 'PGN-REQ-2024-0789',
        'Responsable': 'Dr. Jorge Silva',
        'Período': 'Julio - Septiembre 2024',
        'Fecha Entrega': '28/10/2024',
        'Total Procesos': '12',
        'Estado': 'Entregado'
      }
    },
    {
      id: 'SI-2024-666',
      codigo: 'SI-2024-666',
      nombre: 'Concepto Jurídico sobre licitación pública obra civil - Dirección Administrativa',
      tipo: 'Solicitud de Informe',
      estado: 'ARCHIVADO',
      fechaArchivado: new Date('2024-09-15T15:20:00'),
      usuarioArchivo: 'Dra. Patricia Ruiz',
      motivoArchivo: 'Concepto jurídico emitido y aprobado por el Director Administrativo. Proceso licitatorio ajustado conforme a las recomendaciones jurídicas',
      metadatos: {
        'Tipo Informe': 'Concepto Jurídico',
        'Solicitante': 'Dirección Administrativa y Financiera',
        'Radicado Interno': 'CJ-2024-045',
        'Responsable': 'Dra. Patricia Ruiz',
        'Tema': 'Licitación Pública - Obra Civil',
        'Fecha Concepto': '15/09/2024',
        'Recomendación': 'Favorable con ajustes',
        'Estado': 'Implementado'
      }
    },
    {
      id: 'SI-2023-555',
      codigo: 'SI-2023-555',
      nombre: 'Informe Estado Procesos Judiciales 2023 - Consejo Superior ESAP',
      tipo: 'Solicitud de Informe',
      estado: 'ELIMINADO',
      fechaArchivado: new Date('2024-08-10T11:30:00'),
      usuarioArchivo: 'Admin Sistema',
      motivoArchivo: 'Informe duplicado. El informe oficial fue radicado bajo código SI-2023-556. Error en el proceso de radicación inicial',
      metadatos: {
        'Tipo Informe': 'Estado Procesos Judiciales',
        'Motivo Eliminación': 'Registro duplicado',
        'Informe Oficial': 'SI-2023-556',
        'Fecha Detección': '10/08/2024'
      }
    },
    {
      id: 'SI-2024-444',
      codigo: 'SI-2024-444',
      nombre: 'Respuesta Tutela radicada por docente sobre evaluación docente - Juzgado Laboral',
      tipo: 'Solicitud de Informe',
      estado: 'ARCHIVADO',
      fechaArchivado: new Date('2024-07-22T09:00:00'),
      usuarioArchivo: 'Dr. Luis Gómez',
      motivoArchivo: 'Respuesta a tutela entregada dentro del término de 2 días. Juzgado 5° Laboral de Bogotá. Fallo favorable a la ESAP',
      metadatos: {
        'Tipo Informe': 'Respuesta Tutela',
        'Solicitante': 'Juzgado 5° Laboral del Circuito de Bogotá',
        'Radicado Judicial': 'T-2024-0123',
        'Responsable': 'Dr. Luis Gómez',
        'Fecha Notificación': '20/07/2024',
        'Fecha Respuesta': '22/07/2024',
        'Término': '2 días hábiles',
        'Fallo': 'Favorable a ESAP'
      }
    },
    {
      id: 'SI-2024-333',
      codigo: 'SI-2024-333',
      nombre: 'Certificado de antecedentes disciplinarios para licitación - Empresa ABC S.A.S.',
      tipo: 'Solicitud de Informe',
      estado: 'ARCHIVADO',
      fechaArchivado: new Date('2024-06-18T13:45:00'),
      usuarioArchivo: 'Dra. Carolina Pérez',
      motivoArchivo: 'Certificado expedido y enviado al solicitante por correo electrónico. Término de 5 días hábiles cumplido',
      metadatos: {
        'Tipo Informe': 'Certificado Antecedentes Disciplinarios',
        'Solicitante': 'Empresa ABC S.A.S.',
        'Radicado': 'CERT-2024-089',
        'Responsable': 'Dra. Carolina Pérez',
        'Fecha Solicitud': '13/06/2024',
        'Fecha Expedición': '18/06/2024',
        'Resultado': 'Sin antecedentes',
        'Medio Notificación': 'Correo electrónico'
      }
    },
    {
      id: 'SI-2024-222',
      codigo: 'SI-2024-222',
      nombre: 'Informe Cumplimiento Normativa Contratación - Auditoría Externa',
      tipo: 'Solicitud de Informe',
      estado: 'ARCHIVADO',
      fechaArchivado: new Date('2024-05-25T16:10:00'),
      usuarioArchivo: 'Dr. Roberto Vargas',
      motivoArchivo: 'Informe de cumplimiento entregado a Auditoría Externa. Evaluación favorable sin hallazgos críticos. Proceso de auditoría cerrado',
      metadatos: {
        'Tipo Informe': 'Cumplimiento Normativa Contratación',
        'Solicitante': 'Revisoría Fiscal - Auditoría Externa',
        'Radicado': 'AE-2024-012',
        'Responsable': 'Dr. Roberto Vargas',
        'Período Evaluado': 'Enero - Abril 2024',
        'Fecha Entrega': '25/05/2024',
        'Resultado': 'Favorable sin hallazgos',
        'Estado Auditoría': 'Cerrada'
      }
    }
  ]);

  // ✅ Función para restaurar una solicitud archivada
  const handleRestaurar = async (itemId: string) => {
    console.log('Restaurando solicitud de informe:', itemId);
    setItemsArchivados(prev => prev.filter(item => item.id !== itemId));
    toast.success('Solicitud restaurada exitosamente');
  };

  // ✅ Función para eliminar permanentemente una solicitud
  const handleEliminarPermanente = async (itemId: string) => {
    console.log('Eliminando permanentemente solicitud:', itemId);
    setItemsArchivados(prev => prev.filter(item => item.id !== itemId));
    toast.success('Solicitud eliminada permanentemente');
  };
  
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
        moduloOrigen: t.origenModulo, // Add this for filter compatibility
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

  // NOTA: La generación de notificaciones para términos urgentes/críticos
  // ahora se maneja en GestionLegalFull para que se generen al entrar al módulo

  // Verificar si hay una redirección desde notificaciones para resaltar un término
  useEffect(() => {
    if (!loading && solicitudes.length > 0) {
      const highlightId = sessionStorage.getItem('highlightTerminoId');

      if (highlightId) {
        // Buscar el término
        const termino = solicitudes.find(t => t.id === highlightId || t.metadata?.uuid === highlightId);

        if (termino) {
          // Filtrar visualmente para mostrar solo este término o resaltar
          setBusqueda(termino.id);

          // Abrir detalle automáticamente
          handleVerDetalle(termino);

          // Limpiar storage
          sessionStorage.removeItem('highlightTerminoId');

          toast.info('Término localizado', {
            description: `Mostrando detalles del término ${termino.id}`
          });
        }
      }
    }
  }, [loading, solicitudes]);

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
            { label: 'Lista', icon: <List className="w-4 h-4" />, value: 'lista' },
            { label: 'Archivados', icon: <FileText className="w-4 h-4" />, value: 'archivados' }
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
      {vistaActual === 'timeline' && <VistaTimeline solicitudes={solicitudesFiltradas} onVerDetalle={handleVerDetalle} />}
      {vistaActual === 'calendario' && <VistaCalendario solicitudes={solicitudesFiltradas} mesActual={mesActual} setMesActual={setMesActual} onVerDetalle={handleVerDetalle} />}
      {vistaActual === 'lista' && <VistaLista solicitudes={solicitudesFiltradas} onVerDetalle={handleVerDetalle} />}
      {vistaActual === 'archivados' && (
        <VistaArchivados
          items={itemsArchivados}
          moduloNombre="Términos e Informes"
          onRestaurar={handleRestaurar}
          onEliminarPermanente={handleEliminarPermanente}
        />
      )}
      
      {/* Modal Nueva Solicitud */}
      <ModalNuevaSolicitudInforme
        isOpen={modalNuevaSolicitudOpen}
        onClose={() => setModalNuevaSolicitudOpen(false)}
        onSubmit={handleNuevaSolicitud}
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

