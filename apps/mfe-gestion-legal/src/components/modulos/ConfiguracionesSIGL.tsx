/**
 * ConfiguracionesSIGL - Módulo de Configuraciones SIGL
 * Permite configurar estados, columnas y tiempos de todos los tableros Kanban
 * DISEÑO 100% COHERENTE CON EL ESTÁNDAR DEL PROYECTO (Modal Comunicaciones del Proceso)
 * CONECTADO A CONTEXT API - Los cambios afectan a todos los módulos de Gestión Legal
 * ✅ ORGANIZADO CON TABS para mejor usabilidad
 */

import { useState, useEffect } from 'react';
import { Settings, Clock, LayoutGrid, Save, RotateCcw, Plus, Trash2, GripVertical, AlertCircle, Scale, X, CheckCircle, Gavel, Target, FileText, Landmark, Mail, AtSign, ChevronDown, ChevronUp, Info, FolderOpen, Activity, Columns } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { legalService, procesosCoactivosService } from '../../../../services/api/legal.service';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { authService } from '../../../../services/api/authService';
import { rolesService } from '../../../../services/api/roles.service';
import { Permissions } from '@esap-mfe/shared-types/permissions';

// ✅ Importar Context API
import {
  useConfiguracionesSIGL,
  casosPorEstado,
  EstadoKanban,
  ConfiguracionModulo,
  TipoProcesoJudicial,
  TipoAuto,
  TipoActuacion,
  MedioControl,
  ConfiguracionTiempo,
  EjeEstrategico,
  TipoIndicador,
  TipoRequerimiento,
  OrganismoControl,
  TipoExcepcionProcesal,
  CausalEspecifica,
  EnteControlPM
} from '../config/ConfiguracionesSIGLContext';

// ✅ Importar componente de plantillas
import { PlantillasDocumentos } from '../configuracion/PlantillasDocumentos';
import { ConfiguracionTasasReferencia } from '../configuracion/ConfiguracionTasasReferencia';
import { ConfiguracionCategoriasDocumentos } from '../configuracion/ConfiguracionCategoriasDocumentos';

const CAMPOS_POR_PASO = [
  {
    paso: 1,
    nombre: 'Paso 1: Datos del Proceso Judicial',
    campos: [
      { id: 'numeroRadicado', label: 'Número de Radicado', defaultObligatorio: true, defaultVisible: true, fixed: true },
      { id: 'medioControl', label: 'Medio de Control', defaultObligatorio: true, defaultVisible: true },
      { id: 'tipoProcesoJudicial', label: 'Tipo de Proceso', defaultObligatorio: true, defaultVisible: true, fixed: true },
      { id: 'etapaProcesal', label: 'Etapa Procesal', defaultObligatorio: true, defaultVisible: true, fixed: true },
      { id: 'cuantia', label: 'Cuantía (COP)', defaultObligatorio: false, defaultVisible: true },
    ]
  },
  {
    paso: 2,
    nombre: 'Paso 2: Datos del/los Demandante(s)',
    campos: [
      { id: 'demandanteTipoPersona', label: 'Tipo de Persona', defaultObligatorio: true, defaultVisible: true },
      { id: 'demandanteIdentificacion', label: 'Identificación (Cédula/NIT)', defaultObligatorio: true, defaultVisible: true },
      { id: 'demandanteNombre', label: 'Nombre / Razón Social', defaultObligatorio: true, defaultVisible: true, fixed: true },
      { id: 'demandanteTelefono', label: 'Teléfono', defaultObligatorio: false, defaultVisible: true },
      { id: 'demandanteCorreo', label: 'Correo Electrónico', defaultObligatorio: true, defaultVisible: true },
      { id: 'demandanteDireccion', label: 'Dirección', defaultObligatorio: false, defaultVisible: true },
      { id: 'demandanteTieneApoderado', label: 'Tiene Apoderado', defaultObligatorio: false, defaultVisible: true },
    ]
  },
  {
    paso: 3,
    nombre: 'Paso 3: Datos del/los Demandado(s)',
    campos: [
      { id: 'demandadoTipoPersona', label: 'Tipo de Persona', defaultObligatorio: true, defaultVisible: true },
      { id: 'demandadoIdentificacion', label: 'Identificación (Cédula/NIT)', defaultObligatorio: true, defaultVisible: true },
      { id: 'demandadoNombre', label: 'Nombre / Razón Social', defaultObligatorio: true, defaultVisible: true, fixed: true },
      { id: 'demandadoCargo', label: 'Cargo / Función', defaultObligatorio: false, defaultVisible: true },
      { id: 'demandadoTelefono', label: 'Teléfono', defaultObligatorio: false, defaultVisible: true },
      { id: 'demandadoCorreo', label: 'Correo Electrónico', defaultObligatorio: true, defaultVisible: true },
      { id: 'demandadoDireccion', label: 'Dirección', defaultObligatorio: false, defaultVisible: true },
      { id: 'demandadoTieneApoderado', label: 'Tiene Apoderado', defaultObligatorio: false, defaultVisible: true },
    ]
  },
  {
    paso: 4,
    nombre: 'Paso 4: Datos de Otros Actores',
    campos: [
      { id: 'otroActorTipoPersona', label: 'Tipo de Persona', defaultObligatorio: false, defaultVisible: true },
      { id: 'otroActorIdentificacion', label: 'Identificación (Cédula/NIT)', defaultObligatorio: false, defaultVisible: true },
      { id: 'otroActorNombre', label: 'Nombre / Razón Social', defaultObligatorio: true, defaultVisible: true },
      { id: 'otroActorRol', label: 'Rol del Actor', defaultObligatorio: true, defaultVisible: true },
      { id: 'otroActorTelefono', label: 'Teléfono', defaultObligatorio: false, defaultVisible: true },
      { id: 'otroActorCorreo', label: 'Correo Electrónico', defaultObligatorio: false, defaultVisible: true },
      { id: 'otroActorDireccion', label: 'Dirección', defaultObligatorio: false, defaultVisible: true },
      { id: 'otroActorTieneApoderado', label: 'Tiene Apoderado', defaultObligatorio: false, defaultVisible: true },
    ]
  },
  {
    paso: 5,
    nombre: 'Paso 5: Juzgado y Ubicación',
    campos: [
      { id: 'juzgadoTribunal', label: 'Juzgado / Tribunal', defaultObligatorio: true, defaultVisible: true },
      { id: 'departamentoCiudad', label: 'Ubicación (Dep/Ciudad)', defaultObligatorio: true, defaultVisible: true },
    ]
  },
  {
    paso: 6,
    nombre: 'Paso 6: Fechas y Asignación',
    campos: [
      { id: 'tipoPlazo', label: 'Tipo de Plazo', defaultObligatorio: true, defaultVisible: true, fixed: true },
      { id: 'termino', label: 'Término (Días)', defaultObligatorio: true, defaultVisible: true, fixed: true },
      { id: 'fechaNotificacion', label: 'Fecha de Notificación', defaultObligatorio: true, defaultVisible: true, fixed: true },
      { id: 'fechaVencimiento', label: 'Fecha de Vencimiento', defaultObligatorio: true, defaultVisible: true, fixed: true },
      { id: 'abogadoResponsable', label: 'Abogado Responsable', defaultObligatorio: false, defaultVisible: true },
    ]
  },
  {
    paso: 7,
    nombre: 'Paso 7: Detalles del Proceso',
    campos: [
      { id: 'pretensiones', label: 'Pretensiones', defaultObligatorio: true, defaultVisible: true },
      { id: 'hechos', label: 'Hechos', defaultObligatorio: false, defaultVisible: true },
      { id: 'observaciones', label: 'Observaciones Adicionales', defaultObligatorio: false, defaultVisible: true },
    ]
  }
];

// ============ COMPONENTE AUXILIAR: SELECTOR DE USUARIO BUSCABLE ============

