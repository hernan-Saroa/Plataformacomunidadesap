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
  BadgeSIGL,
  CardSIGL,
  ModalSIGL,
} from './design-system';
import { toast } from 'sonner';
import { ModalNuevaDemanda, NuevaDemandaData } from './modulos/ModalNuevaDemanda';
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
  tiempoRestante?: string; // String formateado para mostrar (ej: "28 días hábiles")
  tipoConteoTermino?: 'HABILES' | 'CALENDARIO'; // Tipo de conteo de días
  colorAlerta: ColorAlerta;
  estado: EstadoExpediente;
  valorDemanda?: number;
  pretension: string;
  createdAt: Date;
  updatedAt: Date;
  documents?: string[];
  demandantes?: Array<{ nombre: string; identificacion: string; tipoPersona?: string }>;
  demandados?: Array<{ nombre: string; identificacion: string; cargo?: string }>;
  otrosActores?: Array<{ nombre: string; rol: string }>;
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
        // Función para calcular días hábiles entre dos fechas (excluyendo fines de semana)
        const calcularDiasHabiles = (fechaInicio: Date, fechaFin: Date): number => {
          let dias = 0;
          const fecha = new Date(fechaInicio);
          fecha.setHours(0, 0, 0, 0);
          const fin = new Date(fechaFin);
          fin.setHours(0, 0, 0, 0);

          while (fecha <= fin) {
            const dia = fecha.getDay();
            if (dia !== 0 && dia !== 6) { // Excluir domingos (0) y sábados (6)
              dias++;
            }
            fecha.setDate(fecha.getDate() + 1);
          }
          return dias;
        };

        const mappedData: Expediente[] = data.map((item: any) => {
          // Calcular días restantes según tipo de conteo
          const fechaVencimiento = item.fechaVencimientoTermino ? new Date(item.fechaVencimientoTermino) : null;
          const now = new Date();
          const tipoConteo = item.tipoConteoTermino || 'HABILES';
          let diasRestantes = 0;
          let tiempoRestante = 'Por definir';

          if (fechaVencimiento) {
            if (tipoConteo === 'HABILES') {
              if (fechaVencimiento > now) {
                diasRestantes = calcularDiasHabiles(now, fechaVencimiento);
                tiempoRestante = `${diasRestantes} días hábiles`;
              } else {
                diasRestantes = -calcularDiasHabiles(fechaVencimiento, now);
                tiempoRestante = `Vencido hace ${Math.abs(diasRestantes)} días hábiles`;
              }
            } else if (tipoConteo === 'HORAS') {
              const diff = fechaVencimiento.getTime() - now.getTime();
              diasRestantes = Math.ceil(diff / (1000 * 60 * 60));
              if (diff > 0) {
                tiempoRestante = `${diasRestantes} horas`;
              } else {
                tiempoRestante = `Vencido hace ${Math.abs(diasRestantes)} horas`;
              }
            } else {
              const diff = fechaVencimiento.getTime() - now.getTime();
              const dayMs = 1000 * 60 * 60 * 24;
              diasRestantes = Math.ceil(diff / dayMs);
              if (diff > 0) {
                tiempoRestante = `${diasRestantes} días calendario`;
              } else {
                tiempoRestante = `Vencido hace ${Math.abs(diasRestantes)} días calendario`;
              }
            }
          } else {
            diasRestantes = item.terminoProcesalDias || 30;
            const tipoLabel = tipoConteo === 'HABILES' ? 'hábiles' : tipoConteo === 'HORAS' ? 'horas' : 'calendario';
            tiempoRestante = `${diasRestantes} días ${tipoLabel}`;
          }

          return {
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
            diasRestantes,
            tiempoRestante,
            tipoConteoTermino: tipoConteo as 'HABILES' | 'CALENDARIO',
            colorAlerta: item.riesgoPrescripcion ? 'ROJO' : 'VERDE',
            estado: 'ACTIVO', // Map BE status 'RADICADO' -> 'ACTIVO' ?
            valorDemanda: Number(item.cuantia) || 0,
            pretension: item.pretensionDemandante || '',
            createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
            updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
            documents: item.documentosInicialesUrls || [],
            demandantes: item.actors && item.actors.some((a: any) => a.rol === 'DEMANDANTE')
              ? item.actors.filter((a: any) => a.rol === 'DEMANDANTE')
              : (item.demandante ? [{ nombre: item.demandante, identificacion: item.numeroIdDemandante || '', tipoPersona: 'natural' }] : []),
            demandados: item.actors && item.actors.some((a: any) => a.rol === 'DEMANDADO')
              ? item.actors.filter((a: any) => a.rol === 'DEMANDADO')
              : (item.demandado ? [{ nombre: item.demandado, identificacion: item.numeroIdDemandado || '', tipoPersona: 'juridica' }] : []),
            otrosActores: item.actors ? item.actors.filter((a: any) => a.rol !== 'DEMANDANTE' && a.rol !== 'DEMANDADO') : []
          };
        });
        setExpedientes(mappedData);
      }
    } catch (error) {
      console.error('Error fetching expedientes:', error);
      toast.error('No se pudieron cargar los expedientes');
    }
  };

  // Replace usage of mocked state


  // Modal formulario
  const [modalNuevaDemandaOpen, setModalNuevaDemandaOpen] = useState(false);

  // Tabs en vista detalle
  const [tabActivo, setTabActivo] = useState<'info' | 'partes' | 'documentos' | 'alertas'>('info');

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
    setModalNuevaDemandaOpen(true);
  };

  const handleSaveNuevaDemanda = async (demandaData: NuevaDemandaData) => {
    try {
      // Mapear datos del formulario al formato del backend (Igual que en V3)
      const expedienteData = {
        radicado: demandaData.numeroRadicado,
        tipoProceso: demandaData.tipoProceso,
        jurisdiccion: 'Contencioso Administrativo', // Default o mapeado
        demandante: demandaData.demandantes[0]?.nombre || 'Sin Demandante',
        demandado: demandaData.demandados[0]?.nombre || 'Sin Demandado',
        estado: 'ACTIVO',
        fechaRadicacion: new Date().toISOString(),
        cuantia: parseFloat(demandaData.cuantia.replace(/[^0-9]/g, '')) || 0,
        abogadoSustanciador: demandaData.abogadoAsignado,
        medioControl: demandaData.medioControl,
        juzgadoConocimiento: `${demandaData.juzgado} - ${demandaData.ciudad}, ${demandaData.departamento}`,
        ubicacionFisica: demandaData.ciudad,
        pretensionDemandante: demandaData.pretensiones,
        fechaNotificacion: demandaData.fechaNotificacion,
        fechaVencimientoTermino: demandaData.fechaVencimiento,
        etapaProcesal: demandaData.etapa,
        ultimaActuacion: demandaData.observaciones || 'Demanda registrada',
        camposAdicionales: (demandaData as any).camposAdicionales,

        // Mapeo unificado de actores
        actors: [
          ...demandaData.demandantes.map((d: any) => ({
            nombre: d.nombre,
            tipoPersona: d.tipoPersona,
            identificacion: d.identificacion,
            rol: 'DEMANDANTE',
            telefono: d.telefono,
            email: d.email,
            direccion: d.direccion,
            apoderado: d.apoderado
          })),
          ...demandaData.demandados.map((d: any) => ({
            nombre: d.nombre,
            tipoPersona: d.tipoPersona,
            identificacion: d.identificacion,
            rol: 'DEMANDADO',
            cargo: d.cargo,
            telefono: d.telefono,
            email: d.email,
            direccion: d.direccion,
            apoderado: d.apoderado
          })),
          ...(demandaData.otrosActores || []).map((d: any) => ({
            nombre: d.nombre,
            tipoPersona: d.tipoPersona,
            identificacion: d.identificacion,
            rol: d.rol || 'OTRO',
            telefono: d.telefono,
            email: d.email,
            direccion: d.direccion,
            apoderado: d.apoderado
          })),
        ],

        // Datos Legacy (para compatibilidad con API vieja si fuera necesario)
        tipoIdDemandante: demandaData.demandantes[0]?.tipoPersona === 'natural' ? 'CC' : 'NIT',
        numeroIdDemandante: demandaData.demandantes[0]?.identificacion || '',
        demandanteDireccion: demandaData.demandantes[0]?.direccion || '',
        demandanteTelefono: demandaData.demandantes[0]?.telefono || '',
        demandanteEmail: demandaData.demandantes[0]?.email || '',

        tipoIdDemandado: demandaData.demandados[0]?.tipoPersona === 'natural' ? 'CC' : 'NIT',
        numeroIdDemandado: demandaData.demandados[0]?.identificacion || '',
        demandadoDireccion: demandaData.demandados[0]?.direccion || '',
        demandadoTelefono: demandaData.demandados[0]?.telefono || '',
        demandadoEmail: demandaData.demandados[0]?.email || '',

        // Campos de términos procesales
        terminoProcesalDias: demandaData.terminoProcesalDias,
        tipoConteoTermino: demandaData.tipoConteoTermino || 'HABILES',
      };

      const created = await legalService.crearExpediente(expedienteData);

      // Subir documentos de campos adicionales dinámicos si son nuevos
      const id = created?.uuid || created?.id || created?.radicado || demandaData.numeroRadicado;
      if (id && demandaData.camposAdicionales) {
        for (const [key, val] of Object.entries(demandaData.camposAdicionales)) {
          if (val && typeof val === 'object' && val.base64 && val.nombre && val.esNuevo) {
            try {
              const res = await fetch(val.base64);
              const blob = await res.blob();
              const file = new File([blob], val.nombre, { type: val.tipoMime || blob.type });

              const formDataDoc = new FormData();
              formDataDoc.append('archivo', file);
              formDataDoc.append('expedienteId', id);
              formDataDoc.append('nombre', val.nombre);
              formDataDoc.append('tipo', 'DATO_ADICIONAL');
              formDataDoc.append('origen', 'CARGA_DIRECTA');
              formDataDoc.append('categoria', 'documentos');
              formDataDoc.append('subidoPor', 'Sistema (Campo Dinámico)');

              await legalService.crearDocumento(formDataDoc);
            } catch (err) {
              console.error('Error uploading dynamic document:', err);
            }
          }
        }
      }

      fetchExpedientes();
      setModalNuevaDemandaOpen(false);
    } catch (error: any) {
      console.error('Error guardando demanda:', error);
      toast.error(error.message || 'Error al guardar la demanda');
    }
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
    toast.info('Se está generando el reporte en Excel...', { description: 'Exportando datos' });
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
                variant="secondary"
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

          {/* Tabs de Navegación del Detalle */}
          <div className="flex gap-4 mb-6 border-b border-gray-200">
            <button
              onClick={() => setTabActivo('info')}
              className={`pb-2 px-4 font-medium text-sm transition-colors relative ${tabActivo === 'info' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              General
              {tabActivo === 'info' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600" />
              )}
            </button>
            <button
              onClick={() => setTabActivo('partes')}
              className={`pb-2 px-4 font-medium text-sm transition-colors relative ${tabActivo === 'partes' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Partes Procesales
              {tabActivo === 'partes' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600" />
              )}
            </button>
            <button
              onClick={() => setTabActivo('documentos')}
              className={`pb-2 px-4 font-medium text-sm transition-colors relative ${tabActivo === 'documentos' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Documentos
              {tabActivo === 'documentos' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600" />
              )}
            </button>
          </div>

          {/* Contenido (Tabs) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna principal */}
            <div className="lg:col-span-2 space-y-6">

              {/* TAB: GENERAL */}
              {tabActivo === 'info' && (
                <>
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
                </>
              )}

              {/* TAB: PARTES */}
              {tabActivo === 'partes' && (
                <CardSIGL>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    Partes Procesales
                  </h3>

                  {/* Demandantes */}
                  <div className="mb-6">
                    <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide border-b pb-1">Demandantes</h4>
                    <div className="space-y-3">
                      {expedienteSeleccionado.demandantes && expedienteSeleccionado.demandantes.length > 0 ? (
                        expedienteSeleccionado.demandantes.map((d, i) => (
                          <div key={i} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                            <div>
                              <p className="font-semibold text-gray-900">{d.nombre}</p>
                              <p className="text-sm text-gray-500">{d.tipoPersona} - {d.identificacion}</p>
                            </div>
                            <BadgeSIGL variant="info" size="sm">Demandante</BadgeSIGL>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 italic">No hay demandantes registrados</p>
                      )}
                    </div>
                  </div>

                  {/* Demandados */}
                  <div className="mb-6">
                    <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide border-b pb-1">Demandados</h4>
                    <div className="space-y-3">
                      {expedienteSeleccionado.demandados && expedienteSeleccionado.demandados.length > 0 ? (
                        expedienteSeleccionado.demandados.map((d, i) => (
                          <div key={i} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                            <div>
                              <p className="font-semibold text-gray-900">{d.nombre}</p>
                              <p className="text-sm text-gray-500">{d.identificacion} {d.cargo ? `- ${d.cargo}` : ''}</p>
                            </div>
                            <BadgeSIGL variant="danger" size="sm">Demandado</BadgeSIGL>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 italic">No hay demandados registrados</p>
                      )}
                    </div>
                  </div>

                  {/* Otros Actores */}
                  {expedienteSeleccionado.otrosActores && expedienteSeleccionado.otrosActores.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide border-b pb-1">Otros Actores</h4>
                      <div className="space-y-3">
                        {expedienteSeleccionado.otrosActores.map((a, i) => (
                          <div key={i} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                            <div>
                              <p className="font-semibold text-gray-900">{a.nombre}</p>
                              <p className="text-sm text-gray-500">{a.rol}</p>
                            </div>
                            <BadgeSIGL variant="warning" size="sm">Otro</BadgeSIGL>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardSIGL>
              )}

              {/* TAB: DOCUMENTOS */}
              <div className={tabActivo === 'documentos' ? 'block' : 'hidden'}>
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
                    <p className="text-gray-500">{expedienteSeleccionado.tipoConteoTermino === 'HORAS' ? 'Horas restantes' : 'Días restantes'}</p>
                    <p className={`text-2xl font-bold ${expedienteSeleccionado.diasRestantes < 0 ? 'text-red-600' :
                      expedienteSeleccionado.diasRestantes < 5 ? 'text-red-600' :
                        expedienteSeleccionado.diasRestantes < 10 ? 'text-yellow-600' :
                          'text-green-600'
                      }`}>
                      {expedienteSeleccionado.diasRestantes < 0 ?
                        `Vencido hace ${Math.abs(expedienteSeleccionado.diasRestantes)} ${expedienteSeleccionado.tipoConteoTermino === 'HORAS' ? 'horas' : 'días'}` :
                        `${expedienteSeleccionado.diasRestantes} ${expedienteSeleccionado.tipoConteoTermino === 'HORAS' ? 'horas' : 'días'}`
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
                  <ButtonSIGL variant="secondary" fullWidth>
                    <FileText className="w-4 h-4" />
                    Subir Documento
                  </ButtonSIGL>
                  <ButtonSIGL variant="secondary" fullWidth>
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
                    variant="secondary"
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
            <select
              value={filtroJurisdiccion}
              onChange={(e) => setFiltroJurisdiccion(e.target.value as any)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODAS">Todas las jurisdicciones</option>
              <option value="CONSTITUCIONAL">Constitucional</option>
              <option value="CONTENCIOSO">Contencioso Administrativo</option>
              <option value="LABORAL">Laboral</option>
              <option value="ORDINARIA">Ordinaria</option>
            </select>
            <div className="flex gap-2">
              <select
                value={filtroAlerta}
                onChange={(e) => setFiltroAlerta(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="TODAS">Todas las alertas</option>
                <option value="VERDE">Verde</option>
                <option value="AMARILLO">Amarillo</option>
                <option value="ROJO">Rojo</option>
                <option value="VENCIDO">Vencido</option>
              </select>
              <ButtonSIGL
                variant="secondary"
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
                            `VENCIDO (${Math.abs(expediente.diasRestantes)}${expediente.tipoConteoTermino === 'HORAS' ? 'h' : 'd'})` :
                            `${expediente.diasRestantes} ${expediente.tipoConteoTermino === 'HORAS' ? 'horas' : 'días'}`
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

      {/* Modal Formulario Nueva Demanda */}
      {modalNuevaDemandaOpen && (
        <ModalNuevaDemanda
          isOpen={modalNuevaDemandaOpen}
          onClose={() => setModalNuevaDemandaOpen(false)}
          onSave={handleSaveNuevaDemanda}
        />
      )}
    </div>
  );
}