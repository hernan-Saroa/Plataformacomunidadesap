/**
 * ============================================
 * MÓDULO DEFENSA JUDICIAL - MOD-01
 * ============================================
 * 
 * Implementación completa según REQ-MOD01-001
 * 
 * FUNCIONALIDADES:
 * ✅ Crear expedientes (4 jurisdicciones)
 * ✅ Tabla expedientes con filtros
 * ✅ Sistema de alertas (VERDE/AMARILLO/ROJO/VENCIDO)
 * ✅ Vista detalle expediente
 * ✅ Integración con Kanban
 * 
 * Oficina Asesora Jurídica - ESAP
 */

import { useState, useMemo } from 'react';
import {
  Scale,
  Plus,
  Filter,
  Search,
  Download,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  FileText,
  Calendar,
  TrendingUp,
  Users,
  Bell,
  FolderOpen,
} from 'lucide-react';

// Componentes del Design System SIGL
import {
  ButtonSIGL,
  InputSIGL,
  SelectSIGL,
  BadgeSIGL,
  CardSIGL,
  ModalSIGL,
  TableSIGL,
  useToast,
} from './design-system';
import { FormularioExpedienteCompleto } from './FormularioExpedienteCompleto';
import { SistemaAlertasExpedientes } from './SistemaAlertasExpedientes';
import { GestionDocumentosExpediente } from './GestionDocumentosExpediente';

// ============================================
// TIPOS
// ============================================

type Jurisdiccion = 'CONTENCIOSO' | 'ORDINARIA' | 'LABORAL' | 'CONSTITUCIONAL';
type EstadoExpediente = 'ACTIVO' | 'EN_PROCESO' | 'VENCIDO' | 'CERRADO' | 'ARCHIVADO';
type ColorAlerta = 'VERDE' | 'AMARILLO' | 'ROJO' | 'VENCIDO';

