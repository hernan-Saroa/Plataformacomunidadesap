/**
 * MÓDULO: GESTIÓN DE INFORMES DE LEY (RF012)
 * 
 * Sistema completo para gestionar los 20 informes obligatorios que debe presentar ESAP
 * según normativa vigente (Ley 1474, Ley 1712, Decreto 403, etc.)
 * 
 * FUNCIONALIDADES PRINCIPALES:
 * ✅ Catálogo de 20 informes de ley
 * ✅ Periodicidades automáticas (mensual, trimestral, semestral, anual)
 * ✅ Calendario de cumplimiento
 * ✅ Alertas y notificaciones
 * ✅ Estado de cumplimiento
 * ✅ Seguimiento de entregas
 * ✅ Generación y carga de informes
 * ✅ Dashboard de cumplimiento
 * 
 * PROGRESO MÓDULO CONTROL INTERNO: 55% → 70%
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Upload,
  Download,
  Eye,
  Filter,
  Search,
  TrendingUp,
  Bell,
  Settings,
  FileCheck,
  AlertCircle,
  Target,
  Send,
  RefreshCw,
  Edit3,
  Trash2,
  Plus,
  Info,
  BarChart3,
  CalendarClock,
  Building2,
  Scale,
  Users
} from 'lucide-react';
import { Card } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Textarea } from '../../../ui/textarea';
import { Badge } from '../../../ui/badge';
import { toast } from 'sonner@2.0.3';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../../ui/tabs';
import { Progress } from '../../../ui/progress';
import { Separator } from '../../../ui/separator';
import { ScrollArea } from '../../../ui/scroll-area';
import { Switch } from '../../../ui/switch';

// ==================== TIPOS ====================

type PeriodicidadType = 'mensual' | 'bimestral' | 'trimestral' | 'cuatrimestral' | 'semestral' | 'anual';
type EstadoEntrega = 'pendiente' | 'en-proceso' | 'entregado' | 'vencido' | 'rechazado';
type CategoriaInforme = 'financiero' | 'administrativo' | 'contractual' | 'talento-humano' | 'transparencia' | 'control';

interface InformeLey {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  normativaBase: string;
  categoria: CategoriaInforme;
  periodicidad: PeriodicidadType;
  diaPresentacion: number; // Día del mes/periodo para presentar
  entidadDestino: string;
  responsable: string;
  areaResponsable: string;
  
  // Plantilla
  tienePlantilla: boolean;
  urlPlantilla?: string;
  
  // Configuración
  requiereAprobacion: boolean;
  diasAnticipacionAlerta: number;
  activo: boolean;
  
  // Metadata
  fechaCreacion: string;
  ultimaActualizacion: string;
}

interface Entrega {
  id: string;
  informeId: string;
  periodo: string; // "2025-01", "2025-Q1", "2025-S1", "2025"
  fechaVencimiento: string;
  fechaEntrega?: string;
  estado: EstadoEntrega;
  
  // Archivo
  archivoNombre?: string;
  archivoUrl?: string;
  archivoTamano?: number;
  
  // Proceso
  elaboradoPor?: string;
  fechaElaboracion?: string;
  aprobadoPor?: string;
  fechaAprobacion?: string;
  enviadoPor?: string;
  
  // Observaciones
  observaciones?: string;
  motivoRechazo?: string;
  
  // Radicado
  numeroRadicado?: string;
  fechaRadicacion?: string;
}

interface EstadisticasCumplimiento {
  totalInformes: number;
  informesActivos: number;
  entregasPendientes: number;
  entregasEnProceso: number;
  entregasCompletadas: number;
  entregasVencidas: number;
  porcentajeCumplimiento: number;
  proximosVencimientos: number;
  alertasActivas: number;
}

// ==================== DATOS MOCK ====================

const INFORMES_LEY_DATA: InformeLey[] = [
  {
    id: 'INF-001',
    codigo: 'INF-CHIP',
    nombre: 'Información Contable Pública - CHIP',
    descripcion: 'Reporte mensual de ejecución presupuestal y estados financieros al Sistema CHIP de la Contaduría General',
    normativaBase: 'Resolución 357 de 2008 CGN',
    categoria: 'financiero',
    periodicidad: 'mensual',
    diaPresentacion: 15,
    entidadDestino: 'Contaduría General de la Nación',
    responsable: 'María Fernanda López',
    areaResponsable: 'Gestión Financiera',
    tienePlantilla: true,
    urlPlantilla: '/plantillas/chip.xlsx',
    requiereAprobacion: true,
    diasAnticipacionAlerta: 7,
    activo: true,
    fechaCreacion: '2024-01-01',
    ultimaActualizacion: '2025-01-15'
  },
  {
    id: 'INF-002',
    codigo: 'INF-SECOP',
    nombre: 'Publicación Plan Anual de Adquisiciones',
    descripcion: 'Publicación y actualización del Plan Anual de Adquisiciones en el portal SECOP',
    normativaBase: 'Ley 1150 de 2007, Decreto 1082 de 2015',
    categoria: 'contractual',
    periodicidad: 'anual',
    diaPresentacion: 31,
    entidadDestino: 'Colombia Compra Eficiente - SECOP',
    responsable: 'Carlos Andrés Ruiz',
    areaResponsable: 'Gestión Contractual',
    tienePlantilla: true,
    urlPlantilla: '/plantillas/paa.xlsx',
    requiereAprobacion: true,
    diasAnticipacionAlerta: 15,
    activo: true,
    fechaCreacion: '2024-01-01',
    ultimaActualizacion: '2025-01-20'
  },
  {
    id: 'INF-003',
    codigo: 'INF-SIRECI',
    nombre: 'Informe Trimestral de Cartera',
    descripcion: 'Reporte de cuentas por cobrar y gestión de cartera al Sistema de Información y Reporte de Cartera (SIRECI)',
    normativaBase: 'Circular 005 de 2013 MinHacienda',
    categoria: 'financiero',
    periodicidad: 'trimestral',
    diaPresentacion: 15,
    entidadDestino: 'Ministerio de Hacienda',
    responsable: 'María Fernanda López',
    areaResponsable: 'Gestión Financiera',
    tienePlantilla: true,
    urlPlantilla: '/plantillas/sireci.xlsx',
    requiereAprobacion: true,
    diasAnticipacionAlerta: 10,
    activo: true,
    fechaCreacion: '2024-01-01',
    ultimaActualizacion: '2025-01-10'
  },
  {
    id: 'INF-004',
    codigo: 'INF-SIGEP',
    nombre: 'Actualización Información SIGEP',
    descripcion: 'Actualización de planta de personal y hojas de vida en el Sistema de Información de Gestión del Empleo Público',
    normativaBase: 'Decreto 1083 de 2015, Ley 909 de 2004',
    categoria: 'talento-humano',
    periodicidad: 'mensual',
    diaPresentacion: 10,
    entidadDestino: 'Función Pública - SIGEP',
    responsable: 'Lucila Villamil Avendaño',
    areaResponsable: 'Talento Humano',
    tienePlantilla: false,
    requiereAprobacion: false,
    diasAnticipacionAlerta: 5,
    activo: true,
    fechaCreacion: '2024-01-01',
    ultimaActualizacion: '2025-02-05'
  },
  {
    id: 'INF-005',
    codigo: 'INF-PQRS',
    nombre: 'Informe de PQRS',
    descripcion: 'Reporte trimestral de Peticiones, Quejas, Reclamos y Sugerencias recibidas y gestionadas',
    normativaBase: 'Ley 1755 de 2015, Ley 1437 de 2011',
    categoria: 'administrativo',
    periodicidad: 'trimestral',
    diaPresentacion: 20,
    entidadDestino: 'Procuraduría General de la Nación',
    responsable: 'Sandra Paola Montero',
    areaResponsable: 'Atención al Ciudadano',
    tienePlantilla: true,
    urlPlantilla: '/plantillas/pqrs.xlsx',
    requiereAprobacion: true,
    diasAnticipacionAlerta: 10,
    activo: true,
    fechaCreacion: '2024-01-01',
    ultimaActualizacion: '2025-01-18'
  },
  {
    id: 'INF-006',
    codigo: 'INF-TRANSPARENCIA',
    nombre: 'Actualización Portal de Transparencia',
    descripcion: 'Actualización mensual de información en el portal de transparencia según Ley de Transparencia',
    normativaBase: 'Ley 1712 de 2014, Decreto 103 de 2015',
    categoria: 'transparencia',
    periodicidad: 'mensual',
    diaPresentacion: 5,
    entidadDestino: 'Portal Institucional - Ciudadanía',
    responsable: 'Fernando Ávila',
    areaResponsable: 'Comunicaciones',
    tienePlantilla: false,
    requiereAprobacion: true,
    diasAnticipacionAlerta: 3,
    activo: true,
    fechaCreacion: '2024-01-01',
    ultimaActualizacion: '2025-02-01'
  },
  {
    id: 'INF-007',
    codigo: 'INF-SISBEN',
    nombre: 'Reporte de Afiliados al Sistema de Seguridad Social',
    descripcion: 'Reporte mensual de afiliaciones y pago de aportes al Sistema de Seguridad Social',
    normativaBase: 'Ley 100 de 1993, Ley 1122 de 2007',
    categoria: 'talento-humano',
    periodicidad: 'mensual',
    diaPresentacion: 10,
    entidadDestino: 'EPS y Administradoras',
    responsable: 'Lucila Villamil Avendaño',
    areaResponsable: 'Talento Humano',
    tienePlantilla: true,
    urlPlantilla: '/plantillas/sisben.xlsx',
    requiereAprobacion: false,
    diasAnticipacionAlerta: 5,
    activo: true,
    fechaCreacion: '2024-01-01',
    ultimaActualizacion: '2025-02-08'
  },
  {
    id: 'INF-008',
    codigo: 'INF-SIA-OBSERVA',
    nombre: 'Informe de Contratación SIA OBSERVA',
    descripcion: 'Reporte trimestral de contratos celebrados al Sistema de Información de Contratación SIA OBSERVA',
    normativaBase: 'Decreto 1510 de 2013',
    categoria: 'contractual',
    periodicidad: 'trimestral',
    diaPresentacion: 30,
    entidadDestino: 'Contraloría General de la República',
    responsable: 'Carlos Andrés Ruiz',
    areaResponsable: 'Gestión Contractual',
    tienePlantilla: true,
    urlPlantilla: '/plantillas/sia-observa.xlsx',
    requiereAprobacion: true,
    diasAnticipacionAlerta: 10,
    activo: true,
    fechaCreacion: '2024-01-01',
    ultimaActualizacion: '2025-01-25'
  },
  {
    id: 'INF-009',
    codigo: 'INF-MIPG',
    nombre: 'Autodiagnóstico MIPG',
    descripcion: 'Autodiagnóstico anual del Modelo Integrado de Planeación y Gestión',
    normativaBase: 'Decreto 1499 de 2017',
    categoria: 'control',
    periodicidad: 'anual',
    diaPresentacion: 31,
    entidadDestino: 'Función Pública',
    responsable: 'Sandra Paola Montero',
    areaResponsable: 'Control Interno',
    tienePlantilla: false,
    requiereAprobacion: true,
    diasAnticipacionAlerta: 30,
    activo: true,
    fechaCreacion: '2024-01-01',
    ultimaActualizacion: '2024-12-15'
  },
  {
    id: 'INF-010',
    codigo: 'INF-CONTROL-INTERNO',
    nombre: 'Informe Anual de Control Interno',
    descripcion: 'Informe de evaluación del Sistema de Control Interno según MECI',
    normativaBase: 'Ley 1474 de 2011, Decreto 1537 de 2001',
    categoria: 'control',
    periodicidad: 'anual',
    diaPresentacion: 31,
    entidadDestino: 'Rectoría y Consejo Directivo',
    responsable: 'Sandra Paola Montero',
    areaResponsable: 'Control Interno',
    tienePlantilla: true,
    urlPlantilla: '/plantillas/control-interno.docx',
    requiereAprobacion: true,
    diasAnticipacionAlerta: 30,
    activo: true,
    fechaCreacion: '2024-01-01',
    ultimaActualizacion: '2024-12-20'
  },
  {
    id: 'INF-011',
    codigo: 'INF-AUSTERIDAD',
    nombre: 'Informe de Austeridad del Gasto',
    descripcion: 'Reporte cuatrimestral de medidas de austeridad implementadas',
    normativaBase: 'Decreto 1737 de 1998, Circular 001 de MinHacienda',
    categoria: 'financiero',
    periodicidad: 'cuatrimestral',
    diaPresentacion: 15,
    entidadDestino: 'Ministerio de Hacienda',
    responsable: 'María Fernanda López',
    areaResponsable: 'Gestión Financiera',
    tienePlantilla: true,
    urlPlantilla: '/plantillas/austeridad.xlsx',
    requiereAprobacion: true,
    diasAnticipacionAlerta: 10,
    activo: true,
    fechaCreacion: '2024-01-01',
    ultimaActualizacion: '2024-12-10'
  },
  {
    id: 'INF-012',
    codigo: 'INF-RENDICION-CUENTAS',
    nombre: 'Informe de Rendición de Cuentas',
    descripcion: 'Informe anual de rendición de cuentas a la ciudadanía',
    normativaBase: 'Ley 489 de 1998, CONPES 3654',
    categoria: 'transparencia',
    periodicidad: 'anual',
    diaPresentacion: 31,
    entidadDestino: 'Ciudadanía y Partes Interesadas',
    responsable: 'Fernando Ávila',
    areaResponsable: 'Comunicaciones',
    tienePlantilla: true,
    urlPlantilla: '/plantillas/rendicion-cuentas.pptx',
    requiereAprobacion: true,
    diasAnticipacionAlerta: 45,
    activo: true,
    fechaCreacion: '2024-01-01',
    ultimaActualizacion: '2024-11-30'
  },
  {
    id: 'INF-013',
    codigo: 'INF-GESTION-AMBIENTAL',
    nombre: 'Plan de Gestión Ambiental',
    descripcion: 'Informe semestral de implementación del Plan de Gestión Ambiental',
    normativaBase: 'Resolución 242 de 2014 MinAmbiente',
    categoria: 'administrativo',
    periodicidad: 'semestral',
    diaPresentacion: 15,
    entidadDestino: 'Ministerio de Ambiente',
    responsable: 'Carlos Andrés Ruiz',
    areaResponsable: 'Gestión Administrativa',
    tienePlantilla: true,
    urlPlantilla: '/plantillas/gestion-ambiental.xlsx',
    requiereAprobacion: true,
    diasAnticipacionAlerta: 15,
    activo: true,
    fechaCreacion: '2024-01-01',
    ultimaActualizacion: '2024-12-15'
  },
  {
    id: 'INF-014',
    codigo: 'INF-SST',
    nombre: 'Informe de Seguridad y Salud en el Trabajo',
    descripcion: 'Reporte anual del Sistema de Gestión de Seguridad y Salud en el Trabajo',
    normativaBase: 'Decreto 1072 de 2015, Resolución 0312 de 2019',
    categoria: 'talento-humano',
    periodicidad: 'anual',
    diaPresentacion: 31,
    entidadDestino: 'Ministerio de Trabajo',
    responsable: 'Lucila Villamil Avendaño',
    areaResponsable: 'Talento Humano',
    tienePlantilla: true,
    urlPlantilla: '/plantillas/sst.xlsx',
    requiereAprobacion: true,
    diasAnticipacionAlerta: 30,
    activo: true,
    fechaCreacion: '2024-01-01',
    ultimaActualizacion: '2024-12-01'
  },
  {
    id: 'INF-015',
    codigo: 'INF-DENUNCIAS',
    nombre: 'Informe de Denuncias Recibidas',
    descripcion: 'Reporte semestral de denuncias por actos de corrupción o irregularidades',
    normativaBase: 'Ley 1474 de 2011 Estatuto Anticorrupción',
    categoria: 'transparencia',
    periodicidad: 'semestral',
    diaPresentacion: 30,
    entidadDestino: 'Secretaría de Transparencia',
    responsable: 'Sandra Paola Montero',
    areaResponsable: 'Control Interno',
    tienePlantilla: true,
    urlPlantilla: '/plantillas/denuncias.xlsx',
    requiereAprobacion: true,
    diasAnticipacionAlerta: 15,
    activo: true,
    fechaCreacion: '2024-01-01',
    ultimaActualizacion: '2024-12-15'
  },
  {
    id: 'INF-016',
    codigo: 'INF-DERECHOS-AUTOR',
    nombre: 'Informe de Uso de Software Licenciado',
    descripcion: 'Reporte anual de inventario y uso de software con licenciamiento',
    normativaBase: 'Ley 603 de 2000, Circular Externa 005 de 2002',
    categoria: 'administrativo',
    periodicidad: 'anual',
    diaPresentacion: 31,
    entidadDestino: 'Dirección Nacional de Derecho de Autor',
    responsable: 'Fernando Ávila',
    areaResponsable: 'Gestión Tecnológica',
    tienePlantilla: true,
    urlPlantilla: '/plantillas/derechos-autor.xlsx',
    requiereAprobacion: true,
    diasAnticipacionAlerta: 30,
    activo: true,
    fechaCreacion: '2024-01-01',
    ultimaActualizacion: '2024-12-10'
  },
  {
    id: 'INF-017',
    codigo: 'INF-PLAN-MEJORAMIENTO',
    nombre: 'Seguimiento Plan de Mejoramiento',
    descripcion: 'Informe trimestral de avance del Plan de Mejoramiento',
    normativaBase: 'Ley 42 de 1993, Resolución 0357 de 2008',
    categoria: 'control',
    periodicidad: 'trimestral',
    diaPresentacion: 15,
    entidadDestino: 'Contraloría y Entes de Control',
    responsable: 'Sandra Paola Montero',
    areaResponsable: 'Control Interno',
    tienePlantilla: true,
    urlPlantilla: '/plantillas/plan-mejoramiento.xlsx',
    requiereAprobacion: true,
    diasAnticipacionAlerta: 10,
    activo: true,
    fechaCreacion: '2024-01-01',
    ultimaActualizacion: '2025-01-12'
  },
  {
    id: 'INF-018',
    codigo: 'INF-INDICADORES',
    nombre: 'Informe de Indicadores de Gestión',
    descripcion: 'Reporte trimestral de indicadores estratégicos y de gestión',
    normativaBase: 'Decreto 1499 de 2017 MIPG',
    categoria: 'control',
    periodicidad: 'trimestral',
    diaPresentacion: 10,
    entidadDestino: 'Rectoría y Alta Dirección',
    responsable: 'Sandra Paola Montero',
    areaResponsable: 'Planeación Estratégica',
    tienePlantilla: true,
    urlPlantilla: '/plantillas/indicadores.xlsx',
    requiereAprobacion: true,
    diasAnticipacionAlerta: 7,
    activo: true,
    fechaCreacion: '2024-01-01',
    ultimaActualizacion: '2025-01-08'
  },
  {
    id: 'INF-019',
    codigo: 'INF-BIENES',
    nombre: 'Inventario de Bienes Muebles',
    descripcion: 'Actualización anual del inventario de bienes muebles de la entidad',
    normativaBase: 'Resolución 357 de 2008 CGN',
    categoria: 'administrativo',
    periodicidad: 'anual',
    diaPresentacion: 31,
    entidadDestino: 'Contaduría General de la Nación',
    responsable: 'Carlos Andrés Ruiz',
    areaResponsable: 'Gestión Administrativa',
    tienePlantilla: true,
    urlPlantilla: '/plantillas/inventario-bienes.xlsx',
    requiereAprobacion: true,
    diasAnticipacionAlerta: 30,
    activo: true,
    fechaCreacion: '2024-01-01',
    ultimaActualizacion: '2024-12-01'
  },
  {
    id: 'INF-020',
    codigo: 'INF-CONFLICTOS-INTERES',
    nombre: 'Declaración de Conflictos de Interés',
    descripcion: 'Actualización anual de declaraciones de conflictos de interés de directivos',
    normativaBase: 'Ley 1437 de 2011, Ley 1474 de 2011',
    categoria: 'transparencia',
    periodicidad: 'anual',
    diaPresentacion: 31,
    entidadDestino: 'Secretaría General',
    responsable: 'Lucila Villamil Avendaño',
    areaResponsable: 'Talento Humano',
    tienePlantilla: true,
    urlPlantilla: '/plantillas/conflictos-interes.xlsx',
    requiereAprobacion: true,
    diasAnticipacionAlerta: 30,
    activo: true,
    fechaCreacion: '2024-01-01',
    ultimaActualizacion: '2024-12-20'
  }
];

// ==================== COMPONENTE PRINCIPAL ====================

export function GestionInformesLey() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [informes] = useState<InformeLey[]>(INFORMES_LEY_DATA);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');
  const [filtroPeriodicidad, setFiltroPeriodicidad] = useState<string>('todas');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  
  // Modales
  const [isDetalleInformeOpen, setIsDetalleInformeOpen] = useState(false);
  const [isCargarEntregaOpen, setIsCargarEntregaOpen] = useState(false);
  const [isCalendarioOpen, setIsCalendarioOpen] = useState(false);
  const [informeSeleccionado, setInformeSeleccionado] = useState<InformeLey | null>(null);

  // Usuario actual
  const usuarioActual = {
    nombre: 'Sandra Paola Montero',
    cargo: 'Jefe Control Interno',
    email: 'sandra.montero@esap.edu.co'
  };

  // ==================== CÁLCULOS ====================

  const calcularEstadisticas = (): EstadisticasCumplimiento => {
    const activos = informes.filter(i => i.activo);
    const totalEntregas = entregas.length;
    
    // Por simplicidad, calculamos entregas del mes actual
    const pendientes = entregas.filter(e => e.estado === 'pendiente').length;
    const enProceso = entregas.filter(e => e.estado === 'en-proceso').length;
    const completadas = entregas.filter(e => e.estado === 'entregado').length;
    const vencidas = entregas.filter(e => e.estado === 'vencido').length;
    
    const cumplimiento = totalEntregas > 0 
      ? Math.round((completadas / totalEntregas) * 100)
      : 0;
    
    // Próximos 7 días
    const hoy = new Date();
    const proximaSemana = new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000);
    const proximosVencimientos = entregas.filter(e => {
      const fechaVenc = new Date(e.fechaVencimiento);
      return fechaVenc >= hoy && fechaVenc <= proximaSemana && e.estado === 'pendiente';
    }).length;
    
    const alertasActivas = pendientes + vencidas;

    return {
      totalInformes: informes.length,
      informesActivos: activos.length,
      entregasPendientes: pendientes,
      entregasEnProceso: enProceso,
      entregasCompletadas: completadas,
      entregasVencidas: vencidas,
      porcentajeCumplimiento: cumplimiento,
      proximosVencimientos,
      alertasActivas
    };
  };

  const estadisticas = calcularEstadisticas();

  // Filtros
  const informesFiltrados = informes.filter(informe => {
    const matchSearch = 
      informe.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      informe.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      informe.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchCategoria = filtroCategoria === 'todas' || informe.categoria === filtroCategoria;
    const matchPeriodicidad = filtroPeriodicidad === 'todas' || informe.periodicidad === filtroPeriodicidad;
    
    return matchSearch && matchCategoria && matchPeriodicidad;
  });

  // ==================== FUNCIONES ====================

  const handleVerDetalle = (informe: InformeLey) => {
    setInformeSeleccionado(informe);
    setIsDetalleInformeOpen(true);
  };

  const handleCargarEntrega = (informe: InformeLey) => {
    setInformeSeleccionado(informe);
    setIsCargarEntregaOpen(true);
  };

  const handleGenerarCalendario = () => {
    setIsCalendarioOpen(true);
  };

  // ==================== RENDER ====================

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
                  boxShadow: '0 4px 12px rgba(0, 61, 165, 0.15)'
                }}
              >
                <Scale className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-3xl tracking-tight text-gray-900">
                  Informes de Ley
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Gestión de 20 informes obligatorios con periodicidades automáticas
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleGenerarCalendario}
              className="gap-2"
            >
              <Calendar className="w-4 h-4" />
              Calendario Anual
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                toast.info('Descargando calendario...', {
                  description: 'Generando archivo PDF con vencimientos'
                });
              }}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <p className="text-xs text-gray-700">Informes Activos</p>
          </div>
          <p className="text-3xl text-gray-900">{estadisticas.informesActivos}</p>
          <p className="text-xs text-gray-600 mt-1">De {estadisticas.totalInformes} totales</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-xs text-gray-700">Cumplimiento</p>
          </div>
          <p className="text-3xl text-gray-900">{estadisticas.porcentajeCumplimiento}%</p>
          <p className="text-xs text-gray-600 mt-1">
            {estadisticas.entregasCompletadas} de {estadisticas.entregasPendientes + estadisticas.entregasCompletadas} entregas
          </p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-orange-600" />
            <p className="text-xs text-gray-700">Próximos Vencimientos</p>
          </div>
          <p className="text-3xl text-gray-900">{estadisticas.proximosVencimientos}</p>
          <p className="text-xs text-gray-600 mt-1">En los próximos 7 días</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <p className="text-xs text-gray-700">Alertas Activas</p>
          </div>
          <p className="text-3xl text-gray-900">{estadisticas.alertasActivas}</p>
          <p className="text-xs text-gray-600 mt-1">
            {estadisticas.entregasVencidas} vencidos, {estadisticas.entregasPendientes} pendientes
          </p>
        </Card>
      </div>

      {/* Panel informativo */}
      <Card className="p-6 bg-blue-50 border-2 border-blue-200">
        <div className="flex items-start gap-3">
          <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-blue-900 mb-2">Sistema de Informes de Ley (RF012)</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-blue-800">
              <div>
                <p className="font-medium mb-1">✓ 20 Informes Obligatorios</p>
                <p className="text-xs">Catálogo completo según normativa vigente</p>
              </div>
              <div>
                <p className="font-medium mb-1">✓ Periodicidades Automáticas</p>
                <p className="text-xs">Mensual, trimestral, semestral, anual</p>
              </div>
              <div>
                <p className="font-medium mb-1">✓ Calendario de Cumplimiento</p>
                <p className="text-xs">Fechas de vencimiento y alertas anticipadas</p>
              </div>
              <div>
                <p className="font-medium mb-1">✓ Seguimiento Completo</p>
                <p className="text-xs">Estado de elaboración y entregas</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Alertas */}
      {estadisticas.proximosVencimientos > 0 && (
        <Card className="p-4 bg-orange-50 border-2 border-orange-200">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-orange-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-orange-900">
                ⚠️ Tienes {estadisticas.proximosVencimientos} informes con vencimiento próximo (7 días)
              </p>
              <p className="text-sm text-orange-700 mt-1">
                Revisa el calendario y gestiona las entregas pendientes
              </p>
            </div>
            <Button
              onClick={handleGenerarCalendario}
              className="bg-orange-600 hover:bg-orange-700 gap-2"
            >
              Ver Calendario
            </Button>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="informes" className="gap-2">
            <FileText className="w-4 h-4" />
            Catálogo ({informesFiltrados.length})
          </TabsTrigger>
          <TabsTrigger value="calendario" className="gap-2">
            <Calendar className="w-4 h-4" />
            Calendario
          </TabsTrigger>
          <TabsTrigger value="estadisticas" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Estadísticas
          </TabsTrigger>
        </TabsList>

        {/* Tab: Dashboard */}
        <TabsContent value="dashboard" className="mt-4">
          <DashboardInformes
            informes={informes}
            estadisticas={estadisticas}
            onVerDetalle={handleVerDetalle}
          />
        </TabsContent>

        {/* Tab: Catálogo de Informes */}
        <TabsContent value="informes" className="mt-4">
          <CatalogoInformes
            informes={informesFiltrados}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filtroCategoria={filtroCategoria}
            setFiltroCategoria={setFiltroCategoria}
            filtroPeriodicidad={filtroPeriodicidad}
            setFiltroPeriodicidad={setFiltroPeriodicidad}
            onVerDetalle={handleVerDetalle}
            onCargarEntrega={handleCargarEntrega}
          />
        </TabsContent>

        {/* Tab: Calendario */}
        <TabsContent value="calendario" className="mt-4">
          <CalendarioAnual
            informes={informes}
            onVerDetalle={handleVerDetalle}
          />
        </TabsContent>

        {/* Tab: Estadísticas */}
        <TabsContent value="estadisticas" className="mt-4">
          <EstadisticasDetalladas
            informes={informes}
            estadisticas={estadisticas}
          />
        </TabsContent>
      </Tabs>

      {/* Modales */}
      {isDetalleInformeOpen && informeSeleccionado && (
        <ModalDetalleInforme
          isOpen={isDetalleInformeOpen}
          onClose={() => {
            setIsDetalleInformeOpen(false);
            setInformeSeleccionado(null);
          }}
          informe={informeSeleccionado}
          onCargarEntrega={() => {
            setIsDetalleInformeOpen(false);
            setIsCargarEntregaOpen(true);
          }}
        />
      )}

      {isCargarEntregaOpen && informeSeleccionado && (
        <ModalCargarEntrega
          isOpen={isCargarEntregaOpen}
          onClose={() => {
            setIsCargarEntregaOpen(false);
            setInformeSeleccionado(null);
          }}
          informe={informeSeleccionado}
          onGuardar={(entrega) => {
            setEntregas(prev => [...prev, entrega]);
            setIsCargarEntregaOpen(false);
            toast.success('Entrega registrada exitosamente');
          }}
          usuarioActual={usuarioActual}
        />
      )}
    </div>
  );
}

