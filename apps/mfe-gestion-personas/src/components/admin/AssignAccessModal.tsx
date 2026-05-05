import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Shield, 
  CheckCircle,
  AlertCircle,
  Key,
  Lock,
  Unlock,
  Star
} from 'lucide-react';
import { toast } from 'sonner';

interface AssignAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onAssign: (userId: string, accesses: string[]) => void;
}

export function AssignAccessModal({ isOpen, onClose, user, onAssign }: AssignAccessModalProps) {
  const [selectedAccesses, setSelectedAccesses] = useState<string[]>([]);

  // Lista de accesos disponibles del sistema
  const availableAccesses = [
    {
      id: 'dashboard',
      name: 'Dashboard Ejecutivo',
      description: 'Ver estadísticas y métricas generales',
      icon: Shield,
      color: '#003DA5',
      category: 'Visualización'
    },
    {
      id: 'users_view',
      name: 'Ver Usuarios',
      description: 'Consultar lista de usuarios',
      icon: Lock,
      color: '#6B7280',
      category: 'Usuarios'
    },
    {
      id: 'users_edit',
      name: 'Editar Usuarios',
      description: 'Modificar información de usuarios',
      icon: Unlock,
      color: '#10B981',
      category: 'Usuarios'
    },
    {
      id: 'users_delete',
      name: 'Eliminar Usuarios',
      description: 'Eliminar usuarios del sistema',
      icon: AlertCircle,
      color: '#EF4444',
      category: 'Usuarios'
    },
    {
      id: 'certificates_view',
      name: 'Ver Certificados',
      description: 'Consultar certificados laborales',
      icon: Shield,
      color: '#8B5CF6',
      category: 'Certificados'
    },
    {
      id: 'certificates_generate',
      name: 'Generar Certificados',
      description: 'Crear nuevos certificados laborales',
      icon: Key,
      color: '#8B5CF6',
      category: 'Certificados'
    },
    {
      id: 'audit_view',
      name: 'Ver Auditoría',
      description: 'Consultar logs de auditoría',
      icon: Shield,
      color: '#F59E0B',
      category: 'Auditoría'
    },
    {
      id: 'roles_manage',
      name: 'Gestionar Roles',
      description: 'Administrar roles y permisos',
      icon: Star,
      color: '#F59E0B',
      category: 'Roles'
    }
  ];

  const toggleAccess = (accessId: string) => {
    setSelectedAccesses(prev => 
      prev.includes(accessId) 
        ? prev.filter(id => id !== accessId)
        : [...prev, accessId]
    );
  };

  const handleSubmit = () => {
    if (selectedAccesses.length === 0) {
      toast.error('Selecciona al menos un acceso', {
        description: 'Debes asignar al menos un permiso al usuario.'
      });
      return;
    }

    onAssign(user.id, selectedAccesses);
    toast.success('Accesos Asignados', {
      description: `Se asignaron ${selectedAccesses.length} permisos a ${user.firstName} ${user.lastName}`
    });
    onClose();
  };

  if (!isOpen) return null;

  // Agrupar accesos por categoría
  const categories = Array.from(new Set(availableAccesses.map(a => a.category)));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="relative px-6 py-5 bg-[#003DA5]">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white">
                <Star className="w-6 h-6" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">
                  Asignar Accesos
                </h2>
                <p className="text-sm text-white/80 mt-0.5">
                  {user?.firstName} {user?.lastName}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto bg-white">
            <div className="mb-6">
              <p className="text-sm text-gray-600">
                Selecciona los permisos que deseas asignar a este usuario. 
                Los permisos determinan qué acciones puede realizar en el sistema.
              </p>
            </div>

            {/* Accesos por categoría */}
            <div className="space-y-6">
              {categories.map(category => (
                <div key={category}>
                  <h3 className="text-sm font-bold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                    {category}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {availableAccesses
                      .filter(access => access.category === category)
                      .map(access => {
                        const Icon = access.icon;
                        const isSelected = selectedAccesses.includes(access.id);
                        
                        return (
                          <button
                            key={access.id}
                            onClick={() => toggleAccess(access.id)}
                            className={`p-4 border-2 rounded-xl transition-all text-left ${
                              isSelected
                                ? 'border-[#003DA5] bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div 
                                className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  isSelected ? 'bg-[#003DA5]' : 'bg-gray-100'
                                }`}
                              >
                                <Icon 
                                  className="w-5 h-5" 
                                  style={{ color: isSelected ? '#FFFFFF' : access.color }}
                                  strokeWidth={2}
                                />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <p className={`font-bold text-sm ${
                                    isSelected ? 'text-[#003DA5]' : 'text-gray-900'
                                  }`}>
                                    {access.name}
                                  </p>
                                  {isSelected && (
                                    <CheckCircle className="w-5 h-5 text-[#003DA5]" strokeWidth={2.5} />
                                  )}
                                </div>
                                <p className="text-xs text-gray-600">
                                  {access.description}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>

            {/* Resumen de selección */}
            {selectedAccesses.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl"
              >
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-[#003DA5]" strokeWidth={2} />
                  <p className="font-bold text-sm text-[#003DA5]">
                    {selectedAccesses.length} {selectedAccesses.length === 1 ? 'permiso seleccionado' : 'permisos seleccionados'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedAccesses.map(id => {
                    const access = availableAccesses.find(a => a.id === id);
                    return (
                      <span 
                        key={id}
                        className="px-2.5 py-1 bg-white border border-blue-300 rounded-lg text-xs font-semibold text-[#003DA5]"
                      >
                        {access?.name}
                      </span>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-300 bg-white text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>

            <button
              onClick={handleSubmit}
              disabled={selectedAccesses.length === 0}
              className={`px-5 py-2.5 rounded-lg font-bold transition-colors flex items-center gap-2 ${
                selectedAccesses.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-[#003DA5] text-white hover:bg-[#002d7a]'
              }`}
            >
              <Star className="w-4 h-4" strokeWidth={2.5} />
              Asignar {selectedAccesses.length > 0 && `(${selectedAccesses.length})`}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
