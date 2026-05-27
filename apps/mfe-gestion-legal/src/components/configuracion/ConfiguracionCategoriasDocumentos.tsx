import { useState } from 'react';
import { 
  FolderOpen, BookOpen, Shield, Mail, Stamp, Eye, Share2, Bell, File, 
  Plus, Edit, Trash2, CheckCircle, XCircle 
} from 'lucide-react';
import { useConfiguracionesSIGL, CategoriaDocumento } from '../config/ConfiguracionesSIGLContext';
import { toast } from 'sonner';

const ICON_OPTIONS = [
  { id: 'FolderOpen', name: 'Carpeta', icon: FolderOpen },
  { id: 'BookOpen', name: 'Libro', icon: BookOpen },
  { id: 'Shield', name: 'Escudo', icon: Shield },
  { id: 'Mail', name: 'Correo', icon: Mail },
  { id: 'Stamp', name: 'Sello', icon: Stamp },
  { id: 'Eye', name: 'Ojo', icon: Eye },
  { id: 'Share2', name: 'Compartir', icon: Share2 },
  { id: 'Bell', name: 'Campana', icon: Bell },
  { id: 'File', name: 'Archivo', icon: File },
];

export function ConfiguracionCategoriasDocumentos() {
  const { categoriasDocumentos, actualizarCategoriasDocumentos, setCambiosPendientes } = useConfiguracionesSIGL();
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCategoria, setCurrentCategoria] = useState<Partial<CategoriaDocumento>>({});

  const handleEdit = (cat: CategoriaDocumento) => {
    setCurrentCategoria(cat);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleAdd = () => {
    setCurrentCategoria({
      id: `cat-${Date.now()}`,
      nombre: '',
      icono: 'File',
      color: '#003DA5',
      activo: true,
      orden: categoriasDocumentos.length + 1
    });
    setIsEditing(false);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!currentCategoria.nombre) {
      toast.error('El nombre es obligatorio');
      return;
    }

    if (isEditing) {
      actualizarCategoriasDocumentos(categoriasDocumentos.map(c => 
        c.id === currentCategoria.id ? currentCategoria as CategoriaDocumento : c
      ));
      toast.success('Categoría actualizada');
    } else {
      actualizarCategoriasDocumentos([...categoriasDocumentos, currentCategoria as CategoriaDocumento]);
      toast.success('Categoría creada');
    }
    
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    actualizarCategoriasDocumentos(categoriasDocumentos.filter(c => c.id !== id));
    toast.success('Categoría eliminada');
  };

  const renderIcon = (iconStr: string, color: string) => {
    const option = ICON_OPTIONS.find(o => o.id === iconStr);
    const IconComponent = option ? option.icon : File;
    return <IconComponent className="w-5 h-5" style={{ color }} />;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-blue-600" />
            Categorías de Documentos
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Administra las categorías de clasificación de los documentos en los expedientes.
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva Categoría
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
            <tr>
              <th className="px-6 py-3">Ícono & Color</th>
              <th className="px-6 py-3">Nombre</th>
              <th className="px-6 py-3">ID Interno</th>
              <th className="px-6 py-3 text-center">Estado</th>
              <th className="px-6 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {categoriasDocumentos.sort((a, b) => a.orden - b.orden).map((cat) => (
              <tr key={cat.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center border border-gray-200">
                      {renderIcon(cat.icono, cat.color)}
                    </div>
                    <span className="text-xs text-gray-500">{cat.color}</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-medium text-gray-900">{cat.nombre}</td>
                <td className="px-6 py-4 text-gray-500">
                  <span className="bg-gray-100 px-2 py-1 rounded text-xs">{cat.id}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  {cat.activo ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3" /> Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      <XCircle className="w-3 h-3" /> Inactivo
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleEdit(cat)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar categoría"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if(confirm(`¿Estás seguro de eliminar la categoría ${cat.nombre}?`)) {
                          handleDelete(cat.id);
                        }
                      }}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar categoría"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Creación/Edición */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">
                {isEditing ? 'Editar Categoría' : 'Nueva Categoría'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={currentCategoria.nombre || ''}
                  onChange={e => setCurrentCategoria({...currentCategoria, nombre: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Ej. Autos"
                />
              </div>

              {!isEditing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID Interno (sin espacios)</label>
                  <input
                    type="text"
                    value={currentCategoria.id || ''}
                    onChange={e => setCurrentCategoria({...currentCategoria, id: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color (Hex)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={currentCategoria.color || '#000000'}
                      onChange={e => setCurrentCategoria({...currentCategoria, color: e.target.value})}
                      className="w-10 h-10 p-1 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={currentCategoria.color || '#000000'}
                      onChange={e => setCurrentCategoria({...currentCategoria, color: e.target.value})}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ícono</label>
                  <div className="relative">
                    <select
                      value={currentCategoria.icono || 'File'}
                      onChange={e => setCurrentCategoria({...currentCategoria, icono: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                    >
                      {ICON_OPTIONS.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                      ))}
                    </select>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      {renderIcon(currentCategoria.icono || 'File', currentCategoria.color || '#6B7280')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="cat-activo"
                  checked={currentCategoria.activo}
                  onChange={e => setCurrentCategoria({...currentCategoria, activo: e.target.checked})}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <label htmlFor="cat-activo" className="text-sm text-gray-700 cursor-pointer">
                  Categoría Activa
                </label>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/50">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