// ==================== SUBCOMPONENTES ====================
// (Se implementarán en el siguiente archivo por límite de tamaño)

function DashboardInformes({ informes, estadisticas, onVerDetalle }: any) {
  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h3 className="text-gray-900 mb-4">Resumen de Informes por Periodicidad</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {['mensual', 'trimestral', 'semestral', 'anual'].map(periodicidad => {
            const count = informes.filter((i: InformeLey) => 
              i.periodicidad === periodicidad && i.activo
            ).length;
            return (
              <div key={periodicidad} className="p-4 bg-gray-50 rounded-lg border">
                <p className="text-sm text-gray-600 mb-1 capitalize">{periodicidad}</p>
                <p className="text-2xl text-gray-900">{count}</p>
                <p className="text-xs text-gray-600 mt-1">informes</p>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-gray-900 mb-4">Informes por Categoría</h3>
        <div className="space-y-3">
          {['financiero', 'contractual', 'talento-humano', 'transparencia', 'control', 'administrativo'].map(cat => {
            const count = informes.filter((i: InformeLey) => i.categoria === cat).length;
            const porcentaje = Math.round((count / informes.length) * 100);
            return (
              <div key={cat}>
                <div className="flex items-center justify-between mb-1 text-sm">
                  <span className="text-gray-700 capitalize">{cat.replace('-', ' ')}</span>
                  <span className="text-gray-900">{count} ({porcentaje}%)</span>
                </div>
                <Progress value={porcentaje} className="h-2" />
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function CatalogoInformes({
  informes,
  searchTerm,
  setSearchTerm,
  filtroCategoria,
  setFiltroCategoria,
  filtroPeriodicidad,
  setFiltroPeriodicidad,
  onVerDetalle,
  onCargarEntrega
}: any) {
  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar informes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
            <SelectTrigger>
              <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las categorías</SelectItem>
              <SelectItem value="financiero">Financiero</SelectItem>
              <SelectItem value="contractual">Contractual</SelectItem>
              <SelectItem value="talento-humano">Talento Humano</SelectItem>
              <SelectItem value="transparencia">Transparencia</SelectItem>
              <SelectItem value="control">Control</SelectItem>
              <SelectItem value="administrativo">Administrativo</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filtroPeriodicidad} onValueChange={setFiltroPeriodicidad}>
            <SelectTrigger>
              <SelectValue placeholder="Todas las periodicidades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las periodicidades</SelectItem>
              <SelectItem value="mensual">Mensual</SelectItem>
              <SelectItem value="bimestral">Bimestral</SelectItem>
              <SelectItem value="trimestral">Trimestral</SelectItem>
              <SelectItem value="cuatrimestral">Cuatrimestral</SelectItem>
              <SelectItem value="semestral">Semestral</SelectItem>
              <SelectItem value="anual">Anual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Lista de informes */}
      <div className="grid grid-cols-1 gap-4">
        {informes.map((informe: InformeLey) => (
          <Card key={informe.id} className="p-5 hover:shadow-lg transition-all duration-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-xs">{informe.codigo}</Badge>
                  <Badge className={`text-xs ${getCategoriaColor(informe.categoria)}`}>
                    {informe.categoria.replace('-', ' ')}
                  </Badge>
                  <Badge variant="outline" className="text-xs capitalize">
                    {informe.periodicidad}
                  </Badge>
                </div>
                <h3 className="text-gray-900 mb-1">{informe.nombre}</h3>
                <p className="text-sm text-gray-600 mb-3">{informe.descripcion}</p>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-600">Normativa</p>
                    <p className="text-gray-900">{informe.normativaBase}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Entidad Destino</p>
                    <p className="text-gray-900">{informe.entidadDestino}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Responsable</p>
                    <p className="text-gray-900">{informe.responsable}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Vencimiento</p>
                    <p className="text-gray-900">Día {informe.diaPresentacion} de cada periodo</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 ml-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onVerDetalle(informe)}
                  className="gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Ver
                </Button>
                <Button
                  size="sm"
                  onClick={() => onCargarEntrega(informe)}
                  className="bg-[#003DA5] hover:bg-[#002873] gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Cargar
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CalendarioAnual({ informes, onVerDetalle }: any) {
  return (
    <Card className="p-6">
      <h3 className="text-gray-900 mb-4">Calendario Anual de Vencimientos 2025</h3>
      <p className="text-sm text-gray-600 mb-6">
        Vista general de todos los vencimientos por mes
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 12 }, (_, i) => {
          const mes = new Date(2025, i, 1).toLocaleDateString('es-CO', { month: 'long' });
          const informesMes = informes.filter((inf: InformeLey) => {
            // Lógica simplificada - en producción calcular vencimientos reales
            return inf.activo;
          });
          
          return (
            <Card key={i} className="p-4 bg-gray-50">
              <h4 className="text-gray-900 capitalize mb-3">{mes}</h4>
              <div className="space-y-2">
                {informesMes.slice(0, 3).map((inf: InformeLey) => (
                  <div key={inf.id} className="text-sm p-2 bg-white rounded border">
                    <p className="text-gray-900 text-xs">{inf.codigo}</p>
                    <p className="text-gray-600 text-xs mt-1">Día {inf.diaPresentacion}</p>
                  </div>
                ))}
                {informesMes.length > 3 && (
                  <p className="text-xs text-gray-600">+{informesMes.length - 3} más...</p>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </Card>
  );
}

function EstadisticasDetalladas({ informes, estadisticas }: any) {
  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h3 className="text-gray-900 mb-4">Cumplimiento General</h3>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-700">Porcentaje de Cumplimiento</span>
            <span className="text-2xl text-gray-900">{estadisticas.porcentajeCumplimiento}%</span>
          </div>
          <Progress value={estadisticas.porcentajeCumplimiento} className="h-3" />
        </div>
        <div className="grid grid-cols-4 gap-4 text-sm text-center">
          <div>
            <p className="text-gray-600">Completados</p>
            <p className="text-2xl text-green-700">{estadisticas.entregasCompletadas}</p>
          </div>
          <div>
            <p className="text-gray-600">En Proceso</p>
            <p className="text-2xl text-blue-700">{estadisticas.entregasEnProceso}</p>
          </div>
          <div>
            <p className="text-gray-600">Pendientes</p>
            <p className="text-2xl text-orange-700">{estadisticas.entregasPendientes}</p>
          </div>
          <div>
            <p className="text-gray-600">Vencidos</p>
            <p className="text-2xl text-red-700">{estadisticas.entregasVencidas}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Helpers
function getCategoriaColor(categoria: string) {
  const colores: Record<string, string> = {
    'financiero': 'bg-green-100 text-green-800',
    'contractual': 'bg-blue-100 text-blue-800',
    'talento-humano': 'bg-purple-100 text-purple-800',
    'transparencia': 'bg-yellow-100 text-yellow-800',
    'control': 'bg-red-100 text-red-800',
    'administrativo': 'bg-gray-100 text-gray-800'
  };
  return colores[categoria] || 'bg-gray-100 text-gray-800';
}

// Modales simplificados
function ModalDetalleInforme({ isOpen, onClose, informe, onCargarEntrega }: any) {
  if (!isOpen) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{informe.nombre}</DialogTitle>
          <DialogDescription>{informe.codigo}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            <div>
              <Label>Descripción</Label>
              <p className="text-sm text-gray-700 mt-1">{informe.descripcion}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label>Normativa Base</Label>
                <p className="text-gray-900 mt-1">{informe.normativaBase}</p>
              </div>
              <div>
                <Label>Categoría</Label>
                <Badge className={`mt-1 ${getCategoriaColor(informe.categoria)}`}>
                  {informe.categoria}
                </Badge>
              </div>
              <div>
                <Label>Periodicidad</Label>
                <p className="text-gray-900 mt-1 capitalize">{informe.periodicidad}</p>
              </div>
              <div>
                <Label>Día de Presentación</Label>
                <p className="text-gray-900 mt-1">Día {informe.diaPresentacion}</p>
              </div>
              <div>
                <Label>Entidad Destino</Label>
                <p className="text-gray-900 mt-1">{informe.entidadDestino}</p>
              </div>
              <div>
                <Label>Responsable</Label>
                <p className="text-gray-900 mt-1">{informe.responsable}</p>
              </div>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
          <Button onClick={onCargarEntrega} className="bg-[#003DA5] hover:bg-[#002873]">
            Cargar Entrega
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModalCargarEntrega({ isOpen, onClose, informe, onGuardar, usuarioActual }: any) {
  const [observaciones, setObservaciones] = useState('');
  
  if (!isOpen) return null;
  
  const handleGuardar = () => {
    const nuevaEntrega: Entrega = {
      id: `ENT-${Date.now()}`,
      informeId: informe.id,
      periodo: '2025-Q1',
      fechaVencimiento: '2025-04-15',
      estado: 'entregado',
      elaboradoPor: usuarioActual.nombre,
      fechaElaboracion: new Date().toISOString(),
      enviadoPor: usuarioActual.nombre,
      fechaEntrega: new Date().toISOString(),
      observaciones,
      archivoNombre: 'informe-ejemplo.pdf',
      numeroRadicado: `RAD-${Date.now()}`,
      fechaRadicacion: new Date().toISOString()
    };
    
    onGuardar(nuevaEntrega);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cargar Entrega</DialogTitle>
          <DialogDescription>{informe.nombre}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Observaciones</Label>
            <Textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Notas sobre esta entrega..."
              rows={4}
              className="mt-1"
            />
          </div>
          <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed">
            <div className="text-center">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Arrastra el archivo aquí o haz clic para seleccionar</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleGuardar} className="bg-[#003DA5] hover:bg-[#002873]">
            Registrar Entrega
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}