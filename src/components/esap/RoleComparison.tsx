import { X, Check, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Role {
  id: string;
  name: string;
  permissions: string[];
}

interface RoleComparisonProps {
  roles: Role[];
  allPermissions: string[];
  onClose: () => void;
}

export function RoleComparison({ roles, allPermissions, onClose }: RoleComparisonProps) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-[--esap-gray-200] bg-gradient-to-b from-[--esap-gray-50] to-white">
            <div>
              <h2 className="text-xl font-bold text-[--esap-gray-900]">
                Comparación de Roles
              </h2>
              <p className="text-sm text-[--esap-gray-600] mt-1">
                Compara permisos entre {roles.length} roles
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[--esap-gray-100] rounded-lg transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5 text-[--esap-gray-600]" />
            </button>
          </div>

          {/* Comparison table */}
          <div className="overflow-auto max-h-[calc(90vh-120px)]">
            <table className="w-full">
              <thead className="sticky top-0 bg-white border-b border-[--esap-gray-200] z-10">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-bold text-[--esap-gray-900] bg-[--esap-gray-50]">
                    Permiso
                  </th>
                  {roles.map((role) => (
                    <th
                      key={role.id}
                      className="text-center px-4 py-4 text-sm font-bold text-[--esap-gray-900] bg-[--esap-gray-50]"
                    >
                      {role.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allPermissions.map((permission, index) => {
                  const allHave = roles.every((role) => role.permissions.includes(permission));
                  const noneHave = roles.every((role) => !role.permissions.includes(permission));

                  return (
                    <tr
                      key={permission}
                      className={`border-b border-[--esap-gray-100] hover:bg-[--esap-gray-50] transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-[--esap-gray-50]/50'
                      }`}
                    >
                      <td className="px-6 py-3 text-sm text-[--esap-gray-900]">
                        <div className="flex items-center gap-2">
                          {allHave && (
                            <div className="w-2 h-2 bg-[--esap-success] rounded-full" />
                          )}
                          {noneHave && (
                            <div className="w-2 h-2 bg-[--esap-gray-300] rounded-full" />
                          )}
                          {!allHave && !noneHave && (
                            <div className="w-2 h-2 bg-[--esap-warning] rounded-full" />
                          )}
                          <span className="font-medium">{permission}</span>
                        </div>
                      </td>
                      {roles.map((role) => {
                        const hasPermission = role.permissions.includes(permission);
                        return (
                          <td key={role.id} className="px-4 py-3 text-center">
                            {hasPermission ? (
                              <div className="inline-flex items-center justify-center w-6 h-6 bg-[--esap-success]/10 rounded-full">
                                <Check className="w-4 h-4 text-[--esap-success]" strokeWidth={2.5} />
                              </div>
                            ) : (
                              <div className="inline-flex items-center justify-center w-6 h-6 bg-[--esap-gray-100] rounded-full">
                                <Minus className="w-4 h-4 text-[--esap-gray-400]" strokeWidth={2.5} />
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[--esap-gray-200] bg-[--esap-gray-50] flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[--esap-success] rounded-full" />
                <span className="text-[--esap-gray-600]">Todos tienen</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[--esap-warning] rounded-full" />
                <span className="text-[--esap-gray-600]">Algunos tienen</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[--esap-gray-300] rounded-full" />
                <span className="text-[--esap-gray-600]">Ninguno tiene</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[--esap-primary] text-white rounded-lg font-semibold hover:bg-[--esap-primary-dark] transition-colors"
            >
              Cerrar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
