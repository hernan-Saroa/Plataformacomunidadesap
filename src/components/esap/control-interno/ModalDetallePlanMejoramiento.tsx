/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MODAL DETALLE PLAN DE MEJORAMIENTO - VERSIÓN PREMIUM
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Modal completo para visualización y gestión de Planes de Mejoramiento
 * 
 * CARACTERÍSTICAS:
 * - 5 tabs: Resumen, Hallazgos, Acciones, Documentos, Seguimiento
 * - Dashboard con KPIs detallados
 * - Gestión de acciones (crear, editar, completar)
 * - Carga de evidencias
 * - Timeline de actividades
 * - Semáforos de vencimiento
 * - Progreso visual por hallazgo y global
 * 
 * VERSIÓN: 3.0 - PREMIUM
 * ÚLTIMA ACTUALIZACIÓN: 24 Diciembre 2025
 */

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Calendar, User, Clock, AlertTriangle, CheckCircle2, FileText,
  TrendingUp, Activity, Target, Flag, Plus, Upload, Download,
  Edit2, Trash2, Eye, MessageSquare, Paperclip, History,
  BarChart3, Users, Building2, AlertCircle, Check, XCircle, Loader2, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// ✅ HOOK DE BACKEND
import { usePlanMejoramientoDetalle } from './services/usePlanMejoramientoDetalle';

// ✅ API para profesionales OCIG
import { configuracionesProfesionalesOCIGApi } from './services/api';

// ✅ API para cargar evidencias
import { controlInternoService } from '../../../services/api/controlInternoService';

// ✅ Utilidades PDF para reportes institucionales
import { 
  dibujarEncabezadoInstitucional, 
  dibujarPieInstitucional
} from './services/pdfESAPHeader';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

interface Hallazgo {
  id: string;
  codigo: string;
  descripcion: string;
  criticidad: 'ALTA' | 'MEDIA' | 'BAJA';
  proceso: string;
  responsable: string;
  accionesCount: number;
  accionesCompletadas: number;
  progreso: number;
}

interface AccionCorrectiva {
  id: string;
  hallazgoId: string;
  descripcion: string;
  responsable: string;
  fechaInicio: string;
  fechaVencimiento: string;
  estado: 'PENDIENTE' | 'EN_EJECUCION' | 'COMPLETADA' | 'VENCIDA';
  progreso: number;
  evidencias: number;
  observaciones?: string;
}

interface DocumentoPlan {
  id: string;
  nombre: string;
  tipo: string;
  fechaCarga: string;
  autor: string;
  tamanio: string;
}

interface ActividadTimeline {
  id: string;
  tipo: 'CREACION' | 'ACTUALIZACION' | 'COMPLETADA' | 'EVIDENCIA' | 'COMENTARIO';
  descripcion: string;
  usuario: string;
  fecha: string;
}

interface PlanMejoramientoDetalle {
  id: string;
  codigo: string;
  nombre: string;
  area: string;
  responsableGeneral: string;
  fechaCreacion: string;
  fechaVencimiento: string;
  estado: 'FORMULACION' | 'APROBACION' | 'EN_EJECUCION' | 'EN_SEGUIMIENTO' | 'CUMPLIDO';
  progresoGlobal: number;
  hallazgos: Hallazgo[];
  acciones: AccionCorrectiva[];
  documentos: DocumentoPlan[];
  timeline: ActividadTimeline[];
  seguimientos: SeguimientoTrimestral[];
  auditoria: string;
  observaciones?: string;
}

interface RegistroSeguimiento {
  id: string;
  accionId: string;
  accionDescripcion: string;
  accionesProgramadas: number;
  accionesImplementadas: number;
  puntajeCumplimiento: number;
  controlesImplementados: 'SI' | 'NO' | 'PARCIAL';
  hallazgoSeRepite: 'SI' | 'NO';
  puntajeEfectividad: number;
  observaciones?: string;
}

interface SeguimientoTrimestral {
  id: string;
  trimestre: number;
  año: number;
  fechaInicio: string;
  fechaFin: string;
  fechaSeguimiento?: string;
  avanceGlobal: number;
  porcentajeCumplimiento: number;
  porcentajeEfectividad: number;
  accionesRevisadas: number;
  accionesTotales: number;
  observacionesGenerales?: string;
  registros: RegistroSeguimiento[];
  createdAt: string;
}

type TabActiva = 'resumen' | 'hallazgos' | 'acciones' | 'documentos' | 'seguimiento';

// ════════════════════════════════════════════════════════════════════════════
// DATOS MOCK
// ════════════════════════════════════════════════════════════════════════════

