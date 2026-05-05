/**
 * CONFIGURACIÓN DE TIPOS DE REMISIÓN
 * Componente modular para gestionar tipos de remisión por competencia
 * Control Interno Disciplinario
 *
 * CONECTADO AL BACKEND - Persistente
 */

import { useState, useEffect } from 'react';
import {
  Plus,
  AlertCircle,
  Trash2,
  Save,
  RotateCcw,
  Edit3,
  X,
  Loader2,
  ArrowRightLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  tiposRemisionService,
  TipoRemision,
} from '../../../../services/api/tiposRemisionService';

const TIPOS_REMISION_DEFECTO: TipoRemision[] = [
  {
    id: 'sin-competencia',
    codigo: 'sin-competencia',
    nombre: 'Sin competencia disciplinaria',
    descripcion:
      'La noticia no corresponde a la competencia disciplinaria de la entidad',
    activo: true,
    orden: 1,
  },
  {
    id: 'factor-territorial',
    codigo: 'factor-territorial',
    nombre: 'Por factor territorial',
    descripcion: 'Remisión por competencia territorial del servidor público',
    activo: true,
    orden: 2,
  },
  {
    id: 'factor-funcional',
    codigo: 'factor-funcional',
    nombre: 'Por factor funcional (servidor de otra entidad)',
    descripcion:
      'Remisión por factor funcional cuando el servidor pertenece a otra entidad',
    activo: true,
    orden: 3,
  },
  {
    id: 'naturaleza-falta',
    codigo: 'naturaleza-falta',
    nombre: 'Por naturaleza de la falta (penal, fiscal)',
    descripcion: 'Remisión cuando la falta tiene naturaleza penal o fiscal',
    activo: true,
    orden: 4,
  },
  {
    id: 'prelacion-competencia',
    codigo: 'prelacion-competencia',
    nombre: 'Por prelacion de competencia (Procuraduría)',
    descripcion:
      'Remisión por prelación de competencia a la Procuraduría General de la Nación',
    activo: true,
    orden: 5,
  },
];

