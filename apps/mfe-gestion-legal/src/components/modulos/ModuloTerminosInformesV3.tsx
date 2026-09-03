/**
 * ModuloTerminosInformesV3 - MOD-05: Términos para Informes
 * DISEÑO CALENDAR + TIMELINE VIEW
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import {
  Calendar, Search, Filter, FileText, AlertTriangle, Clock, CheckCircle,
  List, Calendar as CalendarIcon, TrendingUp, Link, Plus, Eye,
  ChevronLeft, ChevronRight, CalendarDays, Archive, Trash2, Download
} from 'lucide-react';
import { CardSIGL } from '../design-system/CardSIGL';
import { ButtonSIGL } from '../design-system/ButtonSIGL';
import { BadgeSIGL } from '../design-system/BadgeSIGL';
import { Input } from '@esap-mfe/shared-ui/input';
import { Button } from '@esap-mfe/shared-ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@esap-mfe/shared-ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@esap-mfe/shared-ui/dialog';
import { SolicitudInforme, EtapaSolicitudInforme } from '../core/types';
import { solicitudesConsolidadas, estadisticasTerminosInformes } from '../data/datosSolicitudesInformes';
import { ModalDetalleSolicitudInforme } from './ModalDetalleSolicitudInforme';

import { ModuleInfoTooltip } from '../design-system/ModuleInfoTooltip';
import { ModuleHeader } from '../design-system/ModuleHeader';
import { ModuleMetrics } from '../design-system/ModuleMetrics';
import { ModuleFilters } from '../design-system/ModuleFilters';
import { toast } from 'sonner';
import { legalService } from '../../../../services/api/legal.service';
import { authService } from '../../../../services/api/authService';
import { ModalNuevoTermino } from './ModalNuevoTermino';
import { ModalDetalleTermino } from './ModalDetalleTermino';
import { ModalDocumentosTermino } from './ModalDocumentosTermino';
import { VistaArchivados, ItemArchivado, EstadoArchivado } from '../design-system/VistaArchivados';
import { usePermisos, PERMISOS } from '../config/PermisosContext';

// Tipos necesarios
type VistaModulo = 'timeline' | 'calendario' | 'lista' | 'archivados';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Evita mostrar un UUID crudo como "responsable" cuando el backend no pudo resolver el nombre. */
function nombreLegible(valor?: string | null): string | null {
  if (!valor || UUID_REGEX.test(valor)) return null;
  return valor;
}

/**
 * Texto y color de semáforo únicos para "días restantes", reutilizados por las
 * 3 vistas (Timeline, Calendario, Lista). Antes cada vista mostraba el número
 * crudo (incluyendo negativos, ej. "-3 días") sin distinguir un vencido de uno
 * próximo a vencer.
 */
/**
 * Formatea una fecha de vencimiento como DD/MM/AAAA usando los componentes UTC.
 *
 * Los vencimientos se generan/guardan como fecha calendario pura (sin hora
 * significativa) y llegan del backend como instante UTC-medianoche
 * (ej. "2026-09-15T00:00:00.000Z"). `toLocaleDateString()` los muestra en la
 * zona horaria del navegador, así que en Colombia (UTC-5) un vencimiento del
 * 15 se veía como 14 — un día atrás. Leer los componentes en UTC evita el corrimiento.
 */
