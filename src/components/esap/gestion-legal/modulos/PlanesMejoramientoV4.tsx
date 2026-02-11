/**
 * ModuloPlanesMejoramientoV4 - MOD-10: Planes de Mejoramiento
 * REDISEÑO COMPLETO - Estructura profesional para seguimiento de hallazgos
 * 3 VISTAS: Dashboard (por defecto), Lista, Timeline
 * ✅ ESAP 2025 - Integrado con Órganos de Control y Auditorías
 */

import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Progress } from '../../../ui/progress';
import { Avatar, AvatarFallback } from '../../../ui/avatar';
import { 
  FileText, AlertTriangle, Target, Calendar, Eye, Plus, Search, Filter,
  Download, MoreVertical, Edit, Trash2, CheckCircle, AlertCircle, Clock,
  TrendingUp, BarChart3, FileCheck, Building2, User, ChevronDown, ChevronRight,
  List, LayoutGrid, Activity, Flag, Circle, XCircle, Upload, File, X
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { ModuleHeader } from '../design-system/ModuleHeader';
import { ModuleMetrics } from '../design-system/ModuleMetrics';
import { ModuleFilters } from '../design-system/ModuleFilters';
import { ModuleInfoTooltip } from '../design-system/ModuleInfoTooltip';
import { ModalHeaderClean } from '../../../design-system/ModalHeaderClean';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { Textarea } from '../../../ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../../../ui/dropdown-menu';
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
  descripcion: string;
  severidad: SeveridadHallazgo;
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

// ==================== DATOS MOCK ====================
const planesMock: PlanMejoramiento[] = [
  // CONTRALORÍA
  {
    id: 'PM-2025-001',
    codigo: 'PM-CGR-2025-001',
    nombre: 'Plan de Mejoramiento Auditoría Regular Vigencia 2024',
    enteControl: 'CONTRALORIA',
    documentoOrigen: 'Informe de Auditoría CGR No. 075-2024',
    area: 'Dirección Administrativa y Financiera',
    responsablePlan: 'Dra. Ana María Rodríguez',
    fechaRecepcion: new Date('2025-01-15'),
    fechaRespuesta: new Date('2025-02-15'),
    fechaInicio: new Date('2025-02-20'),
    fechaFin: new Date('2026-02-20'),
    estado: 'EN_EJECUCION',
    hallazgos: [
      {
        id: 'H001',
        codigo: 'HAL-001',
        descripcion: 'Deficiencias en el control de ejecución presupuestal',
        severidad: 'ALTA',
        acciones: [
          {
            id: 'A001',
            descripcion: 'Implementar sistema de alertas tempranas en el módulo financiero',
            responsable: 'Dr. Carlos Méndez',
            fechaInicio: new Date('2025-02-20'),
            fechaFin: new Date('2025-06-30'),
            estado: 'EN_PROCESO',
            avance: 65,
            evidencias: 3
          },
          {
            id: 'A002',
            descripcion: 'Capacitar al personal financiero en normativa vigente',
            responsable: 'Dra. Patricia Ruiz',
            fechaInicio: new Date('2025-03-01'),
            fechaFin: new Date('2025-05-30'),
            estado: 'COMPLETADA',
            avance: 100,
            evidencias: 5
          }
        ]
      },
      {
        id: 'H002',
        codigo: 'HAL-002',
        descripcion: 'Ausencia de procedimientos documentados para contratación menor cuantía',
        severidad: 'MEDIA',
        acciones: [
          {
            id: 'A003',
            descripcion: 'Elaborar manual de procedimientos de contratación',
            responsable: 'Dr. Luis Gómez',
            fechaInicio: new Date('2025-02-25'),
            fechaFin: new Date('2025-07-30'),
            estado: 'EN_PROCESO',
            avance: 40,
            evidencias: 2
          }
        ]
      }
    ],
    totalAcciones: 3,
    accionesCompletadas: 1,
    avanceGeneral: 68,
    alertas: 0,
    diasRestantes: 425,
    ultimaActualizacion: new Date('2025-12-28')
  },
  
  // PROCURADURÍA
  {
    id: 'PM-2025-002',
    codigo: 'PM-PGN-2025-002',
    nombre: 'Plan de Mejoramiento Función de Advertencia',
    enteControl: 'PROCURADURIA',
    documentoOrigen: 'Auto PGN-IUS-2025-0234',
    area: 'Secretaría General',
    responsablePlan: 'Dr. Jorge Silva',
    fechaRecepcion: new Date('2025-02-10'),
    fechaRespuesta: new Date('2025-03-12'),
    fechaInicio: new Date('2025-03-15'),
    fechaFin: new Date('2025-12-15'),
    estado: 'EN_EJECUCION',
    hallazgos: [
      {
        id: 'H003',
        codigo: 'HAL-003',
        descripcion: 'Incumplimiento parcial de términos en procesos disciplinarios',
        severidad: 'CRITICA',
        acciones: [
          {
            id: 'A004',
            descripcion: 'Implementar módulo de alertas automáticas de términos',
            responsable: 'Dra. María Torres',
            fechaInicio: new Date('2025-03-15'),
            fechaFin: new Date('2025-08-30'),
            estado: 'EN_PROCESO',
            avance: 55,
            evidencias: 4
          },
          {
            id: 'A005',
            descripcion: 'Designar abogado exclusivo para seguimiento de términos',
            responsable: 'Dr. Alberto Castillo',
            fechaInicio: new Date('2025-03-20'),
            fechaFin: new Date('2025-06-30'),
            estado: 'COMPLETADA',
            avance: 100,
            evidencias: 2
          }
        ]
      }
    ],
    totalAcciones: 2,
    accionesCompletadas: 1,
    avanceGeneral: 78,
    alertas: 0,
    diasRestantes: 351,
    ultimaActualizacion: new Date('2025-12-27')
  },

  // OCI - OFICINA DE CONTROL INTERNO
  {
    id: 'PM-2025-003',
    codigo: 'PM-OCI-2025-003',
    nombre: 'Plan de Mejoramiento Auditoría Interna Gestión Documental',
    enteControl: 'OCI',
    documentoOrigen: 'Informe Auditoría OCI-2024-08',
    area: 'Dirección de Gestión Documental',
    responsablePlan: 'Dra. Carolina Pérez',
    fechaRecepcion: new Date('2024-11-20'),
    fechaRespuesta: new Date('2024-12-20'),
    fechaInicio: new Date('2025-01-10'),
    fechaFin: new Date('2025-07-10'),
    estado: 'EN_EJECUCION',
    hallazgos: [
      {
        id: 'H004',
        codigo: 'HAL-004',
        descripcion: 'Inconsistencias en Tablas de Retención Documental',
        severidad: 'MEDIA',
        acciones: [
          {
            id: 'A006',
            descripcion: 'Actualizar TRD según normativa Archivo General de la Nación',
            responsable: 'Dra. Laura Jiménez',
            fechaInicio: new Date('2025-01-10'),
            fechaFin: new Date('2025-04-30'),
            estado: 'VENCIDA',
            avance: 75,
            evidencias: 1
          },
          {
            id: 'A007',
            descripcion: 'Socializar nueva TRD con todas las dependencias',
            responsable: 'Dr. Fernando Rojas',
            fechaInicio: new Date('2025-05-01'),
            fechaFin: new Date('2025-06-30'),
            estado: 'PENDIENTE',
            avance: 0,
            evidencias: 0
          }
        ]
      }
    ],
    totalAcciones: 2,
    accionesCompletadas: 0,
    avanceGeneral: 38,
    alertas: 1, // Una acción vencida
    diasRestantes: 193,
    ultimaActualizacion: new Date('2025-12-29')
  },

  // PLAN COMPLETADO
  {
    id: 'PM-2024-015',
    codigo: 'PM-CGR-2024-015',
    nombre: 'Plan de Mejoramiento Auditoría TIC 2023',
    enteControl: 'CONTRALORIA',
    documentoOrigen: 'Informe de Auditoría CGR No. 056-2023',
    area: 'Dirección de Tecnología e Innovación',
    responsablePlan: 'Dr. Roberto Vargas',
    fechaRecepcion: new Date('2024-01-10'),
    fechaRespuesta: new Date('2024-02-10'),
    fechaInicio: new Date('2024-02-15'),
    fechaFin: new Date('2024-11-30'),
    estado: 'COMPLETADO',
    hallazgos: [
      {
        id: 'H005',
        codigo: 'HAL-005',
        descripcion: 'Ausencia de políticas de seguridad de la información actualizadas',
        severidad: 'ALTA',
        acciones: [
          {
            id: 'A008',
            descripcion: 'Elaborar y aprobar política de seguridad de la información',
            responsable: 'Ing. Diego Martínez',
            fechaInicio: new Date('2024-02-15'),
            fechaFin: new Date('2024-06-30'),
            estado: 'COMPLETADA',
            avance: 100,
            evidencias: 8
          },
          {
            id: 'A009',
            descripcion: 'Implementar controles técnicos según ISO 27001',
            responsable: 'Ing. Sandra López',
            fechaInicio: new Date('2024-07-01'),
            fechaFin: new Date('2024-11-30'),
            estado: 'COMPLETADA',
            avance: 100,
            evidencias: 12
          }
        ]
      }
    ],
    totalAcciones: 2,
    accionesCompletadas: 2,
    avanceGeneral: 100,
    alertas: 0,
    diasRestantes: 0,
    ultimaActualizacion: new Date('2024-11-30')
  }
];

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
    }
  };
  return configs[ente];
};

