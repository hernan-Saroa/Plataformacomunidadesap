/**
 * CONFIGURACIÓN DE CONDUCTAS DISCIPLINARIAS
 * Gestión completa del catálogo parametrizable de conductas indisciplinarias
 * Permite crear, editar, eliminar y reordenar conductas
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  GripVertical,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Card } from '@esap-mfe/shared-ui/card';
import { toast } from 'sonner';

// API
import { disciplinaryService, DisciplinaryBehavior } from '../../../../shell/src/services/api/disciplinary.service';
import { authService } from '../../../../services/api/authService';
import { Permissions } from '@esap-mfe/shared-types/permissions';
import { Dialog, DialogContent } from '@esap-mfe/shared-ui/dialog';

// Tipos locales
interface ConductaFormData {
  id?: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  estado: boolean;
  orden: number;
}

export function ConfiguracionConductasDisciplinarias() {
  const [conductas, setConductas] = useState<DisciplinaryBehavior[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Estados para el modal de creación/edición
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoConducta, setEditandoConducta] = useState<DisciplinaryBehavior | null>(null);
  const [formData, setFormData] = useState<ConductaFormData>({
    codigo: '',
    nombre: '',
    descripcion: '',
    estado: true,
    orden: 0,
  });

  // Estados para validación
  const [errores, setErrores] = useState<Record<string, string>>({});

  // Cargar conductas al montar el componente
  useEffect(() => {
    cargarConductas();
  }, []);

  const cargarConductas = async () => {
    try {
      setLoading(true);
      const data = await disciplinaryService.getAllDisciplinaryBehaviors();
      setConductas(data);
    } catch (error) {
      console.error('Error cargando conductas:', error);
      toast.error('Error al cargar las conductas disciplinarias');
    } finally {
      setLoading(false);
    }
  };

  const validarFormulario = (): boolean => {
    const nuevosErrores: Record<string, string> = {};

    if (!formData.codigo.trim()) {
      nuevosErrores.codigo = 'El código es obligatorio';
    } else if (formData.codigo.length > 50) {
      nuevosErrores.codigo = 'El código no puede tener más de 50 caracteres';
    }

    if (!formData.nombre.trim()) {
      nuevosErrores.nombre = 'El nombre es obligatorio';
    } else if (formData.nombre.length > 255) {
      nuevosErrores.nombre = 'El nombre no puede tener más de 255 caracteres';
    }

    // Verificar unicidad del código (solo si es nuevo o cambió)
    if (formData.codigo && (!editandoConducta || editandoConducta.codigo !== formData.codigo)) {
      const existeCodigo = conductas.some(c =>
        c.codigo.toLowerCase() === formData.codigo.toLowerCase() && c.id !== editandoConducta?.id
      );
      if (existeCodigo) {
        nuevosErrores.codigo = 'Ya existe una conducta con este código';
      }
    }

    // Verificar unicidad del nombre (solo si es nuevo o cambió)
    if (formData.nombre && (!editandoConducta || editandoConducta.nombre !== formData.nombre)) {
      const existeNombre = conductas.some(c =>
        c.nombre.toLowerCase() === formData.nombre.toLowerCase() && c.id !== editandoConducta?.id
      );
      if (existeNombre) {
        nuevosErrores.nombre = 'Ya existe una conducta con este nombre';
      }
    }

    if (formData.orden < 0) {
      nuevosErrores.orden = 'El orden debe ser mayor o igual a 0';
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const abrirModalCrear = () => {
    setEditandoConducta(null);
    setFormData({
      codigo: '',
      nombre: '',
      descripcion: '',
      estado: true,
      orden: conductas.length + 1,
    });
    setErrores({});
    setModalAbierto(true);
  };

  const abrirModalEditar = (conducta: DisciplinaryBehavior) => {
    setEditandoConducta(conducta);
    setFormData({
      id: conducta.id,
      codigo: conducta.codigo,
      nombre: conducta.nombre,
      descripcion: conducta.descripcion || '',
      estado: conducta.estado,
      orden: conducta.orden,
    });
    setErrores({});
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setEditandoConducta(null);
    setFormData({
      codigo: '',
      nombre: '',
      descripcion: '',
      estado: true,
      orden: 0,
    });
    setErrores({});
  };

  const guardarConducta = async () => {
    if (!validarFormulario()) {
      return;
    }

    try {
      setGuardando(true);

      const payload = {
        codigo: formData.codigo.toUpperCase(),
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim(),
        estado: formData.estado,
        orden: formData.orden,
      };

      if (editandoConducta) {
        // Actualizar
        await disciplinaryService.updateDisciplinaryBehavior(editandoConducta.id, payload);
        toast.success('Conducta actualizada exitosamente');
      } else {
        // Crear
        await disciplinaryService.createDisciplinaryBehavior(payload);
        toast.success('Conducta creada exitosamente');
      }

      // Recargar conductas
      await cargarConductas();
      cerrarModal();

    } catch (error: any) {
      console.error('Error guardando conducta:', error);

      if (error.response?.status === 409) {
        toast.error('Ya existe una conducta con el mismo código o nombre');
      } else {
        toast.error(editandoConducta ? 'Error al actualizar la conducta' : 'Error al crear la conducta');
      }
    } finally {
      setGuardando(false);
    }
  };

  const eliminarConducta = async (conducta: DisciplinaryBehavior) => {
    if (!confirm(`¿Está seguro de eliminar la conducta "${conducta.nombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await disciplinaryService.deleteDisciplinaryBehavior(conducta.id);
      toast.success('Conducta eliminada exitosamente');
      await cargarConductas();
    } catch (error) {
      console.error('Error eliminando conducta:', error);
      toast.error('Error al eliminar la conducta');
    }
  };

  const toggleEstadoConducta = async (conducta: DisciplinaryBehavior) => {
    try {
      await disciplinaryService.toggleDisciplinaryBehaviorStatus(conducta.id);
      toast.success(conducta.estado ? 'Conducta desactivada' : 'Conducta activada');
      await cargarConductas();
    } catch (error) {
      console.error('Error cambiando estado:', error);
      toast.error('Error al cambiar el estado de la conducta');
    }
  };

  const reordenarConductas = async (idsOrdenados: string[]) => {
    try {
      await disciplinaryService.reorderDisciplinaryBehaviors(idsOrdenados);
      await cargarConductas();
    } catch (error) {
      console.error('Error reordenando conductas:', error);
      toast.error('Error al reordenar las conductas');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e5da8]"></div>
        <span className="ml-3 text-gray-600">Cargando conductas...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="w-6 h-6 text-red-600" />
            Conductas Disciplinarias
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Gestiona el catálogo de conductas presuntamente indisciplinarias
          </p>
        </div>

        {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIGURACIONES_CONDUCTAS_CREATE) && (
        <button
          onClick={abrirModalCrear}
          className="flex items-center gap-2 px-4 py-2 bg-[#1e5da8] text-white rounded-lg hover:bg-[#1e5da8]/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva Conducta
        </button>
        )}
      </div>

      {/* Lista de conductas */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {conductas.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No hay conductas configuradas</h4>
            <p className="text-gray-600 mb-4">Comienza creando tu primera conducta disciplinaria</p>
            {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIGURACIONES_CONDUCTAS_CREATE) && (
            <button
              onClick={abrirModalCrear}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#1e5da8] text-white rounded-lg hover:bg-[#1e5da8]/90"
            >
              <Plus className="w-4 h-4" />
              Crear Primera Conducta
            </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {conductas.map((conducta, index) => (
              <div key={conducta.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Orden y drag handle */}
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                      <span className="text-sm font-medium text-gray-500 w-8">
                        {conducta.orden}
                      </span>
                    </div>

                    {/* Información principal */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">{conducta.nombre}</h4>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                          {conducta.codigo}
                        </span>
                        {!conducta.estado && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                            Inactiva
                          </span>
                        )}
                      </div>
                      {conducta.descripcion && (
                        <p className="text-sm text-gray-600 mt-1">{conducta.descripcion}</p>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2">
                    {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIGURACIONES_CONDUCTAS_EDIT) && (
                      <button
                        onClick={() => toggleEstadoConducta(conducta)}
                        className={`p-2 rounded-lg transition-colors ${
                          conducta.estado
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-gray-400 hover:bg-gray-50'
                        }`}
                        title={conducta.estado ? 'Desactivar conducta' : 'Activar conducta'}
                      >
                        {conducta.estado ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    )}

                    {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIGURACIONES_CONDUCTAS_EDIT) && (
                      <button
                        onClick={() => abrirModalEditar(conducta)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar conducta"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}

                    {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIGURACIONES_CONDUCTAS_DELETE) && (
                      <button
                        onClick={() => eliminarConducta(conducta)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar conducta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {conductas.filter(c => c.estado).length}
              </p>
              <p className="text-sm text-gray-600">Conductas Activas</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <EyeOff className="w-8 h-8 text-gray-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {conductas.filter(c => !c.estado).length}
              </p>
              <p className="text-sm text-gray-600">Conductas Inactivas</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-[#1e5da8]" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{conductas.length}</p>
              <p className="text-sm text-gray-600">Total Conductas</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Modal de creación/edición */}
      {modalAbierto && (
        <Dialog open={modalAbierto} onOpenChange={cerrarModal}>
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {editandoConducta ? 'Editar Conducta' : 'Nueva Conducta'}
                </h3>
                {/* <button
                  onClick={cerrarModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button> */}
              </div>

              <div className="space-y-4">
                {/* Código */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código *
                  </label>
                  <input
                    type="text"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errores.codigo ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="ABANDONO_CARGO"
                  />
                  {errores.codigo && (
                    <p className="text-sm text-red-600 mt-1">{errores.codigo}</p>
                  )}
                </div>

                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errores.nombre ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Abandono del cargo"
                  />
                  {errores.nombre && (
                    <p className="text-sm text-red-600 mt-1">{errores.nombre}</p>
                  )}
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Descripción detallada de la conducta..."
                  />
                </div>

                {/* Orden */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Orden de visualización
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.orden}
                    onChange={(e) => setFormData({ ...formData, orden: parseInt(e.target.value) || 0 })}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errores.orden ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errores.orden && (
                    <p className="text-sm text-red-600 mt-1">{errores.orden}</p>
                  )}
                </div>

                {/* Estado */}
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Conducta activa</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                <button
                  onClick={cerrarModal}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarConducta}
                  disabled={guardando}
                  className="px-4 py-2 bg-[#1e5da8] text-white rounded-lg hover:bg-[#1e5da8]/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {guardando ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {editandoConducta ? 'Actualizar' : 'Crear'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}