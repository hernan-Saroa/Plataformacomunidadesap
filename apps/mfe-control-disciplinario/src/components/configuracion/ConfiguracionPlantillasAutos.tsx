/**
 * CONFIGURACION DE PLANTILLAS DE AUTOS
 * Componente modular standalone para gestionar plantillas de autos
 * Control Interno Disciplinario
 *
 * DATOS CARGADOS DESDE LA BD (autos_configuration)
 */

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  History,
  Loader2,
  RotateCcw,
  Save,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  disciplinaryService,
  type AutoConfigurationDeletionImpact,
} from '../../../../services/api/disciplinary.service';
import { ConfirmationModal } from './ConfirmationModal';
import {
  SeccionPlantillasAutosUnificada,
  type PlantillaArchivo,
  type TipoAuto,
} from './SeccionPlantillasAutosUnificada';
import { ModalNuevoTipoAuto, type NuevoTipoAutoData } from './ModalNuevoTipoAuto';
import { ModalGestionarPlantillas } from './ModalGestionarPlantillas';

const TIPOS_AUTOS_DEFECTO: TipoAuto[] = [
  {
    id: 'auto-apertura-indagacion',
    nombre: 'Auto de Apertura de Indagacion',
    descripcion:
      'Inicia la indagacion preliminar para determinar si hay merito para abrir investigacion formal',
    etapa: 'INDAGACION',
    plantilla: null,
    activo: true,
    orden: 1,
    fechaCreacion: new Date().toISOString(),
    fechaModificacion: new Date().toISOString(),
    tipo: 'AUTO_APERTURA_INDAGACION',
  },
];

// Mapea el tipoAccion del formulario al valor `tipo` que espera el backend
const mapTipoAccionToBackend = (tipoAccion: string, etapa: string): string => {
  switch (tipoAccion) {
    case 'APERTURA':
      if (etapa === 'INVESTIGACION') return 'AUTO_APERTURA_INVESTIGACION';
      if (etapa === 'INDAGACION' || etapa === 'INDAGACION_PREVIA') return 'AUTO_APERTURA_INDAGACION';
      return 'AUTO_APERTURA';
    case 'ARCHIVO':
      return 'AUTO_ARCHIVO';
    case 'PRORROGA':
      return 'AUTO_PRORROGA';
    case 'PLIEGO':
      return 'PLIEGO_CARGOS';
    default:
      return 'AUTO_NO_PREVISTO';
  }
};

const buildLocalPlantilla = (file?: File): PlantillaArchivo | null => {
  if (!file) return null;

  return {
    id: `plt-local-${Date.now()}`,
    nombre: file.name.replace(/\.(docx?|DOCX?)$/, ''),
    nombreArchivo: file.name,
    descripcion: 'Plantilla cargada localmente',
    url: '',
    tamano: file.size,
    tipoArchivo:
      file.type ||
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    version: '1.0',
    fechaCreacion: new Date().toISOString(),
    fechaModificacion: new Date().toISOString(),
    activo: true,
  };
};

