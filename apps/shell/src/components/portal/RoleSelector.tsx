import { motion } from 'motion/react';
import {
  GraduationCap,
  BookOpen,
  Briefcase,
  Users,
  UserCircle,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Badge } from '../ui/badge';

interface RoleSelectorProps {
  userRoles: string[];
  activeRole: string;
  onRoleChange: (role: string) => void;
}

const ROLE_CONFIG = {
  Estudiante: {
    icon: GraduationCap,
    color: 'from-blue-500 to-blue-600',
    badge: 'bg-blue-100 text-blue-700',
    description: 'Vista académica y servicios estudiantiles',
  },
  Docente: {
    icon: BookOpen,
    color: 'from-purple-500 to-purple-600',
    badge: 'bg-purple-100 text-purple-700',
    description: 'Vista docente y gestión de clases',
  },
  Administrativo: {
    icon: Briefcase,
    color: 'from-emerald-500 to-emerald-600',
    badge: 'bg-emerald-100 text-emerald-700',
    description: 'Vista administrativa y gestión',
  },
  Graduado: {
    icon: Users,
    color: 'from-amber-500 to-amber-600',
    badge: 'bg-amber-100 text-amber-700',
    description: 'Red de egresados y oportunidades',
  },
  Aspirante: {
    icon: UserCircle,
    color: 'from-gray-500 to-gray-600',
    badge: 'bg-gray-100 text-gray-700',
    description: 'Proceso de admisión',
  },
};

export function RoleSelector({ userRoles, activeRole, onRoleChange }: RoleSelectorProps) {
  // Si solo tiene un rol, no mostrar selector
  if (userRoles.length === 1) {
    return null;
  }

  const activeRoleConfig = ROLE_CONFIG[activeRole as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.Estudiante;
  const Icon = activeRoleConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-white to-gray-50 border-b border-gray-200 sticky top-0 z-40 shadow-sm"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Información del rol activo */}
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${activeRoleConfig.color} flex items-center justify-center shadow-md`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900">Vista Actual:</span>
                <Badge className={activeRoleConfig.badge}>
                  {activeRole}
                </Badge>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                {activeRoleConfig.description}
              </p>
            </div>
          </div>

          {/* Selector de roles */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Cambiar a:
            </span>
            <Select value={activeRole} onValueChange={onRoleChange}>
              <SelectTrigger className="w-full sm:w-56 border-2 border-gray-300 hover:border-[#1e5da8] transition-colors">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {userRoles.map((role) => {
                  const config = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.Estudiante;
                  const RoleIcon = config.icon;
                  
                  return (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center`}>
                          <RoleIcon className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="font-medium">{role}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Info adicional: múltiples roles activos */}
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 pt-3 border-t border-gray-200"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-gray-600">
              Tus roles activos:
            </span>
            {userRoles.map((role) => {
              const config = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.Estudiante;
              const RoleIcon = config.icon;
              
              return (
                <button
                  key={role}
                  onClick={() => onRoleChange(role)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    role === activeRole
                      ? `${config.badge} ring-2 ring-offset-2 ring-${config.color.split('-')[1]}-500`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <RoleIcon className="w-3 h-3" />
                  {role}
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