interface SearchableUserSelectProps {
  usuarios: any[];
  selectedValue: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function SearchableUserSelect({
  usuarios,
  selectedValue,
  onChange,
  disabled
}: SearchableUserSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Encontrar el usuario seleccionado
  const usuarioSeleccionado = usuarios.find(u => String(u.id) === String(selectedValue));

  // Filtrar usuarios por término de búsqueda (nombre, email)
  const usuariosFiltrados = usuarios.filter(u => {
    const term = searchTerm.toLowerCase();
    const nombre = (u.nombreCompleto || u.nombre || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    return nombre.includes(term) || email.includes(term);
  });

  // Cerrar el dropdown al hacer click afuera
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.searchable-select-container')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [isOpen]);

  return (
    <div className="relative searchable-select-container w-full">
      {/* Botón selector principal */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-2.5 py-1 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed select-none text-left"
        style={{ height: '32px' }}
      >
        <span className="truncate">
          {usuarioSeleccionado 
            ? `${usuarioSeleccionado.nombre} (${usuarioSeleccionado.email})` 
            : 'Seleccione un Usuario...'}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-500 shrink-0 ml-1" />
      </button>

      {/* Panel desplegable con buscador */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] p-2 space-y-1.5 min-w-[200px]">
          {/* Input de búsqueda */}
          <div className="relative">
            <input
              type="text"
              autoFocus
              placeholder="Buscar usuario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ height: '28px' }}
            />
          </div>

          {/* Listado de resultados */}
          <div className="max-h-40 overflow-y-auto divide-y divide-gray-100">
            {usuariosFiltrados.length === 0 ? (
              <div className="py-2 px-2 text-center text-xs text-gray-400">
                Sin resultados
              </div>
            ) : (
              usuariosFiltrados.map((u) => {
                const isSelected = String(u.id) === String(selectedValue);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      onChange(u.id);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-blue-50 transition-colors flex flex-col gap-0.5 ${
                      isSelected ? 'bg-blue-50/70 font-semibold text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <span className="truncate">{u.nombre}</span>
                    <span className="text-[10px] text-gray-400 font-normal truncate">{u.email}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ COMPONENTE PRINCIPAL ============

export function ConfiguracionesSIGL() {
  // ✅ Usar Context API en lugar de useState local
  const {
    configuraciones,
    ejesEstrategicos,
    tiposIndicadores,
    tiposRequerimientos,
    organismosControl,
    cambiosPendientes,
    setCambiosPendientes,
    actualizarConfiguraciones,
    actualizarEjesEstrategicos,
    actualizarTiposIndicadores,
    actualizarTiposRequerimientos,
    actualizarOrganismosControl,
    actualizarEntesControlPM,
    entesControlPM,
    guardarConfiguraciones,
    restablecerDefecto,
    savingStatus
  } = useConfiguracionesSIGL();

  const [moduloActivo, setModuloActivo] = useState<string>('defensa-judicial');

  // Estados para modales
  const [showModalAgregarEstado, setShowModalAgregarEstado] = useState(false);
  const [showModalEliminarEstado, setShowModalEliminarEstado] = useState(false);
  const [estadoAEliminar, setEstadoAEliminar] = useState<EstadoKanban | null>(null);
  const [showModalAgregarTipoProceso, setShowModalAgregarTipoProceso] = useState(false);
  const [showModalEliminarTipoProceso, setShowModalEliminarTipoProceso] = useState(false);
  const [tipoProcesoAEliminar, setTipoProcesoAEliminar] = useState<TipoProcesoJudicial | null>(null);
  const [showModalAgregarTipoAuto, setShowModalAgregarTipoAuto] = useState(false);
  const [showModalEliminarTipoAuto, setShowModalEliminarTipoAuto] = useState(false);
  const [tipoAutoAEliminar, setTipoAutoAEliminar] = useState<TipoAuto | null>(null);

  // Estado para tabs de configuración
  const [tabActivo, setTabActivo] = useState<'estados' | 'procesos' | 'autos' | 'tiempos' | 'ejes'>('estados');

  // Estado para expandir/colapsar secciones de configuración
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    procesos: true,
    actuaciones: false,
    kanban: false,
    mediosControl: false,
    autos: false,
    actuacionesDisciplinarias: false,
    excepcionesProcesales: false,
    causalesEspecificas: false,
  });

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  // Estado para expandir/colapsar configuraciones avanzadas de procesos
  const [expandedAvanzados, setExpandedAvanzados] = useState<Record<string, boolean>>({});
  const toggleAvanzado = (tipoId: string) => {
    setExpandedAvanzados(prev => ({
      ...prev,
      [tipoId]: !prev[tipoId]
    }));
  };

  // Estado para expandir/colapsar los pasos dentro de la configuración de campos de procesos
  const [expandedPasos, setExpandedPasos] = useState<Record<string, boolean>>({});
  const togglePaso = (tipoId: string, pasoNum: number) => {
    const key = `${tipoId}-paso-${pasoNum}`;
    setExpandedPasos(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Estado para expandir/colapsar el Kanban de cada proceso
  const [expandedKanban, setExpandedKanban] = useState<Record<string, boolean>>({});
  const toggleKanban = (tipoId: string) => {
    setExpandedKanban(prev => ({
      ...prev,
      [tipoId]: !prev[tipoId]
    }));
  };

  // Estados para Ejes Estratégicos
  const [showModalAgregarEje, setShowModalAgregarEje] = useState(false);
  const [showModalEliminarEje, setShowModalEliminarEje] = useState(false);
  const [ejeAEliminar, setEjeAEliminar] = useState<EjeEstrategico | null>(null);

  // Estados para Tipos de Indicadores
  const [showModalAgregarIndicador, setShowModalAgregarIndicador] = useState(false);
  const [showModalEliminarIndicador, setShowModalEliminarIndicador] = useState(false);
  const [indicadorAEliminar, setIndicadorAEliminar] = useState<TipoIndicador | null>(null);

  // Estados para Tipos de Requerimientos
  const [showModalAgregarRequerimiento, setShowModalAgregarRequerimiento] = useState(false);
  const [showModalEliminarRequerimiento, setShowModalEliminarRequerimiento] = useState(false);

  const [requerimientoAEliminar, setRequerimientoAEliminar] = useState<TipoRequerimiento | null>(null);

  // Estados para Organismos de Control
  const [showModalAgregarOrganismo, setShowModalAgregarOrganismo] = useState(false);
  const [showModalEliminarOrganismo, setShowModalEliminarOrganismo] = useState(false);
  const [organismoAEliminar, setOrganismoAEliminar] = useState<OrganismoControl | null>(null);
  const [correosInput, setCorreosInput] = useState<Record<string, string>>({});
  // Estados para Tipos de Actuaciones
  const [showModalAgregarActuacion, setShowModalAgregarActuacion] = useState(false);
  const [showModalEliminarActuacion, setShowModalEliminarActuacion] = useState(false);
  const [actuacionAEliminar, setActuacionAEliminar] = useState<TipoActuacion | null>(null);

  // Estados para Tipos de Excepciones Procesales
  const [showModalAgregarExcepcion, setShowModalAgregarExcepcion] = useState(false);
  const [showModalEliminarExcepcion, setShowModalEliminarExcepcion] = useState(false);
  const [excepcionAEliminar, setExcepcionAEliminar] = useState<TipoExcepcionProcesal | null>(null);

  // Estados para Causales Específicas
  const [showModalAgregarCausal, setShowModalAgregarCausal] = useState(false);
  const [showModalEliminarCausal, setShowModalEliminarCausal] = useState(false);
  const [causalAEliminar, setCausalAEliminar] = useState<CausalEspecifica | null>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await rolesService.getRoles({ limit: 100 });
        if (response && response.roles) {
          setRoles(response.roles);
        }
      } catch (error) {
        console.error('Error fetching roles in ConfiguracionesSIGL:', error);
      }
    };
    fetchRoles();
  }, []);

  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const response = await authService.getTodosLosUsuariosActivos();
        setUsuarios(response || []);
      } catch (error) {
        console.error('Error fetching active users in ConfiguracionesSIGL:', error);
      }
    };
    fetchUsuarios();
  }, []);  const moduloActual = configuraciones.find(m => m.id === moduloActivo);

  // ✅ Estado para conteo dinámico de expedientes por estado (reemplaza casosPorEstado mock)
  const [conteoDinamico, setConteoDinamico] = useState<Record<string, Record<string, number>>>({
    'defensa-judicial': {},
    'juzgamiento': {},
    'asesoria-juridica': {},
  });

  // Cargar conteo de expedientes dinámicamente
  useEffect(() => {
    const loadExpedientesCounts = async () => {
      try {
        // Cargar expedientes de Defensa Judicial
        const expedientes = await legalService.getExpedientes();
        const conteoDefensa: Record<string, number> = {};
        expedientes.forEach((exp: any) => {
          const etapa = exp.etapaProcesal || exp.etapa || '';
          conteoDefensa[etapa] = (conteoDefensa[etapa] || 0) + 1;
        });

        // Cargar consultas jurídicas
        const consultas = await legalService.getConsultasJuridicas();
        const conteoAsesoria: Record<string, number> = {};

        // Mapeo de estados de backend a frontend para Asesoría Jurídica
        const mapEstadoAsesoria: Record<string, string> = {
          'en_radicacion': 'RADICADA',
          'asignado': 'RADICADA',
          'en_analisis': 'ANÁLISIS',
          'en_revision': 'ANÁLISIS',
          'respondido': 'RESPUESTA',
          'cerrado': 'ENVIADA',
          'vencido': 'RADICADA'
        };

        consultas.forEach((c: any) => {
          const estadoBackend = c.estado || 'en_radicacion';
          const etapaFrontend = mapEstadoAsesoria[estadoBackend] || 'RADICADA';
          conteoAsesoria[etapaFrontend] = (conteoAsesoria[etapaFrontend] || 0) + 1;
        });

        // Cargar procesos de juzgamiento
        const juzgamiento = await legalService.getJuzgamientoProcesos();
        const conteoJuzgamiento: Record<string, number> = {};
        juzgamiento.forEach((j: any) => {
          const etapa = j.etapa || 'E1_AVOCAMIENTO';
          conteoJuzgamiento[etapa] = (conteoJuzgamiento[etapa] || 0) + 1;
        });

        setConteoDinamico({
          'defensa-judicial': conteoDefensa,
          'juzgamiento': conteoJuzgamiento,
          'asesoria-juridica': conteoAsesoria,
        });

        console.log('✅ Conteo dinámico de expedientes cargado:', { conteoDefensa, conteoAsesoria, conteoJuzgamiento });
      } catch (error) {
        console.error('Error cargando conteo de expedientes:', error);
      }
    };

    loadExpedientesCounts();
  }, [moduloActivo]);

  // ============ FUNCIONES DE ESTADOS ============

  const agregarEstado = () => {
    setShowModalAgregarEstado(true);
  };

  const confirmarAgregarEstado = () => {
    if (!moduloActual) return;

    const nuevoEstado: EstadoKanban = {
      id: `estado-${Date.now()}`,
      nombre: 'Nuevo Estado',
      color: '#3B82F6',
      orden: moduloActual.estados.length + 1,
      activo: true,
    };

    actualizarConfiguraciones(configuraciones.map(m =>
      m.id === moduloActivo
        ? { ...m, estados: [...m.estados, nuevoEstado] }
        : m
    ));
    setShowModalAgregarEstado(false);

    toast.success('Estado agregado correctamente', {
      description: 'Se ha agregado un nuevo estado al tablero Kanban',
      duration: 3000
    });
  };

  const solicitarEliminarEstado = (estadoId: string) => {
    const estado = moduloActual?.estados.find(e => e.id === estadoId);
    if (estado) {
      setEstadoAEliminar(estado);
      setShowModalEliminarEstado(true);
    }
  };

  const confirmarEliminarEstado = () => {
    if (!estadoAEliminar) return;

    actualizarConfiguraciones(configuraciones.map(m =>
      m.id === moduloActivo
        ? { ...m, estados: m.estados.filter(e => e.id !== estadoAEliminar.id) }
        : m
    ));
    setShowModalEliminarEstado(false);

    toast.success('Estado eliminado correctamente', {
      description: `"${estadoAEliminar.nombre}" ha sido eliminado del tablero Kanban`,
      duration: 3000
    });

    setEstadoAEliminar(null);
  };

  const actualizarEstado = (estadoId: string, cambios: Partial<EstadoKanban>) => {
    actualizarConfiguraciones(configuraciones.map(m =>
      m.id === moduloActivo
        ? {
          ...m,
          estados: m.estados.map(e =>
            e.id === estadoId ? { ...e, ...cambios } : e
          )
        }
        : m
    ));
  };

  // ============ FUNCIONES DE TIEMPOS ============

  const agregarTiempo = () => {
    if (!moduloActual) return;

    const nuevoTiempo: ConfiguracionTiempo = {
      id: `tiempo-${Date.now()}`,
      tipo: 'Nuevo Término',
      dias: 10,
      alertaDias: 3,
      activo: true,
    };

    actualizarConfiguraciones(configuraciones.map(m =>
      m.id === moduloActivo
        ? { ...m, tiempos: [...m.tiempos, nuevoTiempo] }
        : m
    ));
  };

  const eliminarTiempo = (tiempoId: string) => {
    actualizarConfiguraciones(configuraciones.map(m =>
      m.id === moduloActivo
        ? { ...m, tiempos: m.tiempos.filter(t => t.id !== tiempoId) }
        : m
    ));
  };

  const actualizarTiempo = (tiempoId: string, cambios: Partial<ConfiguracionTiempo>) => {
    actualizarConfiguraciones(configuraciones.map(m =>
      m.id === moduloActivo
        ? {
          ...m,
          tiempos: m.tiempos.map(t =>
            t.id === tiempoId ? { ...t, ...cambios } : t
          )
        }
        : m
    ));
  };

  // ============ FUNCIONES DE TIPOS DE PROCESOS ============

  const agregarTipoProceso = () => {
    setShowModalAgregarTipoProceso(true);
  };

  const confirmarAgregarTipoProceso = () => {
    if (!moduloActual || !moduloActual.tiposProcesos) return;

    const nuevoTipo: TipoProcesoJudicial = {
      id: `tipo-${Date.now()}`,
      nombre: 'Nuevo Tipo de Proceso',
      descripcion: 'Descripción del nuevo tipo de proceso judicial',
      plazo: 10,
      alertaDias: 3,
      activo: true,
    };

    actualizarConfiguraciones(configuraciones.map(m =>
      m.id === moduloActivo
        ? { ...m, tiposProcesos: [...(m.tiposProcesos || []), nuevoTipo] }
        : m
    ));
    setShowModalAgregarTipoProceso(false);

    toast.success('Tipo de proceso agregado correctamente', {
      description: 'Se ha agregado un nuevo tipo de proceso judicial',
      duration: 3000
    });
  };

  const solicitarEliminarTipoProceso = (tipoId: string) => {
    const tipo = moduloActual?.tiposProcesos?.find(t => t.id === tipoId);
    if (tipo) {
      setTipoProcesoAEliminar(tipo);
      setShowModalEliminarTipoProceso(true);
    }
  };

  const confirmarEliminarTipoProceso = () => {
    if (!tipoProcesoAEliminar) return;

    actualizarConfiguraciones(configuraciones.map(m =>
      m.id === moduloActivo
        ? { ...m, tiposProcesos: (m.tiposProcesos || []).filter(t => t.id !== tipoProcesoAEliminar.id) }
        : m
    ));
    setShowModalEliminarTipoProceso(false);

    toast.success('Tipo de proceso eliminado correctamente', {
      description: `"${tipoProcesoAEliminar.nombre}" ha sido eliminado de los tipos de procesos judiciales`,
      duration: 3000
    });

    setTipoProcesoAEliminar(null);
  };

  const actualizarTipoProceso = (tipoId: string, cambios: Partial<TipoProcesoJudicial>) => {
    actualizarConfiguraciones(configuraciones.map(m =>
      m.id === moduloActivo
        ? {
          ...m,
          tiposProcesos: (m.tiposProcesos || []).map(t =>
            t.id === tipoId ? { ...t, ...cambios } : t
          )
        }
        : m
    ));
  };

  // ============ FUNCIONES DE MEDIOS DE CONTROL ============

  const agregarMedioControl = () => {
    if (!moduloActual || !moduloActual.mediosControl) return;

    const nuevoMedio: MedioControl = {
      id: `medio-${Date.now()}`,
      nombre: 'Nuevo Medio de Control',
      descripcion: 'Descripción del nuevo medio de control',
      activo: true,
      orden: (moduloActual.mediosControl?.length || 0) + 1,
    };

    actualizarConfiguraciones(configuraciones.map(m =>
      m.id === moduloActivo
        ? { ...m, mediosControl: [...(m.mediosControl || []), nuevoMedio] }
        : m
    ));

    toast.success('Medio de control agregado correctamente', {
      description: 'Se ha agregado un nuevo medio de control',
      duration: 3000
    });
  };

  const eliminarMedioControl = (medioId: string) => {
    const medio = moduloActual?.mediosControl?.find(m => m.id === medioId);
    if (!medio) return;

    actualizarConfiguraciones(configuraciones.map(m =>
      m.id === moduloActivo
        ? { ...m, mediosControl: (m.mediosControl || []).filter((mc: MedioControl) => mc.id !== medioId) }
        : m
    ));

    toast.success('Medio de control eliminado correctamente', {
      description: `"${medio.nombre}" ha sido eliminado de los medios de control`,
      duration: 3000
    });
  };

  const actualizarMedioControl = (medioId: string, cambios: Partial<MedioControl>) => {
    actualizarConfiguraciones(configuraciones.map(m =>
      m.id === moduloActivo
        ? {
          ...m,
          mediosControl: (m.mediosControl || []).map((mc: MedioControl) =>
            mc.id === medioId ? { ...mc, ...cambios } : mc
          )
        }
        : m
    ));
  };

  // ============ FUNCIONES DE TIPOS DE AUTOS ============

  const agregarTipoAuto = () => {
    setShowModalAgregarTipoAuto(true);
  };

  const confirmarAgregarTipoAuto = () => {
    if (!moduloActual || !moduloActual.tiposAutos) return;

    const nuevoTipo: TipoAuto = {
      id: `auto-${Date.now()}`,
      nombre: 'Nuevo Tipo de Auto',
      descripcion: 'Descripción del nuevo tipo de auto procesal',
      activo: true,
    };

    actualizarConfiguraciones(configuraciones.map(m =>
      m.id === moduloActivo
        ? { ...m, tiposAutos: [...(m.tiposAutos || []), nuevoTipo] }
        : m
    ));
    setCambiosPendientes(true);
    setShowModalAgregarTipoAuto(false);

    toast.success('Tipo de auto agregado correctamente', {
      description: 'Se ha agregado un nuevo tipo de auto procesal',
      duration: 3000
    });
  };

  const solicitarEliminarTipoAuto = (tipoId: string) => {
    const tipo = moduloActual?.tiposAutos?.find(t => t.id === tipoId);
    if (tipo) {
      setTipoAutoAEliminar(tipo);
      setShowModalEliminarTipoAuto(true);
    }
  };

  const confirmarEliminarTipoAuto = () => {
    if (!tipoAutoAEliminar) return;

    actualizarConfiguraciones(configuraciones.map(m =>
      m.id === moduloActivo
        ? { ...m, tiposAutos: (m.tiposAutos || []).filter(t => t.id !== tipoAutoAEliminar.id) }
        : m
    ));
    setCambiosPendientes(true);
    setShowModalEliminarTipoAuto(false);

    toast.success('Tipo de auto eliminado correctamente', {
      description: `"${tipoAutoAEliminar.nombre}" ha sido eliminado de los tipos de autos procesales`,
      duration: 3000
    });

    setTipoAutoAEliminar(null);
  };

  const actualizarTipoAuto = (tipoId: string, cambios: Partial<TipoAuto>) => {
    actualizarConfiguraciones(configuraciones.map(m =>
      m.id === moduloActivo
        ? {
          ...m,
          tiposAutos: (m.tiposAutos || []).map(t =>
            t.id === tipoId ? { ...t, ...cambios } : t
          )
        }
        : m
    ));
    setCambiosPendientes(true);
  };

  // ============ FUNCIONES DE TIPOS DE ACTUACIONES ============

  const agregarTipoActuacion = () => {
    setShowModalAgregarActuacion(true);
  };

  const confirmarAgregarTipoActuacion = () => {
    if (!moduloActual || !moduloActual.tiposActuaciones) return;

    const maxOrden = Math.max(0, ...moduloActual.tiposActuaciones.map(t => t.orden || 0));

    const nuevoTipo: TipoActuacion = {
      id: `actuacion-${Date.now()}`,
      nombre: 'Nuevo Tipo de Actuación',
      descripcion: 'Descripción del nuevo tipo de actuación disciplinaria',
      activo: true,
      orden: maxOrden + 1,
    };

    actualizarConfiguraciones(configuraciones.map(m =>
      m.id === moduloActivo
        ? { ...m, tiposActuaciones: [...(m.tiposActuaciones || []), nuevoTipo] }
        : m
    ));
    setCambiosPendientes(true);
    setShowModalAgregarActuacion(false);

    toast.success('Tipo de actuación agregado correctamente', {
      description: 'Se ha agregado un nuevo tipo de actuación disciplinaria',
      duration: 3000
    });
  };

  const solicitarEliminarTipoActuacion = (tipoId: string) => {
    const tipo = moduloActual?.tiposActuaciones?.find(t => t.id === tipoId);
    if (tipo) {
      setActuacionAEliminar(tipo);
      setShowModalEliminarActuacion(true);
    }
  };

  const confirmarEliminarTipoActuacion = () => {
    if (!actuacionAEliminar) return;

    actualizarConfiguraciones(configuraciones.map(m =>
      m.id === moduloActivo
        ? { ...m, tiposActuaciones: (m.tiposActuaciones || []).filter(t => t.id !== actuacionAEliminar.id) }
        : m
    ));
    setCambiosPendientes(true);
    setShowModalEliminarActuacion(false);

    setActuacionAEliminar(null);
  };

  const actualizarTipoActuacion = (tipoId: string, cambios: Partial<TipoActuacion>) => {
    actualizarConfiguraciones(configuraciones.map(m =>
      m.id === moduloActivo
        ? {
          ...m,
          tiposActuaciones: (m.tiposActuaciones || []).map(t =>
            t.id === tipoId ? { ...t, ...cambios } : t
          )
        }
        : m
    ));
    setCambiosPendientes(true);
  };

  // ============ FUNCIONES DE TIPOS DE EXCEPCIONES PROCESALES ============

  const agregarTipoExcepcion = () => {
    setShowModalAgregarExcepcion(true);
  };

  const confirmarAgregarTipoExcepcion = () => {
    if (!moduloActual || !moduloActual.tiposExcepcionesProcesal) return;

    const maxOrden = Math.max(0, ...moduloActual.tiposExcepcionesProcesal.map(t => t.orden || 0));

    const nuevoTipo: TipoExcepcionProcesal = {
      id: `excepcion-${Date.now()}`,
      nombre: 'Nueva Excepción Procesal',
      descripcion: 'Descripción de la excepción procesal',
      icono: '⚖️',
      activo: true,
      orden: maxOrden + 1,
    };

    actualizarConfiguraciones(configuraciones.map(m =>
      m.id === moduloActivo
        ? { ...m, tiposExcepcionesProcesal: [...(m.tiposExcepcionesProcesal || []), nuevoTipo] }
        : m
    ));
    setCambiosPendientes(true);
    setShowModalAgregarExcepcion(false);

    toast.success('Tipo de excepción agregado correctamente', {
      description: 'Se ha agregado un nuevo tipo de excepción procesal',
      duration: 3000
    });
  };

  const solicitarEliminarTipoExcepcion = (tipoId: string) => {
    const tipo = moduloActual?.tiposExcepcionesProcesal?.find(t => t.id === tipoId);
    if (tipo) {
      setExcepcionAEliminar(tipo);
      setShowModalEliminarExcepcion(true);
    }
  };

  const confirmarEliminarTipoExcepcion = () => {
    if (!excepcionAEliminar) return;

    actualizarConfiguraciones(configuraciones.map(m =>
      m.id === moduloActivo
        ? { ...m, tiposExcepcionesProcesal: (m.tiposExcepcionesProcesal || []).filter(t => t.id !== excepcionAEliminar.id) }
        : m
    ));
    setCambiosPendientes(true);
    setShowModalEliminarExcepcion(false);

    toast.success('Tipo de excepción eliminado correctamente', {
      description: `"${excepcionAEliminar.nombre}" ha sido eliminado`,
      duration: 3000
    });

    setExcepcionAEliminar(null);
  };

  const actualizarTipoExcepcion = (tipoId: string, cambios: Partial<TipoExcepcionProcesal>) => {
    actualizarConfiguraciones(configuraciones.map(m =>
      m.id === moduloActivo
        ? {
          ...m,
          tiposExcepcionesProcesal: (m.tiposExcepcionesProcesal || []).map(t =>
            t.id === tipoId ? { ...t, ...cambios } : t
          )
        }
        : m
    ));
    setCambiosPendientes(true);
  };

  // ============ FUNCIONES DE CAUSALES ESPECÍFICAS ============

  const agregarCausalEspecifica = () => {
    setShowModalAgregarCausal(true);
  };

  const confirmarAgregarCausalEspecifica = () => {
    if (!moduloActual || !moduloActual.causalesEspecificas) return;

    const maxOrden = Math.max(0, ...moduloActual.causalesEspecificas.map(c => c.orden || 0));

    const nuevaCausal: CausalEspecifica = {
      id: `causal-${Date.now()}`,
      nombre: 'Nueva Causal Específica',
      descripcion: 'Descripción de la causal',
      icono: '📋',
      activo: true,
      orden: maxOrden + 1,
    };

    actualizarConfiguraciones(configuraciones.map(m =>
      m.id === moduloActivo
        ? { ...m, causalesEspecificas: [...(m.causalesEspecificas || []), nuevaCausal] }
        : m
    ));
    setCambiosPendientes(true);
    setShowModalAgregarCausal(false);

    toast.success('Causal específica agregada correctamente', {
      description: 'Se ha agregado una nueva causal específica',
      duration: 3000
    });
  };

  const solicitarEliminarCausalEspecifica = (causalId: string) => {
    const causal = moduloActual?.causalesEspecificas?.find(c => c.id === causalId);
    if (causal) {
      setCausalAEliminar(causal);
      setShowModalEliminarCausal(true);
    }
  };

  const confirmarEliminarCausalEspecifica = () => {
    if (!causalAEliminar) return;

    actualizarConfiguraciones(configuraciones.map(m =>
      m.id === moduloActivo
        ? { ...m, causalesEspecificas: (m.causalesEspecificas || []).filter(c => c.id !== causalAEliminar.id) }
        : m
    ));
    setCambiosPendientes(true);
    setShowModalEliminarCausal(false);

    toast.success('Causal específica eliminada correctamente', {
      description: `"${causalAEliminar.nombre}" ha sido eliminada`,
      duration: 3000
    });

    setCausalAEliminar(null);
  };

  const actualizarCausalEspecifica = (causalId: string, cambios: Partial<CausalEspecifica>) => {
    actualizarConfiguraciones(configuraciones.map(m =>
      m.id === moduloActivo
        ? {
          ...m,
          causalesEspecificas: (m.causalesEspecificas || []).map(c =>
            c.id === causalId ? { ...c, ...cambios } : c
          )
        }
        : m
    ));
    setCambiosPendientes(true);
  };

  // ============ DRAG AND DROP ============

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const moduloIndex = configuraciones.findIndex(m => m.id === moduloActivo);
    if (moduloIndex < 0) return;

    const estados = [...configuraciones[moduloIndex].estados];
    const oldIndex = estados.findIndex(e => e.id === active.id);
    const newIndex = estados.findIndex(e => e.id === over.id);

    const reorderedEstados = arrayMove(estados, oldIndex, newIndex);

    actualizarConfiguraciones(configuraciones.map(m =>
      m.id === moduloActivo
        ? { ...m, estados: reorderedEstados.map((e, i) => ({ ...e, orden: i + 1 })) }
        : m
    ));
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
          <div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E0EDFF' }}>
                <Settings size={20} className="sm:w-6 sm:h-6" style={{ color: '#003DA5' }} />
              </div>
              <div>
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <h1 className="text-lg sm:text-2xl font-bold" style={{ color: '#003DA5' }}>
                    Configuraciones SIGL
                  </h1>
                  
                  {/* Indicador de Estado de Guardado con Framer Motion */}
                  <AnimatePresence mode="wait">
                    {savingStatus === 'saving' && (
                      <motion.span
                        key="saving"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 animate-ping" />
                        Guardando...
                      </motion.span>
                    )}
                    {savingStatus === 'saved' && (
                      <motion.span
                        key="saved"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5" />
                        Cambios guardados
                      </motion.span>
                    )}
                    {savingStatus === 'error' && (
                      <motion.span
                        key="error"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5" />
                        Error al guardar
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                  Gestiona estados, columnas y tiempos de todos los tableros Kanban
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <span className="text-xs text-gray-400 hidden md:inline flex-shrink-0">
              ⚡ Guardado automático activo
            </span>
            <button
              onClick={() => {
                guardarConfiguraciones()
                  .catch(() => {});
              }}
              disabled={!cambiosPendientes && savingStatus !== 'saving'}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 rounded-lg font-bold text-xs sm:text-sm border transition-all flex-shrink-0 shadow-sm ${
                savingStatus === 'saving'
                  ? 'bg-blue-50 text-blue-700 border-blue-200 cursor-wait'
                  : savingStatus === 'saved'
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : savingStatus === 'error'
                  ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                  : cambiosPendientes
                  ? 'bg-blue-600 text-white border-transparent hover:bg-blue-700 hover:shadow'
                  : 'bg-gray-100 text-gray-400 border-transparent cursor-not-allowed'
              }`}
            >
              {savingStatus === 'saving' ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : savingStatus === 'saved' ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                  <span>Guardado</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
            <button
              onClick={restablecerDefecto}
              className="flex items-center gap-1 sm:gap-2 px-3 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all flex-shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Restablecer</span>
            </button>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        {/* Sidebar de Módulos */}
        <div className="lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-gray-200 overflow-y-auto">
          <div className="p-3 sm:p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2 sm:mb-3">
              Módulos Kanban
            </h3>
            <div className="space-y-1 flex lg:flex-col overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
              {configuraciones.map((modulo) => (
                <button
                  key={modulo.id}
                  onClick={() => setModuloActivo(modulo.id)}
                  className={`flex-shrink-0 lg:w-full text-left px-3 py-2 sm:py-2.5 rounded-lg transition-colors whitespace-nowrap lg:whitespace-normal ${moduloActivo === modulo.id
                    ? 'bg-blue-50 text-blue-900 font-semibold'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4" />
                    <span className="text-xs sm:text-sm">{modulo.nombre}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 ml-6 hidden lg:flex">
                    <span className="text-xs text-gray-500">
                      {modulo.estados.filter(e => e.activo).length} estados
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">
                      {modulo.tiempos.filter(t => t.activo).length} términos
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 🆕 NUEVA SECCIÓN: Configuraciones Globales */}
          <div className="p-3 sm:p-4 border-t border-gray-200">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2 sm:mb-3">
              Configuraciones Globales
            </h3>
            <div className="space-y-1">
              <button
                onClick={() => setModuloActivo('plan-accion')}
                className={`w-full text-left px-3 py-2 sm:py-2.5 rounded-lg transition-colors ${moduloActivo === 'plan-accion'
                  ? 'bg-blue-50 text-blue-900 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">Plan de Acción</span>
                </div>
                <div className="flex flex-col gap-0.5 mt-1 ml-6">
                  <span className="text-xs text-gray-500">
                    {ejesEstrategicos.filter(e => e.activo).length} ejes • {tiposIndicadores.filter(t => t.activo).length} indicadores
                  </span>
                </div>
              </button>

              <button
                onClick={() => setModuloActivo('organos-control')}
                className={`w-full text-left px-3 py-2 sm:py-2.5 rounded-lg transition-colors ${moduloActivo === 'organos-control'
                  ? 'bg-blue-50 text-blue-900 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">Órganos de Control</span>
                </div>
                <div className="flex items-center gap-2 mt-1 ml-6">
                  <span className="text-xs text-gray-500">
                    {tiposRequerimientos.filter(t => t.activo).length} tipos • {organismosControl.filter(o => o.activo).length} organismos
                  </span>
                </div>
              </button>

              <button
                onClick={() => setModuloActivo('planes-mejoramiento-config')}
                className={`w-full text-left px-3 py-2 sm:py-2.5 rounded-lg transition-colors ${moduloActivo === 'planes-mejoramiento-config'
                  ? 'bg-blue-50 text-blue-900 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">Planes de Mejoramiento</span>
                </div>
                <div className="flex items-center gap-2 mt-1 ml-6">
                  <span className="text-xs text-gray-500">
                    {entesControlPM.filter(e => e.activo).length} entes de control
                  </span>
                </div>
              </button>

              <button
                onClick={() => setModuloActivo('categorias-documentos')}
                className={`w-full text-left px-3 py-2 sm:py-2.5 rounded-lg transition-colors ${moduloActivo === 'categorias-documentos'
                  ? 'bg-blue-50 text-blue-900 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">Categorías Documentos</span>
                </div>
                <div className="flex items-center gap-2 mt-1 ml-6">
                  <span className="text-xs text-gray-500">
                    Gestión de tipos de documentos
                  </span>
                </div>
              </button>

              <button
                onClick={() => setModuloActivo('plantillas-oficios')}
                className={`w-full text-left px-3 py-2 sm:py-2.5 rounded-lg transition-colors ${moduloActivo === 'plantillas-oficios'
                  ? 'bg-blue-50 text-blue-900 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">Plantillas</span>
                </div>
                <div className="flex items-center gap-2 mt-1 ml-6">
                  <span className="text-xs text-gray-500">
                    Logo y diseño de documentos
                  </span>
                </div>
              </button>

              <button
                onClick={() => setModuloActivo('tasas-referencia')}
                className={`w-full text-left px-3 py-2 sm:py-2.5 rounded-lg transition-colors ${moduloActivo === 'tasas-referencia'
                  ? 'bg-blue-50 text-blue-900 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <Landmark className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">Tasas de Referencia</span>
                </div>
                <div className="flex items-center gap-2 mt-1 ml-6">
                  <span className="text-xs text-gray-500">
                    Cálculo de intereses coactivos
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Panel Principal */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">

          {/* 🆕 Panel de Tasas de Referencia */}
          {moduloActivo === 'tasas-referencia' && (
            <ConfiguracionTasasReferencia />
          )}

          {/* 🆕 Panel de Categorías de Documentos */}
          {moduloActivo === 'categorias-documentos' && (
            <ConfiguracionCategoriasDocumentos />
          )}

          {/* 🆕 Panel de Plan de Acción - Ejes Estratégicos */}
          {moduloActivo === 'plan-accion' && (
            <div className="w-full space-y-6">
              {/* Configuración de Ejes Estratégicos */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 flex-col sm:flex-row gap-3">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Target className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#003DA5' }} />
                        Ejes Estratégicos del PEI
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        Configurar los ejes estratégicos que estarán disponibles en el formulario de Nuevo Indicador
                      </p>
                    </div>
                    <button
                      onClick={() => setShowModalAgregarEje(true)}
                      className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm text-white transition-all hover:shadow-lg flex-shrink-0"
                      style={{
                        background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
                        boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
                      }}
                    >
                      <Plus className="w-4 h-4" />
                      <span>Agregar Eje</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {ejesEstrategicos.map((eje, index) => (
                      <div
                        key={eje.id}
                        className="p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-white rounded-lg border border-blue-200"
                      >
                        {/* Fila 1: Orden + Ícono + Nombre + Eliminar */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center font-bold text-xs sm:text-sm text-gray-700 flex-shrink-0">
                            {index + 1}
                          </div>

                          <input
                            type="text"
                            value={eje.icono}
                            onChange={(event) => {
                              const nuevosEjes = ejesEstrategicos.map(item =>
                                item.id === eje.id ? { ...item, icono: event.target.value } : item
                              );
                              actualizarEjesEstrategicos(nuevosEjes);
                            }}
                            className="w-12 sm:w-14 px-2 py-1.5 text-center text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="🏛️"
                            maxLength={2}
                          />

                          <input
                            type="text"
                            value={eje.nombre}
                            onChange={(event) => {
                              const nuevosEjes = ejesEstrategicos.map(item =>
                                item.id === eje.id ? { ...item, nombre: event.target.value } : item
                              );
                              actualizarEjesEstrategicos(nuevosEjes);
                            }}
                            className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-sm font-semibold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Nombre del eje estratégico"
                          />

                          <button
                            onClick={() => {
                              setEjeAEliminar(eje);
                              setShowModalEliminarEje(true);
                            }}
                            className="min-h-[44px] min-w-[44px] p-2.5 sm:p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 flex items-center justify-center"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Fila 2: Descripción */}
                        <div className="mb-3">
                          <textarea
                            value={eje.descripcion}
                            onChange={(event) => {
                              const nuevosEjes = ejesEstrategicos.map(item =>
                                item.id === eje.id ? { ...item, descripcion: event.target.value } : item
                              );
                              actualizarEjesEstrategicos(nuevosEjes);
                            }}
                            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            placeholder="Descripción del eje estratégico..."
                            rows={2}
                          />
                        </div>

                        {/* Fila 3: Color + Activo */}
                        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                          {/* Color */}
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <label className="text-xs sm:text-sm text-gray-700 font-medium whitespace-nowrap">
                              Color:
                            </label>
                            <input
                              type="color"
                              value={eje.color}
                              onChange={(event) => {
                                const nuevosEjes = ejesEstrategicos.map(item =>
                                  item.id === eje.id ? { ...item, color: event.target.value } : item
                                );
                                actualizarEjesEstrategicos(nuevosEjes);
                              }}
                              className="w-10 h-8 rounded border border-gray-300 cursor-pointer"
                            />
                            <span className="text-xs text-gray-600">{eje.color}</span>
                          </div>

                          {/* Toggle Activo */}
                          <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer ml-auto">
                            <input
                              type="checkbox"
                              checked={eje.activo}
                              onChange={(event) => {
                                const nuevosEjes = ejesEstrategicos.map(item =>
                                  item.id === eje.id ? { ...item, activo: event.target.checked } : item
                                );
                                actualizarEjesEstrategicos(nuevosEjes);
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-xs sm:text-sm text-gray-700 font-medium">
                              Activo
                            </span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Info adicional */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 bg-blue-50 border-l-4 border-blue-500">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-blue-900 mb-1">
                        Información Importante
                      </h3>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Los ejes estratégicos se utilizan en el módulo de Plan de Acción</li>
                        <li>• Solo los ejes activos aparecerán en el formulario de Nuevo Indicador</li>
                        <li>• El ícono debe ser un emoji (copia y pega desde emojipedia.org)</li>
                        <li>• Los cambios se guardarán al hacer click en "Guardar Cambios"</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Configuración de Tipos de Indicadores */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 flex-col sm:flex-row gap-3">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Target className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#003DA5' }} />
                        Tipos de Indicadores
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        Configurar los tipos de indicadores que estarán disponibles en el formulario de Nuevo Indicador
                      </p>
                    </div>
                    <button
                      onClick={() => setShowModalAgregarIndicador(true)}
                      className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm text-white transition-all hover:shadow-lg flex-shrink-0"
                      style={{
                        background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
                        boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
                      }}
                    >
                      <Plus className="w-4 h-4" />
                      <span>Agregar Tipo</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {tiposIndicadores.map((tipo, index) => (
                      <div
                        key={tipo.id}
                        className="p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-white rounded-lg border border-blue-200"
                      >
                        {/* Fila 1: Orden + Ícono + Nombre + Eliminar */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center font-bold text-xs sm:text-sm text-gray-700 flex-shrink-0">
                            {index + 1}
                          </div>

                          <input
                            type="text"
                            value={tipo.icono}
                            onChange={(event) => {
                              const nuevosIndicadores = tiposIndicadores.map(item =>
                                item.id === tipo.id ? { ...item, icono: event.target.value } : item
                              );
                              actualizarTiposIndicadores(nuevosIndicadores);
                            }}
                            className="w-12 sm:w-14 px-2 py-1.5 text-center text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="🎯"
                            maxLength={2}
                          />

                          <input
                            type="text"
                            value={tipo.nombre}
                            onChange={(event) => {
                              const nuevosIndicadores = tiposIndicadores.map(item =>
                                item.id === tipo.id ? { ...item, nombre: event.target.value } : item
                              );
                              actualizarTiposIndicadores(nuevosIndicadores);
                            }}
                            className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-sm font-semibold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Nombre del tipo de indicador"
                          />

                          <button
                            onClick={() => {
                              setIndicadorAEliminar(tipo);
                              setShowModalEliminarIndicador(true);
                            }}
                            className="min-h-[44px] min-w-[44px] p-2.5 sm:p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 flex items-center justify-center"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Fila 2: Descripción */}
                        <div className="mb-3">
                          <textarea
                            value={tipo.descripcion}
                            onChange={(event) => {
                              const nuevosIndicadores = tiposIndicadores.map(item =>
                                item.id === tipo.id ? { ...item, descripcion: event.target.value } : item
                              );
                              actualizarTiposIndicadores(nuevosIndicadores);
                            }}
                            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            placeholder="Descripción del tipo de indicador..."
                            rows={2}
                          />
                        </div>

                        {/* Fila 3: Color + Activo */}
                        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                          {/* Color */}
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <label className="text-xs sm:text-sm text-gray-700 font-medium whitespace-nowrap">
                              Color:
                            </label>
                            <input
                              type="color"
                              value={tipo.color}
                              onChange={(event) => {
                                const nuevosIndicadores = tiposIndicadores.map(item =>
                                  item.id === tipo.id ? { ...item, color: event.target.value } : item
                                );
                                actualizarTiposIndicadores(nuevosIndicadores);
                              }}
                              className="w-10 h-8 rounded border border-gray-300 cursor-pointer"
                            />
                            <span className="text-xs text-gray-600">{tipo.color}</span>
                          </div>

                          {/* Toggle Activo */}
                          <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer ml-auto">
                            <input
                              type="checkbox"
                              checked={tipo.activo}
                              onChange={(event) => {
                                const nuevosIndicadores = tiposIndicadores.map(item =>
                                  item.id === tipo.id ? { ...item, activo: event.target.checked } : item
                                );
                                actualizarTiposIndicadores(nuevosIndicadores);
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-xs sm:text-sm text-gray-700 font-medium">
                              Activo
                            </span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* 🆕 Panel de Órganos de Control - Tipos de Requerimientos */}
          {moduloActivo === 'organos-control' && (
            <div className="w-full space-y-8">

              {/* SECCIÓN 1: ORGANISMOS DE CONTROL */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 flex-col sm:flex-row gap-3">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                        <div className="p-1.5 bg-blue-100 rounded-md">
                          <Landmark className="w-5 h-5 text-blue-700" />
                        </div>
                        Organismos de Control
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        Gestiona las entidades de control disponibles en el sistema (ej. Contraloría, Procuraduría)
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const nuevo: OrganismoControl = {
                          id: `org-${Date.now()}`,
                          nombre: 'Nuevo Organismo',
                          descripcion: 'Descripción del organismo de control',
                          correos: [],
                          activo: true
                        };
                        actualizarOrganismosControl([...organismosControl, nuevo]);
                        toast.success('Organismo agregado');
                      }}
                      className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm text-white transition-all hover:shadow-lg flex-shrink-0"
                      style={{
                        background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
                        boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
                      }}
                    >
                      <Plus className="w-4 h-4" />
                      <span>Agregar Organismo</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {organismosControl.map((organismo, index) => (
                      <div
                        key={organismo.id}
                        className="p-3 sm:p-4 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                      >
                        {/* Header: Nombre + Activo + Eliminar */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-xs text-gray-500 shadow-sm flex-shrink-0">
                            {index + 1}
                          </div>

                          <input
                            type="text"
                            value={organismo.nombre}
                            onChange={(e) => {
                              const nuevos = organismosControl.map(item =>
                                item.id === organismo.id ? { ...item, nombre: e.target.value } : item
                              );
                              actualizarOrganismosControl(nuevos);
                            }}
                            className="flex-1 px-3 py-2 text-sm font-bold text-gray-800 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            placeholder="Nombre de la entidad..."
                          />

                          <div className="flex items-center gap-2 ml-2">
                            <label className="flex items-center gap-2 cursor-pointer bg-white px-2 py-1 rounded-md border border-gray-200 shadow-sm hover:bg-gray-50">
                              <input
                                type="checkbox"
                                checked={organismo.activo}
                                onChange={(e) => {
                                  const nuevos = organismosControl.map(item =>
                                    item.id === organismo.id ? { ...item, activo: e.target.checked } : item
                                  );
                                  actualizarOrganismosControl(nuevos);
                                }}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-xs font-medium text-gray-600 select-none">Activo</span>
                            </label>

                            <button
                              onClick={() => {
                                const nuevos = organismosControl.filter(o => o.id !== organismo.id);
                                actualizarOrganismosControl(nuevos);
                                toast.success('Organismo eliminado');
                              }}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar organismo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Descripción */}
                        <textarea
                          value={organismo.descripcion}
                          onChange={(e) => {
                            const nuevos = organismosControl.map(item =>
                              item.id === organismo.id ? { ...item, descripcion: e.target.value } : item
                            );
                            actualizarOrganismosControl(nuevos);
                          }}
                          className="w-full px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
                          placeholder="Descripción o función de la entidad..."
                          rows={2}
                        />

                        {/* Correos electrónicos */}
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                            <Mail className="w-3 h-3 text-blue-600" />
                            Correos electrónicos
                          </p>

                          {/* Lista de correos existentes */}
                          {(organismo.correos ?? []).length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {(organismo.correos ?? []).map((correo, ci) => (
                                <span
                                  key={ci}
                                  className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-full"
                                >
                                  <AtSign className="w-3 h-3 flex-shrink-0" />
                                  {correo}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nuevos = organismosControl.map(item =>
                                        item.id === organismo.id
                                          ? { ...item, correos: (item.correos ?? []).filter((_, i) => i !== ci) }
                                          : item
                                      );
                                      actualizarOrganismosControl(nuevos);
                                    }}
                                    className="ml-0.5 text-blue-500 hover:text-red-500 transition-colors"
                                    title="Eliminar correo"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Input para agregar nuevo correo */}
                          <div className="flex gap-2">
                            <input
                              type="email"
                              value={correosInput[organismo.id] ?? ''}
                              onChange={(e) =>
                                setCorreosInput(prev => ({ ...prev, [organismo.id]: e.target.value }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const val = (correosInput[organismo.id] ?? '').trim();
                                  if (!val) return;
                                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
                                    toast.error('Correo electrónico inválido');
                                    return;
                                  }
                                  if ((organismo.correos ?? []).includes(val)) {
                                    toast.error('Este correo ya está registrado');
                                    return;
                                  }
                                  const nuevos = organismosControl.map(item =>
                                    item.id === organismo.id
                                      ? { ...item, correos: [...(item.correos ?? []), val] }
                                      : item
                                  );
                                  actualizarOrganismosControl(nuevos);
                                  setCorreosInput(prev => ({ ...prev, [organismo.id]: '' }));
                                }
                              }}
                              placeholder="correo@entidad.gov.co y presiona Enter..."
                              className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const val = (correosInput[organismo.id] ?? '').trim();
                                if (!val) return;
                                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
                                  toast.error('Correo electrónico inválido');
                                  return;
                                }
                                if ((organismo.correos ?? []).includes(val)) {
                                  toast.error('Este correo ya está registrado');
                                  return;
                                }
                                const nuevos = organismosControl.map(item =>
                                  item.id === organismo.id
                                    ? { ...item, correos: [...(item.correos ?? []), val] }
                                    : item
                                );
                                actualizarOrganismosControl(nuevos);
                                setCorreosInput(prev => ({ ...prev, [organismo.id]: '' }));
                              }}
                              className="px-2.5 py-1.5 rounded-lg text-white text-xs font-semibold flex items-center gap-1 transition-all hover:opacity-90"
                              style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' }}
                              title="Agregar correo"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Agregar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {organismosControl.length === 0 && (
                      <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                        <p>No hay organismos de control registrados.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>


              {/* SECCIÓN 2: TIPOS DE REQUERIMIENTOS (EXISTENTE) */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 flex-col sm:flex-row gap-3">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#003DA5' }} />
                        Tipos de Requerimientos
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        Configurar los tipos de requerimientos que pueden solicitar los órganos de control
                      </p>
                    </div>
                    <button
                      onClick={() => setShowModalAgregarRequerimiento(true)}
                      className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm text-white transition-all hover:shadow-lg flex-shrink-0"
                      style={{
                        background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
                        boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
                      }}
                    >
                      <Plus className="w-4 h-4" />
                      <span>Agregar Tipo</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {tiposRequerimientos.map((tipo, index) => (
                      <div
                        key={tipo.id}
                        className="p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-white rounded-lg border border-blue-200"
                      >
                        {/* Fila 1: Orden + Ícono + Nombre + Eliminar */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-xs text-blue-600 shadow-sm flex-shrink-0">
                            {index + 1}
                          </div>

                          <input
                            type="text"
                            value={tipo.nombre}
                            onChange={(e) => {
                              const nuevosRequerimientos = tiposRequerimientos.map(t =>
                                t.id === tipo.id ? { ...t, nombre: e.target.value } : t
                              );
                              actualizarTiposRequerimientos(nuevosRequerimientos);
                            }}
                            className="flex-1 px-3 py-2 text-sm font-bold text-gray-800 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            placeholder="Nombre del tipo de requerimiento"
                          />

                          <button
                            onClick={() => {
                              setRequerimientoAEliminar(tipo);
                              setShowModalEliminarRequerimiento(true);
                            }}
                            className="min-h-[44px] min-w-[44px] p-2.5 sm:p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 flex items-center justify-center"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Fila 2: Descripción */}
                        <div className="mb-3">
                          <textarea
                            value={tipo.descripcion}
                            onChange={(e) => {
                              const nuevosRequerimientos = tiposRequerimientos.map(t =>
                                t.id === tipo.id ? { ...t, descripcion: e.target.value } : t
                              );
                              actualizarTiposRequerimientos(nuevosRequerimientos);
                            }}
                            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            placeholder="Descripción del tipo de requerimiento..."
                            rows={2}
                          />
                        </div>

                        {/* Fila 3: Color + Activo */}
                        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                          {/* Color */}
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <label className="text-xs sm:text-sm text-gray-700 font-medium whitespace-nowrap">
                              Color:
                            </label>

                            <button
                              onClick={() => {
                                setRequerimientoAEliminar(tipo);
                                setShowModalEliminarRequerimiento(true);
                              }}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar tipo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Descripción */}
                        <textarea
                          value={tipo.descripcion}
                          onChange={(e) => {
                            const nuevosRequerimientos = tiposRequerimientos.map(t =>
                              t.id === tipo.id ? { ...t, descripcion: e.target.value } : t
                            );
                            actualizarTiposRequerimientos(nuevosRequerimientos);
                          }}
                          className="w-full px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
                          placeholder="Descripción del tipo de requerimiento..."
                          rows={2}
                        />
                      </div>
                    ))}
                  </div>


                </div>
              </div>
            </div>
          )}

          {/* 🆕 Panel de Plantillas de Oficios */}
          {moduloActivo === 'planes-mejoramiento-config' && (
            <div className="w-full space-y-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 flex-col sm:flex-row gap-3">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-100 rounded-md">
                          <Target className="w-5 h-5 text-emerald-700" />
                        </div>
                        Entes de Control — Planes de Mejoramiento
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        Gestiona los entes de control disponibles para la creación de planes de mejoramiento (ej. Contraloría, OCI, Procuraduría)
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const nuevo: EnteControlPM = {
                          id: `ente-${Date.now()}`,
                          nombre: 'Nuevo Ente',
                          descripcion: 'Descripción del ente de control',
                          icono: '🏛️',
                          color: '#6B7280',
                          activo: true
                        };
                        actualizarEntesControlPM([...entesControlPM, nuevo]);
                        toast.success('Ente de control agregado');
                      }}
                      className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm text-white transition-all hover:shadow-lg flex-shrink-0"
                      style={{
                        background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                        boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)'
                      }}
                    >
                      <Plus className="w-4 h-4" />
                      <span>Agregar Ente</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {entesControlPM.map((ente, index) => (
                      <div
                        key={ente.id}
                        className="p-3 sm:p-4 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 hover:border-emerald-300 transition-colors"
                      >
                        {/* Header: Color preview + Nombre + Icono + Activo + Eliminar */}
                        <div className="flex items-center gap-3 mb-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0"
                            style={{ backgroundColor: ente.color }}
                          >
                            {ente.icono}
                          </div>

                          <input
                            type="text"
                            value={ente.nombre}
                            onChange={(e) => {
                              const nuevos = entesControlPM.map(item =>
                                item.id === ente.id ? { ...item, nombre: e.target.value } : item
                              );
                              actualizarEntesControlPM(nuevos);
                            }}
                            className="flex-1 px-3 py-2 text-sm font-bold text-gray-800 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                            placeholder="Nombre del ente..."
                          />

                          <div className="flex items-center gap-2 ml-2">
                            <label className="flex items-center gap-2 cursor-pointer bg-white px-2 py-1 rounded-md border border-gray-200 shadow-sm hover:bg-gray-50">
                              <input
                                type="checkbox"
                                checked={ente.activo}
                                onChange={(e) => {
                                  const nuevos = entesControlPM.map(item =>
                                    item.id === ente.id ? { ...item, activo: e.target.checked } : item
                                  );
                                  actualizarEntesControlPM(nuevos);
                                }}
                                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                              />
                              <span className="text-xs font-medium text-gray-600 select-none">Activo</span>
                            </label>

                            <button
                              onClick={() => {
                                const nuevos = entesControlPM.filter(o => o.id !== ente.id);
                                actualizarEntesControlPM(nuevos);
                                toast.success('Ente de control eliminado');
                              }}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar ente"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Icono + Color row */}
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div>
                            <label className="text-xs font-medium text-gray-500 mb-1 block">Icono (emoji)</label>
                            <input
                              type="text"
                              value={ente.icono}
                              onChange={(e) => {
                                const nuevos = entesControlPM.map(item =>
                                  item.id === ente.id ? { ...item, icono: e.target.value } : item
                                );
                                actualizarEntesControlPM(nuevos);
                              }}
                              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                              placeholder="🏛️"
                              maxLength={4}
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-500 mb-1 block">Color</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={ente.color}
                                onChange={(e) => {
                                  const nuevos = entesControlPM.map(item =>
                                    item.id === ente.id ? { ...item, color: e.target.value } : item
                                  );
                                  actualizarEntesControlPM(nuevos);
                                }}
                                className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                              />
                              <input
                                type="text"
                                value={ente.color}
                                onChange={(e) => {
                                  const nuevos = entesControlPM.map(item =>
                                    item.id === ente.id ? { ...item, color: e.target.value } : item
                                  );
                                  actualizarEntesControlPM(nuevos);
                                }}
                                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-mono"
                                placeholder="#003DA5"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Descripción */}
                        <textarea
                          value={ente.descripcion}
                          onChange={(e) => {
                            const nuevos = entesControlPM.map(item =>
                              item.id === ente.id ? { ...item, descripcion: e.target.value } : item
                            );
                            actualizarEntesControlPM(nuevos);
                          }}
                          className="w-full px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none bg-white"
                          placeholder="Descripción del ente de control..."
                          rows={2}
                        />
                      </div>
                    ))}

                    {entesControlPM.length === 0 && (
                      <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                        <p>No hay entes de control registrados.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {moduloActivo === 'plantillas-oficios' && (
            <PlantillasDocumentos />
          )}

          {/* Panel de módulos Kanban (YA EXISTE) */}
          {moduloActual && (
            <div className="w-full space-y-6">

              {/* Configuración de Tipos de Procesos Judiciales - SOLO PARA DEFENSA JUDICIAL */}
              {moduloActual.tiposProcesos && moduloActual.tiposProcesos.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-3 sm:p-4 lg:p-6">
                    <div 
                      className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 flex-col sm:flex-row gap-3 cursor-pointer select-none"
                      onClick={() => toggleSection('procesos')}
                    >
                      <div className="flex-1">
                        <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                          <Scale className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#003DA5' }} />
                          Tipos de Procesos Judiciales
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                          Define los tipos de procesos que estarán disponibles en el formulario de Nueva Demanda
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_CREATE) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              agregarTipoProceso();
                            }}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg flex-shrink-0"
                            style={{
                              background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
                              boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
                            }}
                          >
                            <Plus className="w-4 h-4" />
                            <span>Agregar Tipo</span>
                          </button>
                        )}
                        <button className="p-1 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                          {expandedSections.procesos ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {expandedSections.procesos && (
                      <AnimatePresence>
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="space-y-3">
                      {moduloActual.tiposProcesos.map((tipo) => (
                        <div
                          key={tipo.id}
                          className="p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-white rounded-lg border border-blue-200"
                        >
                          {/* Fila 1: Nombre + Eliminar */}
                          <div className="flex items-center gap-2 mb-3">
                            <input
                              disabled={!authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_EDIT)}
                              type="text"
                              value={tipo.nombre}
                              onChange={(e) => actualizarTipoProceso(tipo.id, { nombre: e.target.value })}
                              className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-sm font-semibold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Nombre del tipo de proceso"
                            />
                            {authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_DELETE) && (
                              <button
                                onClick={() => solicitarEliminarTipoProceso(tipo.id)}
                                className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {/* Fila 2: Descripción */}
                          <div className="mb-3">
                            <textarea
                              disabled={!authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_EDIT)}
                              value={tipo.descripcion}
                              onChange={(e) => actualizarTipoProceso(tipo.id, { descripcion: e.target.value })}
                              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              placeholder="Descripción del tipo de proceso..."
                              rows={2}
                            />
                          </div>

                          {/* Fila 3: Plazo + Alerta + Activo */}
                          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                            {/* Plazo */}
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <label className="text-xs sm:text-sm text-gray-700 font-medium whitespace-nowrap">
                                Plazo:
                              </label>
                              <input
                                disabled={!authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_EDIT)}
                                type="number"
                                value={tipo.plazo}
                                onChange={(e) => actualizarTipoProceso(tipo.id, { plazo: parseInt(e.target.value) || 0 })}
                                className="w-14 sm:w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                min="1"
                              />
                              <span className="text-xs sm:text-sm text-gray-600">
                                {tipo.unidadTermino === 'horas' || tipo.unidadTermino === 'Horas' ? 'horas' : 
                                 tipo.unidadTermino === 'Ambos' ? 'días/hrs' : 'días'}
                              </span>
                            </div>

                            {/* Unidad de Medida */}
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <label className="text-xs sm:text-sm text-gray-700 font-medium whitespace-nowrap">
                                Medir en:
                              </label>
                              <select
                                disabled={!authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_EDIT)}
                                value={tipo.unidadTermino || 'dias'}
                                onChange={(e) => actualizarTipoProceso(tipo.id, { unidadTermino: e.target.value as any })}
                                className="px-2 py-1.5 bg-white border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700"
                                style={{ height: '38px' }}
                              >
                                <option value="Dias Habiles">Días Hábiles</option>
                                <option value="Dias Calendario">Días Calendario</option>
                                <option value="Horas">Horas</option>
                                <option value="Ambos">Ambos (Días y Horas)</option>
                                <option value="dias" className="hidden">Días</option>
                                <option value="horas" className="hidden">Horas</option>
                              </select>
                            </div>

                            {/* Alerta */}
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <label className="text-xs sm:text-sm text-gray-700 font-medium whitespace-nowrap">
                                Alerta:
                              </label>
                              <input
                                disabled={!authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_EDIT)}
                                type="number"
                                value={tipo.alertaDias}
                                onChange={(e) => actualizarTipoProceso(tipo.id, { alertaDias: parseInt(e.target.value) || 0 })}
                                className="w-14 sm:w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                min="1"
                              />
                              <span className="text-xs sm:text-sm text-gray-600 hidden sm:inline">
                                {tipo.unidadTermino === 'horas' || tipo.unidadTermino === 'Horas' ? 'horas antes' : 
                                 tipo.unidadTermino === 'Ambos' ? 'días/hrs antes' : 'días antes'}
                              </span>
                              <span className="text-xs text-gray-600 sm:hidden">
                                {tipo.unidadTermino === 'horas' || tipo.unidadTermino === 'Horas' ? 'h.a.' : 'd.a.'}
                              </span>
                            </div>

                            {/* Rol Autorizado */}
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <label className="text-xs sm:text-sm text-gray-700 font-medium whitespace-nowrap">
                                Rol Autorizado:
                              </label>
                              <select
                                disabled={!authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_EDIT)}
                                value={tipo.rolAsociado || ''}
                                onChange={(e) => actualizarTipoProceso(tipo.id, { rolAsociado: e.target.value || undefined })}
                                className="px-2 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                              >
                                <option value="">Todos los roles</option>
                                {roles.map((r: any) => (
                                  <option key={r.id} value={r.code || r.name}>
                                    {r.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Estado del Kanban */}
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <span className="text-xs text-gray-700 font-medium whitespace-nowrap">Kanban:</span>
                              {tipo.estados && tipo.estados.length > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                                  <LayoutGrid className="w-3 h-3 text-green-600" />
                                  Personalizado ({tipo.estados.length} col.)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
                                  <LayoutGrid className="w-3 h-3 text-gray-400" />
                                  Hereda General
                                </span>
                              )}
                            </div>

                            {/* Toggle Activo */}
                            <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer ml-auto">
                              <input
                                disabled={!authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_EDIT)}
                                type="checkbox"
                                checked={tipo.activo}
                                onChange={(e) => actualizarTipoProceso(tipo.id, { activo: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-xs sm:text-sm text-gray-700 font-medium">
                                Activo
                              </span>
                            </label>
                          </div>

                          {/* Seccion Kanban del Proceso */}
                          <div className="mt-4 pt-4 border-t border-gray-200/80 space-y-3">
                            <div
                              onClick={() => {
                                if (tipo.estados && tipo.estados.length > 0) {
                                  toggleKanban(tipo.id);
                                }
                              }}
                              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200 ${
                                tipo.estados && tipo.estados.length > 0
                                  ? 'cursor-pointer hover:bg-gray-100/70 transition-colors select-none'
                                  : ''
                              }`}
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800 uppercase tracking-wider">
                                  <LayoutGrid className="w-4 h-4 text-blue-600" />
                                  <span>Tablero Kanban del Proceso</span>
                                  {tipo.estados && tipo.estados.length > 0 && (
                                    expandedKanban[tipo.id] ? (
                                      <ChevronUp className="w-3.5 h-3.5 text-gray-500 ml-1" />
                                    ) : (
                                      <ChevronDown className="w-3.5 h-3.5 text-gray-500 ml-1" />
                                    )
                                  )}
                                </div>
                                <p className="text-[11px] text-gray-500">
                                  {tipo.estados && tipo.estados.length > 0
                                    ? `Este proceso utiliza un flujo personalizado de ${tipo.estados.length} columnas. ${expandedKanban[tipo.id] ? '(Haga clic para colapsar)' : '(Haga clic para expandir y configurar)'}`
                                    : 'Este proceso hereda el flujo de columnas por defecto del Kanban General.'}
                                </p>
                              </div>
                              
                              {tipo.estados && tipo.estados.length > 0 ? (
                                <button
                                  type="button"
                                  disabled={!authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_EDIT)}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    actualizarTipoProceso(tipo.id, { estados: undefined });
                                    toast.info('Se ha restablecido el Kanban al general heredado');
                                  }}
                                  className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-200 font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-center cursor-pointer"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" /> Revertir a Kanban General
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={!authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_EDIT)}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const defaultEstados = moduloActual.estados.map((est) => ({
                                      ...est,
                                      aprobacionTipo: 'ninguno' as const
                                    }));
                                    actualizarTipoProceso(tipo.id, { estados: defaultEstados });
                                    setExpandedKanban(prev => ({ ...prev, [tipo.id]: true }));
                                    toast.success('Tablero personalizado creado con las columnas por defecto.');
                                  }}
                                  className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors self-start sm:self-center cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" /> Configurar Kanban Personalizado
                                </button>
                              )}
                            </div>

                            {tipo.estados && tipo.estados.length > 0 && expandedKanban[tipo.id] && (
                              <div className="space-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-200 mt-2">
                                <div className="space-y-2">
                                  {tipo.estados.map((est, colIdx) => (
                                    <div
                                      key={est.id}
                                      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all p-3 flex flex-col gap-3"
                                    >
                                      <div className="flex flex-wrap items-center gap-3">
                                        {/* Reorder Buttons */}
                                        <div className="flex flex-col gap-0.5">
                                          <button
                                            disabled={colIdx === 0 || !authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_EDIT)}
                                            type="button"
                                            onClick={() => {
                                              const currentEstados = tipo.estados ? [...tipo.estados] : [];
                                              if (colIdx > 0) {
                                                const temp = currentEstados[colIdx];
                                                currentEstados[colIdx] = currentEstados[colIdx - 1];
                                                currentEstados[colIdx - 1] = temp;
                                                const updated = currentEstados.map((item, idx) => ({ ...item, orden: idx + 1 }));
                                                actualizarTipoProceso(tipo.id, { estados: updated });
                                              }
                                            }}
                                            className="p-1 hover:bg-gray-100 rounded text-gray-500 disabled:opacity-30 transition-colors"
                                          >
                                            <ChevronUp className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            disabled={colIdx === (tipo.estados?.length || 0) - 1 || !authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_EDIT)}
                                            type="button"
                                            onClick={() => {
                                              const currentEstados = tipo.estados ? [...tipo.estados] : [];
                                              if (colIdx < currentEstados.length - 1) {
                                                const temp = currentEstados[colIdx];
                                                currentEstados[colIdx] = currentEstados[colIdx + 1];
                                                currentEstados[colIdx + 1] = temp;
                                                const updated = currentEstados.map((item, idx) => ({ ...item, orden: idx + 1 }));
                                                actualizarTipoProceso(tipo.id, { estados: updated });
                                              }
                                            }}
                                            className="p-1 hover:bg-gray-100 rounded text-gray-500 disabled:opacity-30 transition-colors"
                                          >
                                            <ChevronDown className="w-3.5 h-3.5" />
                                          </button>
                                        </div>

                                        {/* Color Picker */}
                                        <div className="flex flex-col gap-1">
                                          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Color</label>
                                          <div className="flex items-center gap-1.5">
                                            <input
                                              disabled={!authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_EDIT)}
                                              type="color"
                                              value={est.color}
                                              onChange={(e) => {
                                                const currentEstados = tipo.estados ? [...tipo.estados] : [];
                                                const updated = currentEstados.map(item => item.id === est.id ? { ...item, color: e.target.value } : item);
                                                actualizarTipoProceso(tipo.id, { estados: updated });
                                              }}
                                              className="w-7 h-7 rounded border border-gray-300 cursor-pointer"
                                            />
                                          </div>
                                        </div>

                                        {/* Name input */}
                                        <div className="flex-1 min-w-[150px] flex flex-col gap-1">
                                          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Nombre de Columna</label>
                                          <input
                                            disabled={!authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_EDIT)}
                                            type="text"
                                            value={est.nombre}
                                            onChange={(e) => {
                                              const currentEstados = tipo.estados ? [...tipo.estados] : [];
                                              const updated = currentEstados.map(item => item.id === est.id ? { ...item, nombre: e.target.value } : item);
                                              actualizarTipoProceso(tipo.id, { estados: updated });
                                            }}
                                            className="w-full px-2.5 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-800"
                                            style={{ height: '32px' }}
                                          />
                                        </div>

                                        {/* Transition Approval Type Selector */}
                                        <div className="flex flex-col gap-1" style={{ flex: '1.2 1 140px', minWidth: '130px' }}>
                                          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Aprobación para Entrar</label>
                                          <select
                                            disabled={!authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_EDIT)}
                                            value={est.aprobacionTipo || 'ninguno'}
                                            onChange={(e) => {
                                              const currentEstados = tipo.estados ? [...tipo.estados] : [];
                                              const val = e.target.value as any;
                                              const updated = currentEstados.map(item => {
                                                if (item.id === est.id) {
                                                  return {
                                                    ...item,
                                                    aprobacionTipo: val,
                                                    aprobacionRol: val === 'rol' ? (roles[0]?.code || roles[0]?.name || '') : undefined,
                                                    aprobacionUsuario: val === 'usuario' ? (usuarios[0]?.id || '') : undefined
                                                  };
                                                }
                                                return item;
                                              });
                                              actualizarTipoProceso(tipo.id, { estados: updated });
                                            }}
                                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700"
                                            style={{ height: '32px' }}
                                          >
                                            <option value="ninguno">Ninguno</option>
                                            <option value="rol">Por Rol</option>
                                            <option value="usuario">Por Usuario</option>
                                          </select>
                                        </div>

                                        {/* Role / User Sub-selector depending on selection */}
                                        {est.aprobacionTipo === 'rol' && (
                                          <div className="flex flex-col gap-1" style={{ flex: '1.5 1 180px', minWidth: '150px' }}>
                                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Rol Requerido</label>
                                            <select
                                              disabled={!authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_EDIT)}
                                              value={est.aprobacionRol || ''}
                                              onChange={(e) => {
                                                const currentEstados = tipo.estados ? [...tipo.estados] : [];
                                                const updated = currentEstados.map(item => item.id === est.id ? { ...item, aprobacionRol: e.target.value } : item);
                                                actualizarTipoProceso(tipo.id, { estados: updated });
                                              }}
                                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700"
                                              style={{ height: '32px' }}
                                            >
                                              <option value="">Seleccione un Rol...</option>
                                              {roles.map((r: any) => (
                                                <option key={r.id} value={r.code || r.name}>
                                                  {r.name}
                                                </option>
                                              ))}
                                            </select>
                                          </div>
                                        )}

                                        {est.aprobacionTipo === 'usuario' && (
                                          <div className="flex flex-col gap-1" style={{ flex: '1.5 1 180px', minWidth: '150px' }}>
                                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Usuario Requerido</label>
                                            <SearchableUserSelect
                                              disabled={!authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_EDIT)}
                                              selectedValue={est.aprobacionUsuario || ''}
                                              onChange={(val) => {
                                                const currentEstados = tipo.estados ? [...tipo.estados] : [];
                                                const updated = currentEstados.map(item => item.id === est.id ? { ...item, aprobacionUsuario: val } : item);
                                                actualizarTipoProceso(tipo.id, { estados: updated });
                                              }}
                                              usuarios={usuarios}
                                            />
                                          </div>
                                        )}

                                        {/* Delete Button */}
                                        {authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_EDIT) && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const currentEstados = tipo.estados ? [...tipo.estados] : [];
                                              const updated = currentEstados.filter(item => item.id !== est.id).map((item, idx) => ({ ...item, orden: idx + 1 }));
                                              actualizarTipoProceso(tipo.id, { estados: updated });
                                            }}
                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 self-end mb-0.5"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_EDIT) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const currentEstados = tipo.estados ? [...tipo.estados] : [];
                                      const nuevoEstado: EstadoKanban = {
                                        id: `est-custom-${Date.now()}`,
                                        nombre: 'Nueva Columna',
                                        color: '#3B82F6',
                                        orden: currentEstados.length + 1,
                                        activo: true,
                                        aprobacionTipo: 'ninguno'
                                      };
                                      actualizarTipoProceso(tipo.id, { estados: [...currentEstados, nuevoEstado] });
                                    }}
                                    className="text-xs bg-white text-blue-700 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 hover:border-blue-300 font-semibold flex items-center gap-1.5 transition-all shadow-sm w-full justify-center"
                                  >
                                    <Plus className="w-3.5 h-3.5" /> Agregar Columna
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Botón de Despliegue de Configuración Avanzada */}
                          <button
                            type="button"
                            onClick={() => toggleAvanzado(tipo.id)}
                            className="w-full mt-3 flex items-center justify-between p-3 bg-gray-50/50 hover:bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 transition-all shadow-sm"
                          >
                            <span className="flex items-center gap-2">
                              <Settings className="w-4 h-4 text-gray-500" />
                              Configuración Avanzada de Campos y Validaciones del Formulario
                            </span>
                            {expandedAvanzados[tipo.id] ? (
                              <ChevronUp className="w-4 h-4 text-gray-500" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                            )}
                          </button>

                          {/* Nuevos campos de configuración para Validaciones y Campos Dinámicos */}
                          {expandedAvanzados[tipo.id] && (
                            <div className="mt-4 pt-4 border-t border-gray-200 space-y-6">
                            {/* Bloque 1: Hora Especial de Vencimiento */}
                            {tipo.unidadTermino === 'horas' ? (
                               <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 flex items-start gap-3">
                                 <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                 <div>
                                   <label className="text-xs font-bold text-blue-900 block mb-0.5">
                                     Medición en Horas Activa
                                   </label>
                                   <p className="text-[11px] text-blue-800 leading-relaxed">
                                     Este proceso se calcula en horas. La fecha de vencimiento se calculará sumando exactamente las horas del plazo a partir de la fecha y hora de notificación. No se requiere configurar una hora de vencimiento fija.
                                   </p>
                                 </div>
                               </div>
                             ) : (
                               <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                 <div className="space-y-1">
                                   <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                                     <Clock className="w-4 h-4 text-blue-600" />
                                     Hora Especial de Vencimiento (HH:mm):
                                   </label>
                                   <p className="text-[11px] text-gray-500">
                                     Hora en la que expiran los plazos en días hábiles. Por defecto es a las 17:00 (05:00 p.m.).
                                   </p>
                                 </div>
                                 <div className="flex items-center gap-2">
                                   <input
                                     disabled={!authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_EDIT)}
                                     type="time"
                                     value={tipo.horaEspecial || ''}
                                     onChange={(e) => actualizarTipoProceso(tipo.id, { horaEspecial: e.target.value || undefined })}
                                     className="w-32 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                   />
                                   <span className="text-xs text-gray-500 font-medium">Por defecto: 17:00</span>
                                 </div>
                               </div>
                             )}

                            {/* Bloque 2: Configuración de Campos por Paso */}
                            <div className="space-y-2">
                              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                                Configuración de Campos por Paso (Visibilidad y Obligatoriedad):
                              </label>
                              <p className="text-[11px] text-gray-500 mb-2">
                                Decide qué campos se muestran u ocultan en cada paso del formulario y cuáles son obligatorios para guardar.
                              </p>
                              <div className="space-y-2.5 bg-gray-50 p-3 rounded-xl border border-gray-200">
                                {CAMPOS_POR_PASO.map((p) => {
                                  const isPasoExpanded = !!expandedPasos[`${tipo.id}-paso-${p.paso}`];
                                  return (
                                    <div key={p.paso} className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm transition-all duration-200">
                                      <div 
                                        onClick={() => togglePaso(tipo.id, p.paso)}
                                        className="bg-gray-100 px-3.5 py-2.5 border-b border-gray-200 flex items-center justify-between cursor-pointer hover:bg-gray-200/80 transition-colors select-none"
                                      >
                                        <span className="font-bold text-xs text-blue-900">{p.nombre}</span>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-semibold text-gray-400">Paso {p.paso} de 7</span>
                                          {isPasoExpanded ? (
                                            <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
                                          ) : (
                                            <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                                          )}
                                        </div>
                                      </div>
                                      
                                      {isPasoExpanded && (
                                        <div className="p-2.5 space-y-1 bg-white">
                                          {p.campos.map((f) => {
                                            const defaultVis = f.defaultVisible !== false;
                                            const defaultObl = f.defaultObligatorio === true;

                                            const isVis = f.fixed 
                                              ? defaultVis 
                                              : (tipo.camposVisibles ? (tipo.camposVisibles[f.id] !== undefined ? tipo.camposVisibles[f.id] : defaultVis) : defaultVis);

                                            const isObl = f.fixed 
                                              ? defaultObl 
                                              : (tipo.camposObligatorios ? (tipo.camposObligatorios[f.id] !== undefined ? tipo.camposObligatorios[f.id] : defaultObl) : defaultObl);

                                            return (
                                              <div key={f.id} className="flex items-center justify-between text-xs p-2 hover:bg-gray-50 rounded-md transition-colors gap-4 border-b border-gray-100 last:border-0">
                                                <span className="font-medium text-gray-700 flex items-center gap-2 flex-wrap">
                                                  {f.label}
                                                  {f.fixed && (
                                                    <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                                                      Sistema
                                                    </span>
                                                  )}
                                                </span>
                                                <div className="flex items-center gap-4">
                                                  {/* Checkbox Visible */}
                                                  <label className="flex items-center gap-1.5 cursor-pointer">
                                                    <input
                                                      disabled={f.fixed || !authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_EDIT)}
                                                      type="checkbox"
                                                      checked={isVis}
                                                      onChange={(e) => {
                                                        const visConfig = tipo.camposVisibles || {};
                                                        const oblConfig = tipo.camposObligatorios || {};
                                                        const newVis = e.target.checked;
                                                        const newObl = newVis ? isObl : false;

                                                        actualizarTipoProceso(tipo.id, {
                                                          camposVisibles: {
                                                            ...visConfig,
                                                            [f.id]: newVis
                                                          },
                                                          camposObligatorios: {
                                                            ...oblConfig,
                                                            [f.id]: newObl
                                                          }
                                                        });
                                                      }}
                                                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className="text-xs text-gray-600">Visible</span>
                                                  </label>

                                                  {/* Checkbox Obligatorio */}
                                                  <label className={`flex items-center gap-1.5 cursor-pointer ${(!isVis || f.fixed) ? 'opacity-50 pointer-events-none' : ''}`}>
                                                    <input
                                                      disabled={f.fixed || !isVis || !authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_EDIT)}
                                                      type="checkbox"
                                                      checked={isObl}
                                                      onChange={(e) => {
                                                        const config = tipo.camposObligatorios || {};
                                                        actualizarTipoProceso(tipo.id, {
                                                          camposObligatorios: {
                                                            ...config,
                                                            [f.id]: e.target.checked
                                                          }
                                                        });
                                                      }}
                                                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className="text-xs text-gray-600">Obligatorio</span>
                                                  </label>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Bloque 3: Campos Adicionales */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                                <div>
                                  <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                                    Campos Adicionales Dinámicos:
                                  </label>
                                  <p className="text-[11px] text-gray-500">
                                    Agrega campos personalizados para este tipo de proceso judicial en pasos específicos del formulario.
                                  </p>
                                </div>
                                {authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_EDIT) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const config = tipo.camposAdicionalesConfig || [];
                                      const nuevoCampo = {
                                        id: `f-${Date.now()}`,
                                        nombre: '',
                                        tipo: 'texto' as const,
                                        obligatorio: false,
                                        paso: 1
                                      };
                                      actualizarTipoProceso(tipo.id, {
                                        camposAdicionalesConfig: [...config, nuevoCampo]
                                      });
                                    }}
                                    className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 font-semibold flex items-center gap-1.5 transition-colors"
                                  >
                                    <Plus className="w-3.5 h-3.5" /> Agregar Campo
                                  </button>
                                )}
                              </div>

                              <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200 max-h-[400px] overflow-y-auto">
                                {(!tipo.camposAdicionalesConfig || tipo.camposAdicionalesConfig.length === 0) ? (
                                  <div className="text-center py-8 bg-white rounded-lg border border-dashed border-gray-300 p-6">
                                    <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                    <p className="text-xs text-gray-400 font-medium">No hay campos adicionales configurados para este tipo de proceso.</p>
                                    <p className="text-[10px] text-gray-400 mt-1">Haz clic en "Agregar Campo" para crear uno nuevo.</p>
                                  </div>
                                ) : (
                                  tipo.camposAdicionalesConfig.map((c, idx) => (
                                    <div 
                                      key={c.id} 
                                      className="flex flex-row flex-wrap gap-2 p-3 bg-white rounded-xl border-l-4 border-l-blue-500 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 items-end"
                                      style={{ width: '100%' }}
                                    >
                                      {/* Nombre del campo */}
                                      <div className="flex flex-col gap-1" style={{ flex: '2 1 140px', minWidth: '120px' }}>
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nombre</label>
                                        <input
                                          disabled={!authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_EDIT)}
                                          type="text"
                                          value={c.nombre}
                                          onChange={(e) => {
                                            const config = [...(tipo.camposAdicionalesConfig || [])];
                                            config[idx] = { ...c, nombre: e.target.value };
                                            actualizarTipoProceso(tipo.id, { camposAdicionalesConfig: config });
                                          }}
                                          className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white font-medium text-gray-800"
                                          style={{ height: '38px' }}
                                          placeholder="Ej: Entidad, Radicado..."
                                        />
                                      </div>
                                      
                                      {/* Tipo de dato */}
                                      <div className="flex flex-col gap-1" style={{ flex: '1 1 100px', minWidth: '95px' }}>
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tipo</label>
                                        <select
                                          disabled={!authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_EDIT)}
                                          value={c.tipo}
                                          onChange={(e) => {
                                            const config = [...(tipo.camposAdicionalesConfig || [])];
                                            const val = e.target.value as any;
                                            const updated: any = { ...c, tipo: val };
                                            if (val === 'documento' && (!c.tiposDocumento || c.tiposDocumento.length === 0)) {
                                              updated.tiposDocumento = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg'];
                                            }
                                            if ((val === 'opciones-multiple' || val === 'lista') && (!c.opciones || c.opciones.length === 0)) {
                                              updated.opciones = [];
                                            }
                                            config[idx] = updated;
                                            actualizarTipoProceso(tipo.id, { camposAdicionalesConfig: config });
                                          }}
                                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium text-gray-700"
                                          style={{ height: '38px' }}
                                        >
                                          <option value="texto">Texto</option>
                                          <option value="alfanumerico">Alfanumérico</option>
                                          <option value="numero">Número</option>
                                          <option value="fecha">Fecha</option>
                                          <option value="booleano">Sí/No</option>
                                          <option value="unico">Único</option>
                                          <option value="documento">Documento</option>
                                          <option value="opciones-multiple">Opción Múltiple</option>
                                          <option value="lista">Lista</option>
                                        </select>
                                      </div>

                                      {/* Paso del Formulario */}
                                      <div className="flex flex-col gap-1" style={{ flex: '1.2 1 120px', minWidth: '115px' }}>
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Paso</label>
                                        <select
                                          disabled={!authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_EDIT)}
                                          value={c.paso || 1}
                                          onChange={(e) => {
                                            const config = [...(tipo.camposAdicionalesConfig || [])];
                                            config[idx] = { ...c, paso: parseInt(e.target.value, 10) };
                                            actualizarTipoProceso(tipo.id, { camposAdicionalesConfig: config });
                                          }}
                                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium text-gray-700"
                                          style={{ height: '38px' }}
                                        >
                                          <option value={1}>Paso 1: Datos</option>
                                          <option value={2}>Paso 2: Demandantes</option>
                                          <option value={3}>Paso 3: Demandados</option>
                                          <option value={4}>Paso 4: Otros</option>
                                          <option value={5}>Paso 5: Juzgado</option>
                                          <option value={6}>Paso 6: Fechas</option>
                                          <option value={7}>Paso 7: Detalles</option>
                                        </select>
                                      </div>

                                      {/* Obligatorio */}
                                      <div className="flex flex-col items-center gap-1.5" style={{ flex: '0 0 50px', minWidth: '50px' }}>
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">Oblig.</label>
                                        <div style={{ height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                          <input
                                            disabled={!authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_EDIT)}
                                            type="checkbox"
                                            checked={c.obligatorio}
                                            onChange={(e) => {
                                              const config = [...(tipo.camposAdicionalesConfig || [])];
                                              config[idx] = { ...c, obligatorio: e.target.checked };
                                              actualizarTipoProceso(tipo.id, { camposAdicionalesConfig: config });
                                            }}
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                          />
                                        </div>
                                      </div>

                                      {/* Botón Eliminar */}
                                      <div className="flex flex-col items-center gap-1" style={{ flex: '0 0 50px', minWidth: '50px' }}>
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">Eliminar</label>
                                        <div style={{ height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                          <button
                                            disabled={!authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_EDIT)}
                                            type="button"
                                            onClick={() => {
                                              const config = (tipo.camposAdicionalesConfig || []).filter(item => item.id !== c.id);
                                              actualizarTipoProceso(tipo.id, { camposAdicionalesConfig: config });
                                            }}
                                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 flex items-center justify-center"
                                            style={{ height: '32px', width: '32px' }}
                                            title="Eliminar campo"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>

                                      {/* Sub-fila de opciones para tipo 'opciones-multiple' o 'lista' */}
                                      {(c.tipo === 'opciones-multiple' || c.tipo === 'lista') && (
                                        <div className="w-full mt-2 pt-2 border-t border-dashed border-gray-200 flex flex-col gap-2 items-start">
                                          <div className="flex items-center justify-between w-full">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                              {c.tipo === 'opciones-multiple' ? 'Opciones (checkboxes)' : 'Opciones del listado'}
                                            </label>
                                            {authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_EDIT) && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const config = [...(tipo.camposAdicionalesConfig || [])];
                                                  const nextOpts = [...(c.opciones || []), ''];
                                                  config[idx] = { ...c, opciones: nextOpts };
                                                  actualizarTipoProceso(tipo.id, { camposAdicionalesConfig: config });
                                                }}
                                                className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded hover:bg-blue-100 font-semibold flex items-center gap-1 transition-colors"
                                              >
                                                <Plus className="w-3 h-3" /> Agregar opción
                                              </button>
                                            )}
                                          </div>
                                          <div className="flex flex-col gap-1.5 w-full">
                                            {(c.opciones || []).length === 0 && (
                                              <p className="text-[10px] text-gray-400 italic">Sin opciones. Haz clic en "Agregar opción".</p>
                                            )}
                                            {(c.opciones || []).map((opt, optIdx) => (
                                              <div key={optIdx} className="flex items-center gap-2 w-full">
                                                <input
                                                  disabled={!authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_EDIT)}
                                                  type="text"
                                                  value={opt}
                                                  onChange={(e) => {
                                                    const config = [...(tipo.camposAdicionalesConfig || [])];
                                                    const nextOpts = [...(c.opciones || [])];
                                                    nextOpts[optIdx] = e.target.value;
                                                    config[idx] = { ...c, opciones: nextOpts };
                                                    actualizarTipoProceso(tipo.id, { camposAdicionalesConfig: config });
                                                  }}
                                                  placeholder={`Opción ${optIdx + 1}...`}
                                                  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white text-gray-800"
                                                />
                                                {authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_EDIT) && (
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      const config = [...(tipo.camposAdicionalesConfig || [])];
                                                      const nextOpts = (c.opciones || []).filter((_, i) => i !== optIdx);
                                                      config[idx] = { ...c, opciones: nextOpts };
                                                      actualizarTipoProceso(tipo.id, { camposAdicionalesConfig: config });
                                                    }}
                                                    className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Eliminar opción"
                                                  >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                  </button>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Sub-fila de discriminación de tipos de documento para tipo 'documento' */}
                                      {c.tipo === 'documento' && (
                                        <div className="w-full mt-2 pt-2 border-t border-dashed border-gray-200 flex flex-col gap-1.5 items-start">
                                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                            Tipos de Documento Permitidos
                                          </label>
                                          <div className="flex flex-wrap gap-4 mt-1">
                                            {[
                                              { label: 'PDF (.pdf)', exts: ['.pdf'] },
                                              { label: 'Word (.doc, .docx)', exts: ['.doc', '.docx'] },
                                              { label: 'Excel (.xls, .xlsx)', exts: ['.xls', '.xlsx'] },
                                              { label: 'Imágenes (.png, .jpg, .jpeg)', exts: ['.png', '.jpg', '.jpeg'] }
                                            ].map((opt) => {
                                              const currentExts = c.tiposDocumento || [];
                                              const isChecked = opt.exts.every(ext => currentExts.includes(ext));
                                              return (
                                                <label key={opt.label} className="flex items-center gap-1.5 text-xs text-gray-600 font-semibold cursor-pointer select-none">
                                                  <input
                                                    disabled={!authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_EDIT)}
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                      const config = [...(tipo.camposAdicionalesConfig || [])];
                                                      let nextExts = [...currentExts];
                                                      if (e.target.checked) {
                                                        opt.exts.forEach(ext => {
                                                          if (!nextExts.includes(ext)) nextExts.push(ext);
                                                        });
                                                      } else {
                                                        nextExts = nextExts.filter(ext => !opt.exts.includes(ext));
                                                      }
                                                      config[idx] = { ...c, tiposDocumento: nextExts };
                                                      actualizarTipoProceso(tipo.id, { camposAdicionalesConfig: config });
                                                    }}
                                                    className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                  />
                                                  {opt.label}
                                                </label>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                            {/* Bloque 4: Vacío - Kanban se movió al primer nivel de la tarjeta */}
                          </div>
                        )}
                      </div>
                    ))}
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    )}
                  </div>
                </div>
              )}

              {/* Configuración de Tipos de Actuaciones Procesales */}
              {moduloActual.tiposActuaciones && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-3 sm:p-4 lg:p-6">
                    <div 
                      className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 flex-col sm:flex-row gap-3 cursor-pointer select-none"
                      onClick={() => toggleSection('actuaciones')}
                    >
                      <div className="flex-1">
                        <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                          <Activity className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#003DA5' }} />
                          Tipos de Actuaciones Procesales
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                          Define los tipos de actuaciones procesales disponibles al registrar una actuación en un expediente.
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_CREATE) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              agregarTipoActuacion();
                            }}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg flex-shrink-0"
                            style={{
                              background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
                              boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
                            }}
                          >
                            <Plus className="w-4 h-4" />
                            <span>Agregar Tipo</span>
                          </button>
                        )}
                        <button className="p-1 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                          {expandedSections.actuaciones ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {expandedSections.actuaciones && (
                      <AnimatePresence>
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="space-y-3">
                      {moduloActual.tiposActuaciones.sort((a,b) => (a.orden || 0) - (b.orden || 0)).map((tipo) => (
                        <div
                          key={tipo.id}
                          className="p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-white rounded-lg border border-blue-200"
                        >
                          {/* Fila 1: Nombre + Eliminar */}
                          <div className="flex items-center gap-2 mb-3">
                            <input
                              disabled={!authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_EDIT)}
                              type="text"
                              value={tipo.nombre}
                              onChange={(e) => actualizarTipoActuacion(tipo.id, { nombre: e.target.value })}
                              className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-sm font-semibold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Nombre de la actuación"
                            />
                            {authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_DELETE) && (
                              <button
                                onClick={() => solicitarEliminarTipoActuacion(tipo.id)}
                                className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {/* Fila 2: Descripción */}
                          <div className="mb-3">
                            <textarea
                              disabled={!authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_EDIT)}
                              value={tipo.descripcion || ''}
                              onChange={(e) => actualizarTipoActuacion(tipo.id, { descripcion: e.target.value })}
                              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              placeholder="Descripción de la actuación..."
                              rows={2}
                            />
                          </div>

                          {/* Fila 3: Orden + Activo */}
                          <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-2">
                              <label className="text-xs sm:text-sm text-gray-700 font-medium">Orden:</label>
                              <input
                                disabled={!authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_EDIT)}
                                type="number"
                                value={tipo.orden || 0}
                                onChange={(e) => actualizarTipoActuacion(tipo.id, { orden: parseInt(e.target.value) || 0 })}
                                className="w-16 px-2 py-1.5 text-sm text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer ml-auto">
                              <input
                                disabled={!authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_EDIT)}
                                type="checkbox"
                                checked={tipo.activo}
                                onChange={(e) => actualizarTipoActuacion(tipo.id, { activo: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-xs sm:text-sm text-gray-700 font-medium">
                                Activo
                              </span>
                            </label>
                          </div>
                        </div>
                      ))}
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    )}
                  </div>
                </div>
              )}

              {/* Configuración de Estados/Columnas Kanban */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-3 sm:p-4 lg:p-6">
                  <div 
                    className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 flex-col sm:flex-row gap-3 cursor-pointer select-none"
                    onClick={() => toggleSection('kanban')}
                  >
                    <div className="flex-1">
                      <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Columns className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                        {moduloActivo === 'asesoria-juridica' 
                          ? 'Etapas del Proceso' 
                          : 'Etapas Procesales / Columnas Kanban'
                        }
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        {moduloActivo === 'asesoria-juridica'
                          ? `Define las etapas del proceso de ${moduloActual.nombre}`
                          : moduloActual.tiposProcesos && moduloActual.tiposProcesos.length > 0
                            ? `Define las etapas procesales que aparecerán en el formulario y como columnas por defecto en el tablero de ${moduloActual.nombre}.`
                            : `Define las etapas procesales que aparecerán en el tablero Kanban de ${moduloActual.nombre}`
                        }
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_CREATE) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            agregarEstado();
                          }}
                          className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm text-white transition-all hover:shadow-lg flex-shrink-0"
                          style={{
                            background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
                            boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
                          }}
                        >
                          <Plus className="w-4 h-4" />
                          <span>Agregar</span>
                        </button>
                      )}
                      <button className="p-1 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                        {expandedSections.kanban ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {expandedSections.kanban && (
                    <AnimatePresence>
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={moduloActual.estados.map(e => e.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {moduloActual.estados.map((estado, index) => (
                          <EstadoSortable
                            key={estado.id}
                            estado={estado}
                            index={index}
                            onUpdate={actualizarEstado}
                            onDelete={solicitarEliminarEstado}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                      </motion.div>
                    </AnimatePresence>
                  )}
                </div>
              </div>

              {/* Configuración de Medios de Control - SOLO PARA DEFENSA JUDICIAL */}
              {moduloActual.mediosControl && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-3 sm:p-4 lg:p-6">
                    <div 
                      className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 flex-col sm:flex-row gap-3 cursor-pointer select-none"
                      onClick={() => toggleSection('mediosControl')}
                    >
                      <div className="flex-1">
                        <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                          <Scale className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#003DA5' }} />
                          Medios de Control
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                          Define los medios de control que estarán disponibles en el formulario de Nueva Demanda
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            agregarMedioControl();
                          }}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg flex-shrink-0"
                          style={{
                            background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
                            boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
                          }}
                        >
                          <Plus className="w-4 h-4" />
                          <span>Agregar Medio</span>
                        </button>
                        <button className="p-1 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                          {expandedSections.mediosControl ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {expandedSections.mediosControl && (
                      <AnimatePresence>
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="space-y-3">
                      {moduloActual.mediosControl.map((medio) => (
                        <div
                          key={medio.id}
                          className="p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-white rounded-lg border border-blue-200"
                        >
                          {/* Fila 1: Nombre + Eliminar */}
                          <div className="flex items-center gap-2 mb-3">
                            <input
                              type="text"
                              value={medio.nombre}
                              onChange={(e) => actualizarMedioControl(medio.id, { nombre: e.target.value })}
                              className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-sm font-semibold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Nombre del medio de control"
                            />
                            <button
                              onClick={() => eliminarMedioControl(medio.id)}
                              className="min-h-[44px] min-w-[44px] p-2.5 sm:p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 flex items-center justify-center"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Fila 2: Descripción */}
                          <div className="mb-3">
                            <textarea
                              value={medio.descripcion}
                              onChange={(e) => actualizarMedioControl(medio.id, { descripcion: e.target.value })}
                              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              placeholder="Descripción del medio de control..."
                              rows={2}
                            />
                          </div>

                          {/* Fila 3: Toggle Activo */}
                          <div className="flex items-center justify-end">
                            <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={medio.activo}
                                onChange={(e) => actualizarMedioControl(medio.id, { activo: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-xs sm:text-sm text-gray-700 font-medium">
                                Activo
                              </span>
                            </label>
                          </div>
                        </div>
                      ))}
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    )}
                  </div>
                </div>
              )}

              {/* Configuración de Tipos de Autos - SOLO PARA DEFENSA JUDICIAL */}
              {moduloActual.tiposAutos && moduloActual.tiposAutos.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-3 sm:p-4 lg:p-6">
                    <div 
                      className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 flex-col sm:flex-row gap-3 cursor-pointer select-none"
                      onClick={() => toggleSection('autos')}
                    >
                      <div className="flex-1">
                        <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                          <Scale className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#003DA5' }} />
                          Tipos de Autos Procesales
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                          Define los tipos de autos que estarán disponibles en el formulario de Nueva Demanda
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            agregarTipoAuto();
                          }}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg flex-shrink-0"
                          style={{
                            background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
                            boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
                          }}
                        >
                          <Plus className="w-4 h-4" />
                          <span>Agregar Tipo</span>
                        </button>
                        <button className="p-1 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                          {expandedSections.autos ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {expandedSections.autos && (
                      <AnimatePresence>
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="space-y-3">
                      {moduloActual.tiposAutos.map((tipo) => (
                        <div
                          key={tipo.id}
                          className="p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-white rounded-lg border border-blue-200"
                        >
                          {/* Fila 1: Nombre + Eliminar */}
                          <div className="flex items-center gap-2 mb-3">
                            <input
                              type="text"
                              value={tipo.nombre}
                              onChange={(e) => actualizarTipoAuto(tipo.id, { nombre: e.target.value })}
                              className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-sm font-semibold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Nombre del tipo de auto"
                            />
                            <button
                              onClick={() => solicitarEliminarTipoAuto(tipo.id)}
                              className="min-h-[44px] min-w-[44px] p-2.5 sm:p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 flex items-center justify-center"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Fila 2: Descripción */}
                          <div className="mb-3">
                            <textarea
                              value={tipo.descripcion}
                              onChange={(e) => actualizarTipoAuto(tipo.id, { descripcion: e.target.value })}
                              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              placeholder="Descripción del tipo de auto..."
                              rows={2}
                            />
                          </div>

                          {/* Fila 3: Activo */}
                          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                            {/* Toggle Activo */}
                            <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer ml-auto">
                              <input
                                type="checkbox"
                                checked={tipo.activo}
                                onChange={(e) => actualizarTipoAuto(tipo.id, { activo: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-xs sm:text-sm text-gray-700 font-medium">
                                Activo
                              </span>
                            </label>
                          </div>
                        </div>
                      ))}
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    )}
                  </div>
                </div>
              )}

              {/* Configuración de Tipos de Actuaciones - SOLO PARA JUZGAMIENTO DISCIPLINARIO */}
              {moduloActual.tiposActuaciones && moduloActual.tiposActuaciones.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-3 sm:p-4 lg:p-6">
                    <div 
                      className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 flex-col sm:flex-row gap-3 cursor-pointer select-none"
                      onClick={() => toggleSection('actuacionesDisciplinarias')}
                    >
                      <div>
                        <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                          <Gavel className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#003DA5' }} />
                          Tipos de Actuaciones Disciplinarias
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                          Define los tipos de actuaciones que estarán disponibles en el formulario de Agregar Actuación
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            agregarTipoActuacion();
                          }}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg flex-shrink-0"
                          style={{
                            background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
                            boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
                          }}
                        >
                          <Plus className="w-4 h-4" />
                          <span>Agregar Tipo</span>
                        </button>
                        <button className="p-1 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                          {expandedSections.actuacionesDisciplinarias ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {expandedSections.actuacionesDisciplinarias && (
                      <AnimatePresence>
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="space-y-3">
                      {moduloActual.tiposActuaciones
                        .sort((a, b) => a.orden - b.orden)
                        .map((tipo) => (
                          <div
                            key={tipo.id}
                            className="p-3 sm:p-4 bg-gradient-to-br from-purple-50 to-white rounded-lg border border-purple-200"
                          >
                            {/* Fila 1: Orden + Nombre + Eliminar */}
                            <div className="flex items-center gap-2 mb-3">
                              <div className="flex items-center gap-2">
                                <label className="text-xs sm:text-sm text-gray-700 font-medium whitespace-nowrap">
                                  #
                                </label>
                                <input
                                  type="number"
                                  value={tipo.orden}
                                  onChange={(e) => actualizarTipoActuacion(tipo.id, { orden: parseInt(e.target.value) || 1 })}
                                  min="1"
                                  className="w-14 px-2 py-1.5 border border-gray-300 rounded-lg text-center text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                              </div>
                              <input
                                type="text"
                                value={tipo.nombre}
                                onChange={(e) => actualizarTipoActuacion(tipo.id, { nombre: e.target.value })}
                                className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-sm font-semibold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="Nombre del tipo de actuación"
                              />
                              <button
                                onClick={() => solicitarEliminarTipoActuacion(tipo.id)}
                                className="min-h-[44px] min-w-[44px] p-2.5 sm:p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 flex items-center justify-center"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Fila 2: Descripción */}
                            <div className="mb-3">
                              <textarea
                                value={tipo.descripcion}
                                onChange={(e) => actualizarTipoActuacion(tipo.id, { descripcion: e.target.value })}
                                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                                placeholder="Descripción de la actuación disciplinaria..."
                                rows={2}
                              />
                            </div>

                            {/* Fila 3: Activo */}
                            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                              {/* Toggle Activo */}
                              <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer ml-auto">
                                <input
                                  type="checkbox"
                                  checked={tipo.activo}
                                  onChange={(e) => actualizarTipoActuacion(tipo.id, { activo: e.target.checked })}
                                  className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                />
                                <span className="text-xs sm:text-sm text-gray-700 font-medium">
                                  Activo
                                </span>
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            </div>
              )}

              {/* Configuración de Tipos de Excepciones Procesales - SOLO PARA JUZGAMIENTO DISCIPLINARIO */}
              {moduloActual.tiposExcepcionesProcesal && moduloActual.tiposExcepcionesProcesal.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-3 sm:p-4 lg:p-6">
                    <div 
                      className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 flex-col sm:flex-row gap-3 cursor-pointer select-none"
                      onClick={() => toggleSection('excepcionesProcesales')}
                    >
                      <div>
                        <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#F57C00' }} />
                          Tipos de Excepciones Procesales
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                          Define los tipos de excepciones procesales disponibles en el formulario de Nueva Excepción
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            agregarTipoExcepcion();
                          }}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg flex-shrink-0"
                          style={{
                            background: 'linear-gradient(135deg, #F57C00 0%, #E65100 100%)',
                            boxShadow: '0 2px 4px rgba(245, 124, 0, 0.2)'
                          }}
                        >
                          <Plus className="w-4 h-4" />
                          <span>Agregar Tipo</span>
                        </button>
                        <button className="p-1 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                          {expandedSections.excepcionesProcesales ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {expandedSections.excepcionesProcesales && (
                      <AnimatePresence>
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="space-y-3">
                      {moduloActual.tiposExcepcionesProcesal
                        .sort((a, b) => a.orden - b.orden)
                        .map((tipo) => (
                          <div
                            key={tipo.id}
                            className="p-3 sm:p-4 bg-gradient-to-br from-orange-50 to-white rounded-lg border border-orange-200"
                          >
                            {/* Fila 1: Orden + Icono + Nombre + Eliminar */}
                            <div className="flex items-center gap-2 mb-3">
                              <div className="flex items-center gap-2">
                                <label className="text-xs sm:text-sm text-gray-700 font-medium whitespace-nowrap">
                                  #
                                </label>
                                <input
                                  type="number"
                                  value={tipo.orden}
                                  onChange={(e) => actualizarTipoExcepcion(tipo.id, { orden: parseInt(e.target.value) || 1 })}
                                  min="1"
                                  className="w-14 px-2 py-1.5 border border-gray-300 rounded-lg text-center text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                              </div>
                              <input
                                type="text"
                                value={tipo.icono}
                                onChange={(e) => actualizarTipoExcepcion(tipo.id, { icono: e.target.value })}
                                className="w-16 px-2 py-1.5 text-center text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                placeholder="📋"
                                maxLength={2}
                              />
                              <input
                                type="text"
                                value={tipo.nombre}
                                onChange={(e) => actualizarTipoExcepcion(tipo.id, { nombre: e.target.value })}
                                className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-sm font-semibold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                placeholder="Nombre de la excepción"
                              />
                              <button
                                onClick={() => solicitarEliminarTipoExcepcion(tipo.id)}
                                className="min-h-[44px] min-w-[44px] p-2.5 sm:p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 flex items-center justify-center"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Fila 2: Descripción */}
                            <div className="mb-3">
                              <textarea
                                value={tipo.descripcion}
                                onChange={(e) => actualizarTipoExcepcion(tipo.id, { descripcion: e.target.value })}
                                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                                placeholder="Descripción de la excepción procesal..."
                                rows={2}
                              />
                            </div>

                            {/* Fila 3: Activo */}
                            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                              <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer ml-auto">
                                <input
                                  type="checkbox"
                                  checked={tipo.activo}
                                  onChange={(e) => actualizarTipoExcepcion(tipo.id, { activo: e.target.checked })}
                                  className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                />
                                <span className="text-xs sm:text-sm text-gray-700 font-medium">
                                  Activo
                                </span>
                              </label>
                            </div>
                          </div>
                        ))}
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </div>
              )}

              {/* Configuración de Causales Específicas - SOLO PARA JUZGAMIENTO DISCIPLINARIO */}
              {moduloActual.causalesEspecificas && moduloActual.causalesEspecificas.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-3 sm:p-4 lg:p-6">
                    <div 
                      className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 flex-col sm:flex-row gap-3 cursor-pointer select-none"
                      onClick={() => toggleSection('causalesEspecificas')}
                    >
                      <div>
                        <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                          <Target className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#F57C00' }} />
                          Causales Específicas
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                          Define las causales específicas disponibles en el formulario de Nueva Excepción
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            agregarCausalEspecifica();
                          }}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg flex-shrink-0"
                          style={{
                            background: 'linear-gradient(135deg, #F57C00 0%, #E65100 100%)',
                            boxShadow: '0 2px 4px rgba(245, 124, 0, 0.2)'
                          }}
                        >
                          <Plus className="w-4 h-4" />
                          <span>Agregar Causal</span>
                        </button>
                        <button className="p-1 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                          {expandedSections.causalesEspecificas ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {expandedSections.causalesEspecificas && (
                      <AnimatePresence>
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="space-y-3">
                      {moduloActual.causalesEspecificas
                        .sort((a, b) => a.orden - b.orden)
                        .map((causal) => (
                          <div
                            key={causal.id}
                            className="p-3 sm:p-4 bg-gradient-to-br from-orange-50 to-white rounded-lg border border-orange-200"
                          >
                            {/* Fila 1: Orden + Icono + Nombre + Eliminar */}
                            <div className="flex items-center gap-2 mb-3">
                              <div className="flex items-center gap-2">
                                <label className="text-xs sm:text-sm text-gray-700 font-medium whitespace-nowrap">
                                  #
                                </label>
                                <input
                                  type="number"
                                  value={causal.orden}
                                  onChange={(e) => actualizarCausalEspecifica(causal.id, { orden: parseInt(e.target.value) || 1 })}
                                  min="1"
                                  className="w-14 px-2 py-1.5 border border-gray-300 rounded-lg text-center text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                              </div>
                              <input
                                type="text"
                                value={causal.icono}
                                onChange={(e) => actualizarCausalEspecifica(causal.id, { icono: e.target.value })}
                                className="w-16 px-2 py-1.5 text-center text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                placeholder="📋"
                                maxLength={2}
                              />
                              <input
                                type="text"
                                value={causal.nombre}
                                onChange={(e) => actualizarCausalEspecifica(causal.id, { nombre: e.target.value })}
                                className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-sm font-semibold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                placeholder="Nombre de la causal"
                              />
                              <button
                                onClick={() => solicitarEliminarCausalEspecifica(causal.id)}
                                className="min-h-[44px] min-w-[44px] p-2.5 sm:p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 flex items-center justify-center"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Fila 2: Descripción */}
                            <div className="mb-3">
                              <textarea
                                value={causal.descripcion}
                                onChange={(e) => actualizarCausalEspecifica(causal.id, { descripcion: e.target.value })}
                                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                                placeholder="Descripción de la causal específica..."
                                rows={2}
                              />
                            </div>

                            {/* Fila 3: Activo */}
                            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                              <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer ml-auto">
                                <input
                                  type="checkbox"
                                  checked={causal.activo}
                                  onChange={(e) => actualizarCausalEspecifica(causal.id, { activo: e.target.checked })}
                                  className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                />
                                <span className="text-xs sm:text-sm text-gray-700 font-medium">
                                  Activo
                                </span>
                              </label>
                            </div>
                          </div>
                        ))}
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </div>
              )}

              {/* Configuración de Prescripción Disciplinaria - SOLO PARA JUZGAMIENTO DISCIPLINARIO */}
              {moduloActivo === 'juzgamiento' && (
                <PrescripcionConfig />
              )}

              {/* Info adicional */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 bg-blue-50 border-l-4 border-blue-500">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-blue-900 mb-1">
                        Información Importante
                      </h3>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Los cambios afectarán todos los expedientes del módulo {moduloActual.nombre}</li>
                        <li>• Las alertas se enviarán automáticamente según los días configurados</li>
                        <li>• Los estados inactivos no aparecerán en el tablero Kanban</li>
                        <li>• El orden de los estados se puede cambiar arrastrándolos</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODALES DE CONFIRMACIÓN */}

      {/* Modal: Agregar Estado */}
      {showModalAgregarEstado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Agregar Nuevo Estado</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    ¿Desea agregar un nuevo estado al tablero Kanban de {moduloActual?.nombre}?
                  </p>
                </div>
                <button
                  onClick={() => setShowModalAgregarEstado(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  Se creará un nuevo estado con el nombre "Nuevo Estado" que podrá personalizar posteriormente.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowModalAgregarEstado(false)}
                  className="px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarAgregarEstado}
                  className="px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
                    boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
                  }}
                >
                  Agregar Estado
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Eliminar Estado */}
      {showModalEliminarEstado && estadoAEliminar && (() => {
        // Obtener cantidad de casos asignados al estado (conteo dinámico desde API)
        const cantidadCasos = conteoDinamico[moduloActivo]?.[estadoAEliminar.id] || 0;
        const puedeEliminar = cantidadCasos === 0;

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Eliminar Estado / Columna Kanban</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Verificando si es posible eliminar el estado
                    </p>
                  </div>
                  <button
                    onClick={() => setShowModalEliminarEstado(false)}
                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* Información del estado */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                  <p className="text-sm font-semibold text-gray-900 mb-2">
                    Estado: "{estadoAEliminar.nombre}"
                  </p>
                  <p className="text-xs text-gray-600">
                    Módulo: {moduloActual?.nombre}
                  </p>
                </div>

                {/* Validación de casos asignados */}
                {!puedeEliminar ? (
                  // ❌ NO SE PUEDE ELIMINAR - Hay casos asignados
                  <>
                    <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-red-900 mb-2">
                            ⚠️ No se puede eliminar este estado
                          </p>
                          <p className="text-sm text-red-800 mb-3">
                            Esta columna tiene <strong>{cantidadCasos} {cantidadCasos === 1 ? 'caso' : 'casos'} asignado{cantidadCasos === 1 ? '' : 's'}</strong> actualmente.
                          </p>
                          <div className="bg-white border border-red-200 rounded-lg p-3">
                            <p className="text-xs font-semibold text-red-900 mb-2">
                              Para poder eliminar este estado debe:
                            </p>
                            <ol className="text-xs text-red-800 space-y-1 list-decimal list-inside">
                              <li>Mover todos los casos a otro estado</li>
                              <li>Verificar que la columna esté completamente vacía</li>
                              <li>Intentar eliminar nuevamente</li>
                            </ol>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => setShowModalEliminarEstado(false)}
                        className="px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg"
                        style={{
                          background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
                          boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
                        }}
                      >
                        Entendido
                      </button>
                    </div>
                  </>
                ) : (
                  // ✅ SÍ SE PUEDE ELIMINAR - Columna vacía
                  <>
                    <div className="bg-green-50 border border-green-300 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-green-900 mb-1">
                            ✓ Estado vacío - Se puede eliminar
                          </p>
                          <p className="text-xs text-green-800">
                            Esta columna no tiene casos asignados. Es seguro eliminarla.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                      <p className="text-sm text-red-800">
                        <strong>⚠️ Advertencia:</strong> Esta acción no se puede deshacer. El estado "{estadoAEliminar.nombre}" será eliminado permanentemente del tablero Kanban de {moduloActual?.nombre}.
                      </p>
                    </div>

                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => setShowModalEliminarEstado(false)}
                        className="px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={confirmarEliminarEstado}
                        className="px-4 py-2 rounded-lg font-semibold text-sm text-white bg-red-600 hover:bg-red-700 transition-all"
                      >
                        Eliminar Estado
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal: Agregar Tipo de Proceso */}
      {showModalAgregarTipoProceso && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Agregar Tipo de Proceso</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    ¿Desea agregar un nuevo tipo de proceso judicial?
                  </p>
                </div>
                <button
                  onClick={() => setShowModalAgregarTipoProceso(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  Se creará un nuevo tipo de proceso con valores predeterminados que podrá personalizar posteriormente. Estará disponible en el formulario de Nueva Demanda.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowModalAgregarTipoProceso(false)}
                  className="px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarAgregarTipoProceso}
                  className="px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
                    boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
                  }}
                >
                  Agregar Tipo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Eliminar Tipo de Proceso */}
      {showModalEliminarTipoProceso && tipoProcesoAEliminar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Eliminar Tipo de Proceso</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    ¿Está seguro de eliminar el siguiente tipo de proceso?
                  </p>
                </div>
                <button
                  onClick={() => setShowModalEliminarTipoProceso(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm font-semibold text-red-900 mb-2">
                  Tipo: "{tipoProcesoAEliminar.nombre}"
                </p>
                <p className="text-xs text-red-700 mb-3">
                  {tipoProcesoAEliminar.descripcion}
                </p>
                <p className="text-sm text-red-800">
                  Esta acción no se puede deshacer y afectará los formularios de nueva demanda.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowModalEliminarTipoProceso(false)}
                  className="px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarEliminarTipoProceso}
                  className="px-4 py-2 rounded-lg font-semibold text-sm text-white bg-red-600 hover:bg-red-700 transition-all"
                >
                  Eliminar Tipo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Agregar Tipo de Auto */}
      {showModalAgregarTipoAuto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Agregar Tipo de Auto</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    ¿Desea agregar un nuevo tipo de auto procesal?
                  </p>
                </div>
                <button
                  onClick={() => setShowModalAgregarTipoAuto(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  Se creará un nuevo tipo de auto con valores predeterminados que podrá personalizar posteriormente. Estará disponible en el formulario de Nueva Demanda.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowModalAgregarTipoAuto(false)}
                  className="px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarAgregarTipoAuto}
                  className="px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
                    boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
                  }}
                >
                  Agregar Tipo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Eliminar Tipo de Auto */}
      {showModalEliminarTipoAuto && tipoAutoAEliminar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Eliminar Tipo de Auto</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    ¿Está seguro de eliminar el siguiente tipo de auto?
                  </p>
                </div>
                <button
                  onClick={() => setShowModalEliminarTipoAuto(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm font-semibold text-red-900 mb-2">
                  Tipo: "{tipoAutoAEliminar.nombre}"
                </p>
                <p className="text-xs text-red-700 mb-3">
                  {tipoAutoAEliminar.descripcion}
                </p>
                <p className="text-sm text-red-800">
                  Esta acción no se puede deshacer y afectará los formularios de nueva demanda.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowModalEliminarTipoAuto(false)}
                  className="px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarEliminarTipoAuto}
                  className="px-4 py-2 rounded-lg font-semibold text-sm text-white bg-red-600 hover:bg-red-700 transition-all"
                >
                  Eliminar Tipo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Agregar Tipo de Actuación */}
      {showModalAgregarActuacion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Agregar Tipo de Actuación</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    ¿Desea agregar un nuevo tipo de actuación disciplinaria?
                  </p>
                </div>
                <button
                  onClick={() => setShowModalAgregarActuacion(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-purple-800">
                  Se creará un nuevo tipo de actuación con valores predeterminados que podrá personalizar posteriormente. Estará disponible en el formulario de Agregar Actuación del expediente disciplinario.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowModalAgregarActuacion(false)}
                  className="px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarAgregarTipoActuacion}
                  className="px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
                    boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
                  }}
                >
                  Agregar Tipo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Eliminar Tipo de Actuación */}
      {showModalEliminarActuacion && actuacionAEliminar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Eliminar Tipo de Actuación</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    ¿Está seguro de eliminar el siguiente tipo de actuación?
                  </p>
                </div>
                <button
                  onClick={() => setShowModalEliminarActuacion(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm font-semibold text-red-900 mb-2">
                  Tipo: "{actuacionAEliminar.nombre}"
                </p>
                <p className="text-xs text-red-700 mb-3">
                  {actuacionAEliminar.descripcion}
                </p>
                <p className="text-sm text-red-800">
                  Esta acción no se puede deshacer y afectará los formularios de agregar actuación en los expedientes disciplinarios.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowModalEliminarActuacion(false)}
                  className="px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarEliminarTipoActuacion}
                  className="px-4 py-2 rounded-lg font-semibold text-sm text-white bg-red-600 hover:bg-red-700 transition-all"
                >
                  Eliminar Tipo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 Modal: Agregar Tipo de Excepción Procesal */}
      {showModalAgregarExcepcion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Agregar Nuevo Tipo de Excepción</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    ¿Desea agregar un nuevo tipo de excepción procesal?
                  </p>
                </div>
                <button
                  onClick={() => setShowModalAgregarExcepcion(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-orange-800">
                  Se creará un nuevo tipo de excepción procesal con valores predeterminados que podrá personalizar posteriormente.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowModalAgregarExcepcion(false)}
                  className="px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarAgregarTipoExcepcion}
                  className="px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #F57C00 0%, #E65100 100%)',
                    boxShadow: '0 2px 4px rgba(245, 124, 0, 0.2)'
                  }}
                >
                  Agregar Tipo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 Modal: Eliminar Tipo de Excepción */}
      {showModalEliminarExcepcion && excepcionAEliminar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Eliminar Tipo de Excepción</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    ¿Está seguro de eliminar este tipo de excepción procesal?
                  </p>
                </div>
                <button
                  onClick={() => setShowModalEliminarExcepcion(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm font-semibold text-red-900 mb-2">
                  Tipo: "{excepcionAEliminar.nombre}"
                </p>
                <p className="text-xs text-red-700 mb-3">
                  {excepcionAEliminar.descripcion}
                </p>
                <p className="text-sm text-red-800">
                  Esta acción no se puede deshacer y afectará los formularios de excepciones en los expedientes disciplinarios.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowModalEliminarExcepcion(false)}
                  className="px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarEliminarTipoExcepcion}
                  className="px-4 py-2 rounded-lg font-semibold text-sm text-white bg-red-600 hover:bg-red-700 transition-all"
                >
                  Eliminar Tipo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 Modal: Agregar Causal Específica */}
      {showModalAgregarCausal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Agregar Nueva Causal Específica</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    ¿Desea agregar una nueva causal específica?
                  </p>
                </div>
                <button
                  onClick={() => setShowModalAgregarCausal(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-orange-800">
                  Se creará una nueva causal específica con valores predeterminados que podrá personalizar posteriormente.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowModalAgregarCausal(false)}
                  className="px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarAgregarCausalEspecifica}
                  className="px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #F57C00 0%, #E65100 100%)',
                    boxShadow: '0 2px 4px rgba(245, 124, 0, 0.2)'
                  }}
                >
                  Agregar Causal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 Modal: Eliminar Causal Específica */}
      {showModalEliminarCausal && causalAEliminar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Eliminar Causal Específica</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    ¿Está seguro de eliminar esta causal específica?
                  </p>
                </div>
                <button
                  onClick={() => setShowModalEliminarCausal(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm font-semibold text-red-900 mb-2">
                  Causal: "{causalAEliminar.nombre}"
                </p>
                <p className="text-xs text-red-700 mb-3">
                  {causalAEliminar.descripcion}
                </p>
                <p className="text-sm text-red-800">
                  Esta acción no se puede deshacer y afectará los formularios de excepciones en los expedientes disciplinarios.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowModalEliminarCausal(false)}
                  className="px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarEliminarCausalEspecifica}
                  className="px-4 py-2 rounded-lg font-semibold text-sm text-white bg-red-600 hover:bg-red-700 transition-all"
                >
                  Eliminar Causal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 Modal: Agregar Eje Estratégico */}
      {showModalAgregarEje && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Agregar Nuevo Eje Estratégico</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    ¿Desea agregar un nuevo eje estratégico al Plan de Acción?
                  </p>
                </div>
                <button
                  onClick={() => setShowModalAgregarEje(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  Se creará un nuevo eje con valores predeterminados que podrá personalizar posteriormente. Estará disponible en el formulario de Nuevo Indicador PEI.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowModalAgregarEje(false)}
                  className="px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const nuevoEje: EjeEstrategico = {
                      id: `eje-${Date.now()}`,
                      nombre: 'Nuevo Eje Estratégico',
                      icono: '🎯',
                      descripcion: 'Descripción del nuevo eje estratégico',
                      color: '#2962FF',
                      activo: true,
                      orden: ejesEstrategicos.length + 1
                    };
                    actualizarEjesEstrategicos([...ejesEstrategicos, nuevoEje]);
                    setShowModalAgregarEje(false);

                    toast.success('Eje estratégico agregado correctamente', {
                      description: 'Se ha agregado un nuevo eje al Plan de Acción',
                      duration: 3000
                    });
                  }}
                  className="px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
                    boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
                  }}
                >
                  Agregar Eje
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 Modal: Eliminar Eje Estratégico */}
      {showModalEliminarEje && ejeAEliminar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Eliminar Eje Estratégico</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    ¿Está seguro de eliminar el siguiente eje estratégico?
                  </p>
                </div>
                <button
                  onClick={() => setShowModalEliminarEje(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm font-semibold text-red-900 mb-2">
                  {ejeAEliminar.icono} {ejeAEliminar.nombre}
                </p>
                <p className="text-xs text-red-700 mb-3">
                  {ejeAEliminar.descripcion}
                </p>
                <p className="text-sm text-red-800">
                  <strong>⚠️ Advertencia:</strong> Esta acción no se puede deshacer. Los indicadores asociados a este eje deberán ser reasignados a otro eje estratégico.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowModalEliminarEje(false)}
                  className="px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const nuevosEjes = ejesEstrategicos.filter(e => e.id !== ejeAEliminar.id);
                    actualizarEjesEstrategicos(nuevosEjes);
                    setShowModalEliminarEje(false);
                    setEjeAEliminar(null);

                    toast.success('Eje estratégico eliminado correctamente', {
                      description: `"${ejeAEliminar.nombre}" ha sido eliminado del Plan de Acción`,
                      duration: 3000
                    });
                  }}
                  className="px-4 py-2 rounded-lg font-semibold text-sm text-white bg-red-600 hover:bg-red-700 transition-all"
                >
                  Eliminar Eje
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 Modal: Agregar Tipo de Indicador */}
      {showModalAgregarIndicador && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Agregar Nuevo Tipo de Indicador</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    ¿Desea agregar un nuevo tipo de indicador al Plan de Acción?
                  </p>
                </div>
                <button
                  onClick={() => setShowModalAgregarIndicador(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  Se creará un nuevo tipo de indicador con valores predeterminados que podrá personalizar posteriormente. Estará disponible en el formulario de Nuevo Indicador PEI.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowModalAgregarIndicador(false)}
                  className="px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const nuevoIndicador: TipoIndicador = {
                      id: `tipo-${Date.now()}`,
                      nombre: 'Nuevo Tipo de Indicador',
                      icono: '📊',
                      descripcion: 'Descripción del nuevo tipo de indicador',
                      color: '#2962FF',
                      activo: true,
                      orden: tiposIndicadores.length + 1
                    };
                    actualizarTiposIndicadores([...tiposIndicadores, nuevoIndicador]);
                    setShowModalAgregarIndicador(false);

                    toast.success('Tipo de indicador agregado correctamente', {
                      description: 'Se ha agregado un nuevo tipo al Plan de Acción',
                      duration: 3000
                    });
                  }}
                  className="px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
                    boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
                  }}
                >
                  Agregar Tipo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 Modal: Eliminar Tipo de Indicador */}
      {showModalEliminarIndicador && indicadorAEliminar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Eliminar Tipo de Indicador</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    ¿Está seguro de eliminar el siguiente tipo de indicador?
                  </p>
                </div>
                <button
                  onClick={() => setShowModalEliminarIndicador(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm font-semibold text-red-900 mb-2">
                  {indicadorAEliminar.icono} {indicadorAEliminar.nombre}
                </p>
                <p className="text-xs text-red-700 mb-3">
                  {indicadorAEliminar.descripcion}
                </p>
                <p className="text-sm text-red-800">
                  <strong>⚠️ Advertencia:</strong> Esta acción no se puede deshacer. Los indicadores que usan este tipo deberán ser reclasificados.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowModalEliminarIndicador(false)}
                  className="px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const nuevosIndicadores = tiposIndicadores.filter(t => t.id !== indicadorAEliminar.id);
                    actualizarTiposIndicadores(nuevosIndicadores);
                    setShowModalEliminarIndicador(false);
                    setIndicadorAEliminar(null);

                    toast.success('Tipo de indicador eliminado correctamente', {
                      description: `"${indicadorAEliminar.nombre}" ha sido eliminado del Plan de Acción`,
                      duration: 3000
                    });
                  }}
                  className="px-4 py-2 rounded-lg font-semibold text-sm text-white bg-red-600 hover:bg-red-700 transition-all"
                >
                  Eliminar Tipo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 Modal: Agregar Tipo de Requerimiento */}
      {showModalAgregarRequerimiento && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Agregar Nuevo Tipo de Requerimiento</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    ¿Desea agregar un nuevo tipo de requerimiento para Órganos de Control?
                  </p>
                </div>
                <button
                  onClick={() => setShowModalAgregarRequerimiento(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  Se creará un nuevo tipo de requerimiento con valores predeterminados que podrá personalizar posteriormente. Estará disponible en el formulario de Nuevo Requerimiento.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowModalAgregarRequerimiento(false)}
                  className="px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const nuevoRequerimiento: TipoRequerimiento = {
                      id: `req-${Date.now()}`,
                      nombre: 'Nuevo Tipo',
                      descripcion: 'Descripción del requerimiento',
                      activo: true,
                      orden: tiposRequerimientos.length + 1
                    };
                    actualizarTiposRequerimientos([...tiposRequerimientos, nuevoRequerimiento]);
                    setShowModalAgregarRequerimiento(false);

                    toast.success('Tipo de requerimiento agregado correctamente', {
                      description: 'Se ha agregado un nuevo tipo para Órganos de Control',
                      duration: 3000
                    });
                  }}
                  className="px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
                    boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
                  }}
                >
                  Agregar Tipo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 Modal: Eliminar Tipo de Requerimiento */}
      {showModalEliminarRequerimiento && requerimientoAEliminar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Eliminar Tipo de Requerimiento</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    ¿Está seguro de eliminar el siguiente tipo de requerimiento?
                  </p>
                </div>
                <button
                  onClick={() => setShowModalEliminarRequerimiento(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm font-semibold text-red-900 mb-2">
                  {requerimientoAEliminar.nombre}
                </p>
                <p className="text-xs text-red-700 mb-3">
                  {requerimientoAEliminar.descripcion}
                </p>
                <p className="text-sm text-red-800">
                  <strong>⚠️ Advertencia:</strong> Esta acción no se puede deshacer. Los requerimientos que usan este tipo deberán ser reclasificados.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowModalEliminarRequerimiento(false)}
                  className="px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const nuevosRequerimientos = tiposRequerimientos.filter(t => t.id !== requerimientoAEliminar.id);
                    actualizarTiposRequerimientos(nuevosRequerimientos);
                    setShowModalEliminarRequerimiento(false);
                    setRequerimientoAEliminar(null);

                    toast.success('Tipo de requerimiento eliminado correctamente', {
                      description: `"${requerimientoAEliminar.nombre}" ha sido eliminado de Órganos de Control`,
                      duration: 3000
                    });
                  }}
                  className="px-4 py-2 rounded-lg font-semibold text-sm text-white bg-red-600 hover:bg-red-700 transition-all"
                >
                  Eliminar Tipo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ COMPONENTE ESTADO SORTABLE ============

function EstadoSortable({ estado, index, onUpdate, onDelete }: { estado: EstadoKanban, index: number, onUpdate: (estadoId: string, cambios: Partial<EstadoKanban>) => void, onDelete: (estadoId: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: estado.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200"
    >
      {/* Fila 1: Drag + Orden + Nombre + Eliminar + Activo */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div {...attributes} {...listeners} className="cursor-move">
          <GripVertical className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
        </div>

        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center font-bold text-xs sm:text-sm text-gray-700 flex-shrink-0">
          {index + 1}
        </div>

        <input
          disabled={!authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_EDIT)}
          type="text"
          value={estado.nombre}
          onChange={(e) => onUpdate(estado.id, { nombre: e.target.value })}
          className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Nombre del estado"
        />

        {/* Toggle Activo */}
        <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer">
          <input
            disabled={!authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_EDIT)}
            type="checkbox"
            checked={estado.activo}
            onChange={(e) => onUpdate(estado.id, { activo: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-xs sm:text-sm text-gray-700 whitespace-nowrap">Activo</span>
        </label>
        {authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_DELETE) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(estado.id);
            }}
            className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ============ COMPONENTE DE PRESCRIPCIÓN ============
function PrescripcionConfig() {
  const [prescriptionYears, setPrescriptionYears] = useState<number>(5);
  const [originalYears, setOriginalYears] = useState<number>(5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const configValue = await procesosCoactivosService.getConfiguration('prescripcion_juzgamiento');
        const years = configValue?.years ?? 5;
        setPrescriptionYears(years);
        setOriginalYears(years);
      } catch (err) {
        console.error('Error loading prescription config:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const hasChanges = prescriptionYears !== originalYears;

  const guardar = async () => {
    if (prescriptionYears < 1 || prescriptionYears > 30) {
      toast.error('El valor debe estar entre 1 y 30 años');
      return;
    }
    try {
      setSaving(true);
      await procesosCoactivosService.updateConfiguration('prescripcion_juzgamiento', {
        value: { years: prescriptionYears },
        module: 'juzgamiento',
        description: 'Configuración de años para prescripción en Juzgamiento Disciplinario'
      });
      setOriginalYears(prescriptionYears);
      toast.success('Prescripción actualizada correctamente');
    } catch (err) {
      toast.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#F57C00]" />
      </div>
    );
  }

  const fechaPreview = new Date();
  fechaPreview.setFullYear(fechaPreview.getFullYear() + prescriptionYears);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 flex-col sm:flex-row gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#F57C00' }} />
              Prescripción Disciplinaria
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Configura el número de años para el cálculo de prescripción de los procesos disciplinarios
            </p>
          </div>
          {hasChanges && (
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => setPrescriptionYears(originalYears)}
                className="px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg transition-colors"
              >
                Descartar
              </button>
              <button
                onClick={guardar}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-semibold text-xs sm:text-sm text-white transition-all hover:shadow-lg disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #F57C00 0%, #E65100 100%)',
                  boxShadow: '0 2px 4px rgba(245, 124, 0, 0.2)'
                }}
              >
                {saving ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Guardar
              </button>
            </div>
          )}
        </div>

        {/* Control de años */}
        <div className="p-4 bg-gradient-to-br from-orange-50 to-white rounded-lg border border-orange-200">
          <div className="flex items-center gap-4 mb-3">
            <label className="text-sm font-semibold text-gray-700">Años de prescripción:</label>
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-orange-500 focus-within:border-orange-500">
              <button
                onClick={() => setPrescriptionYears(Math.max(1, prescriptionYears - 1))}
                className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold text-base transition-colors border-r border-gray-300"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                max={30}
                value={prescriptionYears}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val >= 1 && val <= 30) setPrescriptionYears(val);
                }}
                className="w-16 text-center text-xl font-bold py-2 border-0 outline-none text-gray-900"
              />
              <button
                onClick={() => setPrescriptionYears(Math.min(30, prescriptionYears + 1))}
                className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold text-base transition-colors border-l border-gray-300"
              >
                +
              </button>
            </div>
            <span className="text-sm text-gray-500">años</span>
          </div>

          {/* Preview */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs sm:text-sm text-blue-700">
              Un proceso cuya noticia se reciba <strong>hoy</strong> prescribirá el{' '}
              <strong>
                {fechaPreview.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
              </strong>.
              Los procesos existentes conservan su fecha original.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
