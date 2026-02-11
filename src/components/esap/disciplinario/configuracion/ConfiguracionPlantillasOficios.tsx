/**
 * CONFIGURACIÓN DE PLANTILLAS DE OFICIOS
 * Componente modular standalone para gestionar plantillas de oficios
 * Control Interno Disciplinario
 */

import { useState } from 'react';
import { Plus, AlertCircle, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { SeccionPlantillasOficiosUnificada, type TipoOficio, type PlantillaArchivo } from './SeccionPlantillasOficiosUnificada';
import { ModalNuevoTipoOficio } from './ModalNuevoTipoOficio';
import { ModalGestionarPlantillasOficio } from './ModalGestionarPlantillasOficio';

// Tipos de oficios por defecto
const TIPOS_OFICIOS_DEFECTO: TipoOficio[] = [
  {
    id: 'oficio-notificacion-auto',
    nombre: 'Oficio de Notificación de Auto',
    descripcion: 'Notifica oficialmente un auto proferido al investigado o a terceros',
    categoria: 'NOTIFICACION' as const,
    plantillas: [
      {
        id: 'plantilla-1',
        nombre: 'Notificación Auto - Personal',
        nombreArchivo: 'oficio_notificacion_auto_personal.docx',
        descripcion: 'Para notificación personal al investigado',
        url: '/plantillas/oficio_notificacion_auto_personal.docx',
        tamano: 42000,
        version: '1.0',
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        activo: true
      },
      {
        id: 'plantilla-1b',
        nombre: 'Notificación Auto - Por Aviso',
        nombreArchivo: 'oficio_notificacion_auto_aviso.docx',
        descripcion: 'Para notificación por aviso en casos especiales',
        url: '/plantillas/oficio_notificacion_auto_aviso.docx',
        tamano: 39000,
        version: '1.1',
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        activo: true
      }
    ],
    activo: true,
    orden: 1,
    fechaCreacion: new Date().toISOString(),
    fechaModificacion: new Date().toISOString()
  },
  {
    id: 'oficio-notificacion-fallo',
    nombre: 'Oficio de Notificación de Fallo',
    descripcion: 'Notifica el fallo disciplinario al investigado y demás interesados',
    categoria: 'NOTIFICACION' as const,
    plantillas: [
      {
        id: 'plantilla-not-2',
        nombre: 'Notificación Fallo - Personal',
        nombreArchivo: 'oficio_notificacion_fallo.docx',
        descripcion: 'Notificación personal del fallo disciplinario',
        url: '/plantillas/oficio_notificacion_fallo.docx',
        tamano: 45000,
        version: '2.0',
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        activo: true
      }
    ],
    activo: true,
    orden: 2,
    fechaCreacion: new Date().toISOString(),
    fechaModificacion: new Date().toISOString()
  },
  {
    id: 'oficio-requerimiento-pruebas',
    nombre: 'Oficio de Requerimiento de Pruebas',
    descripcion: 'Solicita a entidades externas el envío de pruebas o documentos',
    categoria: 'REQUERIMIENTO' as const,
    plantillas: [
      {
        id: 'plantilla-2',
        nombre: 'Requerimiento Pruebas - Formato Estándar',
        nombreArchivo: 'oficio_requerimiento_pruebas.docx',
        descripcion: 'Solicitud de pruebas documentales o testimoniales',
        url: '/plantillas/oficio_requerimiento_pruebas.docx',
        tamano: 39000,
        version: '1.2',
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        activo: true
      },
      {
        id: 'plantilla-2b',
        nombre: 'Requerimiento Pruebas - Urgente',
        nombreArchivo: 'oficio_requerimiento_pruebas_urgente.docx',
        descripcion: 'Para solicitudes urgentes de pruebas',
        url: '/plantillas/oficio_requerimiento_pruebas_urgente.docx',
        tamano: 40000,
        version: '1.0',
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        activo: true
      }
    ],
    activo: true,
    orden: 1,
    fechaCreacion: new Date().toISOString(),
    fechaModificacion: new Date().toISOString()
  },
  {
    id: 'oficio-requerimiento-informacion',
    nombre: 'Oficio de Requerimiento de Información Laboral',
    descripcion: 'Solicita información laboral y contractual del investigado',
    categoria: 'REQUERIMIENTO' as const,
    plantillas: [
      {
        id: 'plantilla-req-2',
        nombre: 'Requerimiento Información Laboral',
        nombreArchivo: 'oficio_requerimiento_info_laboral.docx',
        descripcion: 'Solicita hoja de vida, contratos y certificaciones',
        url: '/plantillas/oficio_requerimiento_info_laboral.docx',
        tamano: 37000,
        version: '1.0',
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        activo: true
      }
    ],
    activo: true,
    orden: 2,
    fechaCreacion: new Date().toISOString(),
    fechaModificacion: new Date().toISOString()
  },
  {
    id: 'oficio-remision-expediente',
    nombre: 'Oficio de Remisión de Expediente',
    descripcion: 'Envía el expediente completo a otra entidad u organismo de control',
    categoria: 'REMISION' as const,
    plantillas: [
      {
        id: 'plantilla-3',
        nombre: 'Remisión Expediente - Formato Oficial',
        nombreArchivo: 'oficio_remision_expediente.docx',
        descripcion: 'Para remitir expediente con inventario adjunto',
        url: '/plantillas/oficio_remision_expediente.docx',
        tamano: 44000,
        version: '2.0',
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        activo: true
      }
    ],
    activo: true,
    orden: 1,
    fechaCreacion: new Date().toISOString(),
    fechaModificacion: new Date().toISOString()
  },
  {
    id: 'oficio-remision-competencia',
    nombre: 'Oficio de Remisión por Competencia',
    descripcion: 'Remite el proceso a otra entidad por falta de competencia',
    categoria: 'REMISION' as const,
    plantillas: [
      {
        id: 'plantilla-rem-2',
        nombre: 'Remisión por Competencia - Procuraduría',
        nombreArchivo: 'oficio_remision_procuraduria.docx',
        descripcion: 'Para remisión a Procuraduría General de la Nación',
        url: '/plantillas/oficio_remision_procuraduria.docx',
        tamano: 43000,
        version: '1.5',
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        activo: true
      },
      {
        id: 'plantilla-rem-3',
        nombre: 'Remisión por Competencia - Contraloría',
        nombreArchivo: 'oficio_remision_contraloria.docx',
        descripcion: 'Para remisión a Contraloría cuando hay tema fiscal',
        url: '/plantillas/oficio_remision_contraloria.docx',
        tamano: 42000,
        version: '1.0',
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        activo: true
      }
    ],
    activo: true,
    orden: 2,
    fechaCreacion: new Date().toISOString(),
    fechaModificacion: new Date().toISOString()
  },
  {
    id: 'oficio-solicitud-informacion',
    nombre: 'Oficio de Solicitud de Información',
    descripcion: 'Solicita información específica a entidades públicas o privadas',
    categoria: 'SOLICITUD' as const,
    plantillas: [
      {
        id: 'plantilla-4',
        nombre: 'Solicitud Información - General',
        nombreArchivo: 'oficio_solicitud_informacion.docx',
        descripcion: 'Solicitud genérica de información relevante',
        url: '/plantillas/oficio_solicitud_informacion.docx',
        tamano: 37000,
        version: '1.0',
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        activo: true
      }
    ],
    activo: true,
    orden: 1,
    fechaCreacion: new Date().toISOString(),
    fechaModificacion: new Date().toISOString()
  },
  {
    id: 'oficio-solicitud-concepto',
    nombre: 'Oficio de Solicitud de Concepto Técnico',
    descripcion: 'Solicita concepto técnico a entidades especializadas',
    categoria: 'SOLICITUD' as const,
    plantillas: [
      {
        id: 'plantilla-sol-2',
        nombre: 'Solicitud Concepto Técnico',
        nombreArchivo: 'oficio_solicitud_concepto.docx',
        descripcion: 'Para solicitar conceptos técnicos especializados',
        url: '/plantillas/oficio_solicitud_concepto.docx',
        tamano: 38000,
        version: '1.1',
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        activo: true
      }
    ],
    activo: true,
    orden: 2,
    fechaCreacion: new Date().toISOString(),
    fechaModificacion: new Date().toISOString()
  },
  {
    id: 'oficio-respuesta-derecho-peticion',
    nombre: 'Oficio de Respuesta a Derecho de Petición',
    descripcion: 'Responde derechos de petición relacionados con el proceso',
    categoria: 'RESPUESTA' as const,
    plantillas: [
      {
        id: 'plantilla-resp-1',
        nombre: 'Respuesta Derecho de Petición - Información',
        nombreArchivo: 'oficio_respuesta_peticion_info.docx',
        descripcion: 'Responde solicitudes de información',
        url: '/plantillas/oficio_respuesta_peticion_info.docx',
        tamano: 40000,
        version: '1.0',
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        activo: true
      },
      {
        id: 'plantilla-resp-2',
        nombre: 'Respuesta Derecho de Petición - Copias',
        nombreArchivo: 'oficio_respuesta_peticion_copias.docx',
        descripcion: 'Responde solicitudes de copias del expediente',
        url: '/plantillas/oficio_respuesta_peticion_copias.docx',
        tamano: 38000,
        version: '1.0',
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        activo: true
      }
    ],
    activo: true,
    orden: 1,
    fechaCreacion: new Date().toISOString(),
    fechaModificacion: new Date().toISOString()
  },
  {
    id: 'oficio-tramite-citacion',
    nombre: 'Oficio de Citación',
    descripcion: 'Cita al investigado o testigos para diligencias',
    categoria: 'TRAMITE' as const,
    plantillas: [
      {
        id: 'plantilla-tram-1',
        nombre: 'Citación - Diligencia de Descargos',
        nombreArchivo: 'oficio_citacion_descargos.docx',
        descripcion: 'Cita a audiencia de descargos',
        url: '/plantillas/oficio_citacion_descargos.docx',
        tamano: 36000,
        version: '1.0',
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        activo: true
      },
      {
        id: 'plantilla-tram-2',
        nombre: 'Citación - Práctica de Prueba',
        nombreArchivo: 'oficio_citacion_prueba.docx',
        descripcion: 'Cita para práctica de prueba testimonial',
        url: '/plantillas/oficio_citacion_prueba.docx',
        tamano: 35000,
        version: '1.2',
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        activo: true
      }
    ],
    activo: true,
    orden: 1,
    fechaCreacion: new Date().toISOString(),
    fechaModificacion: new Date().toISOString()
  }
];

export function ConfiguracionPlantillasOficios() {
  const [tiposOficios, setTiposOficios] = useState<TipoOficio[]>(TIPOS_OFICIOS_DEFECTO);
  const [cambiosPendientes, setCambiosPendientes] = useState(false);
  
  const [mostrarModalTipoOficio, setMostrarModalTipoOficio] = useState(false);
  const [tipoOficioEdicion, setTipoOficioEdicion] = useState<TipoOficio | null>(null);
  const [tipoOficioGestionando, setTipoOficioGestionando] = useState<TipoOficio | null>(null);
  const [mostrarModalGestionarPlantillas, setMostrarModalGestionarPlantillas] = useState(false);

  const abrirModalNuevoTipoOficio = () => {
    setTipoOficioEdicion(null);
    setMostrarModalTipoOficio(true);
  };

  const abrirModalEditarTipoOficio = (tipo: TipoOficio) => {
    setTipoOficioEdicion(tipo);
    setMostrarModalTipoOficio(true);
  };

  const guardarTipoOficio = (nuevoTipo: Omit<TipoOficio, 'id' | 'plantillas' | 'fechaCreacion' | 'fechaModificacion'>) => {
    if (tipoOficioEdicion) {
      setTiposOficios(tiposOficios.map(t => 
        t.id === tipoOficioEdicion.id 
          ? { ...t, ...nuevoTipo, fechaModificacion: new Date().toISOString() }
          : t
      ));
      toast.success('Tipo de oficio actualizado correctamente');
    } else {
      const tipoCompleto: TipoOficio = {
        id: `tipo-oficio-${Date.now()}`,
        ...nuevoTipo,
        plantillas: [],
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString()
      };
      setTiposOficios([...tiposOficios, tipoCompleto]);
      toast.success('Tipo de oficio creado correctamente');
    }
    
    setCambiosPendientes(true);
    setMostrarModalTipoOficio(false);
    setTipoOficioEdicion(null);
  };

  const eliminarTipoOficio = (tipoId: string) => {
    if (window.confirm('¿Está seguro de eliminar este tipo de oficio y todas sus plantillas?')) {
      setTiposOficios(tiposOficios.filter(t => t.id !== tipoId));
      setCambiosPendientes(true);
      toast.success('Tipo de oficio eliminado correctamente');
    }
  };

  const toggleActivoTipoOficio = (tipoId: string, activo: boolean) => {
    setTiposOficios(tiposOficios.map(t => 
      t.id === tipoId ? { ...t, activo } : t
    ));
    setCambiosPendientes(true);
    toast.success(activo ? 'Tipo de oficio activado' : 'Tipo de oficio desactivado');
  };

  const abrirGestionPlantillas = (tipo: TipoOficio) => {
    setTipoOficioGestionando(tipo);
    setMostrarModalGestionarPlantillas(true);
  };

  const actualizarPlantillasTipoOficio = (tipoOficioId: string, plantillas: PlantillaArchivo[]) => {
    setTiposOficios(tiposOficios.map(t => 
      t.id === tipoOficioId 
        ? { ...t, plantillas, fechaModificacion: new Date().toISOString() } 
        : t
    ));
    setCambiosPendientes(true);
    setMostrarModalGestionarPlantillas(false);
    setTipoOficioGestionando(null);
  };

  const guardarConfiguraciones = () => {
    try {
      localStorage.setItem('disciplinario-tipos-oficios', JSON.stringify(tiposOficios));
      setCambiosPendientes(false);
      toast.success('Configuraciones guardadas correctamente');
    } catch (error) {
      console.error('❌ Error al guardar:', error);
      toast.error('Error al guardar configuraciones');
    }
  };

  const restablecerDefecto = () => {
    if (window.confirm('¿Está seguro de restablecer a valores por defecto?')) {
      setTiposOficios(TIPOS_OFICIOS_DEFECTO);
      setCambiosPendientes(true);
      toast.success('Configuraciones restablecidas');
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header con acciones */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Tipos de Oficios y Plantillas</h3>
          <p className="text-sm text-gray-600 mt-1">
            Gestiona tipos de oficios y sus plantillas Word/PDF asociadas
          </p>
        </div>
        <div className="flex items-center gap-3">
          {cambiosPendientes && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
              <AlertCircle className="w-3 h-3 mr-1" />
              Sin guardar
            </span>
          )}
          <button
            onClick={restablecerDefecto}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Restablecer
          </button>
          <button
            onClick={guardarConfiguraciones}
            disabled={!cambiosPendientes}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ 
              background: cambiosPendientes ? 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' : '#9CA3AF',
            }}
          >
            <Save className="w-4 h-4" />
            Guardar Cambios
          </button>
        </div>
      </div>

      {/* Componente de gestión unificada */}
      <SeccionPlantillasOficiosUnificada
        tiposOficios={tiposOficios}
        onAgregarTipo={abrirModalNuevoTipoOficio}
        onEditarTipo={abrirModalEditarTipoOficio}
        onEliminarTipo={eliminarTipoOficio}
        onToggleActivoTipo={toggleActivoTipoOficio}
        onGestionarPlantillas={abrirGestionPlantillas}
      />

      {/* Modal para crear/editar tipo de oficio */}
      {mostrarModalTipoOficio && (
        <ModalNuevoTipoOficio
          tipoOficioEdicion={tipoOficioEdicion}
          onGuardar={guardarTipoOficio}
          onCerrar={() => {
            setMostrarModalTipoOficio(false);
            setTipoOficioEdicion(null);
          }}
        />
      )}

      {/* Modal para gestionar plantillas */}
      {mostrarModalGestionarPlantillas && tipoOficioGestionando && (
        <ModalGestionarPlantillasOficio
          tipoOficio={tipoOficioGestionando}
          onGuardar={(plantillas) => actualizarPlantillasTipoOficio(tipoOficioGestionando.id, plantillas)}
          onCerrar={() => {
            setMostrarModalGestionarPlantillas(false);
            setTipoOficioGestionando(null);
          }}
        />
      )}
    </div>
  );
}