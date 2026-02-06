/**
 * ConfiguracionesSIGL - Módulo de Configuraciones SIGL
 * Permite configurar estados, columnas y tiempos de todos los tableros Kanban
 * DISEÑO 100% COHERENTE CON EL ESTÁNDAR DEL PROYECTO (Modal Comunicaciones del Proceso)
 * CONECTADO A CONTEXT API - Los cambios afectan a todos los módulos de Gestión Legal
 * ✅ ORGANIZADO CON TABS para mejor usabilidad
 */

import { useState, useEffect } from 'react';
import { Settings, Clock, LayoutGrid, Save, RotateCcw, Plus, Trash2, GripVertical, AlertCircle, Scale, X, CheckCircle, Gavel, Target, FileText, Landmark } from 'lucide-react';
import { legalService } from '../../../../services/api/legal.service';
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
import { Permissions } from '../../../../enums/permissions';

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
  CausalEspecifica
} from '../config/ConfiguracionesSIGLContext';

// ✅ Importar componente de configuración de plantillas
import { ConfiguracionPlantillasOficios } from '../configuracion/ConfiguracionPlantillasOficios';

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
    guardarConfiguraciones,
    restablecerDefecto
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

  const moduloActual = configuraciones.find(m => m.id === moduloActivo);

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

    setConfiguraciones(prev => prev.map(m =>
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

    setConfiguraciones(prev => prev.map(m =>
      m.id === moduloActivo
        ? { ...m, tiposActuaciones: (m.tiposActuaciones || []).filter(t => t.id !== actuacionAEliminar.id) }
        : m
    ));
    setCambiosPendientes(true);
    setShowModalEliminarActuacion(false);

    toast.success('Tipo de actuación eliminado correctamente', {
      description: `"${actuacionAEliminar.nombre}" ha sido eliminado de los tipos de actuaciones`,
      duration: 3000
    });

    setActuacionAEliminar(null);
  };

  const actualizarTipoActuacion = (tipoId: string, cambios: Partial<TipoActuacion>) => {
    setConfiguraciones(prev => prev.map(m =>
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
                <h1 className="text-lg sm:text-2xl font-bold" style={{ color: '#003DA5' }}>
                  Configuraciones SIGL
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                  Gestiona estados, columnas y tiempos de todos los tableros Kanban
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {cambiosPendientes && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                <AlertCircle className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">Cambios sin guardar</span>
                <span className="sm:hidden">Sin guardar</span>
              </span>
            )}
            <button
              onClick={restablecerDefecto}
              className="flex items-center gap-1 sm:gap-2 px-3 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all flex-shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Restablecer</span>
            </button>
            <button
              onClick={guardarConfiguraciones}
              disabled={!cambiosPendientes}
              className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: cambiosPendientes ? 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' : '#9CA3AF',
                boxShadow: cambiosPendientes ? '0 2px 4px rgba(41, 98, 255, 0.2)' : 'none'
              }}
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">Guardar Cambios</span>
              <span className="sm:hidden">Guardar</span>
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
                onClick={() => setModuloActivo('plantillas-oficios')}
                className={`w-full text-left px-3 py-2 sm:py-2.5 rounded-lg transition-colors ${moduloActivo === 'plantillas-oficios'
                  ? 'bg-blue-50 text-blue-900 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">Plantillas de Oficios</span>
                </div>
                <div className="flex items-center gap-2 mt-1 ml-6">
                  <span className="text-xs text-gray-500">
                    Logo y diseño de documentos
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Panel Principal */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">

          {/* 🆕 Panel de Plan de Acción - Ejes Estratégicos */}
          {moduloActivo === 'plan-accion' && (
            <div className="max-w-6xl mx-auto space-y-6">
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
            <div className="max-w-6xl mx-auto space-y-8">

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
          {moduloActivo === 'plantillas-oficios' && (
            <ConfiguracionPlantillasOficios />
          )}

          {/* Panel de módulos Kanban (YA EXISTE) */}
          {moduloActual && (
            <div className="max-w-6xl mx-auto space-y-6">
              {/* Configuración de Estados/Columnas Kanban */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 flex-col sm:flex-row gap-3">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#003DA5' }} />
                        {moduloActivo === 'asesoria-juridica' ? 'Etapas del Proceso' : 'Estados / Columnas Kanban'}
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        {moduloActivo === 'asesoria-juridica'
                          ? `Define las etapas del proceso de ${moduloActual.nombre}`
                          : `Define las columnas que aparecerán en el tablero Kanban de ${moduloActual.nombre}`
                        }
                      </p>
                    </div>
                    {authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_CREATE) && (
                      <button
                        onClick={agregarEstado}
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
                  </div>

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
                </div>
              </div>

              {/* Configuración de Tipos de Procesos Judiciales - SOLO PARA DEFENSA JUDICIAL */}
              {moduloActual.tiposProcesos && moduloActual.tiposProcesos.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-3 sm:p-4 lg:p-6">
                    <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 flex-col sm:flex-row gap-3">
                      <div>
                        <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                          <Scale className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#003DA5' }} />
                          Tipos de Procesos Judiciales
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                          Define los tipos de procesos que estarán disponibles en el formulario de Nueva Demanda
                        </p>
                      </div>
                      {authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_CREATE) && (
                        <button
                          onClick={agregarTipoProceso}
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
                    </div>

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
                              <span className="text-xs sm:text-sm text-gray-600">días</span>
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
                              <span className="text-xs sm:text-sm text-gray-600 hidden sm:inline">días antes</span>
                              <span className="text-xs text-gray-600 sm:hidden">d.a.</span>
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
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Configuración de Medios de Control - SOLO PARA DEFENSA JUDICIAL */}
              {moduloActual.mediosControl && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-3 sm:p-4 lg:p-6">
                    <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 flex-col sm:flex-row gap-3">
                      <div>
                        <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                          <Scale className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#003DA5' }} />
                          Medios de Control
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                          Define los medios de control que estarán disponibles en el formulario de Nueva Demanda
                        </p>
                      </div>
                      <button
                        onClick={agregarMedioControl}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg flex-shrink-0"
                        style={{
                          background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
                          boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
                        }}
                      >
                        <Plus className="w-4 h-4" />
                        <span>Agregar Medio</span>
                      </button>
                    </div>

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
                  </div>
                </div>
              )}

              {/* Configuración de Tipos de Autos - SOLO PARA DEFENSA JUDICIAL */}
              {moduloActual.tiposAutos && moduloActual.tiposAutos.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-3 sm:p-4 lg:p-6">
                    <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 flex-col sm:flex-row gap-3">
                      <div>
                        <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                          <Scale className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#003DA5' }} />
                          Tipos de Autos Procesales
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                          Define los tipos de autos que estarán disponibles en el formulario de Nueva Demanda
                        </p>
                      </div>
                      <button
                        onClick={agregarTipoAuto}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg flex-shrink-0"
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
                  </div>
                </div>
              )}

              {/* Configuración de Tipos de Actuaciones - SOLO PARA JUZGAMIENTO DISCIPLINARIO */}
              {moduloActual.tiposActuaciones && moduloActual.tiposActuaciones.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-3 sm:p-4 lg:p-6">
                    <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 flex-col sm:flex-row gap-3">
                      <div>
                        <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                          <Gavel className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#003DA5' }} />
                          Tipos de Actuaciones Disciplinarias
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                          Define los tipos de actuaciones que estarán disponibles en el formulario de Agregar Actuación
                        </p>
                      </div>
                      <button
                        onClick={agregarTipoActuacion}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg flex-shrink-0"
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
                  </div>
                </div>
              )}

              {/* Configuración de Tipos de Excepciones Procesales - SOLO PARA JUZGAMIENTO DISCIPLINARIO */}
              {moduloActual.tiposExcepcionesProcesal && moduloActual.tiposExcepcionesProcesal.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-3 sm:p-4 lg:p-6">
                    <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 flex-col sm:flex-row gap-3">
                      <div>
                        <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#F57C00' }} />
                          Tipos de Excepciones Procesales
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                          Define los tipos de excepciones procesales disponibles en el formulario de Nueva Excepción
                        </p>
                      </div>
                      <button
                        onClick={agregarTipoExcepcion}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg flex-shrink-0"
                        style={{
                          background: 'linear-gradient(135deg, #F57C00 0%, #E65100 100%)',
                          boxShadow: '0 2px 4px rgba(245, 124, 0, 0.2)'
                        }}
                      >
                        <Plus className="w-4 h-4" />
                        <span>Agregar Tipo</span>
                      </button>
                    </div>

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
                  </div>
                </div>
              )}

              {/* Configuración de Causales Específicas - SOLO PARA JUZGAMIENTO DISCIPLINARIO */}
              {moduloActual.causalesEspecificas && moduloActual.causalesEspecificas.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-3 sm:p-4 lg:p-6">
                    <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 flex-col sm:flex-row gap-3">
                      <div>
                        <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                          <Target className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#F57C00' }} />
                          Causales Específicas
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                          Define las causales específicas disponibles en el formulario de Nueva Excepción
                        </p>
                      </div>
                      <button
                        onClick={agregarCausalEspecifica}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg flex-shrink-0"
                        style={{
                          background: 'linear-gradient(135deg, #F57C00 0%, #E65100 100%)',
                          boxShadow: '0 2px 4px rgba(245, 124, 0, 0.2)'
                        }}
                      >
                        <Plus className="w-4 h-4" />
                        <span>Agregar Causal</span>
                      </button>
                    </div>

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
                  </div>
                </div>
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