function formatearFechaVencimiento(fecha: Date | string): string {
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return '—';
  const dia = String(d.getUTCDate()).padStart(2, '0');
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${d.getUTCFullYear()}`;
}

/** Convierte el fundamento normativo (norma/contrato/resolución) en un texto legible para las 3 vistas y las exportaciones. */
export function formatearFuenteInformativa(fundamentoNormativo?: Array<{ tipo: string; cita: string }>): string {
  if (!fundamentoNormativo || fundamentoNormativo.length === 0) return 'Sin especificar';
  return fundamentoNormativo
    .filter(f => f.tipo || f.cita)
    .map(f => [f.tipo, f.cita].filter(Boolean).join(': '))
    .join('; ') || 'Sin especificar';
}

function formatearDiasRestantes(diasRestantes: number): { texto: string; color: string; bg: string } {
  if (diasRestantes < 0) {
    return { texto: `Vencido hace ${Math.abs(diasRestantes)} día${Math.abs(diasRestantes) !== 1 ? 's' : ''}`, color: '#DC2626', bg: '#FEE2E2' };
  }
  if (diasRestantes <= 2) {
    return { texto: `${diasRestantes} día${diasRestantes !== 1 ? 's' : ''}`, color: '#DC2626', bg: '#FEE2E2' };
  }
  if (diasRestantes <= 5) {
    return { texto: `${diasRestantes} día${diasRestantes !== 1 ? 's' : ''}`, color: '#F59E0B', bg: '#FEF3C7' };
  }
  return { texto: `${diasRestantes} día${diasRestantes !== 1 ? 's' : ''}`, color: '#10B981', bg: '#D1FAE5' };
}

/** Agrupa solicitudes por período (mes-año de vencimiento) para "VistaLista". */
function agruparPorPeriodo(solicitudes: SolicitudInforme[]): Array<{ clave: string; etiqueta: string; items: SolicitudInforme[] }> {
  const grupos: Record<string, SolicitudInforme[]> = {};
  for (const s of solicitudes) {
    const fecha = new Date(s.fechaVencimiento);
    const clave = isNaN(fecha.getTime()) ? 'sin-fecha' : `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    (grupos[clave] ||= []).push(s);
  }
  return Object.entries(grupos)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([clave, items]) => {
      if (clave === 'sin-fecha') return { clave, etiqueta: 'Sin fecha de vencimiento', items };
      const [anio, mes] = clave.split('-').map(Number);
      const etiqueta = new Date(anio, mes - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      return { clave, etiqueta: etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1), items };
    });
}



