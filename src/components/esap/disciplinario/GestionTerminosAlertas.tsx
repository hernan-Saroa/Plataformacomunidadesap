/**
 * RF006 - GESTIÓN DE TÉRMINOS Y ALERTAS
 * Sistema de administración de términos procesales con cálculo automático y alertas
 * REDISEÑADO - Fase 5: Diseño limpio, profesional y altamente usable
 */

import { useState } from 'react';
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
import { toast } from 'sonner@2.0.3';
import { FlujoTerminosAlertas } from './FlujoTerminosAlertas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Interfaces
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

// Mock Data
const DIAS_FESTIVOS_MOCK: DiaFestivo[] = [
  {
    id: 'f1',
    fecha: '2025-01-01',
    descripcion: 'Año Nuevo',
    tipo: 'nacional'
  },
  {
    id: 'f2',
    fecha: '2025-01-06',
    descripcion: 'Día de los Reyes Magos',
    tipo: 'nacional'
  },
  {
    id: 'f3',
    fecha: '2025-03-24',
    descripcion: 'Día de San José',
    tipo: 'nacional'
  },
  {
    id: 'f4',
    fecha: '2025-04-17',
    descripcion: 'Jueves Santo',
    tipo: 'nacional'
  },
  {
    id: 'f5',
    fecha: '2025-04-18',
    descripcion: 'Viernes Santo',
    tipo: 'nacional'
  },
  {
    id: 'f6',
    fecha: '2025-05-01',
    descripcion: 'Día del Trabajo',
    tipo: 'nacional'
  },
  {
    id: 'f7',
    fecha: '2025-06-23',
    descripcion: 'Día de San Pedro y San Pablo',
    tipo: 'nacional'
  },
  {
    id: 'f8',
    fecha: '2025-07-20',
    descripcion: 'Día de la Independencia',
    tipo: 'nacional'
  },
  {
    id: 'f9',
    fecha: '2025-08-07',
    descripcion: 'Batalla de Boyacá',
    tipo: 'nacional'
  },
  {
    id: 'f10',
    fecha: '2025-08-18',
    descripcion: 'Asunción de la Virgen',
    tipo: 'nacional'
  },
  {
    id: 'f11',
    fecha: '2025-10-13',
    descripcion: 'Día de la Raza',
    tipo: 'nacional'
  },
  {
    id: 'f12',
    fecha: '2025-11-03',
    descripcion: 'Todos los Santos',
    tipo: 'nacional'
  },
  {
    id: 'f13',
    fecha: '2025-11-17',
    descripcion: 'Independencia de Cartagena',
    tipo: 'nacional'
  },
  {
    id: 'f14',
    fecha: '2025-12-08',
    descripcion: 'Inmaculada Concepción',
    tipo: 'nacional'
  },
  {
    id: 'f15',
    fecha: '2025-12-25',
    descripcion: 'Navidad',
    tipo: 'nacional'
  }
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

// ==================== COMPONENTE PRINCIPAL ====================
export function GestionTerminosAlertas() {
  const [terminos, setTerminos] = useState<Termino[]>(TERMINOS_MOCK);
  const [diasFestivos, setDiasFestivos] = useState<DiaFestivo[]>(DIAS_FESTIVOS_MOCK);
  const [vistaActual, setVistaActual] = useState<'terminos' | 'calendario' | 'reglas' | 'historial'>('terminos');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [showModalNuevoTermino, setShowModalNuevoTermino] = useState(false);
  const [showModalFestivo, setShowModalFestivo] = useState(false);
  const [showFlujoModal, setShowFlujoModal] = useState(false);
  const [terminoSeleccionado, setTerminoSeleccionado] = useState<Termino | null>(null);
  const [showModalDetalle, setShowModalDetalle] = useState(false);
  
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

  // Filtrado de términos
  const terminosFiltrados = terminos.filter(t => {
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

  const handleMarcarCompleto = (id: string) => {
    setTerminos(terminos.map(t => 
      t.id === id ? { ...t, estado: 'cumplido' as const } : t
    ));
    toast.success('Término marcado como cumplido', {
      description: 'El término se ha actualizado correctamente'
    });
  };

  const handleRecalcular = () => {
    // Función para calcular días hábiles entre dos fechas
    const calcularDiasHabiles = (fechaInicio: string, diasHabiles: number): { fechaVencimiento: string, diasRestantes: number } => {
      const inicio = new Date(fechaInicio);
      const hoy = new Date();
      let diasContados = 0;
      let fechaActual = new Date(inicio);
      
      // Calcular fecha de vencimiento
      while (diasContados < diasHabiles) {
        fechaActual.setDate(fechaActual.getDate() + 1);
        const diaSemana = fechaActual.getDay();
        const fechaStr = fechaActual.toISOString().split('T')[0];
        
        // Solo contar si no es fin de semana ni festivo
        const esFestivo = diasFestivos.some(f => f.fecha === fechaStr);
        if (diaSemana !== 0 && diaSemana !== 6 && !esFestivo) {
          diasContados++;
        }
      }
      
      // Calcular días restantes desde hoy
      let diasRestantesCalc = 0;
      let fechaTemporal = new Date(hoy);
      
      if (fechaActual > hoy) {
        while (fechaTemporal < fechaActual) {
          fechaTemporal.setDate(fechaTemporal.getDate() + 1);
          const diaSemana = fechaTemporal.getDay();
          const fechaStr = fechaTemporal.toISOString().split('T')[0];
          const esFestivo = diasFestivos.some(f => f.fecha === fechaStr);
          
          if (diaSemana !== 0 && diaSemana !== 6 && !esFestivo) {
            diasRestantesCalc++;
          }
        }
      } else {
        // Si la fecha ya pasó, contar días negativos
        while (fechaTemporal > fechaActual) {
          const diaSemana = fechaTemporal.getDay();
          const fechaStr = fechaTemporal.toISOString().split('T')[0];
          const esFestivo = diasFestivos.some(f => f.fecha === fechaStr);
          
          if (diaSemana !== 0 && diaSemana !== 6 && !esFestivo) {
            diasRestantesCalc--;
          }
          fechaTemporal.setDate(fechaTemporal.getDate() - 1);
        }
      }
      
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
      
      const { fechaVencimiento, diasRestantes } = calcularDiasHabiles(termino.fechaInicio, termino.diasHabiles);
      
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
      description: `${terminosActualizados.length} términos actualizados con ${diasFestivos.length} festivos`
    });
  };

  const handleExportarExcel = () => {
    // Crear CSV
    const headers = ['Estado', 'Proceso', 'Actuación', 'Responsable', 'Email', 'Fecha Inicio', 'Días Hábiles', 'Vencimiento', 'Días Restantes'];
    const rows = terminosFiltrados.map(t => [
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
      ...rows.map(row => row.join(','))
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
    doc.setFillColor(245, 158, 11); // #F59E0B
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
        fillColor: [245, 158, 11],
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
    <div className="w-full max-w-full">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
        <button className="hover:text-blue-600">Backoffice</button>
        <ChevronRight className="w-4 h-4" />
        <button className="hover:text-blue-600">Control Interno Disciplinario</button>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">Términos y Alertas</span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6" style={{ color: '#F59E0B' }} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Términos y Alertas</h1>
              <p className="text-sm text-gray-600">RF006 - Control de Términos Procesales Automático</p>
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
            {vistaActual === 'terminos' && (
              <button
                onClick={() => setShowModalNuevoTermino(true)}
                className="px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                style={{ background: '#F59E0B' }}
              >
                <Plus className="w-4 h-4" />
                Nuevo Término
              </button>
            )}
            {vistaActual === 'calendario' && (
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

        {/* Alert Informativo */}
        <Card className="p-4 bg-orange-50 border-orange-200">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-700">
              <p className="font-semibold text-orange-900 mb-1">
                Cálculo Automático de Términos Procesales
              </p>
              <p>
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
            Historial ({ALERTAS_MOCK.length})
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
                          {termino.estado !== 'cumplido' && (
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
                  {diasFestivos.map((festivo) => (
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
                            className="p-2 rounded-lg hover:bg-gray-100"
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
                            className="p-2 rounded-lg hover:bg-red-50"
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
            {REGLAS_ALERTA_MOCK.map((regla) => (
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
                    <button
                      onClick={() => toast.info('Editar regla')}
                      className="p-2 rounded-lg hover:bg-gray-100"
                    >
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => toast.info(regla.activa ? 'Desactivar regla' : 'Activar regla')}
                      className={`p-2 rounded-lg ${regla.activa ? 'hover:bg-red-50' : 'hover:bg-green-50'}`}
                    >
                      {regla.activa ? (
                        <Pause className="w-4 h-4 text-red-600" />
                      ) : (
                        <Play className="w-4 h-4 text-green-600" />
                      )}
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

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
                  {ALERTAS_MOCK.map((alerta) => (
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
      )}

      {/* Botón Flotante de Ayuda */}
      <motion.button
        onClick={() => setShowFlujoModal(true)}
        className="fixed bottom-8 right-8 p-4 rounded-full shadow-2xl hover:shadow-3xl transition-all z-40"
        style={{ background: '#F59E0B' }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <HelpCircle className="w-6 h-6 text-white" />
      </motion.button>

      {/* Modal de Flujo */}
      <AnimatePresence>
        {showFlujoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowFlujoModal(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-6xl max-h-[90vh] overflow-auto rounded-2xl shadow-2xl"
              style={{ background: '#FFFFFF' }}
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
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4"
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
              <div className="bg-orange-500 text-white p-6 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="w-6 h-6" />
                    <h2 className="text-xl font-bold">Nuevo Término Procesal</h2>
                  </div>
                  <button
                    onClick={() => setShowModalNuevoTermino(false)}
                    className="p-2 rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Número de Proceso *
                    </label>
                    <input
                      type="text"
                      placeholder="P-XXX-2025"
                      value={nuevoTermino.numeroProceso}
                      onChange={(e) => setNuevoTermino({...nuevoTermino, numeroProceso: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Denunciado *
                    </label>
                    <input
                      type="text"
                      placeholder="Nombre completo"
                      value={nuevoTermino.proceso}
                      onChange={(e) => setNuevoTermino({...nuevoTermino, proceso: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Actuación Procesal *
                  </label>
                  <select
                    value={nuevoTermino.actuacion}
                    onChange={(e) => setNuevoTermino({...nuevoTermino, actuacion: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Seleccione una actuación</option>
                    <option value="Notificación Auto de Apertura">Notificación Auto de Apertura</option>
                    <option value="Presentación de Descargos">Presentación de Descargos</option>
                    <option value="Valoración Noticia Disciplinaria">Valoración Noticia Disciplinaria</option>
                    <option value="Práctica de Pruebas">Práctica de Pruebas</option>
                    <option value="Indagación Preliminar">Indagación Preliminar</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Responsable *
                    </label>
                    <input
                      type="text"
                      placeholder="Nombre del responsable"
                      value={nuevoTermino.responsable}
                      onChange={(e) => setNuevoTermino({...nuevoTermino, responsable: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email Responsable *
                    </label>
                    <input
                      type="email"
                      placeholder="email@esap.edu.co"
                      value={nuevoTermino.emailResponsable}
                      onChange={(e) => setNuevoTermino({...nuevoTermino, emailResponsable: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Fecha de Inicio *
                    </label>
                    <input
                      type="date"
                      value={nuevoTermino.fechaInicio}
                      onChange={(e) => setNuevoTermino({...nuevoTermino, fechaInicio: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Días Hábiles *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="180"
                      value={nuevoTermino.diasHabiles}
                      onChange={(e) => setNuevoTermino({...nuevoTermino, diasHabiles: parseInt(e.target.value)})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-2">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-gray-700">
                      <p className="font-semibold text-blue-900 mb-1">Cálculo Automático</p>
                      <p>
                        El sistema calculará automáticamente la fecha de vencimiento excluyendo 
                        sábados, domingos y días festivos configurados.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowModalNuevoTermino(false)}
                    className="flex-1 px-6 py-3 rounded-lg font-semibold border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      if (!nuevoTermino.numeroProceso || !nuevoTermino.proceso || !nuevoTermino.actuacion || 
                          !nuevoTermino.responsable || !nuevoTermino.emailResponsable || !nuevoTermino.fechaInicio) {
                        toast.error('Complete todos los campos obligatorios');
                        return;
                      }
                      
                      const nuevoId = `t${terminos.length + 1}`;
                      const nuevoTerminoCompleto: Termino = {
                        id: nuevoId,
                        proceso: nuevoTermino.proceso,
                        numeroProceso: nuevoTermino.numeroProceso,
                        actuacion: nuevoTermino.actuacion,
                        responsable: nuevoTermino.responsable,
                        emailResponsable: nuevoTermino.emailResponsable,
                        fechaInicio: nuevoTermino.fechaInicio,
                        diasHabiles: nuevoTermino.diasHabiles,
                        fechaVencimiento: new Date(Date.now() + nuevoTermino.diasHabiles * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        diasRestantes: nuevoTermino.diasHabiles,
                        estado: 'pendiente',
                        alertaEnviada: false
                      };
                      
                      setTerminos([...terminos, nuevoTerminoCompleto]);
                      setShowModalNuevoTermino(false);
                      setNuevoTermino({
                        proceso: '',
                        numeroProceso: '',
                        actuacion: '',
                        responsable: '',
                        emailResponsable: '',
                        fechaInicio: '',
                        diasHabiles: 10
                      });
                      
                      toast.success('Término creado exitosamente', {
                        description: `${nuevoTerminoCompleto.actuacion} - ${nuevoTerminoCompleto.numeroProceso}`
                      });
                    }}
                    className="flex-1 px-6 py-3 rounded-lg font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" />
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
                  {terminoSeleccionado.estado !== 'cumplido' && (
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

      {/* Modal Agregar Festivo */}
      <AnimatePresence>
        {showModalFestivo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowModalFestivo(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-xl bg-white rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-orange-500 text-white p-6 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-6 h-6" />
                    <h2 className="text-xl font-bold">Agregar Día Festivo</h2>
                  </div>
                  <button
                    onClick={() => setShowModalFestivo(false)}
                    className="p-2 rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Fecha del Festivo *
                  </label>
                  <input
                    type="date"
                    value={nuevoFestivo.fecha}
                    onChange={(e) => setNuevoFestivo({...nuevoFestivo, fecha: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Descripción *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Día de la Independencia"
                    value={nuevoFestivo.descripcion}
                    onChange={(e) => setNuevoFestivo({...nuevoFestivo, descripcion: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tipo de Festivo *
                  </label>
                  <select
                    value={nuevoFestivo.tipo}
                    onChange={(e) => setNuevoFestivo({...nuevoFestivo, tipo: e.target.value as 'nacional' | 'regional' | 'institucional'})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="nacional">Nacional</option>
                    <option value="regional">Regional</option>
                    <option value="institucional">Institucional</option>
                  </select>
                </div>

                {nuevoFestivo.tipo === 'regional' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Territorio
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Cundinamarca, Bogotá D.C."
                      value={nuevoFestivo.territorio}
                      onChange={(e) => setNuevoFestivo({...nuevoFestivo, territorio: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-2">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-gray-700">
                      <p className="font-semibold text-blue-900 mb-1">Cálculo Automático</p>
                      <p>
                        Los días festivos se excluirán automáticamente al calcular términos procesales 
                        y fechas de vencimiento.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowModalFestivo(false)}
                    className="flex-1 px-6 py-3 rounded-lg font-semibold border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      if (!nuevoFestivo.fecha || !nuevoFestivo.descripcion) {
                        toast.error('Complete todos los campos obligatorios');
                        return;
                      }
                      
                      const nuevoId = `f${diasFestivos.length + 1}`;
                      const nuevoFestivoCompleto: DiaFestivo = {
                        id: nuevoId,
                        fecha: nuevoFestivo.fecha,
                        descripcion: nuevoFestivo.descripcion,
                        tipo: nuevoFestivo.tipo,
                        territorio: nuevoFestivo.territorio || undefined
                      };
                      
                      setDiasFestivos([...diasFestivos, nuevoFestivoCompleto].sort((a, b) => 
                        new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
                      ));
                      setShowModalFestivo(false);
                      setNuevoFestivo({
                        fecha: '',
                        descripcion: '',
                        tipo: 'nacional',
                        territorio: ''
                      });
                      
                      toast.success('Festivo agregado exitosamente', {
                        description: `${nuevoFestivoCompleto.descripcion} - ${nuevoFestivoCompleto.fecha}`
                      });
                    }}
                    className="flex-1 px-6 py-3 rounded-lg font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    Agregar Festivo
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