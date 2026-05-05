import { motion, AnimatePresence } from 'motion/react';
import { X, Users, Check, Loader2 } from 'lucide-react';
import { Badge } from '@esap-mfe/shared-ui/badge';

interface AssignRolesModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  roles: Array<{
    id: string;
    name: string;
    description?: string;
    color: string;
    type: string;
    code: string;
  }>;
  selectedRoleIds: Set<string>;
  onToggleRole: (roleId: string) => void;
  onSave: () => void;
  loading?: boolean;
  saving?: boolean;
}

export function AssignRolesModal({
  isOpen,
  onClose,
  user,
  roles,
  selectedRoleIds,
  onToggleRole,
  onSave,
  loading = false,
  saving = false
}: AssignRolesModalProps) {
  if (!isOpen) return null;

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
                <Users className="w-6 h-6" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">Asignar Roles</h2>
                <p className="text-sm text-white/80 mt-0.5">{user?.firstName} {user?.lastName}</p>
                <p className="text-sm text-white/80 mt-0.5">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
              <span>Roles seleccionados: {selectedRoleIds.size}</span>
              <span>Total disponibles: {roles.length}</span>
            </div>

            <div className="border border-gray-200 rounded-xl max-h-[50vh] overflow-y-auto">
              {loading ? (
                <div className="py-8 text-center text-sm text-gray-500">
                  <Loader2 className="w-5 h-5 inline-block mr-2 animate-spin" />
                  Cargando roles...
                </div>
              ) : (
                roles.map((role) => {
                  const selected = selectedRoleIds.has(role.id);
                  const isSuperAdmin = role.code === 'SUPER_ADMIN';
                  if (isSuperAdmin) {
                    return null;
                  }
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => onToggleRole(role.id)}
                      className="w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 flex items-start gap-3"
                    >
                      <span
                        className={`mt-1 flex h-5 w-5 items-center justify-center rounded-md border ${
                          selected ? 'bg-[#003DA5] border-[#003DA5]' : 'bg-white border-gray-300'
                        }`}
                      >
                        {selected && <Check className="w-3.5 h-3.5 text-white" />}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: role.color }}
                          />
                          <span className="font-semibold text-sm text-gray-900">{role.name}</span>
                          <Badge className="bg-gray-100 text-gray-700 border-gray-200 text-[10px] uppercase">
                            {role.type}
                          </Badge>
                        </div>
                        {role.description && (
                          <p className="text-xs text-gray-500 mt-1">
                            {role.description}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving || loading}
              className="px-4 py-2 rounded-lg bg-[#003DA5] text-white font-semibold hover:bg-[#002D7A] disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Guardar Roles'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
