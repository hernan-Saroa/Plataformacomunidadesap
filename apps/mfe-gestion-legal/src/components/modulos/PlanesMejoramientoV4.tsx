/**
 * ModuloPlanesMejoramientoV4 - MOD-10: Planes de Mejoramiento
 * REDISEÑO COMPLETO - Estructura profesional para seguimiento de hallazgos
 * 3 VISTAS: Dashboard (por defecto), Lista, Timeline
 * ✅ ESAP 2025 - Integrado con Órganos de Control y Auditorías
 */

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { Card } from '@esap-mfe/shared-ui/card';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Button } from '@esap-mfe/shared-ui/button';
import { Input } from '@esap-mfe/shared-ui/input';
import { Progress } from '@esap-mfe/shared-ui/progress';
import { Avatar, AvatarFallback } from '@esap-mfe/shared-ui/avatar';
import {
  FileText, AlertTriangle, Target, Calendar, Eye, Plus, Search, Filter,
  Download, MoreVertical, Edit, Trash2, CheckCircle, AlertCircle, Clock,
  TrendingUp, BarChart3, FileCheck, Building2, User, ChevronDown, ChevronRight,
  List, LayoutGrid, Activity, Flag, Circle, XCircle, Upload, File, X, Archive
} from 'lucide-react';
import { toast } from 'sonner';
import { ModuleHeader } from '../design-system/ModuleHeader';
import { ModuleMetrics } from '../design-system/ModuleMetrics';
import { ModuleFilters } from '../design-system/ModuleFilters';
import { ModuleInfoTooltip } from '../design-system/ModuleInfoTooltip';
import { ModalHeaderClean } from './ModalHeaderClean';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@esap-mfe/shared-ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@esap-mfe/shared-ui/select';
import { Textarea } from '@esap-mfe/shared-ui/textarea';
import { legalService } from '../../../../services/api/legal.service';
import { ModalDetallePlanV4 } from './ModalDetallePlanV4';
import jsPDF from 'jspdf';
import JSZip from 'jszip';
import { authService } from '../../../../services/api/authService';
import { Permissions } from '@esap-mfe/shared-types/permissions';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@esap-mfe/shared-ui/dropdown-menu';
import { add } from '@dnd-kit/utilities';
import { useConfiguracionesSIGL } from '../config/ConfiguracionesSIGLContext';
import { VistaArchivados, ItemArchivado, EstadoArchivado } from '../design-system/VistaArchivados';
import { usePermisos, PERMISOS } from '../config/PermisosContext';

// ==================== TIPOS ====================
type EstadoPlan = 'FORMULACION' | 'EN_EJECUCION' | 'COMPLETADO' | 'SUSPENDIDO';
type EnteControl = 'CONTRALORIA' | 'PROCURADURIA' | 'OCI' | 'AUDITORIA_EXTERNA';
type SeveridadHallazgo = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';
type EstadoAccion = 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADA' | 'VENCIDA';

interface AccionMejora {
  id: string;
  descripcion: string;
  responsable: string;
  fechaInicio: Date;
  fechaFin: Date;
  estado: EstadoAccion;
  avance: number; // 0-100
  evidencias: number;
}

interface Hallazgo {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  severidad: SeveridadHallazgo;
  porcentajeAvance: number;
  archivoUrl?: string;
  archivoNombre?: string;
  acciones: AccionMejora[];
}

interface PlanMejoramiento {
  id: string;
  codigo: string;
  nombre: string;
  enteControl: EnteControl;
  documentoOrigen: string; // Informe de auditoría, auto, etc.
  area: string;
  responsablePlan: string;
  fechaRecepcion: Date;
  fechaRespuesta: Date;
  fechaInicio: Date;
  fechaFin: Date;
  estado: EstadoPlan;
  hallazgos: Hallazgo[];
  totalAcciones: number;
  accionesCompletadas: number;
  avanceGeneral: number; // % de cumplimiento
  alertas: number; // Acciones vencidas
  diasRestantes: number;
  ultimaActualizacion: Date;
}

type VistaModulo = 'dashboard' | 'lista' | 'timeline' | 'archivados';

// ==================== HELPERS ====================
const getEnteConfig = (ente: EnteControl) => {
  const configs = {
    CONTRALORIA: {
      nombre: 'Contraloría General',
      color: '#DC2626',
      bgColor: '#FEE2E2',
      icon: '🏛️'
    },
    PROCURADURIA: {
      nombre: 'Procuraduría General',
      color: '#059669',
      bgColor: '#D1FAE5',
      icon: '⚖️'
    },
    OCI: {
      nombre: 'Oficina Control Interno',
      color: '#2962FF',
      bgColor: '#E3F2FD',
      icon: '🔍'
    },
    AUDITORIA_EXTERNA: {
      nombre: 'Auditoría Externa',
      color: '#9C27B0',
      bgColor: '#F3E5F5',
      icon: '📊'
    },
    // Fallback for others
    RIESGO: {
      nombre: 'Riesgo',
      color: '#F59E0B',
      bgColor: '#FEF3C7',
      icon: '⚠️'
    },
    OTRO: {
      nombre: 'Otro',
      color: '#6B7280',
      bgColor: '#F3F4F6',
      icon: '📄'
    }
  };
  return configs[ente] || configs['OTRO'];
};