interface Expediente {
  id: string; // PJ-YYYY-NNNNN
  jurisdiccion: Jurisdiccion;
  demandante: string;
  demandado: string;
  juzgado: string;
  medioControl: string;
  abogadoAsignado: string;
  fechaNotificacion: Date;
  fechaDemanda: Date;
  fechaVencimiento: Date;
  plazo: number; // días hábiles
  diasRestantes: number;
  colorAlerta: ColorAlerta;
  estado: EstadoExpediente;
  valorDemanda?: number;
  pretension: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// DATOS MOCK
// ============================================

const EXPEDIENTES_MOCK: Expediente[] = [
  {
    id: 'PJ-2025-00001',
    jurisdiccion: 'CONSTITUCIONAL',
    demandante: 'Juan Pérez Gómez',
    demandado: 'ESAP',
    juzgado: 'Juzgado 25 Civil Municipal de Bogotá',
    medioControl: 'Acción de Tutela',
    abogadoAsignado: 'Dr. Luis Ramírez',
    fechaNotificacion: new Date('2024-12-10'),
    fechaDemanda: new Date('2024-12-08'),
    fechaVencimiento: new Date('2024-12-20'),
    plazo: 10,
    diasRestantes: 2,
    colorAlerta: 'ROJO',
    estado: 'ACTIVO',
    valorDemanda: 0,
    pretension: 'Ordene a la ESAP readmitir al estudiante y permitirle continuar con sus estudios',
    createdAt: new Date('2024-12-08'),
    updatedAt: new Date('2024-12-17'),
  },
  {
    id: 'PJ-2025-00002',
    jurisdiccion: 'CONTENCIOSO',
    demandante: 'María Rodríguez',
    demandado: 'ESAP - Rectoría Nacional',
    juzgado: 'Tribunal Administrativo de Cundinamarca',
    medioControl: 'Acción de Nulidad y Restablecimiento del Derecho',
    abogadoAsignado: 'Dra. Patricia González',
    fechaNotificacion: new Date('2024-11-15'),
    fechaDemanda: new Date('2024-11-10'),
    fechaVencimiento: new Date('2024-12-25'),
    plazo: 30,
    diasRestantes: 8,
    colorAlerta: 'AMARILLO',
    estado: 'EN_PROCESO',
    valorDemanda: 50000000,
    pretension: 'Declarar nulidad del acto administrativo y restablecer derechos laborales',
    createdAt: new Date('2024-11-15'),
    updatedAt: new Date('2024-12-16'),
  },
  {
    id: 'PJ-2025-00003',
    jurisdiccion: 'LABORAL',
    demandante: 'Carlos Méndez Silva',
    demandado: 'ESAP - Territorial Antioquia',
    juzgado: 'Juzgado Laboral del Circuito de Medellín',
    medioControl: 'Proceso Ordinario Laboral',
    abogadoAsignado: 'Dr. Carlos Mendoza',
    fechaNotificacion: new Date('2024-10-01'),
    fechaDemanda: new Date('2024-09-25'),
    fechaVencimiento: new Date('2024-11-05'),
    plazo: 30,
    diasRestantes: -42,
    colorAlerta: 'VENCIDO',
    estado: 'VENCIDO',
    valorDemanda: 120000000,
    pretension: 'Reconocimiento de prestaciones sociales y salarios dejados de percibir',
    createdAt: new Date('2024-10-01'),
    updatedAt: new Date('2024-12-15'),
  },
  {
    id: 'PJ-2025-00004',
    jurisdiccion: 'ORDINARIA',
    demandante: 'Constructora ABC S.A.S.',
    demandado: 'ESAP',
    juzgado: 'Juzgado 15 Civil del Circuito de Bogotá',
    medioControl: 'Proceso Ejecutivo Único Acreedor',
    abogadoAsignado: 'Dra. María Torres',
    fechaNotificacion: new Date('2024-12-01'),
    fechaDemanda: new Date('2024-11-28'),
    fechaVencimiento: new Date('2025-01-10'),
    plazo: 20,
    diasRestantes: 24,
    colorAlerta: 'VERDE',
    estado: 'ACTIVO',
    valorDemanda: 85000000,
    pretension: 'Cobro de acreencia contractual por incumplimiento de contrato',
    createdAt: new Date('2024-12-01'),
    updatedAt: new Date('2024-12-17'),
  },
  {
    id: 'PJ-2024-00156',
    jurisdiccion: 'CONTENCIOSO',
    demandante: 'Ana Gutiérrez López',
    demandado: 'ESAP - Vicerrectoría Académica',
    juzgado: 'Juzgado 3º Administrativo de Bogotá',
    medioControl: 'Acción de Nulidad',
    abogadoAsignado: 'Dr. Andrés Castillo',
    fechaNotificacion: new Date('2024-11-20'),
    fechaDemanda: new Date('2024-11-18'),
    fechaVencimiento: new Date('2024-12-30'),
    plazo: 30,
    diasRestantes: 13,
    colorAlerta: 'AMARILLO',
    estado: 'EN_PROCESO',
    valorDemanda: 0,
    pretension: 'Declarar nulidad del acto administrativo que modificó el reglamento estudiantil',
    createdAt: new Date('2024-11-20'),
    updatedAt: new Date('2024-12-17'),
  },
];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function ModuloDefensaJudicial({
  onVolverKanban,
}: {
  onVolverKanban?: () => void;
}) {
  const { addToast } = useToast();
  const [expedientes, setExpedientes] = useState<Expediente[]>(EXPEDIENTES_MOCK);
  const [vista, setVista] = useState<'lista' | 'detalle'>('lista');
  const [expedienteSeleccionado, setExpedienteSeleccionado] = useState<Expediente | null>(null);
  
  // Modal formulario
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  
  // Tabs en vista detalle
  const [tabActivo, setTabActivo] = useState<'info' | 'documentos' | 'alertas'>('info');
  
  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroJurisdiccion, setFiltroJurisdiccion] = useState<string>('TODAS');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [filtroAlerta, setFiltroAlerta] = useState<string>('TODAS');

  // ============================================
  // ESTADÍSTICAS
  // ============================================

  const estadisticas = useMemo(() => {
    return {
      total: expedientes.length,
      activos: expedientes.filter(e => e.estado === 'ACTIVO').length,
      vencidos: expedientes.filter(e => e.colorAlerta === 'VENCIDO').length,
      criticos: expedientes.filter(e => e.colorAlerta === 'ROJO').length,
      alertaAmarilla: expedientes.filter(e => e.colorAlerta === 'AMARILLO').length,
      verde: expedientes.filter(e => e.colorAlerta === 'VERDE').length,
    };
  }, [expedientes]);

  // ============================================
  // FILTRADO
  // ============================================

