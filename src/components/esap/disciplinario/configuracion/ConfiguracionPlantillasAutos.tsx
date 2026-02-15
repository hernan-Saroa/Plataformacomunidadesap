/**
 * CONFIGURACIÓN DE PLANTILLAS DE AUTOS
 * Componente modular standalone para gestionar plantillas de autos
 * Control Interno Disciplinario
 */

import { useState } from 'react';
import { Plus, AlertCircle, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { SeccionPlantillasAutosUnificada, type TipoAuto, type PlantillaArchivo } from './SeccionPlantillasAutosUnificada';
import { ModalNuevoTipoAuto } from './ModalNuevoTipoAuto';
import { ModalGestionarPlantillas } from './ModalGestionarPlantillas';

// Tipos de autos por defecto con múltiples plantillas
const TIPOS_AUTOS_DEFECTO: TipoAuto[] = [
  {
    id: 'auto-apertura-indagacion',
    nombre: 'Auto de Apertura de Indagación',
    descripcion: 'Inicia la indagación preliminar para determinar si hay mérito para abrir investigación formal',
    etapa: 'INDAGACION' as const,
    plantillas: [
      {
        id: 'plantilla-1',
        nombre: 'Auto Apertura Indagación - Formato Estándar',
        nombreArchivo: 'auto_apertura_indagacion_estandar.docx',
        descripcion: 'Plantilla estándar para iniciar indagación preliminar',
        url: '/plantillas/auto_apertura_indagacion_estandar.docx',
        tamano: 45000,
        version: '1.0',
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        activo: true
      },
      {
        id: 'plantilla-2',
        nombre: 'Auto Apertura Indagación - Formato Simplificado',
        nombreArchivo: 'auto_apertura_indagacion_simplificado.docx',
        descripcion: 'Plantilla simplificada para casos menos complejos',
        url: '/plantillas/auto_apertura_indagacion_simplificado.docx',
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
    id: 'auto-archivo-indagacion',
    nombre: 'Auto de Archivo de Indagación',
    descripcion: 'Archiva la indagación preliminar cuando no hay mérito para continuar',
    etapa: 'INDAGACION' as const,
    plantillas: [
      {
        id: 'plantilla-ind-1',
        nombre: 'Auto Archivo Indagación - Por Falta de Mérito',
        nombreArchivo: 'auto_archivo_indagacion.docx',
        descripcion: 'Cuando no se configuran elementos para continuar',
        url: '/plantillas/auto_archivo_indagacion.docx',
        tamano: 42000,
        version: '1.2',
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
    id: 'auto-apertura-investigacion',
    nombre: 'Auto de Apertura de Investigación',
    descripcion: 'Inicia formalmente la investigación disciplinaria contra el servidor público',
    etapa: 'INVESTIGACION' as const,
    plantillas: [
      {
        id: 'plantilla-3',
        nombre: 'Auto Apertura Investigación - Completo',
        nombreArchivo: 'auto_apertura_investigacion.docx',
        descripcion: 'Plantilla completa con todos los fundamentos legales',
        url: '/plantillas/auto_apertura_investigacion.docx',
        tamano: 52000,
        version: '2.0',
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        activo: true
      },
      {
        id: 'plantilla-3b',
        nombre: 'Auto Apertura Investigación - Falta Gravísima',
        nombreArchivo: 'auto_apertura_investigacion_gravisima.docx',
        descripcion: 'Para faltas gravísimas con considerandos especiales',
        url: '/plantillas/auto_apertura_investigacion_gravisima.docx',
        tamano: 58000,
        version: '1.5',
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
    id: 'auto-practica-pruebas',
    nombre: 'Auto de Práctica de Pruebas',
    descripcion: 'Ordena la práctica de pruebas específicas para el esclarecimiento de los hechos',
    etapa: 'INVESTIGACION' as const,
    plantillas: [
      {
        id: 'plantilla-4',
        nombre: 'Auto Práctica Pruebas - General',
        nombreArchivo: 'auto_practica_pruebas.docx',
        descripcion: 'Para solicitar práctica de pruebas testimoniales y documentales',
        url: '/plantillas/auto_practica_pruebas.docx',
        tamano: 48000,
        version: '1.5',
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        activo: true
      },
      {
        id: 'plantilla-4b',
        nombre: 'Auto Práctica Pruebas - Testimonial',
        nombreArchivo: 'auto_practica_pruebas_testimonial.docx',
        descripcion: 'Específico para testimonios',
        url: '/plantillas/auto_practica_pruebas_testimonial.docx',
        tamano: 44000,
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
    id: 'auto-cierre-investigacion',
    nombre: 'Auto de Cierre de Investigación',
    descripcion: 'Cierra la investigación y ordena archivar o formular cargos',
    etapa: 'INVESTIGACION' as const,
    plantillas: [
      {
        id: 'plantilla-cierre-1',
        nombre: 'Auto Cierre - Archivo por Falta de Pruebas',
        nombreArchivo: 'auto_cierre_archivo.docx',
        descripcion: 'Cuando no hay pruebas suficientes para formular cargos',
        url: '/plantillas/auto_cierre_archivo.docx',
        tamano: 46000,
        version: '1.3',
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        activo: true
      },
      {
        id: 'plantilla-cierre-2',
        nombre: 'Auto Cierre - Traslado a Cargos',
        nombreArchivo: 'auto_cierre_traslado_cargos.docx',
        descripcion: 'Cuando hay mérito para formular pliego de cargos',
        url: '/plantillas/auto_cierre_traslado_cargos.docx',
        tamano: 49000,
        version: '1.8',
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        activo: true
      }
    ],
    activo: true,
    orden: 3,
    fechaCreacion: new Date().toISOString(),
    fechaModificacion: new Date().toISOString()
  },
  {
    id: 'pliego-cargos',
    nombre: 'Pliego de Cargos',
    descripcion: 'Formula el pliego de cargos al investigado con los fundamentos de hecho y derecho',
    etapa: 'CARGOS' as const,
    plantillas: [
      {
        id: 'plantilla-5',
        nombre: 'Pliego de Cargos - Formato Oficial',
        nombreArchivo: 'pliego_cargos_oficial.docx',
        descripcion: 'Formato oficial según normatividad vigente',
        url: '/plantillas/pliego_cargos_oficial.docx',
        tamano: 65000,
        version: '3.0',
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        activo: true
      },
      {
        id: 'plantilla-5b',
        nombre: 'Pliego de Cargos - Falta Leve',
        nombreArchivo: 'pliego_cargos_leve.docx',
        descripcion: 'Para faltas leves con trámite simplificado',
        url: '/plantillas/pliego_cargos_leve.docx',
        tamano: 58000,
        version: '2.0',
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        activo: true
      },
      {
        id: 'plantilla-5c',
        nombre: 'Pliego de Cargos - Falta Gravísima',
        nombreArchivo: 'pliego_cargos_gravisima.docx',
        descripcion: 'Para faltas gravísimas con destitución',
        url: '/plantillas/pliego_cargos_gravisima.docx',
        tamano: 72000,
        version: '2.5',
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
    id: 'auto-descargos',
    nombre: 'Auto que Ordena Descargos',
    descripcion: 'Ordena presentar descargos al pliego de cargos formulado',
    etapa: 'CARGOS' as const,
    plantillas: [
      {
        id: 'plantilla-desc-1',
        nombre: 'Auto Descargos - Notificación Personal',
        nombreArchivo: 'auto_descargos_personal.docx',
        descripcion: 'Para notificación personal del derecho a descargos',
        url: '/plantillas/auto_descargos_personal.docx',
        tamano: 41000,
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
    id: 'fallo-sancionatorio',
    nombre: 'Fallo Sancionatorio',
    descripcion: 'Fallo disciplinario que declara la responsabilidad e impone sanción al investigado',
    etapa: 'FALLO' as const,
    plantillas: [
      {
        id: 'plantilla-6',
        nombre: 'Fallo Sancionatorio - Completo',
        nombreArchivo: 'fallo_sancionatorio.docx',
        descripcion: 'Fallo con todos los fundamentos legales y de hecho',
        url: '/plantillas/fallo_sancionatorio.docx',
        tamano: 72000,
        version: '2.1',
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        activo: true
      },
      {
        id: 'plantilla-7',
        nombre: 'Fallo Absolutorio',
        nombreArchivo: 'fallo_absolutorio.docx',
        descripcion: 'Para fallos que absuelven al investigado',
        url: '/plantillas/fallo_absolutorio.docx',
        tamano: 68000,
        version: '1.8',
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        activo: true
      },
      {
        id: 'plantilla-8',
        nombre: 'Fallo - Suspensión Temporal',
        nombreArchivo: 'fallo_suspension_temporal.docx',
        descripcion: 'Fallo con sanción de suspensión sin goce de salario',
        url: '/plantillas/fallo_suspension_temporal.docx',
        tamano: 70000,
        version: '2.0',
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        activo: true
      },
      {
        id: 'plantilla-9',
        nombre: 'Fallo - Destitución',
        nombreArchivo: 'fallo_destitucion.docx',
        descripcion: 'Fallo con sanción de destitución del cargo',
        url: '/plantillas/fallo_destitucion.docx',
        tamano: 75000,
        version: '2.2',
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
    id: 'auto-segunda-instancia',
    nombre: 'Auto de Segunda Instancia',
    descripcion: 'Auto que resuelve recurso de apelación contra el fallo',
    etapa: 'FALLO' as const,
    plantillas: [
      {
        id: 'plantilla-2da-1',
        nombre: 'Auto Segunda Instancia - Confirma',
        nombreArchivo: 'auto_segunda_instancia_confirma.docx',
        descripcion: 'Confirma el fallo de primera instancia',
        url: '/plantillas/auto_segunda_instancia_confirma.docx',
        tamano: 64000,
        version: '1.5',
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        activo: true
      },
      {
        id: 'plantilla-2da-2',
        nombre: 'Auto Segunda Instancia - Revoca',
        nombreArchivo: 'auto_segunda_instancia_revoca.docx',
        descripcion: 'Revoca el fallo de primera instancia',
        url: '/plantillas/auto_segunda_instancia_revoca.docx',
        tamano: 66000,
        version: '1.3',
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        activo: true
      }
    ],
    activo: true,
    orden: 2,
    fechaCreacion: new Date().toISOString(),
    fechaModificacion: new Date().toISOString()
  }
];

export function ConfiguracionPlantillasAutos() {
  const [tiposAutos, setTiposAutos] = useState<TipoAuto[]>(TIPOS_AUTOS_DEFECTO);
  const [cambiosPendientes, setCambiosPendientes] = useState(false);
  
  // Estados para modales
  const [mostrarModalTipoAuto, setMostrarModalTipoAuto] = useState(false);
  const [tipoAutoEdicion, setTipoAutoEdicion] = useState<TipoAuto | null>(null);
  const [tipoAutoGestionando, setTipoAutoGestionando] = useState<TipoAuto | null>(null);
  const [mostrarModalGestionarPlantillas, setMostrarModalGestionarPlantillas] = useState(false);

  const abrirModalNuevoTipoAuto = () => {
    setTipoAutoEdicion(null);
    setMostrarModalTipoAuto(true);
  };

  const abrirModalEditarTipoAuto = (tipo: TipoAuto) => {
    setTipoAutoEdicion(tipo);
    setMostrarModalTipoAuto(true);
  };

  const guardarTipoAuto = (nuevoTipo: Omit<TipoAuto, 'id' | 'plantillas' | 'fechaCreacion' | 'fechaModificacion'>) => {
    if (tipoAutoEdicion) {
      // Editar existente (preserva plantillas)
      setTiposAutos(tiposAutos.map(t => 
        t.id === tipoAutoEdicion.id 
          ? { ...t, ...nuevoTipo, fechaModificacion: new Date().toISOString() }
          : t
      ));
      toast.success('Tipo de auto actualizado correctamente');
    } else {
      // Crear nuevo tipo (con array vacío de plantillas)
      const tipoCompleto: TipoAuto = {
        id: `tipo-auto-${Date.now()}`,
        ...nuevoTipo,
        plantillas: [],
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString()
      };
      setTiposAutos([...tiposAutos, tipoCompleto]);
      toast.success('Tipo de auto creado correctamente');
    }
    
    setCambiosPendientes(true);
    setMostrarModalTipoAuto(false);
    setTipoAutoEdicion(null);
  };

  const eliminarTipoAuto = (tipoId: string) => {
    if (window.confirm('¿Está seguro de eliminar este tipo de auto y todas sus plantillas?')) {
      setTiposAutos(tiposAutos.filter(t => t.id !== tipoId));
      setCambiosPendientes(true);
      toast.success('Tipo de auto eliminado correctamente');
    }
  };

  const toggleActivoTipoAuto = (tipoId: string, activo: boolean) => {
    setTiposAutos(tiposAutos.map(t => 
      t.id === tipoId ? { ...t, activo } : t
    ));
    setCambiosPendientes(true);
    toast.success(activo ? 'Tipo de auto activado' : 'Tipo de auto desactivado');
  };

  const abrirGestionPlantillas = (tipo: TipoAuto) => {
    setTipoAutoGestionando(tipo);
    setMostrarModalGestionarPlantillas(true);
  };

  const actualizarPlantillasTipoAuto = (tipoAutoId: string, plantillas: PlantillaArchivo[]) => {
    setTiposAutos(tiposAutos.map(t => 
      t.id === tipoAutoId 
        ? { ...t, plantillas, fechaModificacion: new Date().toISOString() } 
        : t
    ));
    setCambiosPendientes(true);
    setMostrarModalGestionarPlantillas(false);
    setTipoAutoGestionando(null);
  };

  const guardarConfiguraciones = () => {
    try {
      localStorage.setItem('disciplinario-tipos-autos', JSON.stringify(tiposAutos));
      setCambiosPendientes(false);
      toast.success('Configuraciones guardadas correctamente');
    } catch (error) {
      console.error('❌ Error al guardar:', error);
      toast.error('Error al guardar configuraciones');
    }
  };

  const restablecerDefecto = () => {
    if (window.confirm('¿Está seguro de restablecer a valores por defecto?')) {
      setTiposAutos(TIPOS_AUTOS_DEFECTO);
      setCambiosPendientes(true);
      toast.success('Configuraciones restablecidas');
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header con acciones */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Tipos de Autos y Plantillas</h3>
          <p className="text-sm text-gray-600 mt-1">
            Gestiona tipos de autos y sus plantillas Word/PDF asociadas
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
              background: cambiosPendientes ? 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' : '#9CA3AF',
            }}
          >
            <Save className="w-4 h-4" />
            Guardar Cambios
          </button>
        </div>
      </div>

      {/* Componente de gestión unificada */}
      <SeccionPlantillasAutosUnificada
        tiposAutos={tiposAutos}
        onAgregarTipo={abrirModalNuevoTipoAuto}
        onEditarTipo={abrirModalEditarTipoAuto}
        onEliminarTipo={eliminarTipoAuto}
        onToggleActivoTipo={toggleActivoTipoAuto}
        onGestionarPlantillas={abrirGestionPlantillas}
      />

      {/* Modal para crear/editar tipo de auto */}
      {mostrarModalTipoAuto && (
        <ModalNuevoTipoAuto
          tipoAutoEdicion={tipoAutoEdicion}
          onGuardar={guardarTipoAuto}
          onCerrar={() => {
            setMostrarModalTipoAuto(false);
            setTipoAutoEdicion(null);
          }}
        />
      )}

      {/* Modal para gestionar plantillas */}
      {mostrarModalGestionarPlantillas && tipoAutoGestionando && (
        <ModalGestionarPlantillas
          tipoAuto={tipoAutoGestionando}
          onGuardar={(plantillas) => actualizarPlantillasTipoAuto(tipoAutoGestionando.id, plantillas)}
          onCerrar={() => {
            setMostrarModalGestionarPlantillas(false);
            setTipoAutoGestionando(null);
          }}
        />
      )}
    </div>
  );
}