export function ConfiguracionTiposRemision() {
  const [tipos, setTipos] = useState<TipoRemision[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cambiosPendientes, setCambiosPendientes] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [tipoEdicion, setTipoEdicion] = useState<TipoRemision | null>(null);
  const [formTipo, setFormTipo] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
  });
  const [erroresForm, setErroresForm] = useState({
    codigo: '',
    nombre: '',
  });

  useEffect(() => {
    cargarTipos();
  }, []);

  const cargarTipos = async () => {
    try {
      setLoading(true);
      const data = await tiposRemisionService.getAll();
      setTipos(data);
    } catch (error) {
      console.error('Error al cargar tipos de remisión:', error);
      setTipos(TIPOS_REMISION_DEFECTO);
    } finally {
      setLoading(false);
    }
  };

  const abrirModalNuevoTipo = () => {
    setTipoEdicion(null);
    setFormTipo({ codigo: '', nombre: '', descripcion: '' });
    setErroresForm({ codigo: '', nombre: '' });
    setShowModal(true);
  };

  const abrirModalEditarTipo = (tipo: TipoRemision) => {
    setTipoEdicion(tipo);
    setFormTipo({
      codigo: tipo.codigo ?? '',
      nombre: tipo.nombre ?? '',
      descripcion: tipo.descripcion ?? '',
    });
    setErroresForm({ codigo: '', nombre: '' });
    setShowModal(true);
  };

  const validarFormulario = (): boolean => {
    const errores = { codigo: '', nombre: '' };
    let esValido = true;

    if (!formTipo.codigo.trim()) {
      errores.codigo = 'El código es obligatorio';
      esValido = false;
    } else if (formTipo.codigo.trim().length < 3) {
      errores.codigo = 'El código debe tener al menos 3 caracteres';
      esValido = false;
    } else {
      const codigoDuplicado = tipos.some(
        (t) =>
          t.id !== tipoEdicion?.id &&
          t.codigo.toLowerCase().trim() ===
            formTipo.codigo.toLowerCase().trim(),
      );
      if (codigoDuplicado) {
        errores.codigo = 'Ya existe un tipo con este código';
        esValido = false;
      }
    }

    if (!formTipo.nombre.trim()) {
      errores.nombre = 'El nombre es obligatorio';
      esValido = false;
    } else if (formTipo.nombre.trim().length < 3) {
      errores.nombre = 'El nombre debe tener al menos 3 caracteres';
      esValido = false;
    }

    setErroresForm(errores);
    return esValido;
  };

  const guardarTipo = async () => {
    if (!validarFormulario()) {
      toast.error('Por favor corrige los errores del formulario');
      return;
    }

    try {
      if (tipoEdicion) {
        const updated = await tiposRemisionService.update(tipoEdicion.id, {
          codigo: formTipo.codigo.trim(),
          nombre: formTipo.nombre.trim(),
          descripcion: formTipo.descripcion.trim(),
        });
        setTipos(tipos.map((t) => (t.id === tipoEdicion.id ? updated : t)));
        toast.success('Tipo de remisión actualizado correctamente');
      } else {
        const created = await tiposRemisionService.create({
          codigo: formTipo.codigo.trim(),
          nombre: formTipo.nombre.trim(),
          descripcion: formTipo.descripcion.trim(),
        });
        setTipos([...tipos, created]);
        toast.success('Tipo de remisión agregado correctamente');
      }
    } catch (error: any) {
      console.error('Error al guardar tipo de remisión:', error);
      toast.error(error.message || 'Error al guardar el tipo de remisión');
    }

    setShowModal(false);
    setTipoEdicion(null);
    setFormTipo({ codigo: '', nombre: '', descripcion: '' });
  };

  const eliminarTipo = async (tipo: TipoRemision) => {
    if (
      window.confirm(
        `¿Estás seguro de eliminar el tipo "${tipo.nombre}"?`,
      )
    ) {
      try {
        await tiposRemisionService.delete(tipo.id);
        setTipos(tipos.filter((t) => t.id !== tipo.id));
        toast.success('Tipo de remisión eliminado correctamente');
      } catch (error: any) {
        console.error('Error al eliminar tipo:', error);
        toast.error(error.message || 'Error al eliminar el tipo de remisión');
      }
    }
  };

  const actualizarTipo = async (tipoId: string, activo: boolean) => {
    try {
      const updated = await tiposRemisionService.toggleActivo(tipoId, activo);
      setTipos(tipos.map((t) => (t.id === tipoId ? updated : t)));
    } catch (error: any) {
      console.error('Error al cambiar estado:', error);
      toast.error(
        error.message || 'Error al cambiar el estado del tipo de remisión',
      );
    }
  };

  const guardarConfiguraciones = async () => {
    try {
      setSaving(true);
      localStorage.setItem(
        'disciplinario-tipos-remision',
        JSON.stringify(tipos),
      );
      setCambiosPendientes(false);
      toast.success('Configuraciones guardadas correctamente');
    } catch (error) {
      console.error('Error al guardar:', error);
      toast.error('Error al guardar configuraciones');
    } finally {
      setSaving(false);
    }
  };

  const restablecerDefecto = async () => {
    if (window.confirm('¿Está seguro de restablecer a valores por defecto?')) {
      try {
        await tiposRemisionService.seed();
        await cargarTipos();
        toast.success('Configuraciones restablecidas');
      } catch (error) {
        setTipos(TIPOS_REMISION_DEFECTO);
        localStorage.setItem(
          'disciplinario-tipos-remision',
          JSON.stringify(TIPOS_REMISION_DEFECTO),
        );
        toast.success('Configuraciones restablecidas (modo local)');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">
          Cargando tipos de remisión...
        </span>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header con acciones */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            Tipos de Remisión por Competencia
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Configura los tipos de remisión disponibles en el sistema
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
            disabled={!cambiosPendientes || saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: cambiosPendientes
                ? 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)'
                : '#9CA3AF',
            }}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Guardar Cambios
          </button>
        </div>
      </div>

      {/* Botón agregar */}
      <div className="flex justify-end">
        <button
          onClick={abrirModalNuevoTipo}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg"
          style={{
            background:
              'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
            boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)',
          }}
        >
          <Plus className="w-4 h-4" />
          Nuevo Tipo de Remisión
        </button>
      </div>

      {/* Lista de tipos */}
      <div className="space-y-3">
        {tipos.map((tipo) => (
          <div
            key={tipo.id}
            className="p-4 rounded-lg border-2 border-gray-200 bg-gradient-to-br from-indigo-50 to-white hover:border-indigo-300 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-gray-900">
                    {tipo.nombre}
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded font-mono">
                    {tipo.codigo}
                  </span>
                  {tipo.descripcion && (
                    <span className="text-gray-500">— {tipo.descripcion}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => abrirModalEditarTipo(tipo)}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Editar tipo"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => eliminarTipo(tipo)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Eliminar tipo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tipo.activo}
                  onChange={(e) => actualizarTipo(tipo.id, e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-semibold text-gray-700">
                  {tipo.activo
                    ? '✓ Activo (visible en modal)'
                    : 'Inactivo (oculto en modal)'}
                </span>
              </label>
              <span
                className={`text-xs px-2 py-1 rounded-full font-semibold ${
                  tipo.activo
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {tipo.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Nota informativa */}
      <div className="p-4 rounded-lg bg-indigo-50 border-l-4 border-indigo-500">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-indigo-800">
              <span className="font-bold">Nota:</span> Estos tipos aparecerán
              en el menú desplegable del modal{' '}
              <span className="font-bold">"Remitir por Competencia"</span>.
              Los usuarios podrán seleccionar el tipo de remisión
              correspondiente.
            </p>
            <p className="text-xs text-indigo-600 mt-1">
              Los cambios se guardan en el backend de forma persistente.
            </p>
          </div>
        </div>
      </div>

      {/* Modal para agregar/editar tipo */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-bold text-gray-900">
                {tipoEdicion
                  ? 'Editar Tipo de Remisión'
                  : 'Nuevo Tipo de Remisión'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Código *
                </label>
                <input
                  type="text"
                  value={formTipo.codigo}
                  onChange={(e) =>
                    setFormTipo({
                      ...formTipo,
                      codigo: e.target.value.toLowerCase().replace(/ /g, '-'),
                    })
                  }
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    erroresForm.codigo
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  placeholder="Ej: sin-competencia"
                />
                {erroresForm.codigo && (
                  <p className="text-xs text-red-600 mt-1">
                    {erroresForm.codigo}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formTipo.nombre}
                  onChange={(e) =>
                    setFormTipo({ ...formTipo, nombre: e.target.value })
                  }
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    erroresForm.nombre
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  placeholder="Ej: Sin competencia disciplinaria"
                />
                {erroresForm.nombre && (
                  <p className="text-xs text-red-600 mt-1">
                    {erroresForm.nombre}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formTipo.descripcion}
                  onChange={(e) =>
                    setFormTipo({ ...formTipo, descripcion: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Descripción del tipo de remisión..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={guardarTipo}
                className="px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg"
                style={{
                  background:
                    'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
                }}
              >
                {tipoEdicion ? 'Actualizar' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
