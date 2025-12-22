/**
 * ============================================
 * MÓDULO ASESORÍA JURÍDICA - MOD-03
 * ============================================
 * 
 * Gestión de consultas jurídicas internas
 * Término estándar: 30 días hábiles
 * 
 * FUNCIONALIDADES:
 * ✅ Registro de consultas jurídicas
 * ✅ Asignación a profesionales
 * ✅ Sistema de alertas (30 días hábiles)
 * ✅ Seguimiento y conceptos jurídicos
 * ✅ Estadísticas y filtros avanzados
 * 
 * Oficina Asesora Jurídica - ESAP
 */

import { useState, useMemo } from 'react';
import {
  FileQuestion,
  Plus,
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
  Send,
  Paperclip,
  Building2,
} from 'lucide-react';

// Componentes del Design System SIGL
import {
  ButtonSIGL,
  InputSIGL,
  SelectSIGL,
  BadgeSIGL,
  CardSIGL,
  ModalSIGL,
  useToast,
} from './design-system';

// ============================================
// TIPOS
// ============================================

type TipoConsulta = 'CONTRACTUAL' | 'LABORAL' | 'ADMINISTRATIVO' | 'DISCIPLINARIO' | 'OTROS';
type EstadoConsulta = 'RADICADA' | 'EN_ESTUDIO' | 'RESPONDIDA' | 'VENCIDA' | 'ARCHIVADA';
type ColorAlerta = 'VERDE' | 'AMARILLO' | 'ROJO' | 'VENCIDO';
type Prioridad = 'ALTA' | 'MEDIA' | 'BAJA';