export function ConfiguracionPlantillasAutos() {
  const [tiposAutos, setTiposAutos] = useState<TipoAuto[]>([]);
  const [cambiosPendientes, setCambiosPendientes] = useState(false);
  const [loading, setLoading] = useState(true);

  const [mostrarModalTipoAuto, setMostrarModalTipoAuto] = useState(false);
  const [tipoAutoEdicion, setTipoAutoEdicion] = useState<TipoAuto | null>(null);
  const [tipoAutoGestionando, setTipoAutoGestionando] =
    useState<TipoAuto | null>(null);
  const [mostrarModalGestionarPlantillas, setMostrarModalGestionarPlantillas] =
    useState(false);

  const [mostrarModalEliminarTipo, setMostrarModalEliminarTipo] =
    useState(false);
  const [tipoAutoPendienteEliminar, setTipoAutoPendienteEliminar] =
    useState<TipoAuto | null>(null);
  const [impactoEliminacion, setImpactoEliminacion] =
    useState<AutoConfigurationDeletionImpact | null>(null);
  const [cargandoImpactoEliminacion, setCargandoImpactoEliminacion] =
    useState(false);
  const [eliminandoTipoAuto, setEliminandoTipoAuto] = useState(false);

  const [mostrarModalRestablecer, setMostrarModalRestablecer] =
    useState(false);

  useEffect(() => {
    loadDatos();
  }, []);

  const esAutoBackend = (autoId: string) =>
    !autoId.startsWith('tipo-auto-') && autoId !== 'auto-apertura-indagacion';

  const formatEstadoProceso = (estado?: string) => {
    const normalizado = (estado || '').toUpperCase();

    if (normalizado === 'ACTIVO') return 'Activo';
    if (normalizado === 'SUSPENDIDO') return 'Suspendido';
    if (normalizado === 'ARCHIVADO') return 'Archivado';
    if (normalizado === 'PRESCRITO') return 'Prescrito';

    return estado || 'Sin estado';
  };

  const formatEstadoAuto = (estado?: string) => {
    const normalizado = (estado || '').toUpperCase();

    if (normalizado === 'BORRADOR') return 'Borrador';
    if (normalizado === 'REVISION_JEFE') return 'En revisión';
    if (normalizado === 'DEVUELTO') return 'Devuelto';
    if (normalizado === 'APROBADO') return 'Aprobado';
    if (normalizado === 'FIRMADO') return 'Firmado';
    if (normalizado === 'NOTIFICADO') return 'Notificado';

    return estado || 'Sin estado';
  };

  const getEstadoAutoBadgeClassName = (estado?: string) => {
    const normalizado = (estado || '').toUpperCase();

    if (normalizado === 'BORRADOR') {
      return 'bg-amber-100 text-amber-800 border border-amber-200';
    }

    if (normalizado === 'REVISION_JEFE') {
      return 'bg-blue-100 text-blue-800 border border-blue-200';
    }

    if (normalizado === 'DEVUELTO') {
      return 'bg-rose-100 text-rose-800 border border-rose-200';
    }

    if (normalizado === 'APROBADO') {
      return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    }

    if (normalizado === 'FIRMADO') {
      return 'bg-violet-100 text-violet-800 border border-violet-200';
    }

    if (normalizado === 'NOTIFICADO') {
      return 'bg-cyan-100 text-cyan-800 border border-cyan-200';
    }

    return 'bg-slate-100 text-slate-700 border border-slate-200';
  };

  const getUbicacionEstadoAuto = (estado?: string) => {
    const normalizado = (estado || '').toUpperCase();

    if (normalizado === 'REVISION_JEFE') {
      return 'Revision y Aprobacion';
    }

    return 'Proceso > Archivos > Autos';
  };

  const getUbicacionesAuto = (
    autoStates?: { status: string; count: number }[],
  ) =>
    Array.from(
      new Set((autoStates || []).map((autoState) => getUbicacionEstadoAuto(autoState.status))),
    );

  const formatEtapaProceso = (etapa?: string) =>
    (etapa || 'SIN_ETAPA')
      .toLowerCase()
      .split('_')
      .map((segmento) => segmento.charAt(0).toUpperCase() + segmento.slice(1))
      .join(' ');

  const extraerImpactoDesdeError = (
    error: any,
    tipoAuto?: TipoAuto | null,
  ): AutoConfigurationDeletionImpact | null => {
    const details =
      error?.details ||
      error?.response?.data?.error?.details ||
      error?.response?.data?.details;

    if (!details) return null;

    return {
      autoConfigurationId: details.autoConfigurationId || tipoAuto?.id || '',
      autoTipo:
        details.autoTipo ||
        tipoAuto?.tipo ||
        tipoAuto?.nombre?.toUpperCase().replace(/\s+/g, '_') ||
        'AUTO',
      autoNombre: details.autoNombre || tipoAuto?.nombre || 'Auto',
      canDelete: Boolean(details.canDelete),
      activeProcessesCount: Number(details.activeProcessesCount || 0),
      historicalProcessesCount: Number(details.historicalProcessesCount || 0),
      activeProcesses: Array.isArray(details.activeProcesses)
        ? details.activeProcesses.map((process: any) => ({
            ...process,
            autoStates: Array.isArray(process.autoStates)
              ? process.autoStates
              : [],
          }))
        : [],
    };
  };

  const loadDatos = async () => {
    try {
      setLoading(true);

      const autosFromBD = await disciplinaryService.getAutosConfiguration();

      const tiposFromBD: TipoAuto[] = autosFromBD.map((auto) => {
        const plantillaUrl = auto.plantilla
          ? disciplinaryService.getFileUrl(auto.plantilla)
          : '';

        return {
          id: auto.id,
          nombre: auto.nombre,
          descripcion: `Auto: ${auto.tipo}`,
          etapa: (auto.stage || 'INDAGACION') as TipoAuto['etapa'],
          plantilla:
            auto.plantilla || auto.nombre_plantilla
              ? {
                  id: `plt-${auto.id}`,
                  nombre: auto.nombre_plantilla || 'Plantilla configurada',
                  nombreArchivo: 'plantilla.docx',
                  descripcion:
                    auto.descripcion_plantilla ||
                    'Plantilla almacenada en BD',
                  tipoArchivo:
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  url: plantillaUrl,
                  tamano: 0,
                  version: auto.version_plantilla || '1.0',
                  fechaCreacion: auto.createdAt,
                  activo: auto.estado_plantilla === 'activo',
                }
              : null,
          activo: auto.estado === 'activo',
          orden: auto.orden,
          fechaCreacion: auto.createdAt,
          fechaModificacion: auto.updatedAt,
          tipo: auto.tipo,
          nombre_plantilla: auto.nombre_plantilla,
          descripcion_plantilla: auto.descripcion_plantilla,
          version_plantilla: auto.version_plantilla,
          estado_plantilla: auto.estado_plantilla,
        };
      });

      setTiposAutos(tiposFromBD);
    } catch (error) {
      console.error('Error cargando datos:', error);
      setTiposAutos(TIPOS_AUTOS_DEFECTO);
      toast.error('Error al cargar datos, usando configuracion por defecto');
    } finally {
      setLoading(false);
    }
  };

  const abrirModalNuevoTipoAuto = () => {
    setTipoAutoEdicion(null);
    setMostrarModalTipoAuto(true);
  };

  const abrirModalEditarTipoAuto = (tipo: TipoAuto) => {
    setTipoAutoEdicion(tipo);
    setMostrarModalTipoAuto(true);
  };

  const guardarTipoAuto = async (nuevoTipo: NuevoTipoAutoData) => {
    if (tipoAutoEdicion) {
      try {
        const autoActual = tiposAutos.find((t) => t.id === tipoAutoEdicion.id);

        if (
          autoActual &&
          (!esAutoBackend(autoActual.id) ||
            autoActual.id === 'auto-apertura-indagacion')
        ) {
          setTiposAutos((prev) =>
            prev.map((t) =>
              t.id === tipoAutoEdicion.id
                ? {
                    ...t,
                    nombre: nuevoTipo.nombre,
                    descripcion: nuevoTipo.descripcion,
                    etapa: nuevoTipo.etapa,
                    activo: nuevoTipo.activo,
                    orden: nuevoTipo.orden,
                    plantilla:
                      buildLocalPlantilla(nuevoTipo.plantillaFile) || t.plantilla,
                    fechaModificacion: new Date().toISOString(),
                  }
                : t,
            ),
          );
        } else {
          await disciplinaryService.updateAutosConfiguration(tipoAutoEdicion.id, {
            nombre: nuevoTipo.nombre,
            stage: nuevoTipo.etapa,
            estado: nuevoTipo.activo ? 'activo' : 'inactivo',
            orden: nuevoTipo.orden,
          });

          if (nuevoTipo.plantillaFile) {
            await disciplinaryService.uploadAutoPlantilla(
              tipoAutoEdicion.id,
              nuevoTipo.plantillaFile,
            );
          }

          await loadDatos();
        }

        toast.success('Tipo de auto actualizado correctamente');
      } catch (error) {
        console.error('Error actualizando:', error);
        toast.error('Error al actualizar');
      }
    } else {
      try {
        const tipoBackend = mapTipoAccionToBackend(nuevoTipo.tipoAccion, nuevoTipo.etapa);
        const autoCreado = await disciplinaryService.createAutosConfiguration({
          tipo: tipoBackend,
          nombre: nuevoTipo.nombre,
          estado: nuevoTipo.activo ? 'activo' : 'inactivo',
          stage: nuevoTipo.etapa,
          orden: nuevoTipo.orden || 1,
        });

        if (nuevoTipo.plantillaFile) {
          await disciplinaryService.uploadAutoPlantilla(
            autoCreado.id,
            nuevoTipo.plantillaFile,
          );
        }

        await loadDatos();
        toast.success('Tipo de auto creado correctamente');
      } catch (error) {
        console.error('Error creando:', error);
        const permitirFallbackLocal =
          tiposAutos.length === 0 || tiposAutos.every((tipo) => !esAutoBackend(tipo.id));

        if (permitirFallbackLocal) {
          const ahora = new Date().toISOString();
          const tipoCompleto: TipoAuto = {
            id: `tipo-auto-${Date.now()}`,
            nombre: nuevoTipo.nombre,
            descripcion: nuevoTipo.descripcion,
            etapa: nuevoTipo.etapa,
            activo: nuevoTipo.activo,
            orden: nuevoTipo.orden || 1,
            plantilla: buildLocalPlantilla(nuevoTipo.plantillaFile),
            fechaCreacion: ahora,
            fechaModificacion: ahora,
            tipo: mapTipoAccionToBackend(nuevoTipo.tipoAccion, nuevoTipo.etapa),
          };
          setTiposAutos((prev) => [...prev, tipoCompleto]);
          toast.success('Tipo de auto creado localmente');
        } else {
          toast.error('Error al crear el tipo de auto');
        }
      }
    }

    setCambiosPendientes(true);
    setMostrarModalTipoAuto(false);
    setTipoAutoEdicion(null);
  };

  const cerrarModalEliminarTipo = () => {
    if (eliminandoTipoAuto) return;

    setMostrarModalEliminarTipo(false);
    setTipoAutoPendienteEliminar(null);
    setImpactoEliminacion(null);
    setCargandoImpactoEliminacion(false);
  };

  const solicitarEliminarTipoAuto = async (tipoId: string) => {
    const auto = tiposAutos.find((t) => t.id === tipoId);
    if (!auto) return;

    setTipoAutoPendienteEliminar(auto);
    setImpactoEliminacion(null);
    setMostrarModalEliminarTipo(true);

    if (!esAutoBackend(tipoId)) {
      setImpactoEliminacion({
        autoConfigurationId: auto.id,
        autoTipo: auto.tipo || auto.nombre.toUpperCase().replace(/\s+/g, '_'),
        autoNombre: auto.nombre,
        canDelete: true,
        activeProcessesCount: 0,
        historicalProcessesCount: 0,
        activeProcesses: [],
      });
      return;
    }

    try {
      setCargandoImpactoEliminacion(true);
      const impact =
        await disciplinaryService.getAutosConfigurationDeletionImpact(tipoId);
      setImpactoEliminacion(impact);
    } catch (error: any) {
      console.error('Error consultando impacto de eliminacion:', error);
      const impactoDesdeError = extraerImpactoDesdeError(error, auto);

      if (impactoDesdeError) {
        setImpactoEliminacion(impactoDesdeError);
      } else {
        cerrarModalEliminarTipo();
        toast.error('No fue posible validar el auto antes de eliminarlo', {
          description:
            error?.message ||
            'Intenta nuevamente. La eliminacion se cancelo por seguridad.',
        });
      }
    } finally {
      setCargandoImpactoEliminacion(false);
    }
  };

  const confirmarEliminarTipoAuto = async () => {
    if (!tipoAutoPendienteEliminar) return;
    if (impactoEliminacion && !impactoEliminacion.canDelete) return;

    try {
      setEliminandoTipoAuto(true);

      if (!esAutoBackend(tipoAutoPendienteEliminar.id)) {
        setTiposAutos((prev) =>
          prev.filter((t) => t.id !== tipoAutoPendienteEliminar.id),
        );
        setCambiosPendientes(true);
        toast.success('Tipo de auto eliminado correctamente');
        cerrarModalEliminarTipo();
        return;
      }

      await disciplinaryService.deleteAutosConfiguration(
        tipoAutoPendienteEliminar.id,
      );
      await loadDatos();
      toast.success('Auto eliminado correctamente');
      cerrarModalEliminarTipo();
    } catch (error: any) {
      console.error('Error eliminando:', error);

      const impactoDesdeError = extraerImpactoDesdeError(
        error,
        tipoAutoPendienteEliminar,
      );

      if (impactoDesdeError) {
        setImpactoEliminacion(impactoDesdeError);
        toast.error('No se pudo eliminar el auto', {
          description:
            'Tiene procesos en curso asociados y primero deben revisarse.',
        });
      } else {
        toast.error('Error al eliminar', {
          description: error?.message || 'No se pudo completar la eliminacion',
        });
      }
    } finally {
      setEliminandoTipoAuto(false);
    }
  };

  const toggleActivoTipoAuto = async (tipoId: string, activo: boolean) => {
    const auto = tiposAutos.find((t) => t.id === tipoId);

    if (auto && esAutoBackend(tipoId)) {
      try {
        await disciplinaryService.toggleAutosConfigurationEstado(tipoId);
        await loadDatos();
        toast.success(activo ? 'Auto activado' : 'Auto desactivado');
      } catch (error) {
        console.error('Error toggling:', error);
        toast.error('Error al cambiar estado');
      }
    } else {
      setTiposAutos((prev) =>
        prev.map((t) => (t.id === tipoId ? { ...t, activo } : t)),
      );
      setCambiosPendientes(true);
      toast.success(activo ? 'Tipo de auto activado' : 'Tipo de auto desactivado');
    }
  };

  const abrirGestionPlantillas = (tipo: TipoAuto) => {
    setTipoAutoGestionando(tipo);
    setMostrarModalGestionarPlantillas(true);
  };

  const actualizarPlantillasTipoAuto = async (
    tipoAutoId: string,
    plantillas: PlantillaArchivo[],
  ) => {
    const plantilla = plantillas[0];
    const auto = tiposAutos.find((t) => t.id === tipoAutoId);

    if (auto && esAutoBackend(tipoAutoId)) {
      try {
        await disciplinaryService.updateAutosConfiguration(tipoAutoId, {
          nombre: auto.nombre,
          stage: auto.etapa,
          estado: auto.activo ? 'activo' : 'inactivo',
          orden: auto.orden,
          nombre_plantilla: plantilla?.nombre || null,
          descripcion_plantilla: plantilla?.descripcion || null,
          version_plantilla: plantilla?.version || '1.0',
          estado_plantilla: plantilla?.activo !== false ? 'activo' : 'inactivo',
        });
        await loadDatos();
        toast.success('Plantillas actualizadas correctamente');
      } catch (error) {
        console.error('Error actualizando plantillas en BD:', error);
        setTiposAutos((prev) =>
          prev.map((t) =>
            t.id === tipoAutoId
              ? {
                  ...t,
                  plantilla,
                  fechaModificacion: new Date().toISOString(),
                }
              : t,
          ),
        );
        toast.warning('Plantilla actualizada localmente');
      }
    } else {
      setTiposAutos((prev) =>
        prev.map((t) =>
          t.id === tipoAutoId
            ? {
                ...t,
                plantilla,
                fechaModificacion: new Date().toISOString(),
              }
            : t,
        ),
      );
    }

    setCambiosPendientes(true);
    setMostrarModalGestionarPlantillas(false);
    setTipoAutoGestionando(null);
    toast.success('Plantillas actualizadas');
  };

  const guardarConfiguraciones = () => {
    try {
      localStorage.setItem('disciplinario-tipos-autos', JSON.stringify(tiposAutos));
      setCambiosPendientes(false);
      toast.success('Configuraciones guardadas correctamente');
    } catch (error) {
      console.error('Error al guardar:', error);
      toast.error('Error al guardar configuraciones');
    }
  };

  const confirmarRestablecerDefecto = () => {
    setTiposAutos(TIPOS_AUTOS_DEFECTO);
    setCambiosPendientes(true);
    setMostrarModalRestablecer(false);
    toast.success('Configuraciones restablecidas');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-gray-600">Cargando configuracion...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            Tipos de Autos y Plantillas
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Gestiona tipos de autos y sus plantillas Word/PDF asociadas
          </p>
        </div>

        <div className="flex items-center gap-3">
          {cambiosPendientes && (
            <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              <AlertCircle className="mr-1 h-3 w-3" />
              Sin guardar
            </span>
          )}

          <button
            onClick={() => setMostrarModalRestablecer(true)}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50"
          >
            <RotateCcw className="h-4 w-4" />
            Restablecer
          </button>

          <button
            onClick={guardarConfiguraciones}
            disabled={!cambiosPendientes}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: cambiosPendientes
                ? 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)'
                : '#9CA3AF',
            }}
          >
            <Save className="h-4 w-4" />
            Guardar Cambios
          </button>
        </div>
      </div>

      <SeccionPlantillasAutosUnificada
        tiposAutos={tiposAutos}
        onAgregarTipo={abrirModalNuevoTipoAuto}
        onEditarTipo={abrirModalEditarTipoAuto}
        onEliminarTipo={solicitarEliminarTipoAuto}
        onToggleActivoTipo={toggleActivoTipoAuto}
        onGestionarPlantilla={abrirGestionPlantillas}
      />

      {mostrarModalTipoAuto && (
        <ModalNuevoTipoAuto
          isOpen={mostrarModalTipoAuto}
          tipoEdicion={tipoAutoEdicion}
          onGuardar={guardarTipoAuto}
          onClose={() => {
            setMostrarModalTipoAuto(false);
            setTipoAutoEdicion(null);
          }}
        />
      )}

      {mostrarModalGestionarPlantillas && tipoAutoGestionando && (
        <ModalGestionarPlantillas
          isOpen={mostrarModalGestionarPlantillas}
          tipoAuto={tipoAutoGestionando}
          onActualizarPlantillas={actualizarPlantillasTipoAuto}
          onClose={() => {
            setMostrarModalGestionarPlantillas(false);
            setTipoAutoGestionando(null);
          }}
        />
      )}

      <ConfirmationModal
        open={mostrarModalEliminarTipo}
        onClose={cerrarModalEliminarTipo}
        disableClose={cargandoImpactoEliminacion || eliminandoTipoAuto}
        contentClassName="max-w-2xl"
      >
        <div className="space-y-6">
          <div className="pr-10">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                  impactoEliminacion && !impactoEliminacion.canDelete
                    ? 'bg-red-100 text-red-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {cargandoImpactoEliminacion ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : impactoEliminacion && !impactoEliminacion.canDelete ? (
                  <ShieldAlert className="h-6 w-6" />
                ) : (
                  <AlertTriangle className="h-6 w-6" />
                )}
              </div>

              <div className="space-y-1">
                <h3 className="text-left text-xl font-bold text-gray-900">
                  {cargandoImpactoEliminacion
                    ? 'Validando eliminacion del auto'
                    : impactoEliminacion && !impactoEliminacion.canDelete
                    ? 'No se puede eliminar este auto'
                    : `Eliminar "${tipoAutoPendienteEliminar?.nombre || 'auto'}"`}
                </h3>
                <p className="text-left text-sm text-gray-600">
                  {cargandoImpactoEliminacion
                    ? 'Estamos revisando si este auto tiene procesos en curso asociados antes de permitir la eliminacion.'
                    : impactoEliminacion && !impactoEliminacion.canDelete
                    ? 'Este tipo de auto tiene procesos en curso asociados. Primero debes revisarlos o cerrarlos para proteger la trazabilidad del modulo.'
                    : 'Se eliminara la configuracion del catalogo y su plantilla asociada. Esta accion no afecta los registros historicos ya generados dentro de procesos cerrados.'}
                </p>
              </div>
            </div>
          </div>

          {cargandoImpactoEliminacion ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Consultando procesos asociados
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Esto evita eliminar un auto que todavia este en uso.
                </p>
              </div>
            </div>
          ) : tipoAutoPendienteEliminar ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {tipoAutoPendienteEliminar.nombre}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Tipo:{' '}
                      {impactoEliminacion?.autoTipo ||
                        tipoAutoPendienteEliminar.tipo ||
                        'No disponible'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-blue-100 px-2.5 py-1 font-semibold text-blue-700">
                      {formatEtapaProceso(tipoAutoPendienteEliminar.etapa)}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 font-semibold ${
                        tipoAutoPendienteEliminar.activo
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {tipoAutoPendienteEliminar.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
              </div>

              {impactoEliminacion && !impactoEliminacion.canDelete ? (
                <>
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                    <p className="text-sm font-semibold text-red-800">
                      Se encontraron {impactoEliminacion.activeProcessesCount}{' '}
                      proceso(s) en curso usando este auto.
                    </p>
                    <p className="mt-1 text-sm text-red-700">
                      Debes revisar esos procesos y los estados del auto
                      indicados debajo antes de eliminarlo del catalogo.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <ShieldAlert className="h-4 w-4 text-red-600" />
                      Procesos bloqueantes
                    </div>

                    <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                      {impactoEliminacion.activeProcesses.map((process) => (
                        <div
                          key={process.processId}
                          className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {process.radicadoProceso}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                Etapa actual:{' '}
                                {formatEtapaProceso(process.etapaActual)}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                Profesional:{' '}
                                {process.abogadoAsignadoNombre || 'Sin asignar'}
                              </p>
                              {process.autoStates?.length > 0 && (
                                <>
                                  <div className="mt-3 flex flex-wrap items-center gap-2">
                                    {process.autoStates.map((autoState) => (
                                      <span
                                        key={`${process.processId}-${autoState.status}`}
                                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getEstadoAutoBadgeClassName(
                                          autoState.status,
                                        )}`}
                                      >
                                        {formatEstadoAuto(autoState.status)} (
                                        {autoState.count})
                                      </span>
                                    ))}
                                  </div>

                                  <p className="mt-2 text-xs text-gray-500">
                                    Donde revisarlo:{' '}
                                    {getUbicacionesAuto(process.autoStates).join(
                                      ' · ',
                                    )}
                                  </p>
                                </>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span
                                className={`rounded-full px-2.5 py-1 font-semibold ${
                                  process.estado === 'SUSPENDIDO'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {formatEstadoProceso(process.estado)}
                              </span>
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
                                {process.autosCount} auto
                                {process.autosCount === 1 ? '' : 's'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-sm font-semibold text-emerald-800">
                      No hay procesos en curso asociados a este auto.
                    </p>
                    <p className="mt-1 text-sm text-emerald-700">
                      Puedes eliminarlo del catalogo sin afectar procesos activos.
                    </p>
                  </div>

                  {impactoEliminacion &&
                    impactoEliminacion.historicalProcessesCount > 0 && (
                      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                        <div className="flex items-start gap-2">
                          <History className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-700" />
                          <div>
                            <p className="text-sm font-semibold text-blue-800">
                              Trazabilidad historica conservada
                            </p>
                            <p className="mt-1 text-sm text-blue-700">
                              Existen{' '}
                              {impactoEliminacion.historicalProcessesCount}{' '}
                              proceso(s) historico(s) que usaron este tipo de
                              auto. La eliminacion del catalogo no borra esos
                              registros.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                </>
              )}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                if (!cargandoImpactoEliminacion && !eliminandoTipoAuto) {
                  cerrarModalEliminarTipo();
                }
              }}
              disabled={cargandoImpactoEliminacion || eliminandoTipoAuto}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {impactoEliminacion && !impactoEliminacion.canDelete
                ? 'Entendido'
                : 'Cancelar'}
            </button>

            {impactoEliminacion?.canDelete && !cargandoImpactoEliminacion && (
              <button
                type="button"
                onClick={confirmarEliminarTipoAuto}
                disabled={eliminandoTipoAuto}
                className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {eliminandoTipoAuto ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  'Eliminar del catalogo'
                )}
              </button>
            )}
          </div>
        </div>
      </ConfirmationModal>

      <ConfirmationModal
        open={mostrarModalRestablecer}
        onClose={() => setMostrarModalRestablecer(false)}
        contentClassName="max-w-lg"
      >
        <div className="space-y-6">
          <div className="pr-10">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <AlertCircle className="h-6 w-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-left text-xl font-bold text-gray-900">
                  Restablecer configuracion
                </h3>
                <p className="text-left text-sm text-gray-600">
                  Vas a reemplazar la configuracion visible por los valores por
                  defecto de esta seccion.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Este cambio se reflejara en la interfaz actual. Si luego deseas
            conservarlo, tendras que guardar nuevamente la configuracion.
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setMostrarModalRestablecer(false)}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmarRestablecerDefecto}
              className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
            >
              Restablecer
            </button>
          </div>
        </div>
      </ConfirmationModal>
    </div>
  );
}
