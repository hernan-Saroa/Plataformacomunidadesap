/**
 * RF006 - GESTIÓN DE TÉRMINOS Y ALERTAS
 * Sistema de administración de términos procesales con cálculo automático y alertas
 * DISEÑO WORLD-CLASS - Estilo corporativo ESAP consistente con Expedientes Electrónicos
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar, Clock, Bell, AlertCircle, CheckCircle, Settings,
  Plus, Edit2, Trash2, Save, X, Mail, User, FileText,
  TrendingUp, AlertTriangle, Info, RefreshCw, Download,
  Filter, Search, ChevronDown, ChevronRight, Zap, Eye,
  Play, Pause, Target, Archive, HelpCircle
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'sonner';
import { FlujoTerminosAlertas } from './FlujoTerminosAlertas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import terminosAlertasService, {
  type Termino,
  type DiaFestivo,
  type ReglaAlerta,
  type Alerta,
} from '../../../services/api/terminosAlertas.service';
import { disciplinaryService } from '../../../services/api/disciplinary.service';
import { authService } from '../../../services/api/authService';
import { Permissions } from '../../../enums/permissions';

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
  proceso: string;
  numeroProceso: string;
  actuacion: string;
  responsable: string;
  emailResponsable: string;
  fechaInicio: string;
  diasHabiles: number;
  fechaVencimiento: string;
  diasRestantes: number;
  estado: 'pendiente' | 'proximo_vencer' | 'vencido' | 'cumplido';
  alertaEnviada: boolean;
}

interface Alerta {
  id: string;
  termino: string;
  proceso: string;
  tipo: 'email' | 'visual' | 'sistema';
  fechaEnvio: string;
  destinatario: string;
  estado: 'enviada' | 'pendiente' | 'error';
  asunto: string;
}

interface ReglaAlerta {
  id: string;
  nombre: string;
  diasAnticipacion: number;
  activa: boolean;
  enviarEmail: boolean;
  mostrarPanel: boolean;
  descripcion: string;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const DIAS_FESTIVOS_MOCK: DiaFestivo[] = [
  { id: 'f1', fecha: '2025-01-01', descripcion: 'Año Nuevo', tipo: 'nacional' },
  { id: 'f2', fecha: '2025-01-06', descripcion: 'Día de los Reyes Magos', tipo: 'nacional' },
  { id: 'f3', fecha: '2025-03-24', descripcion: 'Día de San José', tipo: 'nacional' },
  { id: 'f4', fecha: '2025-04-17', descripcion: 'Jueves Santo', tipo: 'nacional' },
  { id: 'f5', fecha: '2025-04-18', descripcion: 'Viernes Santo', tipo: 'nacional' },
  { id: 'f6', fecha: '2025-05-01', descripcion: 'Día del Trabajo', tipo: 'nacional' },
  { id: 'f7', fecha: '2025-06-23', descripcion: 'Día de San Pedro y San Pablo', tipo: 'nacional' },
  { id: 'f8', fecha: '2025-07-20', descripcion: 'Día de la Independencia', tipo: 'nacional' },
  { id: 'f9', fecha: '2025-08-07', descripcion: 'Batalla de Boyacá', tipo: 'nacional' },
  { id: 'f10', fecha: '2025-08-18', descripcion: 'Asunción de la Virgen', tipo: 'nacional' },
  { id: 'f11', fecha: '2025-10-13', descripcion: 'Día de la Raza', tipo: 'nacional' },
  { id: 'f12', fecha: '2025-11-03', descripcion: 'Todos los Santos', tipo: 'nacional' },
  { id: 'f13', fecha: '2025-11-17', descripcion: 'Independencia de Cartagena', tipo: 'nacional' },
  { id: 'f14', fecha: '2025-12-08', descripcion: 'Inmaculada Concepción', tipo: 'nacional' },
  { id: 'f15', fecha: '2025-12-25', descripcion: 'Navidad', tipo: 'nacional' }
];

const TERMINOS_MOCK: Termino[] = [
  {
    id: 't1',
    proceso: 'Juan Pérez Gómez',
    numeroProceso: 'P-120-2025',
    actuacion: 'Notificación Auto de Apertura',
    responsable: 'Secretaría OCID',
    emailResponsable: 'secretaria@esap.edu.co',
    fechaInicio: '2025-01-07',
    diasHabiles: 5,
    fechaVencimiento: '2025-01-14',
    diasRestantes: 3,
    estado: 'proximo_vencer',
    alertaEnviada: true
  },
  {
    id: 't2',
    proceso: 'María González Castro',
    numeroProceso: 'P-089-2024',
    actuacion: 'Presentación de Descargos',
    responsable: 'Investigado',
    emailResponsable: 'maria.gonzalez@ejemplo.com',
    fechaInicio: '2024-12-10',
    diasHabiles: 10,
    fechaVencimiento: '2024-12-23',
    diasRestantes: -22,
    estado: 'vencido',
    alertaEnviada: true
  },
  {
    id: 't3',
    proceso: 'Carlos Andrés Rodríguez',
    numeroProceso: 'P-156-2025',
    actuacion: 'Valoración Noticia Disciplinaria',
    responsable: 'Marta Torres',
    emailResponsable: 'marta.torres@esap.edu.co',
    fechaInicio: '2025-01-08',
    diasHabiles: 30,
    fechaVencimiento: '2025-02-18',
    diasRestantes: 25,
    estado: 'pendiente',
    alertaEnviada: false
  },
  {
    id: 't4',
    proceso: 'Ana María López Hernández',
    numeroProceso: 'P-045-2024',
    actuacion: 'Práctica de Pruebas',
    responsable: 'Juan Carlos Ruiz',
    emailResponsable: 'juan.ruiz@esap.edu.co',
    fechaInicio: '2024-11-20',
    diasHabiles: 15,
    fechaVencimiento: '2024-12-10',
    diasRestantes: 0,
    estado: 'cumplido',
    alertaEnviada: false
  },
  {
    id: 't5',
    proceso: 'Jorge Luis Martínez Sánchez',
    numeroProceso: 'P-198-2025',
    actuacion: 'Indagación Preliminar',
    responsable: 'Laura Díaz',
    emailResponsable: 'laura.diaz@esap.edu.co',
    fechaInicio: '2025-01-15',
    diasHabiles: 6,
    fechaVencimiento: '2025-01-24',
    diasRestantes: 11,
    estado: 'pendiente',
    alertaEnviada: false
  }
];

const REGLAS_ALERTA_MOCK: ReglaAlerta[] = [
  {
    id: 'r1',
    nombre: 'Alerta Crítica - 2 días antes',
    diasAnticipacion: 2,
    activa: true,
    enviarEmail: true,
    mostrarPanel: true,
    descripcion: 'Se envía cuando faltan 2 días hábiles para el vencimiento'
  },
  {
    id: 'r2',
    nombre: 'Alerta Preventiva - 5 días antes',
    diasAnticipacion: 5,
    activa: true,
    enviarEmail: true,
    mostrarPanel: true,
    descripcion: 'Se envía cuando faltan 5 días hábiles para el vencimiento'
  },
  {
    id: 'r3',
    nombre: 'Alerta Temprana - 10 días antes',
    diasAnticipacion: 10,
    activa: false,
    enviarEmail: false,
    mostrarPanel: true,
    descripcion: 'Se envía cuando faltan 10 días hábiles para el vencimiento'
  }
];

const ALERTAS_MOCK: Alerta[] = [
  {
    id: 'a1',
    termino: 't1',
    proceso: 'P-120-2025 - Juan Pérez Gómez',
    tipo: 'email',
    fechaEnvio: '2025-01-12 09:00',
    destinatario: 'secretaria@esap.edu.co',
    estado: 'enviada',
    asunto: 'Término próximo a vencer: Notificación Auto de Apertura'
  },
  {
    id: 'a2',
    termino: 't2',
    proceso: 'P-089-2024 - María González Castro',
    tipo: 'email',
    fechaEnvio: '2024-12-20 08:30',
    destinatario: 'maria.gonzalez@ejemplo.com',
    estado: 'enviada',
    asunto: 'Recordatorio: Presentación de Descargos'
  },
  {
    id: 'a3',
    termino: 't2',
    proceso: 'P-089-2024 - María González Castro',
    tipo: 'sistema',
    fechaEnvio: '2024-12-24 00:01',
    destinatario: 'Sistema',
    estado: 'enviada',
    asunto: 'Término vencido: Presentación de Descargos'
  }
];

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function GestionTerminosAlertas() {
  const [terminos, setTerminos] = useState<Termino[]>([]);
  const [diasFestivos, setDiasFestivos] = useState<DiaFestivo[]>([]);
  const [reglasAlerta, setReglasAlerta] = useState<ReglaAlerta[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [festivoEditId, setFestivoEditId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    pendientes: 0,
    proximosVencer: 0,
    vencidos: 0,
    cumplidos: 0
  });
  const [vistaActual, setVistaActual] = useState<'terminos' | 'calendario' | 'reglas' | 'historial'>('terminos');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [showModalNuevoTermino, setShowModalNuevoTermino] = useState(false);
  const [showModalFestivo, setShowModalFestivo] = useState(false);
  const [showFlujoModal, setShowFlujoModal] = useState(false);
  const [terminoSeleccionado, setTerminoSeleccionado] = useState<Termino | null>(null);
  const [showModalDetalle, setShowModalDetalle] = useState(false);
  const [showModalRegla, setShowModalRegla] = useState(false);
  const [reglaEditando, setReglaEditando] = useState<ReglaAlerta | null>(null);
  
  // Estados para autocompletar de procesos
  const [radicadosDisponibles, setRadicadosDisponibles] = useState<string[]>([]);
  const [showProcesoDropdown, setShowProcesoDropdown] = useState(false);
  const [cargandoProcesos, setCargandoProcesos] = useState(false);
  
  // Estados para profesionales
  const [profesionales, setProfesionales] = useState<any[]>([]);
  const [cargandoProfesionales, setCargandoProfesionales] = useState(false);
  
  // Formulario para nuevo término
  const [nuevoTermino, setNuevoTermino] = useState({
    proceso: '',
    numeroProceso: '',
    actuacion: '',
    responsableId: '',
    responsable: '',
    emailResponsable: '',
    fechaInicio: '',
    diasHabiles: 10
  });

  // Formulario para nuevo festivo
  const [nuevoFestivo, setNuevoFestivo] = useState({
    fecha: '',
    descripcion: '',
    tipo: 'nacional' as 'nacional' | 'regional' | 'institucional',
    territorio: ''
  });

  // Formulario para regla de alerta
  const [reglaForm, setReglaForm] = useState({
    nombre: '',
    diasAnticipacion: 2,
    activa: true,
    enviarEmail: false,
    mostrarPanel: true,
    descripcion: ''
  });

  // Cargar datos desde el backend
  useEffect(() => {
    cargarDatos();
    cargarProcesos();
    cargarProfesionales();
  }, []);

  // Cargar procesos disponibles para autocompletar
  const cargarProcesos = async () => {
    try {
      setCargandoProcesos(true);
      const procesosApi = await disciplinaryService.getAllProcesos();
      
      // Extraer solo los radicados para el autocomplete
      const radicados = procesosApi.map(p => p.radicadoProceso).filter(Boolean);
      setRadicadosDisponibles(radicados);
    } catch (error: any) {
      console.error('Error al cargar procesos:', error);
      // No mostrar error al usuario, solo log
    } finally {
      setCargandoProcesos(false);
    }
  };

  // Cargar profesionales disponibles
  const cargarProfesionales = async () => {
    try {
      setCargandoProfesionales(true);
      const profesionalesApi = await disciplinaryService.getProfesionales();
      setProfesionales(profesionalesApi || []);
    } catch (error: any) {
      console.error('Error al cargar profesionales:', error);
      toast.error('Error al cargar profesionales', {
        description: 'No se pudieron cargar los profesionales disponibles'
      });
    } finally {
      setCargandoProfesionales(false);
    }
  };

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Cargar términos
      const terminosResponse = await terminosAlertasService.listarTerminos({
        page: 1,
        limit: 1000,
        ...(filterEstado !== 'all' && { estado: filterEstado as any }),
        ...(searchQuery && { search: searchQuery }),
      });
      
      // El backend devuelve { terminos: [...], pagination: {...}, stats: {...} }
      // pero el frontend espera { items: [...], stats: {...} }
      const terminosList = terminosResponse.items || terminosResponse.terminos || [];
      setTerminos(terminosList);
      
      if (terminosResponse.stats) {
        setStats(terminosResponse.stats);
      }
      
      console.log('📊 Términos cargados:', terminosList.length, 'Términos:', terminosList);

      // Cargar festivos
      const festivosResponse = await terminosAlertasService.listarFestivos();
      const festivosActivos = (festivosResponse.festivos || []).filter((f) => f.activo !== false);
      setDiasFestivos(festivosActivos);

      // Cargar reglas de alerta
      const reglasResponse = await terminosAlertasService.listarReglasAlerta();
      setReglasAlerta(reglasResponse.reglas || []);

      // Cargar alertas
      const alertasResponse = await terminosAlertasService.listarAlertas({
        page: 1,
        limit: 1000,
      });
      setAlertas(alertasResponse.items || []);
    } catch (error: any) {
      console.error('Error cargando datos:', error);
      toast.error('Error al cargar datos', {
        description: error.message || 'No se pudieron cargar los datos del servidor'
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtrado de términos (ahora se hace en el backend, pero mantenemos filtro local para búsqueda)
  const terminosFiltrados = terminos.filter((t: Termino) => {
    const matchesSearch = 
      t.proceso.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.numeroProceso.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.actuacion.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.responsable.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesEstado = filterEstado === 'all' || t.estado === filterEstado;

    return matchesSearch && matchesEstado;
  });

  const festivosOrdenados = [...diasFestivos].sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
  );

  const handleMarcarCompleto = async (id: string) => {
    try {
      const fechaCumplimiento = new Date().toISOString().split('T')[0];
      await terminosAlertasService.marcarCumplido(id, {
        fechaCumplimiento,
      });
    toast.success('Término marcado como cumplido', {
      description: 'El término se ha actualizado correctamente'
    });
      await cargarDatos(); // Recargar datos
    } catch (error: any) {
      toast.error('Error al marcar término como cumplido', {
        description: error.message || 'No se pudo actualizar el término'
      });
    }
  };

  const handleRecalcular = async () => {
    try {
      toast.loading('Recalculando términos...', { id: 'recalcular' });
      const resultado = await terminosAlertasService.recalcularTerminos();
      toast.success('Recálculo completado', {
        id: 'recalcular',
        description: `${resultado.terminosActualizados} términos actualizados`
      });
      await cargarDatos(); // Recargar datos
    } catch (error: any) {
      toast.error('Error al recalcular términos', {
        id: 'recalcular',
        description: error.message || 'No se pudieron recalcular los términos'
      });
    }
  };

  const handleEliminarFestivo = async (festivoId: string, descripcion: string) => {
    if (!confirm(`¿Está seguro de eliminar el festivo "${descripcion}"?`)) return;
    try {
      await terminosAlertasService.eliminarFestivo(festivoId);
      await cargarDatos();
      toast.success('Festivo eliminado', { description: descripcion });
    } catch (error: any) {
      toast.error('Error al eliminar festivo', {
        description: error.message || 'No se pudo eliminar el festivo',
      });
    }
  };

  const handleToggleRegla = async (regla: ReglaAlerta) => {
    try {
      await terminosAlertasService.toggleReglaAlerta(regla.id);
      toast.success(regla.activa ? 'Regla desactivada' : 'Regla activada', {
        description: `La regla "${regla.nombre}" ha sido ${regla.activa ? 'desactivada' : 'activada'}`
      });
      await cargarDatos();
    } catch (error: any) {
      toast.error('Error al cambiar estado de la regla', {
        description: error.message || 'No se pudo actualizar el estado'
      });
    }
  };

  const handleEditarRegla = (regla: ReglaAlerta) => {
    setReglaEditando(regla);
    setReglaForm({
      nombre: regla.nombre,
      diasAnticipacion: regla.diasAnticipacion,
      activa: regla.activa,
      enviarEmail: regla.enviarEmail,
      mostrarPanel: regla.mostrarPanel,
      descripcion: regla.descripcion || ''
    });
    setShowModalRegla(true);
  };

  const handleEliminarRegla = async (regla: ReglaAlerta) => {
    if (!confirm(`¿Está seguro de eliminar la regla "${regla.nombre}"?`)) return;
    try {
      await terminosAlertasService.eliminarReglaAlerta(regla.id);
      toast.success('Regla eliminada', { description: regla.nombre });
      await cargarDatos();
    } catch (error: any) {
      toast.error('Error al eliminar regla', {
        description: error.message || 'No se pudo eliminar la regla'
      });
    }
  };

  const handleExportarExcel = () => {
    // Crear CSV
    const headers = ['Estado', 'Proceso', 'Actuación', 'Responsable', 'Email', 'Fecha Inicio', 'Días Hábiles', 'Vencimiento', 'Días Restantes'];
    const rows = terminosFiltrados.map((t: Termino) => [
      t.estado === 'vencido' ? 'Vencido' :
      t.estado === 'proximo_vencer' ? 'Próximo a Vencer' :
      t.estado === 'pendiente' ? 'Pendiente' : 'Cumplido',
      t.numeroProceso,
      t.proceso,
      t.actuacion,
      t.responsable,
      t.emailResponsable,
      t.fechaInicio,
      t.diasHabiles,
      t.fechaVencimiento,
      t.diasRestantes
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row: any) => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `terminos_procesales_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast.success('Exportado a Excel/CSV', {
      description: `${terminosFiltrados.length} términos exportados`
    });
  };

  const handleExportarPDF = () => {
    toast.info('Generando PDF...', {
      description: 'Preparando documento'
    });

    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.getWidth();

    // Portada
    doc.setFillColor(0, 61, 165); // #003DA5
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('TÉRMINOS PROCESALES', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Control Interno Disciplinario - OCID ESAP', pageWidth / 2, 32, { align: 'center' });

    // Estadísticas
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('ESTADÍSTICAS', 14, 60);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total: ${terminos.length} | Pendientes: ${stats.pendientes} | Próximos a Vencer: ${stats.proximosVencer} | Vencidos: ${stats.vencidos} | Cumplidos: ${stats.cumplidos}`, 14, 68);

    // Tabla
    autoTable(doc, {
      startY: 75,
      head: [['Estado', 'Proceso', 'Actuación', 'Responsable', 'Inicio', 'Días', 'Vencimiento', 'Restantes']],
      body: terminosFiltrados.map(t => [
        t.estado === 'vencido' ? '🔴 Vencido' :
        t.estado === 'proximo_vencer' ? '🟡 Próximo' :
        t.estado === 'pendiente' ? '🟢 Pendiente' : '✅ Cumplido',
        `${t.numeroProceso}\n${t.proceso}`,
        t.actuacion,
        t.responsable,
        t.fechaInicio,
        t.diasHabiles,
        t.fechaVencimiento,
        t.estado === 'cumplido' ? 'Completado' : 
        t.diasRestantes < 0 ? `${Math.abs(t.diasRestantes)}d vencido` : 
        `${t.diasRestantes} días`
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: [0, 61, 165],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: 2
      },
      columnStyles: {
        0: { cellWidth: 22, halign: 'center' },
        1: { cellWidth: 45 },
        2: { cellWidth: 50 },
        3: { cellWidth: 35 },
        4: { cellWidth: 22, halign: 'center' },
        5: { cellWidth: 12, halign: 'center' },
        6: { cellWidth: 22, halign: 'center' },
        7: { cellWidth: 20, halign: 'center' }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      margin: { left: 14, right: 14 }
    });

    // Pie de página
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(128, 128, 128);
      doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, 14, doc.internal.pageSize.getHeight() - 10);
      doc.text(`Pág. ${i} de ${totalPages}`, pageWidth - 14, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
    }

    const nombreArchivo = `Terminos_Procesales_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(nombreArchivo);

    toast.success('PDF Generado', {
      description: `${nombreArchivo} - ${terminosFiltrados.length} términos`
    });
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header World-Class */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
          <div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div 
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center" 
                style={{ backgroundColor: '#E0EDFF' }}
              >
                <Clock size={20} className="sm:w-6 sm:h-6" style={{ color: '#003DA5' }} />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold" style={{ color: '#003DA5' }}>
                  Términos y Alertas
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                  RF006 - Control de Términos Procesales Automático
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRecalcular}
              className="px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2 bg-gray-100 text-gray-700"
            >
              <RefreshCw className="w-4 h-4" />
              Recalcular
            </button>
            {vistaActual === 'terminos' && authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_TERMINOS_TERMINO_CREATE) && (
              <button
                onClick={() => setShowModalNuevoTermino(true)}
                className="px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                style={{ background: '#F59E0B' }}
              >
                <Plus className="w-4 h-4" />
                Nuevo Término
              </button>
            )}
            {vistaActual === 'calendario' && authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_TERMINOS_FESTIVO_CREATE) && (
              <button
                onClick={() => setShowModalFestivo(true)}
                className="px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                style={{ background: '#F59E0B' }}
              >
                <Plus className="w-4 h-4" />
                Agregar Festivo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Alert Informativo */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3">
        <Card className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Info className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-sm text-gray-700">
              <p className="font-bold text-blue-900 mb-1">
                Cálculo Automático de Términos Procesales
              </p>
              <p className="text-xs sm:text-sm">
                El sistema calcula automáticamente días hábiles excluyendo sábados, domingos y festivos configurados. 
                Las alertas se envían automáticamente según las reglas configuradas.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Pestañas Minimalistas */}
      <div className="bg-white border border-gray-200 rounded-lg mb-6">
        <div className="flex gap-1 p-2">
          <button
            onClick={() => setVistaActual('terminos')}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
              vistaActual === 'terminos'
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            Términos Activos ({terminos.length})
          </button>
          <button
            onClick={() => setVistaActual('calendario')}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
              vistaActual === 'calendario'
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Calendario Festivos ({diasFestivos.length})
          </button>
          <button
            onClick={() => setVistaActual('reglas')}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
              vistaActual === 'reglas'
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Settings className="w-4 h-4" />
            Reglas de Alerta
          </button>
          <button
            onClick={() => setVistaActual('historial')}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
              vistaActual === 'historial'
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Bell className="w-4 h-4" />
            Historial ({alertas.length})
          </button>
        </div>
      </div>

      {/* VISTA: TÉRMINOS ACTIVOS */}
      {vistaActual === 'terminos' && (
        <div className="space-y-6">
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por proceso, actuación o responsable..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
            >
              <option value="all">Todos los estados</option>
              <option value="pendiente">🟢 Pendiente</option>
              <option value="proximo_vencer">🟡 Próximo a Vencer</option>
              <option value="vencido">🔴 Vencido</option>
              <option value="cumplido">✅ Cumplido</option>
            </select>
            <button
              onClick={handleExportarExcel}
              className="px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 bg-green-600 text-white hover:bg-green-700"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
            <button
              onClick={handleExportarPDF}
              className="px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700"
            >
              <Download className="w-4 h-4" />
              PDF
            </button>
          </div>

          {/* Tabla de Términos */}
          <Card className="border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Proceso
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Actuación
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Responsable
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Fecha Inicio
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Días Hábiles
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Vencimiento
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Días Restantes
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {terminosFiltrados.map((termino) => (
                    <tr key={termino.id} className="hover:bg-gray-50 transition-colors">
                      {/* Estado Visual */}
                      <td className="px-4 py-3">
                        {termino.estado === 'vencido' && (
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <span className="text-xs font-semibold text-red-700">Vencido</span>
                          </div>
                        )}
                        {termino.estado === 'proximo_vencer' && (
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <span className="text-xs font-semibold text-yellow-700">Próximo</span>
                          </div>
                        )}
                        {termino.estado === 'pendiente' && (
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className="text-xs font-semibold text-green-700">Pendiente</span>
                          </div>
                        )}
                        {termino.estado === 'cumplido' && (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-blue-500" />
                            <span className="text-xs font-semibold text-blue-700">Cumplido</span>
                          </div>
                        )}
                      </td>

                      {/* Proceso */}
                      <td className="px-4 py-3">
                        <p className="font-semibold text-sm text-gray-900">{termino.numeroProceso}</p>
                        <p className="text-xs text-gray-600">{termino.proceso}</p>
                      </td>

                      {/* Actuación */}
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900">{termino.actuacion}</p>
                        {termino.alertaEnviada && (
                          <div className="flex items-center gap-1 mt-1">
                            <Bell className="w-3 h-3 text-orange-500" />
                            <span className="text-xs text-orange-600">Alerta enviada</span>
                          </div>
                        )}
                      </td>

                      {/* Responsable */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-900">{termino.responsable}</p>
                            <p className="text-xs text-gray-500">{termino.emailResponsable}</p>
                          </div>
                        </div>
                      </td>

                      {/* Fecha Inicio */}
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900">{termino.fechaInicio}</p>
                      </td>

                      {/* Días Hábiles */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-semibold text-gray-900">{termino.diasHabiles}</span>
                        </div>
                      </td>

                      {/* Vencimiento */}
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900">{termino.fechaVencimiento}</p>
                      </td>

                      {/* Días Restantes */}
                      <td className="px-4 py-3">
                        {termino.estado === 'cumplido' ? (
                          <span className="text-sm text-blue-600 font-semibold">Completado</span>
                        ) : termino.diasRestantes < 0 ? (
                          <span className="text-sm text-red-600 font-bold">
                            {Math.abs(termino.diasRestantes)} días vencido
                          </span>
                        ) : (
                          <span className={`text-sm font-semibold ${
                            termino.diasRestantes <= 3 ? 'text-red-600' :
                            termino.diasRestantes <= 5 ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>
                            {termino.diasRestantes} días
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {termino.estado !== 'cumplido' && authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_TERMINOS_TERMINO_FINISH) && (
                            <button
                              onClick={() => handleMarcarCompleto(termino.id)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-green-600 hover:bg-green-700 flex items-center gap-1"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Cumplido
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setTerminoSeleccionado(termino);
                              setShowModalDetalle(true);
                            }}
                            className="p-2 rounded-lg hover:bg-gray-100"
                          >
                            <Eye className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {terminosFiltrados.length === 0 && (
              <div className="p-12 text-center">
                <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  No se encontraron términos
                </h3>
                <p className="text-gray-600">
                  Intenta ajustar los filtros o crear un nuevo término
                </p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* VISTA: CALENDARIO FESTIVOS */}
      {vistaActual === 'calendario' && (
        <div className="space-y-6">
          <Card className="border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Fecha
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Descripción
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {festivosOrdenados.map((festivo) => (
                    <tr key={festivo.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-orange-500" />
                          <span className="text-sm font-semibold text-gray-900">{festivo.fecha}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900">{festivo.descripcion}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className="text-xs"
                          style={{
                            background: festivo.tipo === 'nacional' ? '#DBEAFE' : festivo.tipo === 'regional' ? '#FEF3C7' : '#E0E7FF',
                            color: festivo.tipo === 'nacional' ? '#1E40AF' : festivo.tipo === 'regional' ? '#92400E' : '#3730A3'
                          }}
                        >
                          {festivo.tipo === 'nacional' ? 'Nacional' : festivo.tipo === 'regional' ? 'Regional' : 'Institucional'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_TERMINOS_FESTIVO_EDIT) && (
                          <button
                            onClick={() => {
                              setNuevoFestivo({
                          // edit mode: prellenar
                                fecha: festivo.fecha,
                                descripcion: festivo.descripcion,
                                tipo: festivo.tipo,
                                territorio: festivo.territorio || ''
                              });
                        setFestivoEditId(festivo.id);
                              setShowModalFestivo(true);
                            }}
                            className="p-2 rounded-lg hover:bg-gray-100"
                          >
                            <Edit2 className="w-4 h-4 text-gray-600" />
                          </button>
                          )}
                          {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_TERMINOS_FESTIVO_DELETE) && (
                          <button
                            onClick={() => handleEliminarFestivo(festivo.id, festivo.descripcion)}
                            className="p-2 rounded-lg hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* VISTA: REGLAS DE ALERTA */}
      {vistaActual === 'reglas' && (
        <div className="space-y-6">
          <Card className="p-4 bg-blue-50 border-blue-200 mb-6">
            <div className="flex gap-3">
              <Zap className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-700">
                <p className="font-semibold text-blue-900 mb-1">
                  Configuración de Alertas Automáticas
                </p>
                <p>
                  Las reglas de alerta definen cuándo y cómo se notificará a los responsables sobre términos próximos a vencer.
                </p>
              </div>
            </div>
          </Card>

          <div className="grid gap-4">
            {reglasAlerta.map((regla: ReglaAlerta) => (
              <Card key={regla.id} className="p-6 border border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{regla.nombre}</h3>
                      <Badge
                        className="text-xs"
                        style={{
                          background: regla.activa ? '#D1FAE5' : '#FEE2E2',
                          color: regla.activa ? '#059669' : '#DC2626'
                        }}
                      >
                        {regla.activa ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">{regla.descripcion}</p>
                    
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700">
                          <span className="font-semibold">{regla.diasAnticipacion}</span> días antes
                        </span>
                      </div>
                      {regla.enviarEmail && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-gray-700">Envía email</span>
                        </div>
                      )}
                      {regla.mostrarPanel && (
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-orange-500" />
                          <span className="text-sm text-gray-700">Muestra en panel</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_TERMINOS_REGLA_EDIT) && (
                    <button
                      onClick={() => handleEditarRegla(regla)}
                      className="p-2 rounded-lg hover:bg-gray-100"
                      title="Editar regla"
                    >
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
                    )}
                    {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_TERMINOS_REGLA_EDIT) && (
                    <button
                      onClick={() => handleToggleRegla(regla)}
                      className={`p-2 rounded-lg ${regla.activa ? 'hover:bg-red-50' : 'hover:bg-green-50'}`}
                      title={regla.activa ? 'Desactivar regla' : 'Activar regla'}
                    >
                      {regla.activa ? (
                        <Pause className="w-4 h-4 text-red-600" />
                      ) : (
                        <Play className="w-4 h-4 text-green-600" />
                      )}
                    </button>
                    )}
                    {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_TERMINOS_REGLA_DELETE) && (
                    <button
                      onClick={() => handleEliminarRegla(regla)}
                      className="p-2 rounded-lg hover:bg-red-50"
                      title="Eliminar regla"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

      {/* VISTA: HISTORIAL DE ALERTAS */}
      {vistaActual === 'historial' && (
        <div className="space-y-6">
          <Card className="border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Fecha/Hora
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Proceso
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Destinatario
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Asunto
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {alertas.map((alerta: Alerta) => (
                    <tr key={alerta.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900">{alerta.fechaEnvio}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-gray-900">{alerta.proceso}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className="text-xs"
                          style={{
                            background: alerta.tipo === 'email' ? '#DBEAFE' : alerta.tipo === 'visual' ? '#FEF3C7' : '#E0E7FF',
                            color: alerta.tipo === 'email' ? '#1E40AF' : alerta.tipo === 'visual' ? '#92400E' : '#3730A3'
                          }}
                        >
                          {alerta.tipo === 'email' ? '📧 Email' : alerta.tipo === 'visual' ? '👁️ Visual' : '⚙️ Sistema'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900">{alerta.destinatario}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-600">{alerta.asunto}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className="text-xs"
                          style={{
                            background: alerta.estado === 'enviada' ? '#D1FAE5' : alerta.estado === 'pendiente' ? '#FEF3C7' : '#FEE2E2',
                            color: alerta.estado === 'enviada' ? '#059669' : alerta.estado === 'pendiente' ? '#92400E' : '#DC2626'
                          }}
                        >
                          {alerta.estado === 'enviada' ? '✓ Enviada' : alerta.estado === 'pendiente' ? '⏳ Pendiente' : '✗ Error'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="flex-1 overflow-auto p-3 sm:p-6">
        <div className="max-w-7xl mx-auto">
          
          {/* VISTA: TÉRMINOS ACTIVOS */}
          {vistaActual === 'terminos' && (
            <div className="space-y-4">
              {/* Filtros */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por proceso, actuación o responsable..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <select
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm font-semibold"
                >
                  <option value="all">Todos los estados</option>
                  <option value="pendiente">🟢 Pendiente</option>
                  <option value="proximo_vencer">🟡 Próximo a Vencer</option>
                  <option value="vencido">🔴 Vencido</option>
                  <option value="cumplido">✅ Cumplido</option>
                </select>
                <button
                  onClick={handleExportarExcel}
                  className="px-4 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700 text-sm"
                >
                  <Download className="w-4 h-4" />
                  Excel
                </button>
                <button
                  onClick={handleExportarPDF}
                  className="px-4 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 bg-red-600 text-white hover:bg-red-700 text-sm"
                >
                  <Download className="w-4 h-4" />
                  PDF
                </button>
              </div>

              {/* Tabla de Términos */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                          Estado
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                          Proceso
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                          Actuación
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                          Responsable
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                          Fecha Inicio
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                          Días Hábiles
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                          Vencimiento
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                          Días Restantes
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {terminosFiltrados.map((termino) => (
                        <tr key={termino.id} className="hover:bg-gray-50 transition-colors">
                          {/* Estado Visual */}
                          <td className="px-4 py-3">
                            {termino.estado === 'vencido' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                Vencido
                              </span>
                            )}
                            {termino.estado === 'proximo_vencer' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">
                                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                Próximo
                              </span>
                            )}
                            {termino.estado === 'pendiente' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                Pendiente
                              </span>
                            )}
                            {termino.estado === 'cumplido' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
                                <CheckCircle className="w-3 h-3" />
                                Cumplido
                              </span>
                            )}
                          </td>

                          {/* Proceso */}
                          <td className="px-4 py-3">
                            <p className="font-bold text-sm" style={{ color: '#003DA5' }}>{termino.numeroProceso}</p>
                            <p className="text-xs text-gray-600">{termino.proceso}</p>
                          </td>

                          {/* Actuación */}
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-900">{termino.actuacion}</p>
                            {termino.alertaEnviada && (
                              <div className="flex items-center gap-1 mt-1">
                                <Bell className="w-3 h-3 text-orange-500" />
                                <span className="text-xs text-orange-600 font-semibold">Alerta enviada</span>
                              </div>
                            )}
                          </td>

                          {/* Responsable con Avatar */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                                style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' }}
                              >
                                {termino.responsable.split(' ').map(n => n[0]).join('').substring(0, 2)}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-900">{termino.responsable}</p>
                                <p className="text-xs text-gray-500">{termino.emailResponsable}</p>
                              </div>
                            </div>
                          </td>

                          {/* Fecha Inicio */}
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-900">{termino.fechaInicio}</p>
                          </td>

                          {/* Días Hábiles */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span className="text-sm font-bold text-gray-900">{termino.diasHabiles}</span>
                            </div>
                          </td>

                          {/* Vencimiento */}
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-900">{termino.fechaVencimiento}</p>
                          </td>

                          {/* Días Restantes */}
                          <td className="px-4 py-3">
                            {termino.estado === 'cumplido' ? (
                              <span className="text-sm text-blue-600 font-bold">Completado</span>
                            ) : termino.diasRestantes < 0 ? (
                              <span className="text-sm text-red-600 font-bold">
                                {Math.abs(termino.diasRestantes)} días vencido
                              </span>
                            ) : (
                              <span className={`text-sm font-bold ${
                                termino.diasRestantes <= 3 ? 'text-red-600' :
                                termino.diasRestantes <= 5 ? 'text-yellow-600' :
                                'text-green-600'
                              }`}>
                                {termino.diasRestantes} días
                              </span>
                            )}
                          </td>

                          {/* Acciones */}
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              {termino.estado !== 'cumplido' && (
                                <button
                                  onClick={() => handleMarcarCompleto(termino.id)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-green-600 hover:bg-green-700 flex items-center gap-1"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  Cumplido
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setTerminoSeleccionado(termino);
                                  setShowModalDetalle(true);
                                }}
                                className="p-2 rounded-lg hover:bg-gray-100 border border-gray-300"
                              >
                                <Eye className="w-4 h-4 text-gray-600" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {terminosFiltrados.length === 0 && (
                  <div className="p-12 text-center">
                    <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      No se encontraron términos
                    </h3>
                    <p className="text-gray-600">
                      Intenta ajustar los filtros o crear un nuevo término
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VISTA: CALENDARIO FESTIVOS */}
          {vistaActual === 'calendario' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                          Fecha
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                          Descripción
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                          Tipo
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {diasFestivos.map((festivo) => (
                        <tr key={festivo.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" style={{ color: '#003DA5' }} />
                              <span className="text-sm font-bold text-gray-900">{festivo.fecha}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-900">{festivo.descripcion}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border"
                              style={{
                                backgroundColor: festivo.tipo === 'nacional' ? '#DBEAFE' : festivo.tipo === 'regional' ? '#FEF3C7' : '#E0E7FF',
                                color: festivo.tipo === 'nacional' ? '#1E40AF' : festivo.tipo === 'regional' ? '#92400E' : '#3730A3',
                                borderColor: festivo.tipo === 'nacional' ? '#1E40AF' : festivo.tipo === 'regional' ? '#92400E' : '#3730A3'
                              }}
                            >
                              {festivo.tipo === 'nacional' ? '🇨🇴 Nacional' : festivo.tipo === 'regional' ? '📍 Regional' : '🏢 Institucional'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setNuevoFestivo({
                                    fecha: festivo.fecha,
                                    descripcion: festivo.descripcion,
                                    tipo: festivo.tipo,
                                    territorio: festivo.territorio || ''
                                  });
                                  setShowModalFestivo(true);
                                  toast.info('Editar festivo', {
                                    description: 'Funcionalidad en desarrollo'
                                  });
                                }}
                                className="p-2 rounded-lg hover:bg-gray-100 border border-gray-300"
                              >
                                <Edit2 className="w-4 h-4 text-gray-600" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`¿Está seguro de eliminar el festivo "${festivo.descripcion}"?`)) {
                                    setDiasFestivos(diasFestivos.filter(f => f.id !== festivo.id));
                                    toast.success('Festivo eliminado', {
                                      description: `${festivo.descripcion} ha sido eliminado del calendario`
                                    });
                                  }
                                }}
                                className="p-2 rounded-lg hover:bg-red-50 border border-red-300"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VISTA: REGLAS DE ALERTA */}
          {vistaActual === 'reglas' && (
            <div className="space-y-4">
              {/* Información */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-sm text-gray-700">
                    <p className="font-bold text-blue-900 mb-1">
                      Configuración de Alertas Automáticas
                    </p>
                    <p className="text-xs sm:text-sm">
                      Las reglas de alerta definen cuándo y cómo se notificará a los responsables sobre términos próximos a vencer.
                    </p>
                  </div>
                </div>
              </div>

              {/* Lista de Reglas */}
              <div className="space-y-3">
                {REGLAS_ALERTA_MOCK.map((regla) => (
                  <div key={regla.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
                    <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-base sm:text-lg font-bold text-gray-900">{regla.nombre}</h3>
                          <span
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
                            style={{
                              backgroundColor: regla.activa ? '#D1FAE5' : '#FEE2E2',
                              color: regla.activa ? '#059669' : '#DC2626'
                            }}
                          >
                            {regla.activa ? '✓ Activa' : '✗ Inactiva'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">{regla.descripcion}</p>
                        
                        <div className="flex items-center gap-6 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-700">
                              <span className="font-bold">{regla.diasAnticipacion}</span> días antes
                            </span>
                          </div>
                          {regla.enviarEmail && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-green-500" />
                              <span className="text-sm text-gray-700 font-semibold">Envía email</span>
                            </div>
                          )}
                          {regla.mostrarPanel && (
                            <div className="flex items-center gap-2">
                              <Bell className="w-4 h-4 text-orange-500" />
                              <span className="text-sm text-gray-700 font-semibold">Muestra en panel</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toast.info('Editar regla')}
                          className="p-2 rounded-lg hover:bg-gray-100 border border-gray-300"
                        >
                          <Edit2 className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => toast.info(regla.activa ? 'Desactivar regla' : 'Activar regla')}
                          className={`p-2 rounded-lg border ${regla.activa ? 'hover:bg-red-50 border-red-300' : 'hover:bg-green-50 border-green-300'}`}
                        >
                          {regla.activa ? (
                            <Pause className="w-4 h-4 text-red-600" />
                          ) : (
                            <Play className="w-4 h-4 text-green-600" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VISTA: HISTORIAL DE ALERTAS */}
          {vistaActual === 'historial' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                          Fecha/Hora
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                          Proceso
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                          Tipo
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                          Destinatario
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                          Asunto
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {ALERTAS_MOCK.map((alerta) => (
                        <tr key={alerta.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-900">{alerta.fechaEnvio}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-bold text-gray-900">{alerta.proceso}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
                              style={{
                                backgroundColor: alerta.tipo === 'email' ? '#DBEAFE' : alerta.tipo === 'visual' ? '#FEF3C7' : '#E0E7FF',
                                color: alerta.tipo === 'email' ? '#1E40AF' : alerta.tipo === 'visual' ? '#92400E' : '#3730A3'
                              }}
                            >
                              {alerta.tipo === 'email' ? '📧 Email' : alerta.tipo === 'visual' ? '👁️ Visual' : '⚙️ Sistema'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-900">{alerta.destinatario}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-600">{alerta.asunto}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
                              style={{
                                backgroundColor: alerta.estado === 'enviada' ? '#D1FAE5' : alerta.estado === 'pendiente' ? '#FEF3C7' : '#FEE2E2',
                                color: alerta.estado === 'enviada' ? '#059669' : alerta.estado === 'pendiente' ? '#92400E' : '#DC2626'
                              }}
                            >
                              {alerta.estado === 'enviada' ? '✓ Enviada' : alerta.estado === 'pendiente' ? '⏳ Pendiente' : '✗ Error'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Botón Flotante de Ayuda */}
      <motion.button
        onClick={() => setShowFlujoModal(true)}
        className="fixed bottom-8 right-8 p-4 rounded-full shadow-2xl hover:shadow-3xl transition-all z-40 text-white"
        style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <HelpCircle className="w-6 h-6" />
      </motion.button>

      {/* Modal de Flujo */}
      <AnimatePresence>
        {showFlujoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-start justify-center pt-16 sm:pt-20 z-[200] p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowFlujoModal(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-6xl max-h-[90vh] overflow-auto rounded-2xl shadow-2xl bg-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  ¿Cómo funciona Términos y Alertas en el proceso disciplinario?
                </h2>
                <button
                  onClick={() => setShowFlujoModal(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <div className="p-6">
                <FlujoTerminosAlertas />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Nuevo Término */}
      <AnimatePresence>
        {showModalNuevoTermino && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-start justify-center pt-16 sm:pt-20 z-[200] p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowModalNuevoTermino(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 text-white rounded-t-2xl" style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="w-6 h-6" />
                    <h2 className="text-xl font-bold">Nuevo Término Procesal</h2>
                  </div>
                  <button
                    onClick={() => setShowModalNuevoTermino(false)}
                    className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Número de Proceso*
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar proceso (ej: P-120-2025)..."
                      value={nuevoTermino.numeroProceso}
                      onChange={(e) => {
                        setNuevoTermino({...nuevoTermino, numeroProceso: e.target.value});
                        setShowProcesoDropdown(true);
                      }}
                      onFocus={() => setShowProcesoDropdown(true)}
                      onBlur={() => setTimeout(() => setShowProcesoDropdown(false), 200)}
                      onKeyDown={(e) => {
                        const radicadosFiltrados = radicadosDisponibles.filter(radicado => 
                          radicado.toLowerCase().includes(nuevoTermino.numeroProceso.toLowerCase())
                        );
                        if (e.key === 'Enter' && radicadosFiltrados.length === 1) {
                          setNuevoTermino({...nuevoTermino, numeroProceso: radicadosFiltrados[0]});
                          setShowProcesoDropdown(false);
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Denunciado *
                    </label>
                    <input
                      type="text"
                      placeholder="Nombre completo"
                      value={nuevoTermino.proceso}
                      onChange={(e) => setNuevoTermino({...nuevoTermino, proceso: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {showProcesoDropdown && radicadosDisponibles.filter(radicado => 
                      radicado.toLowerCase().includes(nuevoTermino.numeroProceso.toLowerCase())
                    ).length > 0 && (
                      <div className="absolute left-0 right-0 top-full z-10 bg-white border border-gray-300 rounded-b-lg shadow-lg max-h-40 overflow-y-auto">
                        {radicadosDisponibles
                          .filter(radicado => 
                            radicado.toLowerCase().includes(nuevoTermino.numeroProceso.toLowerCase())
                          )
                          .map(radicado => (
                            <div
                              key={radicado}
                              className="px-4 py-2 cursor-pointer hover:bg-gray-100 font-medium"
                              onClick={async () => {
                                setNuevoTermino({...nuevoTermino, numeroProceso: radicado});
                                setShowProcesoDropdown(false);
                                
                                // Buscar el proceso para obtener el nombre del denunciado
                                try {
                                  const proceso = await terminosAlertasService.buscarProcesoPorRadicado(radicado);
                                  if (proceso?.news?.disciplinable) {
                                    let denunciadoNombre = 'Sin nombre';
                                    if (Array.isArray(proceso.news.disciplinable) && proceso.news.disciplinable.length > 0) {
                                      denunciadoNombre = proceso.news.disciplinable[0]?.nombre || 'Sin nombre';
                                    } else if (typeof proceso.news.disciplinable === 'object' && proceso.news.disciplinable.nombre) {
                                      denunciadoNombre = proceso.news.disciplinable.nombre;
                                    } else if (typeof proceso.news.disciplinable === 'string') {
                                      denunciadoNombre = proceso.news.disciplinable;
                                    }
                                    setNuevoTermino(prev => ({...prev, proceso: denunciadoNombre}));
                                  }
                                } catch (error) {
                                  console.error('Error al obtener información del proceso:', error);
                                }
                              }}
                            >
                              {radicado}
                            </div>
                          ))}
                      </div>
                    )}
                    {showProcesoDropdown && radicadosDisponibles.filter(radicado => 
                      radicado.toLowerCase().includes(nuevoTermino.numeroProceso.toLowerCase())
                    ).length === 0 && nuevoTermino.numeroProceso && (
                      <div className="absolute left-0 right-0 top-full z-10 bg-white border border-gray-300 rounded-b-lg shadow-lg">
                        <div className="px-4 py-2 text-gray-500">No se encontraron procesos</div>
                      </div>
                    )}
                  </div>
                </div>

                {nuevoTermino.proceso && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-600" />
                      <div>
                        <p className="text-xs text-blue-600 font-semibold">Denunciado</p>
                        <p className="text-sm text-gray-900 font-medium">{nuevoTermino.proceso}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Actuación Procesal *
                  </label>
                  <select
                    value={nuevoTermino.actuacion}
                    onChange={(e) => setNuevoTermino({...nuevoTermino, actuacion: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccione una actuación</option>
                    <option value="Notificación Auto de Apertura">Notificación Auto de Apertura</option>
                    <option value="Presentación de Descargos">Presentación de Descargos</option>
                    <option value="Valoración Noticia Disciplinaria">Valoración Noticia Disciplinaria</option>
                    <option value="Práctica de Pruebas">Práctica de Pruebas</option>
                    <option value="Indagación Preliminar">Indagación Preliminar</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Responsable *
                  </label>
                  <select
                    value={nuevoTermino.responsableId}
                    onChange={(e) => {
                      const profesionalSeleccionado = profesionales.find(p => p.id === e.target.value);
                      setNuevoTermino({
                        ...nuevoTermino,
                        responsableId: e.target.value,
                        responsable: profesionalSeleccionado?.nombreCompleto || '',
                        emailResponsable: profesionalSeleccionado?.email || ''
                      });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    disabled={cargandoProfesionales}
                  >
                    <option value="">Seleccione un responsable</option>
                    {profesionales.map((prof) => (
                      <option key={prof.id} value={prof.id}>
                        {prof.nombreCompleto} - {prof.email} {prof.cargo ? `(${prof.cargo})` : ''}
                      </option>
                    ))}
                  </select>
                  {nuevoTermino.responsableId && (
                    <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-600" />
                        <div>
                          <p className="text-xs text-blue-600 font-semibold">Responsable seleccionado</p>
                          <p className="text-sm text-gray-900 font-medium">{nuevoTermino.responsable}</p>
                          <p className="text-xs text-gray-600">{nuevoTermino.emailResponsable}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Fecha de Inicio *
                    </label>
                    <input
                      type="date"
                      value={nuevoTermino.fechaInicio}
                      onChange={(e) => setNuevoTermino({...nuevoTermino, fechaInicio: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Días Hábiles *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={nuevoTermino.diasHabiles}
                      onChange={(e) => setNuevoTermino({...nuevoTermino, diasHabiles: parseInt(e.target.value) || 1})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <button
                    onClick={() => setShowModalNuevoTermino(false)}
                    className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      if (!nuevoTermino.numeroProceso || !nuevoTermino.actuacion || !nuevoTermino.fechaInicio) {
                        toast.error('Complete número de proceso, actuación y fecha de inicio');
                        return;
                      }
                      
                      try {
                        // Buscar proceso por radicado (numeroProceso)
                        const proceso = await terminosAlertasService.buscarProcesoPorRadicado(nuevoTermino.numeroProceso);

                        // Debug: Log del proceso recibido
                        console.log('Proceso encontrado:', proceso);

                        // Validar que el proceso existe y tiene un ID válido
                        if (!proceso) {
                          toast.error('No se encontró el proceso con el radicado especificado');
                          return;
                        }

                        if (!proceso.id) {
                          console.error('Proceso sin ID:', proceso);
                          toast.error('El proceso encontrado no tiene un ID válido. Verifique el radicado del proceso.');
                          return;
                        }

                        // Validar formato UUID (mismo formato que ExpedienteElectronico)
                        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                        const procesoId = String(proceso.id).trim();
                        
                        if (!uuidRegex.test(procesoId)) {
                          console.error('ID del proceso inválido:', {
                            id: procesoId,
                            tipo: typeof procesoId,
                            procesoCompleto: proceso
                          });
                          toast.error(`El ID del proceso no es un UUID válido. Radicado: ${nuevoTermino.numeroProceso}, ID recibido: ${procesoId}`);
                          return;
                        }

                        // Validar que se haya seleccionado un responsable
                        if (!nuevoTermino.responsableId) {
                          toast.error('Debe seleccionar un responsable');
                          return;
                        }

                        // Preparar el objeto a enviar - asegurar que procesoId sea string limpio
                        const terminoData = {
                          procesoId: String(procesoId).trim(),
                          actuacion: String(nuevoTermino.actuacion).trim(),
                          responsableId: String(nuevoTermino.responsableId).trim(),
                          fechaInicio: String(nuevoTermino.fechaInicio).trim(),
                          diasHabiles: Number(nuevoTermino.diasHabiles),
                        };

                        // Verificación final del UUID antes de enviar
                        const finalUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                        if (!finalUuidRegex.test(terminoData.procesoId)) {
                          console.error('❌ ERROR: procesoId no pasa validación final:', terminoData.procesoId);
                          toast.error('Error: El ID del proceso no es un UUID válido');
                          return;
                        }

                        console.log('🔵 Creando término con datos:', JSON.stringify(terminoData, null, 2));
                        console.log('🔵 Tipo de procesoId:', typeof terminoData.procesoId);
                        console.log('🔵 Longitud de procesoId:', terminoData.procesoId.length);
                        console.log('🔵 procesoId validado:', terminoData.procesoId);

                        await terminosAlertasService.crearTermino(terminoData);

                      setShowModalNuevoTermino(false);
                      setNuevoTermino({
                        proceso: '',
                        numeroProceso: '',
                        actuacion: '',
                        responsableId: '',
                        responsable: '',
                        emailResponsable: '',
                        fechaInicio: '',
                          diasHabiles: 10,
                        });
                        await cargarDatos();
                        toast.success('Término creado exitosamente');
                      } catch (error: any) {
                        console.error('❌ Error completo al crear término:', error);
                        const errorMessage = error?.response?.data?.message || error.message || 'No se pudo crear el término';
                        
                        // Mensaje más específico si es error de UUID
                        if (errorMessage.includes('UUID') || errorMessage.includes('procesoId')) {
                          toast.error('Error de validación de UUID', {
                            description: 'El ID del proceso no es válido. Si el backend fue actualizado, por favor reinícialo para aplicar los cambios.',
                          });
                        } else {
                          toast.error('Error al crear término', {
                            description: errorMessage,
                          });
                        }
                      }
                    }}
                    className="px-6 py-2.5 rounded-lg text-white font-bold hover:shadow-lg transition-all"
                    style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' }}
                  >
                    Crear Término
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Detalle de Término */}
      <AnimatePresence>
        {showModalDetalle && terminoSeleccionado && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowModalDetalle(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-10 bg-gradient-to-r from-orange-500 to-amber-500 text-white p-6 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-6 h-6" />
                    <div>
                      <h2 className="text-xl font-bold">Detalle del Término Procesal</h2>
                      <p className="text-orange-100 text-sm">{terminoSeleccionado.numeroProceso}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowModalDetalle(false)}
                    className="p-2 rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className={`p-4 rounded-lg border-2 ${
                  terminoSeleccionado.estado === 'vencido' ? 'bg-red-50 border-red-300' :
                  terminoSeleccionado.estado === 'proximo_vencer' ? 'bg-yellow-50 border-yellow-300' :
                  terminoSeleccionado.estado === 'pendiente' ? 'bg-green-50 border-green-300' :
                  'bg-blue-50 border-blue-300'
                }`}>
                  <div className="flex items-center gap-3">
                    {terminoSeleccionado.estado === 'vencido' && (
                      <>
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                        <div>
                          <p className="font-bold text-red-900">TÉRMINO VENCIDO</p>
                          <p className="text-sm text-red-700">
                            Vencido hace {Math.abs(terminoSeleccionado.diasRestantes)} días
                          </p>
                        </div>
                      </>
                    )}
                    {terminoSeleccionado.estado === 'proximo_vencer' && (
                      <>
                        <AlertCircle className="w-6 h-6 text-yellow-600" />
                        <div>
                          <p className="font-bold text-yellow-900">PRÓXIMO A VENCER</p>
                          <p className="text-sm text-yellow-700">
                            Quedan {terminoSeleccionado.diasRestantes} días hábiles
                          </p>
                        </div>
                      </>
                    )}
                    {terminoSeleccionado.estado === 'pendiente' && (
                      <>
                        <Clock className="w-6 h-6 text-green-600" />
                        <div>
                          <p className="font-bold text-green-900">TÉRMINO ACTIVO</p>
                          <p className="text-sm text-green-700">
                            {terminoSeleccionado.diasRestantes} días hábiles restantes
                          </p>
                        </div>
                      </>
                    )}
                    {terminoSeleccionado.estado === 'cumplido' && (
                      <>
                        <CheckCircle className="w-6 h-6 text-blue-600" />
                        <div>
                          <p className="font-bold text-blue-900">TÉRMINO CUMPLIDO</p>
                          <p className="text-sm text-blue-700">Completado exitosamente</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-orange-500" />
                    Información del Proceso
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Número de Proceso</p>
                      <p className="font-semibold text-gray-900">{terminoSeleccionado.numeroProceso}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Denunciado</p>
                      <p className="font-semibold text-gray-900">{terminoSeleccionado.proceso}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-600 mb-1">Actuación Procesal</p>
                      <p className="font-semibold text-gray-900">{terminoSeleccionado.actuacion}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <User className="w-5 h-5 text-orange-500" />
                    Responsable
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Nombre</p>
                      <p className="font-semibold text-gray-900">{terminoSeleccionado.responsable}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Correo Electrónico</p>
                      <p className="font-semibold text-gray-900">{terminoSeleccionado.emailResponsable}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-orange-500" />
                    Fechas y Plazos
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Fecha de Inicio</p>
                      <p className="font-semibold text-gray-900">{terminoSeleccionado.fechaInicio}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Días Hábiles</p>
                      <p className="font-semibold text-gray-900">{terminoSeleccionado.diasHabiles} días</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Fecha de Vencimiento</p>
                      <p className="font-semibold text-gray-900">{terminoSeleccionado.fechaVencimiento}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-orange-500" />
                    Estado de Alertas
                  </h3>
                  {terminoSeleccionado.alertaEnviada ? (
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-semibold">Alerta enviada al responsable</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Info className="w-5 h-5" />
                      <span>No se han enviado alertas aún</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowModalDetalle(false)}
                    className="flex-1 px-6 py-3 rounded-lg font-semibold border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cerrar
                  </button>
                  {terminoSeleccionado.estado !== 'cumplido' && authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_TERMINOS_TERMINO_FINISH) && (
                    <button
                      onClick={() => {
                        handleMarcarCompleto(terminoSeleccionado.id);
                        setShowModalDetalle(false);
                      }}
                      className="flex-1 px-6 py-3 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Marcar como Cumplido
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Editar Regla de Alerta */}
      <AnimatePresence>
        {showModalRegla && reglaEditando && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowModalRegla(false);
                setReglaEditando(null);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Editar Regla de Alerta</h2>
                  <button
                    onClick={() => {
                      setShowModalRegla(false);
                      setReglaEditando(null);
                    }}
                    className="p-2 rounded-lg hover:bg-gray-100"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nombre de la Regla
                  </label>
                  <input
                    type="text"
                    value={reglaForm.nombre}
                    onChange={(e) => setReglaForm({ ...reglaForm, nombre: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Ej: Alerta Crítica - 2 días antes"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Días de Anticipación
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={reglaForm.diasAnticipacion}
                    onChange={(e) => setReglaForm({ ...reglaForm, diasAnticipacion: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Número de días hábiles antes del vencimiento para enviar la alerta (1-30)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={reglaForm.descripcion}
                    onChange={(e) => setReglaForm({ ...reglaForm, descripcion: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    rows={3}
                    placeholder="Descripción de la regla de alerta"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <label className="text-sm font-semibold text-gray-700">Estado</label>
                      <p className="text-xs text-gray-500">Activar o desactivar esta regla</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={reglaForm.activa}
                        onChange={(e) => setReglaForm({ ...reglaForm, activa: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <label className="text-sm font-semibold text-gray-700">Enviar Email</label>
                      <p className="text-xs text-gray-500">Enviar notificación por correo electrónico</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={reglaForm.enviarEmail}
                        onChange={(e) => setReglaForm({ ...reglaForm, enviarEmail: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <label className="text-sm font-semibold text-gray-700">Mostrar en Panel</label>
                      <p className="text-xs text-gray-500">Mostrar alerta en el panel de notificaciones</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={reglaForm.mostrarPanel}
                        onChange={(e) => setReglaForm({ ...reglaForm, mostrarPanel: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex gap-3">
                <button
                  onClick={() => {
                    setShowModalRegla(false);
                    setReglaEditando(null);
                  }}
                  className="flex-1 px-6 py-3 rounded-lg font-semibold border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (!reglaForm.nombre || !reglaForm.descripcion) {
                      toast.error('Complete todos los campos obligatorios');
                      return;
                    }
                    
                    try {
                      await terminosAlertasService.actualizarReglaAlerta(reglaEditando.id, reglaForm);
                      toast.success('Regla actualizada exitosamente');
                      setShowModalRegla(false);
                      setReglaEditando(null);
                      await cargarDatos();
                    } catch (error: any) {
                      toast.error('Error al actualizar regla', {
                        description: error.message || 'No se pudo actualizar la regla'
                      });
                    }
                  }}
                  className="flex-1 px-6 py-3 rounded-lg font-semibold bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                >
                  Guardar Cambios
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Agregar Festivo */}
      <AnimatePresence>
        {showModalFestivo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-start justify-center pt-16 sm:pt-20 z-[200] p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowModalFestivo(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-white rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 text-white rounded-t-2xl" style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-6 h-6" />
                    <h2 className="text-xl font-bold">Agregar Día Festivo</h2>
                  </div>
                  <button
                    onClick={() => setShowModalFestivo(false)}
                    className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    value={nuevoFestivo.fecha}
                    onChange={(e) => setNuevoFestivo({...nuevoFestivo, fecha: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Descripción *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Día de la Independencia"
                    value={nuevoFestivo.descripcion}
                    onChange={(e) => setNuevoFestivo({...nuevoFestivo, descripcion: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Tipo *
                  </label>
                  <select
                    value={nuevoFestivo.tipo}
                    onChange={(e) => setNuevoFestivo({...nuevoFestivo, tipo: e.target.value as any})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="nacional">🇨🇴 Nacional</option>
                    <option value="regional">📍 Regional</option>
                    <option value="institucional">🏢 Institucional</option>
                  </select>
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <button
                    onClick={() => setShowModalFestivo(false)}
                    className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      if (!nuevoFestivo.fecha || !nuevoFestivo.descripcion) {
                        toast.error('Complete todos los campos obligatorios');
                        return;
                      }
                      
                      try {
                        if (festivoEditId) {
                          // Actualizar
                          await terminosAlertasService.actualizarFestivo(festivoEditId, {
                        fecha: nuevoFestivo.fecha,
                        descripcion: nuevoFestivo.descripcion,
                        tipo: nuevoFestivo.tipo,
                            territorio: nuevoFestivo.territorio || undefined,
                          });
                          toast.success('Festivo actualizado');
                        } else {
                          // Crear
                          await terminosAlertasService.crearFestivo({
                            fecha: nuevoFestivo.fecha,
                            descripcion: nuevoFestivo.descripcion,
                            tipo: nuevoFestivo.tipo,
                            territorio: nuevoFestivo.territorio || undefined,
                          });
                          toast.success('Festivo agregado exitosamente');
                        }
                        
                      setShowModalFestivo(false);
                        setFestivoEditId(null);
                      setNuevoFestivo({
                        fecha: '',
                        descripcion: '',
                        tipo: 'nacional',
                        territorio: ''
                      });
                      
                        await cargarDatos(); // Recargar datos
                      } catch (error: any) {
                        toast.error(festivoEditId ? 'Error al actualizar festivo' : 'Error al agregar festivo', {
                          description: error.message || 'No se pudo procesar el festivo'
                        });
                      }
                    }}
                    className="px-6 py-2.5 rounded-lg text-white font-bold hover:shadow-lg transition-all"
                    style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' }}
                  >
                    <Save className="w-5 h-5" />
                    {festivoEditId ? 'Guardar Cambios' : 'Agregar Festivo'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Detalle */}
      <AnimatePresence>
        {showModalDetalle && terminoSeleccionado && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-start justify-center pt-16 sm:pt-20 z-[200] p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowModalDetalle(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 text-white rounded-t-2xl" style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-6 h-6" />
                    <h2 className="text-xl font-bold">Detalle del Término</h2>
                  </div>
                  <button
                    onClick={() => setShowModalDetalle(false)}
                    className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-gray-600 mb-1">PROCESO</p>
                    <p className="text-sm font-bold" style={{ color: '#003DA5' }}>{terminoSeleccionado.numeroProceso}</p>
                    <p className="text-sm text-gray-700">{terminoSeleccionado.proceso}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-600 mb-1">ESTADO</p>
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                      style={{
                        backgroundColor: 
                          terminoSeleccionado.estado === 'vencido' ? '#FEE2E2' :
                          terminoSeleccionado.estado === 'proximo_vencer' ? '#FEF3C7' :
                          terminoSeleccionado.estado === 'pendiente' ? '#D1FAE5' : '#DBEAFE',
                        color:
                          terminoSeleccionado.estado === 'vencido' ? '#DC2626' :
                          terminoSeleccionado.estado === 'proximo_vencer' ? '#F59E0B' :
                          terminoSeleccionado.estado === 'pendiente' ? '#059669' : '#2563EB'
                      }}
                    >
                      {terminoSeleccionado.estado === 'vencido' && '🔴 Vencido'}
                      {terminoSeleccionado.estado === 'proximo_vencer' && '🟡 Próximo a Vencer'}
                      {terminoSeleccionado.estado === 'pendiente' && '🟢 Pendiente'}
                      {terminoSeleccionado.estado === 'cumplido' && '✅ Cumplido'}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-600 mb-1">ACTUACIÓN PROCESAL</p>
                  <p className="text-sm text-gray-900">{terminoSeleccionado.actuacion}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-gray-600 mb-1">RESPONSABLE</p>
                    <p className="text-sm text-gray-900">{terminoSeleccionado.responsable}</p>
                    <p className="text-xs text-gray-600">{terminoSeleccionado.emailResponsable}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-600 mb-1">DÍAS HÁBILES</p>
                    <p className="text-lg font-bold" style={{ color: '#003DA5' }}>{terminoSeleccionado.diasHabiles} días</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-gray-600 mb-1">FECHA INICIO</p>
                    <p className="text-sm text-gray-900">{terminoSeleccionado.fechaInicio}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-600 mb-1">FECHA VENCIMIENTO</p>
                    <p className="text-sm text-gray-900">{terminoSeleccionado.fechaVencimiento}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-600 mb-1">DÍAS RESTANTES</p>
                  {terminoSeleccionado.estado === 'cumplido' ? (
                    <p className="text-sm text-blue-600 font-bold">✓ Completado</p>
                  ) : terminoSeleccionado.diasRestantes < 0 ? (
                    <p className="text-sm text-red-600 font-bold">
                      🔴 {Math.abs(terminoSeleccionado.diasRestantes)} días vencido
                    </p>
                  ) : (
                    <p className={`text-sm font-bold ${
                      terminoSeleccionado.diasRestantes <= 3 ? 'text-red-600' :
                      terminoSeleccionado.diasRestantes <= 5 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {terminoSeleccionado.diasRestantes} días
                    </p>
                  )}
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t">
                  <button
                    onClick={() => setShowModalDetalle(false)}
                    className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all font-bold"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
