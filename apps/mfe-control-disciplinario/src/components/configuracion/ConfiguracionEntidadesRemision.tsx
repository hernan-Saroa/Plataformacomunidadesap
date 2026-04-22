/**
 * CONFIGURACIÓN DE ENTIDADES DE REMISIÓN
 * Componente modular para gestionar entidades de remisión por competencia
 * Control Interno Disciplinario
 * 
 * CONECTADO AL BACKEND - Persistente
 */

import { useState, useEffect } from 'react';
import { Plus, AlertCircle, Trash2, Save, RotateCcw, Mail, Edit3, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { entidadesRemisionService, EntidadRemision } from '../../../../services/api/entidadesRemisionService';
import { authService } from '../../../../services/api/authService';
import { Permissions } from '@esap-mfe/shared-types/permissions';

const ENTIDADES_REMISION_DEFECTO: EntidadRemision[] = [
  { id: 'procuraduria', nombre: 'Procuraduría General de la Nación', correo: 'contacto@procuraduria.gov.co', activo: true },
  { id: 'contraloria', nombre: 'Contraloría General de la República', correo: 'info@contraloria.gov.co', activo: true },
  { id: 'fiscalia', nombre: 'Fiscalía General de la Nación', correo: 'denuncias@fiscalia.gov.co', activo: true },
  { id: 'defensoria', nombre: 'Defensoría del Pueblo', correo: 'contacto@defensoria.gov.co', activo: true },
  { id: 'personeria', nombre: 'Personería Municipal', correo: 'info@personeria.gov.co', activo: true },
  { id: 'otra-entidad', nombre: 'Otra Entidad Competente', correo: 'contacto@entidad.gov.co', activo: true }
];

export function ConfiguracionEntidadesRemision() {
  const [entidades, setEntidades] = useState<EntidadRemision[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cambiosPendientes, setCambiosPendientes] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [entidadEdicion, setEntidadEdicion] = useState<EntidadRemision | null>(null);
  const [formEntidad, setFormEntidad] = useState({ nombre: '', correo: '' });
  const [erroresForm, setErroresForm] = useState({ nombre: '', correo: '' });

  // Cargar entidades desde el backend
  useEffect(() => {
    cargarEntidades();
  }, []);

  const cargarEntidades = async () => {
    try {
      setLoading(true);
      const data = await entidadesRemisionService.getAll();
      setEntidades(data);
    } catch (error) {
      console.error('Error al cargar entidades:', error);
      setEntidades(ENTIDADES_REMISION_DEFECTO);
    } finally {
      setLoading(false);
    }
  };

  const abrirModalNuevaEntidad = () => {
    setEntidadEdicion(null);
    setFormEntidad({ nombre: '', correo: '' });
    setErroresForm({ nombre: '', correo: '' });
    setShowModal(true);
  };

  const abrirModalEditarEntidad = (entidad: EntidadRemision) => {
    setEntidadEdicion(entidad);
    setFormEntidad({ nombre: entidad.nombre ?? '', correo: entidad.correo ?? '' });
    setErroresForm({ nombre: '', correo: '' });
    setShowModal(true);
  };

  const validarFormulario = (): boolean => {
    const errores = { nombre: '', correo: '' };
    let esValido = true;

    if (!formEntidad.nombre.trim()) {
      errores.nombre = 'El nombre de la entidad es obligatorio';
      esValido = false;
    } else if (formEntidad.nombre.trim().length < 3) {
      errores.nombre = 'El nombre debe tener al menos 3 caracteres';
      esValido = false;
    } else {
      const nombreDuplicado = entidades.some(e => 
        e.id !== entidadEdicion?.id && 
        e.nombre.toLowerCase().trim() === formEntidad.nombre.toLowerCase().trim()
      );
      if (nombreDuplicado) {
        errores.nombre = 'Ya existe una entidad con este nombre';
        esValido = false;
      }
    }

    if (!formEntidad.correo.trim()) {
      errores.correo = 'El correo electrónico es obligatorio';
      esValido = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formEntidad.correo)) {
        errores.correo = 'Correo electrónico inválido';
        esValido = false;
      }
    }

    setErroresForm(errores);
    return esValido;
  };

  const guardarEntidad = async () => {
    if (!validarFormulario()) {
      toast.error('Por favor corrige los errores del formulario');
      return;
    }

    try {
      if (entidadEdicion) {
        // Editar entidad existente
        const updated = await entidadesRemisionService.update(entidadEdicion.id, {
          nombre: formEntidad.nombre.trim(),
          correo: formEntidad.correo.trim(),
        });
        setEntidades(entidades.map(e => e.id === entidadEdicion.id ? updated : e));
        toast.success('Entidad actualizada correctamente');
      } else {
        // Crear nueva entidad
        const created = await entidadesRemisionService.create({
          nombre: formEntidad.nombre.trim(),
          correo: formEntidad.correo.trim(),
        });
        setEntidades([...entidades, created]);
        toast.success('Entidad agregada correctamente');
      }
    } catch (error: any) {
      console.error('Error al guardar entidad:', error);
      toast.error(error.message || 'Error al guardar la entidad');
    }

    setShowModal(false);
    setEntidadEdicion(null);
    setFormEntidad({ nombre: '', correo: '' });
  };

  const eliminarEntidad = async (entidad: EntidadRemision) => {
    if (window.confirm(`¿Estás seguro de eliminar la entidad "${entidad.nombre}"?`)) {
      try {
        await entidadesRemisionService.delete(entidad.id);
        setEntidades(entidades.filter(e => e.id !== entidad.id));
        toast.success('Entidad eliminada correctamente');
      } catch (error: any) {
        console.error('Error al eliminar entidad:', error);
        toast.error(error.message || 'Error al eliminar la entidad');
      }
    }
  };

  const actualizarEntidad = async (entidadId: string, activo: boolean) => {
    try {
      const updated = await entidadesRemisionService.toggleActivo(entidadId, activo);
      setEntidades(entidades.map(e => e.id === entidadId ? updated : e));
    } catch (error: any) {
      console.error('Error al cambiar estado:', error);
      toast.error(error.message || 'Error al cambiar el estado de la entidad');
    }
  };

  const guardarConfiguraciones = async () => {
    try {
      setSaving(true);
      // Guardar en localStorage como backup
      localStorage.setItem('disciplinario-entidades-remision', JSON.stringify(entidades));
      setCambiosPendientes(false);
      toast.success('Configuraciones guardadas correctamente');
    } catch (error) {
      console.error('❌ Error al guardar:', error);
      toast.error('Error al guardar configuraciones');
    } finally {
      setSaving(false);
    }
  };

  const restablecerDefecto = async () => {
    if (window.confirm('¿Está seguro de restablecer a valores por defecto?')) {
      try {
        // Intentar crear seed en el backend
        await entidadesRemisionService.seed();
        await cargarEntidades();
        toast.success('Configuraciones restablecidas');
      } catch (error) {
        // Si falla el backend, usar datos por defecto locales
        setEntidades(ENTIDADES_REMISION_DEFECTO);
        localStorage.setItem('disciplinario-entidades-remision', JSON.stringify(ENTIDADES_REMISION_DEFECTO));
        toast.success('Configuraciones restablecidas (modo local)');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Cargando entidades de remisión...</span>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header con acciones */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Entidades de Remisión por Competencia</h3>
          <p className="text-sm text-gray-600 mt-1">
            Configura las entidades externas para remitir noticias disciplinarias
          </p>
        </div>
        <div className="flex items-center gap-3">
          {cambiosPendientes && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
              <AlertCircle className="w-3 h-3 mr-1" />
              Sin guardar
            </span>
          )}
          {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIGURACIONES_RESET) && (
          <button
            onClick={restablecerDefecto}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Restablecer
          </button>
          )}
          {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIG_ENTIDADES_EDIT) && (
          <button
            onClick={guardarConfiguraciones}
            disabled={!cambiosPendientes || saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ 
              background: cambiosPendientes ? 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' : '#9CA3AF',
            }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar Cambios
          </button>
          )}
        </div>
      </div>

      {/* Botón agregar */}
      <div className="flex justify-end">
        {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIG_ENTIDADES_CREATE) && (
        <button
          onClick={abrirModalNuevaEntidad}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg"
          style={{ 
            background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
            boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
          }}
        >
          <Plus className="w-4 h-4" />
          Nueva Entidad
        </button>
        )}
      </div>

      {/* Lista de entidades */}
      <div className="space-y-3">
        {entidades.map((entidad) => (
          <div key={entidad.id} className="p-4 rounded-lg border-2 border-gray-200 bg-gradient-to-br from-purple-50 to-white hover:border-purple-300 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-sm font-bold text-gray-900 mb-1">{entidad.nombre}</h3>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Mail className="w-3 h-3 text-purple-600" />
                  <span>{entidad.correo}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIG_ENTIDADES_EDIT) && (
                <button
                  onClick={() => abrirModalEditarEntidad(entidad)}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Editar entidad"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                )}
                {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIG_ENTIDADES_DELETE) && (
                <button
                  onClick={() => eliminarEntidad(entidad)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Eliminar entidad"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={entidad.activo}
                  disabled={!authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIG_ENTIDADES_EDIT)}
                  onChange={(e) => actualizarEntidad(entidad.id, e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 disabled:opacity-50"
                />
                <span className="text-xs font-semibold text-gray-700">
                  {entidad.activo ? '✓ Activa (visible en modal)' : 'Inactiva (oculta en modal)'}
                </span>
              </label>
              <span className={`text-xs px-2 py-1 rounded-full font-semibold ${entidad.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {entidad.activo ? 'Activa' : 'Inactiva'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Nota informativa */}
      <div className="p-4 rounded-lg bg-purple-50 border-l-4 border-purple-500">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm purple-800">
              <span className="font-bold">Nota:</span> Estas entidades aparecerán en el menú desplegable del modal{' '}
              <span className="font-bold">"Remitir por Competencia"</span>. El correo se auto-completa al seleccionar la entidad.
            </p>
            <p className="text-xs text-purple-600 mt-1">
              Los cambios se guardan en el backend de forma persistente.
            </p>
          </div>
        </div>
      </div>

      {/* Modal para agregar/editar entidad */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-bold text-gray-900">
                {entidadEdicion ? 'Editar Entidad' : 'Nueva Entidad de Remisión'}
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
                  Nombre de la Entidad *
                </label>
                <input
                  type="text"
                  value={formEntidad.nombre}
                  onChange={(e) => setFormEntidad({ ...formEntidad, nombre: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    erroresForm.nombre ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  placeholder="Ej: Procuraduría General de la Nación"
                />
                {erroresForm.nombre && (
                  <p className="text-xs text-red-600 mt-1">{erroresForm.nombre}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  value={formEntidad.correo}
                  onChange={(e) => setFormEntidad({ ...formEntidad, correo: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    erroresForm.correo ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  placeholder="Ej: contacto@entidad.gov.co"
                />
                {erroresForm.correo && (
                  <p className="text-xs text-red-600 mt-1">{erroresForm.correo}</p>
                )}
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
                onClick={guardarEntidad}
                className="px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg"
                style={{ 
                  background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
                }}
              >
                {entidadEdicion ? 'Actualizar' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