const PLAN_MOCK: PlanMejoramientoDetalle = {
  id: 'pm-2024-004',
  codigo: 'PM-2024-004',
  nombre: 'Plan de Mejoramiento - Auditoría TIC - Seguridad de la Información',
  area: 'Dirección de Tecnología',
  responsableGeneral: 'Jorge Silva',
  fechaCreacion: '2024-10-15',
  fechaVencimiento: '2025-04-15',
  estado: 'EN_EJECUCION',
  progresoGlobal: 45,
  auditoria: 'AU-2024-008 - Auditoría Control Interno TIC',
  observaciones: 'Plan en ejecución con avance según cronograma. Requiere seguimiento cercano en acciones de criticidad alta.',
  
  hallazgos: [
    {
      id: 'h1',
      codigo: 'H-001',
      descripcion: 'Falta de políticas documentadas de seguridad de la información',
      criticidad: 'ALTA',
      proceso: 'Gestión de Seguridad TI',
      responsable: 'Jorge Silva',
      accionesCount: 3,
      accionesCompletadas: 1,
      progreso: 33
    },
    {
      id: 'h2',
      codigo: 'H-002',
      descripcion: 'Ausencia de backups periódicos de bases de datos críticas',
      criticidad: 'ALTA',
      proceso: 'Infraestructura TI',
      responsable: 'María González',
      accionesCount: 2,
      accionesCompletadas: 1,
      progreso: 50
    },
    {
      id: 'h3',
      codigo: 'H-003',
      descripcion: 'Falta de capacitación en ciberseguridad para funcionarios',
      criticidad: 'MEDIA',
      proceso: 'Talento Humano TI',
      responsable: 'Carlos Méndez',
      accionesCount: 2,
      accionesCompletadas: 2,
      progreso: 100
    },
    {
      id: 'h4',
      codigo: 'H-004',
      descripcion: 'Documentación desactualizada de procedimientos técnicos',
      criticidad: 'BAJA',
      proceso: 'Gestión Documental TI',
      responsable: 'Ana Torres',
      accionesCount: 1,
      accionesCompletadas: 0,
      progreso: 0
    }
  ],

  acciones: [
    // Hallazgo H-001
    {
      id: 'a1',
      hallazgoId: 'h1',
      descripcion: 'Elaborar Manual de Políticas de Seguridad de la Información según ISO 27001',
      responsable: 'Jorge Silva',
      fechaInicio: '2024-10-20',
      fechaVencimiento: '2024-12-15',
      estado: 'COMPLETADA',
      progreso: 100,
      evidencias: 3,
      observaciones: 'Completado y socializado con el equipo'
    },
    {
      id: 'a2',
      hallazgoId: 'h1',
      descripcion: 'Aprobación del manual por el Comité de Dirección',
      responsable: 'Jorge Silva',
      fechaInicio: '2024-12-16',
      fechaVencimiento: '2025-01-15',
      estado: 'EN_EJECUCION',
      progreso: 60,
      evidencias: 1
    },
    {
      id: 'a3',
      hallazgoId: 'h1',
      descripcion: 'Socialización del manual a todos los funcionarios',
      responsable: 'María González',
      fechaInicio: '2025-01-16',
      fechaVencimiento: '2025-02-28',
      estado: 'PENDIENTE',
      progreso: 0,
      evidencias: 0
    },
    
    // Hallazgo H-002
    {
      id: 'a4',
      hallazgoId: 'h2',
      descripcion: 'Implementar sistema automatizado de backups diarios',
      responsable: 'María González',
      fechaInicio: '2024-11-01',
      fechaVencimiento: '2024-12-31',
      estado: 'COMPLETADA',
      progreso: 100,
      evidencias: 2
    },
    {
      id: 'a5',
      hallazgoId: 'h2',
      descripcion: 'Documentar procedimiento de restauración y realizar pruebas',
      responsable: 'Carlos Méndez',
      fechaInicio: '2025-01-05',
      fechaVencimiento: '2025-03-15',
      estado: 'EN_EJECUCION',
      progreso: 40,
      evidencias: 1
    },

    // Hallazgo H-003
    {
      id: 'a6',
      hallazgoId: 'h3',
      descripcion: 'Diseñar programa de capacitación en ciberseguridad',
      responsable: 'Carlos Méndez',
      fechaInicio: '2024-10-25',
      fechaVencimiento: '2024-11-30',
      estado: 'COMPLETADA',
      progreso: 100,
      evidencias: 2
    },
    {
      id: 'a7',
      hallazgoId: 'h3',
      descripcion: 'Ejecutar jornadas de capacitación para 100% del personal',
      responsable: 'Ana Torres',
      fechaInicio: '2024-12-01',
      fechaVencimiento: '2025-01-31',
      estado: 'COMPLETADA',
      progreso: 100,
      evidencias: 4
    },

    // Hallazgo H-004
    {
      id: 'a8',
      hallazgoId: 'h4',
      descripcion: 'Actualizar documentación técnica de procedimientos TI',
      responsable: 'Ana Torres',
      fechaInicio: '2025-02-01',
      fechaVencimiento: '2025-04-15',
      estado: 'PENDIENTE',
      progreso: 0,
      evidencias: 0
    }
  ],

  documentos: [
    {
      id: 'd1',
      nombre: 'Plan de Mejoramiento PM-2024-004.pdf',
      tipo: 'PDF',
      fechaCarga: '2024-10-15',
      autor: 'Jorge Silva',
      tamanio: '2.4 MB'
    },
    {
      id: 'd2',
      nombre: 'Manual Políticas Seguridad v1.0.pdf',
      tipo: 'PDF',
      fechaCarga: '2024-12-15',
      autor: 'Jorge Silva',
      tamanio: '3.8 MB'
    },
    {
      id: 'd3',
      nombre: 'Evidencia Implementación Backups.xlsx',
      tipo: 'XLSX',
      fechaCarga: '2024-12-31',
      autor: 'María González',
      tamanio: '1.2 MB'
    },
    {
      id: 'd4',
      nombre: 'Certificados Capacitación Ciberseguridad.pdf',
      tipo: 'PDF',
      fechaCarga: '2025-01-31',
      autor: 'Carlos Méndez',
      tamanio: '5.6 MB'
    }
  ],

  timeline: [
    {
      id: 't1',
      tipo: 'CREACION',
      descripcion: 'Plan de mejoramiento creado',
      usuario: 'Jorge Silva',
      fecha: '2024-10-15 09:30'
    },
    {
      id: 't2',
      tipo: 'COMPLETADA',
      descripcion: 'Acción A1 completada: Manual de Políticas elaborado',
      usuario: 'Jorge Silva',
      fecha: '2024-12-15 16:45'
    },
    {
      id: 't3',
      tipo: 'EVIDENCIA',
      descripcion: 'Cargada evidencia de implementación de backups',
      usuario: 'María González',
      fecha: '2024-12-31 11:20'
    },
    {
      id: 't4',
      tipo: 'COMPLETADA',
      descripcion: 'Hallazgo H-003 completado al 100%',
      usuario: 'Carlos Méndez',
      fecha: '2025-01-31 14:30'
    },
    {
      id: 't5',
      tipo: 'ACTUALIZACION',
      descripcion: 'Actualizado progreso de acción A2 al 60%',
      usuario: 'Jorge Silva',
      fecha: '2025-02-10 10:15'
    }
  ]
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

interface ModalDetallePlanProps {
  planId: string;
  onClose: () => void;
  onPlanActualizado?: () => void;
}

export function ModalDetallePlanMejoramiento({ planId, onClose, onPlanActualizado }: ModalDetallePlanProps) {
  const [tabActiva, setTabActiva] = useState<TabActiva>('resumen');
  const [modalActualizacion, setModalActualizacion] = useState(false);
  const [modalCrearAccion, setModalCrearAccion] = useState(false);
  
  // ✅ HOOK DE BACKEND - Carga datos reales
  const {
    plan,
    loading,
    error,
    refetch,
    actualizarPlan,
    crearAccion,
    actualizarAccion,
    eliminarAccion
  } = usePlanMejoramientoDetalle(planId);

  // Estado para el formulario de actualización
  const [datosActualizacion, setDatosActualizacion] = useState({
    estado: '',
    fechaVencimiento: '',
    responsableGeneral: '',
    observaciones: ''
  });

  // Inicializar datos cuando carga el plan
  useMemo(() => {
    if (plan) {
      setDatosActualizacion({
        estado: plan.estado,
        fechaVencimiento: plan.fechaVencimiento,
        responsableGeneral: plan.responsableGeneral,
        observaciones: plan.observaciones || ''
      });
    }
  }, [plan?.id]);

  const estadisticas = useMemo(() => {
    if (!plan) {
      return {
        totalAcciones: 0,
        accionesCompletadas: 0,
        accionesEnEjecucion: 0,
        accionesPendientes: 0,
        accionesVencidas: 0,
        totalHallazgos: 0,
        hallazgosResueltos: 0,
        hallazgosCriticosAbiertos: 0,
        porcentajeCompletado: 0
      };
    }
    
    const totalAcciones = plan.acciones.length;
    const accionesCompletadas = plan.acciones.filter(a => a.estado === 'COMPLETADA').length;
    const accionesEnEjecucion = plan.acciones.filter(a => a.estado === 'EN_EJECUCION').length;
    const accionesPendientes = plan.acciones.filter(a => a.estado === 'PENDIENTE').length;
    const accionesVencidas = plan.acciones.filter(a => a.estado === 'VENCIDA').length;

    const totalHallazgos = plan.hallazgos.length;
    const hallazgosResueltos = plan.hallazgos.filter(h => h.progreso === 100).length;
    const hallazgosCriticosAbiertos = plan.hallazgos.filter(h => h.criticidad === 'ALTA' && h.progreso < 100).length;

    return {
      totalAcciones,
      accionesCompletadas,
      accionesEnEjecucion,
      accionesPendientes,
      accionesVencidas,
      totalHallazgos,
      hallazgosResueltos,
      hallazgosCriticosAbiertos,
      porcentajeCompletado: totalAcciones > 0 ? Math.round((accionesCompletadas / totalAcciones) * 100) : 0
    };
  }, [plan]);

  const handleActualizarPlan = () => {
    setModalActualizacion(true);
  };

  const handleGuardarActualizacion = async () => {
    // Validaciones básicas
    if (!datosActualizacion.estado) {
      toast.error('Debes seleccionar un estado');
      return;
    }

    if (!datosActualizacion.fechaVencimiento) {
      toast.error('Debes especificar una fecha de vencimiento');
      return;
    }

    // ✅ LLAMADA AL BACKEND
    const exito = await actualizarPlan({
      estado: datosActualizacion.estado,
      fechaVencimiento: datosActualizacion.fechaVencimiento,
      responsableGeneral: datosActualizacion.responsableGeneral,
      observaciones: datosActualizacion.observaciones
    });

    if (exito) {
      setModalActualizacion(false);
      onPlanActualizado?.();
    }
  };

  const handleDescargarReporte = async () => {
    if (!plan) return;
    
    toast.info('Generando Reporte PDF', {
      description: 'Preparando documento del Plan de Mejoramiento...',
      duration: 3000,
    });

    try {
      // Importar jsPDF dinámicamente
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;

      // Crear documento PDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;

      // Header institucional
      const alturaEncabezado = dibujarEncabezadoInstitucional(doc, {
        codigo: plan.codigo || 'PM-2026',
        version: 1,
        fecha: new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }),
        titulo: 'PLAN DE MEJORAMIENTO',
        proceso: 'EVALUACIÓN CONTROL Y MEJORA'
      });
      
      let currentY = alturaEncabezado + 5;

      // Título del plan
      doc.setTextColor(0, 61, 165);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(plan.nombre, pageWidth / 2, currentY, { align: 'center' });
      currentY += 10;

      // Información General
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMACIÓN GENERAL', margin, currentY);
      currentY += 6;

      const infoData = [
        ['Código', plan.codigo],
        ['Área Responsable', plan.area || '-'],
        ['Responsable General', plan.responsableGeneral || '-'],
        ['Auditoría Origen', plan.auditoria || '-'],
        ['Estado', plan.estado],
        ['Fecha Creación', plan.fechaCreacion],
        ['Fecha Vencimiento', plan.fechaVencimiento],
        ['Progreso Global', `${plan.progresoGlobal}%`]
      ];

      autoTable(doc, {
        startY: currentY,
        head: [],
        body: infoData,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 45, fillColor: [240, 240, 240] },
          1: { cellWidth: 'auto' }
        },
        margin: { left: margin, right: margin }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;

      // Hallazgos
      if (plan.hallazgos.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 61, 165);
        doc.text('HALLAZGOS', margin, currentY);
        currentY += 6;

        const hallazgosData = plan.hallazgos.map((h, idx) => [
          (idx + 1).toString(),
          h.codigo,
          h.descripcion.substring(0, 60) + (h.descripcion.length > 60 ? '...' : ''),
          h.criticidad,
          h.responsable,
          `${h.progreso}%`
        ]);

        autoTable(doc, {
          startY: currentY,
          head: [['#', 'Código', 'Descripción', 'Criticidad', 'Responsable', 'Avance']],
          body: hallazgosData,
          theme: 'striped',
          headStyles: {
            fillColor: [0, 61, 165],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8
          },
          styles: { fontSize: 7, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 8, halign: 'center' },
            1: { cellWidth: 20 },
            2: { cellWidth: 'auto' },
            3: { cellWidth: 20, halign: 'center' },
            4: { cellWidth: 35 },
            5: { cellWidth: 15, halign: 'center' }
          },
          margin: { left: margin, right: margin }
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
      }

      // Verificar si necesita nueva página
      if (currentY > pageHeight - 60) {
        doc.addPage();
        currentY = margin + 10;
      }

      // Acciones Correctivas
      if (plan.acciones.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 61, 165);
        doc.text('ACCIONES CORRECTIVAS', margin, currentY);
        currentY += 6;

        const accionesData = plan.acciones.map((a, idx) => {
          const estadoLabel = a.estado === 'COMPLETADA' ? 'Completada' :
                              a.estado === 'EN_EJECUCION' ? 'En Ejecución' :
                              a.estado === 'VENCIDA' ? 'Vencida' : 'Pendiente';
          return [
            (idx + 1).toString(),
            a.descripcion.substring(0, 50) + (a.descripcion.length > 50 ? '...' : ''),
            a.responsable,
            a.fechaInicio,
            a.fechaVencimiento,
            estadoLabel,
            `${a.progreso}%`
          ];
        });

        autoTable(doc, {
          startY: currentY,
          head: [['#', 'Descripción', 'Responsable', 'Inicio', 'Vencimiento', 'Estado', 'Avance']],
          body: accionesData,
          theme: 'striped',
          headStyles: {
            fillColor: [0, 61, 165],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8
          },
          styles: { fontSize: 7, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 8, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 30 },
            3: { cellWidth: 20 },
            4: { cellWidth: 20 },
            5: { cellWidth: 22, halign: 'center' },
            6: { cellWidth: 15, halign: 'center' }
          },
          margin: { left: margin, right: margin }
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
      }

      // Resumen de avance
      if (currentY > pageHeight - 50) {
        doc.addPage();
        currentY = margin + 10;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 61, 165);
      doc.text('RESUMEN DE AVANCE', margin, currentY);
      currentY += 6;

      const completadas = plan.acciones.filter(a => a.estado === 'COMPLETADA').length;
      const enEjecucion = plan.acciones.filter(a => a.estado === 'EN_EJECUCION').length;
      const pendientes = plan.acciones.filter(a => a.estado === 'PENDIENTE').length;
      const vencidas = plan.acciones.filter(a => a.estado === 'VENCIDA').length;

      const resumenData = [
        ['Total Hallazgos', plan.hallazgos.length.toString()],
        ['Total Acciones', plan.acciones.length.toString()],
        ['Acciones Completadas', completadas.toString()],
        ['Acciones En Ejecución', enEjecucion.toString()],
        ['Acciones Pendientes', pendientes.toString()],
        ['Acciones Vencidas', vencidas.toString()],
        ['Progreso Global', `${plan.progresoGlobal}%`]
      ];

      autoTable(doc, {
        startY: currentY,
        head: [],
        body: resumenData,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 50, fillColor: [240, 240, 240] },
          1: { cellWidth: 30, halign: 'center' }
        },
        margin: { left: margin, right: margin }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;

      // Observaciones
      if (plan.observaciones) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 61, 165);
        doc.text('OBSERVACIONES', margin, currentY);
        currentY += 6;
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        const observacionesLines = doc.splitTextToSize(plan.observaciones, pageWidth - margin * 2);
        doc.text(observacionesLines, margin, currentY);
      }

      // Footer institucional en todas las páginas
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        dibujarPieInstitucional(doc, i, true);
      }

      // Guardar PDF
      const nombreArchivo = `Plan-Mejoramiento-${plan.codigo}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(nombreArchivo);

      toast.success('Reporte PDF Generado', {
        description: `Archivo ${nombreArchivo} descargado exitosamente`,
        duration: 4000,
      });

    } catch (error) {
      console.error('Error generando PDF:', error);
      toast.error('Error al generar PDF', {
        description: 'No se pudo generar el reporte. Intente nuevamente.',
      });
    }
  };

  const estadoConfig = {
    FORMULACION: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Formulación' },
    APROBACION: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Aprobación' },
    EN_EJECUCION: { bg: 'bg-green-100', text: 'text-green-700', label: 'En Ejecución' },
    EN_SEGUIMIENTO: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'En Seguimiento' },
    CUMPLIDO: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Cumplido' }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADOS DE CARGA Y ERROR
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (loading) {
    return (
      <div className="fixed inset-0 z-[9998] overflow-y-auto flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-gray-700 font-medium">Cargando plan de mejoramiento...</p>
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="fixed inset-0 z-[9998] overflow-y-auto flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <h3 className="text-lg font-bold text-gray-900">Error al cargar el plan</h3>
          <p className="text-gray-600 text-center">{error || 'No se pudo obtener la información del plan'}</p>
          <div className="flex gap-3">
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium flex items-center gap-2 hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4" />
              Reintentar
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const config = estadoConfig[plan.estado];

  return (
    <div className="fixed inset-0 z-[9998] overflow-y-auto flex items-center justify-center bg-black/60 backdrop-blur-sm">
      {/* Overlay con efecto blur */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal - Tamaño optimizado con mejor responsive */}
      <div className="relative w-full max-w-[95vw] lg:max-w-[85vw] xl:max-w-7xl my-auto mx-4 bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] z-[9999]">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 rounded-t-2xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-medium">{plan.codigo}</h2>
                <span className={`px-3 py-1 rounded-lg text-xs sm:text-sm font-medium ${config.bg} ${config.text} inline-block w-fit`}>
                  {config.label}
                </span>
              </div>
              <p className="text-blue-100 mb-4 text-sm sm:text-base">{plan.nombre}</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
                <div>
                  <div className="text-blue-200 text-xs mb-1">Área Responsable</div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{plan.area}</span>
                  </div>
                </div>
                <div>
                  <div className="text-blue-200 text-xs mb-1">Responsable</div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{plan.responsableGeneral}</span>
                  </div>
                </div>
                <div>
                  <div className="text-blue-200 text-xs mb-1">Fecha Vencimiento</div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    {plan.fechaVencimiento}
                  </div>
                </div>
                <div>
                  <div className="text-blue-200 text-xs mb-1">Progreso Global</div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 flex-shrink-0" />
                    {plan.progresoGlobal}%
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="ml-4 p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Barra de Progreso Global */}
          <div className="mt-3">
            <div className="bg-white bg-opacity-20 rounded-full h-2 overflow-hidden">
              <div
                className="bg-white h-full transition-all duration-500"
                style={{ width: `${plan.progresoGlobal}%` }}
              />
            </div>
          </div>
        </div>

        {/* KPIs Dashboard */}
        <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200 px-6 py-3 overflow-x-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 min-w-[600px]">
            <KPICard
              label="Total Acciones"
              valor={estadisticas.totalAcciones}
              color="blue"
              icon={<Target className="w-4 h-4" />}
            />
            <KPICard
              label="Completadas"
              valor={estadisticas.accionesCompletadas}
              color="green"
              icon={<CheckCircle2 className="w-4 h-4" />}
            />
            <KPICard
              label="En Ejecución"
              valor={estadisticas.accionesEnEjecucion}
              color="yellow"
              icon={<Activity className="w-4 h-4" />}
            />
            <KPICard
              label="Pendientes"
              valor={estadisticas.accionesPendientes}
              color="gray"
              icon={<Clock className="w-4 h-4" />}
            />
            <KPICard
              label="Hallazgos Resueltos"
              valor={`${estadisticas.hallazgosResueltos}/${estadisticas.totalHallazgos}`}
              color="purple"
              icon={<Flag className="w-4 h-4" />}
            />
            <KPICard
              label="Críticos Abiertos"
              valor={estadisticas.hallazgosCriticosAbiertos}
              color="red"
              icon={<AlertTriangle className="w-4 h-4" />}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6">
          <div className="flex gap-1">
            <TabButton
              active={tabActiva === 'resumen'}
              onClick={() => setTabActiva('resumen')}
              icon={<BarChart3 className="w-4 h-4" />}
              label="Resumen"
            />
            <TabButton
              active={tabActiva === 'hallazgos'}
              onClick={() => setTabActiva('hallazgos')}
              icon={<AlertTriangle className="w-4 h-4" />}
              label="Hallazgos"
              badge={plan.hallazgos.length.toString()}
            />
            <TabButton
              active={tabActiva === 'acciones'}
              onClick={() => setTabActiva('acciones')}
              icon={<Target className="w-4 h-4" />}
              label="Acciones"
              badge={plan.acciones.length.toString()}
            />
            <TabButton
              active={tabActiva === 'documentos'}
              onClick={() => setTabActiva('documentos')}
              icon={<FileText className="w-4 h-4" />}
              label="Documentos"
              badge="0"
            />
            <TabButton
              active={tabActiva === 'seguimiento'}
              onClick={() => setTabActiva('seguimiento')}
              icon={<History className="w-4 h-4" />}
              label="Seguimiento"
            />
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={tabActiva}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {tabActiva === 'resumen' && <TabResumen plan={plan} estadisticas={estadisticas} />}
              {tabActiva === 'hallazgos' && (
                <TabHallazgos 
                  plan={plan} 
                  onCrearAccion={crearAccion}
                />
              )}
              {tabActiva === 'acciones' && (
                <TabAcciones 
                  plan={plan} 
                  onActualizarAccion={actualizarAccion}
                  onEliminarAccion={eliminarAccion}
                  onCrearAccion={crearAccion}
                  onRefresh={refetch}
                />
              )}
              {tabActiva === 'documentos' && <TabDocumentos plan={plan} />}
              {tabActiva === 'seguimiento' && <TabSeguimiento plan={plan} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer con Acciones */}
        <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-6 py-3 rounded-b-xl">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Plan ID: {plan.id?.substring(0, 8)}...
            </div>
            <div className="flex gap-3">
              <button
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm"
                onClick={handleDescargarReporte}
              >
                <Download className="w-4 h-4" />
                Descargar Reporte
              </button>
              <button
                className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2 text-sm"
                onClick={handleActualizarPlan}
              >
                <Edit2 className="w-4 h-4" />
                Actualizar Plan
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Actualización */}
      {modalActualizacion && (
        <div className="fixed inset-0 z-[10000] overflow-hidden flex items-center justify-center p-4">
          {/* Overlay con efecto blur oscuro */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModalActualizacion(false)} />

          {/* Modal - Tamaño optimizado */}
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white px-6 py-4 rounded-t-xl">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-medium">Actualizar Plan de Mejoramiento</h2>
                  </div>
                </div>

                <button
                  onClick={() => setModalActualizacion(false)}
                  className="ml-4 p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-auto px-6 py-4">
              <div className="space-y-4">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-base font-medium text-gray-900 mb-4">Información General</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoItem label="Código" valor={plan.codigo} />
                    <InfoItem label="Estado" valor={plan.estado.replace(/_/g, ' ')} />
                    <InfoItem label="Auditoría Origen" valor={plan.auditoria} />
                    <InfoItem label="Área Responsable" valor={plan.area} />
                    <InfoItem label="Responsable General" valor={plan.responsableGeneral} />
                    <InfoItem label="Fecha Creación" valor={plan.fechaCreacion} />
                    <InfoItem label="Fecha Vencimiento" valor={plan.fechaVencimiento} />
                    <InfoItem label="Progreso Global" valor={`${plan.progresoGlobal}%`} />
                  </div>

                  {plan.observaciones && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-sm font-medium text-blue-900 mb-1">Observaciones</div>
                      <div className="text-sm text-blue-700">{plan.observaciones}</div>
                    </div>
                  )}
                </div>

                {/* Distribución de Acciones */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-base font-medium text-gray-900 mb-4">Distribución de Acciones por Estado</h3>
                  <div className="space-y-3">
                    <ProgresoBar
                      label="Completadas"
                      valor={estadisticas.accionesCompletadas}
                      total={estadisticas.totalAcciones}
                      color="green"
                    />
                    <ProgresoBar
                      label="En Ejecución"
                      valor={estadisticas.accionesEnEjecucion}
                      total={estadisticas.totalAcciones}
                      color="yellow"
                    />
                    <ProgresoBar
                      label="Pendientes"
                      valor={estadisticas.accionesPendientes}
                      total={estadisticas.totalAcciones}
                      color="gray"
                    />
                    {estadisticas.accionesVencidas > 0 && (
                      <ProgresoBar
                        label="Vencidas"
                        valor={estadisticas.accionesVencidas}
                        total={estadisticas.totalAcciones}
                        color="red"
                      />
                    )}
                  </div>
                </div>

                {/* Hallazgos Críticos */}
                {estadisticas.hallazgosCriticosAbiertos > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-red-900 mb-1">
                          Atención: {estadisticas.hallazgosCriticosAbiertos} Hallazgo(s) Crítico(s) Abierto(s)
                        </h4>
                        <p className="text-sm text-red-700">
                          Existen hallazgos de criticidad alta que requieren atención prioritaria
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer con Acciones */}
            <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-6 py-3 rounded-b-xl">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Plan ID: {plan.id?.substring(0, 8)}...
                </div>
                <div className="flex gap-3">
                  <button
                    className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2 text-sm"
                    onClick={handleGuardarActualizacion}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Guardar Cambios
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// KPI CARD
// ════════════════════════════════════════════════════════════════════════════

interface KPICardProps {
  label: string;
  valor: string | number;
  color: 'blue' | 'green' | 'yellow' | 'gray' | 'purple' | 'red';
  icon: React.ReactNode;
}

function KPICard({ label, valor, color, icon }: KPICardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    red: 'bg-red-50 border-red-200 text-red-700'
  };

  return (
    <div className={`rounded-lg border p-2.5 ${colorClasses[color]}`}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <div className="text-xs opacity-80 leading-tight">{label}</div>
      </div>
      <div className="text-lg font-semibold">{valor}</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB BUTTON
// ════════════════════════════════════════════════════════════════════════════

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}

function TabButton({ active, onClick, icon, label, badge }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-all ${
        active
          ? 'border-[#1e5da8] text-[#1e5da8] bg-blue-50'
          : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      {icon}
      {label}
      {badge && (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
          active ? 'bg-[#1e5da8] text-white' : 'bg-gray-200 text-gray-700'
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: RESUMEN
// ════════════════════════════════════════════════════════════════════════════

function TabResumen({ plan, estadisticas }: { plan: PlanMejoramientoDetalle; estadisticas: any }) {
  return (
    <div className="space-y-6">
      {/* Información General */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-base font-medium text-gray-900 mb-4">Información General</h3>
        <div className="grid grid-cols-2 gap-4">
          <InfoItem label="Código" valor={plan.codigo} />
          <InfoItem label="Estado" valor={plan.estado.replace(/_/g, ' ')} />
          <InfoItem label="Auditoría Origen" valor={plan.auditoria} />
          <InfoItem label="Área Responsable" valor={plan.area} />
          <InfoItem label="Responsable General" valor={plan.responsableGeneral} />
          <InfoItem label="Fecha Creación" valor={plan.fechaCreacion} />
          <InfoItem label="Fecha Vencimiento" valor={plan.fechaVencimiento} />
          <InfoItem label="Progreso Global" valor={`${plan.progresoGlobal}%`} />
        </div>

        {plan.observaciones && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm font-medium text-blue-900 mb-1">Observaciones</div>
            <div className="text-sm text-blue-700">{plan.observaciones}</div>
          </div>
        )}
      </div>

      {/* Distribución de Acciones */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-base font-medium text-gray-900 mb-4">Distribución de Acciones por Estado</h3>
        <div className="space-y-3">
          <ProgresoBar
            label="Completadas"
            valor={estadisticas.accionesCompletadas}
            total={estadisticas.totalAcciones}
            color="green"
          />
          <ProgresoBar
            label="En Ejecución"
            valor={estadisticas.accionesEnEjecucion}
            total={estadisticas.totalAcciones}
            color="yellow"
          />
          <ProgresoBar
            label="Pendientes"
            valor={estadisticas.accionesPendientes}
            total={estadisticas.totalAcciones}
            color="gray"
          />
          {estadisticas.accionesVencidas > 0 && (
            <ProgresoBar
              label="Vencidas"
              valor={estadisticas.accionesVencidas}
              total={estadisticas.totalAcciones}
              color="red"
            />
          )}
        </div>
      </div>

      {/* Hallazgos Críticos */}
      {estadisticas.hallazgosCriticosAbiertos > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-red-900 mb-1">
                Atención: {estadisticas.hallazgosCriticosAbiertos} Hallazgo(s) Crítico(s) Abierto(s)
              </h4>
              <p className="text-sm text-red-700">
                Existen hallazgos de criticidad alta que requieren atención prioritaria
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: HALLAZGOS
// ════════════════════════════════════════════════════════════════════════════

interface TabHallazgosProps {
  plan: PlanMejoramientoDetalle;
  onCrearAccion: (data: any) => Promise<boolean>;
}

function TabHallazgos({ plan, onCrearAccion }: TabHallazgosProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-medium text-gray-900">Hallazgos del Plan</h3>
          <p className="text-sm text-gray-600">{plan.hallazgos.length} hallazgos identificados</p>
        </div>
      </div>

      {plan.hallazgos.map((hallazgo) => (
        <CardHallazgo 
          key={hallazgo.id} 
          hallazgo={hallazgo} 
          plan={plan} 
          onCrearAccion={onCrearAccion}
        />
      ))}
    </div>
  );
}

interface CardHallazgoProps {
  hallazgo: Hallazgo;
  plan: PlanMejoramientoDetalle;
  onCrearAccion: (data: any) => Promise<boolean>;
}

function CardHallazgo({ hallazgo, plan, onCrearAccion }: CardHallazgoProps) {
  const [expandido, setExpandido] = useState(false);
  const [modalCrearAccion, setModalCrearAccion] = useState(false);

  const criticidadConfig = {
    ALTA: { bg: 'bg-red-100', text: 'text-red-700', label: 'Crítica' },
    MEDIA: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Media' },
    BAJA: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Baja' }
  };

  const config = criticidadConfig[hallazgo.criticidad];
  const accionesHallazgo = plan.acciones.filter(a => a.hallazgoId === hallazgo.id);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-medium text-gray-900">{hallazgo.codigo}</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}>
                {config.label}
              </span>
              <span className="text-xs text-gray-600">{hallazgo.proceso}</span>
            </div>
            <p className="text-sm text-gray-700 mb-2">{hallazgo.descripcion}</p>
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {hallazgo.responsable}
              </div>
              <div className="flex items-center gap-1">
                <Target className="w-3 h-3" />
                {hallazgo.accionesCompletadas}/{hallazgo.accionesCount} acciones completadas
              </div>
            </div>
          </div>

          {/* Progreso Circular */}
          <div className="text-center">
            <div className={`relative w-16 h-16 rounded-full flex items-center justify-center ${
              hallazgo.progreso === 100 ? 'bg-green-100' :
              hallazgo.progreso >= 50 ? 'bg-yellow-100' :
              'bg-gray-100'
            }`}>
              <span className={`text-lg font-semibold ${
                hallazgo.progreso === 100 ? 'text-green-700' :
                hallazgo.progreso >= 50 ? 'text-yellow-700' :
                'text-gray-700'
              }`}>
                {hallazgo.progreso}%
              </span>
            </div>
          </div>
        </div>

        {/* Barra de Progreso */}
        <div className="mb-3">
          <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all ${
                hallazgo.progreso === 100 ? 'bg-green-600' :
                hallazgo.progreso >= 50 ? 'bg-yellow-600' :
                'bg-blue-600'
              }`}
              style={{ width: `${hallazgo.progreso}%` }}
            />
          </div>
        </div>

        {/* Botones Ver Acciones y Añadir Acción */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setExpandido(!expandido)}
            className="text-sm text-[#1e5da8] hover:text-[#2a6dbd] font-medium flex items-center gap-2"
          >
            {expandido ? 'Ocultar' : 'Ver'} {accionesHallazgo.length} acciones
            <ChevronDown className={`w-4 h-4 transition-transform ${expandido ? 'rotate-180' : ''}`} />
          </button>
          
          <button
            onClick={() => setModalCrearAccion(true)}
            className="px-3 py-1.5 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg text-sm hover:shadow transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Añadir Acción
          </button>
        </div>
      </div>

      {/* Modal Crear Acción para este hallazgo */}
      {modalCrearAccion && (
        <ModalCrearAccion
          hallazgos={[hallazgo]}
          hallazgoPreseleccionado={hallazgo.id}
          onClose={() => setModalCrearAccion(false)}
          onCrear={onCrearAccion}
        />
      )}

      {/* Lista de Acciones del Hallazgo */}
      <AnimatePresence>
        {expandido && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-200 bg-gray-50"
          >
            <div className="p-5 space-y-2">
              {accionesHallazgo.map((accion) => (
                <MiniCardAccion key={accion.id} accion={accion} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: ACCIONES
// ════════════════════════════════════════════════════════════════════════════

interface TabAccionesProps {
  plan: PlanMejoramientoDetalle;
  onActualizarAccion: (accionId: string, data: any) => Promise<boolean>;
  onEliminarAccion: (accionId: string) => Promise<boolean>;
  onCrearAccion: (data: any) => Promise<boolean>;
  onRefresh: () => void;
}

function TabAcciones({ plan, onActualizarAccion, onEliminarAccion, onCrearAccion, onRefresh }: TabAccionesProps) {
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | AccionCorrectiva['estado']>('TODOS');
  const [modalCrearAccion, setModalCrearAccion] = useState(false);

  const accionesFiltradas = filtroEstado === 'TODOS'
    ? plan.acciones
    : plan.acciones.filter(a => a.estado === filtroEstado);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-medium text-gray-900">Acciones Correctivas</h3>
          <p className="text-sm text-gray-600">{accionesFiltradas.length} acciones</p>
        </div>

        <div className="flex gap-2 items-center">
          {/* Botón Nueva Acción */}
          <button
            onClick={() => setModalCrearAccion(true)}
            className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2 text-sm font-medium mr-3"
          >
            <Plus className="w-4 h-4" />
            Nueva Acción
          </button>
          <FiltroButton
            active={filtroEstado === 'TODOS'}
            onClick={() => setFiltroEstado('TODOS')}
            label="Todas"
          />
          <FiltroButton
            active={filtroEstado === 'COMPLETADA'}
            onClick={() => setFiltroEstado('COMPLETADA')}
            label="Completadas"
            color="green"
          />
          <FiltroButton
            active={filtroEstado === 'EN_EJECUCION'}
            onClick={() => setFiltroEstado('EN_EJECUCION')}
            label="En Ejecución"
            color="yellow"
          />
          <FiltroButton
            active={filtroEstado === 'PENDIENTE'}
            onClick={() => setFiltroEstado('PENDIENTE')}
            label="Pendientes"
            color="gray"
          />
        </div>
      </div>

      {accionesFiltradas.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Sin acciones {filtroEstado !== 'TODOS' ? 'en este estado' : ''}</p>
          <p className="text-sm mt-1">Haz clic en "Nueva Acción" para crear una acción correctiva</p>
        </div>
      ) : (
        accionesFiltradas.map((accion) => (
          <CardAccion 
            key={accion.id} 
            accion={accion} 
            plan={plan}
            onActualizarAccion={onActualizarAccion}
            onEliminarAccion={onEliminarAccion}
            onRefresh={onRefresh}
          />
        ))
      )}

      {/* Modal Crear Acción */}
      {modalCrearAccion && (
        <ModalCrearAccion
          hallazgos={plan.hallazgos}
          onClose={() => setModalCrearAccion(false)}
          onCrear={onCrearAccion}
        />
      )}
    </div>
  );
}

interface CardAccionProps {
  accion: AccionCorrectiva;
  plan: PlanMejoramientoDetalle;
  onActualizarAccion: (accionId: string, data: any) => Promise<boolean>;
  onEliminarAccion: (accionId: string) => Promise<boolean>;
  onRefresh: () => void;
}

function CardAccion({ accion, plan, onActualizarAccion, onEliminarAccion, onRefresh }: CardAccionProps) {
  const [modalEditar, setModalEditar] = useState(false);
  const [modalEvidencia, setModalEvidencia] = useState(false);
  const [evidenciasCount, setEvidenciasCount] = useState(accion.evidencias || 0);
  
  // Cargar count de evidencias desde el backend
  useEffect(() => {
    const cargarEvidencias = async () => {
      try {
        const evidencias = await controlInternoService.getEvidenciasByAccion(accion.id);
        setEvidenciasCount(Array.isArray(evidencias) ? evidencias.length : 0);
      } catch (error) {
        // Si falla, usar el valor del plan
        setEvidenciasCount(accion.evidencias || 0);
      }
    };
    cargarEvidencias();
  }, [accion.id]);
  
  const estadoConfig = {
    PENDIENTE: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Pendiente', icon: Clock },
    EN_EJECUCION: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'En Ejecución', icon: Activity },
    COMPLETADA: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completada', icon: CheckCircle2 },
    VENCIDA: { bg: 'bg-red-100', text: 'text-red-700', label: 'Vencida', icon: XCircle }
  };

  const config = estadoConfig[accion.estado];
  const Icon = config.icon;
  const hallazgo = plan.hallazgos.find(h => h.id === accion.hallazgoId);

  const handleEditar = () => {
    setModalEditar(true);
  };

  const handleCargarEvidencia = () => {
    setModalEvidencia(true);
  };

  const handleMarcarCompletada = async () => {
    // Validar que no esté ya completada
    if (accion.estado === 'COMPLETADA') {
      toast.warning('Acción ya completada', {
        description: 'Esta acción ya se encuentra en estado completado',
      });
      return;
    }

    // ✅ LLAMADA AL BACKEND
    await onActualizarAccion(accion.id, {
      estado: 'COMPLETADA',
      progreso: 100
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 ${config.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${config.text}`} />
        </div>

        <div className="flex-1">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}>
                  {config.label}
                </span>
                {hallazgo && (
                  <span className="text-xs text-gray-600">{hallazgo.codigo}</span>
                )}
              </div>
              <p className="text-sm text-gray-900 mb-2">{accion.descripcion}</p>
            </div>

            <div className="text-right">
              <div className={`text-2xl font-semibold ${
                accion.progreso === 100 ? 'text-green-600' :
                accion.progreso >= 50 ? 'text-yellow-600' :
                'text-gray-600'
              }`}>
                {accion.progreso}%
              </div>
            </div>
          </div>

          {/* Progreso */}
          <div className="mb-3">
            <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  accion.progreso === 100 ? 'bg-green-600' :
                  accion.progreso >= 50 ? 'bg-yellow-600' :
                  'bg-blue-600'
                }`}
                style={{ width: `${accion.progreso}%` }}
              />
            </div>
          </div>

          {/* Información */}
          <div className="grid grid-cols-4 gap-4 text-xs text-gray-600 mb-3">
            <div>
              <div className="flex items-center gap-1 mb-1">
                <User className="w-3 h-3" />
                <span>Responsable</span>
              </div>
              <div className="text-gray-900">{accion.responsable}</div>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Calendar className="w-3 h-3" />
                <span>Inicio</span>
              </div>
              <div className="text-gray-900">{accion.fechaInicio}</div>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Flag className="w-3 h-3" />
                <span>Vencimiento</span>
              </div>
              <div className="text-gray-900">{accion.fechaVencimiento}</div>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Paperclip className="w-3 h-3" />
                <span>Evidencias</span>
              </div>
              <div className="text-gray-900">{evidenciasCount} archivos</div>
            </div>
          </div>

          {/* Observaciones */}
          {accion.observaciones && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
              {accion.observaciones}
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-2">
            <button 
              onClick={handleEditar}
              className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50 transition-colors flex items-center gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Editar
            </button>
            <button 
              onClick={handleCargarEvidencia}
              className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50 transition-colors flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              Cargar Evidencia
            </button>
            {accion.estado !== 'COMPLETADA' && (
              <button 
                onClick={handleMarcarCompletada}
                className="px-3 py-1.5 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded text-sm hover:shadow transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Marcar Completada
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal Editar Acción */}
      {modalEditar && (
        <ModalEditarAccion 
          accion={accion} 
          onClose={() => setModalEditar(false)}
          onGuardar={onActualizarAccion}
        />
      )}

      {/* Modal Cargar Evidencia */}
      {modalEvidencia && (
        <ModalCargarEvidencia 
          accion={accion}
          planId={plan.id}
          onClose={() => setModalEvidencia(false)}
          onEvidenciasCargadas={async () => {
            // Recargar contador de evidencias
            try {
              const evidencias = await controlInternoService.getEvidenciasByAccion(accion.id);
              setEvidenciasCount(Array.isArray(evidencias) ? evidencias.length : 0);
            } catch (e) {
              // fallback
            }
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

function MiniCardAccion({ accion }: { accion: AccionCorrectiva }) {
  const estadoConfig = {
    PENDIENTE: { bg: 'bg-gray-100', text: 'text-gray-700' },
    EN_EJECUCION: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    COMPLETADA: { bg: 'bg-green-100', text: 'text-green-700' },
    VENCIDA: { bg: 'bg-red-100', text: 'text-red-700' }
  };

  const config = estadoConfig[accion.estado];

  return (
    <div className="bg-white rounded border border-gray-200 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-900 flex-1">{accion.descripcion}</p>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ml-2 ${config.bg} ${config.text}`}>
          {accion.progreso}%
        </span>
      </div>
      <div className="text-xs text-gray-600">
        {accion.responsable} • Vence: {accion.fechaVencimiento}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: DOCUMENTOS
// ════════════════════════════════════════════════════════════════════════════

function TabDocumentos({ plan }: { plan: PlanMejoramientoDetalle }) {
  const [modalCargarDocumento, setModalCargarDocumento] = useState(false);
  const [documentoVistaPrevia, setDocumentoVistaPrevia] = useState<DocumentoPlan | null>(null);

  const handleCargarDocumento = () => {
    setModalCargarDocumento(true);
  };

  const handleVerDocumento = (doc: DocumentoPlan) => {
    setDocumentoVistaPrevia(doc);
    
    toast.info('Abriendo Vista Previa', {
      description: `Cargando ${doc.nombre}...`,
      duration: 2000,
    });

    // Log para debugging
    console.log('👁️ Ver documento:', {
      documentoId: doc.id,
      nombre: doc.nombre,
      tipo: doc.tipo,
      tamanio: doc.tamanio,
      usuario: 'Usuario Actual',
      timestamp: new Date().toISOString()
    });

    // En producción: abrir modal de vista previa o redirigir a URL del documento
    // window.open(doc.url, '_blank');
  };

  const handleDescargarDocumento = (doc: DocumentoPlan) => {
    toast.success('Descargando Documento', {
      description: `${doc.nombre} se está descargando...`,
      duration: 3000,
    });

    // Log para debugging
    console.log('📥 Descargar documento:', {
      documentoId: doc.id,
      nombre: doc.nombre,
      tipo: doc.tipo,
      tamanio: doc.tamanio,
      usuario: 'Usuario Actual',
      timestamp: new Date().toISOString()
    });

  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-medium text-gray-900">Documentos y Evidencias</h3>
          <p className="text-sm text-gray-600">0 archivos (sección en desarrollo)</p>
        </div>

        <button 
          onClick={handleCargarDocumento}
          className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Cargar Documento
        </button>
      </div>

      {/* Placeholder - Los documentos se cargarán del backend cuando se implemente el endpoint */}
      <div className="text-center py-8 text-gray-500">
        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="font-medium">Sin documentos cargados</p>
        <p className="text-sm">Esta sección estará disponible próximamente</p>
      </div>

      {/*  Modal Cargar Documento - Pendiente de implementación */}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: SEGUIMIENTO (TIMELINE)
// ════════════════════════════════════════════════════════════════════════════

function TabSeguimiento({ plan }: { plan: PlanMejoramientoDetalle }) {
  const [seguimientoExpandido, setSeguimientoExpandido] = useState<string | null>(null);

  const seguimientos = plan.seguimientos || [];
  const haySeguimientos = seguimientos.length > 0;

  // Ordenar por fecha más reciente primero
  const seguimientosOrdenados = [...seguimientos].sort((a, b) => {
    const fechaA = new Date(`${a.año}-${String(a.trimestre * 3).padStart(2, '0')}-01`);
    const fechaB = new Date(`${b.año}-${String(b.trimestre * 3).padStart(2, '0')}-01`);
    return fechaB.getTime() - fechaA.getTime();
  });

  const getNombreTrimestre = (trimestre: number) => {
    const nombres: Record<number, string> = {
      1: 'Primer Trimestre',
      2: 'Segundo Trimestre',
      3: 'Tercer Trimestre',
      4: 'Cuarto Trimestre'
    };
    return nombres[trimestre] || `Trimestre ${trimestre}`;
  };

  const getColorCumplimiento = (porcentaje: number) => {
    if (porcentaje >= 80) return 'text-green-600 bg-green-100';
    if (porcentaje >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getColorEfectividad = (porcentaje: number) => {
    if (porcentaje >= 70) return 'text-green-600';
    if (porcentaje >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-medium text-gray-900">Seguimientos Trimestrales</h3>
          <p className="text-sm text-gray-600">
            {haySeguimientos 
              ? `${seguimientos.length} seguimiento${seguimientos.length > 1 ? 's' : ''} registrado${seguimientos.length > 1 ? 's' : ''}`
              : 'Historial de seguimiento del plan'}
          </p>
        </div>
      </div>

      {!haySeguimientos ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Sin seguimientos registrados</p>
          <p className="text-sm mt-1">
            Los seguimientos trimestrales aparecerán aquí cuando se registren avances
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {seguimientosOrdenados.map((seguimiento, index) => (
            <div 
              key={seguimiento.id} 
              className="bg-white border border-gray-200 rounded-lg overflow-hidden"
            >
              {/* Header del seguimiento */}
              <button
                onClick={() => setSeguimientoExpandido(
                  seguimientoExpandido === seguimiento.id ? null : seguimiento.id
                )}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-700 font-semibold text-sm">T{seguimiento.trimestre}</span>
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">
                      {getNombreTrimestre(seguimiento.trimestre)} - {seguimiento.año}
                    </div>
                    <div className="text-xs text-gray-500">
                      {seguimiento.fechaInicio && seguimiento.fechaFin 
                        ? `${seguimiento.fechaInicio} al ${seguimiento.fechaFin}`
                        : seguimiento.fechaSeguimiento 
                          ? `Realizado: ${seguimiento.fechaSeguimiento}`
                          : 'Sin fechas'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Indicadores */}
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <div className={`text-lg font-bold ${getColorCumplimiento(seguimiento.porcentajeCumplimiento).split(' ')[0]}`}>
                        {seguimiento.porcentajeCumplimiento}%
                      </div>
                      <div className="text-xs text-gray-500">Cumplimiento</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-bold ${getColorEfectividad(seguimiento.porcentajeEfectividad)}`}>
                        {seguimiento.porcentajeEfectividad}%
                      </div>
                      <div className="text-xs text-gray-500">Efectividad</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-700">
                        {seguimiento.accionesRevisadas}/{seguimiento.accionesTotales}
                      </div>
                      <div className="text-xs text-gray-500">Acciones</div>
                    </div>
                  </div>

                  <ChevronDown 
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      seguimientoExpandido === seguimiento.id ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Detalle expandible */}
              {seguimientoExpandido === seguimiento.id && (
                <div className="border-t border-gray-200 px-5 py-4 bg-gray-50">
                  {/* Barras de progreso */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Cumplimiento</div>
                      <div className="bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            seguimiento.porcentajeCumplimiento >= 80 ? 'bg-green-500' :
                            seguimiento.porcentajeCumplimiento >= 50 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${seguimiento.porcentajeCumplimiento}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Efectividad</div>
                      <div className="bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            seguimiento.porcentajeEfectividad >= 70 ? 'bg-green-500' :
                            seguimiento.porcentajeEfectividad >= 40 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${seguimiento.porcentajeEfectividad}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Observaciones generales */}
                  {seguimiento.observacionesGenerales && (
                    <div className="mb-4">
                      <div className="text-xs font-medium text-gray-700 mb-1">Observaciones Generales</div>
                      <div className="text-sm text-gray-600 bg-white p-3 rounded border border-gray-200">
                        {seguimiento.observacionesGenerales}
                      </div>
                    </div>
                  )}

                  {/* Registros de acciones */}
                  {seguimiento.registros && seguimiento.registros.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-gray-700 mb-2">
                        Detalle por Acción ({seguimiento.registros.length})
                      </div>
                      <div className="space-y-2">
                        {seguimiento.registros.map((registro) => (
                          <div 
                            key={registro.id}
                            className="bg-white p-3 rounded border border-gray-200"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <p className="text-sm text-gray-900">{registro.accionDescripcion}</p>
                                <div className="flex items-center gap-4 mt-2 text-xs">
                                  <span className="text-gray-500">
                                    Implementadas: {registro.accionesImplementadas}/{registro.accionesProgramadas}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded ${
                                    registro.controlesImplementados === 'SI' ? 'bg-green-100 text-green-700' :
                                    registro.controlesImplementados === 'PARCIAL' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    Controles: {registro.controlesImplementados}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded ${
                                    registro.hallazgoSeRepite === 'NO' ? 'bg-green-100 text-green-700' :
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {registro.hallazgoSeRepite === 'NO' ? 'No se repite' : 'Se repite'}
                                  </span>
                                </div>
                                {registro.observaciones && (
                                  <p className="text-xs text-gray-500 mt-2 italic">
                                    {registro.observaciones}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-gray-500">Puntajes</div>
                                <div className="text-sm font-medium">
                                  C: {registro.puntajeCumplimiento} | E: {registro.puntajeEfectividad}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sin registros detallados */}
                  {(!seguimiento.registros || seguimiento.registros.length === 0) && (
                    <div className="text-center py-4 text-gray-400 text-sm">
                      Sin detalle de acciones para este seguimiento
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TimelineItem({ actividad, isLast }: { actividad: ActividadTimeline; isLast: boolean }) {
  const tipoConfig = {
    CREACION: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Plus },
    ACTUALIZACION: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Edit2 },
    COMPLETADA: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2 },
    EVIDENCIA: { bg: 'bg-purple-100', text: 'text-purple-700', icon: Paperclip },
    COMENTARIO: { bg: 'bg-gray-100', text: 'text-gray-700', icon: MessageSquare }
  };

  const config = tipoConfig[actividad.tipo];
  const Icon = config.icon;

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${config.text}`} />
        </div>
        {!isLast && <div className="flex-1 w-0.5 bg-gray-200 mt-2" style={{ minHeight: '40px' }} />}
      </div>

      <div className="flex-1 pb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-900 mb-2">{actividad.descripcion}</p>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {actividad.usuario}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {actividad.fecha}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ════════════════════════════════════════════════════════════════════════════

function InfoItem({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <div className="text-sm text-gray-900">{valor}</div>
    </div>
  );
}

function ProgresoBar({ label, valor, total, color }: { label: string; valor: number; total: number; color: string }) {
  const porcentaje = total > 0 ? Math.round((valor / total) * 100) : 0;

  const colorClasses = {
    green: 'bg-green-600',
    yellow: 'bg-yellow-600',
    gray: 'bg-gray-600',
    red: 'bg-red-600'
  };

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-gray-700">{label}</span>
        <span className="text-gray-900 font-medium">{valor}/{total} ({porcentaje}%)</span>
      </div>
      <div className="bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-full transition-all ${colorClasses[color as keyof typeof colorClasses]}`}
          style={{ width: `${porcentaje}%` }}
        />
      </div>
    </div>
  );
}

function FiltroButton({ active, onClick, label, color = 'gray' }: any) {
  const colorClasses = {
    green: active ? 'bg-green-100 text-green-700 border-green-300' : 'bg-white text-gray-700 border-gray-300',
    yellow: active ? 'bg-yellow-100 text-yellow-700 border-yellow-300' : 'bg-white text-gray-700 border-gray-300',
    gray: active ? 'bg-gray-100 text-gray-900 border-gray-400' : 'bg-white text-gray-700 border-gray-300'
  };

  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors ${colorClasses[color]}`}
    >
      {label}
    </button>
  );
}

import { ChevronDown } from 'lucide-react';

// ════════════════════════════════════════════════════════════════════════════
// MODAL: EDITAR ACCIÓN
// ════════════════════════════════════════════════════════════════════════════

interface ModalEditarAccionProps {
  accion: AccionCorrectiva;
  onClose: () => void;
  onGuardar: (accionId: string, data: any) => Promise<boolean>;
}

function ModalEditarAccion({ accion, onClose, onGuardar }: ModalEditarAccionProps) {
  const [guardando, setGuardando] = useState(false);
  const [profesionales, setProfesionales] = useState<{id: string; nombre: string; cargo: string}[]>([]);
  const [cargandoProfesionales, setCargandoProfesionales] = useState(true);
  const [datosEdicion, setDatosEdicion] = useState({
    descripcion: accion.descripcion,
    responsable: accion.responsable,
    fechaInicio: accion.fechaInicio,
    fechaVencimiento: accion.fechaVencimiento,
    estado: accion.estado,
    progreso: accion.progreso,
    observaciones: accion.observaciones || ''
  });

  // Cargar profesionales OCIG al montar
  useEffect(() => {
    const cargarProfesionales = async () => {
      setCargandoProfesionales(true);
      try {
        const response = await configuracionesProfesionalesOCIGApi.getAll();
        
        if (response.success && response.data && response.data.length > 0) {
          const profs = response.data
            .filter((config: any) => config.activo)
            .map((config: any) => ({
              id: String(config.idTercero),
              nombre: config.nombre || `Profesional ${config.idTercero}`,
              cargo: config.rolOcig || 'Profesional'
            }));
          setProfesionales(profs);
        }
      } catch (error) {
        console.error('[ModalEditarAccion] Error cargando profesionales:', error);
      } finally {
        setCargandoProfesionales(false);
      }
    };
    
    cargarProfesionales();
  }, []);

  const handleGuardar = async () => {
    // Validaciones
    if (!datosEdicion.descripcion.trim()) {
      toast.error('La descripción es obligatoria');
      return;
    }

    if (!datosEdicion.responsable.trim()) {
      toast.error('El responsable es obligatorio');
      return;
    }

    if (datosEdicion.progreso < 0 || datosEdicion.progreso > 100) {
      toast.error('El progreso debe estar entre 0 y 100');
      return;
    }

    // ✅ LLAMADA AL BACKEND
    setGuardando(true);
    const exito = await onGuardar(accion.id, datosEdicion);
    setGuardando(false);
    
    if (exito) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[10001] overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white px-6 py-4 rounded-t-xl">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-medium mb-1">Editar Acción Correctiva</h3>
              <p className="text-sm text-blue-100">Actualizar información de la acción</p>
            </div>
            <button
              onClick={onClose}
              className="ml-4 p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-auto px-6 py-6">
          <div className="space-y-4">
            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción <span className="text-red-500">*</span>
              </label>
              <textarea
                value={datosEdicion.descripcion}
                onChange={(e) => setDatosEdicion({ ...datosEdicion, descripcion: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                placeholder="Descripción detallada de la acción correctiva"
              />
            </div>

            {/* Responsable y Estado */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Responsable <span className="text-red-500">*</span>
                </label>
                {cargandoProfesionales ? (
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-500 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Cargando...
                  </div>
                ) : profesionales.length > 0 ? (
                  <select
                    value={datosEdicion.responsable}
                    onChange={(e) => setDatosEdicion({ ...datosEdicion, responsable: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                  >
                    <option value="">Seleccionar responsable...</option>
                    {/* Opción actual si no está en la lista */}
                    {datosEdicion.responsable && !profesionales.find(p => p.nombre === datosEdicion.responsable) && (
                      <option value={datosEdicion.responsable}>{datosEdicion.responsable} (actual)</option>
                    )}
                    {profesionales.map((prof) => (
                      <option key={prof.id} value={prof.nombre}>
                        {prof.nombre} - {prof.cargo}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={datosEdicion.responsable}
                    onChange={(e) => setDatosEdicion({ ...datosEdicion, responsable: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                    placeholder="Nombre del responsable"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado
                </label>
                <select
                  value={datosEdicion.estado}
                  onChange={(e) => setDatosEdicion({ ...datosEdicion, estado: e.target.value as AccionCorrectiva['estado'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                >
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="EN_EJECUCION">En Ejecución</option>
                  <option value="COMPLETADA">Completada</option>
                  <option value="VENCIDA">Vencida</option>
                </select>
              </div>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  value={datosEdicion.fechaInicio}
                  onChange={(e) => setDatosEdicion({ ...datosEdicion, fechaInicio: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha Vencimiento
                </label>
                <input
                  type="date"
                  value={datosEdicion.fechaVencimiento}
                  onChange={(e) => setDatosEdicion({ ...datosEdicion, fechaVencimiento: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Progreso */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Progreso: {datosEdicion.progreso}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={datosEdicion.progreso}
                onChange={(e) => setDatosEdicion({ ...datosEdicion, progreso: parseInt(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones
              </label>
              <textarea
                value={datosEdicion.observaciones}
                onChange={(e) => setDatosEdicion({ ...datosEdicion, observaciones: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                placeholder="Observaciones adicionales (opcional)"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-6 py-3 rounded-b-xl">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all text-sm flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL: CREAR ACCIÓN CORRECTIVA
// ════════════════════════════════════════════════════════════════════════════

interface ModalCrearAccionProps {
  hallazgos: Hallazgo[];
  hallazgoPreseleccionado?: string;
  onClose: () => void;
  onCrear: (data: any) => Promise<boolean>;
}

function ModalCrearAccion({ hallazgos, hallazgoPreseleccionado, onClose, onCrear }: ModalCrearAccionProps) {
  const [guardando, setGuardando] = useState(false);
  const [profesionales, setProfesionales] = useState<{id: string; nombre: string; cargo: string}[]>([]);
  const [cargandoProfesionales, setCargandoProfesionales] = useState(true);
  const [datosAccion, setDatosAccion] = useState({
    hallazgoId: hallazgoPreseleccionado || (hallazgos.length > 0 ? hallazgos[0].id : ''),
    descripcion: '',
    responsable: '',
    fechaInicio: new Date().toISOString().split('T')[0],
    fechaVencimiento: '',
    observaciones: ''
  });

  // Cargar profesionales OCIG al montar
  useEffect(() => {
    const cargarProfesionales = async () => {
      setCargandoProfesionales(true);
      try {
        const response = await configuracionesProfesionalesOCIGApi.getAll();
        console.log('[ModalCrearAccion] Profesionales OCIG response:', response);
        
        if (response.success && response.data && response.data.length > 0) {
          const profs = response.data
            .filter((config: any) => config.activo)
            .map((config: any) => ({
              id: String(config.idTercero),
              nombre: config.nombre || `Profesional ${config.idTercero}`,
              cargo: config.rolOcig || 'Profesional'
            }));
          setProfesionales(profs);
          console.log('[ModalCrearAccion] Profesionales cargados:', profs.length);
        } else {
          console.warn('[ModalCrearAccion] No hay profesionales OCIG configurados');
          toast.warning('No hay profesionales configurados');
        }
      } catch (error) {
        console.error('[ModalCrearAccion] Error cargando profesionales:', error);
        toast.error('Error al cargar profesionales');
      } finally {
        setCargandoProfesionales(false);
      }
    };
    
    cargarProfesionales();
  }, []);

  const handleCrear = async () => {
    // Validaciones
    if (!datosAccion.hallazgoId) {
      toast.error('Debes seleccionar un hallazgo');
      return;
    }

    if (!datosAccion.descripcion.trim()) {
      toast.error('La descripción es obligatoria');
      return;
    }

    if (!datosAccion.responsable.trim()) {
      toast.error('El responsable es obligatorio');
      return;
    }

    if (!datosAccion.fechaInicio) {
      toast.error('La fecha de inicio es obligatoria');
      return;
    }

    if (!datosAccion.fechaVencimiento) {
      toast.error('La fecha de vencimiento es obligatoria');
      return;
    }

    // Validar que fecha vencimiento sea posterior a fecha inicio
    if (new Date(datosAccion.fechaVencimiento) < new Date(datosAccion.fechaInicio)) {
      toast.error('La fecha de vencimiento debe ser posterior a la fecha de inicio');
      return;
    }

    // Llamar al backend
    setGuardando(true);
    const exito = await onCrear({
      hallazgoId: datosAccion.hallazgoId,
      descripcion: datosAccion.descripcion,
      responsable: datosAccion.responsable,
      fechaInicio: datosAccion.fechaInicio,
      fechaFin: datosAccion.fechaVencimiento,  // Backend usa fechaFin
      observaciones: datosAccion.observaciones
    });
    setGuardando(false);
    
    if (exito) {
      onClose();
    }
  };

  const hallazgoSeleccionado = hallazgos.find(h => h.id === datosAccion.hallazgoId);

  return (
    <div className="fixed inset-0 z-[10001] overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white px-6 py-4 rounded-t-xl">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-medium mb-1">Nueva Acción Correctiva</h3>
              <p className="text-sm text-blue-100">Crear una nueva acción para el plan de mejoramiento</p>
            </div>
            <button
              onClick={onClose}
              className="ml-4 p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-auto px-6 py-6">
          <div className="space-y-4">
            {/* Hallazgo asociado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hallazgo Asociado <span className="text-red-500">*</span>
              </label>
              <select
                value={datosAccion.hallazgoId}
                onChange={(e) => setDatosAccion({ ...datosAccion, hallazgoId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                disabled={!!hallazgoPreseleccionado}
              >
                {hallazgos.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.codigo} - {h.descripcion.substring(0, 60)}{h.descripcion.length > 60 ? '...' : ''}
                  </option>
                ))}
              </select>
              {hallazgoSeleccionado && (
                <div className={`mt-2 text-xs px-2 py-1 rounded inline-block ${
                  hallazgoSeleccionado.criticidad === 'ALTA' ? 'bg-red-100 text-red-700' :
                  hallazgoSeleccionado.criticidad === 'MEDIA' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  Criticidad: {hallazgoSeleccionado.criticidad}
                </div>
              )}
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción de la Acción <span className="text-red-500">*</span>
              </label>
              <textarea
                value={datosAccion.descripcion}
                onChange={(e) => setDatosAccion({ ...datosAccion, descripcion: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                placeholder="Describe la acción correctiva a implementar..."
              />
            </div>

            {/* Responsable */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Responsable <span className="text-red-500">*</span>
              </label>
              {cargandoProfesionales ? (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-500 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cargando profesionales...
                </div>
              ) : profesionales.length > 0 ? (
                <select
                  value={datosAccion.responsable}
                  onChange={(e) => setDatosAccion({ ...datosAccion, responsable: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                >
                  <option value="">Seleccionar responsable...</option>
                  {profesionales.map((prof) => (
                    <option key={prof.id} value={prof.nombre}>
                      {prof.nombre} - {prof.cargo}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={datosAccion.responsable}
                  onChange={(e) => setDatosAccion({ ...datosAccion, responsable: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                  placeholder="Nombre del responsable de implementar la acción"
                />
              )}
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha Inicio <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={datosAccion.fechaInicio}
                  onChange={(e) => setDatosAccion({ ...datosAccion, fechaInicio: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha Vencimiento <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={datosAccion.fechaVencimiento}
                  onChange={(e) => setDatosAccion({ ...datosAccion, fechaVencimiento: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones
              </label>
              <textarea
                value={datosAccion.observaciones}
                onChange={(e) => setDatosAccion({ ...datosAccion, observaciones: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                placeholder="Observaciones adicionales (opcional)"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-6 py-3 rounded-b-xl">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={guardando}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleCrear}
              disabled={guardando}
              className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {guardando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Crear Acción
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL: CARGAR EVIDENCIA
// ════════════════════════════════════════════════════════════════════════════

interface ModalCargarEvidenciaProps {
  accion: AccionCorrectiva;
  planId: string;
  onClose: () => void;
  onEvidenciasCargadas?: () => void;
}

function ModalCargarEvidencia({ accion, planId, onClose, onEvidenciasCargadas }: ModalCargarEvidenciaProps) {
  const [archivosSeleccionados, setArchivosSeleccionados] = useState<File[]>([]);
  const [observaciones, setObservaciones] = useState('');
  const [cargando, setCargando] = useState(false);
  const [progresoArchivos, setProgresoArchivos] = useState<Record<number, number>>({});

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const nuevosArchivos = Array.from(e.target.files);
      setArchivosSeleccionados([...archivosSeleccionados, ...nuevosArchivos]);
    }
  };

  const handleEliminarArchivo = (index: number) => {
    const nuevosArchivos = archivosSeleccionados.filter((_, i) => i !== index);
    setArchivosSeleccionados(nuevosArchivos);
  };

  const handleCargar = async () => {
    if (archivosSeleccionados.length === 0) {
      toast.error('Debes seleccionar al menos un archivo');
      return;
    }

    setCargando(true);
    let exitosos = 0;
    let errores = 0;

    // Subir cada archivo
    for (let i = 0; i < archivosSeleccionados.length; i++) {
      const archivo = archivosSeleccionados[i];
      try {
        await controlInternoService.createEvidencia(
          archivo,
          {
            nombre: archivo.name,
            descripcion: observaciones || `Evidencia para acción: ${accion.descripcion.substring(0, 50)}`,
            tipoDocumento: 'evidencia_accion',
            accionCorrectivaId: accion.id,
            // No enviar planMejoramientoId - backend solo permite UNA vinculación
          },
          (progress) => {
            setProgresoArchivos(prev => ({ ...prev, [i]: progress }));
          }
        );
        exitosos++;
      } catch (error) {
        console.error(`Error subiendo ${archivo.name}:`, error);
        errores++;
      }
    }

    setCargando(false);

    if (exitosos > 0) {
      toast.success('Evidencias Cargadas', {
        description: `${exitosos} archivo(s) cargado(s) exitosamente${errores > 0 ? `, ${errores} con error` : ''}`,
        duration: 3000,
      });
      onEvidenciasCargadas?.();
      onClose();
    } else {
      toast.error('Error al cargar evidencias', {
        description: 'No se pudo cargar ningún archivo. Intenta de nuevo.',
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-[10001] overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white px-6 py-4 rounded-t-xl">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-medium mb-1">Cargar Evidencias</h3>
              <p className="text-sm text-blue-100">Adjuntar documentos y archivos de soporte</p>
            </div>
            <button
              onClick={onClose}
              className="ml-4 p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-auto px-6 py-6">
          <div className="space-y-4">
            {/* Información de la Acción */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm font-medium text-blue-900 mb-1">Acción Correctiva</div>
              <div className="text-sm text-blue-700">{accion.descripcion}</div>
              <div className="text-xs text-blue-600 mt-2">
                Evidencias actuales: {accion.evidencias} archivo(s)
              </div>
            </div>

            {/* Zona de carga */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar Archivos <span className="text-red-500">*</span>
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#1e5da8] transition-colors">
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="w-12 h-12 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-700 font-medium">
                    Haz clic para seleccionar archivos
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    PDF, Word, Excel, Imágenes (máx. 10MB por archivo)
                  </span>
                </label>
              </div>
            </div>

            {/* Lista de archivos seleccionados */}
            {archivosSeleccionados.length > 0 && (
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Archivos Seleccionados ({archivosSeleccionados.length})
                </div>
                <div className="space-y-2">
                  {archivosSeleccionados.map((archivo, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Paperclip className="w-4 h-4 text-gray-600" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-900 truncate">
                            {archivo.name}
                          </div>
                          <div className="text-xs text-gray-600">
                            {formatFileSize(archivo.size)}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleEliminarArchivo(index)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                placeholder="Descripción de las evidencias (opcional)"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-6 py-3 rounded-b-xl">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={cargando}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleCargar}
              disabled={cargando || archivosSeleccionados.length === 0}
              className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cargando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Cargar {archivosSeleccionados.length > 0 ? `${archivosSeleccionados.length} Archivo(s)` : 'Evidencias'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL: CARGAR DOCUMENTO AL PLAN
// ════════════════════════════════════════════════════════════════════════════

interface ModalCargarDocumentoPlanProps {
  planId: string;
  onClose: () => void;
}

function ModalCargarDocumentoPlan({ planId, onClose }: ModalCargarDocumentoPlanProps) {
  const [archivosSeleccionados, setArchivosSeleccionados] = useState<File[]>([]);
  const [tipoDocumento, setTipoDocumento] = useState('');
  const [descripcion, setDescripcion] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const nuevosArchivos = Array.from(e.target.files);
      setArchivosSeleccionados([...archivosSeleccionados, ...nuevosArchivos]);
    }
  };

  const handleEliminarArchivo = (index: number) => {
    const nuevosArchivos = archivosSeleccionados.filter((_, i) => i !== index);
    setArchivosSeleccionados(nuevosArchivos);
  };

  const handleCargar = () => {
    if (archivosSeleccionados.length === 0) {
      toast.error('Debes seleccionar al menos un archivo');
      return;
    }

    if (!tipoDocumento) {
      toast.error('Debes seleccionar el tipo de documento');
      return;
    }

    // Simular carga de documentos
    toast.success('Documentos Cargados', {
      description: `${archivosSeleccionados.length} documento(s) cargado(s) exitosamente al plan`,
      duration: 3000,
    });

    console.log('📄 Cargando documentos al plan:', {
      planId,
      tipoDocumento,
      descripcion,
      archivos: archivosSeleccionados.map(f => ({
        nombre: f.name,
        tamanio: f.size,
        tipo: f.type
      })),
      usuario: 'Usuario Actual',
      timestamp: new Date().toISOString()
    });

    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-[10001] overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white px-6 py-4 rounded-t-xl">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-medium mb-1">Cargar Documento al Plan</h3>
              <p className="text-sm text-blue-100">Adjuntar documentos y evidencias del plan de mejoramiento</p>
            </div>
            <button
              onClick={onClose}
              className="ml-4 p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-auto px-6 py-6">
          <div className="space-y-4">
            {/* Tipo de Documento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Documento <span className="text-red-500">*</span>
              </label>
              <select
                value={tipoDocumento}
                onChange={(e) => setTipoDocumento(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
              >
                <option value="">Seleccionar tipo...</option>
                <option value="plan">Plan de Mejoramiento</option>
                <option value="evidencia">Evidencia</option>
                <option value="informe">Informe de Seguimiento</option>
                <option value="acta">Acta</option>
                <option value="certificado">Certificado</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            {/* Zona de carga */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar Archivos <span className="text-red-500">*</span>
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#1e5da8] transition-colors">
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload-plan"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                />
                <label
                  htmlFor="file-upload-plan"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="w-12 h-12 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-700 font-medium">
                    Haz clic para seleccionar archivos
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    PDF, Word, Excel, Imágenes (máx. 10MB por archivo)
                  </span>
                </label>
              </div>
            </div>

            {/* Lista de archivos seleccionados */}
            {archivosSeleccionados.length > 0 && (
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Archivos Seleccionados ({archivosSeleccionados.length})
                </div>
                <div className="space-y-2">
                  {archivosSeleccionados.map((archivo, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <FileText className="w-4 h-4 text-gray-600" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-900 truncate">
                            {archivo.name}
                          </div>
                          <div className="text-xs text-gray-600">
                            {formatFileSize(archivo.size)}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleEliminarArchivo(index)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                placeholder="Descripción del documento (opcional)"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-6 py-3 rounded-b-xl">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleCargar}
              className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all text-sm flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Cargar {archivosSeleccionados.length > 0 ? `${archivosSeleccionados.length} Documento(s)` : 'Documentos'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL: VISTA PREVIA DOCUMENTO
// ════════════════════════════════════════════════════════════════════════════

interface ModalVistaPreviaDocumentoProps {
  documento: DocumentoPlan;
  onClose: () => void;
}

function ModalVistaPreviaDocumento({ documento, onClose }: ModalVistaPreviaDocumentoProps) {
  const handleDescargar = () => {
    toast.success('Descargando Documento', {
      description: `${documento.nombre} se está descargando...`,
      duration: 3000,
    });

    console.log('📥 Descargar documento desde vista previa:', {
      documentoId: documento.id,
      nombre: documento.nombre,
      timestamp: new Date().toISOString()
    });
  };

  return (
    <div className="fixed inset-0 z-[10002] overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-5xl max-h-[95vh] bg-white rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white px-6 py-4 rounded-t-xl">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-medium mb-1 truncate">{documento.nombre}</h3>
              <div className="flex items-center gap-4 text-sm text-blue-100">
                <span>{documento.tipo}</span>
                <span>•</span>
                <span>{documento.tamanio}</span>
                <span>•</span>
                <span>{documento.fechaCarga}</span>
                <span>•</span>
                <span>{documento.autor}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={handleDescargar}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                title="Descargar"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Contenido - Vista Previa */}
        <div className="flex-1 overflow-auto bg-gray-100 p-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 min-h-full flex items-center justify-center">
            <div className="text-center">
              <FileText className="w-24 h-24 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">Vista Previa del Documento</h4>
              <p className="text-sm text-gray-600 mb-6 max-w-md">
                La vista previa de documentos estará disponible próximamente. Por ahora puedes descargar el archivo para visualizarlo.
              </p>
              <button
                onClick={handleDescargar}
                className="px-6 py-3 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2 mx-auto"
              >
                <Download className="w-5 h-5" />
                Descargar Documento
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-6 py-3 rounded-b-xl">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <div>
              Documento cargado el {documento.fechaCarga} por {documento.autor}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}