import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  RefreshCw,
  Shield,
  ShieldAlert,
  Save,
  X,
  Sparkles,
  Layout,
  Filter,
  Check,
  AlertTriangle,
  Users,
  UserPlus,
  Rows4
} from 'lucide-react';
import { modulesService, type ModuleWithPermissions, type UpdateModuleDto } from '../../services/api/modules.service';
import { ResponsiveHeader } from '@esap-mfe/shared-ui';
import { toast } from 'sonner';

interface ModulesManagementProps {
  onModuleUpdated?: () => void;
  userRoles?: string[];
}

export const ModulesManagementModulePremium: React.FC<ModulesManagementProps> = ({
  onModuleUpdated,
  userRoles = []
}) => {
  const [modules, setModules] = useState<ModuleWithPermissions[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'backoffice' | 'portal'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal de Edición
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [selectedModule, setSelectedModule] = useState<ModuleWithPermissions | null>(null);
  const [formData, setFormData] = useState<UpdateModuleDto>({
    name: '',
    description: '',
    category: 'backoffice',
    display_order: 0,
    icon: 'Shield',
    color: '#003DA5',
    is_active: true
  });

  // Notificaciones Toast
  // const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isSuperAdmin = useMemo(() => {
    return userRoles.map(r => r.toUpperCase()).includes('SUPER_ADMIN');
  }, [userRoles]);

  // const showToast = (type: 'success' | 'error', text: string) => {
  //   setToast({ type, text });
  //   setTimeout(() => setToast(null), 4000);
  // };

  const fetchModules = async () => {
    setLoading(true);
    try {
      const data = await modulesService.getModulesWithPermissions({ include_permissions: false });
      setModules(data || []);
    } catch (error) {
      console.error('Error al cargar módulos:', error);
      // showToast('error', 'Error al cargar los módulos desde la base de datos.');
      toast.error('Error al cargar los módulos desde la base de datos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  // Módulos filtrados
  const filteredModules = useMemo(() => {
    return modules.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.description || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = categoryFilter === 'all' || m.category === categoryFilter;

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && m.is_active) ||
        (statusFilter === 'inactive' && !m.is_active);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [modules, searchTerm, categoryFilter, statusFilter]);

  // Estadísticas
  const stats = useMemo(() => {
    const total = modules.length;
    const active = modules.filter(m => m.is_active).length;
    const inactive = total - active;
    const backoffice = modules.filter(m => m.category === 'backoffice').length;
    const portal = modules.filter(m => m.category === 'portal').length;
    return { total, active, inactive, backoffice, portal };
  }, [modules]);

  // Abrir Modal de Edición
  const handleOpenEditModal = (mod: ModuleWithPermissions) => {
    setSelectedModule(mod);
    setFormData({
      name: mod.name,
      description: mod.description || '',
      category: (mod.category as 'backoffice' | 'portal') || 'backoffice',
      display_order: mod.display_order || 0,
      icon: mod.icon || 'Shield',
      color: mod.color || '#003DA5',
      is_active: mod.is_active
    });
    setIsEditModalOpen(true);
  };

  // Toggle directo de is_active
  const handleToggleActive = async (mod: ModuleWithPermissions) => {
    if (togglingId) return;
    setTogglingId(mod.id);
    const newStatus = !mod.is_active;

    try {
      await modulesService.updateModule(mod.id, { is_active: newStatus });
      setModules(prev =>
        prev.map(m => (m.id === mod.id ? { ...m, is_active: newStatus } : m))
      );
      toast.success(`Módulo "${mod.name}" ${newStatus ? 'activado' : 'desactivado'} exitosamente en la BD.`);
      if (onModuleUpdated) onModuleUpdated();
    } catch (error: any) {
      console.error('Error al actualizar estado del módulo:', error);
      const msg = error?.response?.status === 403 || error?.status === 403
        ? 'No tienes permisos de SUPER_ADMIN para modificar la configuración de los módulos.'
        : 'Ocurrió un error al intentar actualizar el estado del módulo.';
      toast.error(msg);  
    } finally {
      setTogglingId(null);
    }
  };

  // Guardar formulario modal
  const handleSaveModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModule) return;

    setSaving(true);
    try {
      const updated = await modulesService.updateModule(selectedModule.id, formData);
      setModules(prev =>
        prev.map(m => (m.id === selectedModule.id ? { ...m, ...updated } : m))
      );
      toast.success(`Módulo "${formData.name}" actualizado correctamente.`);
      setIsEditModalOpen(false);
      if (onModuleUpdated) onModuleUpdated();
    } catch (error: any) {
      console.error('Error al actualizar módulo:', error);
      const msg = error?.response?.status === 403 || error?.status === 403
        ? 'No tienes permisos de SUPER_ADMIN para ejecutar esta acción.'
        : 'Ocurrió un error al guardar los cambios del módulo.';
      toast.error(msg);  
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 space-y-6">

      {/* Header Banner */}
      <ResponsiveHeader
        key="header"
        title="Gestión de Módulos"
        description="Configura títulos, descripciones, orden y estado de activación para sincronizar directamente el menú con la BD."
        icon={Rows4}
        secondaryActions={[
          {
            label: "Recargar",
            icon: RefreshCw,
            onClick: () => fetchModules(),
            variant: "secondary"
          }
        ]}
      />

      {/* Tarjetas de Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Activos</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Inactivos</p>
            <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
            <Layout className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Backoffice</p>
            <p className="text-2xl font-bold text-indigo-700">{stats.backoffice}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-700 rounded-xl">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Portal</p>
            <p className="text-2xl font-bold text-purple-700">{stats.portal}</p>
          </div>
        </div>
      </div>

      {/* Filtros de Búsqueda */}
      <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Input búsqueda */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre o descripción..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Dropdowns de filtro */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500">Categoría:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">Todas</option>
              <option value="backoffice">Backoffice</option>
              <option value="portal">Portal</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Estado:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de Módulos */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
            <p className="text-sm font-medium">Cargando módulos de la base de datos...</p>
          </div>
        ) : filteredModules.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <Layers className="w-10 h-10 mx-auto text-gray-300" />
            <p className="text-base font-semibold text-gray-700">No se encontraron módulos</p>
            <p className="text-xs text-gray-500">Prueba cambiando los parámetros de búsqueda o los filtros seleccionados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm py-2">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Módulo / Nombre</th>
                  <th className="py-3.5 px-4">Descripción en Sidebar</th>
                  {/* <th className="py-3.5 px-4 text-center">Categoría</th> */}
                  {/* <th className="py-3.5 px-4 text-center">Orden</th> */}
                  <th className="py-3.5 px-4 text-center">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredModules.map((mod) => (
                  <tr key={mod.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-md"
                          style={{ backgroundColor: mod.color || '#003DA5' }}
                        >
                          {mod.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 leading-tight">{mod.name}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 max-w-xs">
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {mod.description || <span className="italic text-gray-400">Sin descripción</span>}
                      </p>
                    </td>

                    {/* <td className="py-4 px-4 text-center">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                        mod.category === 'backoffice'
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : 'bg-purple-100 text-purple-700 border border-purple-200'
                      }`}>
                        {mod.category}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-center font-mono font-medium text-gray-700">
                      {mod.display_order}
                    </td> */}

                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(mod)}
                        disabled={togglingId === mod.id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all shadow-sm ${
                          mod.is_active
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                            : 'bg-red-100 text-red-800 hover:bg-red-200 border border-red-300'
                        }`}
                      >
                        {togglingId === mod.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : mod.is_active ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-600" />
                        )}
                        <span>{mod.is_active ? 'Activo' : 'Inactivo'}</span>
                      </button>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => handleOpenEditModal(mod)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-all border border-blue-200 active:scale-95"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Edición */}
      {isEditModalOpen && selectedModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header Modal */}
            <div className="bg-gradient-to-r from-[#003DA5] to-[#1e5da8] px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-200" />
                <h3 className="font-bold text-lg">Editar Módulo</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSaveModule} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div style={{display: "none"}}>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Código (Identificador único)
                </label>
                <input
                  type="text"
                  disabled
                  value={selectedModule.code}
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl text-sm font-mono text-gray-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Nombre del Módulo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej. Gestión de Personas"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Descripción en Sidebar <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ej. Administración masiva de usuarios y roles"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div style={{display: "none"}}>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Categoría
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    <option value="backoffice">backoffice</option>
                    <option value="portal">portal</option>
                  </select>
                </div>

                <div style={{display: "none"}}>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Orden (display_order)
                  </label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div style={{display: "none"}}>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Icono Lucide
                  </label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                  />
                </div>

                <div style={{display: "none"}}>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Color Hex
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.color || '#003DA5'}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-9 h-9 p-0 border border-gray-300 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-100/80 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-800 block">Módulo Activo en el Sistema</span>
                    <span className="text-[11px] text-gray-500 block">Si está inactivo, el módulo no se mostrará en el Sidebar.</span>
                  </div>
                </label>
              </div>

              {/* Botones del Modal */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 bg-[#003DA5] hover:bg-[#1e5da8] text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50"
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
