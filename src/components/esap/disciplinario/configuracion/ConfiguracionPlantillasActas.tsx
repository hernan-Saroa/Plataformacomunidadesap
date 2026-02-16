/**
 * CONFIGURACIÓN DE PLANTILLAS DE ACTAS
 * Componente modular standalone para gestionar plantillas de actas
 * Control Interno Disciplinario
 */

import { useState } from 'react';
import { Plus, AlertCircle, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { SeccionPlantillasActasUnificada, type TipoActa, type PlantillaArchivo } from './SeccionPlantillasActasUnificada';
import { ModalNuevoTipoActa } from './ModalNuevoTipoActa';
import { ModalGestionarPlantillasActa } from './ModalGestionarPlantillasActa';

// Tipos de actas por defecto
const TIPOS_ACTAS_DEFECTO: TipoActa[] = [
  {
    id: 'acta-inicio-indagacion',
    nombre: 'Acta de Inicio de Indagación Preliminar',
    descripcion: 'Documenta el inicio formal de la indagación preliminar',
    tipo: 'INICIO' as const,
    plantillas: [
      {
        id: 'plantilla-ini-1',
        nombre: 'Acta Inicio Indagación - Estándar',
        nombreArchivo: 'acta_inicio_indagacion.docx',
        descripcion: 'Formato estándar para iniciar indagación',
        url: '/plantillas/acta_inicio_indagacion.docx',
        tamano: 42000,
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
    id: 'acta-audiencia-descargos',
    nombre: 'Acta de Audiencia de Descargos',
    descripcion: 'Documenta la audiencia en la que el investigado presenta sus descargos al pliego de cargos',
    tipo: 'DESCARGOS' as const,
    plantillas: [
      {
        id: 'plantilla-1',
        nombre: 'Acta Audiencia Descargos - Formato Oficial',
        nombreArchivo: 'acta_audiencia_descargos.docx',
        descripcion: 'Formato oficial para registrar audiencia de descargos',
        url: '/plantillas/acta_audiencia_descargos.docx',
        tamano: 48000,
        version: '2.0',
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        activo: true
      },
      {
        id: 'plantilla-1b',
        nombre: 'Acta Audiencia Descargos - Con Apoderado',
        nombreArchivo: 'acta_audiencia_descargos_apoderado.docx',
        descripcion: 'Cuando el investigado actúa con apoderado',
        url: '/plantillas/acta_audiencia_descargos_apoderado.docx',
        tamano: 50000,
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
    id: 'acta-version-libre',
    nombre: 'Acta de Versión Libre del Investigado',
    descripcion: 'Registra la versión libre que rinde el investigado sobre los hechos objeto de investigación',
    tipo: 'VERSION' as const,
    plantillas: [
      {
        id: 'plantilla-2',
        nombre: 'Acta Versión Libre - Formato Completo',
        nombreArchivo: 'acta_version_libre.docx',
        descripcion: 'Incluye formulación de derechos y registro detallado',
        url: '/plantillas/acta_version_libre.docx',
        tamano: 51000,
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
    id: 'acta-practica-pruebas-testimonial',
    nombre: 'Acta de Práctica de Prueba Testimonial',
    descripcion: 'Documenta la práctica de pruebas testimoniales solicitadas en el proceso',
    tipo: 'PRUEBAS' as const,
    plantillas: [
      {
        id: 'plantilla-3',
        nombre: 'Acta Práctica Pruebas - Testimonial',
        nombreArchivo: 'acta_practica_prueba_testimonial.docx',
        descripcion: 'Para registro de declaraciones de testigos',
        url: '/plantillas/acta_practica_prueba_testimonial.docx',
        tamano: 46000,
        version: '1.8',
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
    id: 'acta-practica-pruebas-documental',
    nombre: 'Acta de Práctica de Prueba Documental',
    descripcion: 'Documenta la inspección y valoración de documentos como prueba',
    tipo: 'PRUEBAS' as const,
    plantillas: [
      {
        id: 'plantilla-4',
        nombre: 'Acta Práctica Pruebas - Documental',
        nombreArchivo: 'acta_practica_prueba_documental.docx',
        descripcion: 'Para inspección y registro de pruebas documentales',
        url: '/plantillas/acta_practica_prueba_documental.docx',
        tamano: 43000,
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
  },
  {
    id: 'acta-audiencia-publica',
    nombre: 'Acta de Audiencia Pública',
    descripcion: 'Registra el desarrollo de audiencias públicas conforme al debido proceso',
    tipo: 'AUDIENCIA' as const,
    plantillas: [
      {
        id: 'plantilla-5',
        nombre: 'Acta Audiencia Pública - Formato General',
        nombreArchivo: 'acta_audiencia_publica.docx',
        descripcion: 'Para registro de audiencias públicas procesales',
        url: '/plantillas/acta_audiencia_publica.docx',
        tamano: 49000,
        version: '2.1',
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        activo: true
      },
      {
        id: 'plantilla-5b',
        nombre: 'Acta Audiencia Pública - Virtual',
        nombreArchivo: 'acta_audiencia_publica_virtual.docx',
        descripcion: 'Para audiencias realizadas por medios virtuales',
        url: '/plantillas/acta_audiencia_publica_virtual.docx',
        tamano: 47000,
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
    id: 'acta-cierre-investigacion',
    nombre: 'Acta de Cierre de Investigación',
    descripcion: 'Documenta formalmente el cierre de la etapa de investigación',
    tipo: 'CIERRE' as const,
    plantillas: [
      {
        id: 'plantilla-cierre-1',
        nombre: 'Acta Cierre Investigación - Completa',
        nombreArchivo: 'acta_cierre_investigacion.docx',
        descripcion: 'Cierre con análisis de pruebas recaudadas',
        url: '/plantillas/acta_cierre_investigacion.docx',
        tamano: 45000,
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
  }
];

export function ConfiguracionPlantillasActas() {
  const [tiposActas, setTiposActas] = useState<TipoActa[]>(TIPOS_ACTAS_DEFECTO);
  const [cambiosPendientes, setCambiosPendientes] = useState(false);
  
  const [mostrarModalTipoActa, setMostrarModalTipoActa] = useState(false);
  const [tipoActaEdicion, setTipoActaEdicion] = useState<TipoActa | null>(null);
  const [tipoActaGestionando, setTipoActaGestionando] = useState<TipoActa | null>(null);
  const [mostrarModalGestionarPlantillas, setMostrarModalGestionarPlantillas] = useState(false);

  const abrirModalNuevoTipoActa = () => {
    setTipoActaEdicion(null);
    setMostrarModalTipoActa(true);
  };

  const abrirModalEditarTipoActa = (tipo: TipoActa) => {
    setTipoActaEdicion(tipo);
    setMostrarModalTipoActa(true);
  };

  const guardarTipoActa = (nuevoTipo: Omit<TipoActa, 'id' | 'plantillas' | 'fechaCreacion' | 'fechaModificacion'>) => {
    if (tipoActaEdicion) {
      setTiposActas(tiposActas.map(t => 
        t.id === tipoActaEdicion.id 
          ? { ...t, ...nuevoTipo, fechaModificacion: new Date().toISOString() }
          : t
      ));
      toast.success('Tipo de acta actualizado correctamente');
    } else {
      const tipoCompleto: TipoActa = {
        id: `tipo-acta-${Date.now()}`,
        ...nuevoTipo,
        plantillas: [],
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString()
      };
      setTiposActas([...tiposActas, tipoCompleto]);
      toast.success('Tipo de acta creado correctamente');
    }
    
    setCambiosPendientes(true);
    setMostrarModalTipoActa(false);
    setTipoActaEdicion(null);
  };

  const eliminarTipoActa = (tipoId: string) => {
    if (window.confirm('¿Está seguro de eliminar este tipo de acta y todas sus plantillas?')) {
      setTiposActas(tiposActas.filter(t => t.id !== tipoId));
      setCambiosPendientes(true);
      toast.success('Tipo de acta eliminado correctamente');
    }
  };

  const toggleActivoTipoActa = (tipoId: string, activo: boolean) => {
    setTiposActas(tiposActas.map(t => 
      t.id === tipoId ? { ...t, activo } : t
    ));
    setCambiosPendientes(true);
    toast.success(activo ? 'Tipo de acta activado' : 'Tipo de acta desactivado');
  };

  const abrirGestionPlantillas = (tipo: TipoActa) => {
    setTipoActaGestionando(tipo);
    setMostrarModalGestionarPlantillas(true);
  };

  const actualizarPlantillasTipoActa = (tipoActaId: string, plantillas: PlantillaArchivo[]) => {
    setTiposActas(tiposActas.map(t => 
      t.id === tipoActaId 
        ? { ...t, plantillas, fechaModificacion: new Date().toISOString() } 
        : t
    ));
    setCambiosPendientes(true);
    setMostrarModalGestionarPlantillas(false);
    setTipoActaGestionando(null);
  };

  const guardarConfiguraciones = () => {
    try {
      localStorage.setItem('disciplinario-tipos-actas', JSON.stringify(tiposActas));
      setCambiosPendientes(false);
      toast.success('Configuraciones guardadas correctamente');
    } catch (error) {
      console.error('❌ Error al guardar:', error);
      toast.error('Error al guardar configuraciones');
    }
  };

  const restablecerDefecto = () => {
    if (window.confirm('¿Está seguro de restablecer a valores por defecto?')) {
      setTiposActas(TIPOS_ACTAS_DEFECTO);
      setCambiosPendientes(true);
      toast.success('Configuraciones restablecidas');
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header con acciones */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Tipos de Actas y Plantillas</h3>
          <p className="text-sm text-gray-600 mt-1">
            Gestiona tipos de actas procesales y sus plantillas Word/PDF asociadas
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
              background: cambiosPendientes ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' : '#9CA3AF',
            }}
          >
            <Save className="w-4 h-4" />
            Guardar Cambios
          </button>
        </div>
      </div>

      {/* Componente de gestión unificada */}
      <SeccionPlantillasActasUnificada
        tiposActas={tiposActas}
        onAgregarTipo={abrirModalNuevoTipoActa}
        onEditarTipo={abrirModalEditarTipoActa}
        onEliminarTipo={eliminarTipoActa}
        onToggleActivoTipo={toggleActivoTipoActa}
        onGestionarPlantillas={abrirGestionPlantillas}
      />

      {/* Modal para crear/editar tipo de acta */}
      {mostrarModalTipoActa && (
        <ModalNuevoTipoActa
          tipoActaEdicion={tipoActaEdicion}
          onGuardar={guardarTipoActa}
          onCerrar={() => {
            setMostrarModalTipoActa(false);
            setTipoActaEdicion(null);
          }}
        />
      )}

      {/* Modal para gestionar plantillas */}
      {mostrarModalGestionarPlantillas && tipoActaGestionando && (
        <ModalGestionarPlantillasActa
          tipoActa={tipoActaGestionando}
          onGuardar={(plantillas) => actualizarPlantillasTipoActa(tipoActaGestionando.id, plantillas)}
          onCerrar={() => {
            setMostrarModalGestionarPlantillas(false);
            setTipoActaGestionando(null);
          }}
        />
      )}
    </div>
  );
}