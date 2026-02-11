import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  Check,
  X,
  Search,
  Save,
  RotateCcw,
  CheckCircle,
  Circle,
  MinusCircle
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// Importar configuración centralizada de permisos
import { PERMISSION_MODULES, PERMISSIONS_STATS } from '../../data/permissions-config-updated';
import type { Permission, PermissionModule } from '../../data/permissions-config-updated';

interface SystemRole {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string;
  color: string;
}

interface RolePermissionsEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: SystemRole;
}

export function RolePermissionsEditor({ 
  open, 
  onOpenChange,
  role 
}: RolePermissionsEditorProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Toggle permission
  const togglePermission = (permissionId: string) => {
    const newPermissions = new Set(selectedPermissions);
    if (newPermissions.has(permissionId)) {
      newPermissions.delete(permissionId);
    } else {
      newPermissions.add(permissionId);
    }
    setSelectedPermissions(newPermissions);
    setHasChanges(true);
  };

  // Toggle all permissions in module
  const toggleModulePermissions = (modulePermissions: Permission[]) => {
    const modulePermissionIds = modulePermissions.map(p => p.id);
    const allSelected = modulePermissionIds.every(id => selectedPermissions.has(id));
    
    const newPermissions = new Set(selectedPermissions);
    if (allSelected) {
      modulePermissionIds.forEach(id => newPermissions.delete(id));
    } else {
      modulePermissionIds.forEach(id => newPermissions.add(id));
    }
    setSelectedPermissions(newPermissions);
    setHasChanges(true);
  };

  // Save permissions
  const handleSave = () => {
    // Aquí iría la llamada al API
    toast.success('Permisos Guardados', {
      description: `Se actualizaron ${selectedPermissions.size} permisos para el rol "${role.nombre}"`
    });
    setHasChanges(false);
  };

  // Reset permissions
  const handleReset = () => {
    setSelectedPermissions(new Set());
    setHasChanges(true);
  };

  // Filter modules
  const filteredModules = PERMISSION_MODULES.filter(module =>
    module.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    module.permissions.some(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const totalPermissions = PERMISSION_MODULES.reduce((acc, m) => acc + m.permissions.length, 0);
  const selectedCount = selectedPermissions.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold text-[--esap-gray-900] flex items-center gap-3">
            <Shield className="w-7 h-7" style={{ color: role.color }} />
            Permisos: {role.nombre}
          </DialogTitle>
          <DialogDescription className="text-base font-medium">
            Selecciona los permisos específicos que tendrá este rol en cada módulo del sistema
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-gray-900">
              Permisos Asignados
            </span>
            <Badge className="bg-[#1e5da8] text-white font-bold">
              {selectedCount} / {totalPermissions}
            </Badge>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(selectedCount / totalPermissions) * 100}%` }}
              className="h-full bg-gradient-to-r from-[#1e5da8] to-blue-600"
            />
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar permisos por módulo o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 border-2 border-gray-300 focus:border-[#1e5da8] font-medium"
            />
          </div>
        </div>

        {/* Permissions List */}
        <div className="flex-1 overflow-y-auto px-6 space-y-4">
          {filteredModules.map((module) => {
            const Icon = module.icon;
            const modulePermissions = module.permissions;
            const enabledCount = modulePermissions.filter(p => 
              selectedPermissions.has(p.id)
            ).length;
            const allSelected = enabledCount === modulePermissions.length;
            const someSelected = enabledCount > 0 && enabledCount < modulePermissions.length;

            return (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-5 border-2 border-gray-200 hover:border-[#1e5da8] transition-all"
              >
                {/* Module Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${module.bgColor}`}>
                      <Icon className={`w-5 h-5 ${module.color}`} strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-[--esap-gray-900]">{module.name}</h3>
                      <p className="text-xs font-medium text-[--esap-gray-600]">
                        {enabledCount}/{modulePermissions.length} permisos activos
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleModulePermissions(modulePermissions)}
                    className={`p-2 rounded-lg transition-all ${
                      allSelected
                        ? 'bg-green-500 text-white hover:bg-green-600'
                        : someSelected
                        ? 'bg-amber-500 text-white hover:bg-amber-600'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                    title={allSelected ? 'Desmarcar todo' : 'Marcar todo'}
                  >
                    {allSelected ? (
                      <CheckCircle className="w-5 h-5" strokeWidth={2} />
                    ) : someSelected ? (
                      <MinusCircle className="w-5 h-5" strokeWidth={2} />
                    ) : (
                      <Circle className="w-5 h-5" strokeWidth={2} />
                    )}
                  </button>
                </div>

                {/* Permissions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {modulePermissions.map((permission) => {
                    const isEnabled = selectedPermissions.has(permission.id);

                    return (
                      <button
                        key={permission.id}
                        onClick={() => togglePermission(permission.id)}
                        className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                          isEnabled
                            ? 'bg-green-50 border-green-300 hover:bg-green-100'
                            : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isEnabled ? 'bg-green-500' : 'bg-gray-300'
                        }`}>
                          {isEnabled && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-[--esap-gray-900]">{permission.name}</p>
                          <p className="text-xs font-medium text-[--esap-gray-600] mt-0.5">
                            {permission.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Actions Footer */}
        <div className="px-6 py-4 border-t bg-gray-50">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <Button
              variant="outline"
              onClick={handleReset}
              className="w-full sm:w-auto font-bold border-2 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Limpiar Todo
            </Button>
            <div className="flex gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 sm:flex-none font-bold border-2"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges}
                className="flex-1 sm:flex-none bg-gradient-to-r from-[#1e5da8] to-blue-600 hover:from-[#1a4d8a] hover:to-blue-700 text-white font-bold shadow-lg disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-2" />
                Guardar Permisos
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}