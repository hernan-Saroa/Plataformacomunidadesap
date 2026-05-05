/**
 * RoleSelector - Selector de rol activo para el Portal (Legacy PTA)
 *
 * Mantiene compatibilidad con el shell actual:
 * - `roles` (legacy)
 * - `userRoles` (nuevo)
 */

import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface RoleSelectorProps {
  roles?: string[];
  userRoles?: string[];
  activeRole: string;
  onRoleChange: (role: string) => void;
  compact?: boolean;
}

const roleIcons: Record<string, string> = {
  Estudiante: '🎓',
  Docente: '👨‍🏫',
  Egresado: '🎖️',
  Graduado: '🎖️',
  Administrativo: '🏛️',
  'Super Usuario': '⚡',
  Contratista: '📋',
};

const roleColors: Record<string, string> = {
  Estudiante: '#3B82F6',
  Docente: '#10B981',
  Egresado: '#8B5CF6',
  Graduado: '#8B5CF6',
  Administrativo: '#F59E0B',
  'Super Usuario': '#EF4444',
  Contratista: '#6366F1',
};

export function RoleSelector({ roles, userRoles, activeRole, onRoleChange, compact = false }: RoleSelectorProps) {
  const rolesList = roles || userRoles || [];
  const [isOpen, setIsOpen] = useState(false);

  if (rolesList.length <= 1) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        style={{ border: '1px solid #E5E7EB' }}
      >
        <span className="text-sm">{roleIcons[activeRole] || '👤'}</span>
        {!compact && (
          <span className="text-sm font-medium" style={{ color: '#374151' }}>
            {activeRole}
          </span>
        )}
        <ChevronDown size={14} style={{ color: '#6B7280' }} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div
            className="absolute top-full mt-1 right-0 w-52 bg-white rounded-xl shadow-lg py-1 z-20"
            style={{ border: '1px solid #E5E7EB' }}
          >
            <div className="px-3 py-2" style={{ borderBottom: '1px solid #F3F4F6' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6B7280' }}>
                Cambiar Rol
              </p>
            </div>
            {rolesList.map((role) => (
              <button
                key={role}
                onClick={() => {
                  onRoleChange(role);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                style={{ color: role === activeRole ? roleColors[role] || '#003DA5' : '#374151' }}
              >
                <span>{roleIcons[role] || '👤'}</span>
                <span className="flex-1 text-left font-medium">{role}</span>
                {role === activeRole && <Check size={14} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