const getEstadoConfig = (estado: EstadoPlan) => {
  const configs = {
    FORMULACION: {
      nombre: 'En Formulación',
      color: '#F59E0B',
      bgColor: '#FEF3C7',
      icon: <FileText className="w-3 h-3" />
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
    SUSPENDIDO: {
      nombre: 'Suspendido',
      color: '#6B7280',
      bgColor: '#F3F4F6',
      icon: <XCircle className="w-3 h-3" />
    }
  };
  return configs[estado];
};

const getSeveridadConfig = (severidad: SeveridadHallazgo) => {
  const configs = {
    CRITICA: { nombre: 'Crítica', color: '#DC2626', bgColor: '#FEE2E2', emoji: '🔴' },
    ALTA: { nombre: 'Alta', color: '#F97316', bgColor: '#FFEDD5', emoji: '🟠' },
    MEDIA: { nombre: 'Media', color: '#F59E0B', bgColor: '#FEF3C7', emoji: '🟡' },
    BAJA: { nombre: 'Baja', color: '#10B981', bgColor: '#D1FAE5', emoji: '🟢' }
  };
  return configs[severidad];
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

const calcularDiasRestantes = (fecha: Date): number => {
  const hoy = new Date();
  const diff = fecha.getTime() - hoy.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const formatearFecha = (fecha: Date): string => {
  return fecha.toLocaleDateString('es-CO', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

// ==================== COMPONENTE PRINCIPAL ====================
export function ModuloPlanesMejoramientoV4() {
  // ✅ Obtener permisos del usuario actual
  const { usuario } = usePermisos();
  
  const [tipoVista, setTipoVista] = useState<VistaModulo>('dashboard');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEnte, setFiltroEnte] = useState<string>('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set());
  const [modalNuevoPlanAbierto, setModalNuevoPlanAbierto] = useState(false);
  const [archivosAdjuntos, setArchivosAdjuntos] = useState<File[]>([]);

  // ✅ Estado para items archivados/eliminados
  const [itemsArchivados, setItemsArchivados] = useState<ItemArchivado[]>([
    {
      id: 'PM-CGR-2023-999',
      codigo: 'PM-CGR-2023-999',
      nombre: 'Plan de Mejoramiento Auditoría Presupuestal Vigencia 2023 - Contraloría General',
      tipo: 'Plan de Mejoramiento',
      estado: 'ARCHIVADO',
      fechaArchivado: new Date('2024-11-30T16:45:00'),
      usuarioArchivo: 'Dra. Ana María Rodríguez',
      motivoArchivo: 'Plan completado exitosamente. Todas las acciones ejecutadas y evidencias aprobadas por la Contraloría mediante Oficio CGR-OF-2024-9876. Cierre formal del proceso',
      metadatos: {
        'Ente de Control': 'Contraloría General de la República',
        'Documento Origen': 'Informe de Auditoría CGR No. 045-2023',
        'Área Responsable': 'Dirección Administrativa y Financiera',
        'Total Hallazgos': '5',
        'Total Acciones': '12',
        'Cumplimiento': '100%',
        'Fecha Cierre': '28/11/2024'
      }
    },
    {
      id: 'PM-PGN-2023-888',
      codigo: 'PM-PGN-2023-888',
      nombre: 'Plan de Mejoramiento Función de Advertencia Procesos Disciplinarios 2023 - Procuraduría',
      tipo: 'Plan de Mejoramiento',
      estado: 'ARCHIVADO',
      fechaArchivado: new Date('2024-10-15T14:20:00'),
      usuarioArchivo: 'Dr. Jorge Silva',
      motivoArchivo: 'Proceso de vigilancia cerrado por la Procuraduría. Auto de cierre PGN-IUS-2024-5432. Implementación exitosa del sistema de alertas de términos',
      metadatos: {
        'Ente de Control': 'Procuraduría General de la Nación',
        'Documento Origen': 'Auto PGN-IUS-2023-0987',
        'Área Responsable': 'Secretaría General - Oficina Jurídica',
        'Total Hallazgos': '3',
        'Total Acciones': '8',
        'Cumplimiento': '100%',
        'Resultado': 'Cierre con verificación favorable'
      }
    },
    {
      id: 'PM-OCI-2023-777',
      codigo: 'PM-OCI-2023-777',
      nombre: 'Plan de Mejoramiento Auditoría Interna Gestión Contractual 2022-2023 - OCI',
      tipo: 'Plan de Mejoramiento',
      estado: 'ARCHIVADO',
      fechaArchivado: new Date('2024-09-20T11:30:00'),
      usuarioArchivo: 'Dra. Carolina Pérez',
      motivoArchivo: 'Auditoría de seguimiento realizada por OCI. Informe OCI-SEG-2024-012 confirma subsanación total de hallazgos. Plan cerrado formalmente',
      metadatos: {
        'Ente de Control': 'Oficina de Control Interno',
        'Documento Origen': 'Informe Auditoría OCI-2023-05',
        'Área Responsable': 'Dirección Administrativa - Grupo Contractual',
        'Total Hallazgos': '7',
        'Total Acciones': '15',
        'Cumplimiento': '100%',
        'Fecha Seguimiento': '15/09/2024'
      }
    },
    {
      id: 'PM-CGR-2022-666',
      codigo: 'PM-CGR-2022-666',
      nombre: 'Plan de Mejoramiento Auditoría Tecnologías de la Información 2022 - Contraloría',
      tipo: 'Plan de Mejoramiento',
      estado: 'ELIMINADO',
      fechaArchivado: new Date('2024-08-10T09:15:00'),
      usuarioArchivo: 'Admin Sistema',
      motivoArchivo: 'Plan registrado duplicado. El plan real está bajo código PM-CGR-2022-667. Error en migración de datos del sistema anterior',
      metadatos: {
        'Ente de Control': 'Contraloría General de la República',
        'Motivo Eliminación': 'Registro duplicado - Plan activo bajo otro código',
        'Plan Correcto': 'PM-CGR-2022-667'
      }
    },
    {
      id: 'PM-AE-2023-555',
      codigo: 'PM-AE-2023-555',
      nombre: 'Plan de Mejoramiento Auditoría Externa Estados Financieros 2022 - Revisoría Fiscal',
      tipo: 'Plan de Mejoramiento',
      estado: 'ARCHIVADO',
      fechaArchivado: new Date('2024-07-25T15:50:00'),
      usuarioArchivo: 'Dr. Roberto Vargas',
      motivoArchivo: 'Hallazgos subsanados. Dictamen sin salvedades emitido por la Revisoría Fiscal para vigencia 2023. Cierre del plan de mejoramiento',
      metadatos: {
        'Ente de Control': 'Auditoría Externa - Revisoría Fiscal',
        'Documento Origen': 'Informe de Revisoría Fiscal RF-2023-001',
        'Área Responsable': 'Dirección Administrativa y Financiera',
        'Total Hallazgos': '4',
        'Total Acciones': '9',
        'Cumplimiento': '100%',
        'Dictamen': 'Sin salvedades'
      }
    },
    {
      id: 'PM-OCI-2022-444',
      codigo: 'PM-OCI-2022-444',
      nombre: 'Plan de Mejoramiento Auditoría Interna Talento Humano 2022 - OCI',
      tipo: 'Plan de Mejoramiento',
      estado: 'ARCHIVADO',
      fechaArchivado: new Date('2024-06-18T13:40:00'),
      usuarioArchivo: 'Dra. Patricia Ruiz',
      motivoArchivo: 'Implementación exitosa de políticas de gestión del talento humano. Informe de verificación OCI-VER-2024-008 aprueba cierre del plan',
      metadatos: {
        'Ente de Control': 'Oficina de Control Interno',
        'Documento Origen': 'Informe Auditoría OCI-2022-11',
        'Área Responsable': 'Dirección de Talento Humano',
        'Total Hallazgos': '6',
        'Total Acciones': '13',
        'Cumplimiento': '100%',
        'Fecha Cierre': '15/06/2024'
      }
    },
    {
      id: 'PM-PGN-2022-333',
      codigo: 'PM-PGN-2022-333',
      nombre: 'Plan de Mejoramiento Control Preventivo Contratación 2022 - Procuraduría',
      tipo: 'Plan de Mejoramiento',
      estado: 'ARCHIVADO',
      fechaArchivado: new Date('2024-05-10T10:25:00'),
      usuarioArchivo: 'Dr. Luis Gómez',
      motivoArchivo: 'Visita de verificación de la Procuraduría realizada. Acta de visita PGN-VIS-2024-0345 sin observaciones. Proceso cerrado satisfactoriamente',
      metadatos: {
        'Ente de Control': 'Procuraduría General de la Nación',
        'Documento Origen': 'Auto PGN-IUS-2022-1234',
        'Área Responsable': 'Dirección Administrativa - Grupo Contractual',
        'Total Hallazgos': '4',
        'Total Acciones': '10',
        'Cumplimiento': '100%',
        'Resultado': 'Verificación favorable'
      }
    }
  ]);

  // ✅ Función para restaurar un plan archivado
  const handleRestaurar = async (itemId: string) => {
    console.log('Restaurando plan de mejoramiento:', itemId);
    setItemsArchivados(prev => prev.filter(item => item.id !== itemId));
    toast.success('Plan restaurado exitosamente');
  };

  // ✅ Función para eliminar permanentemente un plan
  const handleEliminarPermanente = async (itemId: string) => {
    console.log('Eliminando permanentemente plan:', itemId);
    setItemsArchivados(prev => prev.filter(item => item.id !== itemId));
    toast.success('Plan eliminado permanentemente');
  };

  // Filtrar planes
  const planesFiltrados = useMemo(() => {
    let resultado = [...planesMock];

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
  }, [busqueda, filtroEnte, filtroEstado]);

  // Calcular métricas
  const metricas = useMemo(() => {
    const total = planesMock.length;
    const avancePromedio = Math.round(
      planesMock.reduce((sum, p) => sum + p.avanceGeneral, 0) / total
    );
    const enEjecucion = planesMock.filter(p => p.estado === 'EN_EJECUCION').length;
    const completados = planesMock.filter(p => p.estado === 'COMPLETADO').length;
    const alertasActivas = planesMock.reduce((sum, p) => sum + p.alertas, 0);

    return { total, avancePromedio, enEjecucion, completados, alertasActivas };
  }, []);

  const togglePlan = (planId: string) => {
    const newExpanded = new Set(expandedPlans);
    if (newExpanded.has(planId)) {
      newExpanded.delete(planId);
    } else {
      newExpanded.add(planId);
    }
    setExpandedPlans(newExpanded);
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
        buttons={[
          {
            label: 'Nuevo Plan',
            labelMobile: 'Nuevo',
            icon: <Plus className="w-4 h-4" />,
            onClick: () => setModalNuevoPlanAbierto(true),
            variant: 'primary'
          },
          {
            label: 'Exportar',
            labelMobile: 'Exportar',
            icon: <Download className="w-4 h-4" />,
            onClick: () => toast.info('Exportar Planes de Mejoramiento'),
            variant: 'outline'
          }
        ]}
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
              { label: '🏛️ Contraloría', value: 'CONTRALORIA' },
              { label: '⚖️ Procuraduría', value: 'PROCURADURIA' },
              { label: '🔍 OCI', value: 'OCI' },
              { label: '📊 Auditoría Externa', value: 'AUDITORIA_EXTERNA' }
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
        {tipoVista === 'dashboard' && (
          <VistaDashboard planes={planesFiltrados} />
        )}
        {tipoVista === 'lista' && (
          <VistaLista 
            planes={planesFiltrados} 
            expandedPlans={expandedPlans}
            onTogglePlan={togglePlan}
          />
        )}
        {tipoVista === 'timeline' && (
          <VistaTimeline planes={planesFiltrados} />
        )}
        {tipoVista === 'archivados' && (
          <VistaArchivados
            items={itemsArchivados}
            moduloNombre="Planes de Mejoramiento"
            onRestaurar={handleRestaurar}
            onEliminarPermanente={handleEliminarPermanente}
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
              onSubmit={(e) => {
                e.preventDefault();
                toast.success('Plan de Mejoramiento creado exitosamente');
                setModalNuevoPlanAbierto(false);
              }}
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
                    />
                    <p className="text-xs text-gray-500 mt-1">Formato: PM-[ENTE]-[AÑO]-[###]</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Ente de Control <span className="text-red-500">*</span>
                    </label>
                    <Select required>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar ente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CONTRALORIA">🏛️ Contraloría General</SelectItem>
                        <SelectItem value="PROCURADURIA">⚖️ Procuraduría General</SelectItem>
                        <SelectItem value="OCI">🔍 Oficina Control Interno</SelectItem>
                        <SelectItem value="AUDITORIA_EXTERNA">📊 Auditoría Externa</SelectItem>
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
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Documento de Origen <span className="text-red-500">*</span>
                  </label>
                  <Input 
                    required
                    placeholder="Informe de Auditoría CGR No. 075-2025" 
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
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Responsable del Plan <span className="text-red-500">*</span>
                    </label>
                    <Input 
                      required
                      placeholder="Dra. Ana María Rodríguez" 
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
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Fecha de Finalización <span className="text-red-500">*</span>
                    </label>
                    <Input 
                      required
                      type="date" 
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
                    <Select required defaultValue="FORMULACION">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
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
    </div>
  );
}

// ==================== VISTA: DASHBOARD ====================
function VistaDashboard({ planes }: { planes: PlanMejoramiento[] }) {
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
    planes.forEach(plan => {
      plan.hallazgos.forEach(h => {
        if (h.severidad === 'CRITICA') criticos++;
        if (h.severidad === 'ALTA') altos++;
        if (h.severidad === 'MEDIA') medios++;
        if (h.severidad === 'BAJA') bajos++;
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
                    <Button variant="outline" size="sm">
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
  onTogglePlan 
}: { 
  planes: PlanMejoramiento[];
  expandedPlans: Set<string>;
  onTogglePlan: (id: string) => void;
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
                    <Button variant="outline" size="sm">
                      <Eye className="w-3 h-3" />
                    </Button>
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

            {/* Detalles Expandidos: Hallazgos y Acciones */}
            {isExpanded && (
              <div className="border-t bg-gray-50 p-4">
                <h4 className="text-sm font-black text-gray-900 mb-3">
                  📋 Hallazgos y Acciones de Mejora ({plan.hallazgos.length})
                </h4>
                <div className="space-y-3">
                  {plan.hallazgos.map((hallazgo, idx) => {
                    const sevConfig = getSeveridadConfig(hallazgo.severidad);
                    
                    return (
                      <div key={hallazgo.id} className="bg-white rounded-lg border p-3">
                        {/* Header del Hallazgo */}
                        <div className="flex items-start gap-2 mb-2">
                          <span className="text-lg flex-shrink-0">{sevConfig.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono font-semibold text-gray-700">{hallazgo.codigo}</span>
                              <Badge style={{ background: sevConfig.bgColor, color: sevConfig.color }} className="text-xs">
                                {sevConfig.nombre}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-900">{hallazgo.descripcion}</p>
                          </div>
                        </div>

                        {/* Acciones del Hallazgo */}
                        <div className="ml-7 space-y-2 mt-3">
                          <p className="text-xs font-semibold text-gray-700 mb-2">
                            Acciones de Mejora ({hallazgo.acciones.length}):
                          </p>
                          {hallazgo.acciones.map(accion => {
                            const accionConfig = getEstadoAccionConfig(accion.estado);
                            
                            return (
                              <div key={accion.id} className="bg-gray-50 rounded p-2 border border-gray-200">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <p className="text-xs text-gray-800 flex-1">{accion.descripcion}</p>
                                  <Badge style={{ background: accionConfig.bgColor, color: accionConfig.color }} className="text-xs flex-shrink-0">
                                    {accionConfig.nombre}
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-600 mb-2">
                                  <div>👤 {accion.responsable}</div>
                                  <div>📅 {formatearFecha(accion.fechaFin)}</div>
                                  <div>📎 {accion.evidencias} evidencias</div>
                                  <div>✅ {accion.avance}%</div>
                                </div>
                                <Progress value={accion.avance} className="h-1.5" />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
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
function VistaTimeline({ planes }: { planes: PlanMejoramiento[] }) {
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
                  <Button variant="outline" size="sm" className="flex-shrink-0">
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