  const expedientesFiltrados = useMemo(() => {
    return expedientes.filter(exp => {
      // Búsqueda por texto
      const matchBusqueda = busqueda === '' || 
        exp.id.toLowerCase().includes(busqueda.toLowerCase()) ||
        exp.demandante.toLowerCase().includes(busqueda.toLowerCase()) ||
        exp.demandado.toLowerCase().includes(busqueda.toLowerCase()) ||
        exp.juzgado.toLowerCase().includes(busqueda.toLowerCase());

      // Filtro jurisdicción
      const matchJurisdiccion = filtroJurisdiccion === 'TODAS' || 
        exp.jurisdiccion === filtroJurisdiccion;

      // Filtro estado
      const matchEstado = filtroEstado === 'TODOS' || 
        exp.estado === filtroEstado;

      // Filtro alerta
      const matchAlerta = filtroAlerta === 'TODAS' || 
        exp.colorAlerta === filtroAlerta;

      return matchBusqueda && matchJurisdiccion && matchEstado && matchAlerta;
    });
  }, [expedientes, busqueda, filtroJurisdiccion, filtroEstado, filtroAlerta]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleCrearExpediente = () => {
    setMostrarFormulario(true);
  };

  const handleGuardarExpediente = (data: any) => {
    // Generar ID único para el nuevo expediente
    const año = new Date().getFullYear();
    const numero = (expedientes.length + 1).toString().padStart(5, '0');
    const nuevoId = `PJ-${año}-${numero}`;
    
    // Crear nuevo expediente con los datos del formulario
    const nuevoExpediente: Expediente = {
      id: nuevoId,
      jurisdiccion: data.jurisdiccion || 'CONTENCIOSO',
      demandante: data.demandante || '',
      demandado: data.demandado || 'ESAP',
      juzgado: data.despacho || data.juzgado || '',
      medioControl: data.medioControl || 'Acción de Nulidad',
      abogadoAsignado: data.apoderado || data.abogadoAsignado || 'Por asignar',
      fechaNotificacion: data.fechaNotificacion ? new Date(data.fechaNotificacion) : new Date(),
      fechaDemanda: data.fechaDemanda ? new Date(data.fechaDemanda) : new Date(),
      fechaVencimiento: data.fechaVencimiento ? new Date(data.fechaVencimiento) : new Date(),
      plazo: data.plazo || 30,
      diasRestantes: data.diasRestantes || 0,
      colorAlerta: data.colorAlerta || 'VERDE',
      estado: 'ACTIVO',
      valorDemanda: data.cuantia || data.valorDemanda || 0,
      pretension: data.pretensiones || data.pretension || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Agregar el nuevo expediente al inicio de la lista
    setExpedientes([nuevoExpediente, ...expedientes]);
    
    // Mostrar notificación de éxito
    addToast({
      type: 'success',
      title: '✅ Expediente creado',
      message: `Expediente ${nuevoId} creado exitosamente`,
    });
    
    // Cerrar el modal
    setMostrarFormulario(false);
  };

  const handleVerDetalle = (expediente: Expediente) => {
    setExpedienteSeleccionado(expediente);
    setVista('detalle');
  };

  const handleVolverLista = () => {
    setVista('lista');
    setExpedienteSeleccionado(null);
  };

  const handleExportar = () => {
    addToast({
      type: 'info',
      title: 'Exportando datos',
      message: 'Se está generando el reporte en Excel...',
    });
  };

  // ============================================
  // FUNCIONES AUXILIARES
  // ============================================

  const getColorAlerta = (color: ColorAlerta) => {
    switch (color) {
      case 'VERDE':
        return { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle };
      case 'AMARILLO':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock };
      case 'ROJO':
        return { bg: 'bg-red-100', text: 'text-red-800', icon: AlertCircle };
      case 'VENCIDO':
        return { bg: 'bg-red-900', text: 'text-white', icon: XCircle };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', icon: AlertCircle };
    }
  };

  const formatCurrency = (value?: number) => {
    if (!value) return 'Indeterminada';
    // Método más compatible que no usa Intl.NumberFormat
    const valorStr = value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `$ ${valorStr}`;
  };

  const formatDate = (date: Date) => {
    // Método más compatible que no usa Intl.DateFormat
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const dia = date.getDate();
    const mes = meses[date.getMonth()];
    const año = date.getFullYear();
    return `${dia} ${mes} ${año}`;
  };

  // ============================================
  // RENDER: VISTA DETALLE
  // ============================================

  if (vista === 'detalle' && expedienteSeleccionado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <ButtonSIGL
                variant="outline"
                onClick={handleVolverLista}
              >
                ← Volver a la lista
              </ButtonSIGL>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {expedienteSeleccionado.id}
                </h1>
                <p className="text-gray-600">
                  {expedienteSeleccionado.demandante} vs {expedienteSeleccionado.demandado}
                </p>
              </div>
            </div>
            <BadgeSIGL
              variant={expedienteSeleccionado.colorAlerta === 'VENCIDO' ? 'danger' : 
                      expedienteSeleccionado.colorAlerta === 'ROJO' ? 'danger' :
                      expedienteSeleccionado.colorAlerta === 'AMARILLO' ? 'warning' : 'success'}
            >
              {expedienteSeleccionado.colorAlerta}
            </BadgeSIGL>
          </div>

          {/* Contenido */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna principal */}
            <div className="lg:col-span-2 space-y-6">
              {/* Información general */}
              <CardSIGL>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Información General
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Jurisdicción</p>
                    <p className="font-medium">{expedienteSeleccionado.jurisdiccion}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Medio de Control</p>
                    <p className="font-medium">{expedienteSeleccionado.medioControl}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Juzgado/Tribunal</p>
                    <p className="font-medium">{expedienteSeleccionado.juzgado}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Abogado Asignado</p>
                    <p className="font-medium">{expedienteSeleccionado.abogadoAsignado}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Valor de la Demanda</p>
                    <p className="font-medium">{formatCurrency(expedienteSeleccionado.valorDemanda)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Estado</p>
                    <BadgeSIGL variant={expedienteSeleccionado.estado === 'VENCIDO' ? 'danger' : 'success'}>
                      {expedienteSeleccionado.estado}
                    </BadgeSIGL>
                  </div>
                </div>
              </CardSIGL>

              {/* Pretensión */}
              <CardSIGL>
                <h3 className="text-lg font-semibold mb-3">Pretensión del Demandante</h3>
                <p className="text-gray-700">{expedienteSeleccionado.pretension}</p>
              </CardSIGL>

              {/* Documentos */}
              <CardSIGL>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Documentos del Expediente
                </h3>
                <div className="space-y-2">
                  {['Demanda original.pdf', 'Auto admisorio.pdf', 'Contestación.docx'].map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{doc}</span>
                      </div>
                      <ButtonSIGL variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </ButtonSIGL>
                    </div>
                  ))}
                </div>
              </CardSIGL>
            </div>

            {/* Columna lateral */}
            <div className="space-y-6">
              {/* Timeline */}
              <CardSIGL>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Plazos
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-500">Notificación</p>
                    <p className="font-medium">{formatDate(expedienteSeleccionado.fechaNotificacion)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Demanda Presentada</p>
                    <p className="font-medium">{formatDate(expedienteSeleccionado.fechaDemanda)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Vencimiento</p>
                    <p className="font-medium text-red-600">{formatDate(expedienteSeleccionado.fechaVencimiento)}</p>
                  </div>
                  <div className="pt-3 border-t">
                    <p className="text-gray-500">Días restantes</p>
                    <p className={`text-2xl font-bold ${
                      expedienteSeleccionado.diasRestantes < 0 ? 'text-red-600' :
                      expedienteSeleccionado.diasRestantes < 5 ? 'text-red-600' :
                      expedienteSeleccionado.diasRestantes < 10 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {expedienteSeleccionado.diasRestantes < 0 ? 
                        `Vencido hace ${Math.abs(expedienteSeleccionado.diasRestantes)} días` :
                        `${expedienteSeleccionado.diasRestantes} días`
                      }
                    </p>
                  </div>
                </div>
              </CardSIGL>

              {/* Acciones rápidas */}
              <CardSIGL>
                <h3 className="text-lg font-semibold mb-4">Acciones</h3>
                <div className="space-y-2">
                  <ButtonSIGL variant="primary" fullWidth>
                    <Edit className="w-4 h-4" />
                    Editar Expediente
                  </ButtonSIGL>
                  <ButtonSIGL variant="outline" fullWidth>
                    <FileText className="w-4 h-4" />
                    Subir Documento
                  </ButtonSIGL>
                  <ButtonSIGL variant="outline" fullWidth>
                    <Download className="w-4 h-4" />
                    Generar Reporte
                  </ButtonSIGL>
                </div>
              </CardSIGL>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: VISTA LISTA
  // ============================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {onVolverKanban && (
              <ButtonSIGL
                variant="outline"
                onClick={onVolverKanban}
              >
                ← Volver al Kanban
              </ButtonSIGL>
            )}
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Scale className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Defensa Judicial
                </h1>
                <p className="text-gray-600">
                  Gestión de expedientes judiciales - 4 jurisdicciones
                </p>
              </div>
            </div>
          </div>
          <ButtonSIGL
            variant="primary"
            onClick={handleCrearExpediente}
          >
            <Plus className="w-4 h-4" />
            Nuevo Expediente
          </ButtonSIGL>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <CardSIGL className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-2xl font-bold text-gray-900">{estadisticas.total}</p>
              </div>
            </div>
          </CardSIGL>

          <CardSIGL className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Verde</p>
                <p className="text-2xl font-bold text-green-600">{estadisticas.verde}</p>
              </div>
            </div>
          </CardSIGL>

          <CardSIGL className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Amarillo</p>
                <p className="text-2xl font-bold text-yellow-600">{estadisticas.alertaAmarilla}</p>
              </div>
            </div>
          </CardSIGL>

          <CardSIGL className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Críticos</p>
                <p className="text-2xl font-bold text-red-600">{estadisticas.criticos}</p>
              </div>
            </div>
          </CardSIGL>

          <CardSIGL className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-900 rounded-lg">
                <XCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Vencidos</p>
                <p className="text-2xl font-bold text-red-900">{estadisticas.vencidos}</p>
              </div>
            </div>
          </CardSIGL>

          <CardSIGL className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Activos</p>
                <p className="text-2xl font-bold text-blue-600">{estadisticas.activos}</p>
              </div>
            </div>
          </CardSIGL>
        </div>

        {/* Filtros */}
        <CardSIGL className="p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <InputSIGL
                placeholder="Buscar por ID, demandante, demandado o juzgado..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            <SelectSIGL
              value={filtroJurisdiccion}
              onChange={(e) => setFiltroJurisdiccion(e.target.value)}
              options={[
                { value: 'TODAS', label: 'Todas las jurisdicciones' },
                { value: 'CONSTITUCIONAL', label: 'Constitucional' },
                { value: 'CONTENCIOSO', label: 'Contencioso Administrativo' },
                { value: 'LABORAL', label: 'Laboral' },
                { value: 'ORDINARIA', label: 'Ordinaria' },
              ]}
            />
            <div className="flex gap-2">
              <SelectSIGL
                value={filtroAlerta}
                onChange={(e) => setFiltroAlerta(e.target.value)}
                options={[
                  { value: 'TODAS', label: 'Todas las alertas' },
                  { value: 'VERDE', label: 'Verde' },
                  { value: 'AMARILLO', label: 'Amarillo' },
                  { value: 'ROJO', label: 'Rojo' },
                  { value: 'VENCIDO', label: 'Vencido' },
                ]}
              />
              <ButtonSIGL
                variant="outline"
                onClick={handleExportar}
              >
                <Download className="w-4 h-4" />
              </ButtonSIGL>
            </div>
          </div>
        </CardSIGL>

        {/* Tabla */}
        <CardSIGL>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Alerta
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID / Expediente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Demandante vs Demandado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jurisdicción
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Abogado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Días Restantes
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vencimiento
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {expedientesFiltrados.map((expediente) => {
                  const alerta = getColorAlerta(expediente.colorAlerta);
                  const IconoAlerta = alerta.icon;
                  
                  return (
                    <tr key={expediente.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${alerta.bg} ${alerta.text}`}>
                          <IconoAlerta className="w-4 h-4" />
                          <span className="text-xs font-medium">{expediente.colorAlerta}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-medium text-gray-900">{expediente.id}</p>
                        <p className="text-xs text-gray-500">{expediente.medioControl}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-900">{expediente.demandante}</p>
                        <p className="text-xs text-gray-500">vs {expediente.demandado}</p>
                      </td>
                      <td className="px-4 py-4">
                        <BadgeSIGL variant="info" size="sm">
                          {expediente.jurisdiccion}
                        </BadgeSIGL>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-700">{expediente.abogadoAsignado}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className={`text-sm font-semibold ${
                          expediente.diasRestantes < 0 ? 'text-red-900' :
                          expediente.diasRestantes < 5 ? 'text-red-600' :
                          expediente.diasRestantes < 10 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {expediente.diasRestantes < 0 ? 
                            `VENCIDO (${Math.abs(expediente.diasRestantes)}d)` :
                            `${expediente.diasRestantes} días`
                          }
                        </p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-700">{formatDate(expediente.fechaVencimiento)}</p>
                      </td>
                      <td className="px-4 py-4">
                        <ButtonSIGL
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVerDetalle(expediente)}
                        >
                          <Eye className="w-4 h-4" />
                        </ButtonSIGL>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {expedientesFiltrados.length === 0 && (
            <div className="text-center py-12">
              <Scale className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No se encontraron expedientes con los filtros seleccionados</p>
            </div>
          )}
        </CardSIGL>
      </div>

      {/* Modal Formulario */}
      {mostrarFormulario && (
        <ModalSIGL
          isOpen={mostrarFormulario}
          onClose={() => setMostrarFormulario(false)}
          title="Crear Nuevo Expediente Judicial"
          size="xlarge"
        >
          <FormularioExpedienteCompleto
            onGuardar={handleGuardarExpediente}
            onCancelar={() => setMostrarFormulario(false)}
          />
        </ModalSIGL>
      )}
    </div>
  );
}