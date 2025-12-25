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

import { useState, useMemo, useEffect } from 'react';
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
import { FormularioExpedienteJudicial } from './defensa-judicial/FormularioExpedienteJudicial';
import { SistemaAlertasExpedientes } from './SistemaAlertasExpedientes';
import { GestionDocumentosExpediente } from './GestionDocumentosExpediente';
import { legalService } from '../../../services/api/legal.service';

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
  documents?: string[];
}

// Mock removed - data now comes from backend via legalService.getExpedientes()

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function ModuloDefensaJudicial({
  onVolverKanban,
  hideHeader = false,
}: {
  onVolverKanban?: () => void;
  hideHeader?: boolean;
}) {
  const { showToast } = useToast();
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [vista, setVista] = useState<'lista' | 'detalle'>('lista');
  const [expedienteSeleccionado, setExpedienteSeleccionado] = useState<Expediente | null>(null);

  useEffect(() => {
    fetchExpedientes();
  }, []);

  const fetchExpedientes = async () => {
    try {
      const data = await legalService.getExpedientes();
      if (data) {
        const mappedData: Expediente[] = data.map((item: any) => ({
          id: item.radicado,
          jurisdiccion: item.jurisdiccion as Jurisdiccion,
          demandante: item.demandante,
          demandado: item.demandado,
          juzgado: item.juzgadoConocimiento || 'Por definir',
          medioControl: item.medioControl || 'Nulidad',
          abogadoAsignado: item.abogadoSustanciador || 'Por asignar',
          fechaNotificacion: item.fechaNotificacion ? new Date(item.fechaNotificacion) : new Date(),
          fechaDemanda: item.fechaRadicacion ? new Date(item.fechaRadicacion) : new Date(),
          fechaVencimiento: item.fechaVencimientoTermino ? new Date(item.fechaVencimientoTermino) : new Date(),
          plazo: item.terminoProcesalDias || 30,
          diasRestantes: item.fechaVencimientoTermino
            ? Math.ceil((new Date(item.fechaVencimientoTermino).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
            : 0,
          colorAlerta: item.riesgoPrescripcion ? 'ROJO' : 'VERDE',
          estado: 'ACTIVO', // Map BE status 'RADICADO' -> 'ACTIVO' ?
          valorDemanda: Number(item.cuantia) || 0,
          pretension: item.pretensionDemandante || '',
          createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
          updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
          documents: item.documentosInicialesUrls || []
        }));
        setExpedientes(mappedData);
      }
    } catch (error) {
      console.error('Error fetching expedientes:', error);
      showToast({
        variant: 'error',
        title: 'Error',
        message: 'No se pudieron cargar los expedientes'
      });
    }
  };

  // Replace usage of mocked state


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



  const handleVerDetalle = (expediente: Expediente) => {
    setExpedienteSeleccionado(expediente);
    setVista('detalle');
  };

  const handleVolverLista = () => {
    setVista('lista');
    setExpedienteSeleccionado(null);
  };

  const handleExportar = () => {
    showToast({
      variant: 'info',
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
                  {expedienteSeleccionado.documents && expedienteSeleccionado.documents.length > 0 ? (
                    expedienteSeleccionado.documents.map((docUrl, idx) => {
                      const fileName = docUrl.split('/').pop() || `Documento ${idx + 1}`;
                      return (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-gray-500" />
                            <span className="text-sm truncate max-w-[200px]" title={fileName}>{fileName}</span>
                          </div>
                          <ButtonSIGL
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(docUrl, '_blank')}
                          >
                            <Eye className="w-4 h-4" />
                          </ButtonSIGL>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-gray-500 text-sm italic">No hay documentos adjuntos</p>
                  )}
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
                    <p className={`text-2xl font-bold ${expedienteSeleccionado.diasRestantes < 0 ? 'text-red-600' :
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
        {/* Header - HIDDEN IF hideHeader is true */}
        {!hideHeader && (
          <>
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
          </>
        )}

        {/* Filtros */}
        <CardSIGL className="p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <InputSIGL
                placeholder="Buscar por ID, demandante, demandado o juzgado..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}

              />
            </div>
            <SelectSIGL
              value={filtroJurisdiccion}
              onChange={setFiltroJurisdiccion}
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
                onChange={setFiltroAlerta}
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
                        <p className={`text-sm font-semibold ${expediente.diasRestantes < 0 ? 'text-red-900' :
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
                          size="small"
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
        <FormularioExpedienteJudicial
          isOpen={mostrarFormulario}
          onClose={() => setMostrarFormulario(false)}
          onExpedienteCreado={(data: any) => {
            showToast({
              variant: 'success',
              title: '✅ Expediente creado',
              message: `Expediente ${data.radicado} creado exitosamente`,
            });
            setMostrarFormulario(false);

            const nuevoExpediente: Expediente = {
              id: data.radicado,
              jurisdiccion: (data.jurisdiccion as Jurisdiccion) || 'ORDINARIA',
              demandante: data.demandante || '',
              demandado: data.demandado || 'ESAP',
              juzgado: data.juzgadoConocimiento || 'Por definir',
              medioControl: data.medioControl || 'Nulidad',
              abogadoAsignado: data.abogadoSustanciador || 'Por asignar',
              fechaNotificacion: data.fechaNotificacion ? new Date(data.fechaNotificacion) : new Date(),
              fechaDemanda: data.fechaRadicacion ? new Date(data.fechaRadicacion) : new Date(),
              fechaVencimiento: data.fechaVencimientoTermino ? new Date(data.fechaVencimientoTermino) : new Date(),
              plazo: data.terminoProcesalDias || 30,
              diasRestantes: 30, // Debería calcularse real
              colorAlerta: 'VERDE', // Debería calcularse real
              estado: 'ACTIVO',
              valorDemanda: Number(data.cuantia) || 0,
              pretension: data.pretensionDemandante || '',
              createdAt: new Date(),
              updatedAt: new Date(),
              documents: data.documentosInicialesUrls || [],
            };

            setExpedientes((prev) => [nuevoExpediente, ...prev]);
          }}
        />
      )}
    </div>
  );
}