interface Consulta {
  id: string; // AJ-YYYY-NNNNN
  tipo: TipoConsulta;
  solicitante: string;
  dependenciaSolicitante: string;
  territorial: string;
  asunto: string;
  descripcion: string;
  prioridad: Prioridad;
  fechaRadicacion: Date;
  fechaVencimiento: Date;
  plazo: number; // días hábiles (generalmente 30)
  diasRestantes: number;
  colorAlerta: ColorAlerta;
  estado: EstadoConsulta;
  abogadoAsignado: string;
  fechaRespuesta?: Date;
  conceptoEmitido?: string;
  documentosAdjuntos: number;
  observaciones?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// DATOS MOCK
// ============================================

const CONSULTAS_MOCK: Consulta[] = [
  {
    id: 'AJ-2025-00001',
    tipo: 'CONTRACTUAL',
    solicitante: 'Dra. María Fernanda González',
    dependenciaSolicitante: 'Subdirección de Contratación',
    territorial: 'Nacional',
    asunto: 'Adición y prórroga de contrato de obra - Convenio 2024-089',
    descripcion: 'Solicito concepto sobre viabilidad jurídica de adicionar en un 50% el valor del contrato y prorrogar el plazo por 3 meses adicionales, considerando que el supervisor certifica cumplimiento satisfactorio.',
    prioridad: 'ALTA',
    fechaRadicacion: new Date('2024-12-05'),
    fechaVencimiento: new Date('2025-01-15'),
    plazo: 30,
    diasRestantes: 29,
    colorAlerta: 'VERDE',
    estado: 'EN_ESTUDIO',
    abogadoAsignado: 'Dr. Carlos Mendoza López',
    documentosAdjuntos: 5,
    createdAt: new Date('2024-12-05'),
    updatedAt: new Date('2024-12-18'),
  },
  {
    id: 'AJ-2025-00002',
    tipo: 'LABORAL',
    solicitante: 'Dr. Jorge Luis Parra',
    dependenciaSolicitante: 'Subdirección de Talento Humano',
    territorial: 'Nacional',
    asunto: 'Procedimiento para terminación de contrato por justa causa',
    descripcion: 'Se requiere concepto sobre el procedimiento a seguir para dar por terminado un contrato laboral por justa causa, específicamente por inasistencia injustificada superior a 3 días.',
    prioridad: 'ALTA',
    fechaRadicacion: new Date('2024-12-10'),
    fechaVencimiento: new Date('2024-12-28'),
    plazo: 30,
    diasRestantes: 11,
    colorAlerta: 'AMARILLO',
    estado: 'EN_ESTUDIO',
    abogadoAsignado: 'Dra. Patricia González',
    documentosAdjuntos: 3,
    createdAt: new Date('2024-12-10'),
    updatedAt: new Date('2024-12-17'),
  },
  {
    id: 'AJ-2024-00234',
    tipo: 'ADMINISTRATIVO',
    solicitante: 'Directora Territorial Antioquia',
    dependenciaSolicitante: 'Territorial Antioquia',
    territorial: 'Antioquia',
    asunto: 'Competencia para expedir certificados de asistencia a eventos',
    descripcion: 'Consulta sobre la competencia de la territorial para expedir certificaciones de asistencia a eventos de capacitación organizados por entidades externas.',
    prioridad: 'MEDIA',
    fechaRadicacion: new Date('2024-11-20'),
    fechaVencimiento: new Date('2024-12-20'),
    plazo: 30,
    diasRestantes: 3,
    colorAlerta: 'ROJO',
    estado: 'EN_ESTUDIO',
    abogadoAsignado: 'Dr. Andrés Castillo',
    documentosAdjuntos: 2,
    createdAt: new Date('2024-11-20'),
    updatedAt: new Date('2024-12-17'),
  },
  {
    id: 'AJ-2024-00189',
    tipo: 'CONTRACTUAL',
    solicitante: 'Coordinador de Proyectos Especiales',
    dependenciaSolicitante: 'Vicerrectoría Académica',
    territorial: 'Nacional',
    asunto: 'Requisitos para contratar con ONGS internacionales',
    descripcion: 'Se requiere concepto sobre los requisitos legales y procedimentales para suscribir convenio de cooperación internacional con ONG extranjera.',
    prioridad: 'MEDIA',
    fechaRadicacion: new Date('2024-10-15'),
    fechaVencimiento: new Date('2024-11-14'),
    plazo: 30,
    diasRestantes: -33,
    colorAlerta: 'VENCIDO',
    estado: 'VENCIDA',
    abogadoAsignado: 'Dr. Luis Ramírez',
    documentosAdjuntos: 4,
    observaciones: 'Vencida - Se solicitó prórroga por complejidad del tema',
    createdAt: new Date('2024-10-15'),
    updatedAt: new Date('2024-11-30'),
  },
  {
    id: 'AJ-2024-00210',
    tipo: 'DISCIPLINARIO',
    solicitante: 'Jefe Oficina Control Interno Disciplinario',
    dependenciaSolicitante: 'Control Interno Disciplinario',
    territorial: 'Nacional',
    asunto: 'Procedimiento para archivo de noticia disciplinaria',
    descripcion: 'Consulta sobre requisitos formales y sustanciales para el archivo de noticia disciplinaria cuando no hay conducta disciplinable.',
    prioridad: 'BAJA',
    fechaRadicacion: new Date('2024-11-25'),
    fechaVencimiento: new Date('2024-12-25'),
    plazo: 30,
    diasRestantes: 8,
    colorAlerta: 'AMARILLO',
    estado: 'RESPONDIDA',
    abogadoAsignado: 'Dra. Ana Torres',
    fechaRespuesta: new Date('2024-12-10'),
    conceptoEmitido: 'Se emitió concepto favorable indicando el procedimiento conforme al Código Disciplinario Único.',
    documentosAdjuntos: 2,
    createdAt: new Date('2024-11-25'),
    updatedAt: new Date('2024-12-10'),
  },
];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function ModuloAsesoriaJuridica() {
  const { addToast } = useToast();
  const [consultas, setConsultas] = useState<Consulta[]>(CONSULTAS_MOCK);
  const [vista, setVista] = useState<'lista' | 'detalle'>('lista');
  const [consultaSeleccionada, setConsultaSeleccionada] = useState<Consulta | null>(null);
  
  // Modal formulario
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  
  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>('TODAS');

  // ============================================
  // ESTADÍSTICAS
  // ============================================

  const estadisticas = useMemo(() => {
    return {
      total: consultas.length,
      radicadas: consultas.filter(c => c.estado === 'RADICADA').length,
      enEstudio: consultas.filter(c => c.estado === 'EN_ESTUDIO').length,
      respondidas: consultas.filter(c => c.estado === 'RESPONDIDA').length,
      vencidas: consultas.filter(c => c.estado === 'VENCIDA').length,
      criticas: consultas.filter(c => c.colorAlerta === 'ROJO').length,
    };
  }, [consultas]);

  // ============================================
  // FILTRADO
  // ============================================

  const consultasFiltradas = useMemo(() => {
    return consultas.filter(con => {
      const matchBusqueda = busqueda === '' || 
        con.id.toLowerCase().includes(busqueda.toLowerCase()) ||
        con.asunto.toLowerCase().includes(busqueda.toLowerCase()) ||
        con.solicitante.toLowerCase().includes(busqueda.toLowerCase()) ||
        con.dependenciaSolicitante.toLowerCase().includes(busqueda.toLowerCase());

      const matchTipo = filtroTipo === 'TODOS' || con.tipo === filtroTipo;
      const matchEstado = filtroEstado === 'TODOS' || con.estado === filtroEstado;
      const matchPrioridad = filtroPrioridad === 'TODAS' || con.prioridad === filtroPrioridad;

      return matchBusqueda && matchTipo && matchEstado && matchPrioridad;
    });
  }, [consultas, busqueda, filtroTipo, filtroEstado, filtroPrioridad]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleCrearConsulta = () => {
    setMostrarFormulario(true);
  };

  const handleGuardarConsulta = (data: any) => {
    const año = new Date().getFullYear();
    const numero = (consultas.length + 1).toString().padStart(5, '0');
    const nuevoId = `AJ-${año}-${numero}`;
    
    const nuevaConsulta: Consulta = {
      id: nuevoId,
      tipo: data.tipo || 'CONTRACTUAL',
      solicitante: data.solicitante || '',
      dependenciaSolicitante: data.dependenciaSolicitante || '',
      territorial: data.territorial || 'Nacional',
      asunto: data.asunto || '',
      descripcion: data.descripcion || '',
      prioridad: data.prioridad || 'MEDIA',
      fechaRadicacion: new Date(),
      fechaVencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 días
      plazo: 30,
      diasRestantes: 30,
      colorAlerta: 'VERDE',
      estado: 'RADICADA',
      abogadoAsignado: 'Por asignar',
      documentosAdjuntos: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    setConsultas([nuevaConsulta, ...consultas]);
    
    addToast({
      type: 'success',
      title: '✅ Consulta radicada',
      message: `Consulta ${nuevoId} creada exitosamente`,
    });
    
    setMostrarFormulario(false);
  };

  const handleVerDetalle = (consulta: Consulta) => {
    setConsultaSeleccionada(consulta);
    setVista('detalle');
  };

  const handleVolverLista = () => {
    setVista('lista');
    setConsultaSeleccionada(null);
  };

  const handleExportar = () => {
    addToast({
      type: 'info',
      title: 'Exportando datos',
      message: 'Se está generando el reporte en Excel...',
    });
  };

  const handleEmitirConcepto = (consulta: Consulta) => {
    addToast({
      type: 'info',
      title: 'Emitir Concepto',
      message: `Preparando formulario para emitir concepto jurídico sobre ${consulta.id}`,
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

  const getColorPrioridad = (prioridad: Prioridad) => {
    switch (prioridad) {
      case 'ALTA':
        return 'bg-red-100 text-red-800';
      case 'MEDIA':
        return 'bg-yellow-100 text-yellow-800';
      case 'BAJA':
        return 'bg-green-100 text-green-800';
    }
  };

  const formatDate = (date: Date) => {
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const dia = date.getDate();
    const mes = meses[date.getMonth()];
    const año = date.getFullYear();
    return `${dia} ${mes} ${año}`;
  };

  // ============================================
  // RENDER: VISTA DETALLE
  // ============================================

  if (vista === 'detalle' && consultaSeleccionada) {
    const alertaColor = getColorAlerta(consultaSeleccionada.colorAlerta);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-6">
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
                  {consultaSeleccionada.id}
                </h1>
                <p className="text-gray-600">
                  {consultaSeleccionada.tipo} - {consultaSeleccionada.solicitante}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getColorPrioridad(consultaSeleccionada.prioridad)}`}>
                {consultaSeleccionada.prioridad}
              </span>
              <BadgeSIGL
                variant={consultaSeleccionada.colorAlerta === 'VENCIDO' ? 'danger' : 
                        consultaSeleccionada.colorAlerta === 'ROJO' ? 'danger' :
                        consultaSeleccionada.colorAlerta === 'AMARILLO' ? 'warning' : 'success'}
              >
                {consultaSeleccionada.colorAlerta}
              </BadgeSIGL>
            </div>
          </div>

          {/* Contenido */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna principal */}
            <div className="lg:col-span-2 space-y-6">
              {/* Información general */}
              <CardSIGL>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileQuestion className="w-5 h-5 text-purple-600" />
                  Información de la Consulta
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Asunto</p>
                    <p className="font-medium text-lg">{consultaSeleccionada.asunto}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Tipo de Consulta</p>
                      <p className="font-medium">{consultaSeleccionada.tipo}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Prioridad</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-1 ${getColorPrioridad(consultaSeleccionada.prioridad)}`}>
                        {consultaSeleccionada.prioridad}
                      </span>
                    </div>
                    <div>
                      <p className="text-gray-500">Territorial</p>
                      <p className="font-medium">{consultaSeleccionada.territorial}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Estado</p>
                      <BadgeSIGL variant={consultaSeleccionada.estado === 'VENCIDA' ? 'danger' : 
                                          consultaSeleccionada.estado === 'RESPONDIDA' ? 'success' : 'warning'}>
                        {consultaSeleccionada.estado}
                      </BadgeSIGL>
                    </div>
                  </div>
                </div>
              </CardSIGL>

              {/* Solicitante */}
              <CardSIGL>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Información del Solicitante
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Nombre Completo</p>
                    <p className="font-medium">{consultaSeleccionada.solicitante}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Dependencia</p>
                    <p className="font-medium">{consultaSeleccionada.dependenciaSolicitante}</p>
                  </div>
                </div>
              </CardSIGL>

              {/* Descripción */}
              <CardSIGL>
                <h3 className="text-lg font-semibold mb-3">Descripción de la Consulta</h3>
                <p className="text-gray-700">{consultaSeleccionada.descripcion}</p>
              </CardSIGL>

              {/* Concepto emitido */}
              {consultaSeleccionada.conceptoEmitido && (
                <CardSIGL>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Concepto Jurídico Emitido
                  </h3>
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-900">{consultaSeleccionada.conceptoEmitido}</p>
                    {consultaSeleccionada.fechaRespuesta && (
                      <p className="text-sm text-green-700 mt-2">
                        Fecha de respuesta: {formatDate(consultaSeleccionada.fechaRespuesta)}
                      </p>
                    )}
                  </div>
                </CardSIGL>
              )}

              {/* Observaciones */}
              {consultaSeleccionada.observaciones && (
                <CardSIGL>
                  <h3 className="text-lg font-semibold mb-3">Observaciones</h3>
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">{consultaSeleccionada.observaciones}</p>
                  </div>
                </CardSIGL>
              )}

              {/* Documentos */}
              <CardSIGL>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Paperclip className="w-5 h-5 text-blue-600" />
                  Documentos Adjuntos ({consultaSeleccionada.documentosAdjuntos})
                </h3>
                <div className="space-y-2">
                  {Array.from({ length: consultaSeleccionada.documentosAdjuntos }).map((_, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">Documento_consulta_{idx + 1}.pdf</span>
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
              {/* Asignación */}
              <CardSIGL>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  Asignación
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-500">Abogado Asignado</p>
                    <p className="font-medium">{consultaSeleccionada.abogadoAsignado}</p>
                  </div>
                </div>
              </CardSIGL>

              {/* Plazos */}
              <CardSIGL>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  Plazos
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-500">Radicación</p>
                    <p className="font-medium">{formatDate(consultaSeleccionada.fechaRadicacion)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Vencimiento</p>
                    <p className="font-medium text-purple-600">{formatDate(consultaSeleccionada.fechaVencimiento)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Plazo (días hábiles)</p>
                    <p className="font-medium">{consultaSeleccionada.plazo} días</p>
                  </div>
                  <div className="pt-3 border-t">
                    <p className="text-gray-500">Días restantes</p>
                    <p className={`text-2xl font-bold ${
                      consultaSeleccionada.diasRestantes < 0 ? 'text-red-600' :
                      consultaSeleccionada.diasRestantes < 10 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {consultaSeleccionada.diasRestantes < 0 ? 
                        `Vencida hace ${Math.abs(consultaSeleccionada.diasRestantes)} días` :
                        `${consultaSeleccionada.diasRestantes} días`
                      }
                    </p>
                  </div>
                </div>
              </CardSIGL>

              {/* Acciones rápidas */}
              <CardSIGL>
                <h3 className="text-lg font-semibold mb-4">Acciones</h3>
                <div className="space-y-2">
                  <ButtonSIGL variant="primary" fullWidth onClick={() => handleEmitirConcepto(consultaSeleccionada)}>
                    <Send className="w-4 h-4" />
                    Emitir Concepto
                  </ButtonSIGL>
                  <ButtonSIGL variant="outline" fullWidth>
                    <Edit className="w-4 h-4" />
                    Editar Consulta
                  </ButtonSIGL>
                  <ButtonSIGL variant="outline" fullWidth>
                    <Paperclip className="w-4 h-4" />
                    Adjuntar Documento
                  </ButtonSIGL>
                  <ButtonSIGL variant="outline" fullWidth>
                    <Download className="w-4 h-4" />
                    Descargar Expediente
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <FileQuestion className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Asesoría Jurídica
              </h1>
              <p className="text-gray-600">
                Gestión de consultas jurídicas internas - 30 días hábiles
              </p>
            </div>
          </div>
          <ButtonSIGL
            variant="primary"
            onClick={handleCrearConsulta}
          >
            <Plus className="w-4 h-4" />
            Nueva Consulta
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
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Radicadas</p>
                <p className="text-2xl font-bold text-purple-600">{estadisticas.radicadas}</p>
              </div>
            </div>
          </CardSIGL>

          <CardSIGL className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">En Estudio</p>
                <p className="text-2xl font-bold text-yellow-600">{estadisticas.enEstudio}</p>
              </div>
            </div>
          </CardSIGL>

          <CardSIGL className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Respondidas</p>
                <p className="text-2xl font-bold text-green-600">{estadisticas.respondidas}</p>
              </div>
            </div>
          </CardSIGL>

          <CardSIGL className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Críticas</p>
                <p className="text-2xl font-bold text-red-600">{estadisticas.criticas}</p>
              </div>
            </div>
          </CardSIGL>

          <CardSIGL className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-900 rounded-lg">
                <XCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Vencidas</p>
                <p className="text-2xl font-bold text-red-900">{estadisticas.vencidas}</p>
              </div>
            </div>
          </CardSIGL>
        </div>

        {/* Filtros */}
        <CardSIGL className="p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <InputSIGL
                placeholder="Buscar por ID, asunto, solicitante o dependencia..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            <SelectSIGL
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              options={[
                { value: 'TODOS', label: 'Todos los tipos' },
                { value: 'CONTRACTUAL', label: 'Contractual' },
                { value: 'LABORAL', label: 'Laboral' },
                { value: 'ADMINISTRATIVO', label: 'Administrativo' },
                { value: 'DISCIPLINARIO', label: 'Disciplinario' },
                { value: 'OTROS', label: 'Otros' },
              ]}
            />
            <div className="flex gap-2">
              <SelectSIGL
                value={filtroPrioridad}
                onChange={(e) => setFiltroPrioridad(e.target.value)}
                options={[
                  { value: 'TODAS', label: 'Todas las prioridades' },
                  { value: 'ALTA', label: 'Alta' },
                  { value: 'MEDIA', label: 'Media' },
                  { value: 'BAJA', label: 'Baja' },
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
                    ID / Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Asunto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Solicitante
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prioridad
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Días Restantes
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Alerta
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {consultasFiltradas.map((consulta) => {
                  const alertaColor = getColorAlerta(consulta.colorAlerta);
                  const AlertIcon = alertaColor.icon;
                  
                  return (
                    <tr key={consulta.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{consulta.id}</p>
                          <p className="text-sm text-gray-500">{consulta.tipo}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-900 max-w-xs truncate">{consulta.asunto}</p>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-sm text-gray-900">{consulta.solicitante}</p>
                          <p className="text-xs text-gray-500">{consulta.dependenciaSolicitante}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getColorPrioridad(consulta.prioridad)}`}>
                          {consulta.prioridad}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className={`font-bold text-lg ${
                          consulta.diasRestantes < 0 ? 'text-red-600' :
                          consulta.diasRestantes < 10 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {consulta.diasRestantes < 0 ? 
                            `${Math.abs(consulta.diasRestantes)} (venc.)` :
                            consulta.diasRestantes
                          }
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <div className={`p-2 rounded-lg ${alertaColor.bg} inline-flex`}>
                          <AlertIcon className={`w-5 h-5 ${alertaColor.text}`} />
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <BadgeSIGL
                          variant={consulta.estado === 'VENCIDA' ? 'danger' : 
                                  consulta.estado === 'RESPONDIDA' ? 'success' : 'warning'}
                        >
                          {consulta.estado}
                        </BadgeSIGL>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <ButtonSIGL
                            variant="ghost"
                            size="sm"
                            onClick={() => handleVerDetalle(consulta)}
                          >
                            <Eye className="w-4 h-4" />
                          </ButtonSIGL>
                          <ButtonSIGL
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEmitirConcepto(consulta)}
                          >
                            <Send className="w-4 h-4" />
                          </ButtonSIGL>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {consultasFiltradas.length === 0 && (
            <div className="text-center py-12">
              <FileQuestion className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No se encontraron consultas</p>
            </div>
          )}
        </CardSIGL>
      </div>

      {/* Modal Formulario - Placeholder */}
      {mostrarFormulario && (
        <ModalSIGL
          isOpen={mostrarFormulario}
          onClose={() => setMostrarFormulario(false)}
          title="Nueva Consulta Jurídica"
          size="large"
        >
          <div className="p-6">
            <p className="text-gray-600 mb-4">
              Formulario de registro de consulta jurídica (funcionalidad completa próximamente)
            </p>
            <div className="flex justify-end gap-2">
              <ButtonSIGL variant="outline" onClick={() => setMostrarFormulario(false)}>
                Cancelar
              </ButtonSIGL>
              <ButtonSIGL variant="primary" onClick={() => handleGuardarConsulta({})}>
                Radicar Consulta
              </ButtonSIGL>
            </div>
          </div>
        </ModalSIGL>
      )}
    </div>
  );
}
