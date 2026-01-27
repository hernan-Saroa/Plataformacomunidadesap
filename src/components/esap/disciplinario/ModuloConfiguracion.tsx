/**
 * Módulo de Configuración - Control Interno Disciplinario
 * Configuración integral del sistema disciplinario con diseño Kanban
 * COHERENTE CON EL MÓDULO DE CONTROL DISCIPLINARIO
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Save, Settings, Clock, Users, Bell, FileText, Shield,
  AlertTriangle, CheckCircle, Mail, Calendar, Target, Zap,
  Plus, Trash2, Edit2, GripVertical, X, Upload, FileSignature, LayoutGrid, RotateCcw, AlertCircle
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner';
import { authService } from '../../../services/api/authService';
import { Permissions } from '../../../enums/permissions';

import { disciplinaryService } from '../../../services/api/disciplinary.service';
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

// ============ INTERFACES ============

interface EstadoKanban {
  id: string;
  nombre: string;
  color: string;
  dias: number; // ✅ Tiempo estándar en días
  alertaDias: number; // ✅ Días antes para alertar
  orden: number;
  activo: boolean;
}

interface Cargo {
  id: string;
  nombre: string;
  capacidad: number;
  activo: boolean;
}

interface ConfiguracionNotificaciones {
  vencimiento7dias: boolean;
  vencimiento3dias: boolean;
  vencimiento1dia: boolean;
  procesoVencido: boolean;
  asignacionProceso: boolean;
  cambioEtapa: boolean;
  aprobacionRequerida: boolean;
  resumenDiario: boolean;
  resumenSemanal: boolean;
}

interface ConfiguracionAlertas {
  porcentajeRiesgo: number;
  porcentajeCritico: number;
  capacidadAlerta: number;
  diasAnticipacion: number;
}

// ============ CONFIGURACIONES POR DEFECTO ============

const ESTADOS_KANBAN_DEFECTO: EstadoKanban[] = [
  { id: 'recepcion', nombre: 'Recepción', color: '#3B82F6', dias: 3, alertaDias: 1, orden: 1, activo: true },
  { id: 'valoracion', nombre: 'Valoración', color: '#F59E0B', dias: 10, alertaDias: 3, orden: 2, activo: true },
  { id: 'indagacion', nombre: 'Indagación', color: '#8B5CF6', dias: 40, alertaDias: 10, orden: 3, activo: true },
  { id: 'investigacion', nombre: 'Investigación', color: '#EC4899', dias: 60, alertaDias: 15, orden: 4, activo: true },
  { id: 'juzgamiento', nombre: 'Juzgamiento', color: '#06B6D4', dias: 50, alertaDias: 10, orden: 5, activo: true },
  { id: 'fallo', nombre: 'Fallo', color: '#10B981', dias: 10, alertaDias: 3, orden: 6, activo: true },
];

const CARGOS_DEFECTO: Cargo[] = [
  { id: 'especializado', nombre: 'PROFESIONAL ESPECIALIZADO', capacidad: 12, activo: true },
  { id: 'universitario', nombre: 'PROFESIONAL UNIVERSITARIO', capacidad: 10, activo: true },
  { id: 'senior', nombre: 'PROFESIONAL SENIOR', capacidad: 15, activo: true },
  { id: 'coordinador', nombre: 'COORDINADOR', capacidad: 8, activo: true },
];

const NOTIFICACIONES_DEFECTO: ConfiguracionNotificaciones = {
  vencimiento7dias: true,
  vencimiento3dias: true,
  vencimiento1dia: true,
  procesoVencido: true,
  asignacionProceso: true,
  cambioEtapa: true,
  aprobacionRequerida: false,
  resumenDiario: true,
  resumenSemanal: true,
};

const ALERTAS_DEFECTO: ConfiguracionAlertas = {
  porcentajeRiesgo: 85,
  porcentajeCritico: 95,
  capacidadAlerta: 90,
  diasAnticipacion: 7,
};

// ============ COMPONENTE PRINCIPAL ============

export function ModuloConfiguracion() {
  // Estados de configuración - Etapas ahora dinámicas
  const [etapas, setEtapas] = useState<Etapa[]>([]); // Start empty, load from backend if possible, or keep defaults if endpoint not ready for stages

  // Capacidades dinámicas
  const [cargos, setCargos] = useState<Cargo[]>([]);

  const [editandoEtapa, setEditandoEtapa] = useState<string | null>(null);
  const [nombreEditando, setNombreEditando] = useState('');
  const [diasEditando, setDiasEditando] = useState<number>(0);
  const [editandoCargo, setEditandoCargo] = useState<string | null>(null);
  const [nombreCargoEditando, setNombreCargoEditando] = useState('');
  const [mostrarModalAgregarCargo, setMostrarModalAgregarCargo] = useState(false);
  const [nuevoCargoNombre, setNuevoCargoNombre] = useState('');
  const [nuevoCargoCapacidad, setNuevoCargoCapacidad] = useState(10);

  const [loading, setLoading] = useState(true);

  // Cargar configuración al iniciar
  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      const [globalConfig, stagesConfig, availableRoles] = await Promise.all([
        disciplinaryService.getGlobalConfig(),
        disciplinaryService.getStageConfiguration(),
        disciplinaryService.getAvailableRoles().catch(() => []) // Fallback to empty if endpoint fails
      ]);

      // 1. Mapear Global Config (Capacidades, Notificaciones, Alertas)
      if (globalConfig) {
        // Capacidades
        const roleCapacities = globalConfig.roleCapacities || {};

        // Merge DB roles with Configured capacities
        // Source of truth for EXISTENCE is availableRoles (from DB professionals)
        // Source of truth for CAPACITY is globalConfig

        // If availableRoles is empty (e.g. no professionals yet), we might want to show defaults or nothing.
        // Let's assume we show what's in DB + what's in Config (legacy support)
        // or strictly what's in DB. The requirement says "basado en la composición actual".

        // Let's normalize keys
        const normalizeKey = (name: string) => name.toLowerCase().replace(/ /g, '_');

        let mergedCargos: Cargo[] = [];

        if (availableRoles && availableRoles.length > 0) {
          mergedCargos = availableRoles.map((roleName: string, index: number) => {
            const key = normalizeKey(roleName);
            // Try to find capacity by exact key or normalized key
            // Note: roleCapacities might have keys like 'asesor_juridico'
            let capacity = roleCapacities[key] || roleCapacities[roleName];

            // If not found, default to 10
            if (capacity === undefined) capacity = 10;

            return {
              id: (index + 1).toString(),
              nombre: roleName, // Use the name from DB directly
              capacidad: Number(capacity),
              rolId: key // Store normalized key for saving
            };
          });
        } else {
          // Fallback: Use only config if no DB roles found (legacy behavior)
          let entries: [string, any][] = [];
          if (Array.isArray(roleCapacities)) {
            console.warn('roleCapacities is an array:', roleCapacities);
          } else {
            entries = Object.entries(roleCapacities);
          }

          mergedCargos = entries.map(([key, value], index) => {
            const name = isNaN(Number(key)) ? key.replace(/_/g, ' ').toUpperCase() : `CARGO ${key}`;
            return {
              id: (index + 1).toString(),
              nombre: name,
              capacidad: Number(value),
              rolId: key
            };
          });
        }

        setCargos(mergedCargos);

        // Notificaciones
        if (globalConfig.notificationSettings) {
          setNotificaciones(prev => ({ ...prev, ...globalConfig.notificationSettings }));
        }

        // Alertas
        if (globalConfig.alertSettings) {
          setAlertas(prev => ({ ...prev, ...globalConfig.alertSettings }));
        }
      }

      // 2. Mapear Stages
      if (stagesConfig && Array.isArray(stagesConfig) && stagesConfig.length > 0) {
        const mappedStages = stagesConfig.map((s: any, index: number) => ({
          id: s.id || (index + 1).toString(),
          nombre: s.etapa,
          dias: s.diasHabiles,
          orden: index + 1
        }));
        setEtapas(mappedStages);
      } else {
        // Fallback defaults if empty
        setEtapas([
          { id: '1', nombre: 'RECEPCION', dias: 3, orden: 1 },
          { id: '2', nombre: 'VALORACION', dias: 10, orden: 2 },
          { id: '3', nombre: 'INDAGACION_PREVIA', dias: 40, orden: 3 },
          { id: '4', nombre: 'INVESTIGACION', dias: 60, orden: 4 },
          { id: '5', nombre: 'EVALUACION', dias: 10, orden: 5 },
          { id: '6', nombre: 'JUZGAMIENTO', dias: 50, orden: 6 },
          { id: '7', nombre: 'SEGUNDA_INSTANCIA', dias: 10, orden: 7 }
        ]);
      }

    } catch (error) {
      console.error('Error loading config:', error);
      toast.error('Error al cargar la configuración del servidor');
    } finally {
      setLoading(false);
    }
  };

  const [notificaciones, setNotificaciones] = useState({
    vencimiento7dias: true,
    vencimiento3dias: true,
    vencimiento1dia: true,
    procesoVencido: true,
    asignacionProceso: true,
    cambioEtapa: true,
    aprobacionRequerida: false,
    resumenDiario: true,
    resumenSemanal: true
  });

  const [alertas, setAlertas] = useState({
    porcentajeRiesgo: 85,
    porcentajeCritico: 95,
    capacidadAlerta: 90,
    diasAnticipacion: 7
  });

  const handleGuardar = async () => {
    try {
      // 1. Prepare Global Config Payload
      const roleCapacities: Record<string, number> = {};
      cargos.forEach(c => {
        // Use consistent key format: lowercase, underscores
        const key = c.rolId || c.nombre.toLowerCase().replace(/ /g, '_');
        roleCapacities[key] = c.capacidad;
      });

      const globalPayload = {
        roleCapacities,
        notificationSettings: notificaciones,
        alertSettings: alertas,
        securitySettings: { auditEnabled: true, digitalSignature: true, backupEnabled: true } // Keep existing or add state for these if needed
      };

      // 2. Prepare Stages Payload
      const stagesPayload = etapas.map(e => ({
        etapa: e.nombre,
        diasHabiles: e.dias,
        descripcion: `Etapa de ${e.nombre}`,
        activo: true
      }));

      // 3. Send to Backend
      await Promise.all([
        disciplinaryService.updateGlobalConfig(globalPayload),
        disciplinaryService.updateStageConfiguration(stagesPayload)
      ]);

      toast.success('Configuración guardada exitosamente', {
        description: 'Los cambios se aplicarán de inmediato'
      });
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Error al guardar la configuración');
    }
  };

  const handleRestablecer = async () => {
    if (!confirm('¿Está seguro de restablecer la configuración a valores por defecto?')) return;

    try {
      // 1. Restablecer capacidades de todos los cargos a 10
      const cargosRestablecidos = cargos.map(c => ({ ...c, capacidad: 10 }));
      setCargos(cargosRestablecidos);

      // 2. Restablecer notificaciones a valores por defecto
      const notificacionesDefault = {
        vencimiento7dias: true,
        vencimiento3dias: true,
        vencimiento1dia: true,
        procesoVencido: true,
        asignacionProceso: true,
        cambioEtapa: true,
        aprobacionRequerida: false,
        resumenDiario: true,
        resumenSemanal: true,
        emailMasterSwitch: true // Notificaciones por email activadas
      };
      setNotificaciones(notificacionesDefault);

      // 3. Restablecer parámetros de alerta
      const alertasDefault = {
        porcentajeRiesgo: 85,
        porcentajeCritico: 95,
        capacidadAlerta: 90,
        diasAnticipacion: 7
      };
      setAlertas(alertasDefault);

      // 4. Preparar payload con roleCapacities restablecidas
      const roleCapacities: Record<string, number> = {};
      cargosRestablecidos.forEach(c => {
        const key = c.rolId || c.nombre.toLowerCase().replace(/ /g, '_');
        roleCapacities[key] = 10; // Todos a 10
      });

      // 5. Guardar en backend
      const globalPayload = {
        roleCapacities,
        notificationSettings: notificacionesDefault,
        alertSettings: alertasDefault,
        securitySettings: {
          auditEnabled: true,       // Registro de auditoría
          digitalSignature: true,   // Firma digital requerida
          backupEnabled: true,      // Backup automático
          emailNotifications: true  // Notificaciones por email
        }
      };

      await disciplinaryService.updateGlobalConfig(globalPayload);

      toast.success('Configuración restablecida', {
        description: 'Todos los valores han sido restaurados a sus valores por defecto'
      });

    } catch (error) {
      console.error('Error restableciendo configuración:', error);
      toast.error('Error al restablecer la configuración');
    }
  };

  /* MODIFIED: Persist addition immediately */
  const handleAgregarEtapa = async () => {
    const nuevaEtapa: Etapa = {
      id: `temp-${Date.now()}`, // Temporary ID that backend will ignore
      nombre: 'NUEVA ETAPA',
      dias: 10,
      orden: etapas.length + 1
    };
    const updatedEtapas = [...etapas, nuevaEtapa];
    setEtapas(updatedEtapas);

    try {
      const stagesPayload = updatedEtapas.map(e => ({
        id: e.id,
        etapa: e.nombre,
        diasHabiles: e.dias,
        descripcion: `Etapa de ${e.nombre}`,
        activo: true
      }));
      await disciplinaryService.updateStageConfiguration(stagesPayload);
      toast.success('Nueva etapa agregada');
    } catch (error) {
      console.error('Error adding stage:', error);
      toast.error('Error al agregar etapa');
    }
  };

  /* MODIFIED: Persist deletion immediately */
  const handleEliminarEtapa = async (id: string) => {
    const updatedEtapas = etapas.filter(etapa => etapa.id !== id);
    setEtapas(updatedEtapas);

    try {
      const stagesPayload = updatedEtapas.map(e => ({
        id: e.id,
        etapa: e.nombre,
        diasHabiles: e.dias,
        descripcion: `Etapa de ${e.nombre}`,
        activo: true
      }));
      await disciplinaryService.updateStageConfiguration(stagesPayload);
      toast.info('Etapa eliminada');
    } catch (error) {
      console.error('Error deleting stage:', error);
      toast.error('Error al eliminar etapa');
    }
  };

  const handleEditarEtapa = (id: string) => {
    const etapa = etapas.find(etapa => etapa.id === id);
    if (etapa) {
      setEditandoEtapa(id);
      setNombreEditando(etapa.nombre);
      setDiasEditando(etapa.dias);
    }
  };

  /* MODIFIED: Inline save with instant backend update */
  const handleGuardarEdicionEtapa = async (id: string) => {
    // 1. Update local state first for responsiveness
    // Use the explicit edit state values
    const updatedEtapas = etapas.map(etapa => etapa.id === id ? { ...etapa, nombre: nombreEditando, dias: diasEditando } : etapa);
    setEtapas(updatedEtapas);
    setEditandoEtapa(null);
    setNombreEditando('');
    setDiasEditando(0);

    // 2. Send to backend immediately
    try {
      const stagesPayload = updatedEtapas.map(e => ({
        id: e.id, /* Send ID to allow renaming */
        etapa: e.nombre,
        diasHabiles: e.dias,
        descripcion: `Etapa de ${e.nombre}`,
        activo: true
      }));

      await disciplinaryService.updateStageConfiguration(stagesPayload);
      toast.success('Etapa actualizada');
    } catch (error) {
      console.error('Error saving stage:', error);
      toast.error('Error al guardar cambios en la etapa');
      // Optional: revert local state on error?
    }
  };

  /* MODIFIED: Persist new role immediately */
  const handleAgregarCargo = async () => {
  // Estados
  const [estadosKanban, setEstadosKanban] = useState<EstadoKanban[]>(ESTADOS_KANBAN_DEFECTO);
  const [cargos, setCargos] = useState<Cargo[]>(CARGOS_DEFECTO);
  const [notificaciones, setNotificaciones] = useState<ConfiguracionNotificaciones>(NOTIFICACIONES_DEFECTO);
  const [alertas, setAlertas] = useState<ConfiguracionAlertas>(ALERTAS_DEFECTO);
  const [cambiosPendientes, setCambiosPendientes] = useState(false);

  // Estados para modales
  const [showModalAgregarEstado, setShowModalAgregarEstado] = useState(false);
  const [showModalEliminarEstado, setShowModalEliminarEstado] = useState(false);
  const [estadoAEliminar, setEstadoAEliminar] = useState<EstadoKanban | null>(null);

  // ============ FUNCIONES DE ESTADOS KANBAN ============

  const agregarEstado = () => {
    setShowModalAgregarEstado(true);
  };

  const confirmarAgregarEstado = () => {
    const nuevoEstado: EstadoKanban = {
      id: `estado-${Date.now()}`,
      nombre: 'Nuevo Estado',
      color: '#3B82F6',
      dias: 10,
      alertaDias: 3,
      orden: estadosKanban.length + 1,
      activo: true,
    };

    setEstadosKanban([...estadosKanban, nuevoEstado]);
    setCambiosPendientes(true);
    setShowModalAgregarEstado(false);
    
    toast.success('Estado agregado correctamente', {
      description: 'Se ha agregado un nuevo estado al tablero Kanban',
      duration: 3000
    });
  };

  const solicitarEliminarEstado = (estadoId: string) => {
    const estado = estadosKanban.find(e => e.id === estadoId);
    if (estado) {
      setEstadoAEliminar(estado);
      setShowModalEliminarEstado(true);
    }
  };

  const confirmarEliminarEstado = () => {
    if (!estadoAEliminar) return;

    setEstadosKanban(estadosKanban.filter(e => e.id !== estadoAEliminar.id));
    setCambiosPendientes(true);
    setShowModalEliminarEstado(false);
    
    toast.success('Estado eliminado correctamente', {
      description: `"${estadoAEliminar.nombre}" ha sido eliminado del tablero Kanban`,
      duration: 3000
    });
    
    setEstadoAEliminar(null);
  };

  const actualizarEstado = (estadoId: string, cambios: Partial<EstadoKanban>) => {
    setEstadosKanban(estadosKanban.map(e => 
      e.id === estadoId ? { ...e, ...cambios } : e
    ));
    setCambiosPendientes(true);
  };

  // ============ FUNCIONES DE CARGOS ============

  const agregarCargo = async () => {
    const nuevoCargo: Cargo = {
      id: `cargo-${Date.now()}`,
      nombre: 'NUEVO CARGO',
      capacidad: 10,
      activo: true,
    };
    const updatedCargos = [...cargos, nuevoCargo];
    setCargos(updatedCargos);
    setMostrarModalAgregarCargo(false);
    setNuevoCargoNombre('');
    setNuevoCargoCapacidad(10);

    // Save to Global Config
    try {
      const roleCapacities: Record<string, number> = {};
      updatedCargos.forEach(c => {
        const key = c.rolId || c.nombre.toLowerCase().replace(/ /g, '_');
        roleCapacities[key] = c.capacidad;
      });
      const globalPayload = {
        roleCapacities,
        notificationSettings: notificaciones,
        alertSettings: alertas,
        securitySettings: { auditEnabled: true, digitalSignature: true, backupEnabled: true }
      };
      await disciplinaryService.updateGlobalConfig(globalPayload);

      toast.success('Cargo agregado exitosamente', {
        description: `${nuevoCargoNombre} con capacidad de ${nuevoCargoCapacidad} procesos`
      });
    } catch (error) {
      console.error('Error adding role:', error);
      toast.error('Error al guardar el nuevo cargo');
    }
  };

  /* MODIFIED: Persist deletion immediately */
  const handleEliminarCargo = async (id: string) => {
    const cargo = cargos.find(c => c.id === id);
    const updatedCargos = cargos.filter(c => c.id !== id);
    setCargos(updatedCargos);

    if (cargo) {
      try {
        const roleCapacities: Record<string, number> = {};
        updatedCargos.forEach(c => {
          const key = c.rolId || c.nombre.toLowerCase().replace(/ /g, '_');
          roleCapacities[key] = c.capacidad;
        });
        const globalPayload = {
          roleCapacities,
          notificationSettings: notificaciones,
          alertSettings: alertas,
          securitySettings: { auditEnabled: true, digitalSignature: true, backupEnabled: true }
        };
        await disciplinaryService.updateGlobalConfig(globalPayload);

        toast.info('Cargo eliminado', {
          description: `${cargo.nombre} ha sido removido`
        });
      } catch (error) {
        console.error('Error deleting role:', error);
        toast.error('Error al eliminar el cargo');
      }
    setCargos([...cargos, nuevoCargo]);
    setCambiosPendientes(true);
    toast.success('Cargo agregado correctamente');
  };

  const eliminarCargo = (cargoId: string) => {
    setCargos(cargos.filter(c => c.id !== cargoId));
    setCambiosPendientes(true);
    toast.success('Cargo eliminado correctamente');
  };

  const actualizarCargo = (cargoId: string, cambios: Partial<Cargo>) => {
    setCargos(cargos.map(c => 
      c.id === cargoId ? { ...c, ...cambios } : c
    ));
    setCambiosPendientes(true);
  };

  // ============ FUNCIONES PRINCIPALES ============

  const guardarConfiguraciones = () => {
    try {
      const configuracion = {
        estadosKanban,
        cargos,
        notificaciones,
        alertas,
        alertasProgramadas,
        fechaActualizacion: new Date().toISOString()
      };
      
      localStorage.setItem('disciplinario-configuracion', JSON.stringify(configuracion));
      setCambiosPendientes(false);
      
      toast.success('Configuraciones guardadas correctamente', {
        description: 'Los cambios se han aplicado al sistema disciplinario',
        duration: 3000
      });
    } catch (error) {
      console.error('❌ Error al guardar configuraciones:', error);
      toast.error('Error al guardar configuraciones');
    }
  };

  const restablecerDefecto = () => {
    if (window.confirm('¿Está seguro de restablecer la configuración a valores por defecto? Esta acción no se puede deshacer.')) {
      setEstadosKanban(ESTADOS_KANBAN_DEFECTO);
      setCargos(CARGOS_DEFECTO);
      setNotificaciones(NOTIFICACIONES_DEFECTO);
      setAlertas(ALERTAS_DEFECTO);
      setAlertasProgramadas(ALERTAS_PROGRAMADAS_DEFECTO);
      setCambiosPendientes(true);
      
      toast.success('Configuraciones restablecidas', {
        description: 'Se han restaurado los valores por defecto',
        duration: 3000
      });
    }
  };

  // ============ DRAG AND DROP ============

  /* MODIFIED: Persist edit immediately */
  const handleGuardarEdicionCargo = async (id: string) => {
    const updatedCargos = cargos.map(cargo => cargo.id === id ? { ...cargo, nombre: nombreCargoEditando } : cargo);
    setCargos(updatedCargos);
    setEditandoCargo(null);
    setNombreCargoEditando('');

    try {
      const roleCapacities: Record<string, number> = {};
      updatedCargos.forEach(c => {
        const key = c.rolId || c.nombre.toLowerCase().replace(/ /g, '_');
        roleCapacities[key] = c.capacidad;
      });
      const globalPayload = {
        roleCapacities,
        notificationSettings: notificaciones,
        alertSettings: alertas,
        securitySettings: { auditEnabled: true, digitalSignature: true, backupEnabled: true }
      };
      await disciplinaryService.updateGlobalConfig(globalPayload);
      toast.success('Cargo actualizado');
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Error al actualizar el cargo');
    }
  };
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = estadosKanban.findIndex(e => e.id === active.id);
    const newIndex = estadosKanban.findIndex(e => e.id === over.id);

    const reorderedEstados = arrayMove(estadosKanban, oldIndex, newIndex);

    setEstadosKanban(reorderedEstados.map((e, i) => ({ ...e, orden: i + 1 })));
    setCambiosPendientes(true);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold mb-2" style={{ color: '#003DA5' }}>
            Configuración del Sistema
          </h1>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            Parámetros y ajustes del módulo disciplinario
          </p>
        </div>
        <div className="flex items-center gap-3">
          {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIGURACIONES_RESET) && (
          <button
            onClick={handleRestablecer}
            className="px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2"
            style={{ background: '#F3F4F6', color: '#4B5563' }}
          >
            Restablecer
          </button>
          )}
          {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIGURACIONES_EDIT) && (
          <button
            onClick={handleGuardar}
            className="px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:opacity-90"
            style={{ background: '#003DA5', color: '#FFFFFF' }}
          >
            <Save className="w-4 h-4" />
            Guardar Cambios
          </button>
          )}
        </div>
      </div>

      {/* Tiempos por Etapa */}
      <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl" style={{ background: '#E0EDFF' }}>
            <Clock className="w-6 h-6" style={{ color: '#003DA5' }} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold" style={{ color: '#1F2937' }}>
              Tiempos por Etapa
            </h2>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Duración estándar en días para cada etapa del proceso
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {etapas.map(etapa => (
            <div key={etapa.id} className="p-5 rounded-xl" style={{ background: '#F9FAFB' }}>
              <label className="block mb-3">
                <span className="text-sm font-bold uppercase mb-2 block" style={{ color: '#4B5563' }}>
                  {editandoEtapa === etapa.id ? (
                    <input
                      disabled={!authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIGURACIONES_ETAPA_EDIT)}
                      type="text"
                      value={nombreEditando}
                      onChange={(e) => setNombreEditando(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#003DA5]"
                      style={{ borderColor: '#E5E7EB' }}
                      autoFocus
                    />
                  ) : (
                    etapa.nombre
                  )}
                </span>

                <div className="flex items-center gap-3">
                  {editandoEtapa === etapa.id ? (
                    <input
                      disabled={!authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIGURACIONES_ETAPA_EDIT)}
                      type="number"
                      min="1"
                      max="365"
                      value={diasEditando}
                      onChange={(e) => setDiasEditando(parseInt(e.target.value) || 0)}
                      className="flex-1 px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#003DA5]"
                      style={{ borderColor: '#E5E7EB' }}
                    />
                  ) : (
                    <div className="flex-1 px-4 py-2.5 rounded-xl border-2 bg-gray-50 flex items-center" style={{ borderColor: '#E5E7EB' }}>
                      <span className="font-bold text-lg" style={{ color: '#1F2937' }}>
                        {etapa.dias}
                      </span>
                    </div>
                  )}
                  <span className="text-sm font-semibold whitespace-nowrap" style={{ color: '#6B7280' }}>
                    días
                  </span>
                </div>
              </label>

              <button
                onClick={agregarEstado}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm text-white transition-all hover:shadow-lg flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
                  boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
                }}
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Estado</span>
              </button>
            </div>
          ))}
          <div className="p-5 rounded-xl" style={{ background: '#F9FAFB' }}>
            {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIGURACIONES_ETAPA_CREATE) && (
            <button
              onClick={handleAgregarEtapa}
              className="px-2 py-1.5 rounded-xl font-semibold flex items-center gap-2"
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              <Plus className="w-4 h-4" />
              Agregar Etapa
            </button>
            )}
          </div>
        </div>

        <div className="mt-6 p-4 rounded-xl flex items-start gap-3" style={{ background: '#E0EDFF' }}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: '#003DA5' }} />
          <p className="text-sm" style={{ color: '#003DA5' }}>
            <span className="font-bold">Importante:</span> Estos tiempos se utilizan para calcular las alertas automáticas y el semáforo de cada proceso.
          </p>
        </div>
      </Card>

      {/* Capacidades por Cargo */}
      <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl" style={{ background: '#D1FAE5' }}>
            <Users className="w-6 h-6" style={{ color: '#10B981' }} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold" style={{ color: '#1F2937' }}>
              Capacidad por Cargo
            </h2>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Número máximo de procesos que puede gestionar cada tipo de profesional
            </p>
          </div>
        </div>

        <div className="mb-6 p-4 rounded-xl flex items-start gap-3" style={{ background: '#E0EDFF' }}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: '#003DA5' }} />
          <p className="text-sm" style={{ color: '#003DA5' }}>
            <span className="font-bold">Recordatorio:</span> Estas son configuraciones de capacidad. Los usuarios se crean únicamente desde{' '}
            <span className="font-bold">Administración de Personas → Roles y Permisos</span>. En la sección "Profesionales" solo se asignan usuarios existentes al equipo disciplinario.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cargos.map(cargo => (
            <div key={cargo.id} className="p-5 rounded-xl border-2" style={{ borderColor: '#E5E7EB' }}>
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5" style={{ color: '#003DA5' }} />
                <span className="text-sm font-bold uppercase" style={{ color: '#1F2937' }}>
                  {cargo.nombre}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  disabled={!authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIGURACIONES_CARGO_EDIT)}
                  type="number"
                  min="1"
                  max="30"
                  value={cargo.capacidad || ''}
                  onChange={(e) => setCargos(cargos.map(c => c.id === cargo.id ? { ...c, capacidad: parseInt(e.target.value) || 0 } : c))}
                  className="flex-1 px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] text-center text-xl font-bold"
                  style={{ borderColor: '#E5E7EB', color: '#003DA5' }}
                />
              </div>
              <p className="text-xs text-center mt-2" style={{ color: '#9CA3AF' }}>
                procesos máximo
              </p>
              <div className="flex items-center gap-2 mt-2">
                {editandoCargo === cargo.id ? (
                  <button
                    onClick={() => handleGuardarEdicionCargo(cargo.id)}
                    className="px-2 py-1.5 rounded-xl font-semibold flex items-center gap-2"
                    style={{ background: '#003DA5', color: '#FFFFFF' }}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Guardar
                  </button>
                ) : (
                  <>
                    {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIGURACIONES_CARGO_EDIT) && (
                    <button
                      onClick={() => handleEditarCargo(cargo.id)}
                      className="px-2 py-1.5 rounded-xl font-semibold flex items-center gap-2"
                      style={{ background: '#F3F4F6', color: '#4B5563' }}
                    >
                      <Edit2 className="w-4 h-4" />
                      Editar
                    </button>
                    )}
                    {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIGURACIONES_CARGO_DELETE) && (
                    <button
                      onClick={() => handleEliminarCargo(cargo.id)}
                      className="px-2 py-1.5 rounded-xl font-semibold flex items-center gap-2"
                      style={{ background: '#F3F4F6', color: '#4B5563' }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
          <div className="p-5 rounded-xl" style={{ background: '#F9FAFB' }}>
            {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIGURACIONES_CARGO_CREATE) && (
            <button
              onClick={() => setMostrarModalAgregarCargo(true)}
              className="px-2 py-1.5 rounded-xl font-semibold flex items-center gap-2"
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              <Plus className="w-4 h-4" />
              Agregar Cargo
            </button>
            )}
          </div>
        </div>

      </Card>

      {/* Modal para agregar cargo */}
      <AnimatePresence>
        {mostrarModalAgregarCargo && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-50"
              onClick={() => setMostrarModalAgregarCargo(false)}
            />
            <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
            >
              <DndContext sensors={sensors}>
                <SortableContext
                  items={estadosKanban.map(e => e.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {estadosKanban.map((estado, index) => (
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
          </>
        )}

        </AnimatePresence>

        {/* 3. CAPACIDAD POR CARGO */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 flex-col sm:flex-row gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#10B981' }} />
                  Capacidad por Cargo
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  Número máximo de procesos que puede gestionar cada tipo de profesional
                </p>
              </div>
              <button
                onClick={agregarCargo}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm text-white transition-all hover:shadow-lg flex-shrink-0"
                style={{ 
                  background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
                  boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
                }}
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Cargo</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {cargos.map((cargo) => (
                <div key={cargo.id} className="p-4 rounded-lg border-2 border-gray-200 bg-gradient-to-br from-blue-50 to-white">
                  <div className="mb-3">
                    <input
                      type="text"
                      value={cargo.nombre}
                      onChange={(e) => actualizarCargo(cargo.id, { nombre: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-1.5 text-sm font-bold uppercase border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nombre del cargo"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="text-xs font-semibold text-gray-700 mb-1 block text-center">
                      Capacidad Máxima
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={cargo.capacidad}
                      onChange={(e) => actualizarCargo(cargo.id, { capacidad: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ color: '#003DA5' }}
                    />
                    <p className="text-xs text-center mt-2 text-gray-600">
                      procesos máximo
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cargo.activo}
                        onChange={(e) => actualizarCargo(cargo.id, { activo: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs font-semibold text-gray-700">Activo</span>
                    </label>
                    
                    <button
                      onClick={() => eliminarCargo(cargo.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 rounded-lg bg-blue-50 border-l-4 border-blue-500">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-800">
                    <span className="font-bold">Recordatorio:</span> Estas son configuraciones de capacidad. Los usuarios se crean únicamente desde{' '}
                    <span className="font-bold">Administración de Personas → Roles y Permisos</span>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. NOTIFICACIONES */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-3 sm:p-4 lg:p-6">
            <div className="mb-4 sm:mb-6">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#F59E0B' }} />
                Notificaciones
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Configura las alertas automáticas del sistema
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Alertas de Vencimiento */}
              <div className="p-4 rounded-lg bg-gray-50">
                <h3 className="text-sm font-bold mb-4 uppercase text-gray-700">
                  Alertas de Vencimiento
                </h3>
                <div className="space-y-3">
                  {[
                    { key: 'vencimiento7dias', label: '7 días antes del vencimiento' },
                    { key: 'vencimiento3dias', label: '3 días antes del vencimiento' },
                    { key: 'vencimiento1dia', label: '1 día antes del vencimiento' },
                    { key: 'procesoVencido', label: 'Proceso vencido (inmediato)' }
                  ].map((item) => (
                    <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificaciones[item.key as keyof ConfiguracionNotificaciones] as boolean}
                        onChange={(e) => {
                          setNotificaciones({
                            ...notificaciones,
                            [item.key]: e.target.checked
                          });
                          setCambiosPendientes(true);
                        }}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-900">
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Notificaciones de Proceso */}
              <div className="p-4 rounded-lg bg-gray-50">
                <h3 className="text-sm font-bold mb-4 uppercase text-gray-700">
                  Notificaciones de Proceso
                </h3>
                <div className="space-y-3">
                  {[
                    { key: 'asignacionProceso', label: 'Asignación de nuevo proceso' },
                    { key: 'cambioEtapa', label: 'Cambio de etapa' },
                    { key: 'aprobacionRequerida', label: 'Aprobación requerida' }
                  ].map((item) => (
                    <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificaciones[item.key as keyof ConfiguracionNotificaciones] as boolean}
                        onChange={(e) => {
                          setNotificaciones({
                            ...notificaciones,
                            [item.key]: e.target.checked
                          });
                          setCambiosPendientes(true);
                        }}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-900">
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Resúmenes */}
              <div className="p-4 rounded-lg bg-gray-50 md:col-span-2">
                <h3 className="text-sm font-bold mb-4 uppercase text-gray-700">
                  Resúmenes Automáticos
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { key: 'resumenDiario', label: 'Resumen diario (8:00 AM)' },
                    { key: 'resumenSemanal', label: 'Resumen semanal (Lunes 8:00 AM)' }
                  ].map((item) => (
                    <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificaciones[item.key as keyof ConfiguracionNotificaciones] as boolean}
                        onChange={(e) => {
                          setNotificaciones({
                            ...notificaciones,
                            [item.key]: e.target.checked
                          });
                          setCambiosPendientes(true);
                        }}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-900">
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 5. PARÁMETROS DE ALERTAS */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-3 sm:p-4 lg:p-6">
            <div className="mb-4 sm:mb-6">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#DC2626' }} />
                Parámetros de Alertas y Semáforo
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Configure el sistema de semáforo que indica el estado de avance de cada proceso
              </p>
            </div>

            {/* Explicación Visual del Semáforo */}
            <div className="mb-6 p-5 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                ¿Cómo funciona el semáforo de procesos?
              </h3>
              <p className="text-sm text-gray-700 mb-4">
                El sistema calcula automáticamente el <strong>% de tiempo consumido</strong> de cada proceso según los días configurados en cada estado. 
                Ejemplo: Si un estado dura 10 días y ya pasaron 8 días, el proceso ha consumido el <strong>80%</strong> del tiempo.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Verde */}
                <div className="bg-white rounded-lg p-4 border-2 border-green-400">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-green-500"></div>
                    <span className="font-bold text-green-800">VERDE - Normal</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    El proceso va a tiempo. Tiempo consumido es <strong>menor al {alertas.porcentajeRiesgo}%</strong>
                  </p>
                  <div className="mt-2 text-xs font-mono bg-green-100 text-green-800 px-2 py-1 rounded">
                    Ejemplo: 0% - {alertas.porcentajeRiesgo - 1}% consumido
                  </div>
                </div>

                {/* Amarillo */}
                <div className="bg-white rounded-lg p-4 border-2 border-amber-400">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-amber-500"></div>
                    <span className="font-bold text-amber-800">AMARILLO - Alerta</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    El proceso está cerca de vencerse. Tiempo consumido entre <strong>{alertas.porcentajeRiesgo}% y {alertas.porcentajeCritico - 1}%</strong>
                  </p>
                  <div className="mt-2 text-xs font-mono bg-amber-100 text-amber-800 px-2 py-1 rounded">
                    Ejemplo: {alertas.porcentajeRiesgo}% - {alertas.porcentajeCritico - 1}% consumido
                  </div>
                </div>

                {/* Rojo */}
                <div className="bg-white rounded-lg p-4 border-2 border-red-400">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-red-500"></div>
                    <span className="font-bold text-red-800">ROJO - Crítico</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    El proceso está vencido o crítico. Tiempo consumido es <strong>mayor o igual al {alertas.porcentajeCritico}%</strong>
                  </p>
                  <div className="mt-2 text-xs font-mono bg-red-100 text-red-800 px-2 py-1 rounded">
                    Ejemplo: {alertas.porcentajeCritico}% - 100%+ consumido
                  </div>
                </div>
              </div>
            </div>

            {/* Configuración de Umbrales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Umbral Amarillo */}
              <div className="p-5 rounded-lg bg-amber-50 border-2 border-amber-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-900">
                        Umbral de Riesgo (Amarillo)
                      </span>
                      <span className="px-3 py-1 rounded-full text-sm font-bold bg-amber-200 text-amber-900">
                        {alertas.porcentajeRiesgo}%
                      </span>
                    </div>
                  </div>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  value={alertas.porcentajeRiesgo}
                  onChange={(e) => {
                    const nuevoValor = parseInt(e.target.value);
                    // Asegurar que el amarillo sea menor que el rojo
                    if (nuevoValor < alertas.porcentajeCritico) {
                      setAlertas({
                        ...alertas,
                        porcentajeRiesgo: nuevoValor
                      });
                      setCambiosPendientes(true);
                    }
                  }}
                  className="w-full h-2 bg-gradient-to-r from-green-200 via-amber-300 to-amber-500 rounded-lg appearance-none cursor-pointer"
                />
                <div className="mt-3 p-3 bg-white rounded border border-amber-300">
                  <p className="text-xs text-gray-700">
                    <strong>Se activa cuando:</strong> Un proceso ha consumido el <strong>{alertas.porcentajeRiesgo}%</strong> del tiempo asignado a su etapa actual.
                  </p>
                  <p className="text-xs text-gray-600 mt-2">
                    📍 <strong>Ejemplo práctico:</strong> Si una etapa dura 10 días, el semáforo se pondrá amarillo al día {Math.ceil((alertas.porcentajeRiesgo / 100) * 10)}.
                  </p>
                </div>
              </div>

              {/* Umbral Rojo */}
              <div className="p-5 rounded-lg bg-red-50 border-2 border-red-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-900">
                        Umbral Crítico (Rojo)
                      </span>
                      <span className="px-3 py-1 rounded-full text-sm font-bold bg-red-200 text-red-900">
                        {alertas.porcentajeCritico}%
                      </span>
                    </div>
                  </div>
                </div>
                <input
                  type="range"
                  min="80"
                  max="100"
                  value={alertas.porcentajeCritico}
                  onChange={(e) => {
                    const nuevoValor = parseInt(e.target.value);
                    // Asegurar que el rojo sea mayor que el amarillo
                    if (nuevoValor > alertas.porcentajeRiesgo) {
                      setAlertas({
                        ...alertas,
                        porcentajeCritico: nuevoValor
                      });
                      setCambiosPendientes(true);
                    }
                  }}
                  className="w-full h-2 bg-gradient-to-r from-amber-300 via-red-400 to-red-600 rounded-lg appearance-none cursor-pointer"
                />
                <div className="mt-3 p-3 bg-white rounded border border-red-300">
                  <p className="text-xs text-gray-700">
                    <strong>Se activa cuando:</strong> Un proceso ha consumido el <strong>{alertas.porcentajeCritico}%</strong> del tiempo asignado a su etapa actual.
                  </p>
                  <p className="text-xs text-gray-600 mt-2">
                    📍 <strong>Ejemplo práctico:</strong> Si una etapa dura 10 días, el semáforo se pondrá rojo al día {Math.ceil((alertas.porcentajeCritico / 100) * 10)}.
                  </p>
                </div>
              </div>

              {/* Alerta de Capacidad */}
              <div className="p-5 rounded-lg bg-blue-50 border-2 border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-900">
                        Alerta de Capacidad
                      </span>
                      <span className="px-3 py-1 rounded-full text-sm font-bold bg-blue-200 text-blue-900">
                        {alertas.capacidadAlerta}%
                      </span>
                    </div>
                  </div>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={alertas.capacidadAlerta}
                  onChange={(e) => {
                    setAlertas({
                      ...alertas,
                      capacidadAlerta: parseInt(e.target.value)
                    });
                    setCambiosPendientes(true);
                  }}
                  className="w-full h-2 bg-gradient-to-r from-green-200 via-blue-300 to-blue-600 rounded-lg appearance-none cursor-pointer"
                />
                <div className="mt-3 p-3 bg-white rounded border border-blue-300">
                  <p className="text-xs text-gray-700">
                    <strong>Se activa cuando:</strong> Un profesional alcanza el <strong>{alertas.capacidadAlerta}%</strong> de su capacidad máxima de procesos asignados.
                  </p>
                  <p className="text-xs text-gray-600 mt-2">
                    📍 <strong>Ejemplo práctico:</strong> Si un profesional puede tener 10 procesos, recibirá alerta al tener {Math.ceil((alertas.capacidadAlerta / 100) * 10)} procesos asignados.
                  </p>
                </div>
              </div>
            </div>
            </div>
          </div>
      <ConfiguracionFirmaPersonal />

      {/* Parámetros de Alertas */}
      <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl" style={{ background: '#FEE2E2' }}>
            <AlertTriangle className="w-6 h-6" style={{ color: '#DC2626' }} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold" style={{ color: '#1F2937' }}>
              Parámetros de Alertas
            </h2>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Umbrales para activar las alertas del sistema
            </p>
          </div>
        </div>

        <Card className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-xl" style={{ background: '#FFFBEB' }}>
            <label className="block">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold" style={{ color: '#1F2937' }}>
                  Porcentaje de Riesgo (Amarillo)
                </span>
                <Badge style={{ background: '#FEF3C7', color: '#D97706' }}>
                  {alertas.porcentajeRiesgo}%
                </Badge>
                {/* Días de Anticipación */}
                <div className="p-5 rounded-lg bg-purple-50 border-2 border-purple-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-900">
                          Anticipación de Notificaciones
                        </span>
                        <span className="px-3 py-1 rounded-full text-sm font-bold bg-purple-200 text-purple-900">
                          {alertas.diasAnticipacion} días
                        </span>
                      </div>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={alertas.diasAnticipacion}
                    onChange={(e) => {
                      setAlertas({
                        ...alertas,
                        diasAnticipacion: parseInt(e.target.value)
                      });
                      setCambiosPendientes(true);
                    }}
                    className="w-full h-2 bg-gradient-to-r from-purple-200 to-purple-600 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="mt-3 p-3 bg-white rounded border border-purple-300">
                    <p className="text-xs text-gray-700">
                      <strong>Se usa para:</strong> Enviar notificaciones automáticas <strong>{alertas.diasAnticipacion} días antes</strong> de que un proceso llegue a su fecha de vencimiento.
                    </p>
                    <p className="text-xs text-gray-600 mt-2">
                      📍 <strong>Ejemplo práctico:</strong> Si un proceso vence el 20 de enero, se enviará notificación el {new Date(new Date('2025-01-20').getTime() - alertas.diasAnticipacion * 24 * 60 * 60 * 1000).toLocaleDateString()}.
                    </p>
                  </div>
                </div>
              </div>

              {/* Simulación en Tiempo Real */}
              <div className="mt-6 p-5 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-gray-700" />
                  Simulación: ¿Cómo se verá en el sistema?
                </h3>
                <p className="text-xs text-gray-600 mb-4">
                  Con tu configuración actual, así se comportará el semáforo en un proceso de <strong>Investigación (60 días)</strong>:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 rounded-full bg-green-500"></div>
                      <span className="text-xs font-bold text-green-800">Días 1 - {Math.floor((alertas.porcentajeRiesgo / 100) * 60)}</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Semáforo VERDE - El proceso va normal
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 rounded-full bg-amber-500"></div>
                      <span className="text-xs font-bold text-amber-800">Días {Math.floor((alertas.porcentajeRiesgo / 100) * 60)} - {Math.floor((alertas.porcentajeCritico / 100) * 60)}</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Semáforo AMARILLO - Requiere atención
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 rounded-full bg-red-500"></div>
                      <span className="text-xs font-bold text-red-800">Días {Math.floor((alertas.porcentajeCritico / 100) * 60)} - 60+</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Semáforo ROJO - Acción urgente
                    </p>
                  </div>
                </div>
              </div>
            </label>
          </div>
        </Card>

        {/* Info Final */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 bg-blue-50 border-l-4 border-blue-500">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">
                  Información Importante
                </h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Los cambios afectarán todos los procesos del módulo disciplinario</li>
                  <li>• Las alertas se enviarán automáticamente según los días configurados</li>
                  <li>• Los estados inactivos no aparecerán en el tablero Kanban</li>
                  <li>• El orden de los estados se puede cambiar arrastrándolos</li>
                  <li>• Los cambios en capacidad afectan la asignación automática de procesos</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* MODALES */}
      
      {/* Modal: Agregar Estado */}
      {showModalAgregarEstado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Agregar Nuevo Estado</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    ¿Desea agregar un nuevo estado al tablero Kanban?
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
      {showModalEliminarEstado && estadoAEliminar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Eliminar Estado</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    ¿Está seguro de eliminar este estado?
                  </p>
                </div>
                <button
                  onClick={() => setShowModalEliminarEstado(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-gray-900 mb-2">
                  Estado: "{estadoAEliminar.nombre}"
                </p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-800">
                  <strong>⚠️ Advertencia:</strong> Esta acción no se puede deshacer. El estado "{estadoAEliminar.nombre}" será eliminado permanentemente del tablero Kanban.
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

}
}

// ============ COMPONENTE ESTADO SORTABLE ============

function EstadoSortable({ estado, index, onUpdate, onDelete }: { 
  estado: EstadoKanban; 
  index: number; 
  onUpdate: (estadoId: string, cambios: Partial<EstadoKanban>) => void; 
  onDelete: (estadoId: string) => void;
}) {
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
      className="p-3 sm:p-4 bg-gradient-to-br from-gray-50 to-white rounded-lg border-2 border-gray-200"
    >
      {/* Fila 1: Drag + Orden + Nombre */}
      <div className="flex items-center gap-2 sm:gap-3 mb-3">
        <div {...attributes} {...listeners} className="cursor-move">
          <GripVertical className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
        </div>
        
        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center font-bold text-xs sm:text-sm text-gray-700 flex-shrink-0">
          {index + 1}
        </div>

        <input
          type="text"
          value={estado.nombre}
          onChange={(e) => onUpdate(estado.id, { nombre: e.target.value })}
          className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-sm font-semibold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Nombre del estado"
        />

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(estado.id);
          }}
          className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Fila 2: Color + Días + Alerta + Activo */}
      <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
        {/* Color */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-700">
            Color:
          </label>
          <input
            type="color"
            value={estado.color}
            onChange={(e) => onUpdate(estado.id, { color: e.target.value })}
            className="w-10 h-8 rounded border border-gray-300 cursor-pointer"
          />
        </div>
        <div className="flex items-center gap-3">
          {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIGURACIONES_RESET) && (
          <button
            onClick={handleRestablecer}
            className="px-6 py-2.5 rounded-xl font-semibold"
            style={{ background: '#F3F4F6', color: '#4B5563' }}
          >
            Restablecer
          </button>
          )}
          {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIGURACIONES_EDIT) && (
          <button
            onClick={handleGuardar}
            className="px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2"
            style={{ background: '#003DA5', color: '#FFFFFF' }}
          >
            <Save className="w-4 h-4" />
            Guardar Cambios
          </button>
          )}
        </div>

        {/* Días estándar */}
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <label className="text-xs font-semibold text-gray-700">
            Días:
          </label>
          <input
            type="number"
            min="1"
            value={estado.dias}
            onChange={(e) => onUpdate(estado.id, { dias: parseInt(e.target.value) || 0 })}
            className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Alerta */}
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          <label className="text-xs font-semibold text-gray-700">
            Alerta:
          </label>
          <input
            type="number"
            min="1"
            value={estado.alertaDias}
            onChange={(e) => onUpdate(estado.id, { alertaDias: parseInt(e.target.value) || 0 })}
            className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-600">d.a.</span>
        </div>

        {/* Toggle Activo */}
        <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer ml-auto">
          <input
            type="checkbox"
            checked={estado.activo}
            onChange={(e) => onUpdate(estado.id, { activo: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">Activo</span>
        </label>
      </div>
    </div>
  );
}

// Subcomponente para Firma Personal (Integrado en ModuloConfiguracion)
function ConfiguracionFirmaPersonal() {
  const [firmaUrl, setFirmaUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentProfessionalId, setCurrentProfessionalId] = useState<string | null>(null);

  // Mock fallback logic
  const mockUser = { id: '770e8400-e29b-41d4-a716-446655440002', nombre: 'Admin Sistema' };

  useEffect(() => {
    loadFirma();
  }, []);

  const loadFirma = async () => {
    try {
      setLoading(true);
      const professionals = await disciplinaryService.getProfesionales();

      // Intentar encontrar al usuario por ID o correo (lógica de mock para desarrollo)
      const me = professionals.find((p: any) => p.id === mockUser.id) ||
        professionals.find((p: any) => p.email === 'juan.perez@esap.edu.co') ||
        professionals[0]; // Fallback al primero si no encuentra los anteriores

      if (me) {
        setCurrentProfessionalId(me.id);
        if (me.firmaUrl) {
          setFirmaUrl(me.firmaUrl);
        }
      }
    } catch (err) {
      console.error('Error loading signature:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!currentProfessionalId) {
      toast.error('No se ha identificado un perfil profesional válido para asociar la firma.');
      return;
    }

    if (file.type !== 'application/pdf') {
      toast.error('Solo se permiten archivos PDF');
      return;
    }

    try {
      setUploading(true);
      const result = await disciplinaryService.uploadSignature(currentProfessionalId, file);
      setFirmaUrl(result.url);
      toast.success('Firma cargada exitosamente');
    } catch (error) {
      console.error('Error uploading signature:', error);
      toast.error('Error al cargar la firma');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB' }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl" style={{ background: '#EFF6FF' }}>
          <FileSignature className="w-6 h-6" style={{ color: '#2563EB' }} />
        </div>
        <div>
          <h2 className="text-xl font-extrabold" style={{ color: '#1F2937' }}>
            Configuración de Firma Digital
          </h2>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            Gestione su firma digital para la aprobación de autos y documentos
          </p>
        </div>
      </div>

      <div className="p-5 rounded-xl border-2 border-blue-100 bg-blue-50/50">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">
              Estado Actual
            </p>
            <div className="flex items-center gap-2">
              {loading ? (
                <span className="text-xs text-gray-500">Verificando...</span>
              ) : firmaUrl ? (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-0 pointer-events-none">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Firma Configurada (PDF)
                </Badge>
              ) : (
                <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-0 pointer-events-none">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  No Configurada
                </Badge>
              )}
            </div>
          </div>
          {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIGURACIONES_FIRMA_UPLOAD) && (
          <div className="flex flex-col items-end gap-2">
            <input
              type="file"
              accept=".pdf"
              id="firma-personal-upload"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
            <label
              htmlFor="firma-personal-upload"
              className={`
                    px-4 py-2 rounded-lg font-semibold text-sm cursor-pointer flex items-center gap-2 transition-colors
                    ${uploading ? 'bg-gray-300 text-gray-600 cursor-wait' : 'bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 shadow-sm'}
                  `}
            >
              {uploading ? (
                <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {firmaUrl ? 'Actualizar Archivo de Firma' : 'Cargar Firma (PDF)'}
            </label>
            <p className="text-xs text-gray-500">
              Formato admitido: .PDF (Max 5MB)
            </p>
          </div>
          )}
        </div>

        {firmaUrl && (
          <div className="mt-4 p-3 bg-white/60 rounded-lg border border-blue-100">
            <p className="text-xs text-blue-800 flex items-start gap-2">
              <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Seguridad:</strong> Esta firma está vinculada a su usuario profesional.
                Se aplicará automáticamente en todos los documentos que apruebe dentro del módulo disciplinario.
              </span>
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}