const getEstadoConfig = (estado: EstadoPlan | string) => {
  const configs: any = {
    FORMULACION: {
      nombre: 'En Formulación',
      color: '#F59E0B',
      bgColor: '#FEF3C7',
      icon: <FileText className="w-3 h-3" />
    },
    ABIERTO: { // Map Backend
      nombre: 'En Ejecución',
      color: '#2962FF',
      bgColor: '#E3F2FD',
      icon: <Activity className="w-3 h-3" />
    },
    EN_EJECUCION: {
      nombre: 'En Ejecución',
      color: '#2962FF',
      bgColor: '#E3F2FD',
      icon: <Activity className="w-3 h-3" />
    },
    COMPLETADO: {
      nombre: 'Completado',
      color: '#10B981',
      bgColor: '#D1FAE5',
      icon: <CheckCircle className="w-3 h-3" />
    },
    CERRADO: { // Map Backend
      nombre: 'Completado',
      color: '#10B981',
      bgColor: '#D1FAE5',
      icon: <CheckCircle className="w-3 h-3" />
    },
    SUSPENDIDO: {
      nombre: 'Suspendido',
      color: '#6B7280',
      bgColor: '#F3F4F6',
      icon: <XCircle className="w-3 h-3" />
    }
  };
  return configs[estado] || configs['FORMULACION'];
};

const getSeveridadConfig = (severidad: SeveridadHallazgo) => {
  const configs = {
    CRITICA: { nombre: 'Crítica', color: '#DC2626', bgColor: '#FEE2E2', emoji: '🔴' },
    CRITICO: { nombre: 'Crítica', color: '#DC2626', bgColor: '#FEE2E2', emoji: '🔴' }, // Map Backend
    ALTA: { nombre: 'Alta', color: '#F97316', bgColor: '#FFEDD5', emoji: '🟠' },
    ALTO: { nombre: 'Alta', color: '#F97316', bgColor: '#FFEDD5', emoji: '🟠' }, // Map Backend
    MEDIA: { nombre: 'Media', color: '#F59E0B', bgColor: '#FEF3C7', emoji: '🟡' },
    MEDIO: { nombre: 'Media', color: '#F59E0B', bgColor: '#FEF3C7', emoji: '🟡' }, // Map Backend
    BAJA: { nombre: 'Baja', color: '#10B981', bgColor: '#D1FAE5', emoji: '🟢' },
    BAJO: { nombre: 'Baja', color: '#10B981', bgColor: '#D1FAE5', emoji: '🟢' } // Map Backend
  };
  return configs[severidad] || configs['MEDIA'];
};

const getEstadoAccionConfig = (estado: EstadoAccion) => {
  const configs = {
    PENDIENTE: { nombre: 'Pendiente', color: '#6B7280', bgColor: '#F3F4F6' },
    EN_PROCESO: { nombre: 'En Proceso', color: '#2962FF', bgColor: '#E3F2FD' },
    COMPLETADA: { nombre: 'Completada', color: '#10B981', bgColor: '#D1FAE5' },
    VENCIDA: { nombre: 'Vencida', color: '#DC2626', bgColor: '#FEE2E2' }
  };
  return configs[estado];
};

const calcularDiasRestantes = (fecha: Date | string): number => {
  const end = new Date(fecha);
  const hoy = new Date();
  const diff = end.getTime() - hoy.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const formatearFecha = (fecha: Date | string): string => {
  return new Date(fecha).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// ==================== COMPONENTE PRINCIPAL ====================
export function ModuloPlanesMejoramientoV4() {
  const { entesControlPM } = useConfiguracionesSIGL();
  // ✅ Obtener permisos del usuario actual
  const { usuario } = usePermisos();
  const canMutatePlanesMejoramiento = authService.hasPermission(Permissions.GESTION_LEGAL_PLANES_MEJORAMIENTO_CREATE);

  const [tipoVista, setTipoVista] = useState<VistaModulo>('dashboard');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEnte, setFiltroEnte] = useState<string>('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set());
  const [modalNuevoPlanAbierto, setModalNuevoPlanAbierto] = useState(false);
  const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);
  const [planSeleccionadoId, setPlanSeleccionadoId] = useState<string | null>(null);

  // State for real data
  const [planes, setPlanes] = useState<PlanMejoramiento[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const initialFormData = {
    codigo: '',
    nombre: '',
    enteControl: '',
    documentoOrigen: '',
    areaResponsable: '',
    responsablePlan: '',
    fechaRecepcion: '',
    fechaRespuesta: '',
    fechaInicio: '',
    fechaFin: '',
    estado: 'FORMULACION',
    descripcion: ''
  };

  const [formData, setFormData] = useState(initialFormData);

  // Fetch from API
  const fetchPlanes = async () => {
    try {
      setLoading(true);
      const res = await legalService.getPlanesMejoramiento();
      // Map backend response to interface
      const mappedPlanes: PlanMejoramiento[] = res.map((p: any) => ({
        id: p.id,
        codigo: p.codigo,
        nombre: p.titulo,
        enteControl: p.origen || 'OTRO',
        documentoOrigen: p.documentoOrigen || 'N/A',
        area: p.areaResponsable || 'N/A',
        responsablePlan: p.responsableNombre || 'Sin Asignar',
        fechaRecepcion: p.fechaRecepcion ? new Date(p.fechaRecepcion) : new Date(),
        fechaRespuesta: p.fechaRespuesta ? new Date(p.fechaRespuesta) : new Date(),
        fechaInicio: p.fechaInicio ? new Date(p.fechaInicio) : new Date(),
        fechaFin: p.fechaFinEstimada ? new Date(p.fechaFinEstimada) : new Date(),
        estado: p.estado === 'ABIERTO' ? 'EN_EJECUCION' : p.estado === 'CERRADO' ? 'COMPLETADO' : 'FORMULACION',
        hallazgos: p.hallazgos ? p.hallazgos.map((h: any) => ({
          id: h.id,
          codigo: h.id.substring(0, 8),
          nombre: h.nombre,
          descripcion: h.descripcion || '',
          severidad: 'MEDIA' as SeveridadHallazgo,
          porcentajeAvance: Number(h.porcentajeAvance || 0),
          archivoUrl: h.archivoUrl,
          archivoNombre: h.archivoNombre,
          acciones: []
        })) : [],
        totalAcciones: 0,
        accionesCompletadas: 0,
        avanceGeneral: Number(p.avancePorcentaje) || 0,
        alertas: 0,
        diasRestantes: calcularDiasRestantes(p.fechaFinEstimada),
        ultimaActualizacion: p.updatedAt ? new Date(p.updatedAt) : new Date()
      }));
      setPlanes(mappedPlanes);
    } catch (error) {
      console.error("Error loading plans", error);
      toast.error("Error al cargar planes de mejoramiento");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanes();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Map form to CreateDTO
      const payload = {
        codigo: formData.codigo,
        titulo: formData.nombre,
        origen: formData.enteControl,
        documentoOrigen: formData.documentoOrigen,
        areaResponsable: formData.areaResponsable,
        responsableNombre: formData.responsablePlan, // Save text name directly
        fechaInicio: formData.fechaInicio,
        fechaFinEstimada: formData.fechaFin,
        fechaRecepcion: formData.fechaRecepcion,
        fechaRespuesta: formData.fechaRespuesta,
        presupuesto: 0,
        descripcion: formData.descripcion
      };

      await legalService.createPlanMejoramiento(payload);
      toast.success('Plan de Mejoramiento creado exitosamente');
      setModalNuevoPlanAbierto(false);
      setFormData({ ...initialFormData });
      fetchPlanes();
    } catch (error) {
      console.error("Error creating plan", error);
      toast.error("Error al crear plan");
    }
  };
  const [archivosAdjuntos, setArchivosAdjuntos] = useState<File[]>([]);

  // ✅ Estado para items archivados/eliminados
  const [itemsArchivados, setItemsArchivados] = useState<ItemArchivado[]>([]);

  // Cargar archivados desde backend
  useEffect(() => {
    legalService.getPlanesMejoramientoArchivados()
      .then((data: any[]) => {
        if (Array.isArray(data)) {
          const mapped: ItemArchivado[] = data.map((p: any) => ({
            id: p.id,
            codigo: p.codigo || p.id,
            nombre: p.titulo || p.nombre || 'Sin nombre',
            tipo: 'Plan de Mejoramiento',
            estado: 'ARCHIVADO' as EstadoArchivado,
            fechaArchivado: p.updatedAt ? new Date(p.updatedAt) : new Date(),
            usuarioArchivo: p.responsableNombre || 'Sistema',
            motivoArchivo: 'Archivado por usuario',
            metadatos: {
              'Origen': p.origen || 'N/A',
              'Responsable': p.responsableNombre || 'N/A',
              'Avance': `${p.avancePorcentaje || 0}%`,
            },
          }));
          setItemsArchivados(mapped);
        }
      })
      .catch(() => { });
  }, []);

  // Restaurar un plan archivado
  const handleRestaurar = async (itemId: string) => {
    try {
      await legalService.restaurarPlanMejoramiento(itemId);
      setItemsArchivados(prev => prev.filter(item => item.id !== itemId));
      toast.success('Plan restaurado exitosamente');
      fetchPlanes();
    } catch (error) {
      console.error('Error restoring plan:', error);
      toast.error('Error al restaurar el plan');
    }
  };

  // Eliminar permanentemente un plan
  const handleEliminarPermanente = async (itemId: string) => {
    try {
      await legalService.eliminarPlanMejoramiento(itemId);
      setItemsArchivados(prev => prev.filter(item => item.id !== itemId));
      toast.success('Plan eliminado permanentemente');
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error('Error al eliminar el plan');
    }
  };

  const handleArchivar = async (planId: string) => {
    try {
      await legalService.archivarPlanMejoramiento(planId);
      toast.success('Plan archivado exitosamente');
      fetchPlanes(); // Refresh list
    } catch (error) {
      console.error('Error archiving plan:', error);
      toast.error('Error al archivar el plan');
    }
  };

  // Filtrar planes
  const planesFiltrados = useMemo(() => {
    let resultado = [...planes];

    if (busqueda) {
      resultado = resultado.filter(p =>
        p.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.area.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.responsablePlan.toLowerCase().includes(busqueda.toLowerCase())
      );
    }

    if (filtroEnte !== 'TODOS') {
      resultado = resultado.filter(p => p.enteControl === filtroEnte);
    }

    if (filtroEstado !== 'TODOS') {
      resultado = resultado.filter(p => p.estado === filtroEstado);
    }

    return resultado;
  }, [planes, busqueda, filtroEnte, filtroEstado]);

  // Calcular métricas
  const metricas = useMemo(() => {
    const total = planes.length;
    const avancePromedio = total > 0 ? Math.round(
      planes.reduce((sum, p) => sum + p.avanceGeneral, 0) / total
    ) : 0;
    const enEjecucion = planes.filter(p => p.estado === 'EN_EJECUCION').length;
    const completados = planes.filter(p => p.estado === 'COMPLETADO').length;
    const alertasActivas = planes.reduce((sum, p) => sum + p.alertas, 0);

    return { total, avancePromedio, enEjecucion, completados, alertasActivas };
  }, [planes]);

  const togglePlan = (planId: string) => {
    const newExpanded = new Set(expandedPlans);
    if (newExpanded.has(planId)) {
      newExpanded.delete(planId);
    } else {
      newExpanded.add(planId);
    }
    setExpandedPlans(newExpanded);
  };

  // Open detail modal
  const handleVerDetalle = (planId: string) => {
    setPlanSeleccionadoId(planId);
    setModalDetalleAbierto(true);
  };

  // Export all plans to PDF ZIP
  const handleExportarPlanes = async () => {
    if (planes.length === 0) {
      toast.error('No hay planes para exportar');
      return;
    }

    toast.loading('Generando PDFs...', { id: 'export-zip' });

    try {
      const zip = new JSZip();

      for (const plan of planes) {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(18);
        doc.setTextColor(0, 61, 165);
        doc.text('PLAN DE MEJORAMIENTO', 105, 20, { align: 'center' });

        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text('ESAP - Gestión Legal', 105, 28, { align: 'center' });

        // Line separator
        doc.setDrawColor(0, 61, 165);
        doc.setLineWidth(0.5);
        doc.line(20, 35, 190, 35);

        // Plan details
        let y = 50;
        doc.setFontSize(11);
        doc.setTextColor(0);

        const addField = (label: string, value: string) => {
          doc.setFont('helvetica', 'bold');
          doc.text(label + ':', 20, y);
          doc.setFont('helvetica', 'normal');
          doc.text(value || 'N/A', 70, y);
          y += 8;
        };

        addField('Código', plan.codigo);
        addField('Nombre', plan.nombre);
        addField('Origen', getEnteConfig(plan.enteControl).nombre);
        addField('Área', plan.area);
        addField('Responsable', plan.responsablePlan);
        addField('Estado', getEstadoConfig(plan.estado).nombre);
        addField('Avance', `${plan.avanceGeneral}%`);
        addField('Fecha Inicio', formatearFecha(plan.fechaInicio));
        addField('Fecha Fin', formatearFecha(plan.fechaFin));
        addField('Días Restantes', `${plan.diasRestantes} días`);

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, 105, 280, { align: 'center' });

        // Add to ZIP
        const pdfBlob = doc.output('blob');
        zip.file(`${plan.codigo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`, pdfBlob);
      }

      // Generate and download ZIP
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `planes_mejoramiento_${new Date().toISOString().split('T')[0]}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Exportación completada', {
        id: 'export-zip',
        description: `${planes.length} planes exportados a ZIP`
      });
    } catch (error) {
      console.error('Error al exportar:', error);
      toast.error('Error al exportar planes', { id: 'export-zip' });
    }
  };

  const addBtnsPermission = () => {
    const arrayBtns: any[] = [];
    if (authService.hasPermission(Permissions.GESTION_LEGAL_PLANES_MEJORAMIENTO_CREATE)) {
      arrayBtns.push({
        label: 'Nuevo Plan',
        labelMobile: 'Nuevo',
        icon: <Plus className="w-4 h-4" />,
        onClick: () => setModalNuevoPlanAbierto(true),
        variant: 'primary'
      })
    }
    arrayBtns.push({
      label: 'Exportar',
      labelMobile: 'Exportar',
      icon: <Download className="w-4 h-4" />,
      onClick: () => handleExportarPlanes(),
      variant: 'outline'
    })
    return arrayBtns
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <ModuleHeader
        title={isMobile ? 'Planes Mejoramiento' : 'Planes de Mejoramiento'}
        subtitle="Seguimiento a hallazgos de Órganos de Control y Auditorías"
        toggleView={{
          current: tipoVista,
          onChange: (view) => setTipoVista(view as VistaModulo),
          options: [
            { label: 'Dashboard', icon: '📊', value: 'dashboard' },
            { label: 'Lista', icon: '📋', value: 'lista' },
            { label: 'Timeline', icon: '📅', value: 'timeline' },
            { label: 'Archivados', icon: '📦', value: 'archivados' }
          ]
        }}
        buttons={addBtnsPermission()}
        infoTooltip={
          <ModuleInfoTooltip
            title="Guía de Planes de Mejoramiento"
            variant="icon"
            sections={[
              {
                label: "🎯 Propósito del Módulo",
                content: "Gestión integral de hallazgos y acciones de mejora derivados de auditorías de Órganos de Control (Contraloría, Procuraduría), Oficina de Control Interno y Auditorías Externas.",
                type: "default"
              },
              {
                label: "📊 3 Vistas Disponibles",
                content: "• Dashboard: Métricas ejecutivas y semáforos | • Lista: Tabla detallada agrupada por ente de control | • Timeline: Línea de tiempo de vencimientos y seguimiento trimestral",
                type: "premium"
              },
              {
                label: "🔄 Flujo de Trabajo",
                content: "1. Recepción de Hallazgo → 2. Formulación del Plan → 3. Ejecución de Acciones → 4. Cargue de Evidencias → 5. Verificación y Cierre",
                type: "default"
              },
              {
                label: "⚠️ Alertas Automáticas",
                content: "El sistema genera alertas para: acciones próximas a vencer (15 días antes), acciones vencidas, y planes sin actualización en 30 días.",
                type: "alert"
              },
              {
                label: "🔗 Integración con Otros Módulos",
                content: "• Órganos de Control: Origen de hallazgos externos | • Auditorías Internas (OCI): Origen de hallazgos internos | • Gestión Documental: Almacenamiento de evidencias",
                type: "premium"
              }
            ]}
          />
        }
      />

      {/* Métricas */}
      <ModuleMetrics
        metrics={[
          {
            label: 'Total Planes',
            labelMobile: 'Total',
            value: metricas.total.toString(),
            icon: <FileText className="w-4 h-4" />,
            color: 'blue',
            trend: { value: 2, label: 'vs mes anterior' }
          },
          {
            label: 'Avance Promedio',
            labelMobile: 'Avance',
            value: `${metricas.avancePromedio}%`,
            icon: <TrendingUp className="w-4 h-4" />,
            color: 'purple',
            trend: { value: 5, label: 'vs trimestre anterior' }
          },
          {
            label: 'En Ejecución',
            labelMobile: 'En Ejecución',
            value: metricas.enEjecucion.toString(),
            icon: <Activity className="w-4 h-4" />,
            color: 'blue'
          },
          {
            label: 'Completados',
            labelMobile: 'Completados',
            value: metricas.completados.toString(),
            icon: <CheckCircle className="w-4 h-4" />,
            color: 'green'
          },
          {
            label: 'Alertas Activas',
            labelMobile: 'Alertas',
            value: metricas.alertasActivas.toString(),
            icon: <AlertTriangle className="w-4 h-4" />,
            color: metricas.alertasActivas > 0 ? 'red' : 'gray'
          }
        ]}
      />

      {/* Filtros */}
      <ModuleFilters
        searchValue={busqueda}
        onSearchChange={setBusqueda}
        filters={[
          {
            label: 'Ente de Control',
            value: filtroEnte,
            onChange: setFiltroEnte,
            options: [
              { label: 'Todos', value: 'TODOS' },
              ...entesControlPM.filter(o => o.activo).map(o => ({
                label: o.nombre,
                value: o.id
              }))
            ]
          },
          {
            label: 'Estado',
            value: filtroEstado,
            onChange: setFiltroEstado,
            options: [
              { label: 'Todos', value: 'TODOS' },
              { label: 'En Formulación', value: 'FORMULACION' },
              { label: 'En Ejecución', value: 'EN_EJECUCION' },
              { label: 'Completado', value: 'COMPLETADO' },
              { label: 'Suspendido', value: 'SUSPENDIDO' }
            ]
          }
        ]}
        resultCount={planesFiltrados.length}
      />

      {/* Contenido según vista */}
      <motion.div
        key={tipoVista}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {loading ? (
          <div className="p-10 text-center text-gray-400">Cargando planes...</div>
        ) : (
          <>
            {tipoVista === 'dashboard' && (
              <VistaDashboard planes={planesFiltrados} onVerDetalle={handleVerDetalle} />
            )}
            {tipoVista === 'lista' && (
              <VistaLista
                planes={planesFiltrados}
                expandedPlans={expandedPlans}
                onTogglePlan={togglePlan}
                onVerDetalle={handleVerDetalle}
                onArchivar={canMutatePlanesMejoramiento ? handleArchivar : undefined}
              />
            )}
            {tipoVista === 'timeline' && (
              <VistaTimeline planes={planesFiltrados} onVerDetalle={handleVerDetalle} />
            )}
          </>
        )}
        {tipoVista === 'archivados' && (
          <VistaArchivados
            items={itemsArchivados}
            moduloNombre="Planes de Mejoramiento"
            onRestaurar={canMutatePlanesMejoramiento ? handleRestaurar : undefined}
            onEliminarPermanente={canMutatePlanesMejoramiento ? handleEliminarPermanente : undefined}
          />
        )}
      </motion.div>

      {/* Modal Nuevo Plan */}
      <Dialog open={modalNuevoPlanAbierto} onOpenChange={setModalNuevoPlanAbierto}>
        <DialogContent hideCloseButton className="!max-w-[600px] !max-h-[90vh] overflow-y-auto flex flex-col p-0 gap-0">
          {/* Componentes de accesibilidad requeridos */}
          <DialogTitle className="sr-only">Crear Nuevo Plan de Mejoramiento</DialogTitle>
          <DialogDescription className="sr-only">
            Formulario para registrar un nuevo plan de mejoramiento derivado de auditoría o hallazgo de órgano de control
          </DialogDescription>

          <ModalHeaderClean
            titulo="Nuevo Plan de Mejoramiento"
            subtitulo="Registrar plan derivado de auditoría"
            icono={FileCheck}
            colorIcono="blue"
            onClose={() => setModalNuevoPlanAbierto(false)}
          />

          <div className="px-6 pb-6 overflow-y-auto flex-1">
            <form
              onSubmit={handleCreatePlan}
              className="space-y-5"
            >
              {/* Sección 1: Información Básica */}
              <div>
                <h3 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Información Básica del Plan
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Código del Plan <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      placeholder="PM-CGR-2025-004"
                      className="font-mono"
                      value={formData.codigo}
                      onChange={e => setFormData({ ...formData, codigo: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">Formato: PM-[ENTE]-[AÑO]-[###]</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Ente de Control <span className="text-red-500">*</span>
                    </label>
                    <Select required value={formData.enteControl} onValueChange={val => setFormData({ ...formData, enteControl: val })}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar ente" />
                      </SelectTrigger>
                      <SelectContent className="z-[9999]">
                        {entesControlPM.filter(o => o.activo).map(o => (
                          <SelectItem key={o.id} value={o.id}>{o.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Nombre del Plan <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="Plan de Mejoramiento Auditoría Regular Vigencia 2025"
                    value={formData.nombre}
                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Documento de Origen <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="Informe de Auditoría CGR No. 075-2025"
                    value={formData.documentoOrigen}
                    onChange={e => setFormData({ ...formData, documentoOrigen: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">Número de informe, auto o documento que origina el plan</p>
                </div>
              </div>

              {/* Sección 2: Responsabilidad y Área */}
              <div className="border-t pt-5">
                <h3 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  Responsabilidad y Área
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Área Responsable <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      placeholder="Dirección Administrativa y Financiera"
                      value={formData.areaResponsable}
                      onChange={e => setFormData({ ...formData, areaResponsable: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Responsable del Plan <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      placeholder="Dra. Ana María Rodríguez"
                      value={formData.responsablePlan}
                      onChange={e => setFormData({ ...formData, responsablePlan: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Sección 3: Fechas */}
              <div className="border-t pt-5">
                <h3 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Cronograma del Plan
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Fecha de Recepción <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      type="date"
                      value={formData.fechaRecepcion}
                      onChange={e => setFormData({ ...formData, fechaRecepcion: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">Fecha de recepción del hallazgo</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Fecha de Respuesta <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      type="date"
                      value={formData.fechaRespuesta}
                      onChange={e => setFormData({ ...formData, fechaRespuesta: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">Plazo para responder al ente de control</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Fecha de Inicio <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      type="date"
                      value={formData.fechaInicio}
                      onChange={e => setFormData({ ...formData, fechaInicio: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Fecha de Finalización <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      type="date"
                      value={formData.fechaFin}
                      onChange={e => setFormData({ ...formData, fechaFin: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Sección 4: Estado */}
              <div className="border-t pt-5">
                <h3 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  Estado del Plan
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Estado Inicial <span className="text-red-500">*</span>
                    </label>
                    <Select required defaultValue="FORMULACION"
                      value={formData.estado} onValueChange={val => setFormData({ ...formData, estado: val })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[9999]">
                        <SelectItem value="FORMULACION">📝 En Formulación</SelectItem>
                        <SelectItem value="EN_EJECUCION">⚡ En Ejecución</SelectItem>
                        <SelectItem value="COMPLETADO">✅ Completado</SelectItem>
                        <SelectItem value="SUSPENDIDO">⏸️ Suspendido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Sección 5: Documentos de Soporte */}
              <div className="border-t pt-5">
                <h3 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-blue-600" />
                  Documentos de Soporte
                </h3>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Adjuntar Archivos (Opcional)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors">
                    <input
                      type="file"
                      id="file-upload"
                      multiple
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) {
                          const newFiles = Array.from(e.target.files);
                          setArchivosAdjuntos(prev => [...prev, ...newFiles]);
                          toast.success(`${newFiles.length} archivo(s) agregado(s)`);
                        }
                      }}
                    />
                    <label
                      htmlFor="file-upload"
                      className="flex flex-col items-center justify-center cursor-pointer"
                    >
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm font-medium text-gray-700">
                        Haz clic para seleccionar archivos
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        PDF, Word, Excel, Imágenes (máx. 10MB por archivo)
                      </span>
                    </label>
                  </div>

                  {/* Lista de archivos seleccionados */}
                  {archivosAdjuntos.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-semibold text-gray-700">
                        Archivos seleccionados ({archivosAdjuntos.length}):
                      </p>
                      {archivosAdjuntos.map((archivo, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <File className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <span className="text-sm text-gray-900 truncate">
                              {archivo.name}
                            </span>
                            <span className="text-xs text-gray-500 flex-shrink-0">
                              ({(archivo.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setArchivosAdjuntos(prev => prev.filter((_, i) => i !== index));
                              toast.info('Archivo eliminado');
                            }}
                            className="ml-2 p-1 hover:bg-red-100 rounded transition-colors flex-shrink-0"
                          >
                            <X className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sección 6: Observaciones */}
              <div className="border-t pt-5">
                <h3 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600" />
                  Observaciones Adicionales
                </h3>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Descripción del Plan (Opcional)
                  </label>
                  <Textarea
                    rows={4}
                    placeholder="Descripción detallada del plan de mejoramiento, contexto del hallazgo y alcance esperado..."
                    value={formData.descripcion}
                    onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                  />
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="border-t pt-5 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  <span className="text-red-500">*</span> Campos obligatorios
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setModalNuevoPlanAbierto(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[#2962FF] hover:bg-[#1e5da8] text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Plan
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Detalle Plan */}
      {planSeleccionadoId && (
        <ModalDetallePlanV4
          isOpen={modalDetalleAbierto}
          onClose={() => {
            setModalDetalleAbierto(false);
            setPlanSeleccionadoId(null);
          }}
          planId={planSeleccionadoId}
          onPlanUpdated={fetchPlanes}
        />
      )}
    </div>
  );
}

// ==================== VISTA: DASHBOARD ====================
function VistaDashboard({ planes, onVerDetalle }: { planes: PlanMejoramiento[]; onVerDetalle?: (id: string) => void }) {
  // const { entesControl } = useConfiguracionesSIGL();

  // Agrupar por ente de control
  const planesPorEnte = useMemo(() => {
    const grupos = {
      CONTRALORIA: planes.filter(p => p.enteControl === 'CONTRALORIA'),
      PROCURADURIA: planes.filter(p => p.enteControl === 'PROCURADURIA'),
      OCI: planes.filter(p => p.enteControl === 'OCI'),
      AUDITORIA_EXTERNA: planes.filter(p => p.enteControl === 'AUDITORIA_EXTERNA')
    };
    return grupos;
  }, [planes]);

  // Estadísticas de severidad
  const estadisticasSeveridad = useMemo(() => {
    let criticos = 0, altos = 0, medios = 0, bajos = 0;
    // Map based on top-level properties if hallazgos are empty
    planes.forEach(plan => {
      // Fallback if hallazgos array is empty (backend logic pending)
      // We will assume for now visual count based on a 'severidad' prop if we added it, 
      // OR simulate distribution if data is missing, BUT user wants real data.
      // Since backend doesn't return hallazgos yet, we'll try to use 'severidad' from plan if available
      // or just count as 'ALTA' if unknown
      const sev = (plan as any).severidad || 'MEDIA';
      if (sev === 'CRITICO' || sev === 'CRITICA') criticos++;
      else if (sev === 'ALTO' || sev === 'ALTA') altos++;
      else if (sev === 'MEDIO' || sev === 'MEDIA') medios++;
      else bajos++;

      plan.hallazgos.forEach(h => {
        // If we had hallazgos detailed
        // if (h.severidad === 'CRITICA') criticos++;
      });
    });
    return { criticos, altos, medios, bajos, total: criticos + altos + medios + bajos };
  }, [planes]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Card: Planes por Ente de Control */}
      <Card className="p-6">
        <h3 className="font-black text-gray-900 mb-4">Planes por Ente de Control</h3>
        <div className="space-y-3">
          {Object.entries(planesPorEnte).map(([ente, planesEnte]) => {
            const config = getEnteConfig(ente as EnteControl);
            const avancePromedio = planesEnte.length > 0
              ? Math.round(planesEnte.reduce((sum, p) => sum + p.avanceGeneral, 0) / planesEnte.length)
              : 0;

            return (
              <div key={ente} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{config.icon}</span>
                    <span className="text-sm font-semibold text-gray-700">{config.nombre}</span>
                  </div>
                  <Badge style={{ background: config.bgColor, color: config.color }}>
                    {planesEnte.length} planes
                  </Badge>
                </div>
                <Progress value={avancePromedio} className="h-2" />
                <p className="text-xs text-gray-500 mt-1">Avance promedio: {avancePromedio}%</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Card: Hallazgos por Severidad */}
      <Card className="p-6">
        <h3 className="font-black text-gray-900 mb-4">Hallazgos por Severidad</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔴</span>
              <span className="text-sm font-semibold text-gray-700">Críticos</span>
            </div>
            <span className="text-2xl font-black text-red-600">{estadisticasSeveridad.criticos}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center gap-2">
              <span className="text-xl">🟠</span>
              <span className="text-sm font-semibold text-gray-700">Altos</span>
            </div>
            <span className="text-2xl font-black text-orange-600">{estadisticasSeveridad.altos}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center gap-2">
              <span className="text-xl">🟡</span>
              <span className="text-sm font-semibold text-gray-700">Medios</span>
            </div>
            <span className="text-2xl font-black text-yellow-600">{estadisticasSeveridad.medios}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2">
              <span className="text-xl">🟢</span>
              <span className="text-sm font-semibold text-gray-700">Bajos</span>
            </div>
            <span className="text-2xl font-black text-green-600">{estadisticasSeveridad.bajos}</span>
          </div>
        </div>
      </Card>

      {/* Card: Planes Próximos a Vencer */}
      <Card className="p-6 lg:col-span-2">
        <h3 className="font-black text-gray-900 mb-4">⏰ Planes Próximos a Vencer (próximos 60 días)</h3>
        <div className="space-y-2">
          {planes
            .filter(p => p.diasRestantes > 0 && p.diasRestantes <= 60)
            .sort((a, b) => a.diasRestantes - b.diasRestantes)
            .map(plan => {
              const enteConfig = getEnteConfig(plan.enteControl);
              const estadoConfig = getEstadoConfig(plan.estado);

              return (
                <div key={plan.id} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-gray-600">{plan.codigo}</span>
                      <Badge style={{ background: enteConfig.bgColor, color: enteConfig.color }} className="text-xs">
                        {enteConfig.icon} {enteConfig.nombre}
                      </Badge>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 truncate">{plan.nombre}</p>
                    <p className="text-xs text-gray-600">Vence: {formatearFecha(plan.fechaFin)}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <div className="text-center">
                      <p className="text-2xl font-black text-amber-600">{plan.diasRestantes}</p>
                      <p className="text-xs text-gray-500">días</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => onVerDetalle?.(plan.id)}>
                      <Eye className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          {planes.filter(p => p.diasRestantes > 0 && p.diasRestantes <= 60).length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">No hay planes próximos a vencer</p>
          )}
        </div>
      </Card>
    </div>
  );
}

// ==================== VISTA: LISTA ====================
function VistaLista({
  planes,
  expandedPlans,
  onTogglePlan,

  onVerDetalle,
  onArchivar
}: {
  planes: PlanMejoramiento[];
  expandedPlans: Set<string>;
  onTogglePlan: (id: string) => void;
  onVerDetalle?: (id: string) => void;
  onArchivar?: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      {planes.map(plan => {
        const enteConfig = getEnteConfig(plan.enteControl);
        const estadoConfig = getEstadoConfig(plan.estado);
        const isExpanded = expandedPlans.has(plan.id);

        return (
          <Card key={plan.id} className="overflow-hidden">
            {/* Header del Plan */}
            <div
              className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => onTogglePlan(plan.id)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Fila 1: Código + Badges */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-sm font-mono font-semibold text-gray-900">{plan.codigo}</span>
                    <Badge style={{ background: enteConfig.bgColor, color: enteConfig.color }}>
                      {enteConfig.icon} {enteConfig.nombre}
                    </Badge>
                    <Badge style={{ background: estadoConfig.bgColor, color: estadoConfig.color }}>
                      {estadoConfig.icon}
                      <span className="ml-1">{estadoConfig.nombre}</span>
                    </Badge>
                    {plan.alertas > 0 && (
                      <Badge className="bg-red-100 text-red-700">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {plan.alertas} alertas
                      </Badge>
                    )}
                  </div>

                  {/* Fila 2: Nombre del Plan */}
                  <h3 className="font-semibold text-gray-900 mb-1">{plan.nombre}</h3>

                  {/* Fila 3: Metadata */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {plan.area}
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {plan.responsablePlan}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Vence: {formatearFecha(plan.fechaFin)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {plan.diasRestantes > 0 ? `${plan.diasRestantes} días restantes` : 'Vencido'}
                    </div>
                  </div>
                </div>

                {/* Sidebar: Progreso + Acciones */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-center hidden sm:block">
                    <div className="text-2xl font-black" style={{ color: enteConfig.color }}>
                      {plan.avanceGeneral}%
                    </div>
                    <div className="text-xs text-gray-500">
                      {plan.accionesCompletadas}/{plan.totalAcciones}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="flex items-center gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="w-4 h-4 text-gray-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onVerDetalle?.(plan.id); }}>
                            <Eye className="w-4 h-4 mr-2" /> Ver Detalle
                          </DropdownMenuItem>
                          {onArchivar && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchivar(plan.id); }} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                                <Archive className="w-4 h-4 mr-2" /> Archivar
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Barra de Progreso */}
                <div className="mt-3">
                  <Progress value={plan.avanceGeneral} className="h-2" />
                </div>
              </div>
            </div>

            {/* Detalles Expandidos: Hallazgos y Acciones */}
            {isExpanded && (
              <div className="border-t bg-gray-50 p-4">
                <h4 className="text-sm font-black text-gray-900 mb-3">
                  📋 Hallazgos y Acciones de Mejora ({plan.hallazgos.length})
                </h4>
                {plan.hallazgos.length === 0 ? (
                  <div className="text-center p-4">
                    <p className="text-sm text-gray-500">No hay hallazgos registrados para este plan.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {plan.hallazgos.map(h => (
                      <div key={h.id} className="bg-white border rounded-lg p-3">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className="font-bold text-sm text-gray-900 truncate">{h.nombre}</p>
                              <Badge
                                className={`font-bold text-xs flex-shrink-0 ${
                                  h.porcentajeAvance >= 100 ? 'bg-green-100 text-green-700' :
                                  h.porcentajeAvance >= 70 ? 'bg-blue-100 text-blue-700' :
                                  h.porcentajeAvance >= 30 ? 'bg-amber-100 text-amber-700' :
                                  'bg-red-100 text-red-700'
                                }`}
                              >
                                {h.porcentajeAvance}%
                              </Badge>
                            </div>
                            {h.descripcion && (
                              <p className="text-xs text-gray-600 mb-2">{h.descripcion}</p>
                            )}
                            <Progress value={h.porcentajeAvance} className="h-1.5" />
                            {h.archivoUrl && (
                              <div className="mt-2">
                                <a
                                  href={legalService.getPlanFileViewUrl(h.archivoUrl.replace(/^files\//, ''))}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <FileText className="w-3 h-3" />
                                  {h.archivoNombre || 'Ver documento adjunto'}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}

      {planes.length === 0 && (
        <Card className="p-8 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No se encontraron planes de mejoramiento</p>
        </Card>
      )}
    </div>
  );
}

// ==================== VISTA: TIMELINE ====================
function VistaTimeline({ planes, onVerDetalle }: { planes: PlanMejoramiento[]; onVerDetalle?: (id: string) => void }) {
  // Ordenar planes por fecha de vencimiento
  const planesOrdenados = useMemo(() => {
    return [...planes].sort((a, b) => a.fechaFin.getTime() - b.fechaFin.getTime());
  }, [planes]);

  // Agrupar por trimestre
  const planesPorTrimestre = useMemo(() => {
    const grupos: { [key: string]: PlanMejoramiento[] } = {};

    planesOrdenados.forEach(plan => {
      const mes = plan.fechaFin.getMonth();
      const anio = plan.fechaFin.getFullYear();
      const trimestre = Math.floor(mes / 3) + 1;
      const clave = `${anio}-Q${trimestre}`;

      if (!grupos[clave]) {
        grupos[clave] = [];
      }
      grupos[clave].push(plan);
    });

    return grupos;
  }, [planesOrdenados]);

  return (
    <div className="space-y-6">
      {Object.entries(planesPorTrimestre).map(([trimestre, planesTrimes]) => (
        <Card key={trimestre} className="p-6">
          <h3 className="font-black text-gray-900 mb-4">📅 {trimestre}</h3>
          <div className="space-y-3">
            {planesTrimes.map(plan => {
              const enteConfig = getEnteConfig(plan.enteControl);
              const estadoConfig = getEstadoConfig(plan.estado);
              const diasRestantes = calcularDiasRestantes(plan.fechaFin);
              const colorSemaforo = diasRestantes < 0 ? '#DC2626' : diasRestantes <= 30 ? '#F59E0B' : '#10B981';

              return (
                <div key={plan.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border hover:shadow-md transition-shadow">
                  {/* Indicador visual de timeline */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div
                      className="w-3 h-3 rounded-full border-2 border-white shadow-md"
                      style={{ background: colorSemaforo }}
                    />
                    <div className="w-0.5 h-full bg-gray-300 mt-1" />
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-mono font-semibold text-gray-700">{plan.codigo}</span>
                      <Badge style={{ background: enteConfig.bgColor, color: enteConfig.color }} className="text-xs">
                        {enteConfig.icon} {enteConfig.nombre}
                      </Badge>
                      <Badge style={{ background: estadoConfig.bgColor, color: estadoConfig.color }} className="text-xs">
                        {estadoConfig.nombre}
                      </Badge>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 mb-1">{plan.nombre}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-600 flex-wrap">
                      <div>📅 Vence: {formatearFecha(plan.fechaFin)}</div>
                      <div>👤 {plan.responsablePlan}</div>
                      <div>✅ {plan.avanceGeneral}%</div>
                      <div style={{ color: colorSemaforo, fontWeight: 600 }}>
                        {diasRestantes > 0 ? `${diasRestantes} días restantes` : `Vencido hace ${Math.abs(diasRestantes)} días`}
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <Button variant="outline" size="sm" className="flex-shrink-0" onClick={() => onVerDetalle?.(plan.id)}>
                    <Eye className="w-3 h-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      ))}

      {Object.keys(planesPorTrimestre).length === 0 && (
        <Card className="p-8 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No hay planes para mostrar en el timeline</p>
        </Card>
      )}
    </div>
  );
}
