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
import { toast } from 'sonner';
import { FlujoTerminosAlertas } from './FlujoTerminosAlertas';
import disciplinaryService, { DisciplinaryProcess } from '../../../services/api/disciplinary.service';
import { authService } from '../services/api/authService';
import { Permissions } from '@esap-mfe/shared-types/permissions';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

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
  responsableId?: string;
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
    numeroProceso: 'ESAP-DN-OCID-AP-001-2026',
    actuacion: 'Notificación Auto de Apertura',
    responsable: 'Secretaría OCID',
    emailResponsable: 'secretaria@esap.edu.co',
    fechaInicio: '2026-02-05',
    diasHabiles: 5,
    fechaVencimiento: '2026-02-12',
    diasRestantes: 3,
    estado: 'proximo_vencer',
    alertaEnviada: true
  },
  {
    id: 't2',
    proceso: 'María González Castro',
    numeroProceso: 'ESAP-DN-OCID-IN-002-2026',
    actuacion: 'Presentación de Descargos',
    responsable: 'Investigado',
    emailResponsable: 'maria.gonzalez@ejemplo.com',
    fechaInicio: '2026-01-20',
    diasHabiles: 10,
    fechaVencimiento: '2026-02-03',
    diasRestantes: -1,
    estado: 'vencido',
    alertaEnviada: true
  },
  {
    id: 't3',
    proceso: 'Carlos Andrés Rodríguez',
    numeroProceso: 'ESAP-DN-OCID-IP-003-2026',
    actuacion: 'Valoración Noticia Disciplinaria',
    responsable: 'Marta Torres',
    emailResponsable: 'marta.torres@esap.edu.co',
    fechaInicio: '2026-02-06',
    diasHabiles: 30,
    fechaVencimiento: '2026-03-20',
    diasRestantes: 25,
    estado: 'pendiente',
    alertaEnviada: false
  },
  {
    id: 't4',
    proceso: 'Ana María López Hernández',
    numeroProceso: 'ESAP-DN-OCID-AP-004-2026',
    actuacion: 'Práctica de Pruebas',
    responsable: 'Juan Carlos Ruiz',
    emailResponsable: 'juan.ruiz@esap.edu.co',
    fechaInicio: '2026-01-15',
    diasHabiles: 15,
    fechaVencimiento: '2026-02-05',
    diasRestantes: 0,
    estado: 'cumplido',
    alertaEnviada: false
  },
  {
    id: 't5',
    proceso: 'Jorge Luis Martínez Sánchez',
    numeroProceso: 'ESAP-DN-OCID-IP-005-2026',
    actuacion: 'Indagación Preliminar',
    responsable: 'Laura Díaz',
    emailResponsable: 'laura.diaz@esap.edu.co',
    fechaInicio: '2026-02-08',
    diasHabiles: 6,
    fechaVencimiento: '2026-02-17',
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
  const currentUser = authService.getCurrentUser();
  const esProfesional =
    authService.hasRole('PROFESIONAL') ||
    authService.hasRole('PROFESIONAL_SUSTANCIADOR') ||
    authService.hasRole('PROFESIONAL_ASIGNADO');

  const [terminos, setTerminos] = useState<Termino[]>([]);
  const [cargandoTerminos, setCargandoTerminos] = useState(false);
  const [diasFestivos, setDiasFestivos] = useState<DiaFestivo[]>(DIAS_FESTIVOS_MOCK);
  // const [vistaActual, setVistaActual] = useState<'terminos' | 'calendario' | 'reglas' | 'historial'>('terminos');
  const [vistaActual, setVistaActual] = useState<'terminos' | 'calendario' | 'historial'>('terminos');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [showModalNuevoTermino, setShowModalNuevoTermino] = useState(false);
  const [showModalFestivo, setShowModalFestivo] = useState(false);
  const [showFlujoModal, setShowFlujoModal] = useState(false);
  const [terminoSeleccionado, setTerminoSeleccionado] = useState<Termino | null>(null);
  const [showModalDetalle, setShowModalDetalle] = useState(false);
  const [procesos, setProcesos] = useState<DisciplinaryProcess[]>([]);
  const [procesoSeleccionado, setProcesoSeleccionado] = useState<DisciplinaryProcess | null>(null);
  const [cargandoProcesos, setCargandoProcesos] = useState(false);
  const [procesoTerminoId, setProcesoTerminoId] = useState<string>('');
  const [profesionales, setProfesionales] = useState<any[]>([]);
  const [responsableId, setResponsableId] = useState<string>('');
  
  // Formulario para nuevo término
  const [nuevoTermino, setNuevoTermino] = useState({
    proceso: '',
    numeroProceso: '',
    actuacion: '',
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

  // Cargar términos desde el backend al montar
  useEffect(() => {
    const cargarTerminos = async () => {
      setCargandoTerminos(true);
      try {
        const resp = await disciplinaryService.getTerminos({ limit: 200 });
        setTerminos(resp.terminos || []);
      } catch (error) {
        console.error('Error al cargar términos:', error);
      } finally {
        setCargandoTerminos(false);
      }
    };
    cargarTerminos();
  }, []);

  // Cargar procesos y profesionales al abrir el modal de nuevo término
  useEffect(() => {
    if (showModalNuevoTermino) {
      const cargarDatos = async () => {
        setCargandoProcesos(true);
        try {
          const [procesosData, profesionalesData] = await Promise.all([
            disciplinaryService.getAllProcesos(),
            disciplinaryService.getProfesionales(),
          ]);
          setProcesos(procesosData);
          setProfesionales(profesionalesData);
        } catch (error) {
          console.error('Error al cargar datos:', error);
          toast.error('Error al cargar los datos');
        } finally {
          setCargandoProcesos(false);
        }
      };
      cargarDatos();
    }
  }, [showModalNuevoTermino]);

  // Función para manejar la selección de un proceso
  const handleProcesoChange = (procesoId: string) => {
    setProcesoTerminoId(procesoId);
    const proceso = procesos.find(p => p.id === procesoId);
    if (proceso) {
      setProcesoSeleccionado(proceso);
      // Cargar automáticamente los datos del proceso
      // Usamos abogadoAsignadoNombre que es la propiedad disponible en el tipo
      setNuevoTermino({
        ...nuevoTermino,
        numeroProceso: proceso.radicadoProceso || '',
        proceso: (Array.isArray(proceso.news?.disciplinable) ? proceso.news?.disciplinable?.[0]?.nombre : proceso.news?.disciplinable?.nombre) || '',
        responsable: proceso.abogadoAsignadoNombre || '',
        emailResponsable: '', // El email no está disponible en el tipo base
      });
    } else {
      setProcesoSeleccionado(null);
    }
  };

  // Función para limpiar el formulario
  const limpiarFormulario = () => {
    setNuevoTermino({
      proceso: '',
      numeroProceso: '',
      actuacion: '',
      responsable: '',
      emailResponsable: '',
      fechaInicio: '',
      diasHabiles: 10
    });
    setProcesoSeleccionado(null);
    setProcesoTerminoId('');
    setResponsableId('');
  };

  // Función para crear término
  const handleCrearTermino = async () => {
    if (!procesoTerminoId) {
      toast.error('Debe seleccionar un proceso');
      return;
    }
    if (!responsableId) {
      toast.error('Debe seleccionar un responsable');
      return;
    }
    if (!nuevoTermino.actuacion || !nuevoTermino.fechaInicio || !nuevoTermino.diasHabiles) {
      toast.error('Debe completar todos los campos requeridos');
      return;
    }

    try {
      const terminoCreado = await disciplinaryService.createTermino({
        procesoId: procesoTerminoId,
        actuacion: nuevoTermino.actuacion,
        responsableId,
        fechaInicio: nuevoTermino.fechaInicio,
        diasHabiles: nuevoTermino.diasHabiles,
      });
      setTerminos(prev => [terminoCreado, ...prev]);
      toast.success('Término creado exitosamente');
      setShowModalNuevoTermino(false);
      limpiarFormulario();
    } catch (error: any) {
      console.error('Error al crear término:', error);
      toast.error('Error al crear el término', { description: error?.message || 'Intente de nuevo' });
    }
  };
  const terminosFiltrados = terminos.filter(t => {
    // PROFESIONAL solo ve sus propios términos
    if (esProfesional && t.responsableId !== currentUser?.id) return false;

    const matchesSearch =
      t.proceso.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.numeroProceso.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.actuacion.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.responsable.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesEstado = filterEstado === 'all' || t.estado === filterEstado;

    return matchesSearch && matchesEstado;
  });

  // Estadísticas
  const stats = {
    pendientes: terminos.filter(t => t.estado === 'pendiente').length,
    proximosVencer: terminos.filter(t => t.estado === 'proximo_vencer').length,
    vencidos: terminos.filter(t => t.estado === 'vencido').length,
    cumplidos: terminos.filter(t => t.estado === 'cumplido').length
  };

  const handleMarcarCompleto = async (id: string) => {
    try {
      const terminoActualizado = await disciplinaryService.marcarTerminoCumplido(id, {
        fechaCumplimiento: new Date().toISOString().split('T')[0],
      });
      setTerminos(prev => prev.map(t => t.id === id ? { ...t, ...terminoActualizado, estado: 'cumplido' as const } : t));
      toast.success('Término marcado como cumplido', { description: 'El término se ha actualizado correctamente' });
    } catch (error) {
      console.error('Error al marcar cumplido:', error);
      toast.error('Error al actualizar el término');
    }
  };

  const handleRecalcular = () => {
    // Función para calcular días calendario entre dos fechas (sin excluir fines de semana ni festivos)
    const calcularDiasCalendario = (fechaInicio: string, diasCalendario: number): { fechaVencimiento: string, diasRestantes: number } => {
      const inicio = new Date(fechaInicio);
      const hoy = new Date();
      const fechaActual = new Date(inicio);

      // Calcular fecha de vencimiento sumando días calendario directamente
      fechaActual.setDate(fechaActual.getDate() + diasCalendario);

      // Calcular días restantes desde hoy
      const diffMs = fechaActual.getTime() - hoy.getTime();
      const diasRestantesCalc = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      return {
        fechaVencimiento: fechaActual.toISOString().split('T')[0],
        diasRestantes: diasRestantesCalc
      };
    };
    
    // Recalcular todos los términos
    const terminosActualizados = terminos.map(termino => {
      if (termino.estado === 'cumplido') {
        return termino; // No recalcular términos cumplidos
      }
      
      const { fechaVencimiento, diasRestantes } = calcularDiasCalendario(termino.fechaInicio, termino.diasHabiles);
      
      // Determinar nuevo estado
      let nuevoEstado: 'pendiente' | 'proximo_vencer' | 'vencido' | 'cumplido' = 'pendiente';
      if (diasRestantes < 0) {
        nuevoEstado = 'vencido';
      } else if (diasRestantes <= 3) {
        nuevoEstado = 'proximo_vencer';
      }
      
      return {
        ...termino,
        fechaVencimiento,
        diasRestantes,
        estado: nuevoEstado
      };
    });
    
    setTerminos(terminosActualizados);
    
    toast.success('Términos recalculados exitosamente', {
      description: `${terminosActualizados.length} términos actualizados en días calendario`
    });
  };

  const handleExportarExcel = () => {
    // Crear libro de Excel (estructura idéntica al Índice Electrónico del Expediente)
    const wb = XLSX.utils.book_new();

    const datosHoja: any[][] = [
      // ENCABEZADO CORPORATIVO (mismo estilo que exportarIndiceExpedienteExcel)
      ['ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP'],
      ['CONTROL INTERNO DISCIPLINARIO'],
      ['TÉRMINOS PROCESALES'],
      [],
      // INFORMACIÓN DE LA EXPORTACIÓN
      ['INFORMACIÓN DE LA EXPORTACIÓN'],
      ['Total de Términos:', terminosFiltrados.length.toString()],
      ['Fecha de Generación:', new Date().toLocaleDateString('es-CO') + ' ' + new Date().toLocaleTimeString('es-CO')],
      [],
      // ENCABEZADOS DE LA TABLA (coinciden exactamente con la estructura visual de la tabla)
      [
        'Estado',
        'Código Proceso',
        'Proceso/Investigado',
        'Actuación',
        'Responsable',
        'Email Responsable',
        'Fecha Inicio',
        'Días Hábiles',
        'Vencimiento',
        'Días Restantes'
      ]
    ];

    // Agregar filas de datos
    terminosFiltrados.forEach((t) => {
      const estadoTexto =
        t.estado === 'vencido' ? 'Vencido' :
        t.estado === 'proximo_vencer' ? 'Próximo a Vencer' :
        t.estado === 'pendiente' ? 'Pendiente' : 'Cumplido';

      datosHoja.push([
        estadoTexto,
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
    });

    // Crear hoja de cálculo
    const ws = XLSX.utils.aoa_to_sheet(datosHoja);

    // Ajustar ancho de columnas (consistente con Índice Electrónico)
    ws['!cols'] = [
      { wch: 18 },  // Estado
      { wch: 18 },  // Código Proceso
      { wch: 40 },  // Proceso/Investigado
      { wch: 35 },  // Actuación
      { wch: 25 },  // Responsable
      { wch: 35 },  // Email Responsable
      { wch: 14 },  // Fecha Inicio
      { wch: 12 },  // Días Hábiles
      { wch: 14 },  // Vencimiento
      { wch: 14 },  // Días Restantes
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Términos Procesales');

    // Descargar archivo real .xlsx
    const nombreArchivo = `Terminos_Procesales_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);

    toast.success('Exportado a Excel', {
      description: `${terminosFiltrados.length} términos exportados correctamente`
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
        t.estado === 'vencido' ? 'Vencido' :
        t.estado === 'proximo_vencer' ? 'Próximo' :
        t.estado === 'pendiente' ? 'Pendiente' : 'Cumplido',
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
        <div className="flex items-start sm:items-center justify-between gap-3">
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
        </div>
      </div>

      {/* Cards de Resumen */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-4">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="rounded-xl border p-4 flex flex-col items-center justify-center gap-2">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-7 h-7 text-green-600" />
            </div>
            <p className="text-4xl font-bold text-gray-900 leading-none">{stats.pendientes}</p>
            <p className="text-xs font-bold tracking-wide text-gray-500 uppercase">Pendientes</p>
          </div>
          <div className="rounded-xl border p-4 flex flex-col items-center justify-center gap-2">
            <div className="w-14 h-14 rounded-full bg-yellow-100 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-yellow-600" />
            </div>
            <p className="text-4xl font-bold text-gray-900 leading-none">{stats.proximosVencer}</p>
            <p className="text-xs font-bold tracking-wide text-gray-500 uppercase">Próximos</p>
          </div>
          <div className="rounded-xl border p-4 flex flex-col items-center justify-center gap-2">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-red-600" />
            </div>
            <p className="text-4xl font-bold text-gray-900 leading-none">{stats.vencidos}</p>
            <p className="text-xs font-bold tracking-wide text-gray-500 uppercase">Vencidos</p>
          </div>
          <div className="rounded-xl border p-4 flex flex-col items-center justify-center gap-2">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
              <CheckCircle className="w-7 h-7 text-blue-600" />
            </div>
            <p className="text-4xl font-bold text-gray-900 leading-none">{stats.cumplidos}</p>
            <p className="text-xs font-bold tracking-wide text-gray-500 uppercase">Cumplidos</p>
          </div>
          <div className="rounded-xl border p-4 flex flex-col items-center justify-center gap-2 col-span-2 lg:col-span-1">
            <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center">
              <Clock className="w-7 h-7 text-indigo-600" />
            </div>
            <p className="text-4xl font-bold text-gray-900 leading-none">{terminos.length}</p>
            <p className="text-xs font-bold tracking-wide text-gray-500 uppercase">Total</p>
          </div>
        </div>
      </div>

      {/* Alert Informativo */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Info className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-sm text-gray-700">
              <p className="font-bold text-blue-900 mb-1">
                Cálculo Automático de Términos Procesales
              </p>
              <p className="text-xs sm:text-sm">
                El sistema calcula automáticamente los términos en días calendario.
                Las alertas se envían automáticamente según las reglas configuradas.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Navegación */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { id: 'terminos', label: 'Términos', icon: <Clock className="w-4 h-4" />, count: terminos.length },
              { id: 'historial', label: 'Historial', icon: <Bell className="w-4 h-4" />, count: ALERTAS_MOCK.length }
            ].map((vista) => (
              <button
                key={vista.id}
                onClick={() => setVistaActual(vista.id as any)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  vistaActual === vista.id
                    ? 'text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={vistaActual === vista.id ? {
                  background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)'
                } : {}}
              >
                {vista.icon}
                <span className="hidden sm:inline">{vista.label}</span> ({vista.count})
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_TERMINOS_MANAGE) && (
            <button
              onClick={handleRecalcular}
              className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all text-xs sm:text-sm font-bold flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Recalcular</span>
              
            </button>
            )}

            
            {vistaActual === 'terminos' && authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_TERMINOS_TERMINO_CREATE) && (
              <button
                onClick={() => setShowModalNuevoTermino(true)}
                className="px-3 py-2 rounded-lg text-white font-bold hover:shadow-lg transition-all text-xs sm:text-sm flex items-center gap-2"
                style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' }}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nuevo Término</span>
              </button>
            )}
          </div>
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
                {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_EXPIDENTE_ELECTRONICO_MANAGE) && (
                <div className="flex gap-2">
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
                )}
              </div>
              <p className="text-sm text-gray-600 px-1">
                Mostrando <span className="font-bold text-gray-900">{terminosFiltrados.length}</span> de <span className="font-bold text-gray-900">{terminos.length}</span> términos
              </p>

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
                          Código Proceso
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                          Proceso/Investigado
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
                                Próximo a Vencer
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
                          </td>
                          <td className="px-4 py-3">
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
                              {termino.estado !== 'cumplido' && termino.responsableId === currentUser?.id && (
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


          {/* VISTA: REGLAS DE ALERTA NO FUNCIONAL */}
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
                  <X className="w-5 h-5" />
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
            style={{ zIndex: 1000 }}
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
                {/* Selector de Proceso */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Seleccionar Proceso *
                  </label>
                  {cargandoProcesos ? (
                    <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                    Cargando procesos...
                    </div>
                  ) : (
                    <select
                      value={procesoTerminoId}
                      onChange={(e) => handleProcesoChange(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccione un proceso</option>
                      {procesos.map((proceso) => (
                        <option key={proceso.id} value={proceso.id}>
                          {proceso.radicadoProceso} - {(Array.isArray(proceso.news?.disciplinable) ? proceso.news?.disciplinable?.[0]?.nombre : proceso.news?.disciplinable?.nombre) || 'Sin nombre'}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Número de Proceso
                    </label>
                    <input
                      type="text"
                      placeholder="P-XXX-2025"
                      value={nuevoTermino.numeroProceso}
                      onChange={(e) => setNuevoTermino({...nuevoTermino, numeroProceso: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Denunciado
                    </label>
                    <input
                      type="text"
                      placeholder="Nombre completo"
                      value={nuevoTermino.proceso}
                      onChange={(e) => setNuevoTermino({...nuevoTermino, proceso: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                      readOnly
                    />
                  </div>
                </div>

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
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Responsable *
                  </label>
                  <select
                    value={responsableId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setResponsableId(id);
                      const prof = profesionales.find(p => p.id === id);
                      if (prof) {
                        setNuevoTermino(prev => ({ ...prev, responsable: prof.nombreCompleto || prof.nombre || '', emailResponsable: prof.email || '' }));
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccione un responsable</option>
                    {profesionales.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombreCompleto || p.nombre} {p.email ? `— ${p.email}` : ''}
                      </option>
                    ))}
                  </select>
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
                    onClick={() => {
                      setShowModalNuevoTermino(false);
                      limpiarFormulario();
                    }}
                    className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCrearTermino}
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