export function ModuloTerminosInformesV3() {
  // ========== PERMISOS ==========
  const { usuario } = usePermisos();
  const esMonitoreoGestionLegal = authService.hasRole('MONITOREO_GESTION_LEGAL');
  const esResuelveGestionLegal = authService.hasRole('RESUELVE_GESTION_LEGAL');
  const canModifyTerminos = !esMonitoreoGestionLegal;
  const canEnviarRecordatorio = !esMonitoreoGestionLegal && !esResuelveGestionLegal;

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

  // Estados para Modal de Eliminar
  const [modalEliminarOpen, setModalEliminarOpen] = useState(false);
  const [terminoAEliminar, setTerminoAEliminar] = useState<{ id: string, permanente: boolean } | null>(null);
  const [modalExportarOpen, setModalExportarOpen] = useState(false);

  const [loading, setLoading] = useState(true);

  // NOTA: Las notificaciones de términos urgentes/críticos se manejan
  // ahora centralmente en GestionLegalFull para mayor consistencia

  const handleOpenDetalle = (solicitud: SolicitudInforme) => {
    setSelectedSolicitud(solicitud);
    setModalDetalleOpen(true);
  };

  // ✅ Estado para items archivados/eliminados derivados de las solicitudes reales
  const itemsArchivados = useMemo(() => {
    return solicitudes
      .filter(s => s.etapa === 'CUMPLIDO')
      .map(s => ({
        id: s.id,
        codigo: s.id,
        nombre: s.asunto || 'Sin título',
        tipo: s.tipoInforme || 'Término',
        estado: 'ARCHIVADO',
        fechaArchivado: s.fechaVencimiento ? new Date(s.fechaVencimiento) : new Date(),
        usuarioArchivo: s.responsable || 'Sistema',
        motivoArchivo: s.descripcion || 'Término cumplido y archivado.',
        metadatos: {
          'Módulo': s.moduloOrigen || 'N/A',
          'Responsable': s.responsable,
        }
      }));
  }, [solicitudes]);

  // ✅ Función para restaurar una solicitud archivada
  const handleRestaurar = async (itemId: string) => {
    try {
      const backendId = solicitudes.find(s => s.id === itemId)?.metadata?.uuid || itemId;
      await legalService.updateTermino(backendId, { estado: 'PENDIENTE', closedAt: null });
      toast.success('Término restaurado exitosamente');
      fetchData();
    } catch (e) {
      toast.error('Error al restaurar término');
    }
  };

  // ✅ Función para eliminar permanentemente una solicitud desde "Archivados"
  const handleEliminarPermanente = async (itemId: string) => {
    setTerminoAEliminar({ id: itemId, permanente: true });
    setModalEliminarOpen(true);
  };

  const ejecutarEliminacion = async () => {
    if (!terminoAEliminar) return;
    try {
      const { id, permanente } = terminoAEliminar;
      const backendId = solicitudes.find(s => s.id === id)?.metadata?.uuid || id;
      await legalService.eliminarTermino(backendId);
      toast.success(permanente ? 'Término eliminado permanentemente' : 'Término eliminado');
      setModalDetalleOpen(false);
      setModalEliminarOpen(false);
      fetchData();
    } catch (e) {
      toast.error('Error al eliminar término');
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
        enteSolicitante: t.enteSolicitante || (t.origenModulo === 'MANUAL' ? 'Usuario' : 'Sistema'),
        destinatario: t.destinatario || '',
        fundamentoNormativo: t.fundamentoNormativo || [],
        radicadoExterno: t.numeroRadicado || 'N/A',
        asunto: t.nombreActuacion,
        descripcion: t.observaciones ? t.observaciones.split('\n').filter((l: string) => !l.startsWith('[ARCHIVO_ADJUNTO]')).join('\n').trim() : '', 

        responsable: nombreLegible(t.responsableNombre) || nombreLegible(t.responsableId) || 'Sin asignar',
        responsableId: t.responsableId || null, // Preserve UUID for filtering
        fechaSolicitud: new Date(t.fechaBase),
        fechaVencimiento: new Date(t.fechaVencimiento),
        diasTotales: t.diasTermino,
        diasRestantes: t.calculo?.diasRestantes ?? 0,
        datosRequeridos: [],
        horasAnticipacionAlertaPersonalizada: t.horasAnticipacionAlertaPersonalizada ?? null,
        recordatorioManualHorasAnticipacion: t.recordatorioManualHorasAnticipacion ?? null,
        metadata: { uuid: t.id } // Store real UUID here
      }));

      // ✅ Filtrado por rol RESUELVE_GESTION_LEGAL
      const currentUser = authService.getCurrentUser() as any;
      const isResuelve = authService.hasRole('RESUELVE_GESTION_LEGAL');
      let mappedFiltrado: SolicitudInforme[] = mapped;

      if (isResuelve && currentUser) {
        const cuEmail: string = (
          currentUser.email ??
          currentUser.person?.email ??
          currentUser.mail ??
          ''
        ).toLowerCase();
        const cuName: string = (
          currentUser.fullName ??
          currentUser.full_name ??
          currentUser.name ??
          (currentUser.firstName || currentUser.first_name
            ? `${currentUser.firstName ?? currentUser.first_name ?? ''} ${currentUser.lastName ?? currentUser.last_name ?? ''}`.trim()
            : null) ??
          (currentUser.person?.first_name
            ? `${currentUser.person.first_name ?? ''} ${currentUser.person.last_name ?? ''}`.trim()
            : null) ??
          ''
        ).toLowerCase();
        const cuIds = new Set<string>(
          [
            currentUser.id,
            currentUser.id_user,
            currentUser.user?.id,
            currentUser.user?.id_user,
            currentUser.person?.id,
          ].filter(Boolean)
        );

        console.log('[DEBUG RESUELVE TERMINOS] email:', cuEmail, '| nombre:', cuName, '| ids:', [...cuIds]);

        mappedFiltrado = mapped.filter((t: any) => {
          // 1. Match por responsableId (UUID) — más preciso
          if (t.responsableId && cuIds.has(t.responsableId)) return true;
          // 2. Match por nombre (responsable texto)
          const tNombre = (t.responsable || '').toLowerCase();
          if (cuName && tNombre && tNombre === cuName) return true;
          // 3. Match por email si el responsable coincide
          if (cuEmail && tNombre && tNombre === cuEmail) return true;
          return false;
        });
        console.log('[DEBUG RESUELVE TERMINOS] filtrados:', mappedFiltrado.length, 'de', mapped.length);
      }

      setSolicitudes(mappedFiltrado);
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
      description: `Término ${id} movido a ${nuevaEtapa}`,
      icon: <CheckCircle className="w-4 h-4" />
    });
  };

  const handleAgregarComentario = async (id: string, comentario: string) => {
    try {
      const solicitud = solicitudes.find(s => s.id === id);
      if (!solicitud) return;

      // ✅ Resolver nombre de usuario de forma robusta (mismo patrón que el resto del sistema)
      const currentUser = authService.getCurrentUser() as any;
      const userName = (
        currentUser?.fullName ??
        currentUser?.full_name ??
        currentUser?.nombre ??
        (currentUser?.firstName || currentUser?.first_name
          ? `${currentUser?.firstName ?? currentUser?.first_name ?? ''} ${currentUser?.lastName ?? currentUser?.last_name ?? ''}`.trim()
          : null) ??
        (currentUser?.person?.first_name
          ? `${currentUser?.person?.first_name ?? ''} ${currentUser?.person?.last_name ?? ''}`.trim()
          : null) ??
        currentUser?.email ??
        'Usuario'
      );

      // Formato compatible con parseObservaciones: "[fecha hora] Nombre:\nTexto"
      const newCommentText = `[${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO')}] ${userName}:\n${comentario}`;
      const updatedDescripcion = solicitud.descripcion
        ? `${solicitud.descripcion}\n\n---\n${newCommentText}`
        : newCommentText;

      const backendId = solicitud.metadata?.uuid || solicitud.id;

      // Actualización optimista inmediata en UI
      setSolicitudes(prev => prev.map(sol => sol.id === id ? { ...sol, descripcion: updatedDescripcion } : sol));
      if (solicitudSeleccionada?.id === id) {
        setSolicitudSeleccionada(prev => prev ? { ...prev, descripcion: updatedDescripcion } : null);
      }

      // IMPORTANTE: Se envía como "nuevoComentario" para que el backend lo concatene de forma segura sin borrar metadatos [ARCHIVO_ADJUNTO]
      await legalService.updateTermino(backendId, { nuevoComentario: newCommentText });
      toast.success('Comentario guardado correctamente');
    } catch (error) {
      console.error('Error guardando comentario:', error);
      toast.error('Error al guardar el comentario. Intente nuevamente.');
      // Revertir en caso de error
      fetchData();
    }
  };

  const handleArchivar = async (id: string) => {
    try {
      const solicitud = solicitudes.find(s => s.id === id);
      if (!solicitud) return;
      const backendId = solicitud.metadata?.uuid || solicitud.id;
      await legalService.updateTermino(backendId, { estado: 'CUMPLIDO', closedAt: new Date() });
      toast.success('El término ha sido archivado (CUMPLIDO)');
      setModalDetalleOpen(false);
      fetchData();
    } catch (e) {
      toast.error('Error al archivar el término');
    }
  };

  const handleEliminar = async (id: string) => {
    setTerminoAEliminar({ id: id, permanente: false });
    setModalEliminarOpen(true);
  };

  const solicitudesFiltradas = useMemo(() => {
    let resultado = [...solicitudes].filter(s => s.etapa !== 'CUMPLIDO' && s.etapa !== 'ELIMINADO');

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
  }, [solicitudes, busqueda, filtroSemaforo, filtroEtapa, filtroModuloOrigen]);

  const solicitudesCriticas = solicitudesFiltradas.filter(s => s.diasRestantes <= 2).length;
  const solicitudesUrgentes = solicitudesFiltradas.filter(s => s.diasRestantes > 2 && s.diasRestantes <= 5).length;
  const solicitudesEnTermino = solicitudesFiltradas.filter(s => s.diasRestantes > 5).length;

  /** Construye el PDF del calendario de vencimientos con lo que esté actualmente filtrado/visible. */
  const construirPdfCalendario = (): jsPDF | null => {
    if (solicitudesFiltradas.length === 0) {
      toast.error('No hay términos para exportar con los filtros actuales');
      return null;
    }

    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor('#003DA5');
    doc.rect(0, 0, pageWidth, 20, 'F');
    doc.setTextColor('#FFFFFF');
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('CALENDARIO DE VENCIMIENTOS — TÉRMINOS E INFORMES', pageWidth / 2, 13, { align: 'center' });

    const DIAS_RESTANTES_COL = 6;

    autoTable(doc, {
      startY: 26,
      head: [['ID', 'Nombre de Informe', 'Destinatario de Informe', 'Fuente Informativa', 'Responsable', 'Fecha Límite', 'Días Restantes', 'Estado']],
      body: solicitudesFiltradas.map((s) => [
        s.id,
        s.asunto || 'Sin asunto',
        s.destinatario || 'Sin asignar',
        formatearFuenteInformativa(s.fundamentoNormativo),
        s.responsable,
        formatearFechaVencimiento(s.fechaVencimiento),
        formatearDiasRestantes(s.diasRestantes).texto,
        s.etapa,
      ]),
      theme: 'grid',
      headStyles: { fillColor: '#003DA5', textColor: '#FFFFFF', fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      // Mismo semáforo de colores que ya se usa en pantalla (formatearDiasRestantes),
      // para que el PDF se lea de un vistazo igual que la vista en vivo.
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === DIAS_RESTANTES_COL) {
          const solicitud = solicitudesFiltradas[data.row.index];
          if (solicitud) {
            const { color } = formatearDiasRestantes(solicitud.diasRestantes);
            const [r, g, b] = [color.slice(1, 3), color.slice(3, 5), color.slice(5, 7)].map((h) => parseInt(h, 16));
            data.cell.styles.textColor = [r, g, b];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });

    doc.setFontSize(8);
    doc.setTextColor('#999999');
    doc.text(
      `Generado: ${new Date().toLocaleString('es-CO')} — ${solicitudesFiltradas.length} término(s)`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' },
    );

    return doc;
  };

  const handleExportarPDF = () => {
    const doc = construirPdfCalendario();
    if (!doc) return;
    doc.save(`terminos_informes_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Exportado a PDF exitosamente');
    setModalExportarOpen(false);
  };

  /** Construye el libro Excel de lo actualmente filtrado/visible, con las mismas columnas que el PDF. */
  const construirExcelInformes = async (): Promise<ExcelJS.Workbook | null> => {
    if (solicitudesFiltradas.length === 0) {
      toast.error('No hay términos para exportar con los filtros actuales');
      return null;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Términos e Informes');

    const headers = ['ID', 'Nombre de Informe', 'Destinatario de Informe', 'Fuente Informativa', 'Responsable', 'Fecha Límite', 'Días Restantes', 'Estado'];
    worksheet.columns = [
      { width: 16 }, { width: 40 }, { width: 26 }, { width: 30 }, { width: 22 }, { width: 14 }, { width: 18 }, { width: 14 }
    ];

    headers.forEach((header, index) => {
      const cell = worksheet.getCell(1, index + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003DA5' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    worksheet.getRow(1).height = 22;

    solicitudesFiltradas.forEach((s, index) => {
      const row = worksheet.getRow(index + 2);
      row.getCell(1).value = s.id;
      row.getCell(2).value = s.asunto || 'Sin asunto';
      row.getCell(3).value = s.destinatario || 'Sin asignar';
      row.getCell(4).value = formatearFuenteInformativa(s.fundamentoNormativo);
      row.getCell(5).value = s.responsable;
      row.getCell(6).value = formatearFechaVencimiento(s.fechaVencimiento);
      row.getCell(7).value = formatearDiasRestantes(s.diasRestantes).texto;
      row.getCell(8).value = s.etapa;

      const fillColor = index % 2 === 0 ? 'FFFFFFFF' : 'FFF5F5F5';
      for (let col = 1; col <= 8; col++) {
        row.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
      }
    });

    return workbook;
  };

  const handleExportarExcel = async () => {
    const workbook = await construirExcelInformes();
    if (!workbook) return;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `terminos_informes_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.success('Exportado a Excel exitosamente');
    setModalExportarOpen(false);
  };

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
          ...(canModifyTerminos ? [{
            label: 'Nuevo Informe',
            labelMobile: 'Nuevo',
            icon: <Plus className="w-4 h-4" />,
            onClick: () => setModalNuevaSolicitudOpen(true),
            variant: 'primary' as const
          }] : []),
          {
            label: 'Exportar',
            labelMobile: 'Exportar',
            icon: <Download className="w-4 h-4" />,
            onClick: () => setModalExportarOpen(true),
            variant: 'outline' as const
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
              { value: 'PROCESOS_COACTIVOS', label: 'Procesos Coactivos' },
              { value: 'MANUAL', label: 'Manual' }
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
      {vistaActual === 'timeline' && <VistaTimeline solicitudes={solicitudesFiltradas} onVerDetalle={handleVerDetalle} onArchivar={canModifyTerminos ? handleArchivar : undefined} onEliminar={canModifyTerminos ? handleEliminar : undefined} />}
      {vistaActual === 'calendario' && <VistaCalendario solicitudes={solicitudesFiltradas} mesActual={mesActual} setMesActual={setMesActual} onVerDetalle={handleVerDetalle} />}
      {vistaActual === 'lista' && <VistaLista solicitudes={solicitudesFiltradas} onVerDetalle={handleVerDetalle} onArchivar={canModifyTerminos ? handleArchivar : undefined} onEliminar={canModifyTerminos ? handleEliminar : undefined} />}
      {vistaActual === 'archivados' && (
        <VistaArchivados
          items={itemsArchivados}
          moduloNombre="Términos e Informes"
          onRestaurar={canModifyTerminos ? handleRestaurar : undefined}
          onEliminarPermanente={canModifyTerminos ? handleEliminarPermanente : undefined}
        />
      )}

      {/* Modal Nuevo Informe */}
      <ModalNuevoTermino
        open={modalNuevaSolicitudOpen}
        onOpenChange={setModalNuevaSolicitudOpen}
        onSuccess={fetchData}
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
        onCambiarEtapa={canModifyTerminos ? handleCambiarEtapa : undefined}
        onArchivar={canModifyTerminos ? handleArchivar : undefined}
        onEliminar={canModifyTerminos ? handleEliminar : undefined}
        canModify={canModifyTerminos}
        canEnviarRecordatorio={canEnviarRecordatorio}
      />

      {/* Modal Confirmar Eliminar */}
      {modalEliminarOpen && (
        <Dialog open={modalEliminarOpen} onOpenChange={() => setModalEliminarOpen(false)}>
          <DialogContent hideCloseButton className="max-w-md">
            <DialogTitle className="sr-only">Confirmar Eliminación</DialogTitle>
            <DialogDescription className="sr-only">
              ¿Está seguro que desea eliminar este término?
            </DialogDescription>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border-2 border-red-200">
                <Trash2 className="w-8 h-8 text-red-600" />
                <div>
                  <h3 className="font-bold text-gray-900">Eliminar Término</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    ¿Confirma que desea eliminar este término? Esta acción no se puede deshacer.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setModalEliminarOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={ejecutarEliminacion}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Sí, Eliminar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Seleccionar Formato de Exportación */}
      {modalExportarOpen && (
        <Dialog open={modalExportarOpen} onOpenChange={setModalExportarOpen}>
          <DialogContent hideCloseButton className="max-w-md">
            <DialogTitle>Exportar términos e informes</DialogTitle>
            <DialogDescription>
              Seleccione el formato en el que desea descargar {solicitudesFiltradas.length} término{solicitudesFiltradas.length === 1 ? '' : 's'}.
            </DialogDescription>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={handleExportarPDF} className="flex-1 flex-col h-auto py-4 gap-1">
                <FileText className="w-6 h-6" />
                <span className="font-semibold">PDF</span>
              </Button>
              <Button variant="outline" onClick={handleExportarExcel} className="flex-1 flex-col h-auto py-4 gap-1">
                <Download className="w-6 h-6" />
                <span className="font-semibold">Excel (.xlsx)</span>
              </Button>
            </div>
            <Button variant="outline" onClick={() => setModalExportarOpen(false)} className="w-full">
              Cancelar
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

interface VistaTimelineProps {
  solicitudes: SolicitudInforme[];
  onVerDetalle: (s: SolicitudInforme) => void;
  onArchivar?: (id: string) => void;
  onEliminar?: (id: string) => void;
}

function VistaTimeline({ solicitudes, onVerDetalle, onArchivar, onEliminar }: VistaTimelineProps) {
  // Ordenar por fecha límite
  const solicitudesOrdenadas = [...solicitudes].sort((a, b) =>
    new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime()
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
          const { texto: textoDias, color: semaforoColor, bg: semaforoBg } = formatearDiasRestantes(diasRestantes);

          return (
            <motion.div
              key={solicitud.metadata?.uuid || `${solicitud.id}-${index}`}
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
                    {textoDias}
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
                      {formatearFechaVencimiento(solicitud.fechaVencimiento)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
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
                  {onArchivar && (
                  <button
                    onClick={() => onArchivar(solicitud.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 hover:shadow-md active:scale-95 bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100"
                    title="Archivar (marcar como Cumplido)"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    Archivar
                  </button>
                  )}
                  {onEliminar && (
                  <button
                    onClick={() => onEliminar(solicitud.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 hover:shadow-md active:scale-95 bg-red-50 text-red-600 border border-red-300 hover:bg-red-100"
                    title="Eliminar término"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  )}
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
          <ButtonSIGL onClick={mesAnterior} size="sm" variant="secondary">
            <ChevronLeft className="w-4 h-4" />
          </ButtonSIGL>
          <ButtonSIGL onClick={mesSiguiente} size="sm" variant="secondary">
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
          const solicitudesDia = (solicitudes || []).filter(s => {
            if (!s.fechaVencimiento) return false;
            const fechaVencimiento = new Date(s.fechaVencimiento);
            if (isNaN(fechaVencimiento.getTime())) return false;
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
                  {solicitudesDia.slice(0, 2).map((s, idx) => (
                    <div
                      key={`cal-${s.metadata?.uuid || s.id}-${idx}`}
                      className="text-[9px] leading-tight px-1 py-0.5 rounded truncate"
                      style={{
                        backgroundColor: formatearDiasRestantes(s.diasRestantes).color,
                        color: '#FFFFFF'
                      }}
                      onClick={() => onVerDetalle(s)}
                      title={`${s.id} · ${s.asunto} — ${formatearDiasRestantes(s.diasRestantes).texto}`}
                    >
                      <span className="font-bold">{s.id}</span>
                      {s.asunto ? ` · ${s.asunto}` : ''}
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
  onArchivar?: (id: string) => void;
  onEliminar?: (id: string) => void;
}

export function VistaLista({ solicitudes, onVerDetalle, onArchivar, onEliminar }: VistaListaProps) {
  const grupos = agruparPorPeriodo(solicitudes);

  return (
    <CardSIGL className="bg-white border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">ID</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Nombre de Informe</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Destinatario de Informe</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Fuente Informativa</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Responsable</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Fecha Límite</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Días Restantes</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Estado</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-500">Acciones</th>
            </tr>
          </thead>
          {grupos.map((grupo) => (
            <tbody key={grupo.clave}>
              <tr className="bg-blue-50">
                <td colSpan={9} className="px-4 py-2 text-xs font-bold uppercase tracking-wide" style={{ color: '#003DA5' }}>
                  📅 {grupo.etiqueta} ({grupo.items.length})
                </td>
              </tr>
              {grupo.items.map((solicitud, index) => {
                const { texto: textoDias, color: semaforoColor } = formatearDiasRestantes(solicitud.diasRestantes);

                return (
                <tr key={solicitud.metadata?.uuid || `${solicitud.id}-${index}`} className="border-t border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900 font-semibold">{solicitud.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <div className="line-clamp-2">{solicitud.asunto || 'Sin asunto'}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <div className="line-clamp-2">{solicitud.destinatario || 'Sin asignar'}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <div className="line-clamp-2">{formatearFuenteInformativa(solicitud.fundamentoNormativo)}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{solicitud.responsable}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatearFechaVencimiento(solicitud.fechaVencimiento)}
                  </td>
                  <td className="px-4 py-3">
                    <BadgeSIGL
                      className="text-xs font-bold"
                      style={{ backgroundColor: semaforoColor, color: '#FFFFFF' }}
                    >
                      {textoDias}
                    </BadgeSIGL>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{solicitud.etapa}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
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
                      {onArchivar && (
                      <Button
                        onClick={() => onArchivar(solicitud.id)}
                        size="sm"
                        variant="outline"
                        title="Archivar (Cumplido)"
                        className="text-amber-600 border-amber-300 hover:bg-amber-50"
                      >
                        <Archive className="w-3 h-3" />
                      </Button>
                      )}
                      {onEliminar && (
                      <Button
                        onClick={() => onEliminar(solicitud.id)}
                        size="sm"
                        variant="outline"
                        title="Eliminar"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>
    </CardSIGL>
  );
}

