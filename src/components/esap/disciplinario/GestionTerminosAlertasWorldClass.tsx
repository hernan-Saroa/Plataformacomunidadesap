/**
 * GESTIÓN DE TÉRMINOS Y ALERTAS - WORLD CLASS ✨
 * Diseño actualizado alineado con el estándar ESAP (SIGL v5.0)
 * 
 * Sistema avanzado de administración de términos procesales con:
 * - Cálculo automático de términos (días hábiles)
 * - Sistema de alertas inteligente
 * - Dashboard de términos próximos a vencer
 * - Integración con procesos y nomenclatura única
 * - Exportación PDF con diseño corporativo
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar, Clock, Bell, AlertCircle, CheckCircle, Settings,
  Plus, Edit2, Trash2, Save, X, Mail, User, FileText,
  TrendingUp, AlertTriangle, Info, RefreshCw, Download,
  Filter, Search, ChevronDown, ChevronRight, Zap, Eye,
  Target, Archive, HelpCircle, PlayCircle, PauseCircle,
  Scale, Hash, Users
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { WizardEnviarAlertas } from './WizardEnviarAlertas';
import { WizardNuevoTermino } from './WizardNuevoTermino';
import { VistaCalendario } from './VistaCalendario';
import { VistaAlertas } from './VistaAlertas';
import { VistaConfiguracion } from './VistaConfiguracion';

// ============================================================================
// INTERFACES
// ============================================================================

interface DiaFestivo {
  id: string;
  fecha: string;
  descripcion: string;
  tipo: 'nacional' | 'regional' | 'institucional';
  territorio?: string;
}

interface Termino {
  id: string;
  procesoId: string;
  numeroProceso: string;
  denunciado: string;
  actuacion: string;
  responsable: string;
  emailResponsable: string;
  fechaInicio: string;
  diasHabiles: number;
  fechaVencimiento: string;
  diasRestantes: number;
  estado: 'pendiente' | 'proximo_vencer' | 'vencido' | 'cumplido' | 'suspendido';
  alertaEnviada: boolean;
  etapaProcesal: string;
}

interface Alerta {
  id: string;
  terminoId: string;
  proceso: string;
  tipo: 'email' | 'visual' | 'sistema';
  fechaEnvio: string;
  destinatario: string;
  estado: 'enviada' | 'pendiente' | 'error';
  asunto: string;
  mensaje: string;
}

interface ReglaAlerta {
  id: string;
  nombre: string;
  diasAnticipacion: number;
  activa: boolean;
  enviarEmail: boolean;
  mostrarPanel: boolean;
  descripcion: string;
  color: string;
}

interface EstadisticasTerminos {
  total: number;
  pendientes: number;
  proximosVencer: number;
  vencidos: number;
  cumplidos: number;
  suspendidos: number;
  alertasEnviadas: number;
  alertasPendientes: number;
}

// ============================================================================
// MOCK DATA - Actualizado con nomenclatura única
// ============================================================================

const DIAS_FESTIVOS_2026: DiaFestivo[] = [
  { id: 'f1', fecha: '2026-01-01', descripcion: 'Año Nuevo', tipo: 'nacional' },
  { id: 'f2', fecha: '2026-01-12', descripcion: 'Día de los Reyes Magos', tipo: 'nacional' },
  { id: 'f3', fecha: '2026-03-23', descripcion: 'Día de San José', tipo: 'nacional' },
  { id: 'f4', fecha: '2026-04-02', descripcion: 'Jueves Santo', tipo: 'nacional' },
  { id: 'f5', fecha: '2026-04-03', descripcion: 'Viernes Santo', tipo: 'nacional' },
  { id: 'f6', fecha: '2026-05-01', descripcion: 'Día del Trabajo', tipo: 'nacional' },
  { id: 'f7', fecha: '2026-05-18', descripcion: 'Ascensión del Señor', tipo: 'nacional' },
  { id: 'f8', fecha: '2026-06-08', descripcion: 'Corpus Christi', tipo: 'nacional' },
  { id: 'f9', fecha: '2026-06-15', descripcion: 'Sagrado Corazón', tipo: 'nacional' },
  { id: 'f10', fecha: '2026-06-29', descripcion: 'San Pedro y San Pablo', tipo: 'nacional' },
  { id: 'f11', fecha: '2026-07-20', descripcion: 'Día de la Independencia', tipo: 'nacional' },
  { id: 'f12', fecha: '2026-08-07', descripcion: 'Batalla de Boyacá', tipo: 'nacional' },
  { id: 'f13', fecha: '2026-08-17', descripcion: 'Asunción de la Virgen', tipo: 'nacional' },
  { id: 'f14', fecha: '2026-10-12', descripcion: 'Día de la Raza', tipo: 'nacional' },
  { id: 'f15', fecha: '2026-11-02', descripcion: 'Todos los Santos', tipo: 'nacional' },
  { id: 'f16', fecha: '2026-11-16', descripcion: 'Independencia de Cartagena', tipo: 'nacional' },
  { id: 'f17', fecha: '2026-12-08', descripcion: 'Inmaculada Concepción', tipo: 'nacional' },
  { id: 'f18', fecha: '2026-12-25', descripcion: 'Navidad', tipo: 'nacional' }
];

const TERMINOS_MOCK: Termino[] = [
  {
    id: 't1',
    procesoId: 'proc-001',
    numeroProceso: 'ESAP-DN-OCID-AP-001-2026',
    denunciado: 'Juan Pérez Gómez',
    actuacion: 'Notificación Auto de Apertura',
    responsable: 'María Torres',
    emailResponsable: 'maria.torres@esap.edu.co',
    fechaInicio: '2026-02-03',
    diasHabiles: 5,
    fechaVencimiento: '2026-02-10',
    diasRestantes: 7,
    estado: 'pendiente',
    alertaEnviada: false,
    etapaProcesal: 'Indagación Preliminar'
  },
  {
    id: 't2',
    procesoId: 'proc-002',
    numeroProceso: 'ESAP-DN-OCID-IN-002-2026',
    denunciado: 'Ana Rodríguez López',
    actuacion: 'Traslado de Cargos',
    responsable: 'Carlos Martínez',
    emailResponsable: 'carlos.martinez@esap.edu.co',
    fechaInicio: '2026-02-05',
    diasHabiles: 10,
    fechaVencimiento: '2026-02-19',
    diasRestantes: 2,
    estado: 'proximo_vencer',
    alertaEnviada: true,
    etapaProcesal: 'Investigación Disciplinaria'
  },
  {
    id: 't3',
    procesoId: 'proc-003',
    numeroProceso: 'ESAP-DN-OCID-JZ-003-2026',
    denunciado: 'Pedro Sánchez Díaz',
    actuacion: 'Citación a Audiencia',
    responsable: 'Laura González',
    emailResponsable: 'laura.gonzalez@esap.edu.co',
    fechaInicio: '2026-01-28',
    diasHabiles: 5,
    fechaVencimiento: '2026-02-04',
    diasRestantes: -6,
    estado: 'vencido',
    alertaEnviada: true,
    etapaProcesal: 'Juzgamiento'
  },
  {
    id: 't4',
    procesoId: 'proc-004',
    numeroProceso: 'ESAP-DN-OCID-AP-004-2026',
    denunciado: 'Sofía Ramírez Castro',
    actuacion: 'Decreto de Pruebas',
    responsable: 'Diego López',
    emailResponsable: 'diego.lopez@esap.edu.co',
    fechaInicio: '2026-01-20',
    diasHabiles: 15,
    fechaVencimiento: '2026-02-10',
    diasRestantes: 0,
    estado: 'cumplido',
    alertaEnviada: false,
    etapaProcesal: 'Investigación Disciplinaria'
  }
];

const REGLAS_ALERTA_MOCK: ReglaAlerta[] = [
  {
    id: 'r1',
    nombre: 'Alerta Crítica',
    diasAnticipacion: 2,
    activa: true,
    enviarEmail: true,
    mostrarPanel: true,
    descripcion: 'Alerta cuando faltan 2 días para el vencimiento',
    color: '#DC2626'
  },
  {
    id: 'r2',
    nombre: 'Alerta Preventiva',
    diasAnticipacion: 5,
    activa: true,
    enviarEmail: true,
    mostrarPanel: true,
    descripcion: 'Alerta cuando faltan 5 días para el vencimiento',
    color: '#F59E0B'
  },
  {
    id: 'r3',
    nombre: 'Alerta Informativa',
    diasAnticipacion: 10,
    activa: false,
    enviarEmail: false,
    mostrarPanel: true,
    descripcion: 'Alerta cuando faltan 10 días para el vencimiento',
    color: '#2563EB'
  }
];

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function GestionTerminosAlertasWorldClass() {
  // Estados principales
  const [terminos, setTerminos] = useState<Termino[]>(TERMINOS_MOCK);
  const [diasFestivos] = useState<DiaFestivo[]>(DIAS_FESTIVOS_2026);
  const [reglasAlerta, setReglasAlerta] = useState<ReglaAlerta[]>(REGLAS_ALERTA_MOCK);
  
  // Estados de UI
  const [vistaActual, setVistaActual] = useState<'terminos' | 'calendario' | 'alertas' | 'configuracion'>('terminos');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroResponsable, setFiltroResponsable] = useState<string>('todos');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [mostrarWizardAlertas, setMostrarWizardAlertas] = useState(false);
  const [mostrarModalTermino, setMostrarModalTermino] = useState(false);
  const [terminoEditando, setTerminoEditando] = useState<Termino | null>(null);
  const [mesCalendario, setMesCalendario] = useState(new Date());

  // ============================================================================
  // CÁLCULO DE ESTADÍSTICAS
  // ============================================================================

  const estadisticas: EstadisticasTerminos = useMemo(() => {
    return {
      total: terminos.length,
      pendientes: terminos.filter(t => t.estado === 'pendiente').length,
      proximosVencer: terminos.filter(t => t.estado === 'proximo_vencer').length,
      vencidos: terminos.filter(t => t.estado === 'vencido').length,
      cumplidos: terminos.filter(t => t.estado === 'cumplido').length,
      suspendidos: terminos.filter(t => t.estado === 'suspendido').length,
      alertasEnviadas: terminos.filter(t => t.alertaEnviada).length,
      alertasPendientes: terminos.filter(t => !t.alertaEnviada && t.diasRestantes <= 5 && t.diasRestantes > 0).length
    };
  }, [terminos]);

  // ============================================================================
  // FILTRADO DE TÉRMINOS
  // ============================================================================

  const terminosFiltrados = useMemo(() => {
    let resultado = [...terminos];

    // Filtro por búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      resultado = resultado.filter(t =>
        t.numeroProceso.toLowerCase().includes(term) ||
        t.denunciado.toLowerCase().includes(term) ||
        t.actuacion.toLowerCase().includes(term) ||
        t.responsable.toLowerCase().includes(term)
      );
    }

    // Filtro por estado
    if (filtroEstado !== 'todos') {
      resultado = resultado.filter(t => t.estado === filtroEstado);
    }

    // Filtro por responsable
    if (filtroResponsable !== 'todos') {
      resultado = resultado.filter(t => t.responsable === filtroResponsable);
    }

    return resultado;
  }, [terminos, searchTerm, filtroEstado, filtroResponsable]);

  // Obtener responsables únicos para el filtro
  const responsablesUnicos = useMemo(() => {
    const responsables = [...new Set(terminos.map(t => t.responsable))];
    return responsables.sort();
  }, [terminos]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleExportarPDF = () => {
    const doc = new jsPDF();
    
    // Header corporativo
    doc.setFillColor(0, 61, 165);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('ESAP', 15, 20);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('Gestión de Términos y Alertas', 15, 30);
    
    // Fecha y hora
    doc.setFontSize(10);
    const ahora = new Date().toLocaleString('es-CO');
    doc.text(`Generado: ${ahora}`, 15, 36);
    
    // Estadísticas
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen de Términos', 15, 50);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total: ${estadisticas.total}`, 15, 58);
    doc.text(`Pendientes: ${estadisticas.pendientes}`, 60, 58);
    doc.text(`Próximos a vencer: ${estadisticas.proximosVencer}`, 105, 58);
    doc.text(`Vencidos: ${estadisticas.vencidos}`, 160, 58);
    
    // Tabla
    autoTable(doc, {
      startY: 68,
      head: [['N° Proceso', 'Denunciado', 'Actuación', 'Vencimiento', 'Días', 'Estado']],
      body: terminosFiltrados.map(t => [
        t.numeroProceso,
        t.denunciado,
        t.actuacion,
        new Date(t.fechaVencimiento).toLocaleDateString('es-CO'),
        t.diasRestantes.toString(),
        t.estado.toUpperCase()
      ]),
      headStyles: {
        fillColor: [0, 61, 165],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 8
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250]
      }
    });
    
    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text(
        `Página ${i} de ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
    
    doc.save(`Terminos_Alertas_${new Date().toISOString().split('T')[0]}.pdf`);
    
    toast.success('PDF exportado', {
      description: 'El reporte ha sido descargado exitosamente'
    });
  };

  const handleEnviarAlertas = () => {
    const terminosParaAlerta = terminos.filter(
      t => !t.alertaEnviada && t.diasRestantes <= 5 && t.diasRestantes > 0
    );

    if (terminosParaAlerta.length === 0) {
      toast.info('No hay alertas pendientes', {
        description: 'Todos los términos próximos a vencer ya tienen alertas enviadas'
      });
      return;
    }

    // Simular envío de alertas
    setTimeout(() => {
      setTerminos(prev => prev.map(t => {
        if (terminosParaAlerta.some(ta => ta.id === t.id)) {
          return { ...t, alertaEnviada: true };
        }
        return t;
      }));

      toast.success('Alertas enviadas', {
        description: `Se enviaron ${terminosParaAlerta.length} alertas por email`
      });
    }, 1000);
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente': return { bg: '#EFF6FF', border: '#2563EB', text: '#1E40AF' };
      case 'proximo_vencer': return { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' };
      case 'vencido': return { bg: '#FEE2E2', border: '#DC2626', text: '#991B1B' };
      case 'cumplido': return { bg: '#ECFDF5', border: '#10B981', text: '#065F46' };
      case 'suspendido': return { bg: '#F3F4F6', border: '#6B7280', text: '#374151' };
      default: return { bg: '#F9FAFB', border: '#E5E7EB', text: '#6B7280' };
    }
  };

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'Pendiente';
      case 'proximo_vencer': return 'Próximo a Vencer';
      case 'vencido': return 'Vencido';
      case 'cumplido': return 'Cumplido';
      case 'suspendido': return 'Suspendido';
      default: return estado;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header con estadísticas */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#1F2937' }}>
              Términos y Alertas
            </h1>
            <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
              Control de términos procesales y sistema de alertas automáticas
            </p>
          </div>
          <div className="flex items-center gap-2">
            {vistaActual === 'terminos' && (
              <>
                <button
                  onClick={() => setMostrarWizardAlertas(true)}
                  className="px-4 py-2 rounded-xl font-semibold text-white flex items-center gap-2 hover:opacity-90 transition-all shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}
                >
                  <Zap className="w-4 h-4" />
                  <span className="hidden lg:inline">Enviar Alertas</span>
                </button>
                <button
                  onClick={handleExportarPDF}
                  className="px-4 py-2 rounded-xl font-semibold border-2 flex items-center gap-2 hover:bg-gray-50 transition-colors"
                  style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden lg:inline">Exportar PDF</span>
                </button>
              </>
            )}
            {vistaActual === 'terminos' && (
              <button
                onClick={() => setMostrarModalTermino(true)}
                className="px-4 py-2 rounded-xl font-semibold text-white flex items-center gap-2 hover:opacity-90 transition-all shadow-sm"
                style={{ background: 'linear-gradient(135deg, #003DA5 0%, #2962FF 100%)' }}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden lg:inline">Nuevo Término</span>
              </button>
            )}
          </div>
        </div>

        {/* Tabs de navegación */}
        <div className="mb-4 border-b-2" style={{ borderColor: '#E5E7EB' }}>
          <div className="flex gap-1">
            <button
              onClick={() => setVistaActual('terminos')}
              className="px-4 py-3 font-semibold text-sm flex items-center gap-2 transition-all border-b-2"
              style={{
                color: vistaActual === 'terminos' ? '#003DA5' : '#6B7280',
                borderColor: vistaActual === 'terminos' ? '#003DA5' : 'transparent',
                background: vistaActual === 'terminos' ? '#EFF6FF' : 'transparent'
              }}
            >
              <FileText className="w-4 h-4" />
              Términos
              {vistaActual === 'terminos' && (
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ background: '#003DA5', color: 'white' }}>
                  {terminos.length}
                </div>
              )}
            </button>

            <button
              onClick={() => setVistaActual('calendario')}
              className="px-4 py-3 font-semibold text-sm flex items-center gap-2 transition-all border-b-2"
              style={{
                color: vistaActual === 'calendario' ? '#003DA5' : '#6B7280',
                borderColor: vistaActual === 'calendario' ? '#003DA5' : 'transparent',
                background: vistaActual === 'calendario' ? '#EFF6FF' : 'transparent'
              }}
            >
              <Calendar className="w-4 h-4" />
              Calendario
              {vistaActual === 'calendario' && (
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ background: '#003DA5', color: 'white' }}>
                  {diasFestivos.length}
                </div>
              )}
            </button>

            <button
              onClick={() => setVistaActual('alertas')}
              className="px-4 py-3 font-semibold text-sm flex items-center gap-2 transition-all border-b-2"
              style={{
                color: vistaActual === 'alertas' ? '#003DA5' : '#6B7280',
                borderColor: vistaActual === 'alertas' ? '#003DA5' : 'transparent',
                background: vistaActual === 'alertas' ? '#EFF6FF' : 'transparent'
              }}
            >
              <Bell className="w-4 h-4" />
              Alertas
              {vistaActual === 'alertas' && estadisticas.alertasPendientes > 0 && (
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ background: '#F59E0B', color: 'white' }}>
                  {estadisticas.alertasPendientes}
                </div>
              )}
            </button>

            <button
              onClick={() => setVistaActual('configuracion')}
              className="px-4 py-3 font-semibold text-sm flex items-center gap-2 transition-all border-b-2"
              style={{
                color: vistaActual === 'configuracion' ? '#003DA5' : '#6B7280',
                borderColor: vistaActual === 'configuracion' ? '#003DA5' : 'transparent',
                background: vistaActual === 'configuracion' ? '#EFF6FF' : 'transparent'
              }}
            >
              <Settings className="w-4 h-4" />
              Configuración
              {vistaActual === 'configuracion' && (
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ background: '#003DA5', color: 'white' }}>
                  {reglasAlerta.filter(r => r.activa).length}
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Cards de estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div
            className="p-4 rounded-xl border-2 cursor-pointer hover:scale-[1.02] transition-transform"
            style={{ background: '#EFF6FF', borderColor: '#DBEAFE' }}
            onClick={() => setFiltroEstado('todos')}
          >
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4" style={{ color: '#2563EB' }} />
              <span className="text-xs font-semibold" style={{ color: '#1E40AF' }}>Total</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: '#1E40AF' }}>{estadisticas.total}</p>
          </div>

          <div
            className="p-4 rounded-xl border-2 cursor-pointer hover:scale-[1.02] transition-transform"
            style={{ background: '#EFF6FF', borderColor: '#DBEAFE' }}
            onClick={() => setFiltroEstado('pendiente')}
          >
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4" style={{ color: '#2563EB' }} />
              <span className="text-xs font-semibold" style={{ color: '#1E40AF' }}>Pendientes</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: '#2563EB' }}>{estadisticas.pendientes}</p>
          </div>

          <div
            className="p-4 rounded-xl border-2 cursor-pointer hover:scale-[1.02] transition-transform"
            style={{ background: '#FEF3C7', borderColor: '#FDE68A' }}
            onClick={() => setFiltroEstado('proximo_vencer')}
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4" style={{ color: '#F59E0B' }} />
              <span className="text-xs font-semibold" style={{ color: '#92400E' }}>Próximos</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: '#F59E0B' }}>{estadisticas.proximosVencer}</p>
          </div>

          <div
            className="p-4 rounded-xl border-2 cursor-pointer hover:scale-[1.02] transition-transform"
            style={{ background: '#FEE2E2', borderColor: '#FECACA' }}
            onClick={() => setFiltroEstado('vencido')}
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4" style={{ color: '#DC2626' }} />
              <span className="text-xs font-semibold" style={{ color: '#991B1B' }}>Vencidos</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: '#DC2626' }}>{estadisticas.vencidos}</p>
          </div>

          <div
            className="p-4 rounded-xl border-2 cursor-pointer hover:scale-[1.02] transition-transform"
            style={{ background: '#ECFDF5', borderColor: '#D1FAE5' }}
            onClick={() => setFiltroEstado('cumplido')}
          >
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4" style={{ color: '#10B981' }} />
              <span className="text-xs font-semibold" style={{ color: '#065F46' }}>Cumplidos</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: '#10B981' }}>{estadisticas.cumplidos}</p>
          </div>

          <div
            className="p-4 rounded-xl border-2 cursor-pointer hover:scale-[1.02] transition-transform"
            style={{ background: '#FEF3C7', borderColor: '#FDE68A' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-4 h-4" style={{ color: '#F59E0B' }} />
              <span className="text-xs font-semibold" style={{ color: '#92400E' }}>Alertas</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: '#F59E0B' }}>{estadisticas.alertasPendientes}</p>
          </div>
        </div>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="mb-4">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Búsqueda */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9CA3AF' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por proceso, denunciado, actuación o responsable..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] transition-colors text-sm"
              style={{ borderColor: '#E5E7EB' }}
            />
          </div>

          {/* Botón de filtros - solo en vista términos */}
          {vistaActual === 'terminos' && (
            <button
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className="px-4 py-3 rounded-xl font-semibold border-2 flex items-center gap-2 hover:bg-gray-50 transition-colors text-sm"
              style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
            >
              <Filter className="w-4 h-4" />
              Filtros
              {mostrarFiltros ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Panel de filtros expandible - solo en vista términos */}
        {vistaActual === 'terminos' && (
          <AnimatePresence>
            {mostrarFiltros && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 p-4 rounded-xl border-2 grid grid-cols-1 md:grid-cols-2 gap-4" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
                  {/* Filtro por estado */}
                  <div>
                    <label className="block mb-2 text-xs font-bold uppercase" style={{ color: '#6B7280' }}>
                      Estado
                    </label>
                    <select
                      value={filtroEstado}
                      onChange={(e) => setFiltroEstado(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border-2 focus:outline-none focus:border-[#003DA5] text-sm"
                      style={{ borderColor: '#E5E7EB' }}
                    >
                      <option value="todos">Todos los estados</option>
                      <option value="pendiente">Pendiente</option>
                      <option value="proximo_vencer">Próximo a vencer</option>
                      <option value="vencido">Vencido</option>
                      <option value="cumplido">Cumplido</option>
                      <option value="suspendido">Suspendido</option>
                    </select>
                  </div>

                  {/* Filtro por responsable */}
                  <div>
                    <label className="block mb-2 text-xs font-bold uppercase" style={{ color: '#6B7280' }}>
                      Responsable
                    </label>
                    <select
                      value={filtroResponsable}
                      onChange={(e) => setFiltroResponsable(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border-2 focus:outline-none focus:border-[#003DA5] text-sm"
                      style={{ borderColor: '#E5E7EB' }}
                    >
                      <option value="todos">Todos los responsables</option>
                      {responsablesUnicos.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Contenido por vista */}
      <AnimatePresence mode="wait">
        <motion.div
          key={vistaActual}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex-1 overflow-y-auto"
        >
          {vistaActual === 'terminos' && (
            <div className="space-y-3">
              {terminosFiltrados.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
                  <p className="font-semibold" style={{ color: '#6B7280' }}>
                    No se encontraron términos
                  </p>
                  <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
                    Intenta ajustar los filtros de búsqueda
                  </p>
                </div>
              ) : (
                terminosFiltrados.map((termino) => {
                  const colors = getEstadoColor(termino.estado);
                  
                  return (
                    <motion.div
                      key={termino.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-xl border-2 hover:shadow-md transition-all"
                      style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* Columna izquierda - Info del proceso */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Scale className="w-4 h-4" style={{ color: '#003DA5' }} />
                            <span className="font-mono font-bold text-sm" style={{ color: '#003DA5' }}>
                              {termino.numeroProceso}
                            </span>
                            <div
                              className="px-2 py-0.5 rounded-md text-xs font-semibold"
                              style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
                            >
                              {getEstadoLabel(termino.estado)}
                            </div>
                            {termino.alertaEnviada && (
                              <Bell className="w-3.5 h-3.5" style={{ color: '#F59E0B' }} />
                            )}
                          </div>

                          <p className="font-semibold text-sm mb-1" style={{ color: '#1F2937' }}>
                            {termino.denunciado}
                          </p>
                          <p className="text-xs mb-2" style={{ color: '#6B7280' }}>
                            {termino.actuacion}
                          </p>

                          <div className="flex items-center gap-4 text-xs" style={{ color: '#6B7280' }}>
                            <div className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />
                              <span>{termino.responsable}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Target className="w-3.5 h-3.5" />
                              <span>{termino.etapaProcesal}</span>
                            </div>
                          </div>
                        </div>

                        {/* Columna derecha - Fechas y días */}
                        <div className="text-right">
                          <div className="mb-2">
                            <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>
                              Vencimiento
                            </p>
                            <p className="font-semibold text-sm" style={{ color: '#1F2937' }}>
                              {new Date(termino.fechaVencimiento).toLocaleDateString('es-CO')}
                            </p>
                          </div>

                          <div
                            className="px-3 py-1.5 rounded-lg inline-block"
                            style={{
                              background: termino.diasRestantes < 0 ? '#FEE2E2' : 
                                         termino.diasRestantes <= 2 ? '#FEF3C7' : '#ECFDF5',
                              border: `2px solid ${termino.diasRestantes < 0 ? '#DC2626' : 
                                                   termino.diasRestantes <= 2 ? '#F59E0B' : '#10B981'}`
                            }}
                          >
                            <p className="text-xs font-semibold" style={{
                              color: termino.diasRestantes < 0 ? '#991B1B' : 
                                     termino.diasRestantes <= 2 ? '#92400E' : '#065F46'
                            }}>
                              {termino.diasRestantes < 0 ? `${Math.abs(termino.diasRestantes)} días vencido` :
                               termino.diasRestantes === 0 ? 'Vence hoy' :
                               `${termino.diasRestantes} días restantes`}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}

          {vistaActual === 'calendario' && (
            <VistaCalendario
              diasFestivos={diasFestivos}
              terminos={terminos}
            />
          )}

          {vistaActual === 'alertas' && (
            <VistaAlertas
              terminos={terminos}
            />
          )}

          {vistaActual === 'configuracion' && (
            <VistaConfiguracion
              reglasAlerta={reglasAlerta}
              diasFestivos={diasFestivos}
              onActualizarReglas={setReglasAlerta}
              onActualizarFestivos={() => {}}
            />
          )}
        </motion.div>
      </AnimatePresence>
      
      {/* Wizard de Envío de Alertas */}
      <WizardEnviarAlertas
        isOpen={mostrarWizardAlertas}
        onClose={() => setMostrarWizardAlertas(false)}
        terminos={terminos}
        onEnviarAlertas={async (terminosIds, mensaje, asunto) => {
          // Marcar términos como alertados
          setTerminos(prev => prev.map(t => {
            if (terminosIds.includes(t.id)) {
              return { ...t, alertaEnviada: true };
            }
            return t;
          }));
        }}
      />

      {/* Wizard de Nuevo Término */}
      <WizardNuevoTermino
        isOpen={mostrarModalTermino}
        onClose={() => setMostrarModalTermino(false)}
        onCrearTermino={(nuevoTermino) => {
          // Calcular días restantes
          const hoy = new Date();
          const vencimiento = new Date(nuevoTermino.fechaVencimiento);
          const diffTime = vencimiento.getTime() - hoy.getTime();
          const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          // Determinar estado según días restantes
          let estado: 'pendiente' | 'proximo_vencer' | 'vencido' | 'cumplido' | 'suspendido' = 'pendiente';
          if (diasRestantes < 0) {
            estado = 'vencido';
          } else if (diasRestantes <= 2) {
            estado = 'proximo_vencer';
          }
          
          // Crear término completo
          const terminoCompleto: Termino = {
            ...nuevoTermino,
            id: 't' + Date.now(),
            diasRestantes,
            estado,
            alertaEnviada: false
          };
          
          // Agregar a la lista
          setTerminos(prev => [...prev, terminoCompleto]);
          
          toast.success('Término creado', {
            description: `Se creó el término para ${nuevoTermino.numeroProceso}`
          });
        }}
      />
    </div>